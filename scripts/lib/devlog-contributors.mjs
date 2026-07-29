// scripts/lib/devlog-contributors.mjs
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
    role: '교차리뷰 · 릴리스 승인',
    tier: '계약직',
    tierClass: 'contract',
    // 주석: build-team.mjs 에는 있지만 2026-07-13 이후 신설.
    // DEVLOG 에서 유도된 실제 기여 건수로 대체된다.
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
 * @param {string} md DEVLOG.md 의 전체 마크다운 내용
 * @returns {Object.<string, {count: number, joined: string|null, lastSeen: string|null}>}
 *          역할 id → { count(기여 건수), joined(첫 등장 날짜), lastSeen(마지막 등장 날짜) }
 *          count=0 인 역할도 joined/lastSeen 은 null
 */
export function countContributions(md) {
  const result = Object.fromEntries(ROLES.map((r) => [r.id, { count: 0, dates: [] }]));

  // 항목 단위로 쪼갠다. 정규식은 build-devlog.mjs:22 와 동일.
  const blocks = md.split(/\n(?=## )/).map((b) => {
    const match = b.match(/^## (\d{4}-\d{2}-\d{2}) · (.+)\n/);
    if (!match) return null;
    return {
      date: match[1],
      title: match[2].trim(),
      body: b, // 제목을 포함한 전체 블록(본문도 포함)
    };
  }).filter((x) => x !== null);

  // 각 항목에서 역할별 참여 여부를 확인한다.
  for (const block of blocks) {
    const content = block.body;

    for (const role of ROLES) {
      // 부팀장을 먼저 제거한 텍스트에서 팀장을 매치시킨다.
      // 이것이 사용자가 요구한 "팀장/부팀장 분리" 처리다.
      let testContent = content;
      if (role.id === 'lead') {
        // 팀장 패턴을 테스트하기 전에 부팀장을 제거한다.
        testContent = content.replace(/부팀장/g, '');
      }

      // 역할 패턴 중 하나라도 매치되면 해당 항목에 그 역할이 참여한 것으로 본다.
      const participated = role.patterns.some((pat) => pat.test(testContent));
      if (participated) {
        result[role.id].count++;
        result[role.id].dates.push(block.date);
      }
    }
  }

  // 날짜를 min/max 로 정렬해서 joined/lastSeen 을 계산한다.
  // DEVLOG 의 날짜가 뒤섞여 있을 수 있으므로 등장 순서가 아니라 날짜로 비교.
  const finalResult = Object.fromEntries(
    ROLES.map((r) => {
      const data = result[r.id];
      let joined = null;
      let lastSeen = null;

      if (data.dates.length > 0) {
        // 날짜 배열에서 최소·최대 찾기
        data.dates.sort();
        joined = data.dates[0];
        lastSeen = data.dates[data.dates.length - 1];
      }

      return [r.id, { count: data.count, joined, lastSeen }];
    })
  );

  return finalResult;
}

/**
 * 특정 역할의 기여 정보를 조회한다.
 *
 * @param {string} md DEVLOG.md 의 전체 마크다운 내용
 * @param {string} roleId 역할 id
 * @returns {{count: number, joined: string|null, lastSeen: string|null}}
 */
export function contributionOf(md, roleId) {
  return countContributions(md)[roleId] ?? { count: 0, joined: null, lastSeen: null };
}
