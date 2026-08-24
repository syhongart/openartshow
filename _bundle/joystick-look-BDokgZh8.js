const u=60;const l="0",b="1",s="2";function f(r){return!Number.isFinite(r)||r<.02?l:r>=.85?s:b}const n="253,251,245",t="23,20,15",p="10,8,4",o="95,158,125";function _(r){if(!("z"in r))throw new Error("joystickCss: `z`(z-index)를 명시하라 — 층위가 필요 없으면 `z: null`");const a=r.fixed?"fixed":"absolute",i=r.z===null?"":`z-index:${r.z};`,e=r.z===null?"":`z-index:${r.z+1};`,d=112/2,c=44/2,$=r.knobCenter==="margin"?`margin:-${c}px 0 0 -${c}px;`:"left:50%;top:50%;transform:translate(-50%,-50%);",x=r.knobOn?"opacity:0;transition:opacity .12s ease,":"transition:",g=r.knobOn?`
${r.knobOn}{opacity:1}`:"";return`
${r.base}{
  position:${a};width:112px;height:112px;
  margin:-${d}px 0 0 -${d}px;border-radius:50%;pointer-events:none;${i}
  border:1.5px solid rgba(${n},.38);
  background:radial-gradient(circle, rgba(${t},.10) 55%, rgba(${t},.34) 100%);
  box-shadow:0 2px 12px rgba(${p},.30), inset 0 0 0 1px rgba(${t},.20);
  opacity:0;transform:scale(.78);
  transition:opacity .12s ease, transform .16s cubic-bezier(.34,1.56,.64,1);
}
${r.on}{opacity:1;transform:scale(1)}
${r.base}::before{
  content:'';position:absolute;inset:-1.5px;border-radius:50%;
  background:
    linear-gradient(rgba(${n},.5), rgba(${n},.5)) 50% 0 / 2px 8px no-repeat,
    linear-gradient(rgba(${n},.5), rgba(${n},.5)) 50% 100% / 2px 8px no-repeat,
    linear-gradient(rgba(${n},.5), rgba(${n},.5)) 0 50% / 8px 2px no-repeat,
    linear-gradient(rgba(${n},.5), rgba(${n},.5)) 100% 50% / 8px 2px no-repeat;
}
${r.base}::after{
  content:'';position:absolute;inset:5px;border-radius:50%;
  border:1px dashed rgba(${n},.22);
  transition:border-color .15s ease, box-shadow .15s ease;
}
/* 🔴 움직임 — 감독 지시의 1단계. 원본에 **없던** 단계라 이 색은 화면 판정 전이다.
   원본 질주색(rgba(${o},.9))보다 옅게 잡아 «켜졌다» 와 «끝까지 갔다» 가 구별되게 했다. */
${r.lean(b)}::after{
  border-color:rgba(${o},.55);border-style:solid;
  box-shadow:0 0 6px rgba(${o},.25);
}
/* 질주 — 원본 .lu-run 값 그대로다 */
${r.lean(s)}::after{
  border-color:rgba(${o},.9);border-style:solid;
  box-shadow:0 0 10px rgba(${o},.5), inset 0 0 8px rgba(${o},.25);
}
${r.knob}{
  position:${a};width:44px;height:44px;border-radius:50%;
  /* ⚠ 형제 구조에서는 이 줄이 동작을 좌우한다. 갤러리·오픈월드는 손잡이가 링의 자식이
     아니라 body 직속 형제라 링의 pointer-events:none 이 상속되지 않는다 — 빠지면
     손잡이가 터치를 가로채 그 위에서 손가락을 움직일 때 이동이 끊긴다. world2 에서는
     부모가 이미 none 이라 중복이지만, 조건부로 내면 「어느 쪽이었더라」가 생긴다.
     원본에도 있는 값이므로 항상 낸다.
     ⚠⚠ 이 주석에 백틱을 쓰지 마라 — 여기는 템플릿 리터럴 안이고 백틱 하나로 끊긴다.
     같은 실수를 두 번 했다(2026-08-24 오전 ReferenceError, 오후 파싱 에러). */
  pointer-events:none;${e}
  ${$}
  background:radial-gradient(circle at 32% 28%, #fffdf8, #e8e2d2);
  border:1px solid rgba(${t},.28);
  box-shadow:0 3px 8px rgba(${p},.40), inset 0 -2px 4px rgba(${t},.14);
  ${x}background .15s ease, border-color .15s ease, box-shadow .15s ease;
}${g}
/* 움직임 — 진주에서 연초록으로. 화면 판정 전 값이다(위와 같은 이유). */
${r.leanKnob(b)}{
  background:radial-gradient(circle at 32% 28%, #ddf0e4, #9ac4ac);
  border-color:rgba(32,74,52,.40);
  box-shadow:0 0 0 1px rgba(${o},.5), 0 0 8px rgba(${o},.3),
    inset 0 -2px 4px rgba(32,74,52,.22);
}
/* 질주 — 원본 .lu-joy-knob.lu-run 값 그대로다 */
${r.leanKnob(s)}{
  background:radial-gradient(circle at 32% 28%, #b8e4c9, #5f9e7d);
  border-color:rgba(32,74,52,.55);
  box-shadow:0 0 0 1px rgba(${o},.9), 0 0 14px rgba(${o},.55),
    inset 0 -2px 4px rgba(32,74,52,.30);
}
@media (prefers-reduced-motion: reduce){
  ${r.base}{transition:none}
  ${r.knob}{transition:none}
}`}function N(r,a,i){if(r.getElementById(a))return;const e=r.createElement("style");e.id=a,e.textContent=i,r.head.appendChild(e)}export{u as J,b as L,s as a,l as b,N as i,_ as j,f as l};
