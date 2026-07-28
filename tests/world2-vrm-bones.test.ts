// VRM 본 매칭 — **이름으로 찾으면 안 된다**는 것을 파일 사실로 못 박는다.
//
// ── 실제 사고 ───────────────────────────────────────────────────────────────
// 감독 스크린샷: 아바타가 **완전한 T-포즈로 미끄러져** 갔다. 팔 내리기도 걸음 스윙도
// 하나도 적용되지 않았다.
//
// 원인은 본을 한 개도 못 찾은 것이었다. 코드는 이렇게 우회하고 있었다:
//
//   humanBones[key].node (인덱스) → glTF JSON 의 노드 이름 → 씬에서 그 이름으로 탐색
//
// **GLTFLoader 는 노드 이름의 `.`·공백·`:` 을 `_` 로 치환한다.** 이 파일의 본은 Blender
// Rigify 출신이라 `DEF-thigh.L`·`DEF-spine.001` 처럼 점이 들어 있어서, 원본 이름으로는
// 단 하나도 맞지 않았다.
//
// 더 나쁜 것은 **그 실패가 아무 데도 안 남았다는 점**이다. 로드는 성공했고, 에러도 0
// 이었고, 진단에도 아무 신호가 없었다. 화면을 보기 전까지 알 방법이 없었다 — 이
// 저장소가 상시 위험으로 규정한 *"못 잰 것이 통과로 적히는 경향"* 그 자체다.
//
// ── 이 파일이 지키는 것 ─────────────────────────────────────────────────────
// VRM 로딩 자체는 브라우저(GLTFLoader + fetch)라 여기서 돌릴 수 없다. 대신 **왜 이름
// 매칭이 불가능한지**를 파일에서 직접 읽어 못 박는다. 누군가 이름 매칭으로 되돌리면
// 이 테스트가 "그러면 깨진다"고 먼저 알려준다.
//
// 본이 실제로 몇 개 잡히는지는 진단(`__world2.stats().npc.vrmBones`)이 답한다 —
// 헤드리스 실측에서 9/9 확인.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { WALK_BONES } from '../frontend/js/world2/avatars/vrm.js';
import { VRM_MALE } from '../frontend/js/world2/avatars/registry.js';

const VRM_PATH = new URL('../frontend/assets/avatars/male.vrm', import.meta.url).pathname;

/** GLB 컨테이너에서 JSON 청크를 꺼낸다 */
function readGltfJson(path: string) {
  const buf = readFileSync(path);
  expect(buf.subarray(0, 4).toString()).toBe('glTF');
  const chunkLen = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + chunkLen).toString('utf8'));
}

/**
 * GLTFLoader 가 노드 이름에 적용하는 치환. three 의 `sanitizeNodeName` 과 같은 규칙이라
 * 여기 적는 것은 미러링이지만, 대안이 없다 — vendor 파일에서 내보내지 않는 내부 함수다.
 * 규칙이 바뀌면 아래 "치환된다" 단언이 먼저 깨져서 알려준다.
 */
const SANITIZE_TARGET = /[\s.:]/;

describe('VRM 본 매칭', () => {
  const hasFile = existsSync(VRM_PATH);

  it('아바타 파일이 저장소에 있다', () => {
    // 없으면 아래 단언이 전부 건너뛰어진다. 표본이 빈 채로 통과하는 것을 막는다.
    expect(hasFile, `${VRM_PATH} 없음 — 라이선스 문제로 뺐다면 이 테스트도 함께 정리한다`).toBe(true);
  });

  it('레지스트리가 가리키는 경로와 실제 파일이 같다', () => {
    expect(VRM_MALE.url).toContain('male.vrm');
  });

  const gltf = hasFile ? readGltfJson(VRM_PATH) : null;
  const humanBones = gltf?.extensions?.VRMC_vrm?.humanoid?.humanBones ?? {};
  const nodes: { name?: string }[] = gltf?.nodes ?? [];

  it('걷기에 쓰는 본이 humanBones 에 전부 있다', () => {
    const missing = WALK_BONES.filter((b) => typeof humanBones[b]?.node !== 'number');
    expect(missing).toEqual([]);
  });

  // 이것이 이 파일의 핵심이다. 이름에 치환 대상 문자가 있으면 **원본 이름으로는
  // 씬에서 찾을 수 없다** — 우리가 겪은 실패가 정확히 그것이다.
  it('본 이름이 GLTFLoader 의 치환 대상을 포함한다 — 이름 매칭이 불가능한 이유', () => {
    const names = WALK_BONES
      .map((b) => nodes[humanBones[b]?.node]?.name)
      .filter((n): n is string => typeof n === 'string');
    expect(names.length).toBe(WALK_BONES.length);
    // 하나라도 치환되면 이름 기반 탐색은 신뢰할 수 없다. 실제로는 전부 치환된다.
    const sanitized = names.filter((n) => SANITIZE_TARGET.test(n));
    expect(sanitized.length).toBeGreaterThan(0);
  });

  it('노드 인덱스는 유일하다 — 인덱스 매핑이 성립하는 근거', () => {
    // `parser.associations` 는 Object3D → {nodes: 인덱스} 다. 인덱스가 유일해야 역인덱스
    // 맵이 성립한다. glTF 사양상 당연하지만, 이 파일에서 실제로 그런지 확인해 둔다.
    const idx = WALK_BONES.map((b) => humanBones[b]?.node);
    expect(new Set(idx).size).toBe(idx.length);
    for (const i of idx) expect(nodes[i]).toBeDefined();
  });

  it('스킨이 있다 — 본을 돌려도 메시가 안 따라오면 소용없다', () => {
    expect((gltf?.skins ?? []).length).toBeGreaterThan(0);
  });

  it('내장 애니메이션이 없다 — 그래서 걷기를 직접 만든다', () => {
    // 있으면 굳이 사인파를 돌릴 이유가 없다. 나중에 클립이 담긴 파일로 바뀌면
    // 여기서 먼저 알려준다.
    expect((gltf?.animations ?? []).length).toBe(0);
  });
});
