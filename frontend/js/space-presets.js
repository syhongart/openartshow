import { FOOTPRINT, PART_TYPES } from "./space.js";
const northArt = (z = -3.4) => [
  { t: "artwork", x: -3, z, ry: 0, frame: "minimal", src: "" },
  { t: "artwork", x: 0, z, ry: 0, frame: "minimal", src: "", featured: true },
  { t: "artwork", x: 3, z, ry: 0, frame: "minimal", src: "" }
];
const SPACE_PRESETS = [
  {
    id: "minimal-white",
    name: "\uBBF8\uB2C8\uBA40 \uD654\uC774\uD2B8",
    desc: "\uD654\uC774\uD2B8 \uBCBD \xB7 \uD30C\uCF00 \uBC14\uB2E5 \xB7 \uB525\uBC14\uC774\uC62C\uB81B \uD53C\uCC98\uC6D4",
    space: {
      version: 2,
      meta: { name: "\uBBF8\uB2C8\uBA40 \uD654\uC774\uD2B8", author: "" },
      shell: { footprint: "medium", storyH: "gallery", wallT: 0.2, finish: { wall: "white", floor: "parquet", ceiling: "whiteflat", trim: "brass", featureWall: "north", featureFinish: "deepviolet" } },
      spawn: { x: 0, z: 3, ry: 0 },
      parts: [
        ...northArt(),
        { t: "pedestal", x: -1.4, z: -0.4, ry: 0 },
        { t: "pedestal", x: 1.4, z: -0.4, ry: 0 },
        { t: "bench", x: 0, z: 1, ry: 0, size: 1.8 },
        { t: "rug", x: 0, z: 0.2, ry: 0, variant: "rect", color: "#c9bfae" },
        { t: "trackLight", x: -3, z: -3, ry: 0 },
        { t: "trackLight", x: 0, z: -3, ry: 0 },
        { t: "trackLight", x: 3, z: -3, ry: 0 }
      ]
    }
  },
  {
    id: "kintsugi-lounge",
    name: "\uAE08\uACC4 \uB77C\uC6B4\uC9C0",
    desc: "\uC6DC\uC0CC\uB4DC \uBCBD \xB7 \uD14C\uB77C\uC870 \uBC14\uB2E5 \xB7 \uAE08\uACC4 \uD53C\uCC98\uC6D4",
    space: {
      version: 2,
      meta: { name: "\uAE08\uACC4 \uB77C\uC6B4\uC9C0", author: "" },
      shell: { footprint: "medium", storyH: "gallery", wallT: 0.2, finish: { wall: "warmsand", floor: "terrazzo", ceiling: "whiteflat", trim: "brass", featureWall: "north", featureFinish: "kintsugi" } },
      spawn: { x: 0, z: 3, ry: 0 },
      parts: [
        ...northArt(),
        { t: "bench", x: -1.2, z: 0.6, ry: 0, size: 1.2 },
        { t: "bench", x: 1.2, z: 0.6, ry: 0, size: 1.2 },
        { t: "planter", x: -3.8, z: 2.3, ry: 0 },
        { t: "planter", x: 3.8, z: 2.3, ry: 0 },
        { t: "rug", x: 0, z: 0.4, ry: 0, variant: "round", color: "#d8c6a6" },
        { t: "pendantLight", x: -1.5, z: -1.4, ry: 0 },
        { t: "pendantLight", x: 1.5, z: -1.4, ry: 0 },
        { t: "trackLight", x: -3, z: -3, ry: 0 },
        { t: "trackLight", x: 0, z: -3, ry: 0 },
        { t: "trackLight", x: 3, z: -3, ry: 0 }
      ]
    }
  },
  {
    id: "garden-gallery",
    name: "\uC815\uC6D0 \uAC24\uB7EC\uB9AC",
    desc: "\uC794\uB514 \uBC14\uB2E5 \xB7 \uD654\uC774\uD2B8 \uBCBD \xB7 \uD654\uBD84 \uC815\uC6D0",
    space: {
      version: 2,
      meta: { name: "\uC815\uC6D0 \uAC24\uB7EC\uB9AC", author: "" },
      shell: { footprint: "medium", storyH: "gallery", wallT: 0.2, finish: { wall: "white", floor: "grass", ceiling: "whiteflat", trim: "brass", featureWall: "north", featureFinish: "deepviolet" } },
      spawn: { x: 0, z: 3, ry: 0 },
      parts: [
        ...northArt(),
        { t: "planter", x: -3.6, z: 0, ry: 0 },
        { t: "planter", x: 3.6, z: 0, ry: 0 },
        { t: "planter", x: -2, z: 2.2, ry: 0 },
        { t: "planter", x: 2, z: 2.2, ry: 0 },
        { t: "pedestal", x: 0, z: -0.2, ry: 0 },
        { t: "labelStand", x: 0.9, z: -0.2, ry: 0 },
        { t: "bench", x: 0, z: 1.4, ry: 0, size: 1.8 },
        { t: "trackLight", x: -3, z: -3, ry: 0 },
        { t: "trackLight", x: 0, z: -3, ry: 0 },
        { t: "trackLight", x: 3, z: -3, ry: 0 }
      ]
    }
  },
  {
    id: "water-meditation",
    name: "\uBA85\uC0C1 \uC218\uBC18",
    desc: "\uBB3C \uBC14\uB2E5 \xB7 \uCC28\uCF5C \uBCBD \xB7 \uC808\uC81C\uB41C \uC820 \uACF5\uAC04",
    space: {
      version: 2,
      meta: { name: "\uBA85\uC0C1 \uC218\uBC18", author: "" },
      shell: { footprint: "small", storyH: "studio", wallT: 0.2, finish: { wall: "charcoal", floor: "water", ceiling: "darkmatte", trim: "charcoal", featureWall: "north", featureFinish: "deepviolet" } },
      spawn: { x: 0, z: 2.2, ry: 0 },
      parts: [
        { t: "artwork", x: -1.4, z: -2.4, ry: 0, frame: "frameless", src: "" },
        { t: "artwork", x: 1.4, z: -2.4, ry: 0, frame: "frameless", src: "", featured: true },
        { t: "pedestal", x: 0, z: 0, ry: 0 },
        { t: "trackLight", x: -1.4, z: -2.1, ry: 0 },
        { t: "trackLight", x: 1.4, z: -2.1, ry: 0 }
      ]
    }
  },
  {
    id: "grand-hall",
    name: "\uB300\uD615 \uC804\uC2DC\uD640",
    desc: "\uCF58\uD06C\uB9AC\uD2B8 \uBC14\uB2E5 \xB7 \uCC28\uCF5C \uBCBD \xB7 \uAE30\uB465\xB7\uD30C\uD2F0\uC158 \uB300\uACF5\uAC04",
    space: {
      version: 2,
      meta: { name: "\uB300\uD615 \uC804\uC2DC\uD640", author: "" },
      shell: { footprint: "large", storyH: "grand", wallT: 0.2, finish: { wall: "charcoal", floor: "concrete", ceiling: "darkmatte", trim: "charcoal", featureWall: "north", featureFinish: "deepviolet" } },
      spawn: { x: 0, z: 4.4, ry: 0 },
      parts: [
        { t: "artwork", x: -4.5, z: -4.7, ry: 0, frame: "classic", src: "" },
        { t: "artwork", x: -1.5, z: -4.7, ry: 0, frame: "classic", src: "", featured: true },
        { t: "artwork", x: 1.5, z: -4.7, ry: 0, frame: "classic", src: "" },
        { t: "artwork", x: 4.5, z: -4.7, ry: 0, frame: "classic", src: "" },
        { t: "pillar", x: -3.5, z: -1, ry: 0 },
        { t: "pillar", x: 3.5, z: -1, ry: 0 },
        { t: "partition", x: 0, z: -1.5, ry: 0 },
        { t: "pedestal", x: -1.8, z: 0.6, ry: 0 },
        { t: "pedestal", x: 1.8, z: 0.6, ry: 0 },
        { t: "bench", x: 0, z: 2.4, ry: 0, size: 1.8 },
        { t: "rug", x: 0, z: 0.6, ry: 0, variant: "rect", color: "#8f8d88" },
        { t: "trackLight", x: -4.5, z: -4.3, ry: 0 },
        { t: "trackLight", x: -1.5, z: -4.3, ry: 0 },
        { t: "trackLight", x: 1.5, z: -4.3, ry: 0 },
        { t: "trackLight", x: 4.5, z: -4.3, ry: 0 }
      ]
    }
  }
];
const PRESET_IDS = new Set(SPACE_PRESETS.map((p) => p.id));
function getPreset(id) {
  return SPACE_PRESETS.find((p) => p.id === id) || null;
}
const FLOOR_COL = { parquet: "#b98a53", terrazzo: "#d8d2c6", concrete: "#8f8d88", grass: "#5b8746", water: "#22505f" };
const CAT_COL = { structure: "#9aa0aa", exhibit: "#8b72ff", ambience: "#72e6e1", event: "#f4a3ab", finish: "#cbb994" };
const FEATURE_COL = { deepviolet: "#4a4560", kintsugi: "#c39a4a", charcoal: "#3a3a40", warmsand: "#e6d8bf" };
function presetThumb(space, size = 132) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const x = c.getContext("2d");
  const [fw, fd] = FOOTPRINT[space.shell.footprint] || [9, 7];
  x.fillStyle = "#14151a";
  x.fillRect(0, 0, size, size);
  const pad = 12, span = size - pad * 2;
  const s = span / Math.max(fw, fd);
  const rw = fw * s, rh = fd * s, ox = (size - rw) / 2, oy = (size - rh) / 2;
  const wx = (wx0) => ox + (wx0 + fw / 2) * s, wz = (wz0) => oy + (wz0 + fd / 2) * s;
  x.fillStyle = FLOOR_COL[space.shell.finish.floor] || "#b98a53";
  x.fillRect(ox, oy, rw, rh);
  x.strokeStyle = "rgba(255,255,255,.28)";
  x.lineWidth = 2;
  x.strokeRect(ox, oy, rw, rh);
  const fwSide = space.shell.finish.featureWall;
  if (fwSide && fwSide !== "none") {
    x.strokeStyle = FEATURE_COL[space.shell.finish.featureFinish] || "#4a4560";
    x.lineWidth = 3.5;
    x.beginPath();
    if (fwSide === "north") {
      x.moveTo(ox + 3, oy + 1.5);
      x.lineTo(ox + rw - 3, oy + 1.5);
    } else if (fwSide === "south") {
      x.moveTo(ox + 3, oy + rh - 1.5);
      x.lineTo(ox + rw - 3, oy + rh - 1.5);
    } else if (fwSide === "west") {
      x.moveTo(ox + 1.5, oy + 3);
      x.lineTo(ox + 1.5, oy + rh - 3);
    } else if (fwSide === "east") {
      x.moveTo(ox + rw - 1.5, oy + 3);
      x.lineTo(ox + rw - 1.5, oy + rh - 3);
    }
    x.stroke();
  }
  for (const p of space.parts) {
    const spec = PART_TYPES[p.t];
    if (!spec) continue;
    x.fillStyle = CAT_COL[spec.cat] || "#cbb994";
    const px = wx(p.x), pz = wz(p.z), r = spec.art ? 2.6 : 2;
    x.beginPath();
    x.arc(px, pz, r, 0, 6.2832);
    x.fill();
  }
  return c.toDataURL("image/png");
}
export {
  PRESET_IDS,
  SPACE_PRESETS,
  getPreset,
  northArt,
  presetThumb
};
