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
    clear:    { sun: 0xfff2dc, sunI: 0.95, hemiS: 0xcfe4f7, hemiG: 0x8fa385, hemiI: 1.0,  fog: 0xe9eef2, sunEl: 0.62 },
    overcast: { sun: 0xdfe3e8, sunI: 0.35, hemiS: 0xb9c2cc, hemiG: 0x7d8578, hemiI: 0.9,  fog: 0xc3cad2, sunEl: 0.62 },
    rain:     { sun: 0xc9d2dc, sunI: 0.25, hemiS: 0x9fa9b5, hemiG: 0x6d7570, hemiI: 0.85, fog: 0xa7b0ba, sunEl: 0.62 },
    snow:     { sun: 0xe8ecf2, sunI: 0.4,  hemiS: 0xcdd6e0, hemiG: 0x9aa39c, hemiI: 0.95, fog: 0xd4dbe3, sunEl: 0.62 },
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

// 뭉게구름 클러스터 — ③ 2패스 음영: 회색 하부 퍼프(평탄 밑면) 먼저, 밝은 상부 퍼프 나중.
// u=0/1 경계에서 잘리지 않도록 wrap 3회 그리기(초기 1회 페인트라 비용 무시 가능).
function cumulus(ctx, rnd, W, cx, cy, s, tint, shade) {
  const baseY = cy + s * 0.34; // 평탄한 밑면 기준선
  const puffs = [];
  for (let p = 0; p < 14; p++) {
    const px = cx + (rnd() - 0.5) * s * 2.8;
    const py = Math.min(baseY, cy + (rnd() - 0.5) * s * 0.9);
    puffs.push([px, py, s * (0.34 + rnd() * 0.6)]);
  }
  for (const ox of [-W, 0, W]) {
    for (const [px, py, rr] of puffs) { // 하부 음영(살짝 아래로)
      const g = ctx.createRadialGradient(px + ox, py + rr * 0.35, 0, px + ox, py + rr * 0.35, rr);
      g.addColorStop(0, `rgba(${shade.join(',')},0.20)`); g.addColorStop(1, `rgba(${shade.join(',')},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px + ox, py + rr * 0.35, rr, 0, 7); ctx.fill();
    }
    for (const [px, py, rr] of puffs) { // 상부 하이라이트(살짝 위로·작게)
      const g = ctx.createRadialGradient(px + ox, py - rr * 0.22, 0, px + ox, py - rr * 0.22, rr * 0.92);
      g.addColorStop(0, `rgba(${tint.join(',')},0.30)`); g.addColorStop(0.6, `rgba(${tint.join(',')},0.14)`); g.addColorStop(1, `rgba(${tint.join(',')},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px + ox, py - rr * 0.22, rr * 0.92, 0, 7); ctx.fill();
    }
  }
}

// ② 밴딩 파괴 디더링 — 미세 모노 노이즈를 낮은 알파로 1패스(저사양은 스킵).
function dither(ctx, rnd, W, H) {
  const img = ctx.getImageData(0, 0, W, H); const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = ((rnd() * 8) | 0) - 4; // ±4
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
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

  // 1) 베이스 수직 그라디언트(천정→지평) + 하반부 fog색
  const grd = ctx.createLinearGradient(0, 0, 0, Hh);
  if (cloudy) {
    const snowTop = { day: [168, 176, 186], sunset: [172, 150, 136], night: [40, 46, 58] };
    const k = weather === 'rain' ? 0.8 : 1.0;
    const top = weather === 'snow' ? snowTop[time]
      : time === 'night' ? [22, 26, 36] : time === 'sunset' ? [110, 96, 88] : [118, 128, 140];
    grd.addColorStop(0, `rgb(${top.map((v) => (v * k) | 0).join(',')})`);
    grd.addColorStop(0.62, `rgb(${top.map((v) => (v * k * 1.22) | 0).join(',')})`);
    grd.addColorStop(1, horizon);
  } else if (time === 'day') {
    grd.addColorStop(0, '#3f86c8'); grd.addColorStop(0.5, '#8fbce2'); grd.addColorStop(0.82, '#cfe2ef'); grd.addColorStop(1, horizon);
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
    const sy = Hh * (1 - L.sunEl);
    glowWrapped(ctx, W, sunX, sy, Hh * 0.7, glowStops([255, 252, 240], [255, 248, 220], 0.85, 3.2));
    const sr = Hh * 0.04;
    ctx.fillStyle = 'rgba(255,253,244,0.98)'; ctx.beginPath(); ctx.arc(sunX, sy, sr, 0, 7); ctx.fill();
  }

  // 3) 밤하늘 ④ — 별밭·은하수(암흑대)·광망 별·달(크레이터+위상)
  if (time === 'night' && !cloudy) {
    for (let i = 0; i < 1300; i++) { // 별밭 — 지평선 근처 희박
      const x = rnd() * W, y = Math.pow(rnd(), 1.7) * Hh * 0.92;
      const a = 0.2 + rnd() * 0.75, r = rnd() < 0.05 ? 1.7 : 0.6 + rnd() * 0.6;
      ctx.fillStyle = `rgba(${215 + (rnd() * 40 | 0)},${218 + (rnd() * 34 | 0)},255,${a.toFixed(2)})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    // 은하수 밴드(대각) — 웜 코어/쿨 엣지 + 암흑대 균열
    ctx.save();
    ctx.translate(W * 0.5, Hh * 0.66); ctx.rotate(-0.42);
    for (let i = 0; i < 900; i++) { // 성운 얼룩 — 작고 많게(큰 반경은 흐린 보케 원반처럼 보인다)
      const bx = (rnd() - 0.5) * W * 1.35;
      const by = (rnd() - 0.5) * Hh * 0.34 * (1 + Math.cos((bx / W) * 3.1) * 0.45);
      const rr = 4 + rnd() * 13, aa = 0.014 + rnd() * 0.032;
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
    // 광망 별 — 밝은 별 소수: 글로우 + 십자 스파이크
    for (let i = 0; i < 7; i++) {
      const x = rnd() * W, y = Math.pow(rnd(), 1.4) * Hh * 0.75;
      const g4 = ctx.createRadialGradient(x, y, 0, x, y, 7);
      g4.addColorStop(0, 'rgba(255,255,255,0.95)'); g4.addColorStop(0.3, 'rgba(230,235,255,0.4)'); g4.addColorStop(1, 'rgba(230,235,255,0)');
      ctx.fillStyle = g4; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(240,244,255,0.55)'; ctx.lineWidth = 0.8;
      const s = 6 + rnd() * 5;
      ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
    }
    // 달 ④ — 원반 + 크레이터 + 위상 터미네이터 + 넓은 글로우
    const mx = MOON_AZ * W, my = Hh * 0.46, mr = Hh * 0.055;
    glowWrapped(ctx, W, mx, my, mr * 5, glowStops([226, 232, 224], [226, 232, 224], 0.3, 2.2));
    ctx.fillStyle = 'rgba(236,239,232,0.96)'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, 7); ctx.fill();
    for (let i = 0; i < 8; i++) { // 크레이터(달면 안쪽 어두운 얼룩)
      const a = rnd() * 6.28, dd = rnd() * mr * 0.66, cr = mr * (0.08 + rnd() * 0.16);
      ctx.fillStyle = `rgba(190,196,188,${0.35 + rnd() * 0.25})`;
      ctx.beginPath(); ctx.arc(mx + Math.cos(a) * dd, my + Math.sin(a) * dd, cr, 0, 7); ctx.fill();
    }
    ctx.save(); // 위상 — 한쪽 가장자리를 살짝 덮는 터미네이터(과하면 잘린 원판처럼 보인다)
    ctx.beginPath(); ctx.arc(mx, my, mr + 0.5, 0, 7); ctx.clip();
    ctx.fillStyle = 'rgba(10,14,26,0.62)';
    ctx.beginPath(); ctx.arc(mx - mr * 1.25, my, mr * 1.06, 0, 7); ctx.fill();
    ctx.restore();
  }

  // 4) 구름 ③ — 맑음: 뭉게구름 + 원경 층운
  if (!cloudy && time !== 'night') {
    const tint = time === 'sunset' ? [255, 210, 172] : [255, 255, 255];
    const shade = time === 'sunset' ? [150, 110, 120] : [148, 162, 178];
    for (let c = 0; c < 6; c++) cumulus(ctx, rnd, W, rnd() * W, Hh * (0.3 + rnd() * 0.42), 20 + rnd() * 40, tint, shade);
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
    // ③ 구름층 — 층 밴드 구조(수평 밴드 + 어두운 밑면 + 밝은 틈). 눈구름은 밝고 부드럽게.
    const snowy = weather === 'snow';
    for (let b = 0; b < 5; b++) {
      const bandY = Hh * (0.12 + b * 0.2), th = Hh * (0.1 + rnd() * 0.08);
      for (let i = 0; i < 26; i++) {
        const x = rnd() * W, y = bandY + (rnd() - 0.3) * th, rr = 26 + rnd() * 60;
        const dark = rnd() < (snowy ? 0.35 : 0.6);
        const col = dark ? [24, 28, 36] : (snowy ? [236, 240, 246] : [215, 222, 230]);
        const a0 = dark ? (snowy ? 0.11 : 0.16) : (snowy ? 0.08 : 0.09);
        // 그라디언트 중심 = 원 중심(어긋나면 하드엣지 원반) + u경계 wrap 3회
        for (const ox of [-W, 0, W]) {
          const g = ctx.createRadialGradient(x + ox, y, 0, x + ox, y, rr);
          g.addColorStop(0, `rgba(${col.join(',')},${a0})`); g.addColorStop(0.55, `rgba(${col.join(',')},${(a0 * 0.55).toFixed(3)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + ox, y, rr, 0, 7); ctx.fill();
        }
      }
    }
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
    if (changedDome && fade > 0) {
      paintSky(domeB.ctx, DOME_W, DOME_H, state.time, state.weather, { soft });
      domeB.tex.needsUpdate = true;
      fadeDome.material.map = domeB.tex; fadeDome.material.opacity = 0; fadeDome.visible = true;
      lerpState.from = { ...cur, sun: cur.sun.clone(), hemiS: cur.hemiS.clone(), hemiG: cur.hemiG.clone(), fog: cur.fog.clone() };
      lerpState.to = asVec(L); lerpState.t = 0; lerpState.dur = fade;
      phase = 1;
    } else {
      paintSky(domeA.ctx, DOME_W, DOME_H, state.time, state.weather, { soft });
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
