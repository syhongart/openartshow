// sky.js — 오픈월드 하늘 연출 시스템 (감독 신 모드 · behind 오픈월드 전용)
// -----------------------------------------------------------------------------
// 감독 기획: "야간엔 은하수+도시 야경, 주간엔 파란 하늘·흰 구름, 일몰 분위기, 눈·먹구름·
// 무지개·천둥번개·오로라 — 실제 서비스는 내가 신으로 선택해서 조정." 전부 절차 생성
// (외부 이미지·오디오 파일 0 — 캔버스 리페인트 + 조명 테이블 + Points 입자 + WebAudio 합성).
//
// 아키텍처: world.js가 소유한 씬 객체(sun·hemi·fog·skyDome·renderer)를 주입받아 제어하는
// 독립 완결 모듈. world.js 접점은 생성·update(dt)·dispose 3곳뿐(가산 배선).
//
//   createSkySystem({ scene, renderer, sun, hemi, sky, getPos, soft, onFlash })
//     → { set({time, weather, fx}), get(), update(dt), dispose, PRESETS }
//
// 조합 보정(감독이 뭘 눌러도 어색하지 않게):
//   무지개 = 야간 금지·강수(비/눈) 중 금지(갠 하늘 연출) / 오로라 = 야간+맑음·먹구름아님만
//   은하수·별 = 야간+맑음만(먹구름이면 가림) / 번개 = 비(뇌우 모드)만
// 저사양(soft): 입자 수 1/3, 번개 플래시 완화, 오로라 세그먼트 축소.
// -----------------------------------------------------------------------------
import * as THREE from 'three';

export const SKY_TIMES = ['day', 'sunset', 'night'];
export const SKY_WEATHERS = ['clear', 'overcast', 'rain', 'snow'];

// 시간대×날씨 → 조명·안개 테이블 (태양색, 태양강도, 헤미하늘, 헤미지면, 헤미강도, fog색, 배경색)
const LIGHT = {
  day: {
    clear: { sun: 0xfff2dc, sunI: 0.95, hemiS: 0xcfe4f7, hemiG: 0x8fa385, hemiI: 1.0, fog: 0xcfe0ee },
    overcast: { sun: 0xdfe3e8, sunI: 0.35, hemiS: 0xb9c2cc, hemiG: 0x7d8578, hemiI: 0.9, fog: 0xb6bec8 },
    rain: { sun: 0xc9d2dc, sunI: 0.25, hemiS: 0x9fa9b5, hemiG: 0x6d7570, hemiI: 0.85, fog: 0x9aa4b0 },
    snow: { sun: 0xe8ecf2, sunI: 0.4, hemiS: 0xcdd6e0, hemiG: 0x9aa39c, hemiI: 0.95, fog: 0xc5cdd8 },
  },
  sunset: {
    clear: { sun: 0xffb37a, sunI: 0.85, hemiS: 0xe8b48a, hemiG: 0x7a6a58, hemiI: 0.85, fog: 0xe2b490 },
    overcast: { sun: 0xc9a284, sunI: 0.3, hemiS: 0xa8968a, hemiG: 0x6d635a, hemiI: 0.8, fog: 0xa8968c },
    rain: { sun: 0xb08a74, sunI: 0.22, hemiS: 0x8d7f76, hemiG: 0x5d554e, hemiI: 0.75, fog: 0x8d7f78 },
    snow: { sun: 0xd8b49a, sunI: 0.35, hemiS: 0xc0aa9a, hemiG: 0x847a6e, hemiI: 0.85, fog: 0xc4ad9c },
  },
  night: {
    clear: { sun: 0x9fb4d8, sunI: 0.22, hemiS: 0x39445c, hemiG: 0x232a24, hemiI: 0.55, fog: 0x232b3d },
    overcast: { sun: 0x6d7890, sunI: 0.12, hemiS: 0x2c3340, hemiG: 0x1d211d, hemiI: 0.5, fog: 0x1d2330 },
    rain: { sun: 0x5d6880, sunI: 0.1, hemiS: 0x272d3a, hemiG: 0x191d1a, hemiI: 0.48, fog: 0x181e2a },
    snow: { sun: 0x8894b0, sunI: 0.16, hemiS: 0x333b4c, hemiG: 0x242923, hemiI: 0.55, fog: 0x252c3c },
  },
};

const seeded = (s0) => { let s = s0 | 0; return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// ── 하늘돔 캔버스 리페인트 — 시간대·날씨별 절차 드로잉(그라디언트+구름 퍼프+별밭+은하수) ──
function paintSky(ctx, W, H, time, weather) {
  const rnd = seeded(0xa17c + SKY_TIMES.indexOf(time) * 7 + SKY_WEATHERS.indexOf(weather) * 31);
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  if (weather === 'overcast' || weather === 'rain') {
    // 먹구름 — 회색 층(비면 더 어둡게)
    const k = weather === 'rain' ? 0.82 : 1.0;
    const top = time === 'night' ? [24, 28, 38] : time === 'sunset' ? [122, 106, 96] : [128, 138, 150];
    grd.addColorStop(0, `rgb(${top.map((v) => (v * k) | 0).join(',')})`);
    grd.addColorStop(0.7, `rgb(${top.map((v) => (v * k * 1.25) | 0).join(',')})`);
    grd.addColorStop(1, `rgb(${top.map((v) => (v * k * 1.4) | 0).join(',')})`);
  } else if (time === 'day') {
    grd.addColorStop(0, '#4a90d0'); grd.addColorStop(0.55, '#a8cbe8'); grd.addColorStop(0.85, '#dbe8f2'); grd.addColorStop(1, '#e9eef2');
  } else if (time === 'sunset') {
    grd.addColorStop(0, '#3a4a78'); grd.addColorStop(0.42, '#8a6a9c'); grd.addColorStop(0.66, '#e08a5a'); grd.addColorStop(0.85, '#ffb36a'); grd.addColorStop(1, '#ffd9a0');
  } else { // night clear/snow
    grd.addColorStop(0, '#0a0e1e'); grd.addColorStop(0.6, '#1a2138'); grd.addColorStop(0.9, '#2c3752'); grd.addColorStop(1, '#3a4560');
  }
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

  const cloudy = weather === 'overcast' || weather === 'rain';
  if (time === 'night' && !cloudy) {
    // 별밭 — 밝기·크기 분포. 지평선 근처는 희박하게.
    for (let i = 0; i < 900; i++) {
      const x = rnd() * W, y = Math.pow(rnd(), 1.6) * H * 0.85;
      const a = 0.25 + rnd() * 0.75, r = rnd() < 0.06 ? 1.6 : 0.7 + rnd() * 0.5;
      ctx.fillStyle = `rgba(${220 + (rnd() * 35 | 0)},${222 + (rnd() * 30 | 0)},255,${a.toFixed(2)})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    // 은하수 — 대각 밴드: 뿌연 코어 + 성운 얼룩 + 미세 별 고밀도
    ctx.save();
    ctx.translate(W / 2, H * 0.38); ctx.rotate(-0.5);
    for (let i = 0; i < 260; i++) {
      const bx = (rnd() - 0.5) * W * 1.3, by = (rnd() - 0.5) * H * 0.16 * (1 + Math.cos(bx / W * 3) * 0.4);
      const rr = 6 + rnd() * 26, aa = 0.012 + rnd() * 0.03;
      const g2 = ctx.createRadialGradient(bx, by, 0, bx, by, rr);
      const hue = rnd() < 0.2 ? '190,170,220' : rnd() < 0.5 ? '200,205,235' : '225,228,245';
      g2.addColorStop(0, `rgba(${hue},${aa * 2})`); g2.addColorStop(1, `rgba(${hue},0)`);
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(bx, by, rr, 0, 7); ctx.fill();
    }
    for (let i = 0; i < 700; i++) { // 밴드 내부 미세 별
      const bx = (rnd() - 0.5) * W * 1.2, by = (rnd() - 0.5) * H * 0.13;
      ctx.fillStyle = `rgba(235,238,255,${0.12 + rnd() * 0.4})`;
      ctx.fillRect(bx, by, 1, 1);
    }
    ctx.restore();
    // 달 — 부드러운 글로우 원반
    const mx = W * 0.72, my = H * 0.2;
    const mg = ctx.createRadialGradient(mx, my, 2, mx, my, 26);
    mg.addColorStop(0, 'rgba(240,242,235,0.95)'); mg.addColorStop(0.35, 'rgba(230,234,228,0.5)'); mg.addColorStop(1, 'rgba(230,234,228,0)');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, 26, 0, 7); ctx.fill();
  }
  if (time !== 'night' && !cloudy) {
    // 뭉게구름(주간) / 노을 구름(일몰) — 퍼프(반투명 원) 겹침 클러스터
    const tint = time === 'sunset' ? [255, 214, 178] : [255, 255, 255];
    const n = weather === 'snow' ? 10 : 7;
    for (let c = 0; c < n; c++) {
      const cx = rnd() * W, cy = H * (0.18 + rnd() * 0.3), s = 22 + rnd() * 42;
      for (let p = 0; p < 12; p++) {
        const px = cx + (rnd() - 0.5) * s * 2.6, py = cy + (rnd() - 0.5) * s * 0.8;
        const rr = s * (0.4 + rnd() * 0.7);
        const cg = ctx.createRadialGradient(px, py, 0, px, py, rr);
        cg.addColorStop(0, `rgba(${tint.join(',')},${0.16 + rnd() * 0.12})`); cg.addColorStop(1, `rgba(${tint.join(',')},0)`);
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(px, py, rr, 0, 7); ctx.fill();
      }
    }
  }
  if (cloudy) {
    // 먹구름 질감 — 어두운/밝은 얼룩 겹침(낮게 깔린 비구름 느낌)
    for (let i = 0; i < 60; i++) {
      const x = rnd() * W, y = rnd() * H * 0.7, rr = 30 + rnd() * 70;
      const dark = rnd() < 0.55;
      const cg = ctx.createRadialGradient(x, y, 0, x, y, rr);
      cg.addColorStop(0, dark ? 'rgba(30,34,42,0.13)' : 'rgba(210,216,224,0.08)');
      cg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill();
    }
  }
}

// ── WebAudio 합성 천둥(파일 0) — 저역 럼블 + 노이즈 버스트, 번개 후 지연 재생 ──
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
    for (let i = 0; i < d.length; i++) { // 브라운 노이즈(저역 성분 풍부)
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
  } catch (_) { /* 오디오 불가 환경 — 무음 폴백 */ }
}

export function createSkySystem({ scene, renderer, sun, hemi, sky, getPos, soft = false, onFlash = null }) {
  const state = { time: 'day', weather: 'clear', fx: { rainbow: false, aurora: false }, flashSafe: false, starDensity: 1, precip: 1 };
  const disposables = [];
  const track = (o) => { disposables.push(o); return o; };

  // 하늘돔 텍스처 — 기존 sky 메시의 맵을 고해상 캔버스로 교체(시간대·날씨별 리페인트)
  const skyCanvas = document.createElement('canvas'); skyCanvas.width = 1024; skyCanvas.height = 512;
  const skyCtx = skyCanvas.getContext('2d');
  const skyTex = track(new THREE.CanvasTexture(skyCanvas)); skyTex.colorSpace = THREE.SRGBColorSpace;
  const oldMap = sky.material.map;
  sky.material.map = skyTex; sky.material.needsUpdate = true;
  if (oldMap) oldMap.dispose();

  // ── 강수 입자(비/눈) — Points 1드로우콜, 카메라 추종 박스 순환 낙하 ──
  const P_COUNT = soft ? 260 : 800;
  const P_BOX = { x: 42, y: 22, z: 42 };
  const pGeo = track(new THREE.BufferGeometry());
  const pPos = new Float32Array(P_COUNT * 3);
  const pSeedArr = new Float32Array(P_COUNT); // 눈 흔들림 위상
  { const r = seeded(77); for (let i = 0; i < P_COUNT; i++) { pPos[i * 3] = (r() - 0.5) * P_BOX.x; pPos[i * 3 + 1] = r() * P_BOX.y; pPos[i * 3 + 2] = (r() - 0.5) * P_BOX.z; pSeedArr[i] = r() * 6.28; } }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const rainMat = track(new THREE.PointsMaterial({ color: 0x9fb6cc, size: 0.09, transparent: true, opacity: 0.55, depthWrite: false }));
  const snowMat = track(new THREE.PointsMaterial({ color: 0xffffff, size: 0.16, transparent: true, opacity: 0.85, depthWrite: false }));
  const precip = new THREE.Points(pGeo, rainMat);
  precip.visible = false; precip.frustumCulled = false; scene.add(precip);

  // ── 무지개 — 7색 반투명 아치(캔버스 그라디언트 링 밴드), 원경 고정 빌보드 아님(월드 고정) ──
  function makeRainbow() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const x = c.getContext('2d');
    const bands = ['#e5484d', '#e8853a', '#e6c229', '#5bb85d', '#4a90d0', '#5560c9', '#8a5bc0'];
    bands.forEach((col, i) => { x.fillStyle = col; x.globalAlpha = 0.34; x.fillRect(0, (i / bands.length) * 64, 256, 64 / bands.length + 1); });
    const tex = track(new THREE.CanvasTexture(c)); tex.colorSpace = THREE.SRGBColorSpace;
    const geo = track(new THREE.TorusGeometry(150, 9, 2, 60, Math.PI)); // 반원 아치
    const mat = track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.5, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    const m = new THREE.Mesh(geo, mat);
    m.visible = false; m.renderOrder = -0.5;
    scene.add(m);
    return m;
  }
  const rainbow = makeRainbow();

  // ── 오로라 — 물결치는 반투명 커튼 리본(버텍스 y·색 사인 애니, 가산 블렌딩) ──
  const AUR_SEG = soft ? 24 : 48;
  function makeAurora(zOff, hue0, hue1) {
    const geo = track(new THREE.PlaneGeometry(560, 90, AUR_SEG, 1));
    const colors = new Float32Array((AUR_SEG + 1) * 2 * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = track(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    const m = new THREE.Mesh(geo, mat);
    m.position.set(0, 150, zOff); m.visible = false; m.renderOrder = -0.6;
    m.userData = { hue0, hue1, phase: zOff };
    scene.add(m);
    return m;
  }
  const auroras = [makeAurora(-300, [0.35, 0.9, 0.55], [0.2, 0.8, 0.9]), makeAurora(-340, [0.45, 0.85, 0.75], [0.6, 0.5, 0.95])];

  // ── 번개(뇌우) — 하늘 플래시(헤미·태양 순간 부스트) + 합성 천둥 ──
  let boltTimer = 8 + Math.random() * 10, flashT = 0;
  const baseVals = { sunI: 0, hemiI: 0 };

  function applyLighting() {
    const L = LIGHT[state.time][state.weather];
    sun.color.setHex(L.sun); sun.intensity = L.sunI;
    hemi.color.setHex(L.hemiS); hemi.groundColor.setHex(L.hemiG); hemi.intensity = L.hemiI;
    if (scene.fog) scene.fog.color.setHex(L.fog);
    renderer.setClearColor(L.fog, 1);
    baseVals.sunI = L.sunI; baseVals.hemiI = L.hemiI;
  }

  function repaint() { paintSky(skyCtx, 1024, 512, state.time, state.weather); skyTex.needsUpdate = true; }

  /** 조합 보정 — 감독이 어떤 조합을 골라도 어색하지 않게 규칙 적용 */
  function normalize(s) {
    const time = SKY_TIMES.includes(s.time) ? s.time : state.time;
    const weather = SKY_WEATHERS.includes(s.weather) ? s.weather : state.weather;
    const fx = Object.assign({}, state.fx, s.fx || {});
    if (time === 'night') fx.rainbow = false;                       // 무지개는 야간 금지
    if (weather === 'rain' || weather === 'snow') fx.rainbow = false; // 강수 중 금지(갠 하늘 연출)
    if (!(time === 'night' && weather === 'clear')) fx.aurora = false; // 오로라 = 야간 맑음만
    return { time, weather, fx };
  }

  function set(s = {}) {
    const n = normalize(s);
    state.time = n.time; state.weather = n.weather; state.fx = n.fx;
    if (typeof s.flashSafe === 'boolean') state.flashSafe = s.flashSafe;
    applyLighting(); repaint();
    precip.visible = (state.weather === 'rain' || state.weather === 'snow');
    precip.material = state.weather === 'snow' ? snowMat : rainMat;
    rainbow.visible = !!state.fx.rainbow;
    for (const a of auroras) a.visible = !!state.fx.aurora;
    boltTimer = 6 + Math.random() * 8;
    return get();
  }
  const get = () => ({ time: state.time, weather: state.weather, fx: Object.assign({}, state.fx), flashSafe: state.flashSafe });

  let t = 0;
  function update(dt) {
    t += dt;
    const pos = getPos();
    // 강수 낙하(비=빠른 수직, 눈=느린+사인 흔들림) — 박스는 카메라 추종
    if (precip.visible) {
      const snow = state.weather === 'snow';
      const fall = (snow ? 2.2 : 15) * dt * state.precip;
      const arr = pGeo.attributes.position.array;
      for (let i = 0; i < P_COUNT; i++) {
        arr[i * 3 + 1] -= fall;
        if (snow) arr[i * 3] += Math.sin(t * 1.4 + pSeedArr[i]) * dt * 0.5;
        if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] += P_BOX.y;
      }
      pGeo.attributes.position.needsUpdate = true;
      precip.position.set(pos.x, 0, pos.z);
    }
    // 무지개·오로라 위치(원경 유지 — 카메라 추종, 시차 없는 배경 연출)
    if (rainbow.visible) { rainbow.position.set(pos.x, -18, pos.z - 320); }
    if (state.fx.aurora) {
      for (const a of auroras) {
        a.position.x = pos.x; a.position.z = pos.z + a.userData.phase;
        const cAttr = a.geometry.attributes.color, pAttr = a.geometry.attributes.position;
        const { hue0, hue1 } = a.userData;
        for (let i = 0; i <= AUR_SEG; i++) {
          const w = Math.sin(t * 0.6 + i * 0.35 + a.userData.phase) * 14;
          pAttr.setY(i, 45 + w); pAttr.setY(i + AUR_SEG + 1, -45 + w * 0.6);
          const k = 0.5 + 0.5 * Math.sin(t * 0.4 + i * 0.22);
          const r = hue0[0] + (hue1[0] - hue0[0]) * k, g = hue0[1] + (hue1[1] - hue0[1]) * k, b = hue0[2] + (hue1[2] - hue0[2]) * k;
          cAttr.setXYZ(i, r, g, b); cAttr.setXYZ(i + AUR_SEG + 1, r * 0.25, g * 0.25, b * 0.25); // 하단은 어둡게 소멸
        }
        cAttr.needsUpdate = true; pAttr.needsUpdate = true;
      }
    }
    // 번개(비 = 뇌우) — 플래시 + 지연 천둥. flashSafe(광과민성)면 플래시 최소·천둥만.
    if (state.weather === 'rain') {
      boltTimer -= dt;
      if (boltTimer <= 0) {
        boltTimer = 7 + Math.random() * 14;
        flashT = state.flashSafe ? 0.04 : 0.22;
        synthThunder(0.8 + Math.random() * 2.2);
        if (onFlash) { try { onFlash(); } catch (_) {} }
      }
      if (flashT > 0) {
        flashT = Math.max(0, flashT - dt);
        const k = state.flashSafe ? 0.25 : 1.0;
        const boost = (flashT > 0 ? 1 : 0) * k;
        hemi.intensity = baseVals.hemiI + 2.2 * boost * (0.5 + Math.random() * 0.5);
        sun.intensity = baseVals.sunI + 0.8 * boost;
      } else { hemi.intensity = baseVals.hemiI; sun.intensity = baseVals.sunI; }
    }
  }

  function dispose() {
    scene.remove(precip); scene.remove(rainbow); for (const a of auroras) scene.remove(a);
    for (const o of disposables) { try { o.dispose(); } catch (_) {} }
  }

  set({ time: 'day', weather: 'clear' }); // 기본: 주간 맑음(현행과 동일 톤)
  return { set, get, update, dispose, SKY_TIMES, SKY_WEATHERS };
}

/** 방문자 실제 시각 → 시간대 자동 매핑(신 모드 '자동' 버튼용) */
export function autoTimeOfDay(d = new Date()) {
  const h = d.getHours();
  if (h >= 7 && h < 17) return 'day';
  if ((h >= 17 && h < 20) || (h >= 5 && h < 7)) return 'sunset';
  return 'night';
}
