#!/usr/bin/env python3
# scripts/asset/manhattan/bake-instances.py — 같은 형상을 **한 벌로 묶어** GLB 를 굽는다.
#
#   사용: python3 scripts/asset/manhattan/bake-instances.py --blend <원본.blend> --out <경로.glb> \
#           [--key H7_raw_full|H6_norm_full] [--digits 5] [--image-format AUTO|WEBP] --report <json>
#
# 감독 지시 2026-09-16 *"인스턴스 최대한 활용 가능할까."* 통짜본(91.09 MiB)의 지오메트리가
# 큰 이유는 **같은 모양이 수천 벌 따로 저장돼 있어서**다 — `analyze-instances.py` 실측으로
# 메시 19,251 종 중 실제 고유 형상은 수백 종이다.
#
# ── 🔴 이 경로는 **IP 세탁을 거치지 않는다** (검수관 블로커 B2, 2026-09-16) ──
# `ip_scrub` import 도, `scrub()` 호출도, `--no-ip-scrub` 도, `ipScrubSkipped` 리포트 필드도
# **전부 여기 없다.** 그 배선은 `extract.py` 의 `main()` 에만 있고, 이 스크립트는 blend 를
# `bpy.ops.wm.open_mainfile` 로 **직접 열어** `extract` 에서 `run_export`·`survey_glb`·
# `dump_cameras`·`dump_lights` 네 함수만 가져다 쓴다 — `main()` 을 경유하지 않는다.
#
# **그래서 「승격 회차에 세탁을 자동 복귀시킨다」는 안전장치가 이 경로에는 물리적으로
# 없다.** 팀장 추인 R1 의 그 서술은 `extract.py` 경로만 상정한 것이다. `--key` 인스턴싱으로
# 구운 자산을 라이브로 올리려면 **배선 추가가 선결**이고, 그 전에는 켤 스위치가 없다.
#
# 리포트에 `"ipScrubWired": false` 를 **무조건** 찍는 이유가 이것이다 — 리포트만 보고도
# 「이 산출물은 세탁을 안 거쳤다」가 드러나야 한다. 자기선언이 아니라 구조적 사실의 기록이고,
# 배선이 생기는 회차에 이 상수와 위 문단을 함께 지운다. 백로그 `G-BAKE-SCRUB`.
#
# ⚠ 지금 커밋된 `frontend/assets/worlds/manhattan-180m.glb` 가 **이 경로 산출물**이다
# (감독 지시 *"법무팀 검토하지마. 테스트야."* 로 이번 회차는 세탁 면제 — behind-flag 한정).
#
# ── 왜 blend 단계에서 묶나(GLB 후처리가 아니라) ─────────────────────────────
# 산출 GLB 를 실측해 보면 **mesh 19,482개가 전부 고유 accessor** 다(동일 서명 0). 즉
# 「같은 accessor 를 쓰는 mesh 를 합친다」는 후처리는 **아무것도 못 묶는다.** 묶이려면
# 좌표를 실제로 비교해야 하고, 그 비교는 blend 쪽이 훨씬 싸다(정점 배열을 그대로 읽는다.
# GLB 는 면 분할로 정점이 3배 늘어난 뒤다). 그래서 blend 에서 `object.data` 를 공유로
# 바꾸고 exporter 에게 넘긴다 — exporter 는 공유 mesh 를 **하나의 glTF mesh + 여러 node**
# 로 낸다(통짜본에서 `Cube.127` 하나를 932 노드가 참조한 것이 그 증거다).
#
# ── 두 모드 ─────────────────────────────────────────────────────────────────
#   `--key H7_raw_full`  좌표까지 같은 것만 묶는다. **변환 보정이 필요 없다** — `object.data`
#                        를 갈아끼우기만 하므로 기하학적으로 무손실이고 위험이 0 이다.
#   `--key H6_norm_full` 「같은 모양, 다른 치수」까지 묶는다. 치수 차이를 **노드 변환으로**
#                        옮겨야 하므로 행렬을 고쳐 쓴다:
#
#                            W' = W · T(c_M) · S(s_M/s_R) · T(−c_R)
#
#                        (M = 원래 메시, R = 그룹 대표, c = bbox 중심, s = bbox 크기)
#                        비균등 스케일이 들어가지만 **shear 는 생기지 않는다** — 오브젝트
#                        변환의 스케일 성분과 이 대각 스케일이 곱해져도 대각이다.
#
# ── ⚠ 굽고 나서 「같은지」를 어떻게 아는가 ───────────────────────────────────
# 삼각형 수와 bbox 는 **법선이 바뀌어도 그대로다.** 그래서 이 파일은 교체 **전** 모든
# 메시 오브젝트의 월드 bbox 코너를 기록해 두고, 교체 **후** 다시 계산해 최대 변위를 잰다
# (`geometryDriftM`). 그것이 「인스턴싱이 물체를 안 옮겼다」의 직접 축이다. 법선 축은
# `mesh_hash` 의 셰이딩 해시가 **묶이기 전에** 막는다(H6/H7 만 굽기 키로 허용하는 이유).
#
# ── ⚠ 모디파이어가 있는 오브젝트는 **묶지 않는다** ──────────────────────────
# 해시는 메시 데이터만 본다. 그런데 `export_apply=True` 는 **모디파이어를 적용한** 결과를
# 내보내므로, 같은 메시를 공유해도 모디파이어가 다르면 화면이 달라진다. 실측으로 이
# 자산에 그런 오브젝트가 **102개** 있다(`analyze-instances.py` 의 `unhashedFeatures`).
# 전체의 0.5% 라 묶기를 포기해도 손실이 거의 없고, 반대로 묶었을 때의 위험은 **우리
# 검증 축 어디에도 안 잡힌다**(삼각형 수·bbox 는 모디파이어 결과를 안 본다. `bound_box`
# 자체가 적용 전 값이라 `geometryDriftM` 조차 이것을 못 본다). 그래서 제외가 기본이다.
#
# ⚠⚠ **게이트가 아니다.** CI 에서 안 돈다(bpy 휠 374MB · 원본 blend 가 저장소에 없다).

from __future__ import annotations

import argparse
import json
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import extract  # noqa: E402  — run_export·survey_glb·dump_* 를 재사용한다(값 미러링 방지)
import glb_names  # noqa: E402
import mesh_hash  # noqa: E402

import bpy  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

# 교체 뒤 물체가 이보다 움직이면 실패로 본다. `analyze-instances.py` 의 TRS 임계와 같은
# 근거이고 같은 값이다 — 세계 180m 에서 1mm 다.
DRIFT_TOL_M = 0.001


def world_corners(ob) -> list[Vector]:
    return [ob.matrix_world @ Vector(c) for c in ob.bound_box]


def build_groups(used, digits: int, key: str) -> tuple[dict, dict]:
    """해시 → 메시 이름 목록, 그리고 메시 이름 → (center, size)."""
    groups: dict[str, list[str]] = defaultdict(list)
    box: dict[str, tuple[list[float], list[float]]] = {}
    for me in used:
        hv = mesh_hash.hash_variants(me, digits)
        groups[hv[key]].append(me.name)
        box[me.name] = (hv["_center"], hv["_size"])
    return groups, box


def fixup_matrix(w: Matrix, c_m, s_m, c_r, s_r) -> Matrix:
    """W · T(c_M) · S(s_M/s_R) · T(−c_R). 평면 축(크기 0)은 스케일 1 로 둔다."""
    ratio = [
        (s_m[i] / s_r[i]) if (s_r[i] > mesh_hash.FLAT_EPS and s_m[i] > mesh_hash.FLAT_EPS) else 1.0
        for i in range(3)
    ]
    return (
        w
        @ Matrix.Translation(Vector(c_m))
        @ Matrix.Diagonal(Vector(ratio)).to_4x4()
        @ Matrix.Translation(-Vector(c_r))
    )


def main() -> int:
    ap = argparse.ArgumentParser(description="형상 중복을 묶어 GLB 를 굽는다")
    ap.add_argument("--blend", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--cameras", type=Path, default=None)
    ap.add_argument("--report", required=True, type=Path)
    ap.add_argument("--digits", type=int, default=5)
    ap.add_argument("--key", default="H7_raw_full", choices=mesh_hash.BAKE_KEYS)
    ap.add_argument("--image-format", default="AUTO", choices=("AUTO", "JPEG", "WEBP", "NONE"))
    args = ap.parse_args()

    t0 = time.time()
    bpy.ops.wm.open_mainfile(filepath=str(args.blend))
    scene = bpy.data.scenes[0]
    print(f"[open] {time.time() - t0:.1f}s", file=sys.stderr)

    mesh_objs = [ob for ob in scene.objects if ob.type == "MESH" and ob.data is not None]
    before = {ob.name: world_corners(ob) for ob in mesh_objs}

    # 모디파이어가 있으면 교체 대상에서 뺀다(위 ⚠). 종류를 세어 보고에 남긴다 —
    # 다음 사람이 「무엇을 포기했는가」를 알아야 되살릴지 판단할 수 있다.
    mod_kinds = Counter()
    skip_objs = set()
    for ob in mesh_objs:
        if len(ob.modifiers) == 0:
            continue
        skip_objs.add(ob.name)
        for md in ob.modifiers:
            mod_kinds[md.type] += 1
    # 그 오브젝트들이 쓰는 메시는 **대표로도 쓰지 않는다** — 대표가 되면 다른 오브젝트가
    # 그것을 가리키게 되고, 그 메시는 모디파이어 전 형상이라 의미가 달라진다.
    skip_meshes = {ob.data.name for ob in mesh_objs if ob.name in skip_objs}

    # 재질을 오브젝트 쪽에 매단 것이 있으면 `data` 교체가 재질을 바꾸지 않는다 —
    # 해시는 **메시 재질**만 보므로, 있으면 그 수를 보고한다(있어도 동작은 한다).
    obj_linked_slots = sum(
        1 for ob in mesh_objs for sl in ob.material_slots if sl.link == "OBJECT"
    )

    used = [me for me in bpy.data.meshes if me.users > 0]
    meshes_before = len(used)
    groups, box = build_groups(used, args.digits, args.key)
    rep_of: dict[str, str] = {}
    for names in groups.values():
        free = [n for n in names if n not in skip_meshes]
        if not free:
            continue
        rep = free[0]
        for n in free:
            rep_of[n] = rep
    print(f"[group] {meshes_before} → {len(groups)} ({time.time() - t0:.1f}s)", file=sys.stderr)

    # ── 교체 ─────────────────────────────────────────────────────────────────
    normalize = args.key.startswith("H6")
    swapped = 0
    for ob in mesh_objs:
        if ob.name in skip_objs:
            continue
        old = ob.data.name
        rep = rep_of.get(old)
        if rep is None or rep == old:
            continue
        w = ob.matrix_world.copy()
        ob.data = bpy.data.meshes[rep]
        if normalize:
            c_m, s_m = box[old]
            c_r, s_r = box[rep]
            ob.matrix_world = fixup_matrix(w, c_m, s_m, c_r, s_r)
        swapped += 1

    bpy.context.view_layer.update()

    # ── 「안 움직였는가」 ────────────────────────────────────────────────────
    drift = 0.0
    over = 0
    worst = []
    for ob in mesh_objs:
        a = before[ob.name]
        b = world_corners(ob)
        d = max((a[i] - b[i]).length for i in range(8))
        drift = max(drift, d)
        if d > DRIFT_TOL_M:
            over += 1
            if len(worst) < 10:
                worst.append({"object": ob.name, "driftM": round(d, 6)})

    meshes_after = sum(1 for me in bpy.data.meshes if me.users > 0)
    print(f"[drift] max={drift:.9f}m over={over}", file=sys.stderr)

    report = {
        # 🔴 **상수 false 다 — 이 경로에 세탁 배선이 없다는 구조적 사실의 기록**이다
        # (검수관 블로커 B2). 근거·해소 조건은 이 파일 헤더 한 곳이다. 배선이 생기면
        # 이 줄을 실제 집행 여부로 바꾼다 — 그때까지 `true` 가 될 수 없다.
        "ipScrubWired": False,
        "key": args.key,
        "digits": args.digits,
        "imageFormat": args.image_format,
        "meshesBefore": meshes_before,
        "meshesAfter": meshes_after,
        "groups": len(groups),
        "objectsSwapped": swapped,
        "objectMaterialSlots": obj_linked_slots,
        "skippedObjectsWithModifiers": len(skip_objs),
        "modifierKinds": dict(mod_kinds),
        "geometryDriftM": {
            "toleranceM": DRIFT_TOL_M,
            "max": drift,
            "objectsOverTolerance": over,
            "worst": worst,
        },
    }

    if over > 0:
        print(f"⚠ 중단 — 교체 뒤 {over}개 오브젝트가 {DRIFT_TOL_M}m 넘게 움직였다.", file=sys.stderr)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
        return 3

    # ── export ───────────────────────────────────────────────────────────────
    args.out.parent.mkdir(parents=True, exist_ok=True)
    tmp = args.out.with_suffix(".tmp.glb")
    extract.run_export(tmp, args.image_format)
    report["names"] = glb_names.sanitize_file(tmp)
    report["glb"] = extract.survey_glb(tmp)
    tmp.replace(args.out)

    if args.cameras:
        args.cameras.parent.mkdir(parents=True, exist_ok=True)
        args.cameras.write_text(
            json.dumps(
                {
                    "generatedBy": "scripts/asset/manhattan/bake-instances.py",
                    "sourceBlend": args.blend.name,
                    "axis": "gltf-y-up",
                    "cameras": extract.dump_cameras(scene),
                    "lights": extract.dump_lights(scene),
                },
                ensure_ascii=False,
                indent=1,
            ),
            encoding="utf-8",
        )

    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"[report] {args.report}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
