// feed.js 단위테스트 — 커뮤니티 피드 저장소(방문자 로그·포토월)의 회귀 안전망.
// 검증 순수함수(isValidPhotoItem)와 스토어 계약(id 멱등 병합·ts 내림차순·상한 절단)을 고정.
// 설계상 Storage는 주입 가능(D: 의존성 역전)하므로 localStorage 없이 node 환경에서 순수 테스트.
import { describe, it, expect } from 'vitest';
import { VisitorLog, PhotoWall, isValidPhotoItem } from '../frontend/js/feed.js';

// getItem/setItem 호환 인메모리 스토리지(주입) — jsdom 없이 결정적 테스트
function makeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
  };
}

const goodThumb = 'data:image/jpeg;base64,' + 'A'.repeat(50);

describe('isValidPhotoItem — 사진 항목 화이트리스트 검증', () => {
  it('정상 항목(jpeg base64·id≤40·크기 이하)은 true', () => {
    expect(isValidPhotoItem({ id: 'p1', thumb: goodThumb })).toBe(true);
  });

  it('id 길이 경계: 40자 통과, 41자 거부', () => {
    expect(isValidPhotoItem({ id: 'a'.repeat(40), thumb: goodThumb })).toBe(true);
    expect(isValidPhotoItem({ id: 'a'.repeat(41), thumb: goodThumb })).toBe(false);
  });

  it('id가 없거나 문자열이 아니면 거부', () => {
    expect(isValidPhotoItem({ thumb: goodThumb })).toBe(false);
    expect(isValidPhotoItem({ id: 123, thumb: goodThumb })).toBe(false);
  });

  it('jpeg base64 접두어가 아니면 거부(png·임의 문자열)', () => {
    expect(isValidPhotoItem({ id: 'p', thumb: 'data:image/png;base64,AAAA' })).toBe(false);
    expect(isValidPhotoItem({ id: 'p', thumb: 'notdata' })).toBe(false);
  });

  it('thumb 문자열 길이 상한(120000) 초과는 거부', () => {
    const big = 'data:image/jpeg;base64,' + 'A'.repeat(120001);
    expect(isValidPhotoItem({ id: 'p', thumb: big })).toBe(false);
  });

  it('null·undefined·빈 객체는 거부', () => {
    expect(isValidPhotoItem(null)).toBe(false);
    expect(isValidPhotoItem(undefined)).toBe(false);
    expect(isValidPhotoItem({})).toBe(false);
  });
});

describe('VisitorLog — 방문자 로그', () => {
  it('add는 nickname 20자·galleryName 40자로 자른 항목을 남긴다', () => {
    const vl = new VisitorLog(makeStorage());
    vl.add('가'.repeat(30), '전'.repeat(60));
    const [v] = vl.list();
    expect(v.name).toHaveLength(20);
    expect(v.g).toHaveLength(40);
  });

  it('falsy nickname은 "게스트"로 대체', () => {
    const vl = new VisitorLog(makeStorage());
    vl.add('', '');
    expect(vl.list()[0].name).toBe('게스트');
  });

  it('여러 방문은 누적되고 최신(ts 큰) 순으로 정렬', () => {
    const vl = new VisitorLog(makeStorage());
    vl.add('a', 'g');
    vl.add('b', 'g');
    const list = vl.list();
    expect(list).toHaveLength(2);
    expect(list[0].ts).toBeGreaterThanOrEqual(list[1].ts);
  });

  it('상한 40명 초과분은 절단', () => {
    const store = makeStorage();
    for (let i = 0; i < 45; i++) new VisitorLog(store).add('u' + i, 'g');
    expect(new VisitorLog(store).list()).toHaveLength(40);
  });

  it('스토리지 없으면(주입도 전역도 없음) 빈 리스트로 안전 동작', () => {
    // 전역 localStorage가 없는 node 환경에서 storage 미주입 → load는 []
    const vl = new VisitorLog(null);
    expect(vl.list()).toEqual([]);
  });
});

describe('PhotoWall — 포토월(로컬 캡처·원격 전파)', () => {
  it('addLocal은 유효 썸네일이면 항목을 저장·반환', () => {
    const pw = new PhotoWall(makeStorage());
    const item = pw.addLocal('me', 'g', goodThumb);
    expect(item).not.toBeNull();
    expect(pw.list()).toHaveLength(1);
  });

  it('addLocal은 무효 썸네일이면 null 반환·미저장', () => {
    const pw = new PhotoWall(makeStorage());
    expect(pw.addLocal('me', 'g', 'notdata')).toBeNull();
    expect(pw.list()).toHaveLength(0);
  });

  it('addRemote는 검증 통과분만 병합(무효는 무시)', () => {
    const pw = new PhotoWall(makeStorage());
    pw.addRemote({ id: 'r1', thumb: goodThumb, ts: 1 });
    pw.addRemote({ id: 'bad', thumb: 'nope', ts: 2 });
    expect(pw.list().map((p) => p.id)).toEqual(['r1']);
  });

  it('병합은 id 멱등 — 같은 항목이 여러 번 도착해도 중복 없음(CRDT-lite)', () => {
    const pw = new PhotoWall(makeStorage());
    pw.addRemote({ id: 'dup', thumb: goodThumb, ts: 5 });
    pw.addRemote({ id: 'dup', thumb: goodThumb, ts: 5 });
    expect(pw.list().filter((p) => p.id === 'dup')).toHaveLength(1);
  });

  it('ts 내림차순 정렬·상한 12장 절단', () => {
    const pw = new PhotoWall(makeStorage());
    // ts는 1부터 — 0은 아래 케이스대로 Date.now()로 대체되어 순서가 흔들리므로 분리
    for (let i = 1; i <= 20; i++) pw.addRemote({ id: 'p' + i, thumb: goodThumb, ts: i });
    const list = pw.list();
    expect(list).toHaveLength(12);
    expect(list[0].ts).toBe(20); // 최신
    expect(list[list.length - 1].ts).toBe(9); // 최신 12장만
  });

  it('ts가 0/누락이면 Date.now()로 대체된다(현 동작 고정 — Number(0)||Date.now())', () => {
    const pw = new PhotoWall(makeStorage());
    const before = Date.now();
    pw.addRemote({ id: 'z', thumb: goodThumb, ts: 0 });
    const [p] = pw.list();
    expect(p.ts).toBeGreaterThanOrEqual(before); // 0이 아니라 현재시각으로 채워짐
  });

  it('addRemote 저장 항목의 name·g는 각각 20·40자로 정규화', () => {
    const pw = new PhotoWall(makeStorage());
    pw.addRemote({ id: 'r', name: 'x'.repeat(30), g: 'y'.repeat(60), thumb: goodThumb, ts: 1 });
    const [p] = pw.list();
    expect(p.name).toHaveLength(20);
    expect(p.g).toHaveLength(40);
  });
});
