#!/usr/bin/env python3
# scripts/asset/manhattan/verify-blocks.py — 원본 blend 를 **bpy 없이** 직접 읽어 실측한다.
#
#   사용: python3 scripts/asset/manhattan/verify-blocks.py --blend <원본.blend> [--against <report.json>]
#
# ── 왜 따로 있나 — 구현자≠검증자 ────────────────────────────────────────────
# `extract.py` 는 bpy 로 blend 를 열어 GLB 를 굽고, **자기가 연 그 상태로** 실측표를
# 쓴다. 즉 bpy 가 무언가를 잘못 읽었다면 실측표도 같이 틀린다 — 자기 자신은 증거가
# 될 수 없다.
#
# 이 파일은 `blender_asset_tracer`(BAT) 로 blend 의 **SDNA 블록을 직접** 읽는다. bpy 를
# 전혀 쓰지 않으므로 완전히 독립된 축이다. 그래서 다음 물음에 답할 수 있다:
#
#   *"bpy 5.0.1 이 Blender 5.1 파일을 열며 낸 «expect loss of data» 경고 뒤에,
#     실제로 무엇이 유실됐는가?"*
#
# 2026-09-16 실측의 답은 **아무것도**다(아래 축 다섯이 전부 일치). 그 경고만 보고
# 「bpy 로는 못 연다」고 규정하면 GLB 를 손으로 조립하게 되고, 그 경로는 UV·재질·
# 텍스처·커브·텍스트를 전부 잃는다. **경고는 측정이 아니다** — 이 파일이 측정이다.
#
# ── BAT API 주의(실제로 밟은 것) ────────────────────────────────────────────
#   * `blendfile.open_cached()` 는 `pathlib.Path` 를 요구한다(str 이면 AttributeError)
#   * 필드 접근은 바이트 키다 — `block[b'totvert']`, 중첩은 `block[b'id', b'name']`
#   * ID 이름은 앞 2바이트가 타입 접두(`OBCube`)라 `[2:]` 로 벗긴다
#
# ⚠ **이것도 게이트가 아니다**(CI 에서 안 돈다 — 원본 blend 가 저장소에 없다).
# 자산을 다시 구울 때 `extract.py` 와 **나란히** 돌리는 대조군이다.

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

from blender_asset_tracer import blendfile

# blend 의 `Object.type` 코드 → 이름. `DNA_object_types.h` 의 `OB_*` 다.
# bpy 쪽 문자열(`ob.type`)과 **같은 철자**로 맞춰 둔다 — 대조가 목적이므로 여기서
# 이름이 갈리면 비교 자체가 성립하지 않는다.
OB_TYPE = {
    0: "EMPTY",
    1: "MESH",
    2: "CURVE",
    3: "SURFACE",
    4: "FONT",
    5: "META",
    10: "LIGHT",
    11: "CAMERA",
    12: "SPEAKER",
    25: "ARMATURE",
    26: "LATTICE",
}


def survey(path: Path) -> dict:
    bf = blendfile.open_cached(path)

    codes = Counter()
    meshes: dict[int, tuple[str, int, int, int]] = {}
    for b in bf.blocks:
        codes[b.code.decode("ascii", "replace").strip("\x00")] += 1
        if b.code != b"ME":
            continue
        meshes[b.addr_old] = (
            b[b"id", b"name"].decode("utf8", "replace")[2:],
            b[b"totvert"],
            b[b"totpoly"],
            b[b"totloop"],
        )

    types = Counter()
    scene_tri = 0
    used = Counter()
    for b in bf.blocks:
        if b.code != b"OB":
            continue
        t = b[b"type"]
        types[OB_TYPE.get(t, f"UNKNOWN_{t}")] += 1
        if t != 1:
            continue
        d = b[b"data"]
        if d in meshes:
            _nm, _tv, tp, tl = meshes[d]
            scene_tri += max(0, tl - 2 * tp)
            used[d] += 1

    mats = sorted(
        b[b"id", b"name"].decode("utf8", "replace")[2:] for b in bf.blocks if b.code == b"MA"
    )

    return {
        "blockCounts": dict(codes.most_common()),
        "objects": sum(types.values()),
        "objectsByType": dict(types),
        "meshes": len(meshes),
        # 삼각형 = totloop − 2×totpoly. 다각형 하나가 (코너수 − 2) 삼각형이고 그 합이
        # Σcorners − 2×faces 다. 부채꼴 삼각화를 가정한다(exporter 도 그렇게 한다).
        "triMeshData": sum(max(0, tl - 2 * tp) for _n, _v, tp, tl in meshes.values()),
        "triScene": scene_tri,
        "vertsMeshData": sum(v for _n, v, _p, _l in meshes.values()),
        "materials": mats,
        "meshReuseTop": [(meshes[a][0], c) for a, c in used.most_common(5)],
    }


# `extract.py` 의 실측표와 맞춰 볼 축. 여기 없는 것은 대조하지 않는다 —
# 대조 못 한 축을 통과로 적지 않기 위해 **목록을 명시**한다.
COMPARED = ("objects", "objectsByType", "meshes", "triMeshData", "triScene", "vertsMeshData")


def main() -> int:
    ap = argparse.ArgumentParser(description="blend 블록 직독 실측(BAT, bpy 미사용)")
    ap.add_argument("--blend", required=True, type=Path)
    ap.add_argument("--against", type=Path, default=None, help="extract.py 의 --report 와 대조")
    ap.add_argument("--out", type=Path, default=None)
    args = ap.parse_args()

    got = survey(args.blend)
    result = {"bat": got}

    if args.against:
        payload = json.loads(args.against.read_text(encoding="utf-8"))
        # ⚠ **세탁 전 표와 대조한다.** BAT 는 디스크의 blend 를 읽으므로 IP 세탁
        # (`ip_scrub`, `extract.py` 헤더)이 지운 오브젝트를 그대로 본다. 세탁 후 표
        # (`sourceSurvey`)와 맞추면 언제나 어긋나고, 그러면 사람이 diffs 를 무시하기
        # 시작한다 — 그 순간 이 대조 축은 장식이 된다. 세탁을 껐거나 구판 리포트면
        # `sourceSurveyPreScrub` 이 없으므로 그때만 `sourceSurvey` 로 떨어진다.
        ref_key = "sourceSurveyPreScrub" if "sourceSurveyPreScrub" in payload else "sourceSurvey"
        ref = payload[ref_key]
        result["comparedAgainst"] = ref_key
        diffs = []
        for key in COMPARED:
            a, b = got.get(key), ref.get(key)
            if a != b:
                diffs.append({"축": key, "bat": a, "bpy": b})
        result["compared"] = list(COMPARED)
        result["diffs"] = diffs
        result["materialsMatch"] = sorted(ref.get("materials", [])) == got["materials"]

    blob = json.dumps(result, ensure_ascii=False, indent=1)
    if args.out:
        args.out.write_text(blob, encoding="utf-8")
    print(blob)

    if args.against and (result["diffs"] or not result["materialsMatch"]):
        print("⚠ bpy 와 BAT 의 실측이 어긋난다 — 위 diffs 를 보고 원인을 밝히기 전에는 자산을 쓰지 마라.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
