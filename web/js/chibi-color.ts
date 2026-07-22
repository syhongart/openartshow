// @ts-nocheck — 순수 이동(C-3 chibi 분해), strict 타입은 후속 작업.
// chibi-color.js — 색 hex 유틸(shade/shadeAlpha). 순수 함수(THREE.Color 기반).
// chibi.js에서 분해(C-3 S1). face·builder 공용.
import * as THREE from 'three';

export function shade(hexColor, factor) {
  const c = new THREE.Color(hexColor);
  c.multiplyScalar(factor);
  return `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
}
// 수염색 — 머리색을 어둡게. 피부색과 대비가 약하면 더 어둡게(가독 세이프가드).
export function shadeAlpha(hexColor, factor, alpha) {
  const c = new THREE.Color(hexColor);
  c.multiplyScalar(factor);
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${alpha})`;
}
