// world-glb/decide/village-ledger.ts — **마을 대장.** 어느 칸이 누구 땅인가.
//
// ── 왜 오버레이 계약 **밖**인가 (팀장 판정 2026-08-16, W8-3) ────────────────
// 감독 카드: *"여러 작가가 한 마을에"*. 팀장은 그 데이터 형태로 **(다) 문서를 합치지
// 않는다** 를 골랐다 — 작가별 오버레이 문서를 각각 normalize 해서 각각 씬에 붙이고,
// **`decide/overlay.ts` 계약은 한 글자도 안 바꾼다.**
//
// 그 판정의 근거 1이 *"되돌리기 비용이 셋 중 유일하게 0"* 이었다. 마이그레이션 사슬에
// 아무것도 안 넣으므로 「저장 파일이 그 모양으로 굳는」 위험 자체가 발생하지 않는다.
// **그래서 대장은 자기 `version` 과 자기 normalize 를 갖는다**(팀장 조건) — 오버레이
// 사슬에 편입되는 순간 그 근거가 죽는다.
//
// ── 이 파일이 소유하는 것 ──────────────────────────────────────────────────
// **배정뿐이다.** 무엇이 그 칸에 서는지는 작가 문서(오버레이)가 안다. 대장은
// *"(3, -2) 는 arthong 의 칸"* 까지만 말한다.
//
// ── 겹침을 여기서 막는다 ───────────────────────────────────────────────────
// 같은 `(px,pz)` 가 둘이면 **앞엣것이 이긴다** — 그리고 **사유를 낸다.** 조용히
// 덮어쓰면 증상이 「내 땅이 사라졌다」로만 나타나고 원인을 짚을 자리가 없다.
// `decide/overlay.ts` 의 `OverlayIssue` 와 같은 형태를 쓴다(사유를 값으로 돌려주고
// 판정은 소비자가 한다).
//
// ⚠ **소유권이 아니다.** 인증이 100% mock 이므로(`auth.js:19-21` — OAuth 키가 셋 다 빈
// 문자열) 이 대장이 말하는 것은 «어느 문서를 그 칸에 그리는가» 이지 «누가 고칠 권리가
// 있는가» 가 아니다. 후자는 실제 OAuth 뒤이고 그 열쇠는 감독 본인만 돌릴 수 있다.
//
// ── 이 파일이 **하지 않는 것** ─────────────────────────────────────────────
// · **파일을 안 읽는다** — `raw` 를 받아 판정만 한다(저장은 `world2/store/` 소관)
// · **three 도 DOM 도 모른다** — 순수라서 노드 테스트가 실제로 돌린다
// · **아이디 형식을 판정하지 않는다** — `decide/tenant-id.ts` 소관. 여기서는 «비어 있지
//   않은 문자열» 까지만 본다(계약이 파츠 `kind` 를 다루는 방식과 같다)

/** 대장 스키마 버전. **오버레이의 `OVERLAY_VERSION` 과 무관하다** — 따로 늙는다. */
export const LEDGER_VERSION = 1;

/** 한 칸의 배정 */
export interface Plot {
  /** 파셀 격자 좌표(정수) */
  px: number;
  pz: number;
  /** 그 칸을 그리는 문서의 주인. 형식 판정은 `tenant-id.ts` 소관 */
  owner: string;
}

export interface Ledger {
  version: number;
  plots: Plot[];
}

/** 왜 그 항목이 거부·변경됐나. 소비자가 화면에 옮긴다 */
export interface LedgerIssue {
  /** 원본 배열에서의 자리 */
  index: number;
  reason:
    /** 항목이 객체가 아니다 */
    | 'not-object'
    /** `px`·`pz` 가 수가 아니다 — 어느 칸인지 몰라 앉힐 자리가 없다 */
    | 'bad-coord'
    /** `owner` 가 비었거나 문자열이 아니다 */
    | 'bad-owner'
    /** 같은 칸이 이미 배정됐다 — **앞엣것이 이긴다** */
    | 'duplicate';
  /** `duplicate` 일 때 이미 그 칸을 가진 주인 */
  heldBy?: string;
  px?: number;
  pz?: number;
}

export interface LedgerResult {
  ledger: Ledger;
  issues: LedgerIssue[];
  /**
   * 버전을 **해석하지 못했다**. 그때도 `ledger` 는 빈 것으로 돌려준다 —
   * 마을은 떠야 하고, 대장이 없으면 「배정 0」일 뿐이다.
   *
   * ⚠ 이 필드가 있는 이유: 오버레이 쪽이 *"`version` 오타 하나가 세계 전체를 지운다"*
   * 는 사각을 갖고 있고(태스크 #53) 그것은 **경고할 자리가 없어서**다. 같은 실수를
   * 새 계약에서 반복하지 않는다.
   */
  unreadableVersion?: number | string;
}

/** 빈 대장. **상수가 아니라 팩토리다** — 상수로 두면 한 소비자의 `push` 가 남에게 보인다 */
export function emptyLedger(): Ledger {
  return { version: LEDGER_VERSION, plots: [] };
}

/** 격자 키. 좌표 두 개를 하나로 — 이 규약은 이 파일 안에서만 쓴다 */
function keyOf(px: number, pz: number): string {
  return `${px},${pz}`;
}

/**
 * 날것을 대장으로 정규화한다. **던지지 않는다** — 못 읽은 것은 `issues` 로 말한다.
 *
 * 「서버가 죽어도 전시를 보는 것만은 되어야 한다」(`backend/README.md`)가 이 축에서는
 * **「대장이 깨져도 마을은 뜬다」** 로 나타난다. 그래서 어떤 입력에도 `ledger` 를 낸다.
 */
export function loadLedger(raw: unknown): LedgerResult {
  const issues: LedgerIssue[] = [];
  const ledger = emptyLedger();

  if (!raw || typeof raw !== 'object') return { ledger, issues };
  const doc = raw as { version?: unknown; plots?: unknown };

  // ── 버전 ────────────────────────────────────────────────────────────────
  // 미래 버전은 **읽지 않는다.** 모르는 스키마를 지금 규칙으로 해석하면 조용히 틀린
  // 배정을 만든다 — 배정이 틀리면 남의 땅에 내 건물이 선다.
  const v = doc.version;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 1 || v > LEDGER_VERSION) {
    return {
      ledger,
      issues,
      unreadableVersion: typeof v === 'number' || typeof v === 'string' ? v : undefined,
    };
  }

  if (!Array.isArray(doc.plots)) return { ledger, issues };

  const taken = new Map<string, string>();
  for (let i = 0; i < doc.plots.length; i++) {
    const p = doc.plots[i] as { px?: unknown; pz?: unknown; owner?: unknown } | null;
    if (!p || typeof p !== 'object') { issues.push({ index: i, reason: 'not-object' }); continue; }

    const px = p.px;
    const pz = p.pz;
    if (typeof px !== 'number' || typeof pz !== 'number'
      || !Number.isFinite(px) || !Number.isFinite(pz)) {
      issues.push({ index: i, reason: 'bad-coord' });
      continue;
    }
    // 격자는 정수다. 소수를 받으면 **버리지 않고 접는다** — 오버레이 계약이 좌표를
    // 다루는 방식과 같다(`folded`).
    const gx = Math.round(px);
    const gz = Math.round(pz);

    const owner = p.owner;
    if (typeof owner !== 'string' || owner.trim() === '') {
      issues.push({ index: i, reason: 'bad-owner', px: gx, pz: gz });
      continue;
    }
    const id = owner.trim();

    const key = keyOf(gx, gz);
    const held = taken.get(key);
    if (held !== undefined) {
      // **앞엣것이 이긴다.** 뒤엣것을 조용히 버리지 않고 사유를 낸다 — 두 작가가 같은
      // 칸을 주장하는 것은 대장을 만든 쪽의 실수이고, 그것이 화면에 떠야 고쳐진다.
      issues.push({ index: i, reason: 'duplicate', heldBy: held, px: gx, pz: gz });
      continue;
    }
    taken.set(key, id);
    ledger.plots.push({ px: gx, pz: gz, owner: id });
  }

  return { ledger, issues };
}

/** 그 칸의 주인. 배정이 없으면 `null` — «비었다» 와 «모른다» 를 여기서 가르지 않는다 */
export function ownerAt(ledger: Ledger, px: number, pz: number): string | null {
  const key = keyOf(Math.round(px), Math.round(pz));
  for (const p of ledger.plots) if (keyOf(p.px, p.pz) === key) return p.owner;
  return null;
}

/**
 * 한 주인의 칸들. **순서는 대장 순서를 그대로 따른다** — 정렬하면 「먼저 적힌 것이
 * 이긴다」는 규칙과 화면 순서가 어긋나 보인다.
 */
export function plotsOf(ledger: Ledger, owner: string): Plot[] {
  return ledger.plots.filter((p) => p.owner === owner);
}

/**
 * 등장하는 주인들. **처음 나온 순서**를 지킨다 — 이 순서가 곧 문서를 읽는 순서이고,
 * 겹침 판정(앞엣것이 이긴다)과 같은 방향이어야 한다.
 */
export function owners(ledger: Ledger): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of ledger.plots) {
    if (seen.has(p.owner)) continue;
    seen.add(p.owner);
    out.push(p.owner);
  }
  return out;
}

/**
 * 그 주인의 칸인가. `parcels` 를 합칠 때 **남의 칸을 걸러내는 관문**이다.
 *
 * ⚠ 이 함수가 S5 의 안전장치다 — 작가 문서가 자기 칸 밖의 파셀을 적어 보내도
 * (실수든 아니든) 여기서 막힌다. 막지 않으면 **남의 땅을 덮어쓴다.**
 */
export function isPlotOf(ledger: Ledger, owner: string, px: number, pz: number): boolean {
  return ownerAt(ledger, px, pz) === owner;
}
