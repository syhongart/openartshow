"""GLB 의 노드·메시·재질 이름을 three 가 **고쳐 쓰지 않는** 형태로 되돌린다.

── 왜 필요한가 ──────────────────────────────────────────────────────────────
three 의 `GLTFLoader` 가 로드 중에 이름을 **고쳐 쓴다** — `createUniqueName` →
`PropertyBinding.sanitizeNodeName`(`three.core.js:31930`) 이 **두 가지**를 한다:

    name.replace(/\s/g, '_').replace(/[\[\]\.:\/]/g, '')

즉 **공백류는 `_` 로 바꾸고 `[ ] . : /` 는 지운다.** 그래서 `Cube.127` 은 런타임에
`Cube127` 이 되고, 생성기가 쓴 이름으로 찾는 코드는 **한 번도 참이 아닌** 상태가 된다.

⚠ **첫 판본은 `.` 만 봤고 그것으로는 부족했다**(2026-09-16 실측). 블렌더의 마스터
컬렉션 이름 `Scene Collection` 이 **공백** 때문에 `Scene_Collection` 으로 고쳐졌고,
`verify-glb.mjs` 의 경계 축(`nameIntegrity`)이 그 1건을 잡아 이 파일을 되돌렸다.
문자 집합이 이 파일과 `verify-glb.mjs` 두 곳에 적히는 것은 언어가 달라 불가피하지만,
**한쪽이 빠뜨리면 다른 쪽이 빨간불이 된다** — 그 경계 검사가 미러링의 방어다. 이 저장소는 그 대가를 이미 치렀다 —
`frontend/js/world10/decide/glb-nodes.ts` 헤더의 실측표와 「강도 스윕 4장이 md5
동일로 나와서야 드러났다」가 그 회차다.

블렌더는 이름 충돌을 `.001` 접미사로 해결하므로 **원본 blend 에서 오는 이름에는
`.` 이 구조적으로 섞인다.** 21,417 오브젝트 중 상당수가 그렇다. 그래서 export
산출물을 한 번 훑어 규약(`_`)으로 되돌린다.

── 왜 export **전** rename 이 아닌가 ────────────────────────────────────────
bpy 에서 `ob.name = 'Cube_127'` 로 바꾸면 **같은 이름이 이미 있을 때 블렌더가 다시
`.001` 을 붙인다.** 즉 원인을 그대로 재생산한다. 산출물 쪽에서 고치면 glTF 는 이름
중복을 허용하므로 그 재생산이 없다.

⚠ **중복은 없애지 않는다.** `.` → `_` 치환 뒤 같은 이름이 둘 이상 생길 수 있고
(`A.001` 과 원래 있던 `A_001`), 그것은 `GLTFLoader` 가 `_1` 접미사로 고유화한다 —
**이름이 바뀌는 것은 마찬가지다.** 그래서 치환 후 중복 수를 실측해 보고에 남긴다.
0 이 아니면 그 이름으로 노드를 찾는 코드를 쓰면 안 된다.

── GLB 컨테이너 ────────────────────────────────────────────────────────────
헤더 12B(`glTF` · version · length) + 청크들(length · type · data, 4B 정렬).
JSON 청크만 다시 쓰고 BIN 청크는 바이트 그대로 옮긴다.
"""

from __future__ import annotations

import json
import re
import struct
from collections import Counter
from pathlib import Path

_MAGIC = b"glTF"
_JSON = b"JSON"
_BIN = b"BIN\x00"

# 이름이 들어 있는 glTF 최상위 배열. `scenes` 는 three 가 `scene.name` 으로 노출하고
# `meshes` 는 `Mesh.geometry` 가 아니라 **오브젝트 이름**으로도 쓰인다(GLTFLoader:3844).
NAMED_ARRAYS = ("nodes", "meshes", "materials", "images", "scenes", "animations", "cameras")

# three 가 건드리는 문자 전부. **지우지 않고 `_` 로 바꾼다** — 길이를 보존하면 이름이
# 뭉개져 서로 같아지는 일이 줄고, `_` 는 sanitize 에 불변이다.
_REWRITE = re.compile(r"[\s\[\]./:]")


def read_glb(path: Path) -> tuple[dict, list[tuple[bytes, bytes]]]:
    """GLB 를 (glTF JSON, [(청크타입, 바이트), …]) 로 연다. JSON 청크도 목록에 남는다."""
    raw = path.read_bytes()
    magic, version, total = struct.unpack_from("<4sII", raw, 0)
    if magic != _MAGIC:
        raise ValueError(f"GLB 가 아니다: magic={magic!r}")
    if version != 2:
        raise ValueError(f"glTF 2.0 이 아니다: version={version}")
    if total != len(raw):
        raise ValueError(f"길이 불일치: 헤더 {total} vs 실제 {len(raw)}")

    chunks: list[tuple[bytes, bytes]] = []
    off = 12
    while off < len(raw):
        clen, ctype = struct.unpack_from("<I4s", raw, off)
        off += 8
        chunks.append((ctype, raw[off : off + clen]))
        off += clen
        off += (-off) % 4

    gltf = None
    for ctype, data in chunks:
        if ctype == _JSON:
            gltf = json.loads(data.decode("utf-8"))
            break
    if gltf is None:
        raise ValueError("JSON 청크가 없다")
    return gltf, chunks


def write_glb(path: Path, gltf: dict, chunks: list[tuple[bytes, bytes]]) -> int:
    """JSON 청크를 `gltf` 로 갈아끼워 다시 쓴다. 반환은 총 바이트."""
    body = bytearray()
    for ctype, data in chunks:
        if ctype == _JSON:
            data = json.dumps(gltf, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
            data += b" " * ((-len(data)) % 4)  # JSON 은 공백으로 패딩
        elif ctype == _BIN:
            data = data + b"\x00" * ((-len(data)) % 4)
        body += struct.pack("<I4s", len(data), ctype) + data

    total = 12 + len(body)
    path.write_bytes(struct.pack("<4sII", _MAGIC, 2, total) + bytes(body))
    return total


def sanitize(gltf: dict) -> dict:
    """모든 이름에서 three 가 고쳐 쓰는 문자를 `_` 로 바꾼다. 반환은 실측 dict."""
    changed = 0
    scanned = 0
    for key in NAMED_ARRAYS:
        for item in gltf.get(key, []) or []:
            name = item.get("name")
            if not isinstance(name, str):
                continue
            scanned += 1
            fixed = _REWRITE.sub("_", name)
            if fixed != name:
                item["name"] = fixed
                changed += 1

    dup = Counter(n["name"] for n in (gltf.get("nodes") or []) if isinstance(n.get("name"), str))
    dup_names = {k: v for k, v in dup.items() if v > 1}
    return {
        "scanned": scanned,
        "renamed": changed,
        "dirtyLeft": sum(
            1
            for key in NAMED_ARRAYS
            for item in (gltf.get(key) or [])
            if isinstance(item.get("name"), str) and _REWRITE.search(item["name"])
        ),
        "duplicateNodeNames": len(dup_names),
        "duplicateWorst": sorted(dup_names.items(), key=lambda kv: -kv[1])[:5],
    }


def external_refs(gltf: dict) -> list[str]:
    """자기완결 축 — GLB 안에 남은 외부 URI 를 모은다(있으면 안 된다)."""
    out = []
    for key in ("buffers", "images"):
        for item in gltf.get(key, []) or []:
            uri = item.get("uri")
            if isinstance(uri, str) and not uri.startswith("data:"):
                out.append(f"{key}: {uri}")
    return out


def sanitize_file(path: Path) -> dict:
    gltf, chunks = read_glb(path)
    stats = sanitize(gltf)
    stats["externalRefs"] = external_refs(gltf)
    stats["bytes"] = write_glb(path, gltf, chunks)
    return stats


if __name__ == "__main__":
    import sys

    target = Path(sys.argv[1])
    print(json.dumps(sanitize_file(target), ensure_ascii=False, indent=1))
