// scripts/lib/devlog-contributors.mjs
import { parseEntries } from './devlog-entries.mjs';
import { loadFrozenTimes, timeInfoFor } from './devlog-times.mjs';

// 개발일지 항목의 **역할별 기여 축**. 항목 단위로 역할 참여를 집계한다.
//
// ── 왜 신설했나 ──────────────────────────────────────────────────────────
// 인사기록 페이지(/team/)의 기여 건수가 손으로 적힌 상수였다(2026-07-13 이후 16일 멈춤).
// 스펙: `docs/DEVLOG.md` 의 실제 항목·태그에서 집계한 값. 이제 그것을 구현한다.
//
// ── 규칙 ────────────────────────────────────────────────────────────────
// · 항목 단위로 센다(한 항목 안에 같은 역할이 여러 번 나와도 1건)
// · 제목 + 본문 전체를 본다
// · 역할별 정규식 패턴은 아래를 그대로 쓴다
// · 팀장/부팀장 분리: 부팀장을 먼저 제거한 텍스트에서 팀장을 센다(후방탐색 대신 사전 제거)
//
// ── 못 잘래도 개선 마진이 있는 것 ─────────────────────────────────────
// 현재 정규식은 정확도를 추구하기보다 **거짓 음성(놓친 항목)을 줄이는 데 집중**했다.
// 거짓 양성(오검출)은 테스트로 막는다 — 팀장/부팀장 분리 검증이 핵심.

/**
 * 역할 메타데이터. build-team.mjs 의 ROSTER에서 파생.
 * joined 는 DEVLOG 에서 유도되므로 여기에는 없다.
 * 각 역할의 첫 등장 날짜는 countContributions() 에서 계산한다.
 */
export const ROLES = [
  // ── 정규직 · 창업자 ────────────────────────────────────────────────────
  {
    id: 'director',
    emoji: '🎬',
    name: '감독',
    handle: 'syhongart',
    role: '창업자 · 총괄 디렉터',
    tier: '창업자',
    tierClass: 'founder',
    patterns: [/감독/],
  },
  {
    id: 'lead',
    emoji: '🧠',
    name: 'Fable 5',
    handle: '팀장',
    role: '개발 총괄 · 심층 판단',
    tier: '정규직',
    tierClass: 'staff',
    // 주의: "팀장" 패턴이 "부팀장"을 포함하므로 countContributions() 에서 부팀장을 먼저 제거
    patterns: [/팀장/],
  },
  {
    id: 'deputy-lead',
    emoji: '⚙️',
    name: 'Opus 4.8',
    handle: '부팀장',
    role: '개발 실무',
    tier: '정규직',
    tierClass: 'staff',
    patterns: [/부팀장/],
  },
  {
    id: 'executor',
    emoji: '🍃',
    name: 'Haiku 4.5',
    handle: '실행',
    role: '정형 실무 · 스모크',
    tier: '정규직',
    tierClass: 'staff',
    patterns: [/executor|실행자|Haiku|haiku/],
  },
  // ── 계약직 ─────────────────────────────────────────────────────────────
  {
    id: 'legal',
    emoji: '⚖️',
    name: '법무팀',
    handle: undefined,
    role: '상표 · 규제 실사',
    tier: '계약직',
    tierClass: 'contract',
    patterns: [/법무/],
  },
  {
    id: 'security',
    emoji: '🛡️',
    name: '보안담당자',
    handle: undefined,
    role: '위협모델 · 취약점',
    tier: '계약직',
    tierClass: 'contract',
    patterns: [/보안담당|보안 담당|security-officer/],
  },
  {
    id: 'designer',
    emoji: '🎨',
    name: '디자이너',
    handle: undefined,
    role: 'VFX · HUD · 랜딩',
    tier: '계약직',
    tierClass: 'contract',
    patterns: [/디자이너/],
  },
  {
    id: 'copywriter',
    emoji: '✍️',
    name: '카피라이터',
    handle: undefined,
    role: '네이밍 · 카피',
    tier: '계약직',
    tierClass: 'contract',
    patterns: [/카피라이터|카피/],
  },
  {
    id: 'perf-analyst',
    emoji: '⚡',
    name: '성능 전문가',
    handle: undefined,
    role: '렌더링 진단',
    tier: '계약직',
    tierClass: 'contract',
    patterns: [/성능 전문가|performance-analyst/],
  },
  {
    id: 'researcher',
    emoji: '🔬',
    name: '리서처',
    handle: undefined,
    role: '지원금 · 시장 조사',
    tier: '계약직',
    tierClass: 'contract',
    patterns: [/리서처/],
  },
  {
    id: 'reviewer',
    emoji: '🔎',
    name: '검수관',
    handle: undefined,
    role: '교차리뷰 · 릴리스 승인(구속력)',
    // ── 정규직 승격 (감독 지시 2026-07-30) ──────────────────────────────────
    // 근거는 실측이다: 기여 57건으로 **감독(118) 다음 2위**이고 기존 정규직 3명
    // 전부보다 많다(팀장 45 · 실행 32 · 부팀장 19). 커밋 제목에 44건 · 본문에
    // 158건 등장하고 블로커를 12회 이상 냈다.
    //
    // `name` 은 '검수관' 을 유지한다. 다른 정규직은 `name`=모델명 / `handle`=직책
    // 형식이지만(Fable 5 팀장 등) 검수관에는 그 관행이 없고, 바꾸면 라이브 표시가
    // 달라지는 데다 `patterns` 집계와 어긋날 위험이 있다. 형식 통일보다 정합이 낫다.
    tier: '정규직',
    tierClass: 'staff',
    patterns: [/검수관/],
  },
  {
    id: 'reference-analyst',
    emoji: '🔍',
    name: '레퍼런스분석',
    handle: undefined,
    role: '시각 자료 조사',
    tier: '계약직',
    tierClass: 'contract',
    // 주석: build-team.mjs 에 없는 역할(추측으로 채움).
    // 레퍼런스 분석은 DEVLOG에는 나타나지 않으므로 유명무실할 가능성이 높다.
    patterns: [/레퍼런스 분석|reference-analyst/],
  },
];

/** id → 역할. 소비자가 ROLES를 다시 순회하지 않게. */
export const BY_ID = new Map([...ROLES].map((r) => [r.id, r]));

/**
 * DEVLOG 마크다운 전체에서 역할별 기여를 집계한다.
 * 항목 단위로 세므로, 한 항목 안에 같은 역할이 여러 번 나와도 1건이다.
 *
 * ── 산정축과 표시축을 분리한다 (2026-07-30 재설계) ─────────────────────────
 * 1차 판본이 `joined` **자체를 시각으로 덮어썼다**:
 *     joined = data.dates[0].iso;   // ISO 시각 또는 null
 * 그 한 줄이 검수관 블로커 두 건의 단일 원인이었다. `joined` 가 null 가능해지자
 *   · `payroll.mjs` 의 개월 산정이 무너져 픽스처를 전부 null 기대로 고쳤고
 *     (= 산술 경로가 CI 에서 한 번도 실행되지 않게 됐다)
 *   · `payroll.mjs:245` 의 `months===0` skip 이 처음 도달 가능해져 **측정 실패
 *     역할을 집계에서 조용히 지웠다**(미확인으로도 안 세고).
 *
 * 그런데 payroll 은 애초에 시각을 보지 않는다 — `contrib.joined.substring(0, 7)`
 * 로 YYYY-MM 만 쓴다. 두 축은 원래 별개였고 1차 판본이 한 필드에 합친 것이다.
 *
 *   joined / lastSeen         YYYY-MM-DD · DEVLOG 유래 · **절대 null 아님** · 산정용
 *   joinedTime / lastSeenTime HH:mm(KST) 또는 null      · 동결 데이터 유래 · 표시용
 *   *TimeBulk                 그 시각이 일괄 기록 커밋에서 왔는가(표시 측이 감춘다)
 *
 * @param {string} md DEVLOG.md 의 전체 마크다운 내용
 * @param {{times: Object<string,string>, bulkCommits: Set<string>}} [frozen]
 *        동결 시각 데이터. 기본값은 `loadFrozenTimes()`. **테스트가 주입한다** —
 *        주입 가능해야 산술·표시 경로가 파일 존재와 무관하게 항상 검증된다.
 * @returns {Object.<string, {count: number, joined: string|null, lastSeen: string|null,
 *                            joinedTime: string|null, lastSeenTime: string|null,
 *                            joinedTimeBulk: boolean, lastSeenTimeBulk: boolean}>}
 *          count=0 인 역할은 전부 null/false
 */
export function countContributions(md, frozen = undefined) {
  const times = frozen ?? loadFrozenTimes();

  const result = Object.fromEntries(ROLES.map((r) => [r.id, { count: 0, dates: [] }]));

  // 항목 파싱은 SSOT 를 경유한다(`devlog-entries.mjs`). 예전에는 같은 정규식을 여기
  // 또 적었고, 그래서 제목 줄에 시각을 허용하는 순간 이 파서만 항목을 버릴 수 있었다.
  const entries = parseEntries(md);

  for (const entry of entries) {
    const content = entry.body;

    for (const role of ROLES) {
      // 부팀장을 먼저 제거한 텍스트에서 팀장을 매치시킨다.
      // "팀장" 패턴이 "부팀장" 을 삼키는 것을 사전 제거로 막는다(후방탐색 대신).
      let testContent = content;
      if (role.id === 'lead') {
        testContent = content.replace(/부팀장/g, '');
      }

      const participated = role.patterns.some((pat) => pat.test(testContent));
      if (participated) {
        result[role.id].count++;
        const info = timeInfoFor(entry, times);
        result[role.id].dates.push({ date: entry.date, time: info.time, bulk: info.bulk });
      }
    }
  }

  const finalResult = Object.fromEntries(
    ROLES.map((r) => {
      const data = result[r.id];
      if (data.dates.length === 0) {
        return [r.id, {
          count: data.count,
          joined: null, lastSeen: null,
          joinedTime: null, lastSeenTime: null,
          joinedTimeBulk: false, lastSeenTimeBulk: false,
        }];
      }

      // 날짜 오름차순. 같은 날짜 안에서는 시각 오름차순이고 **시각 불명은 뒤로** 둔다.
      // 한계: 시각 불명 항목이 실제로 더 이른 시각이었을 수 있다. 다만 같은 날짜
      // 안의 순서라 `joined`(날짜)에는 영향이 없고 표시 시각만 달라진다 — 알려진
      // 것 중 가장 이른 값을 보여주는 편이 null 을 보여주는 것보다 정보가 많다.
      data.dates.sort((a, b) =>
        a.date.localeCompare(b.date) || (a.time ?? '~').localeCompare(b.time ?? '~'));

      const first = data.dates[0];
      const last = data.dates[data.dates.length - 1];

      return [r.id, {
        count: data.count,
        joined: first.date,        // YYYY-MM-DD — DEVLOG 에 항상 있으므로 null 이 될 수 없다
        lastSeen: last.date,
        joinedTime: first.time,
        lastSeenTime: last.time,
        joinedTimeBulk: first.bulk,
        lastSeenTimeBulk: last.bulk,
      }];
    })
  );

  return finalResult;
}

/** count=0 역할의 기본값. 모양을 한 곳에만 적는다. */
const EMPTY_CONTRIBUTION = {
  count: 0,
  joined: null, lastSeen: null,
  joinedTime: null, lastSeenTime: null,
  joinedTimeBulk: false, lastSeenTimeBulk: false,
};

/**
 * 특정 역할의 기여 정보를 조회한다.
 *
 * @param {string} md DEVLOG.md 의 전체 마크다운 내용
 * @param {string} roleId 역할 id
 * @param {object} [frozen] 동결 시각 데이터(테스트 주입용)
 */
export function contributionOf(md, roleId, frozen = undefined) {
  return countContributions(md, frozen)[roleId] ?? { ...EMPTY_CONTRIBUTION };
}

export { EMPTY_CONTRIBUTION };

/**
 * 팀 구성을 티어별로 계산한다. 기여가 있는 역할만 센다.
 * SSOT — 이 함수에서 정의한 값을 build-readme.mjs 와 build-making.mjs 가 소비한다.
 *
 * @param {string} md DEVLOG.md 의 전체 마크다운 내용
 * @returns {{founder: number, staff: number, contract: number, total: number}}
 *          founder: 창업자 수, staff: 정규직 수, contract: 계약직 수, total: 합계
 */
export function calculateTeamComposition(md) {
  const contributions = countContributions(md);

  // 티어별로 기여가 있는 역할을 센다 (count > 0)
  const byTier = {
    founder: [],
    staff: [],
    contract: [],
  };

  for (const role of ROLES) {
    const contrib = contributions[role.id];
    if (contrib.count > 0) {
      if (role.tier === '창업자') byTier.founder.push(role.id);
      else if (role.tier === '정규직') byTier.staff.push(role.id);
      else if (role.tier === '계약직') byTier.contract.push(role.id);
    }
  }

  return {
    founder: byTier.founder.length,
    staff: byTier.staff.length,
    contract: byTier.contract.length,
    total: byTier.founder.length + byTier.staff.length + byTier.contract.length,
  };
}
