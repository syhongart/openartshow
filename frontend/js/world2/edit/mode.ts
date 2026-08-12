// world2/edit/mode.ts — **감독이 직접 놓는 화면.** `?edit=1` 로만 켜진다.
//
// ── 왜 editor 가 아니라 world2 안인가 (팀장 판정 2026-08-09) ─────────────────
// three.js editor 는 WebGL 이고 world2 는 WebGPU 라 룩이 다르다. world2 안에서 놓으면
// **보는 화면이 곧 배포 화면**이다.
//
// ── 이 모듈은 `?edit=1` 없는 세션에 로드조차 되지 않는다 ────────────────────
// `features/overlay.ts` 가 동적 import 로만 부른다. 그것이 라이브 격리의 전부라
// 정적 import 로 되돌리면 이 파일이 기본 번들에 들어간다(테스트가 그 축을 지킨다).
//
// ── `TransformControls` 를 안 쓰는 이유 ─────────────────────────────────────
// `vite.config.js` 의 청크 화이트리스트가 `examples/jsm/` 중 `GLTFLoader`·
// `BufferGeometryUtils` 만 허용한다. 그 밖을 쓰면 라이브가 editor 청크를 통째로 받는다.
// `Raycaster` 는 three 코어라 무료다 — 그래서 gizmo 대신 **광선 ∩ 지면**으로 옮긴다.
//
// ── 포인터락 (`main.ts` 무수정) ─────────────────────────────────────────────
// 주행 모드는 캔버스 클릭으로 포인터락에 들어간다(`main.ts:1179`). 편집 중에 그것이
// 걸리면 커서가 사라져 아무것도 집을 수 없다. `main.ts` 를 고치는 대신 **document 캡처
// 단계**에서 캔버스 클릭만 끊는다 — 캡처는 document → canvas 순이라 canvas 의 at-target
// 리스너에 도달하기 전에 멈출 수 있다. 대신 시점 회전은 **우클릭 드래그**로 준다.

import type { EditSession, OverlayEntry, OverlayHost } from './types.js';
import { ndcOf, rayPlaneY, scaleBy, snapTo } from '../decide/edit-pick.js';
import { isSafeSrc } from '../decide/overlay.js';
import { reviewOverlay } from './export.js';

export interface EditOptions {
  /** 팔레트 목록(`assets/models/index.json`) 의 실제 주소 */
  readonly modelsUrl: string;
  /** 미리보기로 만든 임시 주소를 소비자에게 넘겨 회수하게 한다 */
  onBlobUrl(url: string): void;
}

/** 회전 한 번. 24등분이라 세 번이면 45°, 여섯 번이면 90° 다. */
const RY_STEP = Math.PI / 12;
/** 크기 한 번(배수). 계약의 `S_MIN`·`S_MAX` 가 상·하한을 소유한다 */
const S_STEP = 1.15;
/** 높이 한 번(m) */
const Y_STEP = 0.25;
/** 지면 스냅 격자(m). 0 이면 자유 배치 */
const SNAP = 0.5;

type XYZ = { x: number; y: number; z: number };
type ThreeNS = {
  Raycaster: new () => {
    ray: { origin: XYZ; direction: XYZ };
    setFromCamera(coords: { x: number; y: number }, cam: unknown): void;
    intersectObjects(objs: unknown[], recursive: boolean): { object: unknown }[];
  };
  Mesh: new (g: unknown, m: unknown) => {
    position: { set(x: number, y: number, z: number): void };
    rotation: { x: number };
    scale: { setScalar(s: number): void };
    visible: boolean;
    renderOrder: number;
  };
  RingGeometry: new (inner: number, outer: number, seg: number) => { dispose?(): void };
  MeshBasicMaterial: new (p: Record<string, unknown>) => { dispose?(): void };
  Box3: new () => { min: XYZ; max: XYZ; setFromObject(o: never): unknown };
  DoubleSide: number;
};

// ── 위치는 **오른쪽**이다 (감독 신고 2026-08-12) ──────────────────────────────
// 처음엔 좌상단이었고 그것이 모바일에서 조작을 죽였다. 터치 조이스틱은 별도 오버레이가
// 아니라 **캔버스가 받고**(`main.ts` 의 `attachTouchControls(canvas, …)`), 판정 영역이
// **화면 왼쪽 절반 전체**다(`decide/touch.ts` 의 `x < viewportWidth / 2`). 폭 212px 짜리
// 패널을 왼쪽에 두면 가로 모드에서 **왼쪽 엄지 기둥을 통째로 덮는다** — 그 위 터치는
// 캔버스에 도달조차 못 한다(패널이 `pointer-events:auto` 이고 `z-index:40` 이므로).
//
// 오른쪽 절반은 시선 드래그 영역이라 같은 문제가 있지만, **접힌 상태가 기본**이라
// 실제로 가리는 것은 작은 버튼 하나다. 그리고 이동을 못 하는 것이 시점을 못 도는 것보다
// 훨씬 치명적이다(움직일 수 없으면 아무것도 못 한다).
//
// `env(safe-area-inset-*)` 를 쓴다 — world2.html 의 기존 패널 넷이 전부 그렇게 하고,
// 이 저장소는 그것을 빠뜨려 한 번 데였다(DEVLOG *"iOS에서 safe-area env()가 전부 0(치명)"*).
const CSS = `
#w2-edit{position:fixed;z-index:40;font:11px/1.35 system-ui,sans-serif;
  right:calc(8px + env(safe-area-inset-right,0px));top:calc(8px + env(safe-area-inset-top,0px));
  width:212px;color:#F5F5F2;background:rgba(11,13,18,.86);border:1px solid #3A3D4B;
  border-radius:10px;padding:8px;backdrop-filter:blur(6px);
  max-height:calc(100dvh - 16px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px));
  overflow:auto}
/* 접힌 상태 — 주행 중에는 이것이 기본이다. 화면을 거의 안 가린다 */
#w2-edit[data-open="0"]{width:auto;padding:0;background:none;border:0;backdrop-filter:none;overflow:visible}
#w2-edit[data-open="0"] .body{display:none}
#w2-edit .head{display:flex;gap:6px;align-items:center}
#w2-edit h4{margin:0;font-size:11px;letter-spacing:.04em;color:#8B72FF;flex:1 1 auto}
#w2-edit[data-open="0"] h4{display:none}
#w2-edit .row{display:flex;gap:4px;flex-wrap:wrap;margin:4px 0}
#w2-edit button{flex:1 1 auto;min-width:30px;padding:4px 5px;font:11px/1 system-ui,sans-serif;
  color:#F5F5F2;background:#1A1D26;border:1px solid #3A3D4B;border-radius:6px;cursor:pointer}
#w2-edit button:hover{border-color:#8B72FF}
#w2-edit button[data-on="1"]{background:#8B72FF;border-color:#8B72FF;color:#0B0D12}
/* 토글 버튼은 접혔을 때 유일하게 보이는 것이라 손가락이 닿을 크기여야 한다 */
#w2-edit .toggle{flex:0 0 auto;padding:8px 12px;font-size:12px;
  background:rgba(11,13,18,.86);border-color:#3A3D4B;backdrop-filter:blur(6px)}
#w2-edit[data-mode="edit"] .toggle{background:#8B72FF;border-color:#8B72FF;color:#0B0D12}
#w2-edit .note{color:#9A9EB1;margin:4px 0 0}
#w2-edit .warn{color:#FFC46B}
#w2-edit .lead{color:#F5F5F2;margin:6px 0 0;font-size:12px}
#w2-edit .sel{color:#72E6E1}
#w2-edit hr{border:0;border-top:1px solid #3A3D4B;margin:6px 0}
#w2-edit .pal button{flex:1 1 100%;text-align:left}
`;

export function startEditMode(host: OverlayHost, opts: EditOptions): EditSession {
  const doc = host.doc;
  const THREE = host.THREE as ThreeNS;
  const canvas = host.canvas;

  /** 미리보기 파일의 임시 주소. 복제할 때 같은 주소를 다시 쓴다 */
  const previewUrls = new Map<string, string>();

  let selected: OverlayEntry | null = null;
  let pendingSrc: string | null = null;
  let dragging: OverlayEntry | null = null;
  let dragPlaneY = 0;
  let orbiting = false;
  let snapOn = true;
  /** 내보내기 2단 클릭 — 손실이 있으면 1차는 저장하지 않는다 */
  let armed = false;
  /**
   * GLB 를 받는 중인가. **받는 동안 새 배치를 받지 않는다.**
   *
   * 왜 잠그나 (감독 신고 2026-08-12 *"완전히 굳어 탭을 닫아야 했다"*): 진행 표시가 없던
   * 시절엔 눌러도 화면이 그대로라 «안 먹었나» 하고 다시 누르게 된다. 그러면 12.9MB 자산이
   * 여러 벌 동시에 파싱되고 각각이 붙는 순간 프레임이 멈춘다 — 한 번의 히칭이 아니라
   * **누적**이 탭을 죽였다. 진행 표시(아래 `placeAt`)와 이 잠금은 **짝이다**: 표시만 있고
   * 잠금이 없으면 조급한 연타가 그대로 통과하고, 잠금만 있고 표시가 없으면 잠긴 것이
   * 멈춘 것과 구별되지 않는다.
   */
  let busy = false;

  // ── 편집은 «켜는 것»이다. 기본은 주행 (감독 신고 2026-08-12) ───────────────
  // 처음엔 `?edit=1` 이 곧 편집 모드 상시 켜짐이었고, 그것이 **주행을 통째로 죽였다.**
  // 편집 리스너가 캔버스 클릭을 캡처 단계에서 끊으므로 `main.ts` 의 포인터락 요청이
  // 영영 안 불리고, `main.ts` 의 `onMove` 는 `pointerLockElement === canvas` 일 때만
  // `player.look()` 을 부른다 → **마우스를 움직여도 시점이 안 돈다.**
  //
  // 감독 신고: *"저 위에 링크 클릭하면 마우스 터치, 키보드 동작안해."*
  //
  // ⚠ **검증이 이것을 놓친 방식이 핵심이다.** 나는 *"포인터락 미발생 = PASS"* 로 쟀다.
  // 감독에게 그것은 성공이 아니라 *"화면이 안 돌아간다"* 였다. 값이 아니라 **재는 축이
  // 틀렸다** — 그래서 지금은 두 축을 함께 건다(주행 중엔 걸리고, 편집 중엔 안 걸린다).
  //
  // 그래서 뒤집는다: `?edit=1` 은 *"편집 도구를 쓸 수 있게 한다"* 만 뜻하고 부팅 직후는
  // **주행 모드**다(리스너를 아예 안 붙인다 = 라이브와 동일). 편집은 버튼·`Tab` 으로 켠다.
  let editing = false;

  // ── 패널 ────────────────────────────────────────────────────────────────
  const style = doc.createElement('style');
  style.textContent = CSS;
  doc.head.appendChild(style);

  const panel = doc.createElement('div');
  panel.id = 'w2-edit';
  // `innerHTML` 을 쓰지 않는다 — 이 저장소의 UI 규약이다(`knob-bar.ts` 의 XSS 근거).
  const el = (tag: string, cls?: string, text?: string): HTMLElement => {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const button = (label: string, onClick: () => void): HTMLButtonElement => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  };

  const title = el('h4', undefined, '배치 편집');
  const palette = el('div', 'row pal');
  const selLine = el('div', 'sel', '선택: 없음');
  const rowRot = el('div', 'row');
  const rowScale = el('div', 'row');
  const rowY = el('div', 'row');
  const rowOps = el('div', 'row');
  const rowOut = el('div', 'row');
  const status = el('div', 'note', 'GLB 를 이 화면에 끌어다 놓거나, 위에서 골라 지면을 클릭.');
  const hint = el('div', 'note', '');
  /** 접힘/펼침 + 편집/주행을 함께 쥔 버튼. 접혔을 때 화면에 남는 유일한 것이다 */
  const toggle = button('✏️ 편집', () => { setEditing(!editing); });
  toggle.className = 'toggle';

  const nudge = (fn: (e: OverlayEntry) => void) => () => {
    if (!selected) { say('먼저 물건을 클릭해 고르세요.'); return; }
    fn(selected);
    host.apply(selected);
    refresh();
  };

  rowRot.append(
    button('↺ 회전', nudge((e) => { e.ry -= RY_STEP; })),
    button('회전 ↻', nudge((e) => { e.ry += RY_STEP; })),
  );
  rowScale.append(
    button('− 크기', nudge((e) => { e.s = scaleBy(e.s, 1 / S_STEP); })),
    button('크기 +', nudge((e) => { e.s = scaleBy(e.s, S_STEP); })),
  );
  rowY.append(
    button('− 높이', nudge((e) => { e.y -= Y_STEP; })),
    button('높이 +', nudge((e) => { e.y += Y_STEP; })),
    button('바닥에', nudge((e) => { e.y = host.surfaceAt(e.x, e.z); })),
  );
  const snapBtn = button('격자 0.5m', () => { snapOn = !snapOn; refresh(); });
  rowOps.append(
    snapBtn,
    button('복제', () => { void duplicate(); }),
    button('삭제', () => { removeSelected(); }),
  );
  rowOut.append(button('JSON 내보내기', () => { exportNow(); }));

  const head = el('div', 'head');
  head.append(title, toggle);
  const body = el('div', 'body');
  body.append(palette, el('hr'), selLine, rowRot, rowScale, rowY, rowOps,
    el('hr'), rowOut, status, hint);
  panel.append(head, body);
  panel.dataset.open = '0';
  panel.dataset.mode = 'drive';
  doc.body.appendChild(panel);

  function say(msg: string, warn = false): void {
    status.textContent = msg;
    status.className = warn ? 'note warn' : 'note';
  }

  function refresh(): void {
    snapBtn.dataset.on = snapOn ? '1' : '0';
    for (const b of palette.querySelectorAll('button')) {
      b.dataset.on = b.dataset.src === pendingSrc ? '1' : '0';
    }
    if (!selected) {
      selLine.textContent = `선택: 없음 · 배치 ${host.entries().length}개`;
    } else {
      const name = selected.src.replace(/^assets\/models\//, '');
      selLine.textContent = `선택: ${name}${selected.preview ? ' (미리보기)' : ''}`
        + ` · ${selected.x.toFixed(1)}, ${selected.y.toFixed(2)}, ${selected.z.toFixed(1)}`
        + ` · ${((selected.ry * 180) / Math.PI).toFixed(0)}° · ×${selected.s.toFixed(2)}`;
    }
    const previews = host.entries().filter((e) => e.preview).length;
    if (previews > 0) {
      hint.className = 'note warn';
      hint.textContent = `⚠ ${previews}개는 저장소에 없는 파일입니다 — JSON 과 함께 그 GLB 도 주셔야 배포에 붙습니다.`;
    } else {
      hint.className = 'note';
      hint.textContent = '좌드래그 이동 · 우드래그 시점 · Q/E 회전 · R/F 크기 · Z/X 높이 · Del·⌫ 삭제';
    }
    marker.visible = selected !== null;
    if (selected) placeMarker(selected);
  }

  // ── 모드 전환 ───────────────────────────────────────────────────────────
  // **주행 모드에서는 리스너를 아예 안 붙인다.** 조건문으로 걸러내는 것이 아니라
  // 붙였다 떼는 것이 요점이다 — 조건이 하나라도 새면 주행이 또 죽고, 그 실패는 감독
  // 화면에서만 드러난다(이번 사고가 정확히 그랬다).
  function setEditing(on: boolean): void {
    if (on === editing) return;
    editing = on;
    panel.dataset.open = on ? '1' : '0';
    panel.dataset.mode = on ? 'edit' : 'drive';
    toggle.textContent = on ? '✕ 편집 끝' : '✏️ 편집';
    if (on) {
      bindEditListeners();
      // 편집에 들어오면 주행 모드의 포인터락을 푼다. 안 그러면 커서가 없어 못 집는다.
      try { doc.exitPointerLock?.(); } catch { /* 애초에 안 걸려 있었다 */ }
      // ⚠ **이 한 줄이 이번 사고의 절반이다.** 시점 조작이 우드래그로 바뀌는데 그 안내가
      // 패널 맨 아래 작은 글씨에만 있었다. 감독은 마우스를 움직여도 화면이 안 도니
      // *"아무것도 안 먹는다"* 로 읽었다. 모드가 바뀌는 순간 크게 말한다.
      say('편집 모드 — 시점은 마우스 오른쪽 버튼 드래그. 이동은 WASD 그대로.');
      status.className = 'lead';
    } else {
      unbindEditListeners();
      selected = null;
      pendingSrc = null;
      dragging = null;
      orbiting = false;
      say('주행 모드 — 화면을 클릭하면 마우스로 시점이 돕니다.');
    }
    refresh();
  }

  // ── 선택 표시 ───────────────────────────────────────────────────────────
  // 바닥 링 하나. `MeshBasicMaterial` 은 이 저장소가 두 백엔드에서 이미 쓰는 수단이다
  // (`systems/horizon.ts` 헤더). gizmo 를 안 쓰는 것과 같은 이유로 헬퍼도 안 쓴다.
  const markerMat = new THREE.MeshBasicMaterial({
    color: 0x8b72ff, transparent: true, opacity: 0.85, depthTest: false, side: THREE.DoubleSide,
  });
  // 지오메트리도 변수로 든다 — `dispose` 에서 재질만 회수하면 링 지오가 남는다(검수관 P3).
  const markerGeo = new THREE.RingGeometry(0.86, 1, 40);
  const marker = new THREE.Mesh(markerGeo, markerMat);
  marker.rotation.x = -Math.PI / 2;
  marker.visible = false;
  marker.renderOrder = 999;
  (host.root as unknown as { add(o: never): void }).add(marker as never);

  function placeMarker(e: OverlayEntry): void {
    const box = new THREE.Box3();
    box.setFromObject(e.holder as never);
    const r = box.min.x === Infinity
      ? 2
      : Math.max(1, Math.hypot(box.max.x - box.min.x, box.max.z - box.min.z) / 2);
    marker.scale.setScalar(r);
    marker.position.set(e.x, e.y + 0.06, e.z);
  }

  // ── 레이캐스트 ──────────────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster();

  function castFrom(ev: { clientX: number; clientY: number }): boolean {
    const rect = (canvas as unknown as { getBoundingClientRect(): DOMRect }).getBoundingClientRect();
    const ndc = ndcOf(ev.clientX, ev.clientY, rect);
    if (!ndc) return false;
    raycaster.setFromCamera(ndc, host.camera);
    return true;
  }

  function groundAt(): { x: number; z: number } | null {
    const o = raycaster.ray.origin, d = raycaster.ray.direction;
    // 먼저 y=0 으로 잡고, 그 자리의 표면 높이로 한 번 더 잡는다. 잔디(0.07)·도로(0.14)가
    // 서로 다른 높이라 한 번만 재면 물건이 잠기거나 뜬다(감독 발견 2026-08-12 와 같은 축).
    const first = rayPlaneY({ ox: o.x, oy: o.y, oz: o.z, dx: d.x, dy: d.y, dz: d.z }, 0);
    if (!first) return null;
    const sy = host.surfaceAt(first.x, first.z);
    const second = rayPlaneY({ ox: o.x, oy: o.y, oz: o.z, dx: d.x, dy: d.y, dz: d.z }, sy) ?? first;
    return snapOn
      ? { x: snapTo(second.x, SNAP), z: snapTo(second.z, SNAP) }
      : second;
  }

  function planeAt(y: number): { x: number; z: number } | null {
    const o = raycaster.ray.origin, d = raycaster.ray.direction;
    const p = rayPlaneY({ ox: o.x, oy: o.y, oz: o.z, dx: d.x, dy: d.y, dz: d.z }, y);
    if (!p) return null;
    return snapOn ? { x: snapTo(p.x, SNAP), z: snapTo(p.z, SNAP) } : p;
  }

  /** 맞은 오브젝트에서 **오버레이 항목**을 되찾는다. 마을 파츠는 애초에 대상이 아니다. */
  function entryOf(obj: unknown): OverlayEntry | null {
    let cur = obj as { parent?: unknown } | null;
    const root = host.root as unknown;
    while (cur && (cur as { parent?: unknown }).parent !== root) {
      cur = (cur as { parent?: unknown }).parent as { parent?: unknown } | null;
    }
    if (!cur) return null;
    return host.entries().find((e) => (e.holder as unknown) === cur) ?? null;
  }

  function pick(): OverlayEntry | null {
    const hits = raycaster.intersectObjects(
      (host.root as unknown as { children: unknown[] }).children, true,
    );
    for (const h of hits) {
      const e = entryOf(h.object);
      if (e) return e;
    }
    return null;
  }

  // ── 배치 ────────────────────────────────────────────────────────────────
  /** 받은 바이트를 MB 로. 소수 한 자리면 12.9MB 짜리에서 눈에 띄게 움직인다 */
  function mb(bytes: number): string {
    return (bytes / 1048576).toFixed(1);
  }

  async function placeAt(src: string, at: { x: number; z: number }, blobUrl?: string): Promise<void> {
    if (busy) { say('아직 불러오는 중입니다 — 끝나면 놓입니다.'); return; }
    busy = true;
    const label = src.replace(/^assets\/models\//, '');
    say(`${label} 불러오는 중…`);
    try {
      const e = await host.place(
        src, { x: at.x, y: host.surfaceAt(at.x, at.z), z: at.z }, blobUrl,
        (pct, loaded) => {
          // `pct === null` 은 총 용량을 모른다는 뜻이다 — 지어내지 않고 받은 양만 적는다.
          say(pct === null
            ? `${label} ${mb(loaded)}MB 받는 중…`
            : `${label} ${Math.round(pct)}% (${mb(loaded)}MB)`);
        },
      );
      if (!e) {
        // 예전엔 여기가 *"콘솔의 진단을 보세요"* 였는데 이 경로에 `console.*` 호출이
        // **0건**이었다 — 감독이 콘솔을 열어도 아무것도 없는 막다른 길이었다.
        const why = host.lastFailure();
        say(why ? `놓지 못했습니다 — ${why}` : '놓지 못했습니다 — 파일을 읽을 수 없습니다.', true);
        return;
      }
      selected = e;
      // 놓은 자리가 카메라 코앞이면 **건물 안에 갇힌 것처럼 보인다**(실측 2026-08-12:
      // 스폰 4m 앞에 26m 자산을 놓으니 벽이 화면을 채웠다). `glb-city` 가 *"원점이 곧
      // 스폰 지점인데 거기 미술관을 세워 조이스틱이 안 먹는 것처럼 보였다"* 로 이미 겪은
      // 축이다. 거기서는 칸을 비웠지만 여기서는 감독이 고른 자리를 옮길 수 없으니 **말한다.**
      say('놓았습니다. 화면이 막히면 S 로 물러나거나 「− 크기」로 줄이세요.');
    } finally {
      // 성공이든 실패든 잠금을 푼다 — `finally` 가 아니면 로드 실패 한 번이 편집을
      // 세션 내내 잠근다.
      busy = false;
      refresh();
    }
  }

  async function duplicate(): Promise<void> {
    if (!selected) { say('먼저 물건을 클릭해 고르세요.'); return; }
    // 복제도 `host.place` 를 탄다. 원본이 캐시에 있으면 빨리 끝나지만 **미리보기(blob)는
    // 캐시 키가 달라 다시 받을 수 있으므로** 같은 잠금을 건다.
    if (busy) { say('아직 불러오는 중입니다 — 끝나면 복제합니다.'); return; }
    busy = true;
    const s = selected;
    try {
      const e = await host.place(
        s.src, { x: s.x + 2, y: s.y, z: s.z + 2, ry: s.ry, s: s.s },
        s.preview ? previewUrls.get(s.src) : undefined,
      );
      if (e) selected = e;
    } finally {
      busy = false;
      refresh();
    }
  }

  function removeSelected(): void {
    if (!selected) { say('먼저 물건을 클릭해 고르세요.'); return; }
    host.remove(selected);
    selected = null;
    refresh();
  }

  // ── 포인터 ──────────────────────────────────────────────────────────────
  const onPointerDown = (ev: PointerEvent) => {
    if (ev.target !== canvas) return;
    if (ev.button === 2) { orbiting = true; return; }
    if (ev.button !== 0) return;
    if (!castFrom(ev)) return;

    const hit = pick();
    if (hit) {
      selected = hit;
      dragging = hit;
      dragPlaneY = hit.y;
      refresh();
      return;
    }
    if (pendingSrc) {
      const at = groundAt();
      if (at) void placeAt(pendingSrc, at);
      return;
    }
    selected = null;
    refresh();
  };

  const onPointerMove = (ev: PointerEvent) => {
    if (orbiting) { host.look(ev.movementX, ev.movementY); return; }
    if (!dragging) return;
    if (!castFrom(ev)) return;
    const at = planeAt(dragPlaneY);
    if (!at) return;
    dragging.x = at.x;
    dragging.z = at.z;
    host.apply(dragging);
    refresh();
  };

  // `pointercancel` 도 같은 정리를 한다 — 터치에서 브라우저가 제스처를 가로채면
  // `pointerup` 이 **안 온다.** 그러면 `dragging` 이 영구히 남아 이후 모든 손가락이
  // 물건을 끌고 다닌다. 이 저장소는 이미 그 축을 안다(`builder.js` 의
  // *"브라우저가 제스처를 가로챌 때(pointercancel) — 커밋 없이 정리만"*) — 여기만 빠져 있었다.
  const onPointerUp = () => { dragging = null; orbiting = false; };

  // 캔버스 클릭이 포인터락으로 가는 것을 **캡처 단계**에서 끊는다(위 헤더 참조).
  const onClickCapture = (ev: Event) => {
    if (ev.target === canvas) ev.stopPropagation();
  };
  const onContextMenu = (ev: Event) => { if (ev.target === canvas) ev.preventDefault(); };

  // ── 키 ──────────────────────────────────────────────────────────────────
  // 주행 키(WASD·화살표·Shift)는 `main.ts` 가 소유한다. 여기서 쓰는 것은 그 목록에 없는
  // 것뿐이라 서로 가로채지 않는다.
  const EDIT_KEYS = new Set([
    'KeyQ', 'KeyE', 'KeyR', 'KeyF', 'KeyZ', 'KeyX', 'Delete', 'Backspace',
  ]);

  const onKeyDown = (ev: KeyboardEvent) => {
    const t = ev.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (!EDIT_KEYS.has(ev.code)) return;
    // ⚠ **말없이 죽지 않는다.** 예전에는 `if (!selected) return` 이 맨 위에 있어서
    // 아무것도 안 골랐을 때 편집키가 **침묵**했다 — 같은 조작의 패널 버튼은
    // *"먼저 물건을 클릭해 고르세요"* 라고 말하는데 키만 조용했다. 조작이 안 먹는 것과
    // 대상이 없는 것은 다른 일이고, 화면이 그것을 갈라 줘야 한다.
    if (!selected) { say('먼저 물건을 클릭해 고르세요.'); return; }
    ev.preventDefault();
    switch (ev.code) {
      case 'KeyQ': selected.ry -= RY_STEP; break;
      case 'KeyE': selected.ry += RY_STEP; break;
      case 'KeyR': selected.s = scaleBy(selected.s, S_STEP); break;
      case 'KeyF': selected.s = scaleBy(selected.s, 1 / S_STEP); break;
      case 'KeyZ': selected.y -= Y_STEP; break;
      case 'KeyX': selected.y += Y_STEP; break;
      // `Backspace` 도 받는다 — **맥 키보드에는 `Delete` 코드의 키가 없다**(그 자리가
      // `Backspace` 다). hint 가 "Del 삭제" 를 광고하는데 맥에서는 영구 무반응이었다.
      case 'Delete': case 'Backspace': removeSelected(); return;
    }
    host.apply(selected);
    refresh();
  };

  /** 모드 전환 단축키. 편집 중이 아닐 때도 들어야 하므로 **항상** 붙어 있다. */
  const onModeKey = (ev: KeyboardEvent) => {
    if (ev.code !== 'Tab') return;
    const t = ev.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    ev.preventDefault(); // 포커스 이동을 막는다 — 안 막으면 패널 버튼으로 포커스가 튄다
    setEditing(!editing);
  };

  // ── 끌어다 놓기 ─────────────────────────────────────────────────────────
  const onDragOver = (ev: DragEvent) => { ev.preventDefault(); };
  const onDrop = (ev: DragEvent) => {
    ev.preventDefault();
    const file = ev.dataTransfer?.files?.[0];
    if (!file) return;
    const src = `assets/models/${file.name}`;
    if (!isSafeSrc(src)) {
      // 계약(`decide/overlay.ts`)이 허용 문자를 정한다. 여기서 넓히지 않고 **왜 안 되는지**
      // 를 말한다 — 계약 주석이 *"거부 사유가 한 종류라 원인을 알 수 없다"* 고 남긴 자리다.
      say(`«${file.name}» 은 쓸 수 없는 이름입니다 — 영문·숫자·_ - . 만, 확장자는 소문자 .glb`, true);
      return;
    }
    if (!castFrom(ev)) return;
    const at = groundAt();
    if (!at) { say('지면이 보이는 쪽에 놓아 주세요.', true); return; }
    const url = URL.createObjectURL(file);
    opts.onBlobUrl(url);
    previewUrls.set(src, url);
    void placeAt(src, at, url);
  };

  // ── 팔레트 ──────────────────────────────────────────────────────────────
  void (async () => {
    let names: string[] = [];
    try {
      const res = await fetch(opts.modelsUrl, { cache: 'no-cache' });
      if (res.ok) {
        const j = (await res.json()) as { models?: unknown };
        if (Array.isArray(j.models)) names = j.models.filter((n): n is string => typeof n === 'string');
      }
    } catch { /* 목록이 없으면 끌어다 놓기만 쓴다 */ }
    if (names.length === 0) {
      palette.append(el('div', 'note', '커밋된 모델이 없습니다 — GLB 를 끌어다 놓으세요.'));
      return;
    }
    for (const n of names) {
      const src = `assets/models/${n}`;
      const b = button(n, () => {
        pendingSrc = pendingSrc === src ? null : src;
        say(pendingSrc ? '지면을 클릭하면 놓입니다.' : '고르기를 해제했습니다.');
        refresh();
      });
      b.dataset.src = src;
      palette.append(b);
    }
    refresh();
  })();

  // ── 내보내기 ────────────────────────────────────────────────────────────
  function exportNow(): void {
    const rev = reviewOverlay(host.toRaw());
    if (!rev.clean && !armed) {
      armed = true;
      const first = rev.badIndexes[0];
      if (first !== undefined) {
        selected = host.entries()[first] ?? null;
        refresh();
      }
      say(`⚠ ${rev.summary} — 한 번 더 누르면 이대로 저장합니다.`, true);
      return;
    }
    armed = false;
    const blob = new Blob([rev.json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = doc.createElement('a');
    a.href = url;
    a.download = 'world2-overlay.json';
    doc.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    say(`저장했습니다 · ${rev.summary}`);
  }

  // ── 배선 ────────────────────────────────────────────────────────────────
  // **편집 리스너는 편집 모드에서만 붙어 있다.** 주행 중에는 하나도 없으므로 이 모듈이
  // 주행에 미치는 영향이 **구조적으로 0** 이다 — 조건문으로 걸러내면 조건 하나가 새는
  // 순간 주행이 또 죽고, 그 실패는 감독 화면에서만 드러난다.
  let bound = false;

  function bindEditListeners(): void {
    if (bound) return;
    bound = true;
    doc.addEventListener('click', onClickCapture, true);
    doc.addEventListener('contextmenu', onContextMenu);
    doc.addEventListener('pointerdown', onPointerDown);
    doc.addEventListener('pointermove', onPointerMove);
    doc.addEventListener('pointerup', onPointerUp);
    doc.addEventListener('pointercancel', onPointerUp);
    doc.addEventListener('keydown', onKeyDown);
    doc.addEventListener('dragover', onDragOver);
    doc.addEventListener('drop', onDrop);
  }

  function unbindEditListeners(): void {
    if (!bound) return;
    bound = false;
    doc.removeEventListener('click', onClickCapture, true);
    doc.removeEventListener('contextmenu', onContextMenu);
    doc.removeEventListener('pointerdown', onPointerDown);
    doc.removeEventListener('pointermove', onPointerMove);
    doc.removeEventListener('pointerup', onPointerUp);
    doc.removeEventListener('pointercancel', onPointerUp);
    doc.removeEventListener('keydown', onKeyDown);
    doc.removeEventListener('dragover', onDragOver);
    doc.removeEventListener('drop', onDrop);
  }

  // 모드 키만 상시다 — 편집이 꺼져 있어도 `Tab` 으로 켤 수 있어야 한다.
  doc.addEventListener('keydown', onModeKey);

  say('편집하려면 오른쪽 위 「편집」 버튼(또는 Tab). 지금은 평소처럼 걸어다닐 수 있습니다.');
  refresh();

  return {
    dispose() {
      unbindEditListeners();
      doc.removeEventListener('keydown', onModeKey);
      panel.remove();
      style.remove();
      (host.root as unknown as { remove(o: never): void }).remove(marker as never);
      markerMat.dispose?.();
      markerGeo.dispose?.();
    },
  };
}
