#!/usr/bin/env python3
# scripts/asset/manhattan/analyze-instances.py — **인스턴싱으로 무엇을 얼마나 묶을 수 있나.**
#
#   사용: python3 scripts/asset/manhattan/analyze-instances.py --blend <원본.blend> --report <out.json>
#
# 감독 지시 2026-09-16 *"인스턴스 최대한 활용 가능할까."* 에 답하는 **실측 전용** 도구다.
# 아무것도 굽지 않고 blend 도 저장하지 않는다 — 굽는 것은 `bake-instances.py` 다.
#
# ── 서명이 같다고 형상이 같은 것은 아니다 ───────────────────────────────────
# `(정점수, 면수, 루프수)` 로 세면 19,251 메시가 99종으로 줄지만, 그것은 **박스가 전부
# `v8 p6 l24` 라는 말**일 뿐 그 박스들이 같은 모양이라는 뜻이 아니다. 여기서는 실제
# 좌표·UV·재질·셰이딩을 해시한다. 「같음」의 정의는 `mesh_hash.py` **한 곳**이다.
#
# ── 이 파일이 답하는 셋 ─────────────────────────────────────────────────────
#   ① 양자화 자릿수를 얼마로 두어야 하나 → `digitsSweep`(고르지 않고 **유도**한다)
#   ② 어느 단계에서 얼마나 묶이나 → `groups`(H1~H7 전부)
#   ③ 「단위 형상 + 노드 TRS」로 복원 가능한가 → `trs`(shear 가 섞이면 모양이 바뀐다)

from __future__ import annotations

import argparse
import json
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import mesh_hash  # noqa: E402

import bpy  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

# ── TRS 분해 임계값 ─────────────────────────────────────────────────────────
#
# 정규화 그룹을 「단위 형상 + 노드 변환」으로 복원하려면 최종 변환이 TRS 로 표현돼야
# 한다. glTF 노드는 행렬을 그대로 실을 수도 있지만 three 는 로드 시점에 **TRS 로
# 분해**해 `position`/`quaternion`/`scale` 에 넣는다 — shear 가 섞이면 그 분해가
# 손실이고 **모양이 바뀐다.**
#
# 임계값은 행렬 원소가 아니라 **정점이 실제로 얼마나 움직이는가**로 잰다. 원소 오차는
# 물체가 크면 크게, 작으면 작게 나타나서 같은 숫자가 다른 뜻이 된다. 1mm 로 잡은 근거:
# 세계가 180m 이므로 상대오차 5.6e-6 이고, 이 자산의 가장 작은 디테일(차량 부품·간판
# 글자·난간 동자)보다 두 자릿수 이상 작다.
TRS_TOL_M = 0.001

# ── 「world10 의 슬롯 풀을 그대로 쓸 수 있나」를 재는 축 ─────────────────────
#
# `frontend/js/world10/systems/instancing.ts` 의 `setTransform(x, y, z, ry, sx, sy, sz)` 은
# **Y축 회전 하나만** 받는다. 그 한계를 `world10/export/import-glb.ts` 의 `decompose`
# 헤더가 적어 두었다 — *"블렌더에서 건물을 기울이면 그 기울기는 버려진다."*
#
# 그러니 맨해튼 오브젝트에 Y축 외 회전이 얼마나 있는지가 곧 **그 풀을 재사용할 수
# 있는가**의 답이다. 판정 기준은 그쪽과 같게 쓴다(Y basis 가 위를 향하는가, 1도까지
# 허용). ⚠ 이 상수는 `import-glb.ts` 의 값을 **인용**한 것이다 — 그쪽이 SSOT 이고,
# 여기는 그 계약에 맞는지 세는 자리다. 그쪽이 바뀌면 이 수치의 뜻도 바뀐다.
YAW_ONLY_UP_DOT = 0.99985


def trs_error(m: Matrix, corners: list[Vector]) -> float:
    """분해→재조립이 bbox 코너를 얼마나 옮기는가(미터). shear 가 있으면 커진다."""
    loc, quat, scale = m.decompose()
    back = Matrix.LocRotScale(loc, quat, scale)
    return max((m @ c - back @ c).length for c in corners)


def main() -> int:
    ap = argparse.ArgumentParser(description="인스턴싱 잠재력 실측")
    ap.add_argument("--blend", required=True, type=Path)
    ap.add_argument("--report", required=True, type=Path)
    ap.add_argument("--digits", type=int, default=5, help="본 집계에 쓸 양자화 자릿수")
    ap.add_argument("--key", default="H6_norm_full", choices=mesh_hash.VARIANTS)
    args = ap.parse_args()

    t0 = time.time()
    bpy.ops.wm.open_mainfile(filepath=str(args.blend))
    scene = bpy.data.scenes[0]
    print(f"[open] {time.time() - t0:.1f}s", file=sys.stderr)

    used = [me for me in bpy.data.meshes if me.users > 0]

    sweep = {}
    for d in mesh_hash.SWEEP_DIGITS:
        t = time.time()
        seen = {k: set() for k in mesh_hash.VARIANTS}
        for me in used:
            hv = mesh_hash.hash_variants(me, d)
            for k in seen:
                seen[k].add(hv[k])
        sweep[d] = {k: len(v) for k, v in seen.items()}
        print(f"[sweep] digits={d} {sweep[d]} ({time.time() - t:.1f}s)", file=sys.stderr)

    # ── 본 집계 ──────────────────────────────────────────────────────────────
    groups: dict[str, list[str]] = defaultdict(list)
    tri_of: dict[str, int] = {}
    extra = Counter()
    for me in used:
        hv = mesh_hash.hash_variants(me, args.digits)
        groups[hv[args.key]].append(me.name)
        tri_of[me.name] = sum(len(p.vertices) - 2 for p in me.polygons)
        if hv["_uvLayers"] > 1:
            extra["uvLayersOverOne"] += 1
        if hv["_colorLayers"] > 0:
            extra["colorAttributes"] += 1

    # 메시 하나를 여러 오브젝트가 쓰므로 「인스턴스 수」는 오브젝트로 센다.
    obj_of_mesh = Counter()
    modifiers = 0
    for ob in scene.objects:
        if ob.type == "MESH" and ob.data is not None:
            obj_of_mesh[ob.data.name] += 1
            if len(ob.modifiers) > 0:
                modifiers += 1

    rows = [
        {
            "hash": h[:12],
            "meshes": len(names),
            "objects": sum(obj_of_mesh[n] for n in names),
            "tri": tri_of[names[0]],
            "sample": names[0],
        }
        for h, names in groups.items()
    ]
    rows.sort(key=lambda r: -r["objects"])

    # ── TRS / shear ──────────────────────────────────────────────────────────
    worst, over, checked, tilted = [], 0, 0, 0
    tilt_sample = []
    for ob in scene.objects:
        if ob.type != "MESH" or ob.data is None:
            continue
        checked += 1
        m = ob.matrix_world
        e = trs_error(m, [Vector(c) for c in ob.bound_box])
        if e > TRS_TOL_M:
            over += 1
            if len(worst) < 10:
                worst.append({"object": ob.name, "errorM": round(e, 6)})
        # Y basis 의 길이(=sy)로 정규화한 위쪽 성분. 순수 Y회전이면 1 이다.
        yb = Vector((m[0][1], m[1][1], m[2][1]))
        up = (yb.y / yb.length) if yb.length > 1e-9 else 1.0
        if up < YAW_ONLY_UP_DOT:
            tilted += 1
            if len(tilt_sample) < 10:
                tilt_sample.append({"object": ob.name, "upDot": round(up, 5)})

    report = {
        "digits": args.digits,
        "groupKey": args.key,
        "digitsSweep": sweep,
        "meshesUsed": len(used),
        "meshTrianglesTotal": sum(tri_of.values()),
        "sceneTriangles": sum(tri_of[n] * c for n, c in obj_of_mesh.items()),
        "groups": len(groups),
        "trianglesIfOnePerGroup": sum(tri_of[names[0]] for names in groups.values()),
        "top20": rows[:20],
        # 해시가 **안 보는** 축이 실제로 있는지. 있으면 굽기가 화면을 바꿀 수 있다.
        "unhashedFeatures": {**extra, "objectsWithModifiers": modifiers},
        "trs": {"toleranceM": TRS_TOL_M, "objectsChecked": checked, "objectsOverTolerance": over, "worst": worst},
        "yawOnly": {
            "upDotThreshold": YAW_ONLY_UP_DOT,
            "source": "frontend/js/world10/export/import-glb.ts (decompose)",
            "objectsChecked": checked,
            "objectsTilted": tilted,
            "sample": tilt_sample,
        },
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"[report] {args.report}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
