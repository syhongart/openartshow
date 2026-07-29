#!/usr/bin/env node
// GLB 재질 교정 — **저작 도구가 안 쓴 값을 로더가 채운 것**만 되돌린다.
//
// ── 왜 파일을 고치나 ─────────────────────────────────────────────────────────
// `lab-space.glb`(감독 반입, 2026-07-26)는 반입 당시부터 두 결함이 기록돼 있었다:
// *"라이트가 0개고 다수 재질이 metalness=1이라 환경맵 없이는 완전히 검게 나온다"*,
// *"벽 재질 일부가 alphaMode=BLEND라 조명으로 완전히 밝힐 수 없다"*.
//
// 그 뒤 world2 로 옮기면서 런타임에서 세 겹으로 눅였다(금속 인하·투명 복원·재질 교체).
// 전부 **증상 처방**이고, 특히 재질 교체는 원본의 노멀맵·AO·emissive 와 sheen·clearcoat
// 확장을 통째로 버린다. 파일에서 한 번 고치면 그 셋이 전부 필요 없어진다.
//
// ── 무엇을 고치고 무엇을 안 고치나 ──────────────────────────────────────────
// 판별의 핵심은 **"저작자가 정한 값인가, 안 정해서 기본값이 들어온 것인가"** 다.
// glTF 스펙 기본값이 정확히 `metallicFactor=1, roughnessFactor=1` 이다. 둘이 **동시에**
// 1.0 이면 저작 도구가 그 필드를 안 쓴 것이다 — 이 파일에서 그런 재질은 이름도 전부
// 비금속이다(plaster · STUCCO-Sand-Finish · Sand-Finish · ARCH-Ridged · GlassReal ·
// Plastic · light · _Black).
//
// 반대로 `DarkMetal`(0.595) · `m.DarkShine`(0.782) · `_Black.003`(0.595)은 저작자가 값을
// 지정했고 `KHR_materials_specular`·`anisotropy` 까지 붙어 있다. **이건 진짜 금속이고
// 건드리지 않는다.** "금속이 검게 나온다"를 이유로 전부 낮추면 의도된 금속감까지 잃는다.
//
// 확장(`KHR_materials_sheen`·`clearcoat`·`specular`·`ior`·`anisotropy`)도 건드리지 않는다.
// 저작자 의도이고, 백엔드가 그것을 못 그리는 문제라면 그건 **다른 문제**다. 여기서 함께
// 지우면 두 문제가 섞여 어느 쪽이 원인인지 영영 못 가른다.
//
// ── 원본 보존 ────────────────────────────────────────────────────────────────
// 사본을 만들지 않고 덮어쓴다. **git 이 원본을 들고 있다**(도입 커밋 `6cf1190`).
// 13.5MB 사본을 저장소에 하나 더 두는 것이 보존이 아니라 중복이다.
//
// 실행: `node scripts/fix-glb-materials.mjs [--dry]`

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = path.join(ROOT, 'frontend/assets/models/lab-space.glb');

const GLB_MAGIC = 0x46546c67; // 'glTF'
const CHUNK_JSON = 0x4e4f534a; // 'JSON'

/** GLB 를 헤더·JSON·나머지(BIN 이하 전부)로 가른다. BIN 은 바이트 그대로 보존한다. */
function splitGlb(buf) {
  const magic = buf.readUInt32LE(0);
  if (magic !== GLB_MAGIC) throw new Error('GLB 가 아니다(매직 불일치)');
  const version = buf.readUInt32LE(4);
  const jsonLen = buf.readUInt32LE(12);
  const jsonType = buf.readUInt32LE(16);
  if (jsonType !== CHUNK_JSON) throw new Error('첫 청크가 JSON 이 아니다');
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  return { version, json, rest: buf.subarray(20 + jsonLen) };
}

/** JSON 을 다시 넣어 GLB 를 조립한다. 4바이트 정렬 패딩은 JSON 청크에서 공백(0x20)이다. */
function buildGlb(version, json, rest) {
  let jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
  const pad = (4 - (jsonBuf.length % 4)) % 4;
  if (pad) jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(pad, 0x20)]);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(GLB_MAGIC, 0);
  header.writeUInt32LE(version, 4);
  header.writeUInt32LE(20 + jsonBuf.length + rest.length, 8); // 전체 길이
  header.writeUInt32LE(jsonBuf.length, 12);
  header.writeUInt32LE(CHUNK_JSON, 16);
  return Buffer.concat([header, jsonBuf, rest]);
}

/**
 * 교정 규칙. **각 규칙은 "무엇을 근거로 그렇게 판단하는가"를 함께 들고 있다** — 나중에
 * 다른 GLB 에 이 스크립트를 돌릴 사람이 규칙이 자기 파일에도 맞는지 판단할 수 있어야 한다.
 */
const RULES = [
  {
    name: 'metallic',
    why: 'metallic=1 & roughness=1 은 glTF 스펙 기본값 — 저작 도구가 그 필드를 안 쓴 것이다',
    applies(m) {
      // ── "안 적혀 있다"에 **세 단계**가 있고, 두 번 놓쳤다 ──────────────────
      //   ① 값이 `1` 로 적힘        — 저작자가 정했을 수도 있다(가장 약한 증거)
      //   ② 필드가 없음             — 저작 도구가 그 필드를 안 썼다
      //   ③ `pbrMetallicRoughness` 블록 자체가 없음 — 아무것도 안 썼다(가장 강한 증거)
      //
      // 처음엔 `=== 1` 만 봐서 한 건도 안 걸렸고(이 파일엔 ①이 없다), 고친 뒤에도
      // `if (!p) return false` 가 ③을 걸러 냈다. ③이 `m.GlassReal`·`_Black`·`Plastic`
      // 인데 **이들이야말로 검게 나오는 주범**이었다.
      //
      // 처음에 그렇게 읽은 것은 내 덤프가 `get('metallicFactor', 1.0)` 으로 기본값을
      // 채워 보여줬기 때문이다 — **읽는 도구가 빈 자리를 메우면 빈 자리가 안 보인다.**
      const p = m.pbrMetallicRoughness;
      const mf = p?.metallicFactor ?? 1;
      const rf = p?.roughnessFactor ?? 1;
      return mf === 1 && rf === 1;
    },
    fix(m) {
      // 명시적으로 적는다. 다시 기본값에 기대면 같은 자리로 돌아온다.
      // `roughness` 는 건드리지 않는다 — 저작자 의도를 모르고, metallic 만 내려도
      // "검게 나온다"는 해소된다. 최소 개입.
      const had = !!m.pbrMetallicRoughness;
      m.pbrMetallicRoughness ??= {};
      m.pbrMetallicRoughness.metallicFactor = 0;
      return `metallic 1(${had ? '기본값' : 'PBR블록 없음'}) → 0`;
    },
  },
  {
    name: 'alphaMode',
    why: 'alphaMode=BLEND 인데 baseColor 알파가 1.0 — 투명일 이유가 없다. '
      + 'three 는 BLEND 를 transparent 로 옮기고 깊이 쓰기를 끄는데, WebGPU 에서 그 벽이 사라졌다',
    applies(m) {
      if (m.alphaMode !== 'BLEND') return false;
      const a = m.pbrMetallicRoughness?.baseColorFactor?.[3];
      return a === undefined || a >= 1;
    },
    fix(m) {
      delete m.alphaMode; // OPAQUE 가 기본값이라 필드를 지우는 것이 정석이다
      return 'BLEND → OPAQUE';
    },
  },
];

function main() {
  const dry = process.argv.includes('--dry');
  const before = readFileSync(TARGET);
  const { version, json, rest } = splitGlb(before);
  const mats = json.materials ?? [];

  console.log(`대상: ${path.relative(ROOT, TARGET)}`);
  console.log(`재질 ${mats.length}개 · 원본 ${before.length.toLocaleString()}B\n`);

  const changed = [];
  for (const [i, m] of mats.entries()) {
    const hits = [];
    for (const r of RULES) {
      if (!r.applies(m)) continue;
      hits.push(r.fix(m));
    }
    if (hits.length) changed.push({ i, name: m.name ?? '?', hits });
  }

  if (!changed.length) {
    console.log('고칠 것이 없다 — 이미 교정된 파일이거나 규칙이 이 파일에 맞지 않는다.');
    return;
  }

  for (const c of changed) {
    console.log(`  [${String(c.i).padStart(2)}] ${(c.name).padEnd(30)} ${c.hits.join(' · ')}`);
  }
  console.log(`\n${changed.length}개 재질 교정.`);
  for (const r of RULES) console.log(`  · ${r.name}: ${r.why}`);

  if (dry) { console.log('\n(--dry — 파일을 쓰지 않았다)'); return; }

  const after = buildGlb(version, json, rest);
  writeFileSync(TARGET, after);
  console.log(`\n기록 완료 · ${after.length.toLocaleString()}B (Δ${after.length - before.length >= 0 ? '+' : ''}${after.length - before.length})`);
  // BIN 이 그대로인지 확인 — 이 스크립트가 절대 건드리면 안 되는 것이다
  const re = splitGlb(after);
  console.log(`BIN 무손실: ${re.rest.equals(rest) ? '예' : '아니오 ← 문제'}`);
}

main();
