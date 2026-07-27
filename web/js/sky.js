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
        const mask = fbm(n, u, yl + 37, 3, 6);  // 저주파 — 구름 덩어리 배치(중형 다수)
        const det = fbm(n, u, yl, 5, 11);       // 고주파 — 가장자리 디테일(더 잘게 부숴 조각감)
        // 저고도 커버리지 보너스 축소 — 지평선을 다 덮어 "뭉친" 느낌 주던 것(감독 지적) 완화.
        field = mask * 0.64 + det * 0.36 + Math.max(0, v - 0.45) * 0.05;
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
    // 별밭(정적) — 어두운/중간 별. 밝은 별(십자 스파이크)은 트윙클 레이어로 분리되어 반짝인다.
    // 밝기 2등급 차등(감독: "밝기 동일하게 하지 말고") + 색온도 다양화(starColor).
    const starN = opts.lowRes ? 500 : 1400;
    const yMin = opts.lowRes ? 0.12 : 0.06, zcDen = opts.lowRes ? 0.5 : 0.35;
    for (let i = 0; i < starN; i++) {
      const x = rnd() * W, y = Hh * (yMin + rnd() * (0.92 - yMin));
      const zc = Math.min(1, y / (Hh * zcDen)); // 0=천정 → 1=중간 고도 이하
      const mid = rnd() > 0.72;
      const a = (mid ? 0.5 + rnd() * 0.3 : 0.14 + rnd() * 0.3) * (0.35 + 0.65 * zc);
      const r = (mid ? 0.9 + rnd() * 0.5 : 0.5 + rnd() * 0.5) * (0.45 + 0.55 * zc);
      const [cr, cg, cb] = starColor(rnd);
      const cc = `${cr},${cg},${cb}`;
      if (opts.lowRes) { // 저해상 돔은 소프트 도트(사각 픽셀 방지)
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.4);
        g.addColorStop(0, `rgba(${cc},${Math.min(1, a * 1.15).toFixed(2)})`); g.addColorStop(1, `rgba(${cc},0)`);
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
    // (광망 별은 별밭 3등급에 통합 — 위 bright 등급이 글로우 헤일로+색 스파이크를 그린다)
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
    // 감독 지시: 달을 흰색이 아니라 "진짜 노란색"으로 — 따뜻한 버터/골드 톤 + 노란 헤일로.
    const mg = ctx.createRadialGradient(0, 0, 0, 0, 0, mr * 5.5);
    for (const [t, c] of glowStops([255, 224, 140], [255, 210, 120], 0.34, 2.2)) mg.addColorStop(t, c);
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(0, 0, mr * 5.5, 0, 7); ctx.fill();
    // 원반 — 살짝 방사 그라디언트(가장자리로 갈수록 톤 짙어져 구체감)
    const md = ctx.createRadialGradient(-mr * 0.25, -mr * 0.25, 0, 0, 0, mr);
    md.addColorStop(0, 'rgba(255,246,204,0.99)'); md.addColorStop(0.68, 'rgba(249,228,156,0.98)'); md.addColorStop(1, 'rgba(232,200,124,0.97)');
    ctx.fillStyle = md; ctx.beginPath(); ctx.arc(0, 0, mr, 0, 7); ctx.fill();
    // 표면 무늬 — 원반 안쪽으로 클립해 밖으로 새지 않게
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, mr, 0, 7); ctx.clip();
    for (let i = 0; i < 5; i++) { // 마리아(달의 바다) — 큰 저채도 황회색 패치(실제 달 무늬)
      const a = rnd() * 6.28, dd = rnd() * mr * 0.55, mrr = mr * (0.24 + rnd() * 0.3);
      const cx = Math.cos(a) * dd, cy = Math.sin(a) * dd;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, mrr);
      g.addColorStop(0, `rgba(206,178,120,${0.28 + rnd() * 0.14})`); g.addColorStop(0.7, 'rgba(206,178,120,0.08)'); g.addColorStop(1, 'rgba(206,178,120,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, mrr, 0, 7); ctx.fill();
    }
    for (let i = 0; i < 11; i++) { // 크레이터 — 입체(어두운 우묵 + 광원쪽 밝은 림)
      const a = rnd() * 6.28, dd = rnd() * mr * 0.82, cr = mr * (0.05 + rnd() * 0.13);
      const cx = Math.cos(a) * dd, cy = Math.sin(a) * dd;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
      cg.addColorStop(0, `rgba(198,166,104,${0.4 + rnd() * 0.2})`); cg.addColorStop(0.8, 'rgba(210,180,120,0.12)'); cg.addColorStop(1, 'rgba(210,180,120,0)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(255,248,214,${0.22 + rnd() * 0.16})`; ctx.lineWidth = 0.7; // 상단 밝은 림
      ctx.beginPath(); ctx.arc(cx, cy, cr * 0.86, Math.PI * 1.15, Math.PI * 1.95); ctx.stroke();
    }
    for (let i = 0; i < 90; i++) { // 표면 미세 알갱이(레골리스 질감)
      const a = rnd() * 6.28, dd = rnd() * mr * 0.96;
      ctx.fillStyle = `rgba(${rnd() < 0.5 ? '255,250,220' : '200,170,110'},${(0.05 + rnd() * 0.1).toFixed(2)})`;
      ctx.fillRect(Math.cos(a) * dd, Math.sin(a) * dd, 1, 1);
    }
    ctx.restore();
    // 위상 — 한쪽 가장자리를 살짝 덮는 터미네이터(과하면 잘린 원판처럼 보인다)
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, mr + 0.5, 0, 7); ctx.clip();
    ctx.fillStyle = 'rgba(10,14,26,0.62)';
    ctx.beginPath(); ctx.arc(-mr * 1.25, 0, mr * 1.06, 0, 7); ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  // 4) 맑음 뭉게구름은 여기서 그리지 않는다 — 별도 레이어(paintClearClouds)에서 그려 바람에
  //    흐르게 한다(감독 지시: "구름도 절차 캔버스라 저비용으로 움직이게"). 여기선 흐림/비/눈만.
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

// 별 색온도 팔레트(항성 실제 색) — 흰색 다수 + 따뜻한/차가운 별 소수.
function starColor(rnd) {
  const t = rnd();
  return t < 0.14 ? [255, 198, 152] : t < 0.30 ? [255, 228, 190]
    : t < 0.74 ? [246, 248, 255] : t < 0.90 ? [200, 214, 255] : [168, 196, 255];
}

// 반짝이는 밝은 별(십자 스파이크) 전용 페인터 — 홀짝으로 두 캔버스에 나눠 그린다.
// 두 레이어를 반대 위상으로 opacity 진동시키면 별이 "생겼다 사라졌다" 반짝인다(감독 지시).
// 위치·색은 결정론(시드 고정) — 시간대 무관 동일, opacity만 런타임 제어.
function paintTwinkleStars(ctxA, ctxB, W, Hh) {
  const rnd = seeded(0x7a1e);
  ctxA.clearRect(0, 0, W, Hh * 2); ctxB.clearRect(0, 0, W, Hh * 2);
  for (let i = 0; i < 34; i++) {
    const ctx = (i % 2 === 0) ? ctxA : ctxB;
    const x = rnd() * W, y = Hh * (0.06 + rnd() * 0.62);
    const zc = Math.min(1, y / (Hh * 0.35));
    const r = (1.5 + rnd() * 0.9) * (0.5 + 0.5 * zc);
    const a = 0.85 + rnd() * 0.15;
    const [cr, cg, cb] = starColor(rnd); const cc = `${cr},${cg},${cb}`;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
    g.addColorStop(0, `rgba(${cc},${a.toFixed(2)})`); g.addColorStop(0.35, `rgba(${cc},${(a * 0.5).toFixed(2)})`); g.addColorStop(1, `rgba(${cc},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(${cc},${(a * 0.6).toFixed(2)})`; ctx.lineWidth = 0.8;
    const s = 5 + r * 3.4;
    ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
  }
}

// 맑음 뭉게구름 전용 페인터 — 투명 배경 캔버스에 구름만. 흐르는 구름 레이어(가로 스크롤)용.
// 시드를 시간대 무관 고정(0xC10D) → 낮↔일몰 전환 시 구름 형태 유지되고 톤만 바뀌어 자연스럽다.
function paintClearClouds(ctx, W, Hh, time, soft) {
  ctx.clearRect(0, 0, W, Hh * 2);
  const rnd = seeded(0xc10d);
  const tint = time === 'sunset' ? [255, 216, 182] : [255, 255, 255];
  const shade = time === 'sunset' ? [172, 126, 132] : [138, 154, 172];
  // thr 상향(구름 면적 축소 — 파란 하늘이 조각구름 사이로 보이게, 감독 "뭉쳐진 느낌" 해소)
  paintCloudLayer(ctx, rnd, W, Hh, { mode: 'cumulus', thr: 0.56, softEdge: 0.13, alphaMax: 0.92, tint, shade, soft });
  for (let i = 0; i < 5; i++) { // 원경 층운
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

/** 섬광 화이트닝 목표색. Color 인스턴스 하나 — 조명·재질·메시가 아니라 개수 불변식 무관. */
const WHITE = new THREE.Color(1, 1, 1);

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

export function createSkySystem({ scene, renderer, sun, hemi, sky, getPos, soft = false, onApply = null, waterY = null }) {
  const state = { time: 'day', weather: 'clear', fx: { rainbow: false, aurora: false }, flashSafe: false, precip: 1 };
  // ── B-2 저사양 오버드로우 축소 ──
  // 모바일 타일드 GPU는 불투명 오브젝트의 오버드로우는 제거하지만 transparent·가산블렌딩 레이어
  // (강수·오로라·수면 빛기둥·반짝이 별)는 그 최적화가 무력화돼 fill 비용이 그대로 쌓인다.
  // world.js의 liteMode 진입 시 setLite(true)로 이 레이어들의 "양"만 축소한다 — 강수는
  // draw-range(그리는 입자 수)를, 보조 투명 레이어는 opacity를 낮춘다. 연출 톤(색·움직임)과
  // 개수·재질은 그대로 두고(재생성·재컴파일 0) draw-range/opacity로만 제어(팀장 설계 톤 보존).
  let lite = false;
  const LITE_PRECIP_MUL = 0.45; // 강수(비·눈) 그리는 입자 비율
  const LITE_AUR_MUL = 0.5;     // 오로라 opacity 배수
  const LITE_GLINT_MUL = 0.55;  // 수면 빛기둥 opacity 배수
  const LITE_TWK_MUL = 0.5;     // 반짝이 별 opacity 배수
  const AUR_BASE_OPACITY = 0.5; // 오로라 기준 opacity(생성값 — 복원 기준)
  const disposables = [];
  const track = (o) => { disposables.push(o); return o; };
  // 돔 텍스처는 전 기기 2048 고정. ①저해상(512) 하늘은 별이 화면 확대로 뭉개지고(실측)
  // ②캔버스 크기를 도중에 바꾸면 three가 텍스처를 불변 스토리지로 잡아 needsUpdate로도
  // 재업로드되지 않는다(전환 후 하늘이 안 바뀌는 버그 — 진단 실측). soft 절약은 디더 스킵과
  // 구름 밀도장 저해상으로 충분하고, 페인트는 전환 시 1회 비용이다.
  const DOME_W = 2048, DOME_H = 1024;

  // 저폴리 돔(24×12)은 위도 링을 따라 UV 보간이 절곡돼 그라디언트에 마하 밴드 원호가 생긴다
  // (하네스 실측). 주입받은 돔의 지오메트리를 고해상 구로 교체 — 정점 ~1.6k, 비용 무시 가능.
  if (sky.geometry && sky.geometry.parameters && (sky.geometry.parameters.widthSegments || 0) < 48) {
    const old = sky.geometry;
    sky.geometry = track(new THREE.SphereGeometry(old.parameters.radius || 520, 48, 32));
    old.dispose();
  }

  // ⑧ 이중 돔 크로스페이드 — 주 돔(sky, 주입) + 페이드 돔(복제, 위에 겹쳐 opacity 0→1 후 스왑)
  const mkDomeTex = () => { const c = document.createElement('canvas'); c.width = DOME_W; c.height = DOME_H; return { c, ctx: c.getContext('2d', { willReadFrequently: true }), tex: track(new THREE.CanvasTexture(c)) }; };
  const domeA = mkDomeTex(), domeB = mkDomeTex();
  domeA.tex.colorSpace = domeB.tex.colorSpace = THREE.SRGBColorSpace;
  const oldMap = sky.material.map;
  sky.material.map = domeA.tex; sky.material.needsUpdate = true;
  if (oldMap) oldMap.dispose();
  const fadeDome = new THREE.Mesh(sky.geometry, track(new THREE.MeshBasicMaterial({ map: domeB.tex, side: THREE.BackSide, fog: false, depthWrite: false, transparent: true, opacity: 0 })));
  fadeDome.renderOrder = -0.9; fadeDome.visible = false;
  sky.add(fadeDome); // sky가 카메라 추종이므로 자식으로 두면 자동 동행

  // ── 흐르는 구름 레이어(감독 지시) — 맑음 뭉게구름 전용 캔버스를 하늘돔 안쪽 구에 붙이고
  //    가로 offset 스크롤로 바람에 흐르게(물결과 동일 원리: 셰이더·버텍스변형 0, 드로우콜 +1).
  //    돔 텍스처에서 분리했으므로 crossfade는 하늘 배경만, 구름은 자체 opacity로 페이드. ──
  const cloudRadius = (sky.geometry.parameters && sky.geometry.parameters.radius || 520) * 0.94;
  const cloudCanvas = document.createElement('canvas'); cloudCanvas.width = DOME_W; cloudCanvas.height = DOME_H;
  const cloudCtx = cloudCanvas.getContext('2d');
  const cloudTex = track(new THREE.CanvasTexture(cloudCanvas));
  cloudTex.colorSpace = THREE.SRGBColorSpace; cloudTex.wrapS = THREE.RepeatWrapping;
  const cloudMesh = new THREE.Mesh(track(new THREE.SphereGeometry(cloudRadius, 48, 32)),
    track(new THREE.MeshBasicMaterial({ map: cloudTex, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false, fog: false })));
  cloudMesh.renderOrder = -0.95; cloudMesh.visible = false;
  sky.add(cloudMesh);
  const cloudFade = { from: 0, to: 0 }; // crossfade 동안 opacity 보간(하늘 배경과 병렬)

  // ── 반짝이는 별 레이어(감독 지시) — 밝은 별 2세트를 반대 위상 opacity 진동 → 트윙클 ──
  const twkR = (sky.geometry.parameters && sky.geometry.parameters.radius || 520) * 0.97;
  const mkTwk = () => {
    const c = document.createElement('canvas'); c.width = DOME_W; c.height = DOME_H;
    const tex = track(new THREE.CanvasTexture(c)); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(track(new THREE.SphereGeometry(twkR, 40, 24)),
      track(new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })));
    m.renderOrder = -0.92; m.visible = false; sky.add(m);
    return { c, ctx: c.getContext('2d'), tex, mesh: m };
  };
  const twk = [mkTwk(), mkTwk()];
  paintTwinkleStars(twk[0].ctx, twk[1].ctx, DOME_W, DOME_H / 2); // 결정론 1회 페인트
  twk[0].tex.needsUpdate = twk[1].tex.needsUpdate = true;
  let twkBase = 0, twkTarget = 0; // 야간 맑음=1로 lerp, 그 외 0(별 반짝임 페이드)

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
  // 낙하 물리 상태(월드 좌표). 예전에는 이 배열이 그대로 BufferGeometry의 position
  // attribute였으나, 아래 사유로 InstancedMesh로 바뀌면서 순수 상태 배열이 됐다.
  const sPos = new Float32Array(S_COUNT * 3); const sSeed = new Float32Array(S_COUNT);
  { const r = seeded(78); for (let i = 0; i < S_COUNT; i++) { sPos[i * 3] = (r() - 0.5) * RBOX.x; sPos[i * 3 + 1] = r() * RBOX.y; sPos[i * 3 + 2] = (r() - 0.5) * RBOX.z; sSeed[i] = r() * 6.28; } }

  // 원형 스프라이트 — 사각 텍셀 그대로면 눈송이가 네모로 보인다
  const snowSprite = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(16, 16, 16, 0, 7); x.fill();
    const t = track(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();

  // ── 눈은 Points가 아니라 InstancedMesh다 (2026-07-27, 감독 실기기 발견) ──────
  // 예전에는 `THREE.Points` + `PointsMaterial({ size: 0.16 })`이었다. WebGL에서는 잘
  // 보였지만 **WebGPU에서는 눈이 통째로 안 보였다.**
  //
  // 원인은 백엔드 차이다. WGSL에는 `gl_PointSize`에 대응하는 수단이 없고, WebGPU는
  // point-list 토폴로지의 점을 **항상 1픽셀**로 그린다. three의 `PointsNodeMaterial`도
  // `sizeNode`만 볼 뿐 `size`를 읽는 경로가 없다(`materialPointSize` 0건). 즉 0.16이
  // 조용히 무시되어, DPR 3 화면에서 1픽셀 흰 점 = 사실상 안 보이는 상태였다.
  //
  // 비(`LineSegments`)는 선분 자체에 길이가 있어 멀쩡했고, 그래서 "비는 되는데 눈만
  // 안 된다"로 나타났다.
  //
  // 교차 평면인 이유: 주입 API에 camera가 없어 빌보드(카메라를 향해 돌리기)를 만들 수
  // 없다. 평면 2장을 90°로 교차시키면 어느 각도에서 봐도 한쪽이 보인다. 눈송이는
  // 화면에서 몇 픽셀이라 삼각형 4개/입자는 무시할 만하다.
  const snowGeo = track((() => {
    const g = new THREE.BufferGeometry();
    const h = 0.5;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      -h, -h, 0, h, -h, 0, h, h, 0, -h, h, 0,   // XY 평면
      0, -h, -h, 0, -h, h, 0, h, h, 0, h, -h,   // YZ 평면
    ]), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([
      0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1,
    ]), 2));
    g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
    return g;
  })());
  /** 눈송이 한 변(월드 미터). 옛 `size: 0.16`은 화면 픽셀 스케일이라 그대로 못 쓴다. */
  const FLAKE = 0.075;
  // InstancedMesh 자체도 track한다 — Points와 달리 instanceMatrix 버퍼를 소유하므로
  // 지오/재질만 반납하면 그 버퍼가 남는다.
  const snow = track(new THREE.InstancedMesh(snowGeo, track(new THREE.MeshBasicMaterial({
    color: 0xffffff, map: snowSprite, transparent: true, opacity: 0.9,
    depthWrite: false, side: THREE.DoubleSide,
  })), S_COUNT));
  snow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  snow.visible = false; snow.frustumCulled = false; scene.add(snow);
  // 인스턴스 행렬 조립용 재사용 객체 — 매 프레임 700개를 새로 만들지 않는다.
  const _sM = new THREE.Matrix4();
  const _sP = new THREE.Vector3();
  const _sQ = new THREE.Quaternion();
  const _sS = new THREE.Vector3(FLAKE, FLAKE, FLAKE);

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

  // ── 수면 빛반사(글린트) — 달빛 띠·노을 반사·태양 글리터(감독 지시) ──
  // 광원 방위로 뻗는 수면 위 가산합성 띠 1장(드로우콜 +1). 지면(y=0)이 수면(waterY)보다
  // 높아 depth 테스트로 자연 차폐 → 바다·강 수면에서만 보인다. waterY 미주입 시 비활성.
  const GLINT_LEN = 340, GLINT_W = 9; // 수평선(fog 원단)까지 닿는 빛기둥
  let glint = null;
  if (waterY !== null && typeof document !== 'undefined') {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256;
    const gx = c.getContext('2d'); const gr = seeded(4171);
    const img = gx.createImageData(64, 256);
    // 텍스처 v0=플레인 로컬 +z(광원 쪽) — flipY 기본이라 캔버스 하단(yy=255)이 v0.
    // 실제 반사 띠는 광원 아래 수평선 쪽이 가장 밝고 관찰자 근처에서 잔물결로 부서져 소멸한다
    // (반대로 하면 발밑이 밝은 안개처럼 보임 — 실측 적출).
    for (let yy = 0; yy < 256; yy++) {
      const toSrc = yy / 256;                       // 0=관찰자 근경 → 1=광원(수평선) 쪽
      // 중경(10~60m)까지 걸치는 완만한 프로파일 — 원단에만 집중하면 수평선 몇 픽셀로
      // 사라져 기둥이 안 보인다(실측). 원근이 원단 폭을 자연히 좁혀 기둥 형태를 만든다.
      const fall = 0.5 + 0.5 * Math.pow(toSrc, 1.3);
      const nearFade = Math.min(1, yy / 52);        // 발밑 완전 소멸
      const farFade = 1 - Math.max(0, (toSrc - 0.93) / 0.07) * 0.9; // 원단 끝 서서히(끊김 라인 방지)
      const row = 0.3 + gr() * 0.7;                 // 행별 랜덤 세기 — 잔물결에 부서지는 끊김
      for (let xx = 0; xx < 64; xx++) {
        const lat = Math.pow(Math.max(0, 1 - Math.abs(xx - 32) / 30), 1.6); // 중심 밝고 가장자리 소멸
        const i = (yy * 64 + xx) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = 255 * fall * nearFade * farFade * lat * row;
      }
    }
    gx.putImageData(img, 0, 0);
    const gtex = track(new THREE.CanvasTexture(c));
    gtex.wrapT = THREE.RepeatWrapping; // offset.y 스크롤(끊김 무늬 흐름)용
    const ggeo = track(new THREE.PlaneGeometry(GLINT_W, GLINT_LEN));
    ggeo.rotateX(-Math.PI / 2); // 수평(XZ) — 길이축=로컬 z, 텍스처 v=길이 방향
    { // 원단(광원 쪽) 폭 보상 — 원근 축소로 수평선에서 기둥이 소멸하지 않게 사다리꼴화
      const pa = ggeo.attributes.position;
      for (let i = 0; i < pa.count; i++) if (pa.getZ(i) > 0) pa.setX(i, pa.getX(i) * 2.6);
      pa.needsUpdate = true;
    }
    glint = new THREE.Mesh(ggeo, track(new THREE.MeshBasicMaterial({
      map: gtex, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending,
      depthWrite: false, fog: false, color: 0xffffff,
    })));
    // renderOrder 양수 — 바다 평면(transparent, order 0)보다 나중에 그려야 한다.
    // 음수로 먼저 그리면 92% 불투명 수면이 위에 덮여 반사가 안 보인다(실측 적출).
    glint.visible = false; glint.renderOrder = 2;
    scene.add(glint);
  }
  // 시간대별 반사 스타일 — 야간=달빛 은백 띠 / 일몰=노을 금빛 기둥 / 주간=옅은 태양 글리터
  function glintStyle() {
    if (!glint) return;
    glint.visible = state.weather === 'clear'; // 흐림·강수는 반사 없음
    if (!glint.visible) return;
    const conf = state.time === 'night' ? { col: 0xd8e0ee, op: 0.42, len: 1 }
      : state.time === 'sunset' ? { col: 0xffae62, op: 0.62, len: 1.1 }
        : { col: 0xfff3d0, op: 0.3, len: 0.6 };
    glint.material.color.set(conf.col);
    glint.material.opacity = conf.op * (lite ? LITE_GLINT_MUL : 1); // B-2 저사양 축소
    glint.scale.set(1, 1, conf.len);
  }

  // ── 번개 ──────────────────────────────────────────────────────────────────
  // 감독: "번개가 너무너무 짧은 것 같아." 실측상 밝기는 충분했다(hemiI 0.48→2.88,
  // 6배). 문제는 지속과 파형이었다 — 0.3초는 인간 반응속도(0.2~0.3초)와 겹쳐
  // 인지되기 전에 끝나고, 최대/25% 두 계단은 잔광 없이 뚝 끊긴다.
  //
  // 디자이너 재설계(2026-07-27): 총 0.9초 · 3스트로크(강·약·약) + 소강 구간 +
  // 지수 감쇠 꼬리. 실제 번개도 리턴스트로크가 여러 번 오고 첫 번째가 가장 강하다.
  let boltTimer = 8;
  /** 섬광 경과시간(초). **음수면 비활성** — 예전엔 남은시간 카운트다운이었다. */
  let flashT = -1;
  /**
   * 재발동 최소 간격(초). 이 안의 요청은 무시한다.
   *
   * 디자이너 초안은 0.15였다(주섬광을 끝까지 보여주는 최소 보장). 그런데 그 값이면
   * **⚡ 버튼을 연타할 때 주섬광이 0.15초마다 반복되어 초당 6.7회**가 된다 — 단일
   * 스트라이크 내부는 2.2Hz로 안전한데 연타 경로가 그 보호를 무너뜨린다.
   *
   * WCAG의 명멸 상한은 3Hz 미만이므로 0.34초 이상이어야 한다. 여유를 둬 0.40으로
   * 잡았다(2.5Hz). 사람이 누르는 감각으로는 여전히 "즉시"다.
   */
  const BOLT_DEBOUNCE = 0.40;

  /**
   * 광과민성 보호 모드의 강도 계수.
   *
   * 디자이너는 0.22 유지(전체가 세지면 보호도 비례해 세짐)와 0.13(절대 밝기 동결)
   * 두 안을 주고 정책 판단으로 남겼다. **0.13을 택한다** — 강도 델타가 2.4→4.0으로
   * 오르면서 0.22를 그대로 두면 보호 모드 피크가 1.008→1.36으로 **35% 세진다.**
   * 보호를 켠 사람에게 "전보다 밝아졌다"가 되는 것은 그 기능의 계약에 어긋난다.
   * 0.13은 4.0×0.13 ≈ 2.4×0.22가 되도록 역산한 값이다(절대 피크 동결).
   */
  const BOLT_KK_SAFE = 0.13;

  /** 지수 감쇠: k=0에서 a, k=1에서 b 근처. 선형보다 초반이 빠르고 꼬리가 남는다. */
  const decayTo = (a, b, k) => b + (a - b) * Math.exp(-3.5 * k);

  /**
   * 섬광 배수(0~1). 경과시간 t(초)에 대한 파형.
   *
   * `safe`(광과민성 보호)는 **강도만 줄이는 게 아니라 파형을 바꾼다.** 예전에는
   * 깜빡임 패턴을 그대로 두고 진폭만 22%로 낮췄는데, WCAG의 핵심은 "초당 3회 이상
   * 명멸 금지"이지 강도가 아니다. 단봉으로 만들면 깜빡임 자체가 없어져 더 안전하고
   * 더 자연스럽다(디자이너 지적).
   */
  function boltMult(t, safe) {
    if (t < 0) return 0;
    if (safe) {
      if (t < 0.05) return t / 0.05;          // 완만한 상승
      if (t < 0.30) return decayTo(1, 0, (t - 0.05) / 0.25);
      return 0;
    }
    if (t < 0.04) return 1;                                              // 주섬광
    if (t < 0.11) return decayTo(1, 0.12, (t - 0.04) / 0.07);            // 급락
    if (t < 0.17) return 0.12;                                           // 소강
    if (t < 0.21) return 0.12 + (0.80 - 0.12) * ((t - 0.17) / 0.04);     // 2차 상승
    if (t < 0.30) return decayTo(0.80, 0.10, (t - 0.21) / 0.09);         // 2차 감쇠
    if (t < 0.37) return 0.10;                                           // 소강
    if (t < 0.40) return 0.10 + (0.45 - 0.10) * ((t - 0.37) / 0.03);     // 3차 상승
    if (t < 0.55) return decayTo(0.45, 0.06, (t - 0.40) / 0.15);         // 3차 감쇠
    if (t < 0.90) return 0.06 * (1 - (t - 0.55) / 0.35);                 // 산란 잔광
    return 0;
  }
  const boltDur = (safe) => (safe ? 0.30 : 0.90);

  /** 실제 발동. 디바운스에 걸리면 false. */
  function strike() {
    if (flashT >= 0 && flashT < BOLT_DEBOUNCE) return false;
    flashT = 0;
    synthThunder(0.8 + Math.random() * 2.2);
    return true;
  }
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

  // ── B-2 저사양 오버드로우 축소 API ──
  // 강수는 draw-range로 그리는 입자 수를 줄인다(물리 풀·버퍼는 전체 유지 — update는 전 입자를
  // 계속 굴려 lite 해제 시 즉시 정상 복원). 보조 투명 레이어(오로라·빛기둥·반짝이 별)는 opacity만
  // 낮춘다. 반환값은 검증·계측용 스냅샷(draw-range·opacity 실측).
  function applyPrecipDrawRange() {
    // 비: LineSegments(선분당 2정점) — 앞쪽 N선분만 그린다(짝수 정점 보장).
    const rSeg = lite ? Math.floor(R_COUNT * LITE_PRECIP_MUL) : R_COUNT;
    rainGeo.setDrawRange(0, rSeg * 2);
    // 눈: InstancedMesh — 그리는 인스턴스 수를 줄인다(버퍼·물리는 전체 유지).
    snow.count = lite ? Math.floor(S_COUNT * LITE_PRECIP_MUL) : S_COUNT;
  }
  function liteSnapshot() {
    return {
      lite,
      rainDraw: rainGeo.drawRange.count, rainMax: R_COUNT * 2,
      snowDraw: snow.count, snowMax: S_COUNT,
      auroraOpacity: auroras[0].material.opacity,
      glintMul: lite ? LITE_GLINT_MUL : 1,
      twkMul: lite ? LITE_TWK_MUL : 1,
    };
  }
  function setLite(on) {
    on = !!on;
    if (on === lite) return liteSnapshot(); // idempotent
    lite = on;
    applyPrecipDrawRange();
    // 오로라 — 기준 opacity에 배수 적용(update가 opacity를 안 건드리므로 여기서 확정·복원).
    for (const a of auroras) a.material.opacity = AUR_BASE_OPACITY * (lite ? LITE_AUR_MUL : 1);
    glintStyle(); // 빛기둥 — lite 배수 반영해 재적용
    // 흐르는 구름 — lite 상태를 visible에 즉시 반영(크로스페이드 중이라도 boolean visible만 갱신 —
    // opacity 보간은 update가 계속 담당하므로 무해). phase!==1로 가드하면 크로스페이드 중 lite 해제가
    // 완료 분기(update)의 비대칭 때문에 구름이 영구 은닉되던 회귀(교차리뷰 블로커)라 무조건 반영으로 차단.
    cloudMesh.visible = cloudFade.to > 0 && !lite;
    // 반짝이 별(twk 2겹 AdditiveBlending 풀돔) — 구름과 동일 게이트로 lite 시 visible=false로 숨겨
    // 실제 fill을 던다(opacity 배수만으론 픽셀 셰이딩·블렌딩 비용이 그대로 남는다). 해제 시 want 상태로 복원.
    const twkVis = (twkTarget > 0 || twkBase > 0.01) && !lite;
    for (const w of twk) w.mesh.visible = twkVis;
    return liteSnapshot();
  }

  let phase = 0; // 크로스페이드 진행(0=없음)
  function set(s = {}, o = {}) {
    const n = normalize(s);
    const changedDome = n.time !== state.time || n.weather !== state.weather;
    state.time = n.time; state.weather = n.weather; state.fx = n.fx;
    if (typeof s.flashSafe === 'boolean') state.flashSafe = s.flashSafe;
    const L = LIGHT[state.time][state.weather];
    const fade = (o.fade === undefined ? 1.8 : o.fade) * (soft ? 0 : 1); // 저사양은 스냅
    const pOpts = { soft, lowRes: false }; // 돔 2048 고정(위 주석) — 저해상 별 경로 사용 안 함
    if (changedDome && fade > 0) {
      paintSky(domeB.ctx, DOME_W, DOME_H, state.time, state.weather, pOpts);
      domeB.tex.needsUpdate = true;
      fadeDome.material.map = domeB.tex; fadeDome.material.opacity = 0; fadeDome.visible = true;
      lerpState.from = { ...cur, sun: cur.sun.clone(), hemiS: cur.hemiS.clone(), hemiG: cur.hemiG.clone(), fog: cur.fog.clone() };
      lerpState.to = asVec(L); lerpState.t = 0; lerpState.dur = fade;
      phase = 1;
    } else {
      paintSky(domeA.ctx, DOME_W, DOME_H, state.time, state.weather, pOpts);
      domeA.tex.needsUpdate = true;
      Object.assign(cur, asVec(L)); applyLighting(cur);
      lerpState.t = 1; phase = 0;
    }
    rain.visible = state.weather === 'rain';
    snow.visible = state.weather === 'snow';
    rainbowGrp.visible = !!state.fx.rainbow;
    for (const a of auroras) a.visible = !!state.fx.aurora;
    boltTimer = 6 + Math.random() * 8;
    glintStyle(); // 수면 빛반사 — 시간대·날씨에 맞는 색·강도로

    // 흐르는 구름 레이어 — 맑은 낮/일몰만. 시간대 바뀌면 재페인트(시드 고정→형태 유지·톤만 변경).
    const wantCloud = state.weather === 'clear' && state.time !== 'night';
    // [B-2 오버드로우 축소 — 팀장 재판정/부팀장] lite(저사양 위기)에선 구름을 숨긴다(visible=false).
    // opacity 배수는 alpha-blend fill을 못 줄이지만(픽셀은 그대로 셰이딩·블렌딩) visible=false는 이 대형
    // 상반부 레이어를 아예 안 그려 실제 fill을 던다. 위기 한정이라 평상시 룩 무영향, 해제 시 setLite가 복원.
    if (wantCloud) { paintClearClouds(cloudCtx, DOME_W, DOME_H / 2, state.time, soft); cloudTex.needsUpdate = true; cloudMesh.visible = !lite; }
    cloudFade.from = cloudMesh.material.opacity;
    cloudFade.to = wantCloud ? 1 : 0;
    if (phase !== 1) { cloudMesh.material.opacity = cloudFade.to; cloudMesh.visible = cloudFade.to > 0 && !lite; }

    // 별 반짝임 — 야간 맑음만. update가 twkBase를 목표로 부드럽게 올리고 opacity를 진동시킨다.
    const wantTwk = state.time === 'night' && state.weather === 'clear';
    twkTarget = wantTwk ? 1 : 0;
    for (const w of twk) w.mesh.visible = (wantTwk || twkBase > 0.01) && !lite; // lite 시 별 레이어 숨김(구름과 동형 게이트)
    if (soft) twkBase = twkTarget; // 저사양은 스냅
    if (onApply) { try { onApply(get(), L); } catch (_) {} } // ⑩ 가로등·창·envMap 연동 훅
    return get();
  }
  // `xfade`: 돔 크로스페이드가 진행 중인가(0=없음, 1=진행).
  //
  // 왜 노출하는가 — `set()`이 불리는 즉시 `state.time`/`state.weather`는 새 값이 되지만,
  // **실제로 그려지는 것**은 최대 1.8초 동안 다르다. 그 사이 `fadeDome`이 하나 더 그려지고,
  // `cloudMesh.visible` 갱신은 `phase !== 1` 가드로 멈춰 있어 이전 상태의 구름이 남는다.
  // 즉 "논리적 상태"와 "그려지는 것"이 어긋나는 유일한 구간이다.
  //
  // 소비자(world2 성능 리포트)가 드로우콜을 하늘 상태별로 판정하는데, 이 구간을 구별하지
  // 못하면 하늘을 바꿀 때마다 오탐이 난다. 순수 가산 필드이므로 기존 소비자는 영향 없다.
  const get = () => ({
    time: state.time, weather: state.weather, fx: Object.assign({}, state.fx),
    flashSafe: state.flashSafe, xfade: phase === 1,
  });

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
      cloudMesh.material.opacity = cloudFade.from + (cloudFade.to - cloudFade.from) * k; // 구름 페이드 동조
      if (lerpState.t >= 1) { // 스왑: B를 주 돔으로
        domeA.ctx.drawImage(domeB.c, 0, 0);
        domeA.tex.needsUpdate = true;
        fadeDome.visible = false; fadeDome.material.opacity = 0;
        cloudMesh.visible = cloudFade.to > 0 && !lite; // 완료 시 visible 확정(대칭) — 구름 있어야 하고 lite 아니면 표시, 아니면 숨김. 복원 분기 부재로 크로스페이드 중 lite 해제 시 영구 은닉되던 회귀 차단(교차리뷰 블로커)
        phase = 0;
      }
    }
    // 흐르는 구름 — 가로 offset 스크롤(바람). 셰이더·버텍스변형 0. soft도 스크롤은 무료(offset만).
    if (cloudMesh.visible) cloudTex.offset.x = (cloudTex.offset.x + 0.006 * dt) % 1;
    // 별 반짝임 — 두 레이어 반대 위상 진동(다른 속도로 어긋나 자연스러운 트윙클). 항상 일부는 밝다.
    twkBase += (twkTarget - twkBase) * Math.min(1, 3 * dt);
    if (twk[0].mesh.visible) {
      const twkMul = lite ? LITE_TWK_MUL : 1; // B-2 저사양 축소(진동 파형·색은 유지, 세기만 하향)
      twk[0].mesh.material.opacity = twkBase * (0.22 + 0.78 * (0.5 + 0.5 * Math.sin(t * 1.7))) * twkMul;
      twk[1].mesh.material.opacity = twkBase * (0.22 + 0.78 * (0.5 + 0.5 * Math.sin(t * 2.3 + 2.4))) * twkMul;
      if (twkBase < 0.01 && twkTarget === 0) for (const w of twk) w.mesh.visible = false;
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
      const arr = sPos;
      const fall = 2.1 * dt * state.precip;
      // 물리는 전 입자를 굴린다(lite로 그리는 수를 줄여도 해제 시 즉시 정상 복원).
      for (let i = 0; i < S_COUNT; i++) {
        arr[i * 3 + 1] -= fall;
        arr[i * 3] += Math.sin(t * 1.3 + sSeed[i]) * dt * 0.5;
        if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] += RBOX.y;
      }
      // 그리는 수만 인스턴스 행렬에 반영한다(snow.count = draw-range 대응).
      for (let i = 0; i < snow.count; i++) {
        _sP.set(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]);
        _sM.compose(_sP, _sQ, _sS);
        snow.setMatrixAt(i, _sM);
      }
      snow.instanceMatrix.needsUpdate = true;
      snow.position.set(pos.x, 0, pos.z);
    }
    // 수면 빛반사 — 광원(밤=달) 방위로 관찰자 앞에 뻗는 띠. 잔물결 스크롤과 동조해 흐르는 느낌.
    if (glint && glint.visible) {
      const az = azWorld(LIGHT[state.time][state.weather].moon ? MOON_AZ : SUN_AZ);
      const halfL = GLINT_LEN * glint.scale.z * 0.5;
      glint.position.set(pos.x + Math.sin(az) * (halfL - 6), waterY + 0.05, pos.z + Math.cos(az) * (halfL - 6));
      glint.rotation.y = az;
      glint.material.map.offset.y = (t * 0.014) % 1; // 띠 위 끊김 무늬가 천천히 흐름
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
      if (boltTimer <= 0) { boltTimer = 7 + Math.random() * 14; strike(); }
    }
    // 섬광 진행은 **날씨 밖에서** 마무리한다. 예전에는 이 블록이 `weather==='rain'`
    // 안에 있어서, 섬광 도중 비를 끄면 조명이 밝아진 채로 굳었다(복구 코드도 같은
    // 블록 안이라 도달하지 못했다). 진행 중인 연출은 끝까지 자기 손으로 꺼야 한다.
    if (flashT >= 0) {
      flashT += dt;
      const safe = state.flashSafe;
      const kk = safe ? BOLT_KK_SAFE : 1.0;
      const e = boltMult(flashT, safe) * kk; // 공통 봉투(강도·색·하늘이 같은 곡선을 쓴다)
      hemi.intensity = cur.hemiI + 4.0 * e;
      sun.intensity = cur.sunI + 1.6 * e;
      // ── 색도 흰색으로 당긴다 (디자이너 진단 2026-07-27) ────────────────────
      // 강도만 올리면 "번쩍"이 안 된다. 야간 비의 빛 색이 이미 어둡기 때문이다
      // (hemiG = 0x191d1a, 거의 검정). 그 색에 intensity만 곱하면 결과는 **야간
      // 팔레트 안에서 조금 밝아진 회색**에 머물고, 화면이 "번쩍"으로 인식하는
      // 흰색 클립존까지 못 간다. 하늘이 2.3배로도 확 튀는 건 MeshBasicMaterial이라
      // PBR 감쇠를 안 거치고 색을 곧장 배수하기 때문이다 — 그래서 배수를 더 올리는
      // 것만으로는 지상이 영영 하늘을 못 따라잡는다.
      //
      // 65%만 섞는다. 순백으로 밀면 야간 색조가 한 프레임 통째로 사라져 "다른 씬으로
      // 순간이동"한 것처럼 튄다.
      const w = safe ? 0 : 0.65 * e; // 보호 모드는 색을 건드리지 않는다(색조 유지가 곧 보호)
      hemi.color.copy(cur.hemiS).lerp(WHITE, w);
      hemi.groundColor.copy(cur.hemiG).lerp(WHITE, w);
      sun.color.copy(cur.sun).lerp(WHITE, w);
      // 하늘도 함께 밝힌다. 스카이돔은 MeshBasicMaterial이라 조명을 안 받으므로,
      // 이걸 안 하면 하늘을 올려다보는 동안에는 번개가 쳐도 **아무 일도 일어나지
      // 않는다** — 감독이 "불빛이 안 보인다"고 한 것이 그 상태였다.
      // 새 메시·재질을 만들지 않고 기존 재질의 color만 쓴다(개수 불변식).
      const boost = 1 + 1.5 * e;
      sky.material.color.setScalar(boost);
      // 크로스페이드 중에는 fadeDome이 위에 겹쳐 있다. 함께 밝히지 않으면 날씨
      // 전환 도중에만 하늘 섬광이 안 먹는다(디자이너 지적).
      if (fadeDome.visible) fadeDome.material.color.setScalar(boost);
      if (flashT >= boltDur(safe)) {
        flashT = -1;
        // **색까지 되돌린다.** intensity만 복원하면 야간 톤이 흰색에 물든 채 고착된다
        // — 평상시에는 applyLighting()이 다시 불리지 않으므로 아무도 되돌려주지 않는다.
        hemi.intensity = cur.hemiI; sun.intensity = cur.sunI;
        hemi.color.copy(cur.hemiS);
        hemi.groundColor.copy(cur.hemiG);
        sun.color.copy(cur.sun);
        sky.material.color.setScalar(1);
        fadeDome.material.color.setScalar(1);
      }
    }
  }

  function dispose() {
    scene.remove(rain); scene.remove(snow); scene.remove(rainbowGrp); for (const a of auroras) scene.remove(a);
    if (glint) scene.remove(glint);
    sky.remove(cloudMesh);
    for (const w of twk) sky.remove(w.mesh);
    sky.remove(fadeDome);
    for (const o of disposables) { try { o.dispose(); } catch (_) {} }
  }

  set({ time: 'day', weather: 'clear' }, { fade: 0 });
  /**
   * 번개를 즉시 친다(비일 때만).
   *
   * 자동 발동은 첫 8초 + 이후 7~21초 간격이라 **평균 13~20초에 한 번**이다(헤드리스
   * 40초 실측: 섬광 2~3회). 게다가 섬광은 0.3초이고 조명 강도만 올리므로 하늘을
   * 보고 있으면 아무 일도 없는 것처럼 보인다 — 감독이 "천둥 불빛이 안 보인다"고 한
   * 것이 그 조합이었다. 코드는 정상이었고(hemiI 0.48→2.88 실측) **확인이 불가능한
   * 설계**였던 것이다.
   *
   * 그래서 즉시 트리거를 연다. 진단 수단이자 연출 도구다.
   */
  function bolt() {
    if (state.weather !== 'rain') return false;
    return strike(); // 디바운스도 함께 적용된다
  }

  return { set, get, update, getSunDir, setLite, bolt, dispose, SKY_TIMES, SKY_WEATHERS };
}

/** 방문자 실제 시각 → 시간대 자동 매핑(신 모드 '자동' 버튼용) */
export function autoTimeOfDay(d = new Date()) {
  const h = d.getHours();
  if (h >= 7 && h < 17) return 'day';
  if ((h >= 17 && h < 20) || (h >= 5 && h < 7)) return 'sunset';
  return 'night';
}
