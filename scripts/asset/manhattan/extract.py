#!/usr/bin/env python3
# scripts/asset/manhattan/extract.py — 감독이 올린 맨해튼 180m blend 를 GLB 자산으로 굽는다.
#
#   사용: python3 scripts/asset/manhattan/extract.py --blend <원본.blend> [옵션]
#
# ── 무엇을 만드나 ───────────────────────────────────────────────────────────
#   frontend/assets/worlds/manhattan-180m.glb          세계 지오메트리(커밋 자산)
#   frontend/assets/worlds/manhattan-180m-cameras.json 카메라 18 · 라이트 112(월드11 진입 시점)
#   (선택) --report 실측표 JSON
#
# **원본 blend 는 저장소에 넣지 않는다**(29MB zstd, 출처가 감독 업로드다). 그래서 산출물을
# 커밋 자산으로 두고 **만든 절차를 이 파일로 남긴다** — world8 의
# `frontend/assets/worlds/world2-blender-edit.glb` 와 같은 형태다.
#
# ⚠ **이것은 게이트가 아니다.** CI 에서 안 돈다(bpy 휠이 374MB 다 — `extract-world2-glb.mjs`
# 헤더와 같은 이유). 자산을 다시 구워야 할 때 손으로 돌리는 도구이고, 구워진 것이 옳은지는
# `tests/manhattan-glb.test.ts` 가 판정한다(그쪽이 판정 주체다).
#
# ── ⚠ bpy 5.0.1 로 Blender 5.1 파일을 연다 — 실측으로 정정된 전제 ──────────
# 원본은 Blender 5.1(버전코드 501.30)로 저장됐고 설치된 bpy 는 5.0.1 이다. 여는 순간
# `Warning: File written by newer Blender binary (501.30), expect loss of data!` 가 뜬다.
# **그러나 데이터는 유실되지 않았다**(2026-09-16 실측). bpy 로 읽은 값이 blend 블록을
# 직접 파싱하는 `blender_asset_tracer`(SDNA 기반, 버전 무관) 결과와 일치한다:
#
#   | 축              | bpy 5.0.1 | BAT(블록 직독) |
#   |-----------------|-----------|----------------|
#   | 오브젝트        | 21,417    | OB 21,417      |
#   | 메시            | 19,251    | ME 19,251      |
#   | 재질            | 46        | MA 46          |
#   | 라이트          | 112       | LA 112         |
#   | 씬 삼각형       | 1,045,716 | 1,045,716      |
#
# 그 교차확인을 `verify-blocks.py` 가 **bpy 없이** 다시 돌린다(구현자≠검증자). 경고를
# 무시하는 것이 아니라 **무엇이 유실되지 않았는지를 실측으로 못 박고** 쓴다. 5.1 에서
# 새로 생긴 필드는 5.0 SDNA 에 없어 읽히지 않으므로, 앞으로 원본이 갱신되면 이 표를
# 다시 뜬다.
#
# ── 좌표계 ──────────────────────────────────────────────────────────────────
# blend 는 Z-up, glTF 는 Y-up 이다. GLB 지오메트리는 exporter 의 `export_yup=True` 가
# 변환하고, 카메라·라이트 JSON 은 같은 변환을 `_YUP` 행렬로 직접 적용한다 —
# **두 곳이 같은 변환이어야 시점이 지오메트리와 맞는다.** `tests/manhattan-glb.test.ts`
# 가 GLB bbox 와 카메라 JSON 의 축을 함께 단언해 그 정합을 본다.
#
# ── 이름 규약 ───────────────────────────────────────────────────────────────
# 산출 GLB 의 이름은 `glb_names.sanitize_file` 이 `.` → `_` 로 되돌린다. 이유는 그
# 파일 헤더 한 곳이다(여기에 다시 적지 않는다).

from __future__ import annotations

import argparse
import json
import math
import sys
import time
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import glb_names  # noqa: E402

import bpy  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

# Z-up(blend) → Y-up(glTF). (x, y, z) → (x, z, −y).
# exporter 의 `export_yup` 과 **같은 변환**이다 — 다르면 카메라가 지오메트리와 어긋난다.
_YUP = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))

_DEG = 180.0 / math.pi


def _r(v, n=4):
    return [round(float(x), n) for x in v]


# ── 원본 실측 ───────────────────────────────────────────────────────────────


def survey_source(scene) -> dict:
    """원본 blend 의 실측표. export 전에 뜬다 — 산출물과 대조할 기준이다."""
    tri_of: dict[str, int] = {}
    for me in bpy.data.meshes:
        tri_of[me.name] = sum(len(p.vertices) - 2 for p in me.polygons)

    types = Counter(ob.type for ob in scene.objects)
    col_obj, col_tri = Counter(), Counter()
    scene_tri = 0
    for ob in scene.objects:
        if ob.type != "MESH" or ob.data is None:
            continue
        t = tri_of.get(ob.data.name, 0)
        scene_tri += t
        for c in ob.users_collection:
            col_obj[c.name] += 1
            col_tri[c.name] += t

    lo, hi = [1e30] * 3, [-1e30] * 3
    for ob in scene.objects:
        if ob.type not in ("MESH", "CURVE", "FONT", "SURFACE", "META"):
            continue
        for corner in ob.bound_box:
            w = ob.matrix_world @ Vector(corner)
            for i in range(3):
                lo[i] = min(lo[i], w[i])
                hi[i] = max(hi[i], w[i])

    imgs = [
        {
            "name": im.name,
            "packed": bool(im.packed_file),
            "source": im.source,
            "size": list(im.size),
            "filepath": im.filepath,
        }
        for im in bpy.data.images
    ]

    return {
        "objects": len(scene.objects),
        "objectsByType": dict(types),
        "meshes": len(bpy.data.meshes),
        "materials": [m.name for m in bpy.data.materials],
        "triScene": scene_tri,
        "triMeshData": sum(tri_of.values()),
        "vertsMeshData": sum(len(me.vertices) for me in bpy.data.meshes),
        "bboxBlender": {"min": _r(lo, 2), "max": _r(hi, 2), "size": _r([hi[i] - lo[i] for i in range(3)], 2)},
        "collections": [{"name": k, "objects": col_obj[k], "tri": col_tri[k]} for k, _ in col_tri.most_common()],
        "images": imgs,
        "imagesPacked": sum(1 for i in imgs if i["packed"]),
        "imagesExternal": sum(1 for i in imgs if not i["packed"] and i["source"] == "FILE"),
        "fontObjects": int(types.get("FONT", 0)),
        "curveObjects": int(types.get("CURVE", 0)),
    }


# ── 카메라·라이트 ───────────────────────────────────────────────────────────


def _yup_pose(ob) -> dict:
    """오브젝트의 월드 변환을 Y-up 으로 옮겨 위치·쿼터니언으로 낸다."""
    m = _YUP @ ob.matrix_world
    loc, quat, _scale = m.decompose()
    fwd = m.to_3x3() @ Vector((0.0, 0.0, -1.0))  # 로컬 −Z 가 전방(카메라·스팟 공통)
    return {
        "position": _r(loc),
        # mathutils 는 (w,x,y,z) 순, three/glTF 는 (x,y,z,w) 순이다.
        "quaternion": _r([quat.x, quat.y, quat.z, quat.w], 6),
        "forward": _r(fwd),
        "blender": {
            "location": _r(ob.matrix_world.to_translation(), 3),
            "rotationEulerXYZdeg": _r([v * _DEG for v in ob.matrix_world.to_euler("XYZ")], 2),
        },
    }


def dump_cameras(scene) -> list[dict]:
    """카메라 18개. 렌즈는 **파생값을 하나로 고르지 않고** 원천값을 함께 낸다 —
    소비자(월드11)의 화면비를 여기서 알 수 없기 때문이다(값 미러링 회피)."""
    out = []
    for ob in sorted((o for o in scene.objects if o.type == "CAMERA"), key=lambda o: o.name):
        cam = ob.data
        pose = _yup_pose(ob)
        pose.update(
            {
                "name": ob.name.replace(".", "_"),
                "lensMm": round(cam.lens, 3),
                "sensorWidthMm": round(cam.sensor_width, 3),
                "sensorHeightMm": round(cam.sensor_height, 3),
                "sensorFit": cam.sensor_fit,
                "angleXdeg": round(cam.angle_x * _DEG, 3),
                "angleYdeg": round(cam.angle_y * _DEG, 3),
                "clipStart": round(cam.clip_start, 4),
                "clipEnd": round(cam.clip_end, 2),
            }
        )
        out.append(pose)
    return out


def dump_lights(scene) -> list[dict]:
    """라이트 112개. **GLB 에는 넣지 않는다** — three 에서 112개 실시간 광원은 드로우콜·
    셰이더 비용이 성립하지 않는다(`CLAUDE.md` 의 [7.6] 드로우콜 축). 대신 좌표·색·세기를
    남겨 월드11 이 필요한 만큼 골라 쓰게 한다. 남기지 않으면 되살릴 방법이 없다."""
    out = []
    for ob in sorted((o for o in scene.objects if o.type == "LIGHT"), key=lambda o: o.name):
        la = ob.data
        pose = _yup_pose(ob)
        pose.update(
            {
                "name": ob.name.replace(".", "_"),
                "type": la.type,
                "color": _r(la.color, 4),
                "energyW": round(la.energy, 3),
                "radius": round(getattr(la, "shadow_soft_size", 0.0), 4),
                "spotSizeDeg": round(getattr(la, "spot_size", 0.0) * _DEG, 2) if la.type == "SPOT" else None,
            }
        )
        out.append(pose)
    return out


# ── export ──────────────────────────────────────────────────────────────────


def run_export(out: Path, image_format: str, draco: bool = False) -> None:
    """glTF exporter 호출.

    옵션 근거:
      export_yup                        glTF 는 Y-up (기본값이지만 명시한다 — 카메라 JSON 과 짝이다)
      export_apply=True                 커브 140 · 텍스트 95 를 평가된 메시로 받는다. 끄면 그것들이 통째로 빠진다
      export_cameras/lights=False       JSON 으로 따로 낸다(위 dump_* 헤더)
      export_animations/morph=False     원본에 애니메이션·셰이프키가 없고, 켜면 21k 오브젝트를 헛훑는다
      export_hierarchy_full_collections 컬렉션 20 이 씬그래프의 부모 노드가 된다 → 월드11 이
                                        `getObjectByName('Vehicles')` 로 묶음을 잡는다. 이름 접두보다
                                        싸다(21k 개 이름을 늘리지 않는다)
      export_shared_accessors=True      같은 메시를 쓰는 노드가 accessor 를 공유한다(Cube_127 만 932회)
      export_unused_*=False             안 쓰는 이미지·텍스처를 빼 바이트를 줄인다
    """
    t0 = time.time()
    bpy.ops.export_scene.gltf(
        filepath=str(out),
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_skins=False,
        export_morph=False,
        export_materials="EXPORT",
        export_image_format=image_format,
        export_draco_mesh_compression_enable=draco,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_extras=False,
        export_hierarchy_full_collections=True,
        export_shared_accessors=True,
        export_unused_images=False,
        export_unused_textures=False,
        use_selection=False,
        use_visible=False,
        use_renderable=False,
    )
    print(f"[export] {time.time() - t0:.1f}s", file=sys.stderr)


def survey_glb(path: Path) -> dict:
    """산출 GLB 의 실측. 원본 표와 대조할 값이다."""
    gltf, _chunks = glb_names.read_glb(path)
    accessors = gltf.get("accessors", [])
    tri_mesh = 0
    for me in gltf.get("meshes", []) or []:
        for prim in me.get("primitives", []) or []:
            if prim.get("mode", 4) != 4:
                continue
            idx = prim.get("indices")
            if idx is not None:
                tri_mesh += accessors[idx]["count"] // 3
            else:
                pos = prim.get("attributes", {}).get("POSITION")
                if pos is not None:
                    tri_mesh += accessors[pos]["count"] // 3

    per_mesh_tri = []
    for me in gltf.get("meshes", []) or []:
        t = 0
        for prim in me.get("primitives", []) or []:
            idx = prim.get("indices")
            if idx is not None:
                t += accessors[idx]["count"] // 3
        per_mesh_tri.append(t)

    uses = Counter(n["mesh"] for n in (gltf.get("nodes") or []) if "mesh" in n)
    tri_scene = sum(per_mesh_tri[m] * c for m, c in uses.items())
    verts = sum(
        accessors[prim["attributes"]["POSITION"]]["count"]
        for me in (gltf.get("meshes") or [])
        for prim in (me.get("primitives") or [])
        if "POSITION" in prim.get("attributes", {})
    )

    return {
        "bytes": path.stat().st_size,
        "nodes": len(gltf.get("nodes", []) or []),
        "meshes": len(gltf.get("meshes", []) or []),
        "materials": len(gltf.get("materials", []) or []),
        "images": len(gltf.get("images", []) or []),
        "textures": len(gltf.get("textures", []) or []),
        "accessors": len(accessors),
        "triMeshData": tri_mesh,
        "triScene": tri_scene,
        "vertsMeshData": verts,
        "nodesWithMesh": sum(uses.values()),
        "extensionsUsed": gltf.get("extensionsUsed", []),
        "generator": gltf.get("asset", {}).get("generator"),
    }


# ── 본체 ────────────────────────────────────────────────────────────────────


def _emit(report: dict, path: Path | None) -> None:
    """실측표를 낸다. stdout 에는 사람이 볼 요약만 — 기계는 `--report` 파일을 읽는다."""
    blob = json.dumps(report, ensure_ascii=False, indent=1)
    if path:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(blob, encoding="utf-8")
        print(f"[report] {path}", file=sys.stderr)
    else:
        print(blob)


def main() -> int:
    ap = argparse.ArgumentParser(description="맨해튼 180m blend → GLB 자산")
    ap.add_argument("--blend", required=True, type=Path)
    ap.add_argument("--out", type=Path, default=Path("frontend/assets/worlds/manhattan-180m.glb"))
    ap.add_argument("--cameras", type=Path, default=Path("frontend/assets/worlds/manhattan-180m-cameras.json"))
    # ⚠ **stdout 은 파싱하지 마라.** bpy 가 자기 로그(`00:00.9 blend | Read blend: …`)를
    # stdout 에 섞고 그것을 끌 수 있는 공개 스위치가 없다. 기계가 읽을 것은 이 파일이다.
    ap.add_argument("--report", type=Path, default=None)
    ap.add_argument("--image-format", default="AUTO", choices=("AUTO", "JPEG", "WEBP", "NONE"))
    # 🔴 **이 환경에서는 켜면 죽는다**(2026-09-16 실측, 2회 시도 2회 SIGSEGV). bpy 5.0.1
    # 번들 인코더가 메시 ~19,486개 중 끝무렵(`Sedan_continuous_pressed_body` 근처)에서
    # 세그폴트로 프로세스째 사라진다 — 부분 산출도 리포트도 남지 않는다. 죽기 전까지
    # 찍힌 압축률은 4.6~7.2배다.
    #
    # 그리고 성공하더라도 Draco 산출은 **런타임에 디코더를 요구한다**(three 의
    # `DRACOLoader` + wasm). `vendor/` 직서빙이면 자기완결은 지켜지지만 그것은 **설계
    # 분기**다 — 자산만 두면 월드가 못 연다. 그래서 기본은 끈 상태다.
    ap.add_argument("--draco", action="store_true")
    # 50MiB — 위임 상한. 커밋 자산으로 부적절한 크기이므로 넘으면 **쓰지 않고** 멈춘다.
    ap.add_argument("--max-bytes", type=int, default=50 * 1024 * 1024)
    ap.add_argument("--survey-only", action="store_true", help="export 없이 원본 실측만")
    args = ap.parse_args()

    t0 = time.time()
    bpy.ops.wm.open_mainfile(filepath=str(args.blend))
    scene = bpy.data.scenes[0]
    print(f"[open] {time.time() - t0:.1f}s · 오브젝트 {len(scene.objects):,}", file=sys.stderr)

    report = {
        "source": {"path": str(args.blend), "bytes": args.blend.stat().st_size},
        "bpyVersion": bpy.app.version_string,
        "blendVersionCode": bpy.data.version[:],
        "imageFormat": args.image_format,
        "draco": args.draco,
        "sourceSurvey": survey_source(scene),
    }

    cams = dump_cameras(scene)
    lights = dump_lights(scene)
    report["cameraCount"] = len(cams)
    report["lightCount"] = len(lights)
    if args.survey_only:
        _emit(report, args.report)
        return 0

    args.out.parent.mkdir(parents=True, exist_ok=True)
    tmp = args.out.with_suffix(".tmp.glb")
    run_export(tmp, args.image_format, args.draco)

    raw_bytes = tmp.stat().st_size
    names = glb_names.sanitize_file(tmp)
    report["names"] = names
    report["bytesBeforeSanitize"] = raw_bytes

    if names["bytes"] > args.max_bytes:
        print(
            f"⚠ 중단 — 산출 {names['bytes']:,}B 가 상한 {args.max_bytes:,}B 를 넘는다. "
            f"파일을 두지 않고 멈춘다: {tmp}",
            file=sys.stderr,
        )
        report["glb"] = survey_glb(tmp)
        report["aborted"] = "max-bytes"
        _emit(report, args.report)
        return 3

    report["glb"] = survey_glb(tmp)
    tmp.replace(args.out)

    args.cameras.parent.mkdir(parents=True, exist_ok=True)
    args.cameras.write_text(
        json.dumps(
            {
                "generatedBy": "scripts/asset/manhattan/extract.py",
                "sourceBlend": args.blend.name,
                "axis": "gltf-y-up",
                "note": "position·quaternion 은 Y-up(glTF/three). blender 키는 원본 Z-up 값이다.",
                "cameras": cams,
                "lights": lights,
            },
            ensure_ascii=False,
            indent=1,
        ),
        encoding="utf-8",
    )

    _emit(report, args.report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
