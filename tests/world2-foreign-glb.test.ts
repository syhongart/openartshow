// 블렌더에서 **추가한 물건**만 잘라내는가 — `export/foreign-glb.ts`.
//
// ── 왜 이 검사가 생겼나 (감독 신고 2026-08-25) ──────────────────────────────
// 감독이 우리 GLB 를 블렌더에서 열어 오브젝트를 하나 추가해 내보내고 되읽었더니
// *"재질이름형식이 아니다"* 가 떴다. 되읽기는 재질 이름으로 **우리 파츠만** 알아보고
// 모양은 아예 안 읽으므로 새 메시를 실을 통로가 없었다 — 결함이 아니라 설계 한계다.
//
// 감독 판정: *"들어가게 해달라"* · *"블랜더의 glb로 내보낸 것은 그대로 올라와야지."*
//
// 그 처방의 첫 부품이 「우리 파츠가 아닌 노드만 남긴 GLB 를 잘라낸다」이고 이 파일이
// 그것을 검사한다. **잘못 자르면 두 방향으로 다 나쁘다** — 우리 파츠를 남기면 화면에
// 두 벌이 서고(인스턴스 + 로더 사본), 남의 메시를 빼면 감독이 추가한 것이 사라진다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractForeignGlb } from '../frontend/js/world2/export/foreign-glb.js';
import { readGlbJson, parseWorldGlb } from '../frontend/js/world2/export/import-glb.js';

/** 합성 GLB — JSON 청크 + (선택) BIN 청크. 실제 내보내기 형식과 같은 배치다 */
function packGlb(gltf: unknown, bin?: Uint8Array): ArrayBuffer {
  const json = new TextEncoder().encode(JSON.stringify(gltf));
  const jsonPad = (4 - (json.length % 4)) % 4;
  const jsonLen = json.length + jsonPad;
  const binLen = bin ? bin.length + ((4 - (bin.length % 4)) % 4) : 0;
  const total = 12 + 8 + jsonLen + (bin ? 8 + binLen : 0);
  const out = new ArrayBuffer(total);
  const dv = new DataView(out);
  const u8 = new Uint8Array(out);
  dv.setUint32(0, 0x46546c67, true);
  dv.setUint32(4, 2, true);
  dv.setUint32(8, total, true);
  dv.setUint32(12, jsonLen, true);
  dv.setUint32(16, 0x4e4f534a, true);
  u8.set(json, 20);
  for (let i = 0; i < jsonPad; i++) u8[20 + json.length + i] = 0x20;
  if (bin) {
    const at = 20 + jsonLen;
    dv.setUint32(at, binLen, true);
    dv.setUint32(at + 4, 0x004e4942, true);
    u8.set(bin, at + 8);
  }
  return out;
}

/**
 * 우리 파츠 둘 + 물판 + **블렌더에서 추가한 것 하나**.
 * 마지막이 감독이 실제로 한 편집이다.
 */
function worldWithAddition() {
  return {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [
      { name: 'openartshow-world2', children: [1, 2, 3, 4] },
      { mesh: 0, translation: [10, 0, 20] },   // building#1 — 우리 것
      { mesh: 1, translation: [30, 0, 40] },   // lamp#0     — 우리 것
      { mesh: 2, translation: [0, -1, 0] },    // water      — 우리 것
      { mesh: 3, translation: [5, 2, 5], name: 'Cube' },   // 감독이 추가한 것
    ],
    meshes: [
      { primitives: [{ attributes: { POSITION: 0 }, material: 0 }] },
      { primitives: [{ attributes: { POSITION: 0 }, material: 1 }] },
      { primitives: [{ attributes: { POSITION: 0 }, material: 2 }] },
      { primitives: [{ attributes: { POSITION: 0 }, material: 3 }] },
    ],
    materials: [
      { name: 'building#1' }, { name: 'lamp#0' }, { name: 'water' },
      { name: 'Material.001' },                // 블렌더 기본 이름
    ],
    accessors: [{ componentType: 5126, count: 3, type: 'VEC3' }],
  };
}

describe('블렌더에서 추가한 것만 남긴다', () => {
  it('우리 파츠·물판은 빠지고 추가한 메시만 남는다', () => {
    const r = extractForeignGlb(packGlb(worldWithAddition()));
    expect(r.meshNodes).toBe(1);
    expect(r.ourNodes).toBe(3);          // building · lamp · water
    expect(r.glb).not.toBeNull();

    const g = readGlbJson(r.glb!);
    // 남은 씬에서 메시를 가진 노드를 센다 — 우리 것이 하나라도 남으면 화면에 두 벌이 선다.
    const meshed = (g.nodes as Record<string, any>[]).filter((n, i) => {
      const reachable = (g.scenes[0].nodes as number[]).includes(i)
        || (g.nodes as Record<string, any>[]).some((p) => (p.children ?? []).includes(i));
      return reachable && n.mesh !== undefined;
    });
    expect(meshed).toHaveLength(1);
    expect(g.materials[g.meshes[meshed[0].mesh].primitives[0].material].name).toBe('Material.001');
  });

  it('부모 그룹은 **남긴다** — 변환이 걸려 있으면 지우면 자식이 어긋난다', () => {
    // 블렌더에서 "전체를 5m 옮기기" 를 하면 부모 Empty 에 이동이 생긴다
    // (`import-glb.ts` 헤더가 적어 둔 형태다). 그 부모를 지우면 남은 자식이 밀린다.
    const doc = worldWithAddition();
    doc.nodes[0] = { ...doc.nodes[0], translation: [100, 0, 0] } as never;
    const g = readGlbJson(extractForeignGlb(packGlb(doc)).glb!);
    expect(g.scenes[0].nodes).toEqual([0]);
    expect(g.nodes[0].translation).toEqual([100, 0, 0]);
    // 그 부모가 가리키는 자식은 추가한 것 하나뿐이어야 한다.
    expect(g.nodes[0].children).toEqual([4]);
  });

  it('우리 것만 있으면 `null` 이다 — 올릴 것이 없다', () => {
    const doc = worldWithAddition();
    doc.nodes = doc.nodes.slice(0, 4);
    doc.nodes[0] = { ...doc.nodes[0], children: [1, 2, 3] } as never;
    const r = extractForeignGlb(packGlb(doc));
    expect(r.glb).toBeNull();
    expect(r.meshNodes).toBe(0);
    expect(r.ourNodes).toBe(3);
  });

  it('바이너리 청크를 **그대로** 옮긴다 — accessor 인덱스가 유지되므로 참조가 안 깨진다', () => {
    const bin = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const r = extractForeignGlb(packGlb(worldWithAddition(), bin));
    const out = new Uint8Array(r.glb!);
    const dv = new DataView(r.glb!);
    const at = 20 + dv.getUint32(12, true);
    expect(dv.getUint32(at + 4, true)).toBe(0x004e4942);           // 'BIN\0'
    expect([...out.slice(at + 8, at + 8 + 8)]).toEqual([...bin]);
  });

  it('잘라낸 GLB 의 헤더가 유효하다 — 남의 로더가 열 수 있어야 한다', () => {
    const r = extractForeignGlb(packGlb(worldWithAddition(), new Uint8Array([9, 9, 9, 9])));
    const dv = new DataView(r.glb!);
    expect(dv.getUint32(0, true)).toBe(0x46546c67);                // 'glTF'
    expect(dv.getUint32(4, true)).toBe(2);
    // ⚠ offset 8 은 **전체 파일 길이**다(offset 12 가 JSON 청크 길이). 이 둘을 바꿔 적은
    // 것이 이 회차 검수관 블로커였다 — 같은 실수를 조립 쪽에서 반복하지 않는지 본다.
    expect(dv.getUint32(8, true)).toBe(r.glb!.byteLength);
    expect(dv.getUint32(12, true)).toBeLessThan(r.glb!.byteLength);
  });

  it('같은 버퍼를 두 파서가 각각 읽는다 — 실제 배선이 그렇다', () => {
    // `parseWorldGlb`(배치 되돌리기)와 `extractForeignGlb`(남의 메시)가 **같은
    // ArrayBuffer** 를 각각 읽는다. 순서가 결과를 바꾸면 안 된다.
    //
    // ⚠ 여기 원래 «원본 JSON 을 제자리에서 수정하지 않는가» 를 재는 검사가 있었고
    // **검출력이 0 이었다**(뮤테이션 실측: `{ ...g }` 복사를 걷어내도 7건 전부 통과).
    // `readGlbJson` 이 매번 새로 파싱하므로 제자리 수정이 원본 버퍼에 닿지 않는다 —
    // 막으려던 위험이 실재하지 않는 방어선이었다. 이 저장소가 `parcelWater` 의
    // «광장 무조건 dry» 를 걷어낸 것과 같은 형태라, 실제 배선을 재는 축으로 바꾼다.
    const buf = packGlb(worldWithAddition());
    const foreignFirst = extractForeignGlb(buf).meshNodes;
    const parsed = parseWorldGlb(buf);
    const foreignAfter = extractForeignGlb(buf).meshNodes;

    expect(foreignFirst).toBe(foreignAfter);
    // 되읽기는 우리 파츠 둘을 찾는다(물판·추가한 것은 배치가 아니다).
    expect(parsed.nodes.map((n) => n.kind).sort()).toEqual(['building', 'lamp']);
  });

  it('순환 참조가 있어도 안 멈춘다 — 손으로 편집된 파일 방어', () => {
    const doc = worldWithAddition();
    (doc.nodes[4] as Record<string, unknown>).children = [0];   // 4 → 0 → 4
    expect(() => extractForeignGlb(packGlb(doc))).not.toThrow();
  });
});

describe('배선 — 잘라낸 것이 실제로 씬까지 간다', () => {
  // ⚠ **이 회차에 같은 형태를 이미 한 번 겪었다.** GX-1 이 `frozenAt:` 만 걷고
  // `layoutSource:` 를 안 봐서 내보내기 경로가 검사 밖이었고, 검수관이 뮤테이션으로
  // 「99개 전부 통과」를 실증했다(블로커 2). 새 갈래를 만들었으면 그 갈래가 **배선까지
  // 이어지는지**를 함께 못 박는다 — 안 그러면 `applyImported` 를 빠뜨려도 아무도 모르고,
  // 감독이 추가한 물건이 조용히 사라진다.
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
  const MAIN = readFileSync(join(ROOT, 'frontend/js/world2/main.ts'), 'utf8');
  const PANEL = readFileSync(join(ROOT, 'frontend/js/world2/ui/export-panel.ts'), 'utf8');

  it('`main.ts` 가 씬 레이어를 만들고 되읽기 패널에 넘긴다', () => {
    expect(MAIN).toMatch(/createImportedScene\s*\(\s*scene\s*\)/);
    expect(MAIN).toMatch(/applyImported:/);
  });

  it('패널이 그것을 **파츠 판정보다 먼저** 부른다 — 파츠 0 이어도 올라와야 한다', () => {
    // 감독이 밟은 결함이 정확히 순서였다: `nodes.length === 0` 이면 곧장 되돌아가느라
    // 남의 메시를 볼 기회가 없었다. 순서가 뒤집히면 그 결함이 그대로 살아난다.
    const callAt = PANEL.indexOf('applyImported');
    const guardAt = PANEL.indexOf('nodes.length === 0');
    expect(callAt, '`applyImported` 호출을 못 찾았다').toBeGreaterThan(0);
    expect(guardAt, '파츠 0 판정을 못 찾았다').toBeGreaterThan(0);
    expect(callAt).toBeLessThan(guardAt);
  });

  it('거절 판정을 **패널이 직접 하지 않는다** — 검사 닿는 곳으로 옮겼다', () => {
    // ⚠ 이 검사가 원래 `PANEL` 에서 `nodes.length === 0 && foreign === 0` 을 찾았다.
    // 검수관 조건 C1 로 그 판정이 `ui/import-notice.ts` 의 순수 함수로 옮겨졌다 —
    // 인라인이던 시절 **어떤 검사도 닿지 않아** `failed` 를 죽여도 게이트가 통과했다.
    //
    // 그래서 여기서는 «패널이 그 함수를 쓰는가» 만 본다. 판정 자체(양쪽 다 0 일 때만
    // 거절 · 실패를 파츠가 실려도 말한다)는 `tests/world2-import-notice.test.ts` 가
    // **동작으로** 검사한다 — 텍스트 매칭보다 강한 축이다.
    expect(PANEL).toMatch(/importNotice\(/);
    // ⚠ **«쓰고 있는가» 만 보면 약하다.** `notice.reject` 는 패널에 여러 번 나오므로
    // 판정 한 자리를 옛 인라인 식으로 되돌려도 「존재」 검사는 통과한다(실측: 0건 FAIL).
    // 그래서 **인라인으로 다시 적는 것을 막는** 쪽으로 본다 — GX-1 과 같은 형태다.
    expect(PANEL, '판정을 여기서 다시 적으면 두 곳이 갈린다')
      .not.toMatch(/nodes\.length === 0 && foreign === 0/);
  });
});

describe('버퍼를 약속했는데 BIN 이 없는 파일 — 실측이 잡은 크래시', () => {
  // ── 왜 이 검사가 생겼나 (실측 2026-08-25) ────────────────────────────────
  // 브라우저 실측에서 되읽기가 통째로 실패했다:
  //
  //   TypeError: Cannot read properties of null (reading 'slice')  ← GLTFLoader 안
  //
  // 원인은 `buffers: [{byteLength: 426276}]` 로 **버퍼를 약속하면서 BIN 청크가 없는**
  // GLB 였다. GLTFLoader 는 그런 파일에서 `GLTFBinaryExtension.body` 가 `null` 인 채
  // 진행하다 죽는다.
  //
  // ⚠ 그 크래시가 **되읽기 전체를 넘어뜨려 파츠 배치까지 안 실렸다** — 감독이 신고한
  // «아무 일도 안 일어난다» 와 같은 형태다. 한 갈래의 실패가 전체를 죽이는 것.
  //
  // ⚠⚠ 그 파일을 만든 것은 **내 측정 스크립트**였다(`packGlb` 가 BIN 을 안 붙였다).
  // 검수관이 권고 P-b 로 정확히 그 한계를 지적해 뒀는데(«블렌더가 낸 파일의 충실도는
  // 아니다») 되읽기가 GLTFLoader 를 쓰게 되면서 그 한계가 **실제 결함으로 물렸다.**
  // 남이 만든 손상 파일에서도 같은 일이 난다.

  /** 버퍼를 약속하지만 BIN 청크가 없는 GLB — 손상됐거나 잘못 조립된 파일 */
  function withoutBin() {
    return packGlb({ ...worldWithAddition(), buffers: [{ byteLength: 1024 }] });
  }

  it('올릴 메시가 있어도 **`null` 을 낸다** — 로더에 넘기면 죽는다', () => {
    const r = extractForeignGlb(withoutBin());
    expect(r.meshNodes, '남의 메시는 세되').toBe(1);
    expect(r.glb, 'BIN 이 없으면 넘기지 않는다').toBeNull();
    expect(r.reason).toBe('no-bin');
  });

  it('BIN 이 있으면 그대로 통과한다 — 위 판정이 정상 파일을 막지 않는다', () => {
    const r = extractForeignGlb(packGlb(worldWithAddition(), new Uint8Array(64)));
    expect(r.glb, '정상 파일까지 막으면 기능이 죽는다').not.toBeNull();
    expect(r.reason).toBe('ok');
  });

  it('버퍼를 약속하지 않으면 BIN 이 없어도 통과한다 — 지오가 없는 GLB 도 유효하다', () => {
    // `buffers` 가 비면 accessor 가 참조할 것이 없다 — 로더가 죽지 않는다.
    const r = extractForeignGlb(packGlb({ ...worldWithAddition(), buffers: [] }));
    expect(r.reason).toBe('ok');
  });

  it('외부 `uri` 버퍼는 BIN 판정 대상이 아니다', () => {
    const r = extractForeignGlb(packGlb({
      ...worldWithAddition(),
      buffers: [{ uri: 'scene.bin', byteLength: 1024 }],
    }));
    expect(r.reason, 'GLB 내장 버퍼만 본다').toBe('ok');
  });
});

describe('잘린 GLB — 선언 길이가 파일 끝을 넘는다 (검수관 권고 P1)', () => {
  // 안 보던 판본은 `new Uint8Array(src, offset, length)` 가
  // `RangeError: Invalid typed array length` 로 **던졌다.** 던지면 되읽기 전체가
  // 넘어가 파츠 배치까지 안 실린다 — 이 회차가 고친 바로 그 형태다.
  it('던지지 않고 `no-bin` 으로 답한다', () => {
    // **버퍼를 약속한** 파일이어야 한다 — 약속이 없으면 BIN 이 없어도 정상(`ok`)이고
    // 그 갈래는 이 검사의 대상이 아니다.
    const base = packGlb({ ...worldWithAddition(), buffers: [{ byteLength: 64 }] }, new Uint8Array(64));
    const dv = new DataView(base);
    const jsonLen = dv.getUint32(12, true);
    // BIN 청크 헤더의 길이만 터무니없이 크게 바꾼다(파일은 그대로 자른 채 둔다).
    dv.setUint32(20 + jsonLen, 999999, true);
    expect(() => extractForeignGlb(base)).not.toThrow();
    expect(extractForeignGlb(base).reason, '잘린 BIN 은 없는 것과 같다').toBe('no-bin');
  });
});
