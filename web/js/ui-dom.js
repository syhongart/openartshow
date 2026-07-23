const GOLD = "#5f9e7d";
function injectStyles() {
  const css = `
/* \uD3F0\uD2B8(@font-face\xB7\uC2A4\uD0DD)\uB294 SSOT\uC778 vendor/fonts/fonts.css\uAC00 \uB2F4\uB2F9 \u2014 index.html <head>\uC5D0\uC11C
   \uC815\uC801 <link>\uB85C \uB85C\uB4DC\uB41C\uB2E4. \uC5EC\uAE30\uC120 \uADF8 \uB2E8\uC77C \uC2A4\uD0DD(--app-font)\uB9CC --lu-font\uB85C \uC787\uB294\uB2E4. */
:root {
  --lu-gold: ${GOLD};
  --lu-ink: #17140f;
  /* Gilded Frame HUD \uD1A0\uD070 \u2014 \uCC54\uD37C 2\uB2E8\uACC4 + \uBAA8\uC158 (\uAC8C\uC784 HUD \uB514\uC790\uC778 \uAC10\uC0AC v1.0) */
  --lu-ch-s: 7px;
  --lu-ch-l: 14px;
  --lu-spring: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  --lu-slide: 0.36s cubic-bezier(0.22, 1, 0.36, 1);
  --lu-font: var(--app-font);
}
/* \uC2E4\uB8E8\uC5E3 \u2014 \uB77C\uC6B4\uB4DC 2\uB2E8\uACC4 (\uCC54\uD37C \uCEF7\uC740 clip-path\uAC00 \uBCF4\uB354\uB97C \uB300\uAC01\uC120\uC5D0\uC11C \uB04A\uC5B4
   \uBAA8\uC11C\uB9AC\uAC00 \uB35C \uB9CC\uB4E0 \uAC83\uCC98\uB7FC \uBCF4\uC600\uC74C \u2014 \uAC10\uB3C5 \uD53C\uB4DC\uBC31\uC73C\uB85C \uB77C\uC6B4\uB4DC \uD68C\uADC0) */
.lu-cut-s { border-radius: 10px; }
.lu-cut-l { border-radius: 16px; }

/* \uD3EC\uD14C\uC774\uD1A0 \uBAA8\uB4DC(\uC18C\uD504\uD2B8\uC6E8\uC5B4 \uB80C\uB354\uB9C1 \uAC10\uC9C0) \u2014 \uD558\uB4DC\uC6E8\uC5B4 \uAC00\uC18D\uC774 \uAEBC\uC9C4 \uD658\uACBD\uC5D0\uC11C\uB294
   \uCEF4\uD3EC\uC9C0\uD130\uB3C4 CPU\uB77C backdrop-filter\uAC00 \uB9E4 \uD504\uB808\uC784 CPU \uBE14\uB7EC\uAC00 \uB41C\uB2E4. \uC804\uBD80 \uD574\uC81C\uD558\uACE0
   \uBD88\uD22C\uBA85\uB3C4\uB97C \uC62C\uB824 \uAC00\uB3C5\uC131\uC744 \uC720\uC9C0\uD55C\uB2E4. */
.lu-potato #lu-dock .lu-dock-btn, .lu-potato #lu-controls,
.lu-potato #lu-topbar, .lu-potato #lu-status, .lu-potato #lu-topright .lu-stat,
.lu-potato #lu-controls-toggle, .lu-potato #lu-more-sheet, .lu-potato .lu-chat-msg,
.lu-potato #lu-gbtab {
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}
.lu-potato #lu-topbar, .lu-potato .lu-dock-btn, .lu-potato #lu-controls-toggle,
.lu-potato #lu-status, .lu-potato #lu-topright .lu-stat {
  background: rgba(23,20,15,0.88);
}

.lu * { box-sizing: border-box; margin: 0; padding: 0; }

.lu {
  font-family: var(--lu-font);
  font-weight: 300;
  -webkit-font-smoothing: antialiased;
  color: #fff;
  user-select: none;
}

/* ------------------------------ \uB85C\uB529 \uC624\uBC84\uB808\uC774 ------------------------------ */
#lu-loading {
  position: fixed; inset: 0; z-index: 1000;
  background: #000;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 28px;
  transition: opacity 0.5s ease;
}
#lu-loading.lu-hidden { opacity: 0; pointer-events: none; }
.lu-spinner {
  width: 44px; height: 44px;
  border: 1px solid rgba(255,255,255,0.15);
  border-top-color: var(--lu-gold);
  border-radius: 50%;
  animation: lu-spin 0.9s linear infinite;
}
@keyframes lu-spin { to { transform: rotate(360deg); } }
.lu-loading-text {
  font-size: 13px; letter-spacing: 0.5em; text-indent: 0.5em;
  color: rgba(255,255,255,0.75);
  animation: lu-pulse 1.8s ease-in-out infinite;
}
@keyframes lu-pulse { 0%,100% { opacity: 0.45; } 50% { opacity: 1; } }

/* ------------------------------ \uB85C\uBE44 \uC624\uBC84\uB808\uC774 ------------------------------ */
#lu-lobby {
  position: fixed; inset: 0; z-index: 900;
  background: rgba(8,8,10,0.72);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  transition: opacity 0.6s ease;
}
#lu-lobby.lu-hidden { opacity: 0; pointer-events: none; }
.lu-lobby-card {
  width: 100%; max-width: 400px;
  background: rgba(255,255,255,0.97);
  color: #111;
  padding: 44px 36px 36px;
  box-shadow: 0 30px 80px rgba(0,0,0,0.5);
  text-align: center;
}
.lu-lobby-title {
  font-size: 24px; font-weight: 300;
  letter-spacing: 0.32em; text-indent: 0.32em;
  color: #111;
}
.lu-lobby-sub {
  margin-top: 10px;
  font-size: 11px; letter-spacing: 0.18em; text-indent: 0.18em;
  color: #999;
}
.lu-lobby-rule {
  width: 36px; height: 1px; background: var(--lu-gold);
  margin: 22px auto;
}
.lu-field-label {
  display: block; text-align: left;
  font-size: 11px; letter-spacing: 0.12em;
  color: #666; margin: 0 0 8px 2px;
}
#lu-nickname {
  width: 100%;
  font-family: var(--lu-font); font-weight: 300;
  font-size: 15px; color: #111;
  background: transparent;
  border: none; border-bottom: 1px solid #ccc;
  padding: 8px 2px; outline: none;
  transition: border-color 0.25s ease;
  border-radius: 0;
}
#lu-nickname:focus { border-bottom-color: var(--lu-gold); }
.lu-field-hint {
  text-align: left; font-size: 10px; color: #aaa;
  margin: 6px 0 0 2px;
}
.lu-swatches {
  display: flex; flex-wrap: wrap;
  gap: 12px; margin-top: 4px;
}
.lu-swatch {
  width: 32px; height: 32px; border-radius: 50%;
  border: none; cursor: pointer; padding: 0;
  /* \uCE94\uB514 \uD398\uBE14 \uC785\uCCB4\uAC10 \u2014 \uC0C1\uB2E8 \uD558\uC774\uB77C\uC774\uD2B8 + \uD558\uB2E8 \uC74C\uC601 \uBCA0\uBCA8, \uADF8 \uC704\uC5D0 \uADFC\uC811 \uB4DC\uB86D\uC100\uB3C4 */
  box-shadow:
    inset 0 0 0 1px rgba(47,35,19,0.16),
    inset 0 2px 3px rgba(255,255,255,0.5),
    inset 0 -3px 4px rgba(40,30,10,0.14),
    0 2px 3px rgba(40,30,10,0.18);
  transform: scale(1);
  transition: box-shadow 0.18s ease, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.lu-swatch:hover { transform: scale(1.16); box-shadow: inset 0 0 0 1px rgba(47,35,19,0.16), inset 0 2px 3px rgba(255,255,255,0.5), inset 0 -3px 4px rgba(40,30,10,0.14), 0 4px 8px rgba(40,30,10,0.24); }
.lu-swatch:active { transform: scale(0.94); }
.lu-swatch.lu-selected {
  box-shadow:
    inset 0 0 0 1px rgba(47,35,19,0.16), inset 0 2px 3px rgba(255,255,255,0.5),
    0 0 0 2px #fff, 0 0 0 4px var(--am-accent, var(--lu-gold)), 0 4px 8px rgba(40,30,10,0.28);
  animation: lu-swatchpop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes lu-swatchpop {
  0% { transform: scale(0.75); }
  60% { transform: scale(1.24); }
  100% { transform: scale(1.16); }
}
@media (prefers-reduced-motion: reduce) {
  .lu-swatch, .lu-swatch:hover, .lu-swatch.lu-selected { transition: none; animation: none; }
}
.lu-chars {
  display: flex; flex-wrap: wrap; justify-content: center;
  gap: 8px; margin-top: 4px;
}
.lu-char-btn {
  font-family: var(--lu-font); font-weight: 500;
  font-size: 12.5px; letter-spacing: 0.03em;
  color: #4a453c; background: #fffdf9;
  border: 1px solid #e6dfcf; border-radius: 12px;
  padding: 10px 15px; cursor: pointer;
  box-shadow: 0 2px 8px rgba(23,20,15,0.04);
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease, transform 0.15s ease;
}
.lu-char-btn:hover { transform: translateY(-1px); }
.lu-char-btn:hover { border-color: rgba(0,0,0,0.25); }
.lu-char-btn.lu-selected {
  border-color: var(--lu-gold);
  color: #111;
  background: #f6f3ea;
}

/* ------------------------------ \uCEE4\uC2A4\uD140 \uC544\uBC14\uD0C0 \uBC84\uD2BC ------------------------------ */
.lu-char-custom {
  position: relative;
  background-size: cover; background-position: center 18%;
}
.lu-char-custom.lu-has-thumb {
  color: #fff; border-color: #ddd;
  text-shadow: 0 1px 4px rgba(0,0,0,0.75);
}
.lu-char-edit-link {
  display: block;
  margin: 6px auto 0;
  font-family: var(--lu-font); font-weight: 300;
  font-size: 10px; letter-spacing: 0.05em; color: #999;
  background: transparent; border: none; cursor: pointer;
  padding: 2px 4px; text-align: center;
  transition: color 0.2s ease;
}
.lu-char-edit-link:hover { color: var(--lu-gold); }

/* \uB85C\uBE44 "\uCE90\uB9AD\uD130 \uB514\uC790\uC778" \uBA54\uB274 \uBC84\uD2BC \u2014 \uC785\uC7A5 \uD3FC\uACFC \uBD84\uB9AC\uB41C, \uBA85\uD655\uD788 \uB77C\uBCA8\uB41C \uC9C4\uC785\uC810 */
.lu-char-design-btn {
  display: flex; align-items: center; gap: 12px; width: 100%;
  margin-top: 8px; padding: 12px 14px;
  background: #fff; border: 1px solid #e4e0d6; border-radius: 14px;
  cursor: pointer; text-align: left; font-family: var(--lu-font);
  transition: border-color 0.18s ease, transform 0.1s ease, box-shadow 0.18s ease;
}
.lu-char-design-btn:hover { border-color: var(--lu-gold); transform: translateY(-1px); box-shadow: 0 6px 16px rgba(20,38,29,0.06); }
.lu-char-design-btn:focus-visible { outline: 2px solid var(--lu-gold); outline-offset: 2px; }
.lu-char-design-media {
  flex: 0 0 auto; width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; font-size: 20px;
  background: #f4f1e8 center/cover no-repeat; border: 1px solid #e4e0d6;
}
.lu-char-design-media.lu-has-thumb { background-color: #f6f1e3; }
.lu-char-design-txt { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.lu-char-design-txt b { font-size: 14px; font-weight: 700; color: var(--lu-ink, #17140f); }
.lu-char-design-txt span { font-size: 11.5px; color: #8a8577; }
.lu-char-design-arrow { flex: 0 0 auto; font-size: 20px; color: #bdb8a8; }

/* -------------------------- \uC544\uBC14\uD0C0 \uCEE4\uC2A4\uD130\uB9C8\uC774\uC800 \uBAA8\uB2EC -------------------------- */
/* \uB530\uB73B\uD55C \uD504\uB9AC\uBBF8\uC5C4 \uB9AC\uD1A4(#74, 2026-07-18) \u2014 DESIGN.md \xA72/\xA73-1: \uAFB8\uBBF8\uAE30 \uBAA8\uB2EC\uC740 \uB77C\uC774\uD2B8/\uB2E4\uD06C\uC640
   \uBB34\uAD00\uD55C "\uB530\uB73B\uD568 \uC608\uC678" \uD45C\uBA74\uC73C\uB85C \uC720\uC9C0(\uBC30\uD3EC \uB300\uC0C1, \uC870\uC6A9\uD55C \uB7ED\uC154\uB9AC \uB9AC\uD1A4\uC740 \uD3D0\uAE30). \uC0CC\uB514 \uD06C\uB9BC\xB7
   \uC6B0\uB4DC \uBE0C\uB77C\uC6B4\xB7\uD504\uB9AC\uC14B/\uC637\uC7A5 \uCE74\uB4DC \uAD6C\uC870\uB294 \uADF8\uB300\uB85C \uB450\uACE0, \uC561\uC13C\uD2B8\uB9CC \uD314\uB808\uD2B8 B\uC548(\xA73-2\xB7\xA73-4)\uACFC
   \uC815\uD569\uC2DC\uD0A8\uB2E4 \u2014 \uAD6C \uCCAD\uC790 \uADF8\uB9B0 \uB7A8\uD504(g100~g900) \uC794\uC7AC\uB97C \uAC77\uC5B4\uB0B4\uACE0 \xA712 \uB9C8\uC2A4\uCF54\uD2B8 \uADDC\uC815("UI\uAC00
   \uC544\uC57C\uBAA8\uB97C \uAC15\uC870\uD560 \uB54C \uC4F0\uB294 \uC561\uC13C\uD2B8\uB294 \uC8FC\uC870 1\uC0C9, \uAD8C\uC7A5 \uBC14\uC774\uC62C\uB81B")\uC5D0 \uB530\uB77C \uBC14\uC774\uC62C\uB81B 1\uC0C9\uC73C\uB85C
   \uD1B5\uC77C\uD588\uB2E4. \uB77C\uC774\uD2B8 \uD45C\uBA74(\uD06C\uB9BC \uBC30\uACBD)\uC774\uBBC0\uB85C \uC6D0\uC0C9(--violet-500)\uC774 \uC544\uB2CC AA \uD1B5\uACFC \uB2E4\uD06C \uBCC0\uD615
   --violet-ink(\xA73-4, \uB77C\uC774\uD2B8 BG \uB300\uBE44 5.55:1)\uB97C \uBA54\uC778 \uC561\uC13C\uD2B8\uB85C \uC4F4\uB2E4. \uC78E\uC0AC\uADC0\xB7\uC811\uD78C \uC885\uC774\xB7
   \uB098\uBB34\uACB0 \uBAA8\uD2F0\uD504\uB294 \uC804\uBD80 \uC624\uB9AC\uC9C0\uB110 SVG/CSS \u2014 \uD2B9\uC815 \uBE0C\uB79C\uB4DC \uC544\uC774\uCF58\xB7\uB9C8\uD06C\xB7\uC11C\uCCB4\xB7\uCE90\uB9AD\uD130 \uBBF8\uC0AC\uC6A9. */
#lu-chibi-maker {
  --am-cream: #fff8e8;
  --am-cream-2: #fbe8bb;
  --am-ink: #2f2313;
  --am-ink-body: #6b5636;
  --am-ink-dim: #a68f68;
  --am-line: #e8cf9c;
  --am-accent-wash: #EAE5FF;  /* --violet-100 \u2014 \uC120\uD0DD \uBC30\uACBD \uC6CC\uC2DC */
  --am-accent-soft: #AB99FF;  /* --violet-300 \u2014 \uC7A5\uC2DD\uC6A9 \uBC1D\uC740 \uBCF4\uB354/\uD638\uBC84(\uBE44\uD14D\uC2A4\uD2B8) */
  --am-accent: #5733FF;       /* --violet-ink(=--violet-700) \u2014 \uC815\uCCB4\uC131 \uC561\uC13C\uD2B8, \uB77C\uC774\uD2B8 BG AA 5.55:1 */
  --am-wood: #d3a765;
  --am-wood-dark: #a97c42;
  /* \uC885\uC774 \uADF8\uB808\uC778 \u2014 \uC790\uCCB4 SVG feTurbulence(\uC911\uD68C\uC0C9 \uC2A4\uD399\uD074, \uC800\uC54C\uD30C) data-URI, \uC678\uBD80 \uC694\uCCAD 0.
     \uC18C\uC2A4\uC624\uBC84 \uD569\uC131\uC774\uB77C \uBC1D\uC740 \uBA74 \uC704\uC5D0\uC120 \uC0B4\uC9DD \uC5B4\uB461\uAC8C, \uC5B4\uB450\uC6B4 \uBA74 \uC704\uC5D0\uC120 \uC0B4\uC9DD \uBC1D\uAC8C \uC77D\uD600
     \uC5B4\uB290 \uD1A4\uC774\uB4E0 \uACB0\uC774 \uBCF4\uC778\uB2E4(\uCE74\uB4DC\xB7\uD504\uB808\uC784\xB7\uC624\uBC84\uB808\uC774 \uACF5\uC6A9). */
  --am-grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.14 0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
  /* \uC6B0\uB4DC \uD504\uB808\uC784 \uC804\uC6A9 \u2014 \uBC30\uACBD\uC774 \uB354 \uC9C4\uD558\uACE0 \uCC44\uB3C4\uAC00 \uB192\uC544 \uC740\uC740\uD55C \uACB0\uC774 \uBB3B\uD788\uBBC0\uB85C \uC0B4\uC9DD \uB354 \uC9C4\uD55C \uADF8\uB808\uC778 */
  --am-grain-wood: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.2 0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
}
#lu-avatar-maker, #lu-chibi-maker {
  position: fixed; inset: 0; z-index: 985;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  opacity: 0; pointer-events: none;
  transition: opacity 0.3s ease;
}
#lu-avatar-maker { background: rgba(20,16,9,0.76); }
#lu-chibi-maker {
  /* \uB2E4\uCE35 \uAE4A\uC774\uAC10 \u2014 \uC740\uC740\uD55C \uC0C1\uB2E8 \uAD11\uC6D0 + \uC885\uC774 \uADF8\uB808\uC778\uC744 \uC5B4\uB451\uD55C \uC2A4\uD06C\uB9BC \uC704\uC5D0 \uC5B9\uC5B4
     \uBC30\uACBD \uC790\uCCB4\uAC00 \uD3C9\uBA74 \uB2E8\uC0C9\uC774 \uC544\uB2C8\uB77C \uD558\uB098\uC758 \uBB34\uB300\uCC98\uB7FC \uC77D\uD788\uAC8C \uD55C\uB2E4. */
  background-image: var(--am-grain), radial-gradient(120% 90% at 50% 6%, rgba(74,58,30,0.22), rgba(32,26,12,0) 55%);
  background-repeat: repeat, no-repeat;
  background-color: rgba(20,16,9,0.76);
}
#lu-avatar-maker.lu-open, #lu-chibi-maker.lu-open { opacity: 1; pointer-events: auto; }
.lu-am-card {
  width: 100%; max-width: 860px;
  max-height: 94vh; max-height: 94dvh;  /* iOS Safari \uB3D9\uC801 \uD234\uBC14 \u2014 vh(\uC8FC\uC18C\uCC3D \uD3EC\uD568 \uD070 \uAC12)\uBA74
     \uC8FC\uC18C\uCC3D \uBCF4\uC77C \uB54C \uCE74\uB4DC\uAC00 \uC2E4\uC81C \uAC00\uC2DC\uC601\uC5ED\uBCF4\uB2E4 \uCEE4\uC838 footer\uAC00 \uBC00\uB9AC\uACE0 body \uC2A4\uD06C\uB864\uC774 \uAE68\uC9C4\uB2E4.
     dvh(\uAC00\uC2DC\uC601\uC5ED \uC2E4\uCE21)\uB85C \uBCF4\uC815, \uBBF8\uC9C0\uC6D0 \uBE0C\uB77C\uC6B0\uC800\uB294 \uC55E vh \uD3F4\uBC31. */
  background-image: var(--am-grain), linear-gradient(165deg, var(--am-cream) 0%, #fffaee 40%, var(--am-cream-2) 100%);
  background-repeat: repeat, no-repeat;
  color: var(--am-ink);
  border-radius: 30px;
  border: 3px solid rgba(211,167,101,0.5);
  /* \uADFC\uC811 \uC811\uC9C0 \uADF8\uB9BC\uC790 + \uC6D0\uAC70\uB9AC \uC570\uBE44\uC5B8\uD2B8 \uADF8\uB9BC\uC790\uB97C \uACB9\uCCD0 \uCE74\uB4DC\uAC00 \uBC30\uACBD \uC704\uC5D0 \uC2E4\uC81C\uB85C
     "\uB5A0 \uC788\uB294" \uB2E4\uCE35 \uAE4A\uC774\uAC10\uC744 \uB0B8\uB2E4(\uD3C9\uBA74 \uB2E8\uC77C \uADF8\uB9BC\uC790 \uAE08\uC9C0). */
  box-shadow:
    0 1px 0 rgba(255,255,255,0.7) inset,
    0 2px 4px rgba(40,30,10,0.16),
    0 10px 20px rgba(40,30,10,0.18),
    0 32px 64px rgba(40,30,10,0.32),
    0 72px 120px rgba(20,15,6,0.28);
  display: flex; flex-direction: column;
  overflow: hidden;
  transform: scale(0.96) translateY(6px); opacity: 0;
  transition: transform 0.36s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease;
}
#lu-avatar-maker.lu-open .lu-am-card, #lu-chibi-maker.lu-open .lu-am-card { transform: scale(1) translateY(0); opacity: 1; }
.lu-am-head {
  flex: 0 0 auto;
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 16px;
  background: linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0));
  border-bottom: 2px solid var(--am-line);
  box-shadow: 0 1px 0 rgba(255,255,255,0.5);
}
.lu-am-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 16px; font-weight: 800; letter-spacing: 0.04em;
  color: var(--am-ink);
}
.lu-am-title-icon {
  display: flex; width: 24px; height: 24px; flex: 0 0 auto;
  color: var(--am-accent);
  filter: drop-shadow(0 1px 0 rgba(255,255,255,0.55)) drop-shadow(0 2px 3px rgba(87,51,255,0.22));
}
.lu-am-title-icon svg { width: 100%; height: 100%; }
#lu-am-close {
  flex: 0 0 auto;
  width: 34px; height: 34px;
  display: flex; align-items: center; justify-content: center;
  background: var(--am-cream-2);
  border: 2px solid var(--am-wood);
  border-radius: 50%;
  color: var(--am-wood-dark); font-size: 17px; font-weight: 400; line-height: 1;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.6), 0 3px 0 rgba(169,124,66,0.45), 0 6px 12px rgba(40,30,10,0.2);
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease, transform 0.15s ease, box-shadow 0.15s ease;
}
#lu-am-close:hover { border-color: var(--am-accent); color: #fff; background: var(--am-accent); transform: translateY(1px) rotate(90deg); box-shadow: 0 2px 0 rgba(87,51,255,0.5), 0 4px 8px rgba(40,30,10,0.18); }
#lu-am-close:active { transform: translateY(3px) rotate(90deg); box-shadow: none; }
/* \uC0C1\uB2E8 \uC561\uC158 \u2014 \uC800\uC7A5(\u2713, \uAC15\uC870) + \uB2EB\uAE30(\xD7)\uB97C \uD5E4\uB354 \uC6B0\uCE21\uC5D0 \uB098\uB780\uD788(\uD558\uB2E8 \uBC84\uD2BC \uD1B5\uD569) */
.lu-am-head-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 10px; }
#lu-am-save {
  flex: 0 0 auto;
  width: 34px; height: 34px;
  display: flex; align-items: center; justify-content: center;
  background: var(--am-accent);
  border: 2px solid var(--am-accent);
  border-radius: 50%;
  color: #fff; font-size: 18px; font-weight: 800; line-height: 1;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 3px 0 rgba(60,36,180,0.5), 0 6px 12px rgba(40,30,10,0.2);
  transition: background 0.2s ease, transform 0.15s ease, box-shadow 0.15s ease;
}
#lu-am-save:hover { background: #6a4bff; transform: translateY(1px); box-shadow: 0 2px 0 rgba(60,36,180,0.5), 0 4px 8px rgba(40,30,10,0.18); }
#lu-am-save:active { transform: translateY(3px); box-shadow: none; }
.lu-am-body {
  flex: 1 1 auto; min-height: 0;
  display: flex; gap: 24px;
  padding: 24px;
  overflow: hidden;
}
/* ---- \uD504\uB9AC\uBDF0 \uBB34\uB300 \u2014 300\xD7400 \uBC31\uD0B9 \uD574\uC0C1\uB3C4(ensurePreviewRenderer)\uB294 \uBD88\uBCC0, \uBC14\uAE65 \uD504\uB808\uC784\uB9CC \uC7A5\uC2DD ----
   \uBC14\uAE65 padding \uB9C1\uC744 \uC6B0\uB4DC \uD1A4 \uB2E4\uCE35 \uADF8\uB77C\uB514\uC5B8\uD2B8 + \uACB0 \uC2A4\uD2B8\uB77C\uC774\uD504\uB85C \uCC44\uC6CC "\uC561\uC790" \uB290\uB08C\uC744 \uB0B8\uB2E4. */
.lu-am-preview {
  flex: 0 0 auto;
  align-self: flex-start;   /* \uAE34 \uD0ED\uC5D0\uC11C \uD504\uB808\uC784\uC774 \uD328\uB110 \uB192\uC774\uB9CC\uD07C \uB298\uC5B4\uB098 \uC544\uB798 \uBE48 \uB098\uBB34 \uC2AC\uB798\uBE0C\uAC00 \uC0DD\uAE30\uC9C0 \uC54A\uAC8C \u2014 \uC2A4\uD14C\uC774\uC9C0\uC5D0 \uB9DE\uCDB0 \uAC10\uC2FC\uB2E4 */
  display: flex; align-items: flex-start;
  width: auto;
  padding: 14px;
  border-radius: 26px;
  position: relative;
  touch-action: pan-y;  /* \uC88C\uC6B0 \uB4DC\uB798\uADF8=\uCE90\uB9AD\uD130 \uD68C\uC804(\uC571), \uC0C1\uD558 \uC2A4\uC640\uC774\uD504=\uD654\uBA74 \uC2A4\uD06C\uB864(\uBE0C\uB77C\uC6B0\uC800) \u2014 \uAC10\uB3C5 \uC9C0\uC2DC */
  background-image:
    var(--am-grain-wood),
    repeating-linear-gradient(4deg, rgba(255,244,220,0.14) 0 2px, rgba(94,61,20,0.06) 2px 4px, transparent 4px 8px),
    linear-gradient(155deg, #eecb92 0%, var(--am-wood) 48%, var(--am-wood-dark) 130%);
  background-repeat: repeat, repeat, no-repeat;
  border: 3px solid var(--am-wood-dark);
  box-shadow:
    inset 0 0 0 1px rgba(255,244,220,0.35),
    inset 0 3px 4px rgba(255,244,220,0.4),
    inset 0 -5px 10px rgba(58,38,10,0.32),
    0 2px 4px rgba(40,30,10,0.14),
    0 16px 30px rgba(40,30,10,0.2),
    0 36px 64px rgba(40,30,10,0.18);
}
.lu-am-stage {
  width: 100%; aspect-ratio: 3 / 4;
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  background: #ddd2bd;  /* \uBC29 \uBC30\uACBD \uD558\uB2E8\uC0C9 \u2014 WebGL \uCCAB \uB80C\uB354 \uC804/\uB465\uADFC\uBAA8\uC11C\uB9AC \uBC16 \uD50C\uB798\uC2DC \uBC29\uC9C0 */
  box-shadow: inset 0 0 0 2px rgba(255,255,255,0.6), inset 0 0 0 3px rgba(211,167,101,0.3), inset 0 2px 10px rgba(40,30,10,0.12);
}
/* touch-action\uC740 \uBE44\uC0C1\uC18D\uC774\uB77C \uBD80\uBAA8(.lu-am-preview)\uC758 pan-y\uAC00 \uCE94\uBC84\uC2A4\uC5D0 \uC548 \uB0B4\uB824\uC628\uB2E4 \u2192 \uCE94\uBC84\uC2A4\uC5D0
   \uC9C1\uC811 \uC9C0\uC815\uD574\uC57C \uC138\uB85C \uC2A4\uC640\uC774\uD504\uAC00 \uD654\uBA74 \uC2A4\uD06C\uB864\uB85C \uD1B5\uACFC\uD55C\uB2E4(\uC88C\uC6B0 \uB4DC\uB798\uADF8=\uD68C\uC804 \uC720\uC9C0). */
.lu-am-stage canvas { display: block; width: 100%; height: 100%; cursor: grab; touch-action: pan-y; }
.lu-am-preview.lu-dragging .lu-am-stage canvas { cursor: grabbing; }
/* \uBD80\uB4DC\uB7EC\uC6B4 \uBE44\uB124\uD2B8 + \uC811\uC9C0 \uADF8\uB9BC\uC790 + \uC740\uC740\uD55C \uC885\uC774 \uACB0 \u2014 canvas\uAC00 \uBD88\uD22C\uBA85(scene.background)\uC774\uB77C
   \uC704\uC5D0 \uBA40\uD2F0\uD50C\uB77C\uC774\uB85C \uC5B9\uB294\uB2E4 */
.lu-am-stage::before {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background-image: var(--am-grain), radial-gradient(120% 100% at 50% 24%, rgba(255,247,222,0) 48%, rgba(60,45,20,0.08) 100%);
  background-repeat: repeat, no-repeat;
  mix-blend-mode: multiply;
}
/* \uC811\uC9C0 \uADF8\uB9BC\uC790\uB294 3D \uC2E4\uC2DC\uAC04 \uADF8\uB9BC\uC790\uB9F5(ensurePreviewRenderer)\uC774 \uB2F4\uB2F9\uD55C\uB2E4 \u2014 \uCE90\uB9AD\uD130\uAC00 \uC790\uB3D9
   \uC5F0\uAE30\uB85C \uC6C0\uC9C1\uC774\uBA74 \uADF8\uB9BC\uC790\uB3C4 \uB530\uB77C\uAC00\uBBC0\uB85C \uC815\uC801 CSS \uD0C0\uC6D0(\uAD6C ::after)\uC740 \uC81C\uAC70\uD588\uB2E4. */
/* \uBB34\uB300 \uB798\uD37C \u2014 \uC0AC\uC9C4(\uCE94\uBC84\uC2A4)\uC744 \uAC10\uC2F8\uB294 \uD504\uB808\uC784. */
.lu-am-stagewrap { position: relative; width: 244px; height: 325px; flex: 0 0 auto; }  /* 3:4 \uBA85\uC2DC */
/* ---- \uCE74\uD14C\uACE0\uB9AC \uB0B4\uBE44 \u2014 \uC885\uC871\xB7\uC5BC\uAD74\xB7\uD5E4\uC5B4\xB7\uC758\uC0C1\xB7\uC7A5\uC2DD\xB7\uC637\uC7A5 \uC139\uC158 \uC804\uD658 ---- */
.lu-am-panel {
  flex: 1 1 auto; min-width: 0; min-height: 0;
  display: flex; flex-direction: column;
}
.lu-am-nav {
  flex: 0 0 auto;
  display: flex; gap: 8px;
  /* overflow-x:auto\uAC00 \uC138\uB85C\uB3C4 auto\uB85C \uB9CC\uB4E4\uC5B4, \uC120\uD0DD \uD0ED\uC774 \uB5A0\uC624\uB97C \uB54C(translateY/pop \uC560\uB2C8\uBA54\uC774\uC158)
     \uC0C1\uB2E8\uC774 \uC798\uB9AC\uB358 \uBB38\uC81C \u2192 \uC704\uCABD \uC5EC\uBC31\uC73C\uB85C \uB5A0\uC624\uB974\uB294 \uB9CC\uD07C\uC758 \uACF5\uAC04 \uD655\uBCF4(\uAC10\uB3C5 \uBCF4\uACE0: \uC885\uC871 \uCE78 \uC704 \uC798\uB9BC). */
  padding: 6px 0 12px; margin-bottom: 16px;
  border-bottom: 2px dashed var(--am-line);
  overflow-x: auto;
  scrollbar-width: none;
}
.lu-am-nav::-webkit-scrollbar { display: none; }
.lu-am-navtab {
  flex: 0 0 auto;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  min-width: 58px;
  font-family: var(--lu-font); font-weight: 700;
  font-size: 10.5px; letter-spacing: 0.01em;
  color: var(--am-ink-dim); background: #fff;
  border: 2px solid transparent; border-radius: 18px;
  padding: 8px 12px 7px; cursor: pointer;
  transition: color 0.18s ease, background 0.18s ease, border-color 0.18s ease, transform 0.12s ease, box-shadow 0.18s ease;
}
.lu-am-navtab svg { width: 19px; height: 19px; }
.lu-am-navtab:hover { color: var(--am-ink); background: var(--am-cream-2); transform: translateY(-1px); }
.lu-am-navtab:active { transform: scale(0.94); }
/* \uC120\uD0DD \uD0ED \u2014 \uD1B5\uD1B5\uD558\uAC8C \uB5A0\uC624\uB978 raised pill + \uC7AC\uB80C\uB354\uB9C8\uB2E4 \uC0B4\uC9DD \uD280\uB294 \uB9C8\uC774\uD06C\uB85C \uD31D
   (\uB9E4 \uB80C\uB354 \uC2DC \uC0C8 DOM \uB178\uB4DC\uB85C \uC7AC\uC0DD\uC131\uB418\uBBC0\uB85C \uC560\uB2C8\uBA54\uC774\uC158\uC774 \uC790\uC5F0\uD788 \uC7AC\uC0DD\uB41C\uB2E4) */
.lu-am-navtab.lu-selected {
  color: var(--am-ink); background: var(--am-accent-wash);
  border-color: var(--am-accent-soft);
  border-radius: 22px 26px 24px 28px;
  box-shadow: 0 3px 0 rgba(87,51,255,0.35), 0 8px 14px rgba(87,51,255,0.18), inset 0 0 0 1px rgba(255,255,255,0.6);
  animation: lu-navpop 0.34s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.lu-am-navtab.lu-selected svg { color: var(--am-accent); }
@keyframes lu-navpop {
  0% { transform: translateY(0) scale(0.84); }
  55% { transform: translateY(-4px) scale(1.06); }
  100% { transform: translateY(-2px) scale(1); }
}
.lu-am-tabs {
  display: flex; flex-wrap: wrap; gap: 8px;
}
.lu-am-tab {
  font-family: var(--lu-font); font-weight: 600;
  font-size: 12px; letter-spacing: 0.01em;
  color: var(--am-ink-body); background: #fffdf6;
  border: 2px solid var(--am-line); border-radius: 16px;
  padding: 8px 16px; cursor: pointer;
  box-shadow: 0 2px 0 rgba(232,207,156,0.7);
  transition: border-color 0.16s ease, color 0.16s ease, background 0.16s ease, transform 0.1s ease, box-shadow 0.16s ease;
}
.lu-am-tab:hover { border-color: var(--am-accent-soft); color: var(--am-ink); background: var(--am-cream-2); transform: translateY(-1px); }
.lu-am-tab:active { transform: translateY(1px) scale(0.98); box-shadow: none; }
.lu-am-tab.lu-selected {
  border-color: var(--am-accent); color: var(--am-ink); background: var(--am-accent-wash);
  font-weight: 800;
  box-shadow: 0 2px 0 rgba(87,51,255,0.4), 0 5px 10px rgba(87,51,255,0.16), inset 0 0 0 1px rgba(171,153,255,0.5);
  animation: lu-chippop 0.26s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes lu-chippop {
  0% { transform: scale(0.88); }
  60% { transform: scale(1.05); }
  100% { transform: scale(1); }
}
/* \uD504\uB9AC\uC14B \uCE74\uB4DC \u2014 \uC2A4\uD0A8/\uD3EC\uC778\uD2B8 \uC0C9 \uBBF8\uB9AC\uBCF4\uAE30 \uB3C4\uD2B8\uAC00 \uBD99\uC740 \uC1FC\uCF00\uC774\uC2A4 \uCE69 */
.lu-am-presets { gap: 10px; }
.lu-am-presets .lu-am-tab { display: flex; align-items: center; gap: 9px; padding: 6px 16px 6px 6px; }
.lu-am-preset-dot {
  width: 22px; height: 22px; border-radius: 50%; flex: 0 0 auto;
  box-shadow:
    inset 0 0 0 1px rgba(47,35,19,0.18),
    inset 0 2px 3px rgba(255,255,255,0.55),
    inset 0 -3px 4px rgba(40,30,10,0.16),
    0 2px 3px rgba(40,30,10,0.2);
}
.lu-am-tabpage {
  flex: 1 1 auto; min-height: 0;
  overflow-y: auto;
  padding: 2px 4px 6px 2px;
}
.lu-am-tabpage::-webkit-scrollbar { width: 7px; }
.lu-am-tabpage::-webkit-scrollbar-thumb { background: var(--am-line); border-radius: 8px; }
.lu-am-group-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 800; letter-spacing: 0.04em;
  color: var(--am-accent);
  margin: 0 0 11px;
}
.lu-am-group-icon { display: flex; width: 14px; height: 14px; flex: 0 0 auto; }
.lu-am-group-icon svg { width: 100%; height: 100%; }
.lu-am-section-title {
  font-size: 11px; font-weight: 800; letter-spacing: 0.08em; color: var(--am-ink-dim);
  margin: 13px 0 7px;
}
/* \uB0B4 \uC637\uC7A5 (\uB85C\uADF8\uC778 \uC804\uC6A9) */
.lu-closet-save {
  width: 100%; margin: 2px 0 16px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  border: 2px dashed var(--am-accent); background: rgba(171,153,255,0.14);
  color: var(--am-accent); font-weight: 800; border-radius: 18px;
  padding: 12px 16px;
}
.lu-closet-save:hover { background: rgba(171,153,255,0.26); border-color: var(--am-accent); }
.lu-closet-empty { font-size: 12px; color: var(--am-ink-dim); padding: 6px 2px 10px; }
.lu-closet-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 12px;
}
.lu-closet-cell { position: relative; }
.lu-closet-load {
  width: 100%; aspect-ratio: 3 / 4;
  border: 2px solid var(--am-line); border-radius: 16px;
  background-color: var(--am-cream-2); background-size: cover; background-position: center;
  display: flex; align-items: flex-end; justify-content: center;
  padding: 0; overflow: hidden; cursor: pointer; position: relative;
  box-shadow: 0 2px 0 rgba(232,207,156,0.6), 0 5px 12px rgba(40,30,10,0.1);
  transition: border-color 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease;
}
/* \uC811\uD78C \uC885\uC774 \uBAA8\uC11C\uB9AC \u2014 \uCE74\uD0C8\uB85C\uADF8 \uCE74\uB4DC \uB290\uB08C(\uC624\uB9AC\uC9C0\uB110 CSS \uADF8\uB77C\uB514\uC5B8\uD2B8 \uD3F4\uB4DC, \uD2B9\uC815 \uAC8C\uC784 UI \uCE74\uD53C \uC544\uB2D8) */
.lu-closet-load::before {
  content: ''; position: absolute; top: 0; right: 0; z-index: 2;
  width: 20px; height: 20px;
  background: linear-gradient(135deg, #fffefa 0%, #fffefa 48%, #ecdcac 52%, #cdb787 100%);
  clip-path: polygon(100% 0, 0 0, 100% 100%);
  filter: drop-shadow(-1.5px 1.5px 1.5px rgba(40,30,10,0.22));
}
.lu-closet-load:hover { border-color: var(--am-accent-soft); transform: translateY(-3px); box-shadow: 0 4px 0 rgba(232,207,156,0.6), 0 14px 26px rgba(40,30,10,0.2); }
.lu-closet-name {
  width: 100%; font-size: 10px; font-weight: 700; color: #fff;
  padding: 8px 4px 5px; text-align: center;
  background: linear-gradient(to top, rgba(40,30,10,0.66), rgba(40,30,10,0));
  letter-spacing: 0.02em;
}
.lu-closet-del {
  position: absolute; top: -8px; right: -8px; z-index: 3;
  width: 24px; height: 24px; line-height: 21px; padding: 0;
  border-radius: 50%; border: 2px solid #fff; background: #e8735c;
  color: #fff; font-size: 14px; cursor: pointer;
  box-shadow: 0 2px 0 rgba(160,60,40,0.4), 0 3px 6px rgba(40,30,10,0.2);
  transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}
.lu-closet-del:hover { background: #d85f47; transform: scale(1.08); }
.lu-closet-del:active { transform: translateY(1px) scale(1.02); box-shadow: 0 1px 0 rgba(160,60,40,0.4); }
.lu-am-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
  gap: 8px;
}
.lu-am-thumb {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  background: #fffdf6; border: 2px solid var(--am-line); border-radius: 14px;
  padding: 6px 4px 7px; cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}
.lu-am-thumb:hover { border-color: var(--am-accent-soft); }
.lu-am-thumb.lu-selected { border-color: var(--am-accent); background: var(--am-accent-wash); }
.lu-am-thumb img {
  width: 48px; height: 48px; object-fit: contain;
  background: #fff; border: 1px solid var(--am-line);
}
.lu-am-thumb-none {
  width: 48px; height: 48px;
  display: flex; align-items: center; justify-content: center;
  background: #fff; border: 1px solid var(--am-line);
  font-size: 10px; color: var(--am-ink-dim); letter-spacing: 0.02em;
}
.lu-am-thumb-label {
  font-size: 9px; letter-spacing: 0.01em; color: var(--am-ink-dim);
  text-align: center;
  max-width: 62px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.lu-am-cute-row { margin-top: 4px; }
.lu-am-cute-label {
  display: flex; justify-content: space-between;
  font-size: 11px; color: var(--am-ink-body); margin-bottom: 8px;
}
.lu-am-cute-label b { color: var(--am-accent); font-weight: 700; }
#lu-am-cute { width: 100%; accent-color: var(--am-accent); }
.lu-am-footer {
  flex: 0 0 auto;
  display: flex; flex-direction: column; gap: 12px;
  padding: 16px 24px 20px;
  border-top: 2px solid var(--am-line);
  background: linear-gradient(0deg, rgba(255,255,255,0.5), rgba(255,255,255,0));
}
.lu-am-footer-btns { display: flex; gap: 10px; justify-content: flex-end; align-items: center; }
/* \uD68C\uC6D0\uAC00\uC785 \uAC8C\uC774\uD2B8 \u2014 \uAC8C\uC2A4\uD2B8\uC5D0\uAC8C\uB9CC \uB178\uCD9C(\uC800\uC7A5\uD558\uB824\uBA74 \uD68C\uC6D0\uAC00\uC785) */
.lu-am-guest-gate {
  display: flex; flex-direction: column; gap: 8px;
  padding: 12px 14px; border-radius: 12px;
  background: rgba(191,161,74,0.06); border: 1px solid rgba(191,161,74,0.28);
}
.lu-am-gate-note { font-size: 12px; line-height: 1.55; color: var(--am-ink-body); word-break: keep-all; }
.lu-am-signup-providers { display: flex; flex-wrap: wrap; gap: 8px; }
.lu-am-social {
  display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
  font-family: var(--lu-font); font-weight: 700; font-size: 11.5px;
  color: var(--am-ink-body); background: #fff;
  border: 1px solid var(--am-line); border-radius: 999px; padding: 7px 12px;
  transition: border-color 0.15s ease, transform 0.1s ease;
}
.lu-am-social:hover { border-color: var(--am-accent); transform: translateY(-1px); }
.lu-am-social:disabled { opacity: 0.55; cursor: default; }
.lu-am-social .lu-social-badge {
  width: 16px; height: 16px; border-radius: 50%; font-size: 10px; font-weight: 800;
  display: inline-flex; align-items: center; justify-content: center;
  background: #f0ece0; color: #6b6459;
}
.lu-am-btn {
  font-family: var(--lu-font); font-weight: 700;
  font-size: 12.5px; letter-spacing: 0.02em;
  color: var(--am-ink-body); background: #fffdf6;
  border: 2px solid var(--am-line); border-radius: 999px;
  padding: 12px 20px; cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.7), 0 3px 0 rgba(232,207,156,0.7), 0 6px 12px rgba(40,30,10,0.08);
  transition: border-color 0.18s ease, color 0.18s ease, background 0.18s ease, transform 0.12s ease, box-shadow 0.15s ease;
}
.lu-am-btn:hover { border-color: var(--am-accent-soft); color: var(--am-ink); transform: translateY(-1px); }
.lu-am-btn:active { transform: translateY(2px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 0 rgba(232,207,156,0.7); }
/* \uC800\uC7A5 CTA \u2014 \uCE94\uB514 \uC178 \uC0C1\uB2E8 \uD558\uC774\uB77C\uC774\uD2B8("\uB9BD") + \uD558\uB2E8 \uC74C\uC601\uC73C\uB85C \uD1B5\uD1B5\uD55C \uB20C\uB9BC\uAC10\uC744 \uAC15\uC870.
   \xA73-4 \uB77C\uBCA8 \uADDC\uCE59(\uB77C\uC774\uD2B8 \uD45C\uBA74 -ink \uCC44\uC6C0 \uC704\uC5D4 --text-light \uB77C\uBCA8)\uC5D0 \uB530\uB77C \uD770 \uD14D\uC2A4\uD2B8 \uC720\uC9C0. */
.lu-am-btn-primary {
  color: #fff; background: linear-gradient(180deg, #9680FF, var(--am-accent) 60%, #170080);
  border-color: #170080;
  font-weight: 800;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -10px 14px rgba(23,0,128,0.3), 0 4px 0 #170080, 0 10px 22px rgba(87,51,255,0.4);
}
.lu-am-btn-primary:hover { background: linear-gradient(180deg, #AB99FF, #6C4DFF 60%, #170080); transform: translateY(-1px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -10px 14px rgba(23,0,128,0.32), 0 5px 0 #170080, 0 12px 26px rgba(87,51,255,0.44); }
.lu-am-btn-primary:active { transform: translateY(3px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 0 #170080, 0 3px 8px rgba(87,51,255,0.3); }
#lu-chibi-maker button:focus-visible {
  outline: 2px solid var(--am-accent); outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  #lu-avatar-maker, #lu-chibi-maker, .lu-am-card, #lu-am-close, .lu-am-navtab, .lu-am-tab, .lu-am-btn, .lu-closet-load, .lu-closet-del,
  .lu-am-navtab.lu-selected, .lu-am-tab.lu-selected {
    transition: none !important;
    animation: none !important;
  }
}

#lu-enter-btn, .lu-quick-btn {
  width: 100%; margin-top: 30px;
  font-family: var(--lu-font); font-weight: 600;
  font-size: 14px; letter-spacing: 0.24em; text-indent: 0.24em;
  color: #17140f; background: var(--lu-gold);
  border: 1px solid var(--lu-gold); border-radius: 999px;
  padding: 15px 0; cursor: pointer;
  box-shadow: 0 6px 20px rgba(95,158,125,0.35);
  transition: transform 0.15s ease, box-shadow 0.25s ease;
}
#lu-enter-btn:hover, .lu-quick-btn:hover { transform: translateY(-1px); box-shadow: 0 9px 26px rgba(95,158,125,0.45); }
/* \uC7AC\uBC29\uBB38 \uC2A4\uB9C8\uD2B8 \uC785\uC7A5(A) \u2014 \uC800\uC7A5\uB41C \uD504\uB85C\uD544\xB7\uC544\uBC14\uD0C0\uAC00 \uC788\uC73C\uBA74 '\uBC14\uB85C \uC785\uC7A5' \uC6D0\uD074\uB9AD */
.lu-quick-enter { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 8px; }
.lu-quick-avatar { width: 66px; height: 66px; border-radius: 50%; background: #f0ede8 center/cover no-repeat; display: flex; align-items: center; justify-content: center; font-size: 32px; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.06); }
.lu-quick-greet { text-align: center; }
.lu-quick-greet b { display: block; font-size: 17px; color: #17140f; }
.lu-quick-greet span { display: block; margin-top: 3px; font-size: 13px; color: #8a857c; }
.lu-quick-enter .lu-quick-btn { margin-top: 6px; }
.lu-quick-change { background: none; border: none; color: #8a857c; font-size: 13px; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; font-family: var(--lu-font); }
.lu-quick-change:hover { color: #17140f; }
.lu-lobby-form.lu-collapsed { display: none; }

/* ------------------------------ \uC804\uC2DC \uC120\uD0DD ------------------------------ */
.lu-picker-note {
  text-align: left;
  font-size: 11px; letter-spacing: 0.04em;
  color: var(--lu-gold);
  margin: 0 0 10px 2px;
}
.lu-picker-list {
  display: flex; flex-direction: column; gap: 6px;
}
.lu-picker-item {
  display: block; width: 100%; text-align: left;
  font-family: var(--lu-font); font-weight: 300;
  background: #fafafa; border: 1px solid #eee; border-left: 2px solid transparent;
  padding: 10px 14px; cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}
.lu-picker-item:hover:not(:disabled) { background: #f2f2f0; border-left-color: var(--lu-gold); }
.lu-picker-item:disabled { cursor: default; }
.lu-picker-item.lu-picker-current {
  background: #f6f3ea; border-left-color: var(--lu-gold);
}
.lu-picker-name { font-size: 13px; color: #111; }
.lu-picker-meta { font-size: 10px; letter-spacing: 0.06em; color: #999; margin-top: 3px; }

.lu-lobby-divider { width: 100%; height: 1px; background: #eee; margin: 26px 0 18px; }
.lu-studio-link {
  display: inline-block;
  font-family: var(--lu-font); font-weight: 300;
  font-size: 11px; letter-spacing: 0.1em; color: #999;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: color 0.2s ease, border-color 0.2s ease;
}
.lu-studio-link:hover { color: var(--lu-gold); border-bottom-color: var(--lu-gold); }

/* ------------------------------ \uC18C\uC15C \uB85C\uADF8\uC778 ------------------------------ */
#lu-auth { margin: 26px 0 6px; }
.lu-social-wrap { display: flex; flex-direction: column; gap: 9px; }
.lu-social-btn {
  display: flex; align-items: center; gap: 12px;
  width: 100%;
  padding: 11px 16px;
  background: transparent;
  border: 1px solid rgba(0,0,0,0.18);
  border-radius: 3px;
  font-family: var(--lu-font); font-weight: 300;
  font-size: 13px; letter-spacing: 0.02em;
  color: #222;
  cursor: pointer;
  transition: border-color 0.25s ease, background 0.25s ease, opacity 0.25s ease;
}
.lu-social-btn:hover { border-color: rgba(0,0,0,0.45); }
.lu-social-btn:disabled { opacity: 0.55; cursor: default; }
.lu-social-busy { background: rgba(0,0,0,0.03); }
.lu-social-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px;
  border-radius: 50%;
  font-size: 11px; font-weight: 500;
  flex: 0 0 auto;
}
.lu-social-google .lu-social-badge { background: #fff; border: 1px solid #dadce0; color: #4285f4; }
.lu-social-kakao .lu-social-badge { background: #fee500; color: #191919; }
.lu-social-kakao { background: rgba(254,229,0,0.12); border-color: rgba(210,190,0,0.45); }
.lu-social-kakao:hover { background: rgba(254,229,0,0.22); }
.lu-social-naver .lu-social-badge { background: #03c75a; color: #fff; }
.lu-social-naver { background: rgba(3,199,90,0.07); border-color: rgba(3,150,70,0.35); }
.lu-social-naver:hover { background: rgba(3,199,90,0.14); }
.lu-social-note {
  margin-top: 2px;
  font-size: 10px; letter-spacing: 0.03em;
  color: #b0aca4;
  text-align: center;
}

.lu-logged-chip {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  border: 1px solid rgba(0,0,0,0.14);
  border-left: 2px solid var(--lu-gold);
  border-radius: 3px;
  background: rgba(0,0,0,0.025);
}
.lu-logged-avatar {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px;
  border-radius: 50%;
  background: #1a1a1c; color: var(--lu-gold);
  font-size: 13px; font-weight: 400;
  flex: 0 0 auto;
}
.lu-logged-name { font-size: 13px; color: #1a1a1a; }
.lu-logged-via {
  font-size: 10px; color: #999;
  border: 1px solid #ddd; border-radius: 50%;
  width: 17px; height: 17px;
  display: inline-flex; align-items: center; justify-content: center;
}
.lu-logout-btn {
  margin-left: auto;
  background: transparent; border: none;
  font-family: var(--lu-font); font-weight: 300;
  font-size: 11px; letter-spacing: 0.04em;
  color: #999; cursor: pointer;
  transition: color 0.25s ease;
}
.lu-logout-btn:hover { color: var(--lu-gold); }

.lu-auth-or {
  display: flex; align-items: center; gap: 12px;
  margin: 18px 0 4px;
}
.lu-auth-or::before, .lu-auth-or::after {
  content: ''; flex: 1; height: 1px; background: rgba(0,0,0,0.1);
}
.lu-auth-or span {
  font-size: 10px; letter-spacing: 0.12em;
  color: #b0aca4;
}

/* --------------------------------- HUD --------------------------------- */
.lu-hud {
  position: fixed; z-index: 500;
  opacity: 0; visibility: hidden; pointer-events: none;
  transition: opacity 0.6s ease, visibility 0.6s;
}
.lu-hud.lu-visible { opacity: 1; visibility: visible; }
/* [P0] \uC778\uD130\uB799\uD2F0\uBE0C HUD\uB294 \uAC00\uC2DC\uD654\uC640 \uD568\uAED8 \uD130\uCE58\uB3C4 \uBCF5\uAD6C (\uAC10\uC0AC \uBC1C\uACAC \uBC84\uADF8) */
#lu-dock.lu-visible, #lu-controls-toggle.lu-visible { pointer-events: auto; }
/* (\uC791\uD488 \uCE74\uB4DC\uC758 \uD130\uCE58 \uAE30\uAE30 \uBC30\uCE58\uB294 \uC791\uD488 \uD328\uB110 \uBCA0\uC774\uC2A4 CSS \uB4A4\uC5D0\uC11C \uC7AC\uC815\uC758 \u2014 \uCE90\uC2A4\uCF00\uC774\uB4DC \uC21C\uC11C) */

#lu-controls {
  top: calc(16px + env(safe-area-inset-top, 0px));
  left: max(16px, env(safe-area-inset-left, 0px));
  background: rgba(23,20,15,0.82);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  padding: 14px 18px;
  border: 1px solid rgba(253,251,245,0.16);
  border-left: 3px solid var(--lu-gold);
  box-shadow: inset 0 1px 0 rgba(253,251,245,0.10);
  font-size: 12px; font-weight: 500; line-height: 1.9;
  color: rgba(253,251,245,0.88);
}
#lu-controls .lu-key {
  display: inline-block; min-width: 72px;
  color: var(--lu-gold); letter-spacing: 0.06em;
}
#lu-controls .lu-controls-title {
  font-size: 10px; letter-spacing: 0.24em;
  color: rgba(255,255,255,0.5);
  margin-bottom: 6px;
}

#lu-topright {
  top: calc(16px + env(safe-area-inset-top, 0px));
  right: max(16px, env(safe-area-inset-right, 0px));
  display: flex; flex-direction: column; align-items: flex-end;
  gap: 6px;
  font-size: 12px; letter-spacing: 0.08em;
  text-align: right;
}
#lu-topright .lu-stat {
  background: rgba(23,20,15,0.66);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(253,251,245,0.16);
  box-shadow: inset 0 1px 0 rgba(253,251,245,0.10);
  padding: 6px 12px;
  font-weight: 500;
  color: rgba(253,251,245,0.85);
}
#lu-topright .lu-stat b {
  font-weight: 600; font-variant-numeric: tabular-nums; color: #8fd0ab;
}
/* \uC131\uB2A5 \uC9C0\uD45C\uB294 \uB514\uBC84\uADF8 \uC815\uBCF4 \u2014 \uD130\uCE58 \uAE30\uAE30 1\uCC28 HUD\uC5D0\uC11C \uC81C\uC678 (\uAC8C\uC784 HUD \uAC10\uC0AC) */
@media (pointer: coarse) { #lu-topright { display: none; } }

/* \uC0C1\uB2E8 \uD1B5\uD569 \uBC14 \u2014 \uC804\uC2DC\uBA85 + \uB77C\uC774\uBE0C \uC811\uC18D\uC790 (Gilded Frame \uC720\uB9AC \uCE69) */
#lu-topbar {
  border-radius: 17px;
  top: calc(10px + env(safe-area-inset-top, 0px));
  left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 10px;
  height: 34px; padding: 0 16px;
  max-width: min(78vw, 480px);
  background: rgba(23,20,15,0.66);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(253,251,245,0.16);
  box-shadow: inset 0 1px 0 rgba(253,251,245,0.10);
}
#lu-topbar.lu-empty { opacity: 0 !important; }
.lu-topbar-title {
  font-size: 11px; font-weight: 500;
  letter-spacing: 0.28em; text-indent: 0.28em;
  color: rgba(253,251,245,0.85);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.lu-topbar-sep { width: 1px; height: 12px; background: rgba(253,251,245,0.2); flex: none; }
.lu-topbar-count {
  display: flex; align-items: center; gap: 5px; flex: none;
  font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums;
  color: #8fd0ab;
}
.lu-topbar-count::before {
  content: ''; width: 5px; height: 5px; border-radius: 50%;
  background: #7ec97e; box-shadow: 0 0 6px rgba(126,201,126,0.8);
}
.lu-topbar-count b { display: inline-block; font-weight: 600; }
.lu-topbar-count.lu-tick b { animation: lu-count-tick 0.3s cubic-bezier(0.34,1.56,0.64,1); }
@keyframes lu-count-tick { 0% { transform: scale(1.25); } 100% { transform: scale(1); } }

#lu-status {
  /* \uD558\uB2E8\uC740 \uC870\uC774\uC2A4\uD2F1\xB7\uB3C5\uC758 \uC601\uC5ED \u2014 \uD1A0\uC2A4\uD2B8\uB294 \uC0C1\uB2E8 \uBC14 \uC544\uB798\uB85C */
  top: calc(54px + env(safe-area-inset-top, 0px)); left: 50%;
  transform: translateX(-50%);
  max-width: min(80vw, 560px);
  background: rgba(23,20,15,0.66);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(253,251,245,0.16);
  border-left: 3px solid var(--lu-gold);
  box-shadow: inset 0 1px 0 rgba(253,251,245,0.10);
  padding: 7px 18px;
  font-size: 12px; font-weight: 600; letter-spacing: 0.08em;
  color: rgba(253,251,245,0.95);
  text-align: center;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  transition: opacity 0.22s cubic-bezier(0.22,1,0.36,1);
}
#lu-status:empty { opacity: 0; visibility: hidden; }

/* --------------------------------- \uCC44\uD305 --------------------------------- */
#lu-chat {
  bottom: 16px; left: 16px;
  width: min(340px, calc(100vw - 32px));
  display: flex; flex-direction: column; gap: 8px;
}
/* \uD130\uCE58 \uAE30\uAE30 \uAE30\uBCF8: \uC785\uB825\uCC3D\uC744 \uC811\uC5B4 \uD558\uB2E8\uC744 \uAC00\uC0C1 \uC870\uC774\uC2A4\uD2F1 \uC601\uC5ED\uC73C\uB85C \uBE44\uC6CC\uB454\uB2E4.
   (\uC2E4\uAE30\uAE30 UX \uD53C\uB4DC\uBC31 \u2014 \uC804\uD3ED \uCC44\uD305 \uC785\uB825\uCC3D\uC774 \uC67C\uCABD \uC5C4\uC9C0\uB97C \uC0BC\uCF1C \uD0A4\uBCF4\uB4DC\uAC00 \uC62C\uB77C\uC624\uB358 \uBB38\uC81C) */
#lu-chat.lu-chat-collapsed #lu-chat-input { display: none; }
#lu-chat.lu-chat-collapsed { pointer-events: none; }
#lu-chat-log {
  display: flex; flex-direction: column; gap: 3px;
  max-height: 220px; overflow: hidden;
}
.lu-chat-msg {
  background: rgba(10,10,12,0.5);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  padding: 5px 10px;
  font-size: 12px; line-height: 1.5;
  color: rgba(255,255,255,0.9);
  word-break: break-word;
  animation: lu-chat-in 0.25s ease;
  align-self: flex-start;
  max-width: 100%;
}
@keyframes lu-chat-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.lu-chat-name { font-weight: 400; color: rgba(255,255,255,0.65); margin-right: 6px; }
.lu-chat-msg.lu-self .lu-chat-name { color: var(--lu-gold); }
#lu-chat-input {
  width: 100%;
  font-family: var(--lu-font); font-weight: 300;
  font-size: 13px; color: #fff;
  background: rgba(10,10,12,0.6);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.12);
  padding: 9px 12px; outline: none;
  opacity: 0.55; pointer-events: auto;
  transition: opacity 0.25s ease, border-color 0.25s ease;
  border-radius: 0;
}
#lu-chat-input::placeholder { color: rgba(255,255,255,0.35); letter-spacing: 0.06em; }
#lu-chat-input:focus { opacity: 1; border-color: var(--lu-gold); }

/* ----------------------------- \uC791\uD488 \uC815\uBCF4 \uD328\uB110 ----------------------------- */
#lu-artwork {
  /* \uBBF8\uC220\uAD00 \uBCBD\uBA74 \uCEA1\uC158 \uCE74\uB4DC \u2014 \uD06C\uB9BC \uC885\uC774 + \uACE8\uB4DC \uC0C1\uB2E8 \uC561\uC13C\uD2B8 */
  position: fixed; z-index: 600;
  top: 50%; right: 16px;
  transform: translate(calc(100% + 40px), -50%);
  width: min(320px, calc(100vw - 28px));
  background: linear-gradient(180deg, #fffdf8 0%, #f8f4ea 100%);
  color: #1c1a16;
  padding: 26px 26px 22px;
  border-radius: 16px;
  border: 1px solid rgba(95,158,125,0.28);
  box-shadow: 0 18px 50px rgba(20,15,8,0.30), 0 2px 8px rgba(20,15,8,0.12);
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease;
}
#lu-artwork::before {
  /* \uACE8\uB4DC \uC0C1\uB2E8 \uB808\uC77C \u2014 \uCC54\uD37C \uBAA8\uC11C\uB9AC\uC640 \uC815\uB82C\uB418\uB294 \uC88C\uCE21 \uAE30\uC810 \uC9E7\uC740 \uC120 */
  content: '';
  position: absolute; top: 0; left: var(--lu-ch-l, 14px); width: 44px; height: 3px;
  background: linear-gradient(90deg, var(--lu-gold), rgba(95,158,125,0));
}
#lu-artwork.lu-open { transform: translate(0, -50%); }
#lu-artwork .lu-art-eyebrow {
  font-size: 9.5px; letter-spacing: 0.34em;
  color: #3f7a5c; margin-bottom: 10px;
}
#lu-artwork .lu-art-title {
  font-size: 21px; font-weight: 600; line-height: 1.32;
  letter-spacing: -0.01em; color: #17140f;
}
#lu-artwork .lu-art-meta {
  margin-top: 7px;
  font-size: 12px; letter-spacing: 0.05em;
  color: #8a8172;
}
#lu-artwork .lu-art-rule {
  width: 34px; height: 2px; border-radius: 2px;
  background: var(--lu-gold); opacity: 0.65; margin: 16px 0 14px;
}
#lu-artwork .lu-art-desc {
  font-size: 13px; line-height: 1.85; color: #4a453c;
  max-height: 38vh; overflow-y: auto;
}
#lu-artwork .lu-art-hint {
  margin-top: 18px;
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11.5px; letter-spacing: 0.05em; color: #6b6459;
  font-family: var(--lu-font); font-weight: 500;
  background: rgba(95,158,125,0.10);
  border: 1px solid rgba(95,158,125,0.45); border-radius: 999px;
  cursor: pointer;
  padding: 8px 16px; text-align: center;
  transition: background 0.25s ease, color 0.25s ease;
}
#lu-artwork .lu-art-hint:hover { background: var(--lu-gold); color: #17140f; }
#lu-artwork .lu-art-hint .lu-key {
  display: inline-block;
  min-width: 16px; text-align: center;
  margin-right: 7px;
  padding: 1px 6px;
  border: 1px solid var(--lu-gold);
  color: var(--lu-gold);
  font-size: 10px; letter-spacing: 0.04em;
}
/* \uD130\uCE58 \uAE30\uAE30: \uC791\uD488 \uCE74\uB4DC\uB97C \uD558\uB2E8 \uC88C\uCE21 \uBBF8\uB2C8 \uCEA1\uC158\uC73C\uB85C \uC774\uB3D9 \u2014 \uC2DC\uC810 \uB4DC\uB798\uADF8 \uC874\uC744
   \uC544\uC608 \uBC97\uC5B4\uB098\uBBC0\uB85C pointer-events \uD575\uC774 \uBD88\uD544\uC694. \uCE74\uB4DC \uC804\uCCB4\uAC00 '\uD06C\uAC8C \uBCF4\uAE30' \uD0ED \uD0C0\uAE43. */
@media (pointer: coarse) {
  #lu-artwork {
    top: auto; right: auto;
    left: max(12px, env(safe-area-inset-left, 0px));
    bottom: calc(96px + env(safe-area-inset-bottom, 0px));
    width: min(248px, calc(100vw - 104px)); /* \uC6B0\uCE21 \uB3C5 \uD3ED \uD68C\uD53C */
    padding: 14px 16px 12px;
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(20,15,8,0.35);
    transform: translateY(16px); opacity: 0; pointer-events: none;
    transition: transform var(--lu-slide), opacity 0.25s ease;
  }
  #lu-artwork.lu-open { transform: translateY(0); opacity: 1; pointer-events: auto; }
  #lu-artwork .lu-art-eyebrow { font-size: 9px; letter-spacing: 0.3em; margin-bottom: 6px; }
  #lu-artwork .lu-art-title { font-size: 15px; }
  #lu-artwork .lu-art-meta { font-size: 11px; margin-top: 4px; }
  #lu-artwork .lu-art-rule { margin: 10px 0 0; }
  #lu-artwork .lu-art-desc { display: none; } /* \uC124\uBA85\uC740 \uB77C\uC774\uD2B8\uBC15\uC2A4\uC5D0\uC11C */
  #lu-artwork .lu-art-hint {
    margin-top: 10px; padding: 6px 12px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
    border-radius: 999px;
  }
}

/* ---------------------- \uD130\uCE58 \uAE30\uAE30: \uC870\uC791\uBC95 \uC811\uAE30 + \uC561\uC158 \uB3C5 ---------------------- */
#lu-controls.lu-collapsed { display: none; }
#lu-controls-toggle {
  position: fixed; z-index: 520;
  top: calc(10px + env(safe-area-inset-top, 0px));
  left: max(12px, env(safe-area-inset-left, 0px));
  width: 34px; height: 34px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(23,20,15,0.66);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(253,251,245,0.16);
  box-shadow: inset 0 1px 0 rgba(253,251,245,0.10);
  color: rgba(253,251,245,0.9);
  font-family: var(--lu-font); font-weight: 700; font-size: 14px;
  cursor: pointer;
  transition: transform var(--lu-spring), background-color 0.25s ease;
}
#lu-controls-toggle:active {
  transform: scale(0.90); background-color: rgba(253,251,245,0.14);
  transition-duration: 0s;
}
#lu-dock {
  position: fixed; z-index: 520;
  right: max(12px, env(safe-area-inset-right, 0px));
  bottom: calc(108px + env(safe-area-inset-bottom, 0px));
  display: flex; flex-direction: column; gap: 14px;
}
.lu-dock-wrap { filter: drop-shadow(0 4px 14px rgba(10,8,4,0.45)); }
.lu-dock-btn {
  position: relative; overflow: hidden; /* lu-on \uB178\uCE58\uAC00 \uB77C\uC6B4\uB4DC\uB97C \uB118\uC9C0 \uC54A\uAC8C */
  width: 56px; height: 56px; border-radius: 12px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px;
  background: rgba(23,20,15,0.66);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(253,251,245,0.16);
  box-shadow: inset 0 1px 0 rgba(253,251,245,0.10);
  color: rgba(253,251,245,0.92);
  font-family: var(--lu-font);
  cursor: pointer;
  transition: transform var(--lu-spring), background-color 0.25s ease,
              border-color 0.25s ease, color 0.25s ease;
}
.lu-dock-btn svg {
  width: 21px; height: 21px; fill: none;
  stroke: currentColor; stroke-width: 1.8;
  stroke-linecap: round; stroke-linejoin: round;
}
.lu-dock-label {
  font-size: 9px; font-weight: 700; letter-spacing: 0.1em; opacity: 0.75;
}
.lu-dock-btn:active {
  transform: scale(0.90);
  background-color: rgba(253,251,245,0.14);
  transition-duration: 0s;
}
/* \uC8FC \uD589\uB3D9(\uCEA1\uCC98) \u2014 \uD654\uBA74 \uC720\uC77C\uC758 \uACE8\uB4DC \uBA74 */
.lu-dock-btn.lu-gold {
  background: linear-gradient(180deg, #6fae8c, #4e8a6a);
  border-color: rgba(199,232,213,0.65);
  box-shadow: inset 0 1px 0 rgba(223,240,228,0.55);
  color: var(--lu-ink);
}
.lu-dock-btn.lu-gold .lu-dock-label { opacity: 1; }
.lu-dock-btn.lu-gold.lu-cap-pop { animation: lu-cap-pop 0.45s ease; }
@keyframes lu-cap-pop {
  0% { transform: scale(0.90); }
  55% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
/* \uD1A0\uAE00 ON \u2014 \uACE8\uB4DC \uD5E4\uC5B4\uB77C\uC778 + \uC88C\uCE21 \uB178\uCE58 (\uBA74 \uCC44\uC6C0 \uAE08\uC9C0) */
.lu-dock-btn.lu-on {
  border-color: rgba(95,158,125,0.85);
  color: #8fd0ab;
}
.lu-dock-btn.lu-on::before {
  content: ''; position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px;
  background: var(--lu-gold);
}
#lu-more-sheet {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 640;
  border-radius: 16px 16px 0 0;
  padding: 10px 16px calc(18px + env(safe-area-inset-bottom, 0px));
  background: rgba(23,20,15,0.82);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(95,158,125,0.45); /* \uC2DC\uD2B8 \uC720\uC77C \uACE8\uB4DC \u2014 '\uC5F4\uB9BC' \uC2E0\uD638 */
  transform: translateY(105%);
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}
#lu-more-sheet.lu-open { transform: translateY(0); }
.lu-sheet-handle {
  width: 36px; height: 4px; border-radius: 2px;
  background: rgba(253,251,245,0.28);
  margin: 0 auto 12px;
}
.lu-sheet-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
}
#lu-more-sheet .lu-sheet-btn {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  min-width: 0; padding: 14px 8px; border-radius: 12px;
  background: rgba(253,251,245,0.06);
  border: 1px solid rgba(253,251,245,0.14);
  color: rgba(253,251,245,0.92); font-family: var(--lu-font);
  font-size: 10px; font-weight: 700; letter-spacing: 0.1em; cursor: pointer;
  transition: transform var(--lu-spring), background-color 0.2s ease;
}
#lu-more-sheet .lu-sheet-btn svg {
  width: 20px; height: 20px; fill: none;
  stroke: currentColor; stroke-width: 1.8;
  stroke-linecap: round; stroke-linejoin: round;
}
#lu-more-sheet .lu-sheet-btn:active {
  transform: scale(0.94); background-color: rgba(253,251,245,0.14);
  transition-duration: 0s;
}
#lu-more-backdrop {
  position: fixed; inset: 0; z-index: 630;
  background: rgba(10,8,4,0.35);
  opacity: 0; pointer-events: none;
  transition: opacity 0.25s ease;
}
#lu-more-backdrop.lu-open { opacity: 1; pointer-events: auto; }
#lu-lightbox { touch-action: none; }
.lu-lightbox-media { transition: transform 0.08s linear; will-change: transform; }

/* -------------------------------- \uB77C\uC774\uD2B8\uBC15\uC2A4 -------------------------------- */
#lu-lightbox {
  position: fixed; inset: 0; z-index: 950;
  background: rgba(4,4,5,0.96);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 64px 32px 40px;
  opacity: 0; pointer-events: none;
  transition: opacity 0.32s ease;
}
#lu-lightbox.lu-open {
  opacity: 1; pointer-events: auto;
}
#lu-lightbox-close {
  position: fixed; top: 22px; right: 26px; z-index: 951;
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  background: transparent; border: 1px solid rgba(255,255,255,0.25);
  border-radius: 50%;
  color: rgba(255,255,255,0.75);
  font-size: 18px; font-weight: 300; line-height: 1;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}
#lu-lightbox-close:hover {
  border-color: var(--lu-gold); color: var(--lu-gold);
  transform: rotate(90deg);
}
.lu-lightbox-stage {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  display: flex; align-items: center; justify-content: center;
  transform: scale(0.97); opacity: 0;
  transition: transform 0.36s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.36s ease;
}
#lu-lightbox.lu-open .lu-lightbox-stage { transform: scale(1); opacity: 1; }
.lu-lightbox-media {
  /* \uC2A4\uD14C\uC774\uC9C0(flex \uC794\uC5EC \uACF5\uAC04)\uB97C \uAE30\uC900\uC73C\uB85C \uB9DE\uCDB0 \uCEA1\uC158\uC744 \uCE68\uBC94\uD558\uC9C0 \uC54A\uB294\uB2E4 */
  max-width: 100%; max-height: 100%;
  object-fit: contain;
  box-shadow: 0 30px 90px rgba(0,0,0,0.6);
}
.lu-lightbox-caption {
  flex: 0 0 auto;
  width: 100%; max-width: 640px;
  margin-top: 26px;
  text-align: center;
}
.lu-lightbox-title {
  font-size: 25px; font-weight: 600; line-height: 1.35;
  letter-spacing: -0.01em;
  color: #fff;
}
.lu-lightbox-caption::before {
  content: '';
  display: block;
  width: 34px; height: 2px; margin: 0 auto 16px;
  background: var(--lu-gold); border-radius: 2px; opacity: 0.8;
}
.lu-lightbox-meta {
  margin-top: 8px;
  font-size: 12px; letter-spacing: 0.12em;
  color: var(--lu-gold);
}
.lu-lightbox-rule {
  width: 28px; height: 1px; background: rgba(255,255,255,0.2);
  margin: 18px auto;
}
.lu-lightbox-desc {
  font-size: 13px; line-height: 1.85;
  color: rgba(255,255,255,0.55);
  max-height: 16vh; overflow-y: auto;
}
.lu-lightbox-desc:empty { display: none; }

/* ----------------------------- \uC791\uD488 \uBAA9\uB85D \uD328\uB110 ----------------------------- */
#lu-artlist {
  position: fixed; z-index: 650;
  top: 0; right: 0; bottom: 0;
  width: min(340px, calc(100vw - 24px));
  background: rgba(255,255,255,0.97);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  color: #111;
  box-shadow: -18px 0 50px rgba(0,0,0,0.28);
  transform: translateX(105%);
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  display: flex; flex-direction: column;
}
#lu-artlist.lu-open { transform: translateX(0); }
#lu-artlist-head {
  flex: 0 0 auto;
  display: flex; align-items: center; justify-content: space-between;
  padding: 22px 24px 16px;
  border-bottom: 1px solid #eee;
}
#lu-artlist-title {
  font-size: 13px; letter-spacing: 0.28em; text-indent: 0.28em;
  color: #111;
}
#lu-artlist-close {
  flex: 0 0 auto;
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  background: transparent; border: 1px solid #ddd; border-radius: 50%;
  color: #999; font-size: 15px; font-weight: 300; line-height: 1;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}
#lu-artlist-close:hover { border-color: var(--lu-gold); color: var(--lu-gold); transform: rotate(90deg); }
#lu-artlist-body {
  flex: 1 1 auto; min-height: 0;
  overflow-y: auto;
}
.lu-artlist-card {
  display: flex; align-items: center; gap: 14px;
  width: 100%; text-align: left;
  font-family: var(--lu-font); font-weight: 300;
  background: transparent; border: none; border-bottom: 1px solid #f0f0ee;
  padding: 14px 24px;
  cursor: pointer;
  transition: background 0.2s ease;
}
.lu-artlist-card:hover { background: #f6f3ea; }
.lu-artlist-thumb {
  flex: 0 0 auto;
  width: 56px; height: 56px; object-fit: cover;
  background: #eee;
}
.lu-artlist-info { min-width: 0; }
.lu-artlist-name {
  font-size: 13px; color: #111;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.lu-artlist-artist {
  margin-top: 4px;
  font-size: 11px; letter-spacing: 0.04em; color: #999;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.lu-artlist-empty {
  padding: 40px 24px; text-align: center;
  font-size: 12px; color: #aaa;
}

/* ------------------------------- \uBC29\uBA85\uB85D \uD328\uB110 ------------------------------- */
/* \uC791\uD488 \uBAA9\uB85D \uD328\uB110\uACFC \uB300\uCE6D \u2014 \uD654\uBA74 \uC67C\uCABD\uC5D0\uC11C \uC2AC\uB77C\uC774\uB4DC-\uC778 */
#lu-guestbook {
  position: fixed; z-index: 650;
  top: 0; left: 0; bottom: 0;
  width: min(340px, calc(100vw - 24px));
  overflow: visible; /* \uCC45\uAC08\uD53C \uD0ED\uC774 \uD328\uB110 \uC624\uB978\uCABD \uBC14\uAE65\uC73C\uB85C \uB098\uC628\uB2E4 */
  background: linear-gradient(180deg, #fdfbf5 0%, #f6f1e4 100%);
  color: #1c1a16;
  box-shadow: 18px 0 50px rgba(20,15,8,0.28);
  transform: translateX(-100%); /* \uB2EB\uD600\uB3C4 \uCC45\uAC08\uD53C \uD0ED\uC740 \uD654\uBA74\uC5D0 \uB0A8\uB294\uB2E4 */
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  display: flex; flex-direction: column;
}
#lu-guestbook.lu-open { transform: translateX(0); }

/* \uCC45\uAC08\uD53C \uD0ED \u2014 \uD328\uB110 \uC624\uB978\uCABD \uAC00\uC7A5\uC790\uB9AC\uC5D0 \uBD99\uC5B4 \uD568\uAED8 \uBBF8\uB044\uB7EC\uC9C4\uB2E4 */
#lu-gbtab {
  /* \uB2E4\uD06C \uC720\uB9AC + \uACE8\uB4DC \uB77C\uC778 \uCC45\uAC08\uD53C \u2014 \uAC10\uB3C5 \uD53D (\uC885\uC774 \uC7AC\uC9C8 \uC2E4\uD5D8\uC740 \uD68C\uADC0) */
  position: absolute;
  right: -33px; top: max(20%, calc(env(safe-area-inset-top, 0px) + 72px));
  writing-mode: vertical-rl;
  padding: 15px 8px 15px 6px;
  background: rgba(10,10,12,0.72);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.16);
  border-left: 2px solid var(--lu-gold);
  border-radius: 0 9px 9px 0;
  color: rgba(255,255,255,0.92);
  font-family: var(--lu-font); font-weight: 300;
  font-size: 12px; letter-spacing: 0.3em;
  cursor: pointer;
  opacity: 0; pointer-events: none;
  transition: opacity 0.6s ease, color 0.25s ease, transform var(--lu-spring);
}
#lu-gbtab.lu-visible { opacity: 1; pointer-events: auto; }
#lu-gbtab:hover { color: var(--lu-gold); }
#lu-gbtab:active { transform: translateX(2px); transition-duration: 0s; }
#lu-guestbook-head {
  flex: 0 0 auto;
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 24px 24px 16px;
  border-bottom: 1px solid rgba(95,158,125,0.35);
}
#lu-guestbook-title .lu-gb-eyebrow {
  display: block;
  font-size: 9.5px; letter-spacing: 0.34em; color: #3f7a5c;
  margin-bottom: 6px;
}
#lu-guestbook-title .lu-gb-main {
  display: block;
  font-size: 20px; font-weight: 600; letter-spacing: -0.01em; color: #17140f;
}
#lu-guestbook-title .lu-gb-sub {
  display: block;
  margin-top: 5px;
  font-size: 11.5px; color: #8a8172; letter-spacing: 0.03em;
}
#lu-guestbook-close {
  flex: 0 0 auto;
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  background: transparent; border: 1px solid #ddd; border-radius: 50%;
  color: #999; font-size: 15px; font-weight: 300; line-height: 1;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}
#lu-guestbook-close:hover { border-color: var(--lu-gold); color: var(--lu-gold); transform: rotate(90deg); }
#lu-guestbook-body {
  flex: 1 1 auto; min-height: 0;
  overflow-y: auto;
}
.lu-gbook-note {
  /* \uBC29\uBA85\uB85D \uD55C \uC7A5 \u2014 \uC885\uC774 \uCE74\uB4DC + \uD070\uB530\uC634\uD45C \uC6CC\uD130\uB9C8\uD06C */
  position: relative;
  margin: 12px 16px 0;
  padding: 14px 16px 14px 18px;
  background: #fffefb;
  border: 1px solid #efe8d6;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(31,26,18,0.05);
}
.lu-gbook-note::before {
  content: '\u201C';
  position: absolute; top: 2px; right: 12px;
  font-size: 34px; line-height: 1; color: rgba(95,158,125,0.28);
  font-family: Georgia, serif;
}
#lu-guestbook-body > .lu-gbook-note:last-child { margin-bottom: 14px; }
.lu-gbook-dot {
  display: inline-block; width: 8px; height: 8px; border-radius: 50%;
  margin-right: 7px; vertical-align: 1px;
}
.lu-gbook-name { font-size: 12.5px; font-weight: 600; color: #3f3a30; }
.lu-gbook-time {
  margin-left: 8px;
  font-size: 10px; letter-spacing: 0.04em; color: #b3ab99;
}
.lu-gbook-text {
  margin-top: 7px;
  font-size: 13px; line-height: 1.7; color: #4a453c;
  word-break: break-word; white-space: pre-wrap;
}
.lu-gbook-empty {
  margin: 20px 16px; padding: 36px 20px; text-align: center;
  font-size: 12.5px; line-height: 1.8; color: #a89f8c;
  border: 1px dashed #ddd3ba; border-radius: 12px;
}
#lu-guestbook-footer {
  flex: 0 0 auto;
  padding: 14px 16px calc(16px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid rgba(95,158,125,0.30);
  background: rgba(255,254,251,0.7);
}
#lu-gbook-input {
  width: 100%; resize: none;
  font-family: var(--lu-font); font-weight: 400;
  font-size: 13px; color: #1c1a16;
  background: #fffefb;
  border: 1px solid #e5dcc4;
  padding: 11px 13px; outline: none;
  border-radius: 12px;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}
#lu-gbook-input::placeholder { color: #b3ab99; }
#lu-gbook-input:focus { border-color: var(--lu-gold); box-shadow: 0 0 0 3px rgba(95,158,125,0.15); }
.lu-gbook-footer-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 10px;
}
.lu-gbook-count {
  font-size: 10px; letter-spacing: 0.04em; color: #bbb;
}
#lu-gbook-submit {
  font-family: var(--lu-font); font-weight: 600;
  font-size: 12.5px; letter-spacing: 0.06em;
  color: #17140f;
  background: var(--lu-gold);
  border: 1px solid var(--lu-gold); border-radius: 999px;
  padding: 9px 22px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  box-shadow: 0 3px 12px rgba(95,158,125,0.35);
}
#lu-gbook-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(95,158,125,0.45); }
#lu-gbook-submit:disabled {
  background: transparent; color: #b3ab99;
  border-color: #ddd3ba; box-shadow: none; cursor: default;
}
#lu-gbook-submit:hover { background: var(--lu-gold); border-color: var(--lu-gold); color: #111; }
#lu-gbook-submit:disabled { opacity: 0.35; cursor: default; }
#lu-gbook-submit:disabled:hover { background: #111; border-color: #111; color: #fff; }

/* -------------------------------- \uD22C\uC5B4 \uBC14 -------------------------------- */
#lu-tourbar {
  position: fixed; z-index: 500;
  bottom: 78px; left: 50%;
  display: flex; align-items: center; gap: 16px;
  background: rgba(10,10,12,0.6);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  padding: 11px 24px;
  border-top: 2px solid var(--lu-gold);
  font-size: 12px; letter-spacing: 0.05em;
  color: rgba(255,255,255,0.85);
  max-width: min(90vw, 640px);
  opacity: 0; pointer-events: none;
  transform: translate(-50%, 16px);
  transition: opacity 0.3s ease, transform 0.3s ease;
  white-space: nowrap;
}
#lu-tourbar.lu-open { opacity: 1; pointer-events: auto; transform: translate(-50%, 0); }
#lu-tourbar button {
  font-family: var(--lu-font); font-weight: 300;
  font-size: 12px; letter-spacing: 0.03em;
  color: rgba(255,255,255,0.85);
  background: transparent; border: none;
  cursor: pointer; padding: 4px 2px;
  transition: color 0.2s ease;
}
#lu-tourbar button:hover { color: var(--lu-gold); }
.lu-tour-sep {
  flex: 0 0 auto;
  width: 1px; height: 14px; background: rgba(255,255,255,0.2);
}
.lu-tour-count { color: var(--lu-gold); }
.lu-tour-title {
  display: inline-block;
  max-width: 220px; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; vertical-align: bottom;
  color: rgba(255,255,255,0.85);
}
#lu-tourbar .lu-tour-auto.lu-tour-on { color: var(--lu-gold); }
#lu-tourbar-exit { color: rgba(255,255,255,0.6); }
#lu-tourbar-exit:hover { color: var(--lu-gold); }

/* ------------------------------- \uC154\uD130 \uD50C\uB798\uC2DC ------------------------------- */
/* \uD3EC\uD1A0 \uBAA8\uB4DC(P\uD0A4) \uCEA1\uCC98 \uC21C\uAC04 \uD770 \uD50C\uB798\uC2DC \u2014 flashShutter()\uAC00 opacity\uB97C \uC9C1\uC811 \uC81C\uC5B4\uD55C\uB2E4 */
#lu-shutter {
  position: fixed; inset: 0; z-index: 970;
  background: #fff;
  opacity: 0; pointer-events: none;
}

/* -------------------------------- \uACF5\uC720 \uBAA8\uB2EC -------------------------------- */
#lu-share {
  position: fixed; inset: 0; z-index: 980;
  background: rgba(4,4,5,0.96);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  opacity: 0; pointer-events: none;
  transition: opacity 0.3s ease;
}
#lu-share.lu-open { opacity: 1; pointer-events: auto; }
.lu-share-card {
  position: relative;
  width: 100%; max-width: 460px;
  max-height: 92vh; overflow-y: auto;
  background: rgba(255,255,255,0.97);
  color: #111;
  padding: 26px 24px 22px;
  box-shadow: 0 30px 90px rgba(0,0,0,0.5);
  text-align: center;
  transform: scale(0.97); opacity: 0;
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.32s ease;
}
#lu-share.lu-open .lu-share-card { transform: scale(1); opacity: 1; }
#lu-share-close {
  position: absolute; top: 14px; right: 14px;
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  background: transparent; border: 1px solid #ddd; border-radius: 50%;
  color: #999; font-size: 15px; font-weight: 300; line-height: 1;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}
#lu-share-close:hover { border-color: var(--lu-gold); color: var(--lu-gold); transform: rotate(90deg); }
.lu-share-title {
  font-size: 13px; letter-spacing: 0.28em; text-indent: 0.28em;
  color: #111; margin-bottom: 18px;
}
.lu-share-preview {
  display: block;
  max-width: 100%; max-height: 55vh;
  margin: 0 auto;
  object-fit: contain;
  border: 1px solid #eee;
  background: #f4f4f2;
}
.lu-share-actions {
  display: flex; flex-direction: column; gap: 8px;
  margin-top: 20px;
}
.lu-share-btn {
  width: 100%;
  font-family: var(--lu-font); font-weight: 300;
  font-size: 13px; letter-spacing: 0.04em;
  color: #222; background: transparent;
  border: 1px solid rgba(0,0,0,0.18);
  border-radius: 3px;
  padding: 11px 16px; cursor: pointer;
  transition: border-color 0.25s ease, background 0.25s ease, color 0.25s ease;
}
.lu-share-btn:hover { border-color: rgba(0,0,0,0.45); }
.lu-share-btn-primary {
  background: var(--lu-gold); border-color: var(--lu-gold); color: #111;
}
.lu-share-btn-primary:hover { background: #c4a02f; border-color: #c4a02f; }
.lu-share-btn-copied { border-color: var(--lu-gold); color: var(--lu-gold); }
.lu-share-hint {
  margin-top: 16px;
  font-size: 10px; letter-spacing: 0.02em; line-height: 1.6;
  color: #b0aca4;
}

/* ------------------------------- \uBAA8\uBC14\uC77C ------------------------------- */
@media (max-width: 640px) {
  .lu-lobby-card { padding: 34px 22px 26px; }
  .lu-lobby-title { font-size: 19px; }
  #lu-controls { font-size: 11px; padding: 10px 12px; }
  #lu-controls .lu-key { min-width: 60px; }
  #lu-chat { width: calc(100vw - 24px); left: 12px; bottom: 12px; }
  #lu-chat-log { max-height: 130px; }
  #lu-status { font-size: 11px; padding: 6px 14px; }
  #lu-topbar { max-width: 72vw; padding: 0 12px; }
  .lu-topbar-title { font-size: 10px; letter-spacing: 0.2em; text-indent: 0.2em; }
  #lu-lightbox { padding: 56px 18px 28px; }
  #lu-lightbox-close { top: 14px; right: 14px; width: 36px; height: 36px; font-size: 16px; }
  .lu-lightbox-media { max-width: 100%; max-height: 100%; }
  .lu-lightbox-title { font-size: 19px; }
  .lu-lightbox-caption { margin-top: 18px; }
  #lu-artlist { width: calc(100vw - 24px); }
  #lu-artlist-head { padding: 18px 18px 14px; }
  .lu-artlist-card { padding: 12px 18px; gap: 12px; }
  #lu-guestbook { width: calc(100vw - 24px); }
  #lu-guestbook-head { padding: 18px 18px 14px; }
  .lu-gbook-note { padding: 12px 18px; }
  #lu-guestbook-footer { padding: 14px 18px 16px; }
  #lu-tourbar {
    bottom: 92px; padding: 9px 14px; gap: 10px;
    font-size: 11px; max-width: calc(100vw - 20px);
  }
  .lu-tour-title { max-width: 110px; }
  .lu-share-card { padding: 20px 16px 18px; max-width: calc(100vw - 24px); }
  .lu-share-preview { max-height: 42vh; }
}

/* --------------------- \uC544\uBC14\uD0C0 \uCEE4\uC2A4\uD130\uB9C8\uC774\uC800: \uBAA8\uBC14\uC77C(\uC138\uB85C \uC2A4\uD0DD) --------------------- */
@media (max-width: 720px) {
  #lu-avatar-maker, #lu-chibi-maker { padding: 8px; }
  /* \uBAA8\uBC14\uC77C \uC2A4\uD06C\uB864 \u2014 \uCE74\uB4DC \uC804\uCCB4\uAC00 \uD558\uB098\uB85C \uC138\uB85C \uC2A4\uD06C\uB864\uD55C\uB2E4(\uAC10\uB3C5: \uC704\uC544\uB798\uB85C \uD654\uBA74 \uC804\uCCB4\uAC00 \uC6C0\uC9C1\uC774\uACE0
     \uC800\uC7A5 \uCE78\uAE4C\uC9C0 \uBC00\uB824 \uC0AC\uB77C\uC9C0\uAC8C). head\uB9CC \uC0C1\uB2E8 sticky\uB85C \uACE0\uC815(\uB2EB\uAE30 \uBC84\uD2BC \uD56D\uC0C1 \uC811\uADFC), \uD504\uB9AC\uBDF0\xB7\uC635\uC158\xB7
     footer(\uC800\uC7A5 \uCE78)\uB294 \uD750\uB984\uC5D0 \uC2E4\uB824 \uD568\uAED8 \uC2A4\uD06C\uB864\uB41C\uB2E4. dvh \uD3F4\uBC31\uC740 iOS \uC8FC\uC18C\uCC3D vh \uBB38\uC81C(hotfix #12). */
  .lu-am-card {
    max-width: 96vw; max-height: 92vh; max-height: 92dvh; border-radius: 24px;
    /* -webkit-overflow-scrolling:touch \uC81C\uAC70 \u2014 iOS Safari\uC5D0\uC11C \uC774 \uB808\uAC70\uC2DC \uD50C\uB798\uADF8\uAC00 \uC2A4\uD06C\uB864\uB7EC\uB97C
       \uBCC4\uB3C4 \uB808\uC774\uC5B4\uB85C \uC2B9\uACA9\uD574 sticky \uD5E4\uB354 z-index\uB97C \uBB34\uC2DC(\uCF58\uD150\uCE20\uAC00 \uD5E4\uB354 \uC704\uB85C \uC0C8\uACE0 \uAE5C\uBE61). iOS 13+\uB294
       overflow:auto\uC5D0 \uAD00\uC131 \uC2A4\uD06C\uB864 \uAE30\uBCF8 \uC81C\uACF5\uC774\uB77C \uC81C\uAC70\uD574\uB3C4 \uAD00\uC131 \uC720\uC9C0. */
    overflow-y: auto; overscroll-behavior: contain;
  }
  .lu-am-head {
    padding: 14px 16px 12px;
    position: sticky; top: 0; z-index: 20; background: var(--am-cream);  /* \uBD88\uD22C\uBA85 \uBC30\uACBD, \uB4A4 \uBE44\uCE68 \uBC29\uC9C0 */
    /* iOS Safari sticky \uAE5C\uBE61 \uBC29\uC9C0 \u2014 \uD5E4\uB354\uB97C \uC790\uCCB4 \uCEF4\uD3EC\uC9C0\uD130 \uB808\uC774\uC5B4\uB85C \uC2B9\uACA9\uD574 \uAD00\uC131 \uC2A4\uD06C\uB864 \uC911\uC5D0\uB3C4 \uCF58\uD150\uCE20
       \uC704\uC5D0 \uC548\uC815\uC801\uC73C\uB85C \uACE0\uC815\uD55C\uB2E4. sticky containing block\uC740 \uC2A4\uD06C\uB864 \uC870\uC0C1(\uCE74\uB4DC)\uC774\uB77C \uC790\uAE30 transform\uC740
       \uACE0\uC815 \uB3D9\uC791\uC744 \uC548 \uAE6C\uB2E4. z-index 20\uC73C\uB85C \uD504\uB9AC\uC14B \uCE69 \uC2A4\uD0DD\uBCF4\uB2E4 \uD655\uC2E4\uD788 \uC704. */
    transform: translateZ(0);
    -webkit-backface-visibility: hidden;
    box-shadow: 0 6px 10px -4px rgba(40,30,10,0.22);  /* \uC544\uB798 \uBA54\uB274\uC640 \uB69C\uB837\uC774 \uBD84\uB9AC(\uAC10\uB3C5 "\uC644\uBCBD \uBD84\uB9AC") */
  }
  /* \uD504\uB9AC\uBDF0(\uD070 \uCE90\uB9AD\uD130) \uC704, \uC635\uC158 \uD328\uB110 \uC544\uB798\uB85C \uC138\uB85C \uC313\uAE30. body\uB294 \uC790\uC5F0 \uB192\uC774(flex 0 0)\uB77C \uC2A4\uD06C\uB864\uC740
     \uCE74\uB4DC\uAC00 \uB2F4\uB2F9 \u2014 \uC774\uC911 \uC2A4\uD06C\uB864 \uC5C6\uC74C. \uCE90\uB9AD\uD130\uB294 \uADF8 \uC790\uB9AC\uC5D0\uC11C \uD63C\uC790 \uC2E0\uB098\uAC8C \uC6C0\uC9C1\uC778\uB2E4(\uC790\uB3D9 \uC5F0\uAE30). */
  .lu-am-body {
    flex: 0 0 auto; flex-direction: column; gap: 14px; padding: 12px 14px 4px;
    overflow: visible;
    position: relative; z-index: 0;  /* \uD5E4\uB354(z20) \uC544\uB798\uB85C \uBABB\uBC15\uC544 \uCE69\uC774 transform \uCEE8\uD14D\uC2A4\uD2B8\uAC00 \uB3FC\uB3C4 \uC704\uB85C \uC548 \uC0C8\uAC8C */
  }
  .lu-am-preview { width: auto; max-width: none; align-self: center; padding: 12px; }
  .lu-am-stagewrap { width: 200px; height: 267px; max-width: none; margin: 0 auto; }
  /* \uD328\uB110\uC740 \uC790\uC5F0 \uB192\uC774(\uC2A4\uD06C\uB864\uC740 body\uAC00 \uB2F4\uB2F9) \u2014 \uD0ED \uB0B4\uBE44\uB294 \uAC00\uB85C \uC2A4\uD06C\uB864\uB85C \uD55C \uC904 \uC720\uC9C0 */
  .lu-am-panel { flex: 0 0 auto; }
  .lu-am-nav { margin-bottom: 12px; padding: 4px 0 10px; }
  .lu-am-navtab { min-width: 52px; font-size: 10px; padding: 7px 10px 6px; }
  .lu-am-navtab svg { width: 18px; height: 18px; }
  .lu-am-tabpage { flex: 0 0 auto; overflow: visible; max-height: none; }
  /* footer(\uB85C\uADF8\uC778 \uAC8C\uC774\uD2B8) \uCEF4\uD329\uD2B8 */
  .lu-am-footer { padding: 10px 14px 12px; }
  .lu-am-guest-gate { margin-bottom: 6px; }
  .lu-am-gate-note { font-size: 10.5px; line-height: 1.35; margin-bottom: 6px; }
  .lu-am-signup-providers { flex-direction: row; flex-wrap: wrap; gap: 6px; }
  .lu-am-social { flex: 1 1 auto; min-width: 0; padding: 9px 8px; font-size: 10.5px; justify-content: center; }
  .lu-am-btn { padding: 10px 16px; font-size: 12px; }
}
/* \uCD08\uC18C\uD615 \uD3ED(320px\uB300) \u2014 \uBB34\uB300 \uC0B4\uC9DD \uCD95\uC18C\uD574 \uAC00\uB85C \uB118\uCE68 \uBC29\uC9C0. */
@media (max-width: 360px) {
  .lu-am-stagewrap { width: 168px; height: 224px; }
}
`;
  const style = document.createElement("style");
  style.id = "lu-styles";
  style.textContent = css;
  document.head.appendChild(style);
}
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "className") node.className = v;
    else if (k === "text") node.textContent = v;
    else node.setAttribute(k, v);
  }
  for (const child of children) node.appendChild(child);
  return node;
}
export {
  GOLD,
  el,
  injectStyles
};
