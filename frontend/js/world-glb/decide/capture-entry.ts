// decide/capture-entry.ts — 6 고정 시점 캡처의 **부팅 시작 위치·시선** 파서. 순수 함수, three 무의존.
//
// `?cam=<x>,<z>,<yawDeg>,<pitchDeg>` 를 `GlbWorldOptions.start` 로 바꾼다. 세션 중 순간이동이
// 아니라 **부팅 인자**다 — 왜 그 구분이 중요한지는 `options.ts` `start` 주석 한 곳.
//
// ⚠ 호출처는 캡처 페이지 부트(`world10-boot.ts`) **하나**다. world7·8 부트와 world2 트리는 이 파일을
// import 하지 않는다 — `tests/world-glb-capture-entry.test.ts` 가 그 목록을 지킨다. 라이브 페이지가
// `?cam=` 을 읽기 시작하는 순간 «링크 한 줄로 아무 데서나 시작» 이 라이브 기능이 되므로, 그것은
// 감독·팀장 게이트다.

export interface CaptureStart { x: number; z: number; yaw: number; pitch: number }

/** 좌표 상한(m) — 거리 60m 에 여유. 이 밖은 «지정 안 됨» 으로 본다(오타 방어) */
export const CAM_ABS_MAX = 500;
/** 내려다봄 상한(deg) — `clampPitch` 가 다시 자르지만 파서에서 먼저 거른다 */
export const CAM_PITCH_MAX_DEG = 89;

const DEG = Math.PI / 180;

/**
 * `search`(`location.search` 형태)에서 `cam` 을 읽는다. 없거나 형식이 틀리면 `null` —
 * 부트가 «트리 기본 스폰» 으로 간다. 네 값 전부 유한수여야 하고 x·z 는 `±CAM_ABS_MAX`,
 * pitch 는 `±CAM_PITCH_MAX_DEG` 안이어야 한다. yaw 는 임의(정규화만).
 */
export function parseCam(search: string): CaptureStart | null {
  const raw = new URLSearchParams(search).get('cam');
  if (raw === null || raw.trim() === '') return null;
  const parts = raw.split(',').map((t) => Number(t.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [x, z, yawDeg, pitchDeg] = parts;
  if (Math.abs(x) > CAM_ABS_MAX || Math.abs(z) > CAM_ABS_MAX) return null;
  if (Math.abs(pitchDeg) > CAM_PITCH_MAX_DEG) return null;
  const yaw = ((yawDeg * DEG) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  return { x, z, yaw, pitch: pitchDeg * DEG };
}

/** `CaptureStart` → 링크 문자열(캡처 하네스가 6 시점을 URL 로 적을 때) */
export function formatCam(s: CaptureStart): string {
  const r = (v: number) => String(Math.round(v * 1000) / 1000);
  return `${r(s.x)},${r(s.z)},${r(s.yaw / DEG)},${r(s.pitch / DEG)}`;
}

/**
 * 아트 기준 V1 «거리 시작»(`docs/nyc/art-direction.md` §5): 거리 입구 중앙, 눈높이 1.7m(트리 기본),
 * 동쪽(+x)을 본다. yaw 규약은 `decide/move.ts` `facing(yaw) = (−sin, −cos)` 라 +x 는 **270°**.
 * 캡처 페이지의 «`?cam=` 없음» 기본값이다 — 값을 바꾸면 이전 캡처와 비교가 깨지므로 함께 기록한다.
 */
export const V1_START: CaptureStart = { x: -2, z: 0, yaw: (270 * Math.PI) / 180, pitch: (-6 * Math.PI) / 180 };
// pitch −6°: 수평(0°)에서는 하늘이 세로의 45% 였다(반복 1 첫 캡처) — 아트 기준 V1 상한 35%.
