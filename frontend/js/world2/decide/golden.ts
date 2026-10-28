// world2/decide/golden.ts — 황금비. **한 곳에서만 정의한다.**
//
// `features/ocean.ts` 와 `decide/wave.ts` 가 둘 다 이 값을 쓴다. 양쪽에 적으면 값
// 미러링이고, 이 저장소는 그것으로 이미 세 번 사고를 냈다(캔버스 색·구름 고도·테스트
// 임계값). 파장비를 정수비에서 멀리 두는 근거가 이 무리수라서, 한쪽만 바뀌면 그 근거가
// 조용히 무너진다.
export const PHI = (1 + Math.sqrt(5)) / 2;
