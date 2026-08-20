// world2/decide/water-env.ts — 수면이 반사할 **환경맵의 판정**. 집행(텍스처에 꽂고
// 재질에 거는 것)은 `features/ocean.ts`.
//
// ── 왜 생겼나 (감독 판정 2026-08-20) ────────────────────────────────────────
// 감독: *"왜 밑 반사는 움직이지 않을까."* 카드로 확인한 대상은 **「반짝이는 점들(윤슬)」**
// 이었다.
//
// 원인은 이 저장소가 **이미 적어 두고 있었다** — `features/ocean.ts` 의 거칠기맵 주석이
// *"이 씬에는 `scene.environment` 가 없어 거울이 반사할 것이 없다 → 검다"* 고 진단했다.
// 반사할 것이 없으니 물은 «반짝이는 척» 을 해야 했고, 그 땜질이 `emissiveMap` 흰 점
// 텍스처였다. **발광은 광원과 무관하다** — 시점이 움직여도, 물결이 기울어도 같은 자리에서
// 같은 밝기로 빛난다. UV 가 흘러도 «명멸» 이 없는 이유가 그것이다. 게다가 게임풍 물
// (`?styl=1`, 감독이 실기기에서 보는 판본)에는 **그 스티커조차 없다.**
//
// 윤슬의 정체는 **태양의 거울상이 물결 기울기에 흩어진 것**이다. 그러니 환경맵 안에
// «태양» 이 있어야 하고, 물결이 법선을 흔들면 그 상이 저절로 부서져 명멸한다.
//
// ── 왜 `adapter.makeEnvMap`(PMREM) 이 아닌가 ────────────────────────────────
// world2 에는 `PMREMGenerator.fromScene()` 배선이 이미 있고 소비자가 0 이다
// (`adapters/renderer.ts`). 그것을 쓰는 것이 첫 설계였는데 **실측이 막았다**:
//
//   ① `fromScene` 은 씬 전체를 6면 렌더한다. world2 씬에는 파셀·나무·13.5MB GLB 가 들어
//      있고, 부팅 예열(`main.ts` warmup)이 **시간대×날씨 12조합**을 돈다 — 시간대마다
//      다시 구우면 부팅에 그 렌더가 12번 얹힌다.
//   ② 구울 때마다 새 텍스처가 나온다. 개수 불변식 `[7]` 이 보는 축이고, dispose 를
//      한 군데라도 빠뜨리면 세션 중 누수가 된다.
//   ③ 하늘 메시에 **태양 원반이 있는지** 확인할 수 없다(WebGPU 화면을 못 본다). 없으면
//      구워 봐야 윤슬의 원천이 안 들어온다 — 가장 비싼 방법으로 목적을 못 이루는 형태.
//
// 그래서 픽셀을 **직접 계산한다.** 텍스처는 세션에 **하나**뿐이고 시간대가 바뀌면 같은
// 버퍼를 다시 채운다(`needsUpdate`) — 개수는 상수, 비용은 32,768 픽셀 루프 1회다.
// DOM(캔버스)도 안 쓰므로 두 백엔드에서 같고, **테스트가 픽셀을 직접 읽어 판정할 수
// 있다**(캔버스였다면 jsdom 에서 `getContext('2d')` 가 없어 검사가 no-op 이 된다).
// ⚠ `makeEnvMap` 소비자 0 은 그대로 남는다 — 백로그 `G-STYL26`.
//
// ── 색을 여기서 정하지 않는다 ───────────────────────────────────────────────
// 팔레트를 이 파일에 적으면 하늘 팔레트의 **복사본**이 생기고, 한쪽만 고치면 물만
// 옛 하늘을 반사한다(이 저장소가 세 번 데인 «값 미러링»). 그래서 색은 **씬에서 받는다** —
// 천정은 반구광 하늘색, 지평선은 안개색, 태양은 태양광의 색·세기다. 시간대 분기가
// 여기 없는 것이 요점이다: 밤이 되면 씬의 그 값들이 이미 밤이라 **환경맵도 저절로 밤이
// 된다.** 감독이 예전에 지적한 *"밤인데 빛이 이렇게 많지 않잖아"* 가 재발할 자리를
// 구조적으로 없앤다.

/** 환경맵 가로(경도 360°). 태양 원반이 `SUN_DEG` 일 때 지름 ≈12px 가 되는 최소 크기 */
export const ENV_W = 256;
/** 세로(위도 180°). 등장방형이므로 가로의 절반 */
export const ENV_H = 128;

/**
 * 태양 원반의 **각반경**(도). 실제 태양은 0.27° 지만 그것으로는 안 된다 — 이 텍스처의
 * 한 픽셀이 `360/256 = 1.4°` 라 실제 크기는 **한 픽셀에도 못 미친다.**
 *
 * 6°: 두 조건의 가운데다. ⓐ 텍스처에서 지름 8~9px 이라 계단이 안 보이고 ⓑ 수면 전체가
 * 하늘색으로 물들지 않는다(원반이 넓을수록 거울반사가 «태양» 이 아니라 «밝은 하늘» 이
 * 되고, 그러면 점이 아니라 면이 밝아져 감독이 반려한 *"흰 덩어리"* 로 되돌아간다).
 * ⚠ 실물 크기를 못 쓰는 것은 **해상도 제약이지 미학이 아니다** — 그래서 값이 아니라
 * 이유를 적는다. 해상도를 올리면 이 값도 내려갈 수 있다.
 */
export const SUN_DEG = 6;

/**
 * 태양 원반의 밝기 배수. 거울상이 «점» 으로 읽히려면 하늘보다 확실히 밝아야 한다.
 *
 * ⚠ **낮에는 원반 대부분이 흰색으로 포화한다**(8bit LDR, 실측: 태양광 세기 2.2 에서
 * 가장자리 `f>0.087` 부터 255). 그것이 결함이 아니라 실제 태양의 모습이고 — HDR 환경맵도
 * 태양은 수천 배라 어차피 클리핑된다 — 밤에는 `sunI` 가 작아져 **부드러운 점**으로 남는다.
 * 즉 이 상수는 «낮에 얼마나 밝은가» 가 아니라 «세기가 얼마나 낮아져야 점이 사라지는가» 를
 * 정한다.
 */
export const SUN_GAIN = 6;

export interface EnvPalette {
  /** 천정 색(0~1 선형 아님 — 씬 재질 색 그대로의 sRGB 성분) */
  readonly zenith: readonly [number, number, number];
  /** 지평선 색. 안개색을 받는다 — 물이 만나는 것은 먼 하늘이 아니라 그 띠다 */
  readonly horizon: readonly [number, number, number];
  /** 지평선 아래(지면 반사분). 반구광의 ground 색 */
  readonly ground: readonly [number, number, number];
  /** 태양 색 */
  readonly sun: readonly [number, number, number];
  /** 태양 세기(0 이면 원반을 안 그린다 — 밤의 달빛은 `sun` 색·세기가 이미 표현한다) */
  readonly sunI: number;
  /** 태양이 있는 방향(월드, 정규화 전이어도 된다) */
  readonly sunDir: { x: number; y: number; z: number };
}

/**
 * 방향 → 등장방형 UV. **three 의 `equirectUv` 규약을 그대로 따른다** — 여기서 축을
 * 다르게 잡으면 태양이 화면의 태양과 다른 쪽에 뜬다(그리고 그 어긋남은 헤드리스에서
 * 안 보인다). three r171 `EquirectangularReflectionMapping` 이 쓰는 식이다.
 */
export function equirectUv(d: { x: number; y: number; z: number }): { u: number; v: number } {
  const len = Math.hypot(d.x, d.y, d.z) || 1;
  const x = d.x / len, y = d.y / len, z = d.z / len;
  return {
    u: Math.atan2(z, -x) / (2 * Math.PI) + 0.5,
    v: Math.asin(Math.min(1, Math.max(-1, y))) / Math.PI + 0.5,
  };
}

/** 0~1 을 0~255 로. 밝기가 1 을 넘으면 자른다(태양 원반이 그 구간에 산다) */
function byte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v * 255)));
}

/**
 * 등장방형 환경맵 픽셀을 채운다. `out` 은 `ENV_W × ENV_H × 4`(RGBA) 이고 **그 자리에서
 * 덮어쓴다** — 시간대가 바뀔 때 같은 버퍼를 다시 채우는 것이 개수 불변식의 전부다.
 *
 * 세로는 세 구간이다: 천정→지평선(위 절반), 지평선→지면(아래 절반). 지평선을 정확히
 * `v=0.5` 에 두는 이유는 물이 **비스듬히** 볼 때 그 근방을 반사하기 때문이다 — 프레넬이
 * 강한 각도일수록 수평에 가까운 방향을 본다.
 */
export function bakeEnvPixels(out: Uint8Array, p: EnvPalette): void {
  const cosLimit = Math.cos((SUN_DEG * Math.PI) / 180);
  const sl = Math.hypot(p.sunDir.x, p.sunDir.y, p.sunDir.z) || 1;
  const sx = p.sunDir.x / sl, sy = p.sunDir.y / sl, sz = p.sunDir.z / sl;

  for (let j = 0; j < ENV_H; j++) {
    // 텍셀 중심의 위도. `flipY` 기본값(true)이라 **행 0 이 v=1**(천정)이다 — 이 한 줄이
    // 뒤집히면 하늘이 아래에 깔리고, 그 화면은 «물이 갈색» 으로만 드러난다.
    const v = 1 - (j + 0.5) / ENV_H;
    const lat = (v - 0.5) * Math.PI;
    const dy = Math.sin(lat);
    const cosLat = Math.cos(lat);
    // 위/아래 보간 계수. 지평선에서 0, 천정(또는 나딜)에서 1
    const t = Math.abs(v - 0.5) * 2;
    const up = v >= 0.5;
    for (let i = 0; i < ENV_W; i++) {
      const u = (i + 0.5) / ENV_W;
      // `equirectUv` 의 역이다 — 같은 규약에서 유도하므로 둘이 갈릴 수 없다
      const lon = (u - 0.5) * 2 * Math.PI;
      const dx = -Math.cos(lon) * cosLat;
      const dz = Math.sin(lon) * cosLat;

      const far = up ? p.zenith : p.ground;
      let r = p.horizon[0] + (far[0] - p.horizon[0]) * t;
      let g = p.horizon[1] + (far[1] - p.horizon[1]) * t;
      let b = p.horizon[2] + (far[2] - p.horizon[2]) * t;

      if (p.sunI > 0) {
        const cosA = dx * sx + dy * sy + dz * sz;
        if (cosA > cosLimit) {
          // 가장자리를 부드럽게 — 딱 자르면 원반 테두리가 계단으로 드러난다. 제곱으로
          // 두는 것은 밝기가 중심에서 바깥으로 **가파르게** 떨어져야 «점» 으로 읽히기
          // 때문이다. 낮에는 안쪽이 포화해 그 그라디언트가 테두리에만 남는다(`SUN_GAIN`).
          const f = (cosA - cosLimit) / (1 - cosLimit);
          const w = f * f * p.sunI * SUN_GAIN;
          r += p.sun[0] * w;
          g += p.sun[1] * w;
          b += p.sun[2] * w;
        }
      }

      const o = (j * ENV_W + i) * 4;
      out[o] = byte(r);
      out[o + 1] = byte(g);
      out[o + 2] = byte(b);
      out[o + 3] = 255;
    }
  }
}
