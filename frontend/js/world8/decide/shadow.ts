// world8/decide/shadow.ts — 그림자 카메라를 어디까지 담을 것인가. 순수 함수만, import 0.
//
// ── 감독 지시 2026-08-02 ─────────────────────────────────────────────────────
// *"주간에 하드라이트 느낌이 없어."*
//
// ── 원인은 조명이 아니라 **그림자 카메라가 반경 5m 였다** ────────────────────
// `main.ts` 는 `dir.castShadow = true` 와 `mapSize 1024²` 만 설정하고 `shadow.camera.*` 를
// 건드리지 않았다. three 의 기본 정투영 프러스텀은 **±5m** 다.
//
// 이 세계의 셀은 **32m** 이고 그 안에 높이 32~60m 짜리 타워가 선다. 파츠들은 `castShadow`
// 를 성실히 달고 있었지만(building·tower·clocktower·fountain·lamp·bench) 그림자 카메라가
// 담지 못했다. 게다가 `DirectionalLight.target` 은 기본이 **월드 원점**이라, 플레이어가
// 광장을 벗어나면 그 5m 조차 발밑에서 사라진다.
//
// 같은 저장소의 대조군이 그 사실을 드러낸다 — `world.js:293` 은 ±22·far 130,
// `scene-scenery.ts:392` 는 2048² + bias. **world2 만 아무것도 없었다.**
//
// ── 왜 판정으로 떼어 냈나 ───────────────────────────────────────────────────
// 값 넷(반폭·거리·near·far)이 서로 묶여 있어서, 한쪽만 고치면 조용히 어긋난다. 예를 들어
// 반폭을 넓히고 `far` 를 그대로 두면 먼 구조물이 프러스텀 **뒤로** 밀려 그림자가 사라지는데,
// 화면에는 "원래 그림자가 없는 것" 과 똑같이 보인다. 한 함수에서 함께 유도하면 그 조합이
// 깨질 자리가 없고, three 없이 검사할 수 있다.

/** 그림자 정투영 카메라의 네 값. 서로 묶여 있으므로 **함께** 나온다 */
export interface ShadowFrustum {
  /** 정투영 반폭(m). 이 반경 밖의 그림자는 그려지지 않는다 */
  half: number;
  /** 광원을 target 에서 이만큼 물린다(m). 씬이 카메라 앞에 들어오게 하는 값 */
  dist: number;
  near: number;
  far: number;
  /** 텍셀 한 변의 월드 크기(m). 그림자 경계가 얼마나 선명한지가 이 값이다 */
  texel: number;
  /**
   * 표면 법선 방향 오프셋(m). 자기 그림자 얼룩(shadow acne)을 막는다.
   *
   * 깊이 바이어스(`shadow.bias`) 대신 이것을 쓰는 이유: 깊이 바이어스는 그림자를 통째로
   * 밀어 물체가 떠 보이는 peter-panning 을 만든다. 법선 오프셋은 텍셀 크기에 비례해
   * 얹으면 되므로, 아래처럼 **텍셀에서 유도**할 수 있다.
   */
  normalBias: number;
}

/**
 * 그림자 카메라 파라미터를 **유도한다.** 실측에 여유를 얹지 않는다(팀장 조건 3).
 *
 * @param cell       파셀 한 변(m). `DEFAULT_LAYOUT` 에서 온다
 * @param band       담을 범위를 셀의 몇 배로 볼 것인가. `DEFAULT_BANDS.nearExit` 를 쓴다
 * @param maxHeight  세계에서 가장 높은 구조물(m). `parts/tower.ts` 의 상한
 * @param mapSize    그림자 맵 한 변(px)
 */
export function shadowFrustum(
  cell: number, band: number, maxHeight: number, mapSize: number,
): ShadowFrustum {
  // ── 반폭 = 호출자가 정한 밴드 ─────────────────────────────────────────────
  // 넓히면 텍셀이 커져 경계가 뭉개지고(= 하드라이트가 안 된다), 좁히면 눈앞 건물
  // 그림자가 잘린다. 어느 밴드를 쓸지는 호출자(`main.ts` 의 `SHADOW_BAND`)가 정한다.
  //
  // ⚠ **이 자리에 "near 밴드를 쓴다 … 알고 고른 거래다" 라고 적혀 있었고, 그 거래가
  // 화면에서 터졌다**(감독 실기기 2026-08-10 *"뒤로 움직이는 순간 건물 밝기가 바뀌어"*).
  // 원문은 이랬다 — *"far tier 는 76.8m 까지 그려지는데 반폭은 41.6m 다 … 반폭을 far
  // 까지 늘리면 텍셀이 1.8배 커져 … 알고 고른 거래다"*(검수관 권고 2026-08-02).
  //
  // **문장은 내내 참이었다.** 사각을 정확히 지목했고 대가 계산도 맞았다. 틀린 것은
  // *"알고 고른"* 이 **다 본 것처럼 읽힌다**는 점이다 — 그 거래가 화면에서 언제 어떻게
  // 보이는지는 아무도 안 재봤다. 후진할 때 화면을 채운 건물이 경계를 넘으면 그림자가
  // 통째로 사라져 **밝기가 튄다.** 재보지 않은 대가를 "알고 고른" 으로 적으면 다음
  // 사람이(그리고 내가) 그 줄을 읽고 확인을 생략한다.
  //
  // 그리고 대가 자체가 **필연이 아니었다**: 맵을 함께 키우면 텍셀이 오히려 작아진다.
  // 유도표와 판정은 `main.ts` 의 `SHADOW_BAND` 주석 한 곳이다 — 여기에 다시 적지 않는다.
  const half = cell * band;

  // ── 깊이는 **각도를 보지 않는다** ────────────────────────────────────────
  // 태양 방향으로 투영한 씬의 두께는 `half·cos(el) + maxHeight·sin(el)` 이다. 정확히
  // 계산할 수도 있지만 그러면 **시간대마다 프러스텀이 달라진다** — 낮(47.4°)과 노을
  // (12.3°)에서 값이 갈리고, 하늘이 크로스페이드하는 동안에는 매 프레임 바뀐다.
  //
  // `cos`·`sin` 은 1을 넘지 않으므로 `half + maxHeight` 가 **모든 각도에 대한 상한**이다.
  // 상한을 쓰면 프러스텀이 고정이고, 어느 시간대에도 잘리지 않는다. 여유를 얹은 것이
  // 아니라 부등식에서 나온 값이다.
  const depth = half + maxHeight;

  // near 를 0 으로 두면 정투영이라 동작은 하지만, 광원이 씬 한가운데 박혀 있는 상태라
  // 뒤쪽 절반이 잘린다. 1m 를 남기고 그만큼 광원을 더 물린다.
  const near = 1;
  const dist = depth + near;
  // 카메라에서 씬 뒤끝까지 = (물린 거리) + (뒤쪽 두께)
  const far = dist + depth;

  const texel = (half * 2) / mapSize;
  // 법선 오프셋은 텍셀 하나만큼. 이보다 작으면 얼룩이 남고, 크면 접촉 그림자가 뜬다.
  const normalBias = texel;

  return { half, dist, near, far, texel, normalBias };
}

/**
 * 그림자 카메라의 추종점을 **텍셀 격자에 스냅**한다.
 *
 * ── 왜 (감독 실기기 2026-08-10 "걷는 중 순간 번쩍" · PC 도 동일) ─────────────
 * 그림자 카메라는 플레이어를 따라다닌다. 서브텍셀만큼만 이동해도 그림자 맵의
 * 래스터화가 매 프레임 미세하게 달라져 **씬의 모든 그림자 경계가 기어다니듯
 * 반짝인다.** 이산 사건이 아니라서 📍 마크 창에 아무것도 안 찍혔고(0건), 백엔드와
 * 무관하며, 태양을 끄면 사라진다 — 남은 증상과 전부 일치했다. 추종점이 텍셀
 * 격자 위로만 움직이면 카메라 이동이 곧 맵의 정수 픽셀 이동이라 래스터화가 다시
 * 계산될 자리가 없다.
 *
 * ── 왜 월드 XZ 가 아니라 광원 기저에서 스냅하는가 ───────────────────────────
 * 그림자 맵의 픽셀 격자는 **광원에서 본 평면** 위에 있다. 월드 XZ 에서 스냅하면
 * 태양이 기울어진 만큼 격자가 어긋나 스냅이 반쪽이 된다. 그래서 광원 방향에 수직인
 * 정규직교 기저(right = dir × worldUp, up = right × dir)를 만들어 그 축 위에서
 * 양자화하고 되돌린다. 추종점의 y 는 항상 0 이라(호출자 규약) 입력은 x·z 만 받는다.
 *
 * @param x,z          추종점(플레이어 발밑, y=0)
 * @param dirX,dirY,dirZ 태양 → 씬 방향(정규화 가정. `getSunDir` 이 준다)
 * @param texel        그림자 맵 텍셀 한 변의 월드 크기(m). 위 `shadowFrustum().texel`
 */
export function snapToShadowTexel(
  x: number, z: number,
  dirX: number, dirY: number, dirZ: number,
  texel: number,
): { x: number; z: number } {
  if (!(texel > 0) || !Number.isFinite(x) || !Number.isFinite(z)) return { x, z };
  // right = dir × (0,1,0) — 태양이 정수리에 있으면(수평 성분 0) 기저가 퇴화하므로
  // 스냅하지 않고 그대로 돌려준다(그때는 격자가 월드 XZ 와 일치해 흔들림도 없다).
  let rx = dirZ, rz = -dirX;
  const rl = Math.hypot(rx, rz);
  if (rl < 1e-6) return { x, z };
  rx /= rl; rz /= rl;
  // up' = right × dir 의 수평 방향. 추종점이 y=0 평면에 있으므로 수평 성분만 쓴다.
  // 이 축의 그림자 맵 좌표는 수평 이동량 × |dirY| 로 압축되므로(광원이 기울수록 지면이
  // 비스듬히 보인다), **정수 텍셀 이동이 되려면 월드 보폭이 texel/|dirY| 여야 한다.**
  const ay = Math.abs(dirY);
  if (ay < 1e-3) return { x, z }; // 수평 태양 — 지면이 모로 보여 스냅이 무의미하다
  const ux = -rz, uz = rx;
  const stepV = texel / ay;
  // 기저 좌표로 사영 → 축별 보폭으로 양자화 → 월드로 복원.
  const a = Math.round((x * rx + z * rz) / texel) * texel;
  const b = Math.round((x * ux + z * uz) / stepV) * stepV;
  return { x: a * rx + b * ux, z: a * rz + b * uz };
}
