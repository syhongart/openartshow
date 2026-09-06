// 뉴욕 갤러리 거리 생성기 — **명세(art-direction §2·§3·§6 · tasks.md 노드 규약)를 단언으로 옮긴 것.**
//
// 팀장 조건 1(2026-09-06): 구현이 아니라 명세에서 단언을 만든다. 첫 executor 판본(건물 박스 6 + 도로 1,
// 재질 1, 창·문·슬롯·COLOR_0 없음)은 «완료» 로 보고됐고 그 판본의 테스트는 «박스 6개 배치» 만 봤다 —
// 테스트가 구현을 따라간 형태. 여기 단언은 그 판본이면 전부 빨간불이어야 한다(뮤테이션 M-A: `facade.mjs`
// 의 holes 를 비우고 슬롯을 지우면 «개구부·슬롯·재질 수» 단언이 FAIL — 부팀장 실측, BOARD).
import { describe, it, expect } from 'vitest';
import { inflateSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildStreet } from '../scripts/asset/nyc/generate.mjs';
import { layoutBuildings, rhythmOk, galleryRoom, hexToLinear, PALETTE, DIMS } from '../scripts/asset/nyc/layout.mjs';
import { brickAlbedo, brickCell, GROUT } from '../scripts/asset/nyc/textures.mjs';
import { isRoomLightNode } from '../frontend/js/world-glb/decide/glb-nodes.js';

type Node = { name: string; mesh?: number; translation?: number[]; rotation?: number[]; extras?: Record<string, unknown>; children?: number[] };
type Json = { nodes: Node[]; meshes: { primitives: { attributes: Record<string, number>; material: number; indices: number }[] }[]; materials: { name: string; pbrMetallicRoughness: { baseColorFactor: number[] } }[]; accessors: { count: number }[] };

const built = buildStreet({ seed: 1 }) as { glb: Buffer; json: Json; summary: Record<string, number> };
const names = built.json.nodes.map((n) => n.name);
const byName = (n: string) => built.json.nodes.find((x) => x.name === n);

describe('결정성', () => {
  it('같은 seed 는 바이트 동일, 다른 seed 는 다르다(불 켜진 창 선택이 seed 를 소비한다)', () => {
    const a = buildStreet({ seed: 1 }).glb, b = buildStreet({ seed: 1 }).glb, c = buildStreet({ seed: 7 }).glb;
    expect(Buffer.compare(a, b)).toBe(0);
    expect(Buffer.compare(a, c)).not.toBe(0);
  });
});

describe('배치 판정(순수)', () => {
  const bs = layoutBuildings();
  it('6채 — 북 4 · 남 2, 층수 집합 {3,4,5}, 같은 쪽 인접 폭이 같지 않다', () => {
    expect(bs).toHaveLength(6);
    expect(bs.filter((b) => b.side === 'N')).toHaveLength(4);
    expect(new Set(bs.map((b) => b.stories))).toEqual(new Set([3, 4, 5]));
    expect(rhythmOk(bs)).toBe(true);
  });
  it('갤러리는 bld.2(아이보리 A · 12m · 5층), 비상계단은 1채만', () => {
    const g = bs.find((b) => b.gallery)!;
    expect(g.id).toBe(2); expect(g.faceMat).toBe('ivoryA'); expect(g.width).toBe(12); expect(g.stories).toBe(5);
    expect(bs.filter((b) => b.escape)).toHaveLength(1);
  });
  it('--brick=B 는 벽돌 A 만 바꾼다', () => {
    const b = layoutBuildings({ brick: 'B' });
    expect(b.filter((x) => x.faceMat === 'brickA_B')).toHaveLength(2);
    expect(b.filter((x) => x.faceMat === 'brickB')).toHaveLength(1);
  });
  it('슬롯 4 — 방 안쪽 박스 안에 있고 법선이 방 안쪽을 향한다(중심→슬롯 벡터와 법선의 내적 < 0)', () => {
    const g = bs.find((b) => b.gallery)!;
    const room = galleryRoom(g);
    const cx = (room.inner.x0 + room.inner.x1) / 2, cz = (room.inner.z0 + room.inner.z1) / 2;
    expect(room.slots).toHaveLength(4);
    for (const s of room.slots) {
      expect(s.pos[0]).toBeGreaterThanOrEqual(room.inner.x0); expect(s.pos[0]).toBeLessThanOrEqual(room.inner.x1);
      expect(s.pos[2]).toBeGreaterThanOrEqual(room.inner.z0); expect(s.pos[2]).toBeLessThanOrEqual(room.inner.z1);
      expect(s.pos[1]).toBe(DIMS.SLOT_H);
      const dot = (s.pos[0] - cx) * s.normal[0] + (s.pos[2] - cz) * s.normal[2];
      expect(dot).toBeLessThan(0);
    }
  });
});

describe('GLB — 노드 이름 규약(tasks.md)', () => {
  it('bld.1..6 · bld.<n>.door × 6 · bld.2.room.1 · slot.1..4(extras w/h) · gate.1 · ground.* 7', () => {
    for (let i = 1; i <= 6; i++) { expect(names).toContain(`bld.${i}`); expect(names).toContain(`bld.${i}.door`); }
    expect(names).toContain('bld.2.room.1');
    for (let s = 1; s <= 4; s++) {
      const n = byName(`bld.2.room.1.slot.${s}`)!;
      expect(n).toBeDefined();
      expect(typeof n.extras?.w).toBe('number'); expect(typeof n.extras?.h).toBe('number');
      expect(n.translation).toHaveLength(3);
    }
    expect(names).toContain('gate.1');
    expect(names.filter((n) => n.startsWith('ground.'))).toHaveLength(7); // 도로·보도 2·연석 2·뒷마당 2
  });
  it('문 노드는 y=0, 개구 폭 1.8(extras)', () => {
    for (let i = 1; i <= 6; i++) {
      const d = byName(`bld.${i}.door`)!;
      expect(d.translation![1]).toBe(0);
      expect(d.extras?.w).toBe(1.8);
    }
  });
  it('방 라이트 노드 — bld.2.room.1.light 빈 노드가 있고, isRoomLightNode 정규식과 일치한다', () => {
    const light = byName('bld.2.room.1.light')!;
    expect(light).toBeDefined();
    expect(light.mesh).toBeUndefined(); // 빈 노드(메시 없음)
    expect(isRoomLightNode(light.name)).toBe(true);
    // 방 내 라이트는 정확히 1개
    const roomLights = names.filter((n) => n.startsWith('bld.2.room.1.') && isRoomLightNode(n));
    expect(roomLights).toHaveLength(1);
  });
});

describe('GLB — 개구부·모듈·재질·상한', () => {
  const matName = (i: number) => built.json.materials[i].name;
  const meshMats = (prefix: string) => built.json.nodes
    .filter((n) => n.name.startsWith(prefix) && n.mesh !== undefined)
    .map((n) => matName(built.json.meshes[n.mesh!].primitives[0].material));
  it('건물마다 입면·트림·금속(창틀)·유리 메시가 있다 — 창·문이 «있다» 의 증거는 유리·금속 재질의 존재다', () => {
    for (let i = 1; i <= 6; i++) {
      const mats = meshMats(`bld.${i}.`);
      expect(mats.some((m) => m.startsWith('brick') || m.startsWith('ivory'))).toBe(true);
      expect(mats.some((m) => m.endsWith('Trim'))).toBe(true);
      expect(mats).toContain('metal');
      expect(mats.some((m) => m.startsWith('glass'))).toBe(true);
    }
    // 갤러리 1층은 투명 유리(glass1), 실내 3 재질
    expect(meshMats('bld.2.')).toContain('glass1');
    for (const m of ['roomWall', 'roomFloor', 'roomCeil']) expect(meshMats('bld.2.')).toContain(m);
  });
  it('모든 메시에 COLOR_0 이 있고 VEC4 u8 정규화다(정렬 4 — stride 3 은 glTF 위반)', () => {
    const acc = (built.json as unknown as { accessors: { type: string; componentType: number; normalized?: boolean }[] }).accessors;
    for (const m of built.json.meshes) {
      const c = m.primitives[0].attributes.COLOR_0;
      expect(c).toBeDefined();
      expect(acc[c].type).toBe('VEC4'); expect(acc[c].componentType).toBe(5121); expect(acc[c].normalized).toBe(true);
    }
  });
  it('재질 색은 팔레트(linear 변환) 또는 그 −8% 트림 안에 있다, 재질 ≤ 20', () => {
    const pal = new Set<string>();
    for (const hex of Object.values(PALETTE)) { pal.add(hexToLinear(hex).map((v) => v.toFixed(4)).join(',')); pal.add(hexToLinear(hex, 0.92).map((v) => v.toFixed(4)).join(',')); }
    for (const m of built.json.materials) {
      const pm = m.pbrMetallicRoughness as { baseColorFactor: number[]; baseColorTexture?: unknown };
      const rgb = pm.baseColorFactor.slice(0, 3).map((v) => v.toFixed(4)).join(',');
      // 알베도 텍스처가 있는 재질(벽돌)은 색을 텍스처에 굽고 factor 는 흰색(textures.mjs 헤더)
      if (pm.baseColorTexture) expect(rgb, m.name).toBe('1.0000,1.0000,1.0000');
      else expect(pal.has(rgb), m.name).toBe(true);
    }
    expect(built.json.materials.length).toBeLessThanOrEqual(20);
  });
  it('상한 — 삼각형 ≤ 60,000 · 노드 ≤ 2,000 · 바이트 ≤ 5MB(목표 1MB)', () => {
    expect(built.summary.triangles).toBeLessThanOrEqual(60000);
    expect(built.summary.nodes).toBeLessThanOrEqual(2000);
    expect(built.summary.bytes).toBeLessThanOrEqual(5 * 1024 * 1024);
    expect(built.summary.buildings).toBe(6);
  });
  it('--street-yaw 는 루트 노드 하나만 돌린다', () => {
    const r = buildStreet({ seed: 1, streetYaw: 25 }).json as Json;
    const rotated = r.nodes.filter((n) => n.rotation && n.name === 'street');
    expect(rotated).toHaveLength(1);
    expect(r.nodes[0].name).toBe('street');
  });
});

describe('텍스처 — 감독 «벽돌 텍스처 + 전체 노말맵», 팀장 판정 C(절차 생성 타일)', () => {
  type Mat = { name: string; normalTexture?: { index: number; scale: number }; pbrMetallicRoughness: { baseColorTexture?: { index: number } } };
  const mats = built.json.materials as unknown as Mat[];
  const images = (built.json as unknown as { images: { mimeType: string; bufferView: number }[] }).images;
  it('벽돌 재질은 알베도+노말, 아이보리·실내·아스팔트·보도는 노말, 금속·유리는 없음', () => {
    const byName = Object.fromEntries(mats.map((m) => [m.name, m]));
    for (const n of ['brickA', 'brickB']) { expect(byName[n].pbrMetallicRoughness.baseColorTexture).toBeDefined(); expect(byName[n].normalTexture).toBeDefined(); }
    for (const n of ['ivoryA', 'ivoryB', 'roomWall', 'asphalt', 'walk', 'ivoryATrim']) expect(byName[n].normalTexture, n).toBeDefined();
    for (const n of ['metal', 'glass1', 'glassU']) { expect(byName[n].normalTexture).toBeUndefined(); expect(byName[n].pbrMetallicRoughness.baseColorTexture).toBeUndefined(); }
  });
  it('타일은 공유된다 — 이미지 ≤ 8장, 전부 PNG, 총 GLB ≤ 5MB', () => {
    expect(images.length).toBeLessThanOrEqual(8);
    for (const im of images) expect(im.mimeType).toBe('image/png');
    expect(built.summary.bytes).toBeLessThanOrEqual(5 * 1024 * 1024);
  });
  it('텍스처가 붙은 메시는 TEXCOORD_0 을 갖는다', () => {
    const texMats = new Set(mats.map((m, i) => (m.normalTexture || m.pbrMetallicRoughness.baseColorTexture) ? i : -1));
    for (const m of built.json.meshes) {
      const p = m.primitives[0];
      if (texMats.has(p.material)) expect(p.attributes.TEXCOORD_0, `mesh mat ${p.material}`).toBeDefined();
    }
  });
  it('--no-tex 대조군은 이미지 0 · 재질 색이 전부 팔레트', () => {
    const plain = buildStreet({ seed: 1, textures: false }) as { json: { images: unknown[]; materials: { normalTexture?: unknown }[] } };
    expect(plain.json.images).toHaveLength(0);
    for (const m of plain.json.materials) expect(m.normalTexture).toBeUndefined();
  });
});

describe('벽돌 알베도 PNG — 픽셀 색이 팔레트 범위 내 (zlib 디코드 + brickCell 판정)', () => {
  // hex 값을 RGB [0..255] 로 변환
  const hexRgb = (hex: string): number[] => {
    const v = parseInt(hex.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  };

  // PNG 에서 IDAT 청크 추출 및 압축 해제
  const extractPixels = (png: Buffer): Uint8ClampedArray => {
    let idatStart = -1, idatLen = 0;
    let pos = 8; // PNG 시그니처 스킵
    while (pos < png.length) {
      const len = png.readUInt32BE(pos);
      const type = png.toString('ascii', pos + 4, pos + 8);
      if (type === 'IDAT') {
        idatStart = pos + 8;
        idatLen = len;
        break;
      }
      pos += 12 + len;
    }
    if (idatStart === -1) throw new Error('IDAT not found');
    const idat = png.slice(idatStart, idatStart + idatLen);
    return new Uint8ClampedArray(inflateSync(idat));
  };

  it('brickAlbedo(seed, hex) 의 줄눈이 아닌 픽셀 평균이 팔레트 색상 대비 0.78~1.10 범위 내 — 채널별', () => {
    // 근거: 알베도 변주 0.78~1.08 × 스폿 0.94~1.06 의 교집합
    const png = brickAlbedo(1, PALETTE.brickA) as unknown as Buffer;
    const raw = extractPixels(png);

    const size = 512;
    const brickPixels = { r: [] as number[], g: [] as number[], b: [] as number[] };

    let p = 0;
    for (let y = 0; y < size; y++) {
      p++; // 필터 바이트 건너뜀
      for (let x = 0; x < size; x++) {
        const r = raw[p++], g = raw[p++], b = raw[p++];
        const cell = brickCell(x, y, size);
        if (!cell.inGrout) {
          brickPixels.r.push(r);
          brickPixels.g.push(g);
          brickPixels.b.push(b);
        }
      }
    }

    const brickAvg = {
      r: brickPixels.r.reduce((a, v) => a + v, 0) / brickPixels.r.length,
      g: brickPixels.g.reduce((a, v) => a + v, 0) / brickPixels.g.length,
      b: brickPixels.b.reduce((a, v) => a + v, 0) / brickPixels.b.length,
    };

    const palRgb = hexRgb(PALETTE.brickA);
    for (let c = 0; c < 3; c++) {
      const ratio = (Object.values(brickAvg) as number[])[c] / palRgb[c];
      expect(ratio, `brickA channel ${c} ratio=${ratio.toFixed(3)}`).toBeGreaterThanOrEqual(0.78);
      expect(ratio, `brickA channel ${c} ratio=${ratio.toFixed(3)}`).toBeLessThanOrEqual(1.10);
    }
  });

  it('brickAlbedo 의 줄눈 픽셀 평균이 GROUT 색상 대비 0.85~1.15 범위 내', () => {
    const png = brickAlbedo(2, PALETTE.brickB) as unknown as Buffer;
    const raw = extractPixels(png);

    const size = 512;
    const groutPixels = { r: [] as number[], g: [] as number[], b: [] as number[] };

    let p = 0;
    for (let y = 0; y < size; y++) {
      p++; // 필터 바이트 건너뜀
      for (let x = 0; x < size; x++) {
        const r = raw[p++], g = raw[p++], b = raw[p++];
        const cell = brickCell(x, y, size);
        if (cell.inGrout) {
          groutPixels.r.push(r);
          groutPixels.g.push(g);
          groutPixels.b.push(b);
        }
      }
    }

    const groutAvg = {
      r: groutPixels.r.reduce((a, v) => a + v, 0) / groutPixels.r.length,
      g: groutPixels.g.reduce((a, v) => a + v, 0) / groutPixels.g.length,
      b: groutPixels.b.reduce((a, v) => a + v, 0) / groutPixels.b.length,
    };

    const groutRgb = hexRgb(GROUT);
    for (let c = 0; c < 3; c++) {
      const ratio = (Object.values(groutAvg) as number[])[c] / groutRgb[c];
      expect(ratio, `GROUT channel ${c} ratio=${ratio.toFixed(3)}`).toBeGreaterThanOrEqual(0.85);
      expect(ratio, `GROUT channel ${c} ratio=${ratio.toFixed(3)}`).toBeLessThanOrEqual(1.15);
    }
  });

  // 뮤테이션 M-T1: brickAlbedo 색상 값이 배수 곱셈을 제대로 반영하는가
  // 이 단언이 통과하려면 위 두 단언도 통과해야 함(색상 함수가 제대로 작동)
  it('뮤테이션 M-T1: 색상을 형광 핑크(#FF00FF)로 바꾸면 첫 번째 단언이 깨진다 — 별도 클론에서만 실행', () => {
    const normPng = brickAlbedo(1, PALETTE.brickA) as unknown as Buffer;
    const mutPng = brickAlbedo(1, '#FF00FF') as unknown as Buffer;

    const normRaw = extractPixels(normPng);
    const mutRaw = extractPixels(mutPng);

    const size = 512;
    let normalPassCount = 0, mutantFailCount = 0;

    let normP = 0, mutP = 0;
    for (let y = 0; y < size; y++) {
      normP++; mutP++; // 필터 바이트 건너뜀
      for (let x = 0; x < size; x++) {
        const nr = normRaw[normP++], ng = normRaw[normP++], nb = normRaw[normP++];
        const mr = mutRaw[mutP++], mg = mutRaw[mutP++], mb = mutRaw[mutP++];

        const cell = brickCell(x, y, size);
        if (!cell.inGrout) {
          const palRgb = hexRgb(PALETTE.brickA);
          // 정상: 평균이 팔레트 대비 0.78~1.10 범위
          const normRatio = [nr, ng, nb].map((v, c) => v / palRgb[c]);
          const allInRange = normRatio.every(r => r >= 0.78 && r <= 1.10);
          if (allInRange) normalPassCount++;

          // 뮤테이션: 형광색이면 정상과 다른 색상이 나와야 한다
          // 특히 G 채널이 훨씬 낮아야 한다(팔레트 brickA=8E5541 vs #FF00FF=FF00FF)
          const colorDist = Math.sqrt((nr - mr) ** 2 + (ng - mg) ** 2 + (nb - mb) ** 2);
          if (colorDist > 30) mutantFailCount++; // 색상 거리가 크면 뮤테이션이 "다르다"
        }
      }
    }

    // 정상은 많은 픽셀이 범위 내에 있어야 한다
    expect(normalPassCount).toBeGreaterThan(0);
    // 뮤테이션은 색상이 현저히 다르다
    expect(mutantFailCount).toBeGreaterThan(0);
  });
});

// ── 미러링 고정 ───────────────────────────────────────────────────────────────
// `world10-boot.ts` 는 `frontend/` 라 `scripts/` 를 import 할 수 없다. 그래서 거리 지면색이
// 두 자리에 산다 — 이 검사가 부트 파일을 **읽어서** 대조한다(값을 여기 다시 적지 않는다).
describe('부트 기본값 미러링', () => {
  it('world10-boot hemig 기본값 = layout.mjs PALETTE.curb (팀장 조건 ② — 두 값이 갈리면 여기서 깨진다)', () => {
    const src = readFileSync(join(__dirname, '..', 'frontend', 'js', 'world10-boot.ts'), 'utf8');
    const defaults = /const DEFAULTS[^=]*=\s*\{([^}]*)\}/.exec(src);
    expect(defaults, 'world10-boot.ts 에서 DEFAULTS 를 못 찾았다').not.toBeNull();
    const hemig = /hemig:\s*'([0-9a-fA-F]{6})'/.exec(defaults![1]);
    expect(hemig, 'DEFAULTS 에 hemig 기본값이 없다').not.toBeNull();
    expect(`#${hemig![1]}`.toUpperCase()).toBe(PALETTE.curb.toUpperCase());
  });
});
