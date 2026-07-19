// sky.js — 오픈월드 하늘 연출 시스템 v2 (감독 신 모드 · 팀장 직접 재설계)
// -----------------------------------------------------------------------------
// [감독] "하늘 엔진 절대 대충하지 마라. 하늘이 저급하면 다 저급해진다."
// v2 재설계 핵심(팀장 자체 검토 10항 반영):
//   ① 방위 시스템 — 태양·달이 하늘의 실제 위치에 그려지고(일몰=지평선 글로우), 조명 방향과 일치
//   ② 밴딩 제거 — 고해상 돔(2048×1024, 저사양 1024×512) + 노이즈 디더링
//   ③ 구름 2패스 음영(평탄 밑면+상부 하이라이트) + 원경 층운 / 먹구름 층 밴드
//   ④ 은하수 — 암흑대(dark rift)·웜 코어/쿨 엣지·밝은 별 십자 광망 / 달 크레이터+위상
//   ⑤ 비 = LineSegments 빗줄기(점 아님) / 눈 = Points 유지
//   ⑥ 무지개 — 부드러운 스펙트럼 + 알렉산더 밴드 + 희미한 2차 무지개
//   ⑦ 오로라 — 수직 스트리크 텍스처 × 버텍스 색(하단 그린 엣지→상단 퍼플 소멸)
//   ⑧ 전환 — 이중 돔 크로스페이드(기본 1.8s) + 조명·fog lerp(신 모드 조정이 영화적으로)
//   ⑨ 지평선 정합 — 돔 최하단색 = fog색 = clear색 강제 일치(이음새 제거)
//   ⑩ 시간대 훅 — onApply(state, L) 콜백으로 가로등·창 발광·envMap 강도를 배선측에서 연동
// 전부 절차 생성(외부 이미지·오디오 0). 결정론(시드 고정) — 모든 방문자 동일 하늘.
//
//   createSkySystem({ scene, renderer, sun, hemi, sky, getPos, soft, onApply })
//     → { set(state, {fade}), get(), update(dt), getSunDir(), dispose, SKY_TIMES, SKY_WEATHERS }
// 조합 보정: 무지개=주간·일몰×비강수만 / 오로라=야간 맑음만 / 은하수·별=야간 맑음(먹구름 가림).
// -----------------------------------------------------------------------------
import * as THREE from 'three';

export const SKY_TIMES = ['day', 'sunset', 'night'];
export const SKY_WEATHERS = ['clear', 'overcast', 'rain', 'snow'];

// 태양 방위(정규화 0..1, 돔 텍스처 u축과 일치) — 서쪽 하늘에 걸리는 노을(고정 연출값).
const SUN_AZ = 0.78;
const MOON_AZ = 0.30;
// 구(SphereGeometry) UV 정합 실측: 텍스처 u가 그려지는 월드 방위 yaw = u·2π − π/2.
// (하네스 스윕으로 실측 검증 — getSunDir·무지개 배치는 반드시 이 변환을 거친다.)
const azWorld = (u) => u * Math.PI * 2 - Math.PI / 2;

// 시간대×날씨 → 조명·안개 테이블. fog는 ⑨규칙에 따라 돔 최하단색과 동일하게 유지할 것.
const LIGHT = {
  day: {
    clear:    { sun: 0xfff2dc, sunI: 0.95, hemiS: 0xcfe4f7, hemiG: 0x8fa385, hemiI: 1.0,  fog: 0xe9eef2, sunEl: 0.45 },
    overcast: { sun: 0xdfe3e8, sunI: 0.35, hemiS: 0xb9c2cc, hemiG: 0x7d8578, hemiI: 0.9,  fog: 0xc3cad2, sunEl: 0.45 },
    rain:     { sun: 0xc9d2dc, sunI: 0.25, hemiS: 0x9fa9b5, hemiG: 0x6d7570, hemiI: 0.85, fog: 0xa7b0ba, sunEl: 0.45 },
    snow:     { sun: 0xe8ecf2, sunI: 0.4,  hemiS: 0xcdd6e0, hemiG: 0x9aa39c, hemiI: 0.95, fog: 0xd4dbe3, sunEl: 0.45 },
  },
  sunset: {
    clear:    { sun: 0xffa25e, sunI: 0.9,  hemiS: 0xe8b48a, hemiG: 0x7a6a58, hemiI: 0.85, fog: 0xf2c9a2, sunEl: 0.06 },
    overcast: { sun: 0xc9a284, sunI: 0.3,  hemiS: 0xa8968a, hemiG: 0x6d635a, hemiI: 0.8,  fog: 0xb5a292, sunEl: 0.06 },
    rain:     { sun: 0xb08a74, sunI: 0.22, hemiS: 0x8d7f76, hemiG: 0x5d554e, hemiI: 0.75, fog: 0x97887c, sunEl: 0.06 },
    snow:     { sun: 0xd8b49a, sunI: 0.35, hemiS: 0xc0aa9a, hemiG: 0x847a6e, hemiI: 0.85, fog: 0xd0b9a5, sunEl: 0.06 },
  },
  night: {
    clear:    { sun: 0xaebfe0, sunI: 0.24, hemiS: 0x39445c, hemiG: 0x232a24, hemiI: 0.55, fog: 0x3d4762, sunEl: 0.5, moon: true },
    overcast: { sun: 0x6d7890, sunI: 0.12, hemiS: 0x2c3340, hemiG: 0x1d211d, hemiI: 0.5,  fog: 0x272d3a, sunEl: 0.5, moon: true },
    rain:     { sun: 0x5d6880, sunI: 0.1,  hemiS: 0x272d3a, hemiG: 0x191d1a, hemiI: 0.48, fog: 0x1f2530, sunEl: 0.5, moon: true },
    snow:     { sun: 0x8894b0, sunI: 0.16, hemiS: 0x333b4c, hemiG: 0x242923, hemiI: 0.55, fog: 0x2e3547, sunEl: 0.5, moon: true },
  },
};

const seeded = (s0) => { let s = s0 | 0; return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

// ── 돔 페인터 서브루틴 ────────────────────────────────────────────────────────

// 수평 wrap 대응 radial glow — 양끝 이음새가 없도록 x-W·x·x+W 세 번 그린다.
function glowWrapped(ctx, W, x, y, r, stops) {
  for (const ox of [-W, 0, W]) {
    const g = ctx.createRadialGradient(x + ox, y, 0, x + ox, y, r);
    for (const [t, c] of stops) g.addColorStop(t, c);
    ctx.fillStyle = g; ctx.fillRect(x + ox - r, y - r, r * 2, r * 2);
  }
}

// 지수 감쇠 글로우 스톱 생성 — 스톱 2~3개짜리 그라디언트가 만드는 마하 밴딩(동심원 호) 방지.
// c0(중심색)→c1(가장자리색)으로 색을 보간하며 알파를 (1-t)^gamma로 촘촘히 감쇠.
function glowStops(c0, c1, a0, gamma = 2.2, n = 10) {
  const st = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const r = (c0[0] + (c1[0] - c0[0]) * t) | 0, g = (c0[1] + (c1[1] - c0[1]) * t) | 0, b = (c0[2] + (c1[2] - c0[2]) * t) | 0;
    st.push([t, `rgba(${r},${g},${b},${(a0 * Math.pow(1 - t, gamma)).toFixed(3)})`]);
  }
  return st;
}

// ── 절차 노이즈(값 노이즈 fBm) ────────────────────────────────────────────────
// 원반(radial) 붓질 구름은 동그라미 뭉침이 얼굴처럼 보이고(파레이돌리아) 에어브러시처럼
// 인위적이라는 감독 지적 — 프랙탈 노이즈 밀도장 기반으로 근본 교체. 수평 주기는 격자
// 인덱스 모듈로로 정확히 wrap(u=0/1 이음새 0).
function makeNoise(rnd, size) {
  const g = new Float32Array(size * size);
  for (let i = 0; i < g.length; i++) g[i] = rnd();
  return (x, y, xper) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
    const i0 = ((xi % xper) + xper) % xper, i1 = (i0 + 1) % xper;
    const j0 = ((yi % size) + size) % size, j1 = (j0 + 1) % size;
    const a = g[j0 * size + (i0 % size)], b = g[j0 * size + (i1 % size)];
    const c = g[j1 * size + (i0 % size)], d = g[j1 * size + (i1 % size)];
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}
// u∈[0,1) 가로 1회 wrap 기준 fBm. P = 기본 옥타브의 격자 주기(정수 — 이음새 보장).
function fbm(n, u, v, oct, P) {
  let s = 0, amp = 0.5, f = 1, norm = 0;
  for (let o = 0; o < oct; o++) { s += amp * n(u * P * f, v * P * f, P * f); norm += amp; amp *= 0.5; f *= 2; }
  return s / norm;
}

// 노이즈 구름장 — 저해상 밀도장(D)을 만들고 상하 밀도차로 자기음영(위가 옅으면 = 구름
// 윗면 = 밝음)한 뒤 돔 상반부에 확대 합성. mode: 'cumulus'(맑은 하늘 조각구름 밴드) /
// 'layer'(먹구름·눈구름 전천 구조).
function paintCloudLayer(ctx, rnd, W, Hh, o) {
  const LW = o.soft ? 256 : 512, LH = LW >> 1;
  const n = makeNoise(rnd, 64);
  const D = new Float32Array(LW * LH);
  for (let y = 0; y < LH; y++) {
    const v = y / LH; // 0=천정 → 1=지평선
    // 종 모양 분포 — 시점에서 실제로 보이는 중간 고도(v 0.3~0.75)에 구름이 오도록.
    // 천정 15%(고도 76°+)는 비움 — 극점 수렴으로 구름이 부챗살·체크무늬로 뭉개진다(상방 실측).
    const prof = o.mode === 'cumulus'
      ? Math.min(1, Math.max(0, (v - 0.15) / 0.2)) * (1 - Math.max(0, (v - 0.9) / 0.1) * 0.55)
      : (1 - Math.max(0, (v - 0.78) / 0.22) * 0.85) * Math.min(1, Math.max(0, (v - 0.02) / 0.1));
    if (prof <= 0) continue;
    for (let x = 0; x < LW; x++) {
      const u = x / LW, yl = y / LW;
      let field;
      if (o.mode === 'cumulus') {
        const mask = fbm(n, u, yl + 37, 3, 5);  // 저주파 — 구름 덩어리 배치(중형 다수)
        const det = fbm(n, u, yl, 5, 9);        // 고주파 — 가장자리 디테일
        // 저고도 커버리지 보너스 — 지평선 근처는 투시 압축으로 구름이 겹겹이 보이는 실제 하늘 모사
        field = mask * 0.6 + det * 0.4 + Math.max(0, v - 0.35) * 0.14;
      } else {
        field = fbm(n, u, yl, 5, 5);
      }
      let d = Math.max(0, Math.min(1, (field - o.thr) / o.softEdge));
      d = d * d * (3 - 2 * d);
      D[y * LW + x] = d * prof;
    }
  }
  const off = document.createElement('canvas'); off.width = LW; off.height = LH;
  const octx = off.getContext('2d');
  const im = octx.createImageData(LW, LH);
  const px = im.data;
  for (let y = 0; y < LH; y++) {
    const yu = Math.max(0, y - 2);
    for (let x = 0; x < LW; x++) {
      const i = y * LW + x, here = D[i];
      if (here <= 0.003) continue;
      const light = Math.max(0, Math.min(1, 0.55 + (here - D[yu * LW + x]) * 2.6));
      const j = i * 4;
      px[j] = o.shade[0] + (o.tint[0] - o.shade[0]) * light;
      px[j + 1] = o.shade[1] + (o.tint[1] - o.shade[1]) * light;
      px[j + 2] = o.shade[2] + (o.tint[2] - o.shade[2]) * light;
      px[j + 3] = Math.min(255, here * o.alphaMax * 255);
    }
  }
  octx.putImageData(im, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(off, 0, 0, LW, LH, 0, 0, W, Hh);
  ctx.restore();
}

// ② 밴딩 파괴 디더링 — 미세 모노 노이즈를 낮은 알파로 1패스(저사양은 스킵).
// 최상단(천정 극점 부근)은 제외 — 극점에서 픽셀 노이즈가 방사 부챗살로 늘어난다(상방 실측).
function dither(ctx, rnd, W, H) {
  const y0 = (H * 0.05) | 0;
  const img = ctx.getImageData(0, y0, W, H - y0); const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = ((rnd() * 8) | 0) - 4; // ±4
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, y0);
}

// ── 하늘돔 리페인트 ──
// 돔은 완전 구(equirect): v=0 천정, v=0.5 지평선, v=1 천저. 하늘은 상반부(0..Hh)에만
// 그리고 하반부는 fog색 단색(지면에 가려 안 보이지만 지평선 이음새 방지 ⑨). — 실측 교정.
function paintSky(ctx, W, H, time, weather, opts) {
  const rnd = seeded(0xa17c + SKY_TIMES.indexOf(time) * 7 + SKY_WEATHERS.indexOf(weather) * 31);
  const L = LIGHT[time][weather];
  const Hh = H * 0.5; // 지평선(수평선) 텍스처 y
  // 눈도 구름 하늘 — 밤 눈 오는데 은하수가 보이는 모순 제거(눈구름은 먹구름보다 밝은 회백 톤)
  const cloudy = weather !== 'clear';
  const horizon = hex(L.fog); // ⑨ 지평선 = fog색 — 이음새 제거의 핵

  // 구름 하늘 톤(그라디언트·구름장 공용)
  const snowy = weather === 'snow';
  const cloudK = weather === 'rain' ? 0.8 : 1.0;
  const snowTop = { day: [168, 176, 186], sunset: [172, 150, 136], night: [40, 46, 58] };
  const cloudTop = !cloudy ? null : snowy ? snowTop[time]
    : time === 'night' ? [22, 26, 36] : time === 'sunset' ? [110, 96, 88] : [118, 128, 140];

  // 1) 베이스 수직 그라디언트(천정→지평) + 하반부 fog색
  const grd = ctx.createLinearGradient(0, 0, 0, Hh);
  if (cloudy) {
    grd.addColorStop(0, `rgb(${cloudTop.map((v) => (v * cloudK) | 0).join(',')})`);
    grd.addColorStop(0.62, `rgb(${cloudTop.map((v) => (v * cloudK * 1.22) | 0).join(',')})`);
    grd.addColorStop(1, horizon);
  } else if (time === 'day') {
    // 파랑을 지평선 가까이까지 끌어내려 하늘이 비어 보이지 않게 — 흰 헤이즈가 이르면
    // 저고도(시점에서 보이는 대부분의 하늘)에서 흰 구름이 배경에 묻힌다
    grd.addColorStop(0, '#3f86c8'); grd.addColorStop(0.62, '#8cbae0'); grd.addColorStop(0.93, '#bdd6ea'); grd.addColorStop(1, horizon);
  } else if (time === 'sunset') {
    // 베이스는 차분하게 — 타오르는 부분은 태양 방위 글로우가 담당(방위 비대칭 ①)
    grd.addColorStop(0, '#2e3d6b'); grd.addColorStop(0.45, '#6a5a8e'); grd.addColorStop(0.72, '#a06a74'); grd.addColorStop(1, horizon);
  } else {
    grd.addColorStop(0, '#070a16'); grd.addColorStop(0.55, '#141b30'); grd.addColorStop(0.85, '#232c46'); grd.addColorStop(1, horizon);
  }
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, Hh);
  ctx.fillStyle = horizon; ctx.fillRect(0, Hh - 1, W, H - Hh + 1);

  // 2) 태양 방위 연출 ① — 일몰: 지평선에 걸린 해 + 타오르는 글로우 + 반대편 지구그림자
  const sunX = SUN_AZ * W;
  if (!cloudy && time === 'sunset') {
    const sy = Hh * 0.96;
    // 반경을 넉넉히(천정 너머) 잡고 감마를 낮춰 8bit 알파 계단의 "끝자락 호"를 관심 영역 밖으로 민다
    glowWrapped(ctx, W, sunX, sy, Hh * 1.9, glowStops([255, 190, 110], [230, 110, 90], 0.42, 1.8, 28));
    glowWrapped(ctx, W, sunX, sy, Hh * 0.42, glowStops([255, 235, 190], [255, 190, 120], 0.85, 2.0));
    // 해 원반(지평선에 살짝 걸침)
    const sr = Hh * 0.06;
    const sg = ctx.createRadialGradient(sunX, sy, 0, sunX, sy, sr * 2.6);
    sg.addColorStop(0, 'rgba(255,244,214,1)'); sg.addColorStop(0.42, 'rgba(255,214,150,0.85)'); sg.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sunX, sy, sr * 2.6, 0, 7); ctx.fill();
    // 반대편 하늘 — 지구 그림자 벨트(차분한 청보라 밴드, 노을의 "진짜" 디테일)
    // 벨트 반경은 태양 쪽 하늘을 침범하지 않게 좁게(가장자리 호가 노을 위에 겹쳐 보이는 것 방지)
    const bx = ((SUN_AZ + 0.5) % 1) * W;
    glowWrapped(ctx, W, bx, Hh * 0.97, Hh * 0.55, glowStops([70, 80, 140], [90, 90, 150], 0.24, 1.6, 20));
  }
  if (!cloudy && time === 'day') {
    // equirect 위도 보정 — 고도가 높을수록 가로가 압축되므로 텍스처엔 가로 타원으로
    // 그려야 화면에서 원형(안 하면 태양이 세로로 길쭉한 기둥처럼 보인다).
    const sy = Hh * (1 - L.sunEl);
    const stretch = 1 / Math.max(0.35, Math.cos(L.sunEl * Math.PI / 2));
    ctx.save();
    ctx.translate(sunX, sy); ctx.scale(stretch, 1);
    const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, Hh * 0.55);
    for (const [t, c] of glowStops([255, 252, 240], [255, 248, 220], 0.85, 3.2)) gg.addColorStop(t, c);
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, Hh * 0.55, 0, 7); ctx.fill();
    const sr = Hh * 0.04;
    ctx.fillStyle = 'rgba(255,253,244,0.98)'; ctx.beginPath(); ctx.arc(0, 0, sr, 0, 7); ctx.fill();
    ctx.restore();
  }

  // 3) 밤하늘 ④ — 별밭·은하수(암흑대)·광망 별·달(크레이터+위상)
  if (time === 'night' && !cloudy) {
    // 별밭 — 균등 분포 + 천정 왜곡 보정.
    // pow 편향으로 천정에 별을 몰면 equirect 확대율이 최대인 천정에서 별이 눈송이 같은
    // 보케로 뭉개진다(실화면 상방 시선 검수에서 적출). 균등 분포로 두고 천정 근처는
    // 화면 확대에 맞춰 크기·알파를 줄인다. 저해상 돔(soft 512)은 확대 뭉개짐이 심해
    // "성기고 또렷한 별" 방향: 개수 1/3, 소프트 도트(사각 픽셀 방지), 천정 감쇠 강화.
    const starN = opts.lowRes ? 450 : 1300;
    const yMin = opts.lowRes ? 0.12 : 0.06, zcDen = opts.lowRes ? 0.5 : 0.35;
    for (let i = 0; i < starN; i++) {
      const x = rnd() * W, y = Hh * (yMin + rnd() * (0.92 - yMin));
      const zc = Math.min(1, y / (Hh * zcDen)); // 0=천정 → 1=중간 고도 이하
      const a = (0.2 + rnd() * 0.75) * (0.3 + 0.7 * zc);
      const r = (rnd() < 0.05 ? 1.7 : 0.6 + rnd() * 0.6) * (0.45 + 0.55 * zc);
      const cc = `${215 + (rnd() * 40 | 0)},${218 + (rnd() * 34 | 0)},255`;
      if (opts.lowRes) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.4);
        g.addColorStop(0, `rgba(${cc},${Math.min(1, a * 1.2).toFixed(2)})`); g.addColorStop(1, `rgba(${cc},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.4, 0, 7); ctx.fill();
      } else {
        ctx.fillStyle = `rgba(${cc},${a.toFixed(2)})`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      }
    }
    // 은하수 밴드(대각) — 웜 코어/쿨 엣지 + 암흑대 균열.
    // 천정 상부는 클립 — 극점에 닿으면 equirect 수렴으로 방사 줄무늬가 된다(상방 실측).
    ctx.save();
    ctx.beginPath(); ctx.rect(0, Hh * 0.14, W, Hh * 0.86); ctx.clip();
    ctx.translate(W * 0.5, Hh * 0.66); ctx.rotate(-0.42);
    const nebN = opts.lowRes ? 600 : 900, nebK = opts.lowRes ? 0.7 : 1;
    for (let i = 0; i < nebN; i++) { // 성운 얼룩 — 작고 많게(큰 반경은 흐린 보케 원반처럼 보인다)
      const bx = (rnd() - 0.5) * W * 1.35;
      const by = (rnd() - 0.5) * Hh * 0.34 * (1 + Math.cos((bx / W) * 3.1) * 0.45);
      const rr = (4 + rnd() * 13) * nebK, aa = 0.014 + rnd() * 0.032;
      const core = Math.abs(by) < Hh * 0.09;
      const huv = core ? (rnd() < 0.45 ? '235,220,200' : '228,225,240') : (rnd() < 0.3 ? '185,175,225' : '205,210,240');
      const g2 = ctx.createRadialGradient(bx, by, 0, bx, by, rr);
      g2.addColorStop(0, `rgba(${huv},${(aa * (core ? 2.6 : 1.8)).toFixed(3)})`); g2.addColorStop(1, `rgba(${huv},0)`);
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(bx, by, rr, 0, 7); ctx.fill();
    }
    for (let i = 0; i < 1600; i++) { // 밴드 내 고밀도 미세 별
      const bx = (rnd() - 0.5) * W * 1.3, by = (rnd() - 0.5) * Hh * 0.28;
      ctx.fillStyle = `rgba(238,240,255,${(0.1 + rnd() * 0.45).toFixed(2)})`;
      ctx.fillRect(bx, by, 1, 1);
    }
    // ④ 암흑대(dark rift) — 밴드 중심을 가르는 검은 균열(구불구불한 어두운 얼룩 사슬)
    let rx = -W * 0.62, ry0 = -Hh * 0.024;
    while (rx < W * 0.62) {
      const rr = 10 + rnd() * 24;
      const g3 = ctx.createRadialGradient(rx, ry0, 0, rx, ry0, rr);
      g3.addColorStop(0, 'rgba(8,10,22,0.34)'); g3.addColorStop(0.7, 'rgba(8,10,22,0.14)'); g3.addColorStop(1, 'rgba(8,10,22,0)');
      ctx.fillStyle = g3; ctx.beginPath(); ctx.arc(rx, ry0, rr, 0, 7); ctx.fill();
      rx += rr * (0.6 + rnd() * 0.5); ry0 += (rnd() - 0.5) * Hh * 0.04;
    }
    ctx.restore();
    // 광망 별 — 밝은 별 소수: 글로우 + 십자 스파이크(천정 편향 제거 — 위 별밭과 동일 사유)
    for (let i = 0; i < 7; i++) {
      const x = rnd() * W, y = Hh * (0.18 + rnd() * 0.6);
      const g4 = ctx.createRadialGradient(x, y, 0, x, y, 7);
      g4.addColorStop(0, 'rgba(255,255,255,0.95)'); g4.addColorStop(0.3, 'rgba(230,235,255,0.4)'); g4.addColorStop(1, 'rgba(230,235,255,0)');
      ctx.fillStyle = g4; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(240,244,255,0.55)'; ctx.lineWidth = 0.8;
      const s = 6 + rnd() * 5;
      ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
    }
    // 천정 캡 — 극점 부근 성분(별·은하수 자락)을 하늘 top색 소프트 페이드로 덮어
    // equirect 극점 수렴이 만드는 방사 스트릭을 봉인(상방 실측). 달(y 0.46Hh)은 안 걸린다.
    const cap = ctx.createLinearGradient(0, 0, 0, Hh * 0.2);
    cap.addColorStop(0, 'rgba(7,10,22,1)'); cap.addColorStop(0.55, 'rgba(7,10,22,0.7)'); cap.addColorStop(1, 'rgba(7,10,22,0)');
    ctx.fillStyle = cap; ctx.fillRect(0, 0, W, Hh * 0.2);

    // 달 ④ — 원반 + 크레이터 + 위상 터미네이터 + 넓은 글로우.
    // 낮 태양과 동일한 equirect 위도 보정(가로 타원) — 안 하면 상방 시선에서 타원 접시로 왜곡.
    const mx = MOON_AZ * W, my = Hh * 0.46, mr = Hh * 0.055;
    const mel = (1 - my / Hh) * Math.PI / 2;
    const mst = 1 / Math.max(0.35, Math.cos(mel));
    ctx.save();
    ctx.translate(mx, my); ctx.scale(mst, 1);
    const mg = ctx.createRadialGradient(0, 0, 0, 0, 0, mr * 5);
    for (const [t, c] of glowStops([226, 232, 224], [226, 232, 224], 0.3, 2.2)) mg.addColorStop(t, c);
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(0, 0, mr * 5, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(236,239,232,0.96)'; ctx.beginPath(); ctx.arc(0, 0, mr, 0, 7); ctx.fill();
    for (let i = 0; i < 8; i++) { // 크레이터(달면 안쪽 어두운 얼룩)
      const a = rnd() * 6.28, dd = rnd() * mr * 0.66, cr = mr * (0.08 + rnd() * 0.16);
      ctx.fillStyle = `rgba(190,196,188,${0.35 + rnd() * 0.25})`;
      ctx.beginPath(); ctx.arc(Math.cos(a) * dd, Math.sin(a) * dd, cr, 0, 7); ctx.fill();
    }
    // 위상 — 한쪽 가장자리를 살짝 덮는 터미네이터(과하면 잘린 원판처럼 보인다)
    ctx.beginPath(); ctx.arc(0, 0, mr + 0.5, 0, 7); ctx.clip();
    ctx.fillStyle = 'rgba(10,14,26,0.62)';
    ctx.beginPath(); ctx.arc(-mr * 1.25, 0, mr * 1.06, 0, 7); ctx.fill();
    ctx.restore();
  }

  // 4) 구름 ③ — 맑음: fBm 노이즈 조각구름(원반 붓질 아님 — 파레이돌리아·에어브러시 제거)
  if (!cloudy && time !== 'night') {
    const tint = time === 'sunset' ? [255, 216, 182] : [255, 255, 255];
    const shade = time === 'sunset' ? [172, 126, 132] : [138, 154, 172];
    paintCloudLayer(ctx, rnd, W, Hh, { mode: 'cumulus', thr: 0.5, softEdge: 0.15, alphaMax: 0.92, tint, shade, soft: opts.soft });
    for (let i = 0; i < 5; i++) { // 원경 층운 — 납작 타원 radial(수평 하드엣지는 돔에서 위도 원호로 도드라진다)
      const y = Hh * (0.74 + rnd() * 0.16), len = W * (0.1 + rnd() * 0.16), x = rnd() * W;
      const hgt = 2.4 + rnd() * 3;
      for (const ox of [-W, 0, W]) {
        ctx.save();
        ctx.translate(x + ox, y); ctx.scale(len / 2, hgt);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        g.addColorStop(0, `rgba(${tint.join(',')},0.11)`); g.addColorStop(0.7, `rgba(${tint.join(',')},0.045)`); g.addColorStop(1, `rgba(${tint.join(',')},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, 7); ctx.fill();
        ctx.restore();
      }
    }
  }
  if (cloudy) {
    // ③ 구름층 — fBm 전천 구조(밝은 틈·어두운 밑면이 노이즈 밀도장에서 자연 발생)
    const lit = cloudTop.map((v) => Math.min(255, (v * cloudK * 1.45 + 26) | 0));
    const shd = cloudTop.map((v) => (v * cloudK * 0.5) | 0);
    paintCloudLayer(ctx, rnd, W, Hh, { mode: 'layer', thr: 0.34, softEdge: 0.3, alphaMax: snowy ? 0.6 : 0.66, tint: lit, shade: shd, soft: opts.soft });
    if (weather === 'rain') { // 지평선 비 커튼(사선 얼룩)
      ctx.save(); ctx.globalAlpha = 0.1;
      for (let i = 0; i < 9; i++) {
        const x = rnd() * W, w2 = 30 + rnd() * 60;
        const g = ctx.createLinearGradient(x, Hh * 0.62, x + 14, Hh);
        g.addColorStop(0, 'rgba(160,172,186,0)'); g.addColorStop(0.4, 'rgba(160,172,186,0.5)'); g.addColorStop(1, 'rgba(160,172,186,0)');
        ctx.fillStyle = g; ctx.fillRect(x, Hh * 0.62, w2, Hh * 0.38);
      }
      ctx.restore();
    }
  }

  if (!opts.soft) dither(ctx, rnd, W, Hh); // ② 밴딩 파괴 — 하늘(상반부)만(하반부는 단색)
}

// ── WebAudio 합성 천둥(파일 0) ──
function synthThunder(delayS) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = synthThunder._ctx || (synthThunder._ctx = new AC());
    if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); }
    const t0 = ctx.currentTime + delayS;
    const dur = 2.2 + Math.random() * 1.4;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < d.length; i++) {
      brown += (Math.random() * 2 - 1) * 0.02; brown *= 0.996;
      const t = i / d.length;
      const env = Math.pow(1 - t, 1.6) * (t < 0.06 ? t / 0.06 : 1) * (0.7 + 0.3 * Math.sin(t * 40 + Math.random()));
      d[i] = brown * env * 3.2;
    }
    const src = ctx.createBufferSource(); src.buffer = buf;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    const gain = ctx.createGain(); gain.gain.value = 0.5;
    src.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
    src.start(t0);
  } catch (_) { /* 무음 폴백 */ }
}

export function createSkySystem({ scene, renderer, sun, hemi, sky, getPos, soft = false, onApply = null }) {
  const state = { time: 'day', weather: 'clear', fx: { rainbow: false, aurora: false }, flashSafe: false, precip: 1 };
  const disposables = [];
  const track = (o) => { disposables.push(o); return o; };
  const DOME_W = soft ? 1024 : 2048, DOME_H = soft ? 512 : 1024;

  // 저폴리 돔(24×12)은 위도 링을 따라 UV 보간이 절곡돼 그라디언트에 마하 밴드 원호가 생긴다
  // (하네스 실측). 주입받은 돔의 지오메트리를 고해상 구로 교체 — 정점 ~1.6k, 비용 무시 가능.
  if (sky.geometry && sky.geometry.parameters && (sky.geometry.parameters.widthSegments || 0) < 48) {
    const old = sky.geometry;
    sky.geometry = track(new THREE.SphereGeometry(old.parameters.radius || 520, 48, 32));
    old.dispose();
  }

  // ⑧ 이중 돔 크로스페이드 — 주 돔(sky, 주입) + 페이드 돔(복제, 위에 겹쳐 opacity 0→1 후 스왑)
  const mkDomeTex = () => { const c = document.createElement('canvas'); c.width = DOME_W; c.height = DOME_H; return { c, ctx: c.getContext('2d'), tex: track(new THREE.CanvasTexture(c)) }; };
  const domeA = mkDomeTex(), domeB = mkDomeTex();
  domeA.tex.colorSpace = domeB.tex.colorSpace = THREE.SRGBColorSpace;
  const oldMap = sky.material.map;
  sky.material.map = domeA.tex; sky.material.needsUpdate = true;
  if (oldMap) oldMap.dispose();
  const fadeDome = new THREE.Mesh(sky.geometry, track(new THREE.MeshBasicMaterial({ map: domeB.tex, side: THREE.BackSide, fog: false, depthWrite: false, transparent: true, opacity: 0 })));
  fadeDome.renderOrder = -0.9; fadeDome.visible = false;
  sky.add(fadeDome); // sky가 카메라 추종이므로 자식으로 두면 자동 동행

  // 조명 lerp 상태(⑧) — from→to를 fade 동안 보간
  const lerpState = { t: 1, dur: 0, from: null, to: null };
  const asVec = (L) => ({ sun: new THREE.Color(L.sun), hemiS: new THREE.Color(L.hemiS), hemiG: new THREE.Color(L.hemiG), fog: new THREE.Color(L.fog), sunI: L.sunI, hemiI: L.hemiI });

  // ── 강수 — ⑤ 비=LineSegments 빗줄기 / 눈=Points ──
  const R_COUNT = soft ? 300 : 900;
  const rainGeo = track(new THREE.BufferGeometry());
  const rPos = new Float32Array(R_COUNT * 6); // 선분당 2정점
  const rSeed = new Float32Array(R_COUNT);
  const RBOX = { x: 42, y: 22, z: 42 };
  { const r = seeded(77); for (let i = 0; i < R_COUNT; i++) { const x = (r() - 0.5) * RBOX.x, y = r() * RBOX.y, z = (r() - 0.5) * RBOX.z; rPos[i * 6] = x; rPos[i * 6 + 1] = y; rPos[i * 6 + 2] = z; rPos[i * 6 + 3] = x; rPos[i * 6 + 4] = y - 0.55; rPos[i * 6 + 5] = z; rSeed[i] = r() * 6.28; } }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
  const rain = new THREE.LineSegments(rainGeo, track(new THREE.LineBasicMaterial({ color: 0xaebfd4, transparent: true, opacity: 0.4 })));
  rain.visible = false; rain.frustumCulled = false; scene.add(rain);

  const S_COUNT = soft ? 260 : 700;
  const snowGeo = track(new THREE.BufferGeometry());
  const sPos = new Float32Array(S_COUNT * 3); const sSeed = new Float32Array(S_COUNT);
  { const r = seeded(78); for (let i = 0; i < S_COUNT; i++) { sPos[i * 3] = (r() - 0.5) * RBOX.x; sPos[i * 3 + 1] = r() * RBOX.y; sPos[i * 3 + 2] = (r() - 0.5) * RBOX.z; sSeed[i] = r() * 6.28; } }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  // 원형 스프라이트 — 기본 Points는 사각 픽셀로 그려져 눈송이가 네모로 보인다
  const snowSprite = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(16, 16, 16, 0, 7); x.fill();
    return track(new THREE.CanvasTexture(c));
  })();
  const snow = new THREE.Points(snowGeo, track(new THREE.PointsMaterial({ color: 0xffffff, size: 0.16, map: snowSprite, transparent: true, opacity: 0.9, depthWrite: false })));
  snow.visible = false; snow.frustumCulled = false; scene.add(snow);

  // ── 무지개 ⑥ — 링 지오메트리(planar UV) × 방사형 스펙트럼 텍스처 ──
  // 주 무지개 + 알렉산더 밴드(어두운 사이 띠) + 색 역순 2차 무지개를 그라디언트 한 장·메시 1개로.
  // (토러스는 UV가 튜브 둘레를 돌아 스펙트럼 절반만 보였다 — 실측 후 재설계.)
  const RB_IN = 150, RB_OUT = 232;
  function rainbowTexture() {
    const S = 512, c = document.createElement('canvas'); c.width = S; c.height = S;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(S / 2, S / 2, (RB_IN / RB_OUT) * (S / 2), S / 2, S / 2, S / 2);
    const t = (r) => Math.min(1, Math.max(0, (r - RB_IN) / (RB_OUT - RB_IN)));
    const stops = [
      [150, 'rgba(138,91,192,0)'],
      [158, 'rgba(138,91,192,0.36)'],  // 보라(안쪽)
      [163, 'rgba(74,144,208,0.44)'],  // 파랑
      [168, 'rgba(91,184,93,0.46)'],   // 초록
      [173, 'rgba(230,194,41,0.48)'],  // 노랑
      [178, 'rgba(232,133,58,0.48)'],  // 주황
      [183, 'rgba(229,72,77,0.44)'],   // 빨강(바깥 — 실제 무지개 색 순서)
      [189, 'rgba(229,72,77,0)'],
      [193, 'rgba(46,62,92,0.055)'],   // ⑥ 알렉산더 밴드 — 주·2차 사이의 살짝 어두운 하늘
      [204, 'rgba(46,62,92,0.055)'],
      [208, 'rgba(229,72,77,0)'],
      [211, 'rgba(229,72,77,0.16)'],   // 2차 무지개(색 역순·희미)
      [215, 'rgba(230,194,41,0.17)'],
      [219, 'rgba(74,144,208,0.16)'],
      [223, 'rgba(138,91,192,0.14)'],
      [229, 'rgba(138,91,192,0)'],
    ];
    for (const [r, col] of stops) g.addColorStop(t(r), col);
    x.fillStyle = g; x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, 7); x.fill();
    const tex = track(new THREE.CanvasTexture(c)); tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  const rainbowGrp = new THREE.Group();
  rainbowGrp.add(new THREE.Mesh(
    track(new THREE.RingGeometry(RB_IN, RB_OUT, 96, 1, 0, Math.PI)),
    track(new THREE.MeshBasicMaterial({ map: rainbowTexture(), transparent: true, opacity: 0.85, depthWrite: false, fog: false, side: THREE.DoubleSide }))
  ));
  rainbowGrp.visible = false; scene.add(rainbowGrp);

  // ── 오로라 ⑦ — 수직 스트리크 텍스처 × 버텍스 색 커튼 ──
  function auroraTexture() {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const x = c.getContext('2d'); const r = seeded(913);
    // 수직 빛살: 랜덤 세로 라인 다발(하단 밝고 상단 소멸)
    for (let i = 0; i < 240; i++) {
      const px = r() * 512, w2 = 1 + r() * 3, a = 0.05 + r() * 0.22;
      const g = x.createLinearGradient(0, 128, 0, 0);
      g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.45, `rgba(255,255,255,${a * 0.55})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(px, 0, w2, 128);
    }
    const tex = track(new THREE.CanvasTexture(c)); tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }
  const AUR_SEG = soft ? 28 : 56;
  const auroraTex = auroraTexture();
  function makeAurora(zOff, phase) {
    const geo = track(new THREE.PlaneGeometry(560, 110, AUR_SEG, 1));
    const colors = new Float32Array((AUR_SEG + 1) * 2 * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = track(new THREE.MeshBasicMaterial({ map: auroraTex, vertexColors: true, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    const m = new THREE.Mesh(geo, mat);
    m.position.set(0, 155, zOff); m.visible = false; m.renderOrder = -0.6;
    m.userData = { phase };
    scene.add(m);
    return m;
  }
  const auroras = [makeAurora(-300, 0), makeAurora(-345, 2.4)];

  // ── 번개 ──
  let boltTimer = 8, flashT = 0;
  const cur = asVec(LIGHT.day.clear); // 현재 적용값(플래시 기준·lerp 결과 보관)

  function applyLighting(vals) {
    sun.color.copy(vals.sun); sun.intensity = vals.sunI;
    hemi.color.copy(vals.hemiS); hemi.groundColor.copy(vals.hemiG); hemi.intensity = vals.hemiI;
    if (scene.fog) scene.fog.color.copy(vals.fog);
    renderer.setClearColor(vals.fog, 1);
  }

  /** ① 태양(밤=달) 방향 벡터 — 배선측이 디렉셔널 위치·섀도에 사용(하늘 그림과 조명 일치).
   *  azWorld()로 구 UV 정합 실측치를 반영 — 그림 속 해·달 방위와 빛 방향이 일치한다. */
  function getSunDir() {
    const L = LIGHT[state.time][state.weather];
    const az = azWorld(L.moon ? MOON_AZ : SUN_AZ);
    const el = L.moon ? 0.9 : L.sunEl * Math.PI * 0.5 + 0.12;
    return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
  }

  function normalize(s) {
    const time = SKY_TIMES.includes(s.time) ? s.time : state.time;
    const weather = SKY_WEATHERS.includes(s.weather) ? s.weather : state.weather;
    const fx = Object.assign({}, state.fx, s.fx || {});
    if (time === 'night') fx.rainbow = false;
    if (weather === 'rain' || weather === 'snow') fx.rainbow = false;
    if (!(time === 'night' && weather === 'clear')) fx.aurora = false;
    return { time, weather, fx };
  }

  let phase = 0; // 크로스페이드 진행(0=없음)
  function set(s = {}, o = {}) {
    const n = normalize(s);
    const changedDome = n.time !== state.time || n.weather !== state.weather;
    state.time = n.time; state.weather = n.weather; state.fx = n.fx;
    if (typeof s.flashSafe === 'boolean') state.flashSafe = s.flashSafe;
    const L = LIGHT[state.time][state.weather];
    const fade = (o.fade === undefined ? 1.8 : o.fade) * (soft ? 0 : 1); // 저사양은 스냅
    // 저사양 돔은 1024×512이지만 야간 맑음만은 2048 풀해상으로 페인트 — 512 텍스처에
    // 1px 별을 찍으면 화면 확대로 눈송이처럼 뭉개진다(실화면 적출). 밤 전환 1회 비용 수용.
    // soft는 fade=0이라 항상 domeA 단일 경로 → 크로스페이드 스왑과 크기 불일치 없음.
    const wantW = (!soft || (state.time === 'night' && state.weather === 'clear')) ? 2048 : DOME_W;
    const wantH = wantW >> 1;
    const pOpts = { soft, lowRes: wantW < 2048 };
    if (changedDome && fade > 0) {
      paintSky(domeB.ctx, DOME_W, DOME_H, state.time, state.weather, pOpts);
      domeB.tex.needsUpdate = true;
      fadeDome.material.map = domeB.tex; fadeDome.material.opacity = 0; fadeDome.visible = true;
      lerpState.from = { ...cur, sun: cur.sun.clone(), hemiS: cur.hemiS.clone(), hemiG: cur.hemiG.clone(), fog: cur.fog.clone() };
      lerpState.to = asVec(L); lerpState.t = 0; lerpState.dur = fade;
      phase = 1;
    } else {
      if (domeA.c.width !== wantW) { domeA.c.width = wantW; domeA.c.height = wantH; }
      paintSky(domeA.ctx, wantW, wantH, state.time, state.weather, pOpts);
      domeA.tex.needsUpdate = true;
      Object.assign(cur, asVec(L)); applyLighting(cur);
      lerpState.t = 1; phase = 0;
    }
    rain.visible = state.weather === 'rain';
    snow.visible = state.weather === 'snow';
    rainbowGrp.visible = !!state.fx.rainbow;
    for (const a of auroras) a.visible = !!state.fx.aurora;
    boltTimer = 6 + Math.random() * 8;
    if (onApply) { try { onApply(get(), L); } catch (_) {} } // ⑩ 가로등·창·envMap 연동 훅
    return get();
  }
  const get = () => ({ time: state.time, weather: state.weather, fx: Object.assign({}, state.fx), flashSafe: state.flashSafe });

  let t = 0;
  function update(dt) {
    t += dt;
    const pos = getPos();
    // ⑧ 크로스페이드 진행 — 돔 opacity + 조명 lerp, 완료 시 A/B 스왑
    if (phase === 1) {
      lerpState.t = Math.min(1, lerpState.t + dt / lerpState.dur);
      const k = lerpState.t * lerpState.t * (3 - 2 * lerpState.t); // smoothstep
      fadeDome.material.opacity = k;
      cur.sun.lerpColors(lerpState.from.sun, lerpState.to.sun, k);
      cur.hemiS.lerpColors(lerpState.from.hemiS, lerpState.to.hemiS, k);
      cur.hemiG.lerpColors(lerpState.from.hemiG, lerpState.to.hemiG, k);
      cur.fog.lerpColors(lerpState.from.fog, lerpState.to.fog, k);
      cur.sunI = lerpState.from.sunI + (lerpState.to.sunI - lerpState.from.sunI) * k;
      cur.hemiI = lerpState.from.hemiI + (lerpState.to.hemiI - lerpState.from.hemiI) * k;
      applyLighting(cur);
      if (lerpState.t >= 1) { // 스왑: B를 주 돔으로
        domeA.ctx.drawImage(domeB.c, 0, 0);
        domeA.tex.needsUpdate = true;
        fadeDome.visible = false; fadeDome.material.opacity = 0;
        phase = 0;
      }
    }
    // 강수
    if (rain.visible) {
      const arr = rainGeo.attributes.position.array;
      const fall = 17 * dt * state.precip;
      for (let i = 0; i < R_COUNT; i++) {
        arr[i * 6 + 1] -= fall; arr[i * 6 + 4] -= fall;
        if (arr[i * 6 + 4] < 0) { const ny = RBOX.y; arr[i * 6 + 1] = ny; arr[i * 6 + 4] = ny - 0.55; }
      }
      rainGeo.attributes.position.needsUpdate = true;
      rain.position.set(pos.x, 0, pos.z);
    }
    if (snow.visible) {
      const arr = snowGeo.attributes.position.array;
      const fall = 2.1 * dt * state.precip;
      for (let i = 0; i < S_COUNT; i++) {
        arr[i * 3 + 1] -= fall;
        arr[i * 3] += Math.sin(t * 1.3 + sSeed[i]) * dt * 0.5;
        if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] += RBOX.y;
      }
      snowGeo.attributes.position.needsUpdate = true;
      snow.position.set(pos.x, 0, pos.z);
    }
    // 무지개 — 태양 반대 방위(광학적으로 정확: 무지개는 항상 해를 등질 때 보인다)
    if (rainbowGrp.visible) {
      const az = azWorld(SUN_AZ) + Math.PI;
      rainbowGrp.position.set(pos.x + Math.sin(az) * 300, -24, pos.z + Math.cos(az) * 300);
      rainbowGrp.lookAt(pos.x, -24, pos.z);
    }
    // 오로라 — 물결(버텍스 y) + 색 흐름(하단 그린 엣지→상단 퍼플) + 텍스처 드리프트
    if (state.fx.aurora) {
      auroraTex.offset.x = t * 0.005;
      for (const a of auroras) {
        a.position.x = pos.x; a.position.z = pos.z + a.userData.phase * 12 - 320;
        const cAttr = a.geometry.attributes.color, pAttr = a.geometry.attributes.position;
        for (let i = 0; i <= AUR_SEG; i++) {
          const w = Math.sin(t * 0.5 + i * 0.33 + a.userData.phase) * 16 + Math.sin(t * 0.23 + i * 0.11) * 8;
          pAttr.setY(i, 55 + w); pAttr.setY(i + AUR_SEG + 1, -55 + w * 0.55);
          const k = 0.5 + 0.5 * Math.sin(t * 0.35 + i * 0.2 + a.userData.phase);
          // 상단(퍼플·소멸) / 하단(그린 엣지 — 오로라의 가장 밝은 곳)
          cAttr.setXYZ(i, 0.5 + 0.16 * k, 0.24 + 0.1 * k, 0.72 + 0.18 * k);
          cAttr.setXYZ(i + AUR_SEG + 1, 0.2 + 0.16 * k, 0.95, 0.5 + 0.16 * k);
        }
        cAttr.needsUpdate = true; pAttr.needsUpdate = true;
      }
    }
    // 번개(비) — 이중 섬광(자연스러운 더블 플래시) + 지연 천둥
    if (state.weather === 'rain') {
      boltTimer -= dt;
      if (boltTimer <= 0) {
        boltTimer = 7 + Math.random() * 14;
        flashT = state.flashSafe ? 0.05 : 0.3;
        synthThunder(0.8 + Math.random() * 2.2);
      }
      if (flashT > 0) {
        flashT = Math.max(0, flashT - dt);
        const kk = state.flashSafe ? 0.22 : 1.0;
        const double = flashT > 0.18 || (flashT < 0.12 && flashT > 0.04) ? 1 : 0.25; // 더블 플래시 파형
        hemi.intensity = cur.hemiI + 2.4 * double * kk;
        sun.intensity = cur.sunI + 0.9 * double * kk;
      } else { hemi.intensity = cur.hemiI; sun.intensity = cur.sunI; }
    }
  }

  function dispose() {
    scene.remove(rain); scene.remove(snow); scene.remove(rainbowGrp); for (const a of auroras) scene.remove(a);
    sky.remove(fadeDome);
    for (const o of disposables) { try { o.dispose(); } catch (_) {} }
  }

  set({ time: 'day', weather: 'clear' }, { fade: 0 });
  return { set, get, update, getSunDir, dispose, SKY_TIMES, SKY_WEATHERS };
}

/** 방문자 실제 시각 → 시간대 자동 매핑(신 모드 '자동' 버튼용) */
export function autoTimeOfDay(d = new Date()) {
  const h = d.getHours();
  if (h >= 7 && h < 17) return 'day';
  if ((h >= 17 && h < 20) || (h >= 5 && h < 7)) return 'sunset';
  return 'night';
}
