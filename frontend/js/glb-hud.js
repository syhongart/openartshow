// glb-hud.js — **미니맵 · 속도 계기 · 시간대 조정.** world7·world8 전용.
//
// ── 감독 지시 2026-08-26 ────────────────────────────────────────────────────
// *"왼쪽 지도나오고. 날씨조정하는 창나와야하고. 속도측정하는 디버그 클립창이 오른쪽
// 상단에있고. 월드2의 기능을 계승해야지"*
//
// ⚠ **미니맵은 앞선 조사에서 「원리상 불가」로 판정됐다** — world2 의 미니맵은 도로·광장·
// 물을 **절차적 판정 산출물**에서 읽어 그리는데(`world2/decide/minimap.ts`) 임의 GLB 에는
// 그 선언이 없다. 그 판정은 **코드 이식에 대해서만 참이다.** 충돌 때와 같은 형태다 —
// 감독이 요구한 것은 코드가 아니라 **결과**이고, 임의 씬에서 성립하는 길이 따로 있다:
// **위에서 정투영으로 한 번 렌더해 텍스처로 굽는다.** 오히려 더 정확하다(파일에 실제로
// 있는 것만 그린다). 비용도 1회다.
//
// ── 시간대는 `sky.js` 이식이 아니다 ────────────────────────────────────────
// world2 의 하늘 엔진은 1,609줄이고 어댑터가 world2 계열 타입을 문다. 여기서는 **조명·
// 하늘색·안개** 셋만 시간대에 따라 움직인다. 「날씨」가 아니라 「시간대」다 —
// 구름·비는 없다. **그 차이를 화면 문구에도 적는다**(없는 것을 있는 것처럼 부르지 않는다).

import * as THREE from 'three';

/** 미니맵 한 변(px). 모바일에서도 손가락을 안 가리는 크기. */
const MAP_PX = 148;
/** 지도를 구울 때의 해상도(px). 크면 선명하고 굽는 비용이 는다. */
const BAKE_PX = 512;

/**
 * 위에서 정투영으로 한 번 찍어 **지도 텍스처**를 만든다.
 *
 * ⚠ 씬을 **한 번 더 그린다** — 로드 직후 1회이고 프레임마다가 아니다.
 * 그림자는 잠시 끈다(위에서 본 그림자는 지도에 도움이 안 되고 비용만 든다).
 */
export function bakeMap(renderer, scene, box) {
  const size = box.getSize(new THREE.Vector3());
  const mid = box.getCenter(new THREE.Vector3());
  const half = Math.max(size.x, size.z) / 2;
  const cam = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, size.y + 200);
  cam.position.set(mid.x, box.max.y + 100, mid.z);
  cam.up.set(0, 0, -1);           // 화면 위쪽이 -z(북) — 아래 회전 계산과 규약을 맞춘다
  cam.lookAt(mid.x, box.min.y, mid.z);
  const rt = new THREE.WebGLRenderTarget(BAKE_PX, BAKE_PX);
  const wasShadow = renderer.shadowMap.enabled;
  renderer.shadowMap.enabled = false;
  renderer.setRenderTarget(rt);
  renderer.render(scene, cam);
  renderer.setRenderTarget(null);
  renderer.shadowMap.enabled = wasShadow;

  // 렌더 타깃 픽셀을 캔버스로 옮긴다 — `<img>` 로 쓰기 위해서다.
  const buf = new Uint8Array(BAKE_PX * BAKE_PX * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, BAKE_PX, BAKE_PX, buf);
  const cv = document.createElement('canvas');
  cv.width = cv.height = BAKE_PX;
  const img = new ImageData(new Uint8ClampedArray(buf), BAKE_PX, BAKE_PX);
  // WebGL 은 아래에서 위로 읽는다 — 뒤집어야 지도 방향이 맞는다.
  const ctx = cv.getContext('2d');
  ctx.putImageData(img, 0, 0);
  ctx.save(); ctx.scale(1, -1); ctx.drawImage(cv, 0, -BAKE_PX); ctx.restore();
  rt.dispose();
  return { url: cv.toDataURL('image/png'), half, mid };
}

/**
 * 미니맵·계기·시간대 UI 를 만든다. 마크업은 여기서 만든다(HTML 을 두 페이지에 복사하면
 * 그것이 곧 값 미러링이다).
 */
export function createHud(doc, opts) {
  const wrap = doc.createElement('div');
  wrap.id = 'gw-hud';
  wrap.innerHTML = `
    <div id="gw-map"><img alt="지도"><i></i></div>
    <div id="gw-stat"></div>
    <div id="gw-time">
      <label>시간대 <b>12:00</b></label>
      <input type="range" min="0" max="24" step="0.25" value="12">
    </div>`;
  doc.body.appendChild(wrap);
  const st = doc.createElement('style');
  st.textContent = `
    #gw-map{position:fixed;left:12px;bottom:calc(64px + env(safe-area-inset-bottom));
      width:${MAP_PX}px;height:${MAP_PX}px;z-index:5;border-radius:10px;overflow:hidden;
      border:1px solid #ffffff2e;background:#0b0a09aa;backdrop-filter:blur(6px)}
    #gw-map img{width:100%;height:100%;display:block;object-fit:cover;opacity:.92}
    #gw-map i{position:absolute;left:50%;top:50%;width:0;height:0;margin:-7px 0 0 -5px;
      border-left:5px solid transparent;border-right:5px solid transparent;
      border-bottom:11px solid #ffd76a;filter:drop-shadow(0 0 2px #0008)}
    #gw-stat{position:fixed;right:12px;top:calc(12px + env(safe-area-inset-top));z-index:5;
      padding:7px 10px;border-radius:8px;background:#00000072;color:#dcd6c8;
      font:11.5px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre;
      backdrop-filter:blur(6px);text-align:right}
    #gw-time{position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));
      z-index:5;padding:8px 10px;border-radius:9px;background:#00000072;color:#dcd6c8;
      font-size:11.5px;backdrop-filter:blur(6px);display:grid;gap:5px;width:172px}
    #gw-time b{color:#ffd76a;font-variant-numeric:tabular-nums}
    #gw-time input{width:100%;accent-color:#ffd76a}
    @media (max-width:640px){ #gw-map{width:104px;height:104px} #gw-time{width:140px} }`;
  doc.head.appendChild(st);

  const mapImg = wrap.querySelector('#gw-map img');
  const needle = wrap.querySelector('#gw-map i');
  const stat = wrap.querySelector('#gw-stat');
  const label = wrap.querySelector('#gw-time b');
  const range = wrap.querySelector('#gw-time input');
  range.addEventListener('input', () => {
    const h = +range.value;
    label.textContent = `${String(Math.floor(h) % 24).padStart(2, '0')}:${h % 1 ? '30' : '00'}`;
    opts.onTime?.(h);
  });

  let bake = null;
  return {
    /** 구운 지도를 건다. */
    setMap(b) { bake = b; mapImg.src = b.url; },
    /**
     * 내 자리·시선을 지도에 반영한다. **지도를 돌리지 않고 바늘만 돌린다** — 지도가
     * 돌면 「어디가 북쪽인가」가 매 프레임 바뀌어 오히려 길을 잃는다.
     */
    setPose(pos, yaw) {
      if (!bake || !needle) return;
      const u = (pos.x - bake.mid.x) / (bake.half * 2) + 0.5;
      const v = (pos.z - bake.mid.z) / (bake.half * 2) + 0.5;
      needle.style.left = `${Math.min(100, Math.max(0, u * 100))}%`;
      needle.style.top = `${Math.min(100, Math.max(0, v * 100))}%`;
      needle.style.transform = `rotate(${180 - (yaw * 180) / Math.PI}deg)`;
    },
    /** 우상단 계기. **프레임 시간은 감독 기기에서만 의미가 있다** — 여기서 잰다. */
    setStat(fps, info) {
      stat.textContent = `${fps.toFixed(0)} fps\n${info.calls} draw\n`
        + `${(info.triangles / 1000).toFixed(0)}k tri`;
    },
  };
}
