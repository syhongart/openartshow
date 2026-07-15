// fly.js — 점프 홀드 비행 (감독 지시: "점프 버튼을 계속 누르면 날도록").
// 가산형 모듈: player.js의 최소훅(liftOffset)만 구동하고, 중력·상승·입력·상한·
// 비행 모션 토글을 여기서 전담한다. 보호 파일(player.js/main.js)은 최소 훅만 받고
// 로직은 전부 여기 격리 — 킬스위치 1개로 리스너·HUD 미등록까지 완전 무력화(원복 =
// 이 상수 false + player.js 3점 되돌림). 자기완결(외부 의존 0, three 불필요).
//
// 모델(팀장 판정): "발밑 지면 기둥 위에서 뜨는" 비행 — player.js가 비행 중에도
// 지면/벽 해석을 그대로 통과시키므로 벽·천장·보이드 관통이 원천 불가. liftOffset은
// 카메라 y에 가산되는 지면 위 부양 높이(m)일 뿐이다.

const FLY_ENABLED = true;   // 킬스위치 — false면 리스너·HUD 미등록(비행 완전 off)
const RISE_SPEED = 3.0;     // 홀드 시 상승 속도 (m/s)
const GRAVITY = 6.0;        // 놓았을 때 하강 가속 (m/s²)
const TERMINAL = 5.0;       // 하강 종단 속도 (m/s)
const MAX_LIFT = 2.2;       // 지면 위 최대 부양 높이 (m) — 층고 대비 보수적(천장 관통 금지)
const POSE_LIFT = 0.05;     // 이 높이 이상이면 비행 포즈(발이 지면을 떠남)

/**
 * 비행 컨트롤러 초기화.
 * @param {object} o
 * @param {object} o.player       PlayerController (liftOffset 훅·enabled 보유)
 * @param {() => (object|null)} o.getSelfAvatar  현재 셀프 아바타 인스턴스 getter(지연 생성/교체 대응)
 * @returns {{ update: (delta:number)=>void, dispose: ()=>void }}
 */
export function initFly({ player, getSelfAvatar }) {
  if (!FLY_ENABLED) {
    return { update() {}, dispose() {} }; // 킬스위치 off — 완전 무력화
  }

  let held = false; // 점프 입력 유지 중
  let lift = 0;     // 현재 부양 높이 (m)
  let vy = 0;       // 수직 속도 (m/s)
  let lastWritten = 0; // fly.js가 마지막에 player.liftOffset에 쓴 값(setPose 등 외부 리셋 감지용)

  // --- 데스크탑: Space 홀드 (입장·자유이동 중에만. 모달/라이트박스=player 비활성 시 무시) ---
  const onKeyDown = (e) => {
    if (e.code !== 'Space') return;
    if (!player || !player.enabled) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    held = true;
    e.preventDefault(); // 페이지 스크롤/버튼 클릭 방지 (자유이동 중 Space는 비행 전용)
  };
  const onKeyUp = (e) => {
    if (e.code === 'Space') held = false;
  };
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // --- 모바일: 우하단 HUD 버튼 (터치 기기에서만) ---
  let btn = null;
  const coarse = typeof window !== 'undefined' && window.matchMedia &&
    window.matchMedia('(pointer: coarse)').matches;
  const press = (e) => { held = true; if (btn) btn.classList.add('lu-fly-on'); if (e.cancelable) e.preventDefault(); e.stopPropagation(); };
  const release = (e) => { held = false; if (btn) btn.classList.remove('lu-fly-on'); e.stopPropagation(); };
  if (coarse) {
    btn = document.createElement('button');
    btn.id = 'lu-fly-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', '날기 — 누르고 있으면 상승');
    btn.textContent = '▲';
    // 인라인 스타일 — CSP(default-src 'self') 안전. 우하단, 우측 시선 드래그와 겹치나
    // 버튼이 위에 있고 stopPropagation하므로 시선 터치를 뺏기지 않는다.
    btn.style.cssText = [
      'position:fixed', 'right:20px', 'bottom:104px', 'width:64px', 'height:64px',
      'border-radius:50%', 'border:1.5px solid rgba(255,255,255,0.34)',
      'background:rgba(22,24,30,0.44)', 'color:rgba(255,255,255,0.92)',
      'font-size:20px', 'line-height:1', 'z-index:6',
      'display:none', 'align-items:center', 'justify-content:center',
      'touch-action:none', 'user-select:none', '-webkit-user-select:none',
      'cursor:pointer', 'box-shadow:0 2px 12px rgba(0,0,0,0.32)',
      'transition:background 0.12s, transform 0.12s, opacity 0.2s',
    ].join(';');
    btn.addEventListener('touchstart', press, { passive: false });
    btn.addEventListener('touchend', release);
    btn.addEventListener('touchcancel', release);
    // 포인터(마우스/펜) 폴백
    btn.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') press(e); });
    btn.addEventListener('pointerup', (e) => { if (e.pointerType !== 'touch') release(e); });
    document.body.appendChild(btn);
  }

  function update(delta) {
    const dt = Math.min(delta || 0, 0.1);
    const active = !!(player && player.enabled);
    if (!active) held = false; // 비활성(입장 전/모달)이면 잡힘 해제 → 중력으로 착지

    // setPose/투어/텔레포트가 player.liftOffset을 0으로 리셋했으면 내부 물리도 동기화한다
    // (fly.js가 매 프레임 덮어쓰기 전에 외부 변경을 존중 — 착지 후 공중 잔류 방지).
    if (player && player.liftOffset !== lastWritten) { lift = player.liftOffset; vy = 0; }

    if (held) {
      vy = RISE_SPEED;
    } else {
      vy -= GRAVITY * dt;
      if (vy < -TERMINAL) vy = -TERMINAL;
    }
    lift += vy * dt;
    if (lift >= MAX_LIFT) { lift = MAX_LIFT; vy = 0; } // 상한 호버
    if (lift <= 0) { lift = 0; vy = 0; }               // 착지

    if (player) { player.liftOffset = lift; lastWritten = lift; }

    // 셀프 아바타(3인칭 셀프뷰에서만 존재) 비행 포즈 — 매 프레임 동기화(지연 생성/교체 대응).
    const flying = active && lift > POSE_LIFT;
    const av = getSelfAvatar && getSelfAvatar();
    if (av && typeof av.setFlying === 'function') av.setFlying(flying);

    if (btn) btn.style.display = active ? 'flex' : 'none'; // 로비/비활성 시 완전 숨김
  }

  function dispose() {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
  }

  return { update, dispose };
}
