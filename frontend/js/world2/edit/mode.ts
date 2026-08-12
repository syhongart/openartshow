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
  RingGeometry: new (inner: number, outer: number, seg: number) => unknown;
  MeshBasicMaterial: new (p: Record<string, unknown>) => { dispose?(): void };
  Box3: new () => { min: XYZ; max: XYZ; setFromObject(o: never): unknown };
  DoubleSide: number;
};

const CSS = `
#w2-edit{position:fixed;left:8px;top:8px;z-index:40;width:212px;font:11px/1.35 system-ui,sans-serif;
  color:#F5F5F2;background:rgba(11,13,18,.86);border:1px solid #3A3D4B;border-radius:10px;padding:8px;
  backdrop-filter:blur(6px);max-height:calc(100dvh - 16px);overflow:auto}
#w2-edit h4{margin:0 0 6px;font-size:11px;letter-spacing:.04em;color:#8B72FF}
#w2-edit .row{display:flex;gap:4px;flex-wrap:wrap;margin:4px 0}
#w2-edit button{flex:1 1 auto;min-width:30px;padding:4px 5px;font:11px/1 system-ui,sans-serif;
  color:#F5F5F2;background:#1A1D26;border:1px solid #3A3D4B;border-radius:6px;cursor:pointer}
#w2-edit button:hover{border-color:#8B72FF}
#w2-edit button[data-on="1"]{background:#8B72FF;border-color:#8B72FF;color:#0B0D12}
#w2-edit .note{color:#9A9EB1;margin:4px 0 0}
#w2-edit .warn{color:#FFC46B}
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
  const hint = el('div', 'note', '좌드래그 이동 · 우드래그 시점 · Q/E 회전 · R/F 크기 · Z/X 높이 · Del 삭제');

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

  panel.append(title, palette, el('hr'), selLine, rowRot, rowScale, rowY, rowOps,
    el('hr'), rowOut, status, hint);
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
      hint.textContent = '좌드래그 이동 · 우드래그 시점 · Q/E 회전 · R/F 크기 · Z/X 높이 · Del 삭제';
    }
    marker.visible = selected !== null;
    if (selected) placeMarker(selected);
  }

  // ── 선택 표시 ───────────────────────────────────────────────────────────
  // 바닥 링 하나. `MeshBasicMaterial` 은 이 저장소가 두 백엔드에서 이미 쓰는 수단이다
  // (`systems/horizon.ts` 헤더). gizmo 를 안 쓰는 것과 같은 이유로 헬퍼도 안 쓴다.
  const markerMat = new THREE.MeshBasicMaterial({
    color: 0x8b72ff, transparent: true, opacity: 0.85, depthTest: false, side: THREE.DoubleSide,
  });
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 40), markerMat);
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
  async function placeAt(src: string, at: { x: number; z: number }, blobUrl?: string): Promise<void> {
    say(`${src.replace(/^assets\/models\//, '')} 놓는 중…`);
    const e = await host.place(src, { x: at.x, y: host.surfaceAt(at.x, at.z), z: at.z }, blobUrl);
    if (!e) { say('로드에 실패했습니다 — 콘솔의 진단을 보세요.', true); return; }
    selected = e;
    say('놓았습니다. 끌어서 옮기세요.');
    refresh();
  }

  async function duplicate(): Promise<void> {
    if (!selected) { say('먼저 물건을 클릭해 고르세요.'); return; }
    const s = selected;
    const e = await host.place(
      s.src, { x: s.x + 2, y: s.y, z: s.z + 2, ry: s.ry, s: s.s },
      s.preview ? previewUrls.get(s.src) : undefined,
    );
    if (e) { selected = e; refresh(); }
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

  const onPointerUp = () => { dragging = null; orbiting = false; };

  // 캔버스 클릭이 포인터락으로 가는 것을 **캡처 단계**에서 끊는다(위 헤더 참조).
  const onClickCapture = (ev: Event) => {
    if (ev.target === canvas) ev.stopPropagation();
  };
  const onContextMenu = (ev: Event) => { if (ev.target === canvas) ev.preventDefault(); };

  // ── 키 ──────────────────────────────────────────────────────────────────
  // 주행 키(WASD·화살표·Shift)는 `main.ts` 가 소유한다. 여기서 쓰는 것은 그 목록에 없는
  // 것뿐이라 서로 가로채지 않는다.
  const onKeyDown = (ev: KeyboardEvent) => {
    if (!selected) return;
    const t = ev.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    let hit = true;
    switch (ev.code) {
      case 'KeyQ': selected.ry -= RY_STEP; break;
      case 'KeyE': selected.ry += RY_STEP; break;
      case 'KeyR': selected.s = scaleBy(selected.s, S_STEP); break;
      case 'KeyF': selected.s = scaleBy(selected.s, 1 / S_STEP); break;
      case 'KeyZ': selected.y -= Y_STEP; break;
      case 'KeyX': selected.y += Y_STEP; break;
      case 'Delete': removeSelected(); return;
      default: hit = false;
    }
    if (!hit) return;
    ev.preventDefault();
    host.apply(selected);
    refresh();
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
  // 편집에 들어오면 주행 모드의 포인터락을 먼저 푼다. 안 그러면 커서가 없는 채로 시작한다.
  try { doc.exitPointerLock?.(); } catch { /* 애초에 안 걸려 있었다 */ }

  doc.addEventListener('click', onClickCapture, true);
  doc.addEventListener('contextmenu', onContextMenu);
  doc.addEventListener('pointerdown', onPointerDown);
  doc.addEventListener('pointermove', onPointerMove);
  doc.addEventListener('pointerup', onPointerUp);
  doc.addEventListener('keydown', onKeyDown);
  doc.addEventListener('dragover', onDragOver);
  doc.addEventListener('drop', onDrop);

  refresh();

  return {
    dispose() {
      doc.removeEventListener('click', onClickCapture, true);
      doc.removeEventListener('contextmenu', onContextMenu);
      doc.removeEventListener('pointerdown', onPointerDown);
      doc.removeEventListener('pointermove', onPointerMove);
      doc.removeEventListener('pointerup', onPointerUp);
      doc.removeEventListener('keydown', onKeyDown);
      doc.removeEventListener('dragover', onDragOver);
      doc.removeEventListener('drop', onDrop);
      panel.remove();
      style.remove();
      markerMat.dispose?.();
    },
  };
}
