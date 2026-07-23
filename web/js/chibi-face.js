import * as THREE from "three";
import { shade, shadeAlpha } from "./chibi-color.js";
import { vivid } from "./chibi-materials.js";
import { NONHUMAN } from "./chibi-schema.js";
function beardColor(p, alpha) {
  let factor = 0.6;
  const hc = new THREE.Color(p.hairColor);
  const sk = new THREE.Color(p.skin);
  const lumHC = 0.2126 * hc.r + 0.7152 * hc.g + 0.0722 * hc.b;
  const lumSK = 0.2126 * sk.r + 0.7152 * sk.g + 0.0722 * sk.b;
  if (Math.abs(lumHC * factor - lumSK) < 0.15) factor = 0.4;
  return shadeAlpha(p.hairColor, factor, alpha);
}
function drawBeard(ctx, p) {
  if (p.species !== "human" || !p.beardStyle || p.beardStyle === "none") return;
  const drawJawBeard = (alpha) => {
    ctx.fillStyle = beardColor(p, alpha);
    ctx.beginPath();
    ctx.moveTo(256 - 156, 322);
    ctx.quadraticCurveTo(256 - 168, 420, 256 - 78, 462);
    ctx.quadraticCurveTo(256, 480, 256 + 78, 462);
    ctx.quadraticCurveTo(256 + 168, 420, 256 + 156, 322);
    ctx.quadraticCurveTo(256 + 120, 348, 256 + 52, 392);
    ctx.quadraticCurveTo(256 + 26, 384, 256, 388);
    ctx.quadraticCurveTo(256 - 26, 384, 256 - 52, 392);
    ctx.quadraticCurveTo(256 - 120, 348, 256 - 156, 322);
    ctx.closePath();
    ctx.fill();
  };
  const drawGoatee = (alpha) => {
    ctx.fillStyle = beardColor(p, alpha);
    ctx.beginPath();
    ctx.moveTo(256 - 34, 392);
    ctx.quadraticCurveTo(256 - 48, 444, 256, 470);
    ctx.quadraticCurveTo(256 + 48, 444, 256 + 34, 392);
    ctx.quadraticCurveTo(256, 404, 256 - 34, 392);
    ctx.closePath();
    ctx.fill();
  };
  const drawMustache = () => {
    ctx.strokeStyle = beardColor(p, 0.92);
    ctx.lineWidth = 11;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(256 - 34, 344);
    ctx.quadraticCurveTo(256 - 14, 332, 256, 338);
    ctx.quadraticCurveTo(256 + 14, 332, 256 + 34, 344);
    ctx.stroke();
  };
  if (p.beardStyle === "stubble") {
    ctx.fillStyle = beardColor(p, 0.32);
    for (let row = 0; row < 6; row++) {
      const t = row / 5;
      const y = 392 + t * (448 - 392);
      const halfW = 132 * (1 - t) + 46 * t;
      const n = 10 - row;
      for (let i = 0; i < n; i++) {
        const jitter = (i * 7 + row * 13) % 5 - 2;
        const x = 256 - halfW + 2 * halfW * (n === 1 ? 0.5 : i / (n - 1)) + jitter;
        ctx.beginPath();
        ctx.arc(x, y + jitter * 0.6, 2 + i % 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (p.beardStyle === "mustache") {
    drawMustache();
  } else if (p.beardStyle === "goatee") {
    drawGoatee(0.85);
    drawMustache();
  } else if (p.beardStyle === "full") {
    drawJawBeard(0.85);
    drawMustache();
  }
}
function drawSparkle(ctx, x, y, r) {
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.28, y - r * 0.28);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x + r * 0.28, y + r * 0.28);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.28, y + r * 0.28);
  ctx.lineTo(x - r, y);
  ctx.lineTo(x - r * 0.28, y - r * 0.28);
  ctx.closePath();
  ctx.fill();
}
function drawEye(ctx, cx, cy, p) {
  const EW = 44, EH = 64;
  if (p.eyeStyle === "happy") {
    ctx.strokeStyle = "#2a2320";
    ctx.lineCap = "round";
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(cx, cy + 26, EW + 6, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.ellipse(cx, cy, EW + 7, EH + 5, 0, 0, Math.PI * 2);
  ctx.fill();
  const grad = ctx.createLinearGradient(cx, cy - EH, cx, cy + EH);
  grad.addColorStop(0, shade(p.eyeColor, 1.25));
  grad.addColorStop(0.55, p.eyeColor);
  grad.addColorStop(1, shade(p.eyeColor, 0.45));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, EW, EH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(25,18,14,0.9)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 6, EW * 0.42, EH * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.ellipse(cx - 14, cy - 22, 15, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 13, cy + 20, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  if (p.eyeStyle === "sparkle") drawSparkle(ctx, cx + 21, cy - 34, 7);
  ctx.strokeStyle = "#2a2320";
  ctx.lineCap = "round";
  ctx.lineWidth = p.eyeStyle === "round" ? 9 : 14;
  ctx.beginPath();
  ctx.arc(cx, cy - 4, EW + 9, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
}
function drawAnimalFace(ctx, species, MY) {
  const NY = 302;
  if (species === "chick" || species === "penguin" || species === "pig") return;
  const NOSE_3D = species === "dog" || species === "fox" || species === "bear" || species === "raccoon" || species === "panda" || species === "rabbit" || species === "cat" || species === "koala";
  if (!NOSE_3D) {
    const bigNose = species === "koala";
    const pinkNose = species === "cat" || species === "hamster";
    const noseCol = pinkNose ? "#e88ba0" : "#2a2724";
    const nk = bigNose ? 2 : 1;
    ctx.fillStyle = noseCol;
    ctx.beginPath();
    ctx.moveTo(256 - 15 * nk, NY - 8 * nk);
    ctx.quadraticCurveTo(256 - 17 * nk, NY + 6 * nk, 256, NY + 15 * nk);
    ctx.quadraticCurveTo(256 + 17 * nk, NY + 6 * nk, 256 + 15 * nk, NY - 8 * nk);
    ctx.quadraticCurveTo(256, NY - 13 * nk, 256 - 15 * nk, NY - 8 * nk);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(70,58,48,0.5)";
    ctx.lineCap = "round";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(256, NY + 14);
    ctx.lineTo(256, MY - 18);
    ctx.stroke();
  }
  if (species === "tiger") {
    ctx.strokeStyle = "rgba(38,26,18,0.85)";
    ctx.lineCap = "round";
    ctx.lineWidth = 10;
    for (const [x, y1, y2] of [[256 - 44, 148, 196], [256 + 44, 148, 196], [256 - 88, 166, 206], [256 + 88, 166, 206]]) {
      ctx.beginPath();
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
      ctx.stroke();
    }
    ctx.lineWidth = 8;
    for (const s of [-1, 1]) for (const dy of [0, 26]) {
      ctx.beginPath();
      ctx.moveTo(256 + s * 128, 300 + dy);
      ctx.lineTo(256 + s * 172, 296 + dy);
      ctx.stroke();
    }
  }
  if (species === "cat" || species === "fox" || species === "tiger") {
    ctx.strokeStyle = "rgba(70,58,48,0.45)";
    ctx.lineWidth = 4;
    for (const s of [-1, 1]) {
      for (const [dy, len, curve] of [[-10, 96, -14], [4, 104, 0], [18, 96, 14]]) {
        ctx.beginPath();
        ctx.moveTo(256 + s * 30, NY + dy);
        ctx.quadraticCurveTo(256 + s * (30 + len * 0.5), NY + dy + curve * 0.3, 256 + s * (30 + len), NY + dy + curve);
        ctx.stroke();
      }
    }
  }
  if (species === "rabbit") {
    ctx.fillStyle = "#fffdf7";
    ctx.strokeStyle = "rgba(70,58,48,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(256 - 13, MY + 2, 26, 22, 5) : ctx.rect(256 - 13, MY + 2, 26, 22);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(256, MY + 2);
    ctx.lineTo(256, MY + 24);
    ctx.stroke();
  }
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}
function drawRobotEyes(ctx, p) {
  const EYE_Y = 252, EYE_X = 84;
  for (const s of [-1, 1]) {
    const cx = 256 + s * EYE_X, cy = EYE_Y;
    ctx.fillStyle = shade(p.skin, 0.45);
    rrect(ctx, cx - 38, cy - 46, 76, 92, 16);
    ctx.fill();
    const g = ctx.createLinearGradient(cx, cy - 38, cx, cy + 38);
    g.addColorStop(0, shade(p.hairColor, 1.3));
    g.addColorStop(1, vivid(p.hairColor).getStyle());
    ctx.fillStyle = g;
    rrect(ctx, cx - 30, cy - 38, 60, 76, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy);
    ctx.lineTo(cx + 26, cy);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.ellipse(cx - 12, cy - 20, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawRobotMouth(ctx, p) {
  const MY = 364;
  ctx.fillStyle = shade(p.skin, 0.4);
  for (const y of [MY - 14, MY, MY + 14]) {
    rrect(ctx, 256 - 26, y - 4, 52, 8, 4);
    ctx.fill();
  }
}
function drawGhostEyes(ctx) {
  const EYE_Y = 252, EYE_X = 84;
  for (const s of [-1, 1]) {
    const cx = 256 + s * EYE_X;
    ctx.fillStyle = "#3a3f4a";
    ctx.beginPath();
    ctx.ellipse(cx, EYE_Y, 34, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.ellipse(cx - 10, EYE_Y - 14, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawFaceInto(canvas, p, fx) {
  const wound = fx && fx.wound || 0;
  const ouch = !!(fx && fx.ouch);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 512, 512);
  const EYE_Y = 252;
  const EYE_X = 84;
  const isAnimal = p.species && p.species !== "human" && !NONHUMAN.has(p.species);
  if (p.species === "tiger" && !ouch) {
    const oc = vivid(p.skin).getStyle();
    const g = ctx.createRadialGradient(256, 300, 70, 256, 300, 250);
    g.addColorStop(0, oc);
    g.addColorStop(0.68, oc);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
  }
  if (!ouch) {
    if (p.species === "panda") {
      ctx.fillStyle = "#2a2724";
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(256 + s * EYE_X, EYE_Y + 4);
        ctx.rotate(s * 0.32);
        ctx.beginPath();
        ctx.ellipse(0, 0, 58, 72, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (p.species === "raccoon") {
      ctx.fillStyle = "#43392f";
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(256 + s * (EYE_X + 6), EYE_Y);
        ctx.rotate(s * 0.28);
        ctx.beginPath();
        ctx.ellipse(0, 0, 50, 60, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (p.species === "penguin") {
      ctx.fillStyle = "#fbfaf7";
      ctx.beginPath();
      ctx.ellipse(256, EYE_Y + 44, 188, 210, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const canvasEyes = p.species !== "frog";
  if (ouch && canvasEyes) {
    ctx.strokeStyle = "#2a2320";
    ctx.lineCap = "round";
    ctx.lineWidth = 15;
    for (const s of [-1, 1]) {
      const cx = 256 + s * EYE_X;
      ctx.beginPath();
      ctx.moveTo(cx - s * 34, EYE_Y - 30);
      ctx.lineTo(cx + s * 24, EYE_Y + 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 34, EYE_Y + 34);
      ctx.lineTo(cx + s * 24, EYE_Y + 2);
      ctx.stroke();
    }
  } else if (canvasEyes) {
    if (p.species === "robot") drawRobotEyes(ctx, p);
    else if (p.species === "ghost") drawGhostEyes(ctx);
    else {
      drawEye(ctx, 256 - EYE_X, EYE_Y, p);
      drawEye(ctx, 256 + EYE_X, EYE_Y, p);
    }
  }
  if (canvasEyes && !NONHUMAN.has(p.species) && !(p.species === "panda" && !ouch && !(wound >= 2))) {
    ctx.strokeStyle = isAnimal ? shade(p.skin, 0.55) : shade(p.hairColor, 0.8);
    ctx.lineCap = "round";
    ctx.lineWidth = 9;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      if (ouch) {
        ctx.moveTo(256 + s * 58, EYE_Y - 92);
        ctx.lineTo(256 + s * 112, EYE_Y - 72);
      } else if (wound >= 2) {
        ctx.moveTo(256 + s * 60, EYE_Y - 74);
        ctx.lineTo(256 + s * 112, EYE_Y - 94);
      } else {
        ctx.arc(256 + s * EYE_X, EYE_Y - 58, 36, Math.PI * 1.25, Math.PI * 1.75);
      }
      ctx.stroke();
    }
  }
  const MY = 364;
  ctx.strokeStyle = "#b0605a";
  ctx.lineCap = "round";
  if (!ouch && p.species === "robot") {
    drawRobotMouth(ctx, p);
  } else if (ouch) {
    ctx.fillStyle = "#a14a44";
    ctx.beginPath();
    ctx.ellipse(256, MY, 34, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e58a80";
    ctx.beginPath();
    ctx.ellipse(256, MY + 12, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.mouth === "cat") {
    ctx.lineWidth = 8;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(256 + s * 12, MY - 6, 13, s === -1 ? 0.15 * Math.PI : 0.35 * Math.PI, s === -1 ? 0.65 * Math.PI : 0.85 * Math.PI);
      ctx.stroke();
    }
  } else if (p.mouth === "open") {
    ctx.fillStyle = "#a14a44";
    ctx.beginPath();
    ctx.ellipse(256, MY, 19, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e58a80";
    ctx.beginPath();
    ctx.ellipse(256, MY + 7, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(256, MY - 10, 20, 0.22 * Math.PI, 0.78 * Math.PI);
    ctx.stroke();
  }
  if (isAnimal && !ouch) drawAnimalFace(ctx, p.species, MY);
  if (!ouch) drawBeard(ctx, p);
  if (p.blush && !ouch && p.species !== "robot") {
    ctx.fillStyle = "rgba(255,105,110,0.6)";
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(256 + s * 150, 338, 46, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (wound >= 1) {
    ctx.save();
    ctx.translate(256 + 152, 326);
    ctx.rotate(-0.5);
    ctx.fillStyle = "#e8c9a0";
    ctx.fillRect(-40, -13, 80, 26);
    ctx.fillStyle = "#d9b88d";
    ctx.fillRect(-15, -13, 30, 26);
    ctx.restore();
  }
  if (wound >= 2) {
    ctx.fillStyle = "rgba(110,90,200,0.45)";
    ctx.beginPath();
    ctx.ellipse(256 - 152, 320, 32, 21, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (wound >= 3 && !ouch) {
    ctx.fillStyle = "rgba(130,185,255,0.85)";
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(256 + s * 88, EYE_Y + 80, 10, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
function drawFaceCanvas(p) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  drawFaceInto(canvas, p, null);
  return canvas;
}
export {
  drawFaceCanvas,
  drawFaceInto
};
