// world-glb/decide/glb-checklist.ts — **GLB 를 불러온 직후의 자가진단.** 순수 함수만, DOM 접촉 0.
//
// ── 왜 만드나 (감독 지시 2026-08-28) ────────────────────────────────────────
// *"월드7에 지엘비 불러오면 똑같이 되는거지? 처음에 불러올때 체크리스트를 만들어서.
// 정상적으로 동작하는지 확인하는 과정이 있으면 좋겠다. 당분간.. 월드7에만.."*
//
// world7 은 **사용자가 고른 임의 GLB** 를 세계로 세운다. world8 의 고정 자산과 달리
// 무엇이 들어올지 모르고, 그래서 「떴는데 뭔가 이상하다」가 나면 원인을 짚을 단서가 없다.
//
// ── 항목은 «이 회차에 실제로 겪은 실패» 다 ─────────────────────────────────
// 추상적인 건강검진이 아니라 **우리가 실제로 당한 것들**을 항목으로 만든다. 그래야
// 다음에 같은 일이 나면 화면이 먼저 말한다:
//
//   · 검은 화면      — 스폰 지점 0.3m 앞에 조형물이 서 있었다. 수치는 전부 정상이었다
//   · 미니맵 누락    — 트리는 `w8-` 로 찾는데 페이지가 `w7-` 이라 통째로 빠졌다
//   · 컬링 미등록    — 한 번도 안 돌았는데 진단이 **정상값과 같은 숫자**를 냈다(457/457)
//   · 그림자 3중 유실 — 띄움·크기·실루엣이 GLB 에 안 실렸다
//
// ── 판정을 셋으로 가른다 — 「안 쟀다」가 「정상」과 섞이면 안 된다 ──────────
// 이 저장소가 반복해서 당한 형태다(*"못 잰 것이 통과로 적히는 경향"*). 그래서
// `unknown` 을 별도 상태로 둔다 — `-1`·`null` 이 오면 초록이 아니라 **물음표**다.
//
// ⚠ **`na`(해당 없음)도 초록이 아니다.** world2 산이 아닌 GLB 에는 그림자 데칼이
// 없는 것이 정상이지만, 그것을 ✅ 로 적으면 「그림자 보정이 걸렸다」로 읽힌다.

/** 한 항목의 판정 */
export type ChecklistState =
  /** 정상 */ 'ok'
  /** 확인이 필요하다 — 틀렸다고 단정하지 않는다 */ | 'warn'
  /** 못 쟀다. **초록이 아니다** */ | 'unknown'
  /** 이 GLB 에는 해당 없음(예: world2 산이 아니라 그림자 데칼이 없다) */ | 'na';

export interface ChecklistItem {
  /** 화면에 보일 이름 */
  label: string;
  state: ChecklistState;
  /** 실측값 — 사람이 읽는 한 줄. 판정 근거를 숨기지 않는다 */
  detail: string;
  /** `warn` 일 때 무엇을 해야 하는가. 없으면 생략 */
  hint?: string;
}

/** 체크리스트가 읽는 것. **전부 이미 있는 값이다** — 이 기능 때문에 새로 계측하지 않는다 */
export interface ChecklistInput {
  /** `describeGlb()` 결과. `null` 이면 GLB 가 안 섰다 */
  glb: {
    meshes: number; triangles: number; instanced: number;
    shadowDecals: number; liftedDecals: number;
    boxFixed: number; boxSkipped: number; atlasPainted: number;
    /** 세계 바운딩. `describeGlb` 가 주는 형태 그대로다 */
    box: { min: readonly [number, number, number]; max: readonly [number, number, number] } | null;
  } | null;
  /** 거리 컬링. `ticks === 0` 은 「판정이 한 번도 안 돌았다」 */
  stream: { on: number; total: number; ticks: number; radius: number; grid: number | null } | null;
  /** 구운 지도. `painted === 0` 은 「지도가 비었다」 */
  map: { painted: number; px: number } | null;
  /** 예열된 파이프라인 수. `-1` 은 측정 실패(0 과 구별된다) */
  pipelines: number;
  /** 카메라 정면 N m 안의 것 — 검은 화면 사고의 처방 */
  ahead: readonly { d: number; name: string }[] | null;
  /** 부팅 단계별 경과(ms) */
  timeline: readonly { stage: string; atMs: number }[];
  /** 부팅 중 잡힌 콘솔 에러 수 */
  errors: number;
}

/** 정면에 이보다 가까이 있으면 시야를 막을 수 있다(m). 검은 화면 때 실측 0.3m 였다 */
const AHEAD_BLOCK_M = 1.0;
/** 세계가 이보다 작으면 「빈 GLB 를 세운 것」에 가깝다(m) */
const TINY_WORLD_M = 2;

const n = (v: number) => v.toLocaleString();

/**
 * 불러온 GLB 가 **정상적으로 섰는가**를 항목별로 판정한다.
 *
 * ⚠ **틀렸다고 단정하지 않는다.** 임의 GLB 는 우리가 모르는 형태일 수 있어, 이상해
 * 보이는 것도 그 파일에서는 정상일 수 있다. 그래서 `warn` 의 문구는 「확인해 보라」이지
 * 「고장났다」가 아니다 — 판정하는 것은 감독이고 이 화면은 근거를 내놓는 자리다.
 */
export function buildChecklist(i: ChecklistInput): ChecklistItem[] {
  const out: ChecklistItem[] = [];
  const g = i.glb;

  // ── ① 세계가 섰는가 ──────────────────────────────────────────────────────
  if (!g) {
    out.push({
      label: '세계', state: 'warn', detail: 'GLB 가 안 섰다',
      hint: '파일이 비었거나 파싱에 실패했다. 콘솔을 본다',
    });
  } else if (g.meshes === 0) {
    out.push({
      label: '세계', state: 'warn', detail: '메시 0개',
      hint: '그릴 것이 없는 파일이다',
    });
  } else {
    out.push({
      label: '세계', state: 'ok',
      detail: `메시 ${n(g.meshes)}개 · 삼각형 ${n(g.triangles)}개`,
    });
  }

  // ── ② 크기 — 너무 작으면 「세우긴 했는데 안 보인다」가 된다 ───────────────
  if (!g || !g.box) {
    out.push({ label: '크기', state: 'unknown', detail: '바운딩을 못 구했다' });
  } else {
    const x = g.box.max[0] - g.box.min[0];
    const y = g.box.max[1] - g.box.min[1];
    const z = g.box.max[2] - g.box.min[2];
    const tiny = Math.max(x, z) < TINY_WORLD_M;
    out.push({
      label: '크기', state: tiny ? 'warn' : 'ok',
      detail: `${x.toFixed(1)} × ${y.toFixed(1)} × ${z.toFixed(1)} m`,
      ...(tiny ? { hint: `가로세로가 ${TINY_WORLD_M}m 도 안 된다 — 단위가 다를 수 있다(cm/mm)` } : {}),
    });
  }

  // ── ③ 인스턴싱 — 반복 메시를 묶었는가 ────────────────────────────────────
  if (!g) {
    out.push({ label: '인스턴싱', state: 'unknown', detail: '—' });
  } else if (g.instanced === 0) {
    out.push({
      label: '인스턴싱', state: 'warn', detail: '묶은 벌 0',
      hint: '되묶기가 아무것도 못 묶었다. 드로우콜이 메시 수만큼 난다',
    });
  } else {
    const per = g.meshes > 0 ? (g.meshes / g.instanced).toFixed(1) : '—';
    out.push({
      label: '인스턴싱', state: 'ok',
      detail: `${n(g.instanced)}벌로 묶음 (벌당 평균 ${per}개)`,
    });
  }

  // ── ④ 거리 컬링 — **`ticks === 0` 이 「안 돌았다」의 유일한 단서다** ──────
  // 한 회차 앞에서 컬링이 한 번도 등록되지 않았는데 진단이 «457/457» 을 냈다.
  // 그 값은 「전부 켬」이라 **정상값과 구별되지 않았다.** 그래서 횟수를 따로 본다.
  if (!i.stream) {
    out.push({
      label: '거리 컬링', state: 'warn', detail: '시스템이 없다',
      hint: '안개가 꺼져 있으면(`?fogd=0`) 컬링도 안 건다 — 그 경우는 정상',
    });
  } else if (i.stream.ticks === 0) {
    out.push({
      label: '거리 컬링', state: 'warn', detail: `판정이 한 번도 안 돌았다 (셀 ${n(i.stream.total)}개)`,
      hint: '커널에 등록이 안 됐을 수 있다',
    });
  } else {
    out.push({
      label: '거리 컬링', state: 'ok',
      detail: `${n(i.stream.on)}/${n(i.stream.total)} 셀 · 반경 ${Math.round(i.stream.radius)}m`
        + (i.stream.grid ? ` · 격자 ${i.stream.grid}×${i.stream.grid}` : ''),
    });
  }

  // ── ⑤ 지도 ──────────────────────────────────────────────────────────────
  if (!i.map) {
    out.push({ label: '지도', state: 'unknown', detail: '안 구웠다' });
  } else if (i.map.painted === 0) {
    out.push({
      label: '지도', state: 'warn', detail: '한 칸도 안 칠했다',
      hint: '지도가 빈 사각으로 보인다',
    });
  } else {
    out.push({ label: '지도', state: 'ok', detail: `${n(i.map.painted)}칸 · ${i.map.px}px` });
  }

  // ── ⑥ 그림자(AO) — world2 산 GLB 에만 있다 ──────────────────────────────
  // 없는 것이 **정상**이다(남의 GLB 에 우리 데칼이 있을 리 없다). 그래서 `na` 이고,
  // ✅ 로 적지 않는다 — 초록으로 두면 「보정이 걸렸다」로 읽힌다.
  if (!g || g.shadowDecals === 0) {
    out.push({
      label: '그림자(AO)', state: 'na',
      detail: '이 GLB 에는 우리 AO 데칼이 없다 — 보정 안 함',
      hint: '월드2에서 내보낸 파일이 아니면 정상이다',
    });
  } else {
    const lifted = g.liftedDecals === g.shadowDecals;
    const parts = [
      `데칼 ${n(g.shadowDecals)}개`,
      `띄움 ${n(g.liftedDecals)}`,
      `크기 ${n(g.boxFixed)}${g.boxSkipped > 0 ? `(건너뜀 ${n(g.boxSkipped)})` : ''}`,
      `실루엣 ${n(g.atlasPainted)}`,
    ];
    out.push({
      label: '그림자(AO)', state: lifted ? 'ok' : 'warn',
      detail: parts.join(' · '),
      ...(lifted ? {} : { hint: '띄움이 데칼 수와 안 맞는다 — 일부가 지면에 묻힌다' }),
    });
  }

  // ── ⑦ 정면 — **검은 화면 사고의 처방** ──────────────────────────────────
  // 그때 콘솔 0 · 삼각형 135만 · 기능 10개로 수치는 전부 정상이었고, 화면만 검었다.
  // 원인은 스폰 지점 **0.3m 앞**에 선 조형물이었다. 수치로는 영영 안 보였을 것이다.
  if (!i.ahead) {
    out.push({ label: '정면', state: 'unknown', detail: '못 쟀다' });
  } else {
    const near = i.ahead.filter((a) => a.d < AHEAD_BLOCK_M);
    if (near.length > 0) {
      const f = near[0]!;
      out.push({
        label: '정면', state: 'warn',
        detail: `${f.d.toFixed(1)}m 앞에 ${f.name}`,
        hint: '시야를 막고 있을 수 있다 — 화면이 검거나 한 색으로 덮이면 이것이다',
      });
    } else {
      const f = i.ahead[0];
      out.push({
        label: '정면', state: 'ok',
        detail: f ? `가장 가까운 것 ${f.d.toFixed(1)}m` : '가까운 것 없음',
      });
    }
  }

  // ── ⑧ 예열 — `-1` 은 측정 실패이고 0 과 다르다 ──────────────────────────
  if (i.pipelines < 0) {
    out.push({ label: '예열', state: 'unknown', detail: '파이프라인 수를 못 읽었다' });
  } else if (i.pipelines === 0) {
    out.push({
      label: '예열', state: 'warn', detail: '파이프라인 0',
      hint: '아직 아무것도 안 그렸을 수 있다',
    });
  } else {
    out.push({ label: '예열', state: 'ok', detail: `파이프라인 ${n(i.pipelines)}개` });
  }

  // ── ⑨ 콘솔 에러 ────────────────────────────────────────────────────────
  out.push(i.errors === 0
    ? { label: '콘솔', state: 'ok', detail: '에러 없음' }
    : { label: '콘솔', state: 'warn', detail: `에러 ${n(i.errors)}건`, hint: '개발자 도구를 본다' });

  // ── ⑩ 로딩 시간 — 판정하지 않고 **적는다** ─────────────────────────────
  // 얼마가 「느린 것」인지는 파일마다 다르다. 임의 GLB 에 임계를 박으면 거짓 경고가 난다.
  const last = i.timeline.length > 0 ? i.timeline[i.timeline.length - 1]! : null;
  out.push({
    label: '로딩',
    state: last ? 'ok' : 'unknown',
    detail: last ? `${(last.atMs / 1000).toFixed(1)}초` : '못 쟀다',
  });

  return out;
}

/** 화면 맨 위 한 줄 요약. **`warn` 이 하나라도 있으면 그것을 먼저 말한다** */
export function summarize(items: readonly ChecklistItem[]): { ok: boolean; text: string } {
  const warn = items.filter((x) => x.state === 'warn').length;
  const unknown = items.filter((x) => x.state === 'unknown').length;
  if (warn > 0) return { ok: false, text: `확인할 것 ${warn}건` };
  // ⚠ `unknown` 을 초록으로 뭉개지 않는다 — 못 잰 것은 통과가 아니다.
  if (unknown > 0) return { ok: false, text: `못 잰 항목 ${unknown}건` };
  return { ok: true, text: '모두 정상' };
}
