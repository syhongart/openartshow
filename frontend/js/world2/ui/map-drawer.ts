// 미니맵 책갈피 — 왼쪽 가장자리에서 펼치고 접는다.
//
// ── 감독 지시 ────────────────────────────────────────────────────────────────
// *"지도에 왼쪽 책갈피로 펼치고 접게 해."*
//
// 지도가 늘 펼쳐져 있으면 화면 왼쪽을 상시 먹는다. 특히 하늘 패널을 열면 그 아래에
// 겹쳐 들어가 둘 다 읽기 어려워진다(감독 스크린샷에서 실제로 그랬다).
//
// ── 왜 `transform` 인가 ─────────────────────────────────────────────────────
// 접을 때 `display:none` 으로 지우면 **캔버스가 레이아웃에서 빠져 크기가 0이 된다.**
// 그러면 미니맵을 그리는 쪽이 0×0 캔버스에 그리게 되고, 다시 펼칠 때 한 프레임 동안
// 빈 지도가 보인다. `transform` 은 레이아웃을 건드리지 않고 화면 밖으로 밀어내기만
// 하므로 캔버스는 계속 제 크기를 유지한다.
//
// 접힌 동안에도 그리기는 계속 돈다. 미니맵 렌더는 프레임당 수백 개 사각형이라 비용이
// 작고, 멈췄다 켜면 그 프레임에 몰려서 오히려 튄다.

export interface MapDrawerParts {
  /** 지도와 탭을 함께 담은 껍데기. `data-open` 을 여기에 쓴다 */
  wrap: HTMLElement;
  /** 책갈피 버튼 */
  tab: HTMLElement;
}

export interface MapDrawer {
  /** 지금 펼쳐져 있는가 */
  readonly open: boolean;
  toggle(): void;
  dispose(): void;
}

/** DOM 이 없으면 `null`. 조립부가 지도를 몰라도 되게 하려는 것이다 */
export function findMapDrawer(doc: Document): MapDrawerParts | null {
  const wrap = doc.getElementById('w2-mapwrap');
  const tab = doc.getElementById('w2-map-tab');
  return wrap && tab ? { wrap, tab } : null;
}

export function attachMapDrawer(parts: MapDrawerParts, startOpen = true): MapDrawer {
  let open = startOpen;

  const apply = () => {
    parts.wrap.dataset.open = open ? '1' : '0';
    parts.tab.setAttribute('aria-expanded', open ? 'true' : 'false');
    // 화살표가 **접힌 방향**을 가리킨다 — 펼쳐져 있으면 "왼쪽으로 넣기"다.
    parts.tab.textContent = open ? '‹' : '›';
    parts.tab.setAttribute('aria-label', open ? '지도 접기' : '지도 펼치기');
  };

  const onClick = (e: Event) => {
    // 지도는 `pointer-events:none` 이라 아래 캔버스가 조작을 받는데, 탭만은 눌려야
    // 한다. 그 클릭이 캔버스까지 내려가면 시선이 홱 돌아가므로 여기서 끊는다.
    e.preventDefault();
    e.stopPropagation();
    open = !open;
    apply();
  };

  parts.tab.addEventListener('click', onClick);
  // 터치 기기에서 `click` 은 300ms 늦게 온다. `pointerdown` 을 함께 막아 두면 그 사이
  // 캔버스가 먼저 반응하는 것을 방지한다.
  const onDown = (e: Event) => { e.stopPropagation(); };
  parts.tab.addEventListener('pointerdown', onDown);

  apply();

  return {
    get open() { return open; },
    toggle() { open = !open; apply(); },
    dispose() {
      parts.tab.removeEventListener('click', onClick);
      parts.tab.removeEventListener('pointerdown', onDown);
    },
  };
}
