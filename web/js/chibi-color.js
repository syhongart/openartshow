import * as THREE from "three";
function shade(hexColor, factor) {
  const c = new THREE.Color(hexColor);
  c.multiplyScalar(factor);
  return `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
}
function shadeAlpha(hexColor, factor, alpha) {
  const c = new THREE.Color(hexColor);
  c.multiplyScalar(factor);
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${alpha})`;
}
export {
  shade,
  shadeAlpha
};
