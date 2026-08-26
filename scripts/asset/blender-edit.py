# blender-edit.py — 우리 GLB 를 **진짜 블렌더로 열어** 조형물을 하나 얹고 다시 내보낸다.
#
# ── 왜 있나 (감독 지시 2026-08-26) ──────────────────────────────────────────
# 감독이 *"월드8에 그 glb를 올려보자"* 라고 했고, 그 「그 glb」는 감독 PC 의
#   D:\openartshow-world2-near_1.glb  (우리 내보내기 → 블렌더에서 오브젝트 하나 추가)
# 인데 감독이 *"지금 그파일이 없어서 내가 못올려"* 라고 했다. 그래서 **같은 왕복을
# 여기서 재현한다.**
#
# ⚠ 이것이 왜 흉내가 아니라 실물인가: `bpy` (Blender as a Python Module) 로 **실제
# 블렌더가** glTF 를 읽고 쓴다. 노드 계층·재질 이름·확장을 블렌더가 실제로 어떻게
# 바꾸는지가 그대로 나온다. `measure-glb-roundtrip.mjs` 의 「블렌더가 한 것을 흉내」는
# 우리 손으로 JSON 청크에 노드를 끼워 넣는 것이라 그 축을 못 봤고, 그 파일 헤더가
# 스스로 *"블렌더 출력 자체는 아니다"* 라고 적어 두고 있다. **이 스크립트가 그 구멍이다.**
#
# ── IP — 왜 프리미티브만 쓰나 ───────────────────────────────────────────────
# `CLAUDE.md`: *"파츠 에셋은 자작 지오메트리만(외부 에셋은 §6 법무)"*. 블렌더의 상징인
# Suzanne 을 쓰면 한눈에 「블렌더에서 왔다」가 보이지만 그것은 **외부 에셋**이라 §6
# 법무 게이트를 태워야 한다. 여기서는 **절차적 프리미티브**(torus·cylinder)만 조합한다
# — 절차적 생성이므로 자작 지오메트리이고, 우리 파츠에 없는 모양이라 목적(감독이
# 화면에서 알아보는 것)은 그대로 달성된다.
#
# ── 재질 이름을 우리 규약으로 짓지 않는다 (일부러) ──────────────────────────
# world2 의 되읽기는 재질 이름 `kind#tone` 으로 **우리 파츠**를 알아본다. 이 조형물은
# 그 규약을 안 쓰므로 되읽기가 「남의 메시」로 판정한다 — 그것이 이 회차에 고친 그
# 경로이고, 이 파일이 그 경로의 **실물 입력**이 된다.
#
# ⚠ **CI 에서 돌지 않는다.** `bpy` 휠은 374MB 이고 러너에 없다. 자산을 다시 구울 때
# 손으로 돌리는 도구다.
#
#   사용: <venv>/bin/python scripts/asset/blender-edit.py <입력.glb> <출력.glb>

import sys
import bpy
from mathutils import Vector

if len(sys.argv) < 3:
    print("사용: python blender-edit.py <입력.glb> <출력.glb>")
    sys.exit(2)
src, dst = sys.argv[-2], sys.argv[-1]

# 기본 씬을 비운다 — 새 파일의 큐브·카메라·라이트가 세계에 섞이면 안 된다.
bpy.ops.wm.read_factory_settings(use_empty=True)

print(f"[1] 불러오기 — {src}")
bpy.ops.import_scene.gltf(filepath=src)

imported = [o for o in bpy.context.scene.objects if o.type == 'MESH']
print(f"    메시 오브젝트 {len(imported)}개")
if not imported:
    print("✗ 메시가 하나도 안 들어왔다 — 입력 파일을 확인해라")
    sys.exit(1)

# ── 바운딩 — 조형물을 어디에 세울지 정한다 ─────────────────────────────────
# 블렌더는 Z-up 이다(glTF 는 Y-up 이고 importer 가 변환한다). 그래서 «위» 는 Z 다.
lo = Vector((float('inf'),) * 3)
hi = Vector((float('-inf'),) * 3)
for o in imported:
    for corner in o.bound_box:
        w = o.matrix_world @ Vector(corner)
        lo = Vector((min(lo.x, w.x), min(lo.y, w.y), min(lo.z, w.z)))
        hi = Vector((max(hi.x, w.x), max(hi.y, w.y), max(hi.z, w.z)))
mid = (lo + hi) * 0.5
span = hi - lo
print(f"[2] 바운딩 — {span.x:.1f} × {span.y:.1f} × {span.z:.1f} m · 지면 z={lo.z:.2f}")

# ── 조형물 — 받침대 위의 큰 링 ──────────────────────────────────────────────
# 크기는 세계 크기에서 **유도한다**. 실측에 여유를 얹은 상수를 박으면 세계가 커졌을 때
# 저절로 따라오지 않는다(`CLAUDE.md`: "유도할 수 있는 값이면 유도한다").
ring_r = max(6.0, min(span.x, span.y) * 0.018)     # 960m 세계 → 반경 약 17m
tube_r = ring_r * 0.11
base_h = ring_r * 1.30
base_r = ring_r * 0.30

mat = bpy.data.materials.new(name="블렌더_조형물")   # 우리 `kind#tone` 규약이 아니다
mat.use_nodes = True
bsdf = mat.node_tree.nodes.get("Principled BSDF")
if bsdf:
    bsdf.inputs["Base Color"].default_value = (0.85, 0.62, 0.22, 1.0)
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = 0.85
    if "Roughness" in bsdf.inputs:
        bsdf.inputs["Roughness"].default_value = 0.28

bpy.ops.mesh.primitive_cylinder_add(
    radius=base_r, depth=base_h,
    location=(mid.x, mid.y, lo.z + base_h * 0.5), vertices=24,
)
base = bpy.context.active_object
base.name = "블렌더_받침"

bpy.ops.mesh.primitive_torus_add(
    major_radius=ring_r, minor_radius=tube_r,
    major_segments=48, minor_segments=12,
    location=(mid.x, mid.y, lo.z + base_h + ring_r * 0.92),
    rotation=(1.5707963, 0.0, 0.0),                 # 세워 놓는다 — 옆에서 링으로 보이게
)
ring = bpy.context.active_object
ring.name = "블렌더_링"

for o in (base, ring):
    o.data.materials.append(mat)

print(f"[3] 조형물 — 링 반경 {ring_r:.1f}m · 받침 높이 {base_h:.1f}m"
      f" · 자리 ({mid.x:.1f}, {mid.y:.1f}, {lo.z:.1f})")

print(f"[4] 내보내기 — {dst}")
bpy.ops.export_scene.gltf(
    filepath=dst,
    export_format='GLB',
    export_yup=True,
    use_selection=False,
)
print("[5] 끝")
