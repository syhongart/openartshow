"""메시 「같음」의 정의 한 곳. `analyze-instances.py` 와 `bake-instances.py` 가 공유한다.

두 스크립트가 각자 해시를 계산하면 **분석이 센 그룹과 굽기가 묶는 그룹이 갈린다** —
이 저장소가 값 미러링이라 부르는 그 형태이고, 여기서는 「분석은 628종이라 했는데 실제로
구우니 다른 수」가 된다. 그래서 정의를 한 파일에 둔다.

── 무엇을 「같다」고 보는가 ─────────────────────────────────────────────────
여섯 단계로 점점 느슨하게 잰다. 느슨할수록 많이 묶이지만 **무엇을 포기하는지**가 다르다.

    H1_raw          로컬 좌표 + 면 경계
    H2_norm         bbox 정규화 좌표 + 면 경계     — 치수를 노드 스케일로 옮긴다
    H3_norm_uv      H2 + UV
    H4_norm_uv_mat  H3 + 재질 슬롯
    H5_raw_uv_mat   H1 + UV + 재질                 — 정규화 없이 묶을 수 있는 단위
    H6_norm_full    H4 + **셰이딩**                — 정규화 인스턴싱의 실제 단위
    H7_raw_full     H5 + **셰이딩**                — 무보정 인스턴싱의 실제 단위

⚠ **셰이딩을 빼먹으면 화면이 조용히 바뀐다.** 좌표·면·UV·재질이 같아도 면별 `use_smooth`
나 sharp edge 가 다르면 법선이 달라지고, 그것은 삼각형 수도 bbox 도 안 건드린다 —
즉 우리 검증 축 어디에도 안 걸린다. 첫 판본이 이 축을 빠뜨렸고, 그러면 「묶었더니
그림자가 달라졌다」를 아무도 못 잡는다. **굽는 쪽은 H6/H7 만 쓴다.**

여전히 **안 보는 것**: 정점 색, 두 번째 이후 UV 레이어, 커스텀 split normal 데이터,
모디파이어. 이 자산에는 그것들이 없다고 **가정하지 않고**, `bake-instances.py` 가
굽기 전에 존재 여부를 세어 보고한다.

── 양자화 자릿수 ───────────────────────────────────────────────────────────
고르지 않고 스윕해서 유도한다(`SWEEP_DIGITS`). 곡선이 평탄한 구간이 실제 형상 차이를
세는 구간이고, 그보다 촘촘하면 부동소수 노이즈를 형상 차이로 오인한다.
"""

from __future__ import annotations

import hashlib

SWEEP_DIGITS = (2, 3, 4, 5, 6, 7, 8)

# bbox 한 축이 이보다 얇으면 평면으로 보고 그 축은 정규화하지 않는다(0 으로 못 나눈다).
# 실제 데이터의 가장 얇은 판(도로 마킹)보다 훨씬 작게 잡는다 — 크게 잡으면 평면이 부푼다.
FLAT_EPS = 1e-9

VARIANTS = ("H1_raw", "H2_norm", "H3_norm_uv", "H4_norm_uv_mat", "H5_raw_uv_mat", "H6_norm_full", "H7_raw_full")

# 굽는 쪽이 고를 수 있는 키. 셰이딩을 포함한 둘뿐이다(위 ⚠).
BAKE_KEYS = ("H6_norm_full", "H7_raw_full")


def quant(v: float, digits: int) -> float:
    """−0.0 과 0.0 을 같은 값으로 만든다 — 안 그러면 같은 형상의 해시가 갈린다."""
    q = round(v, digits)
    return 0.0 if q == 0 else q


def material_key(me) -> str:
    return "\x1f".join(m.name if m else "" for m in me.materials) or "(none)"


def mesh_arrays(me) -> dict:
    """한 메시에서 해시에 필요한 배열을 **한 번에** 뽑는다(`foreach_get`)."""
    co = [0.0] * (len(me.vertices) * 3)
    me.vertices.foreach_get("co", co)

    loops = [0] * len(me.loops)
    me.loops.foreach_get("vertex_index", loops)

    # 면 경계를 함께 넣는다 — 안 넣으면 사각형 한 장과 삼각형+점이 같은 해시가 된다.
    starts = []
    acc = 0
    smooth = []
    for p in me.polygons:
        starts.append(acc)
        acc += p.loop_total
        smooth.append(1 if p.use_smooth else 0)
    starts.append(acc)

    uv = []
    if me.uv_layers:
        uv = [0.0] * (len(me.loops) * 2)
        me.uv_layers[0].data.foreach_get("uv", uv)

    sharp = [0] * len(me.edges)
    me.edges.foreach_get("use_edge_sharp", sharp)

    return {
        "co": co,
        "faces": loops + [-1] + starts,
        "uv": uv,
        "smooth": smooth,
        "sharp": sharp,
        "uvLayers": len(me.uv_layers),
        "colorLayers": len(getattr(me, "color_attributes", []) or []),
    }


def bbox_of(co: list[float]) -> tuple[list[float], list[float]]:
    """(중심, 크기). 정규화를 되돌릴 때 노드 변환으로 옮겨야 하는 값이다."""
    if not co:
        return [0.0, 0.0, 0.0], [0.0, 0.0, 0.0]
    lo = [min(co[i::3]) for i in range(3)]
    hi = [max(co[i::3]) for i in range(3)]
    return [(hi[i] + lo[i]) / 2 for i in range(3)], [hi[i] - lo[i] for i in range(3)]


def _h(*parts: str) -> str:
    return hashlib.blake2b("|".join(parts).encode(), digest_size=16).hexdigest()


def hash_variants(me, digits: int) -> dict:
    """한 메시의 해시 전부 + 정규화 복원에 쓸 (center, size)."""
    a = mesh_arrays(me)
    ctr, size = bbox_of(a["co"])

    raw = ",".join(f"{quant(v, digits)}" for v in a["co"])
    norm = ",".join(
        f"{quant((v - ctr[i % 3]) / size[i % 3] if size[i % 3] > FLAT_EPS else 0.0, digits)}"
        for i, v in enumerate(a["co"])
    )
    face_s = ",".join(map(str, a["faces"]))
    uv_s = ",".join(f"{quant(v, digits)}" for v in a["uv"])
    mat_s = material_key(me)
    # 셰이딩: 면별 smooth 플래그 + sharp edge 플래그. 둘 다 법선을 바꾸고, 법선 변화는
    # 삼각형 수·bbox 어디에도 나타나지 않는다.
    shade_s = "".join(map(str, a["smooth"])) + "/" + "".join(map(str, a["sharp"]))

    out = {
        "H1_raw": _h(raw, face_s),
        "H2_norm": _h(norm, face_s),
        "H3_norm_uv": _h(norm, face_s, uv_s),
        "H4_norm_uv_mat": _h(norm, face_s, uv_s, mat_s),
        "H5_raw_uv_mat": _h(raw, face_s, uv_s, mat_s),
        "H6_norm_full": _h(norm, face_s, uv_s, mat_s, shade_s),
        "H7_raw_full": _h(raw, face_s, uv_s, mat_s, shade_s),
    }
    out["_center"] = ctr
    out["_size"] = size
    out["_uvLayers"] = a["uvLayers"]
    out["_colorLayers"] = a["colorLayers"]
    return out
