# 제3자 고지 (THIRD-PARTY NOTICES)

본 프로젝트는 아래 제3자 소프트웨어 및 에셋을 포함하며, 각 라이선스를 따릅니다.
This project bundles the third-party software and assets below, each under its own license.

--------------------------------------------------------------------------------

## 1. Three.js (r160) — `web/vendor/three.module.js`, `GLTFLoader.js`, `RGBELoader.js`
Copyright (c) 2010-2023 Three.js Authors
License: MIT · https://github.com/mrdoob/three.js
(`GLTFLoader.js`, `RGBELoader.js`는 three.js `examples/jsm` 모듈로 동일 MIT 적용)

## 2. PeerJS — `web/vendor/peerjs.min.js`
Copyright (c) Michelle Bu and Eric Zhang · https://peerjs.com
License: MIT · https://github.com/peers/peerjs

### 위 1·2 항목에 적용되는 MIT License 전문

```
MIT License

Copyright (c) 2010-2023 Three.js Authors
Copyright (c) Michelle Bu and Eric Zhang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

--------------------------------------------------------------------------------

## 3. 밤하늘 은하수 파노라마 — `web/assets/sky/night.jpg`
저작자: ESO / S. Brunier
License: CC BY 4.0 · https://creativecommons.org/licenses/by/4.0/
출처: https://www.eso.org/public/images/eso0932a/
변경: 웹 배포용으로 크기 조정함 (원본에서 4096×2048로 리사이즈).

## 4. 하늘 HDRI — `web/assets/sky/day.hdr` (immenstadter_horn), `sunset.hdr` (venice_sunset)
출처: Poly Haven · https://polyhaven.com
License: CC0 1.0 (퍼블릭 도메인, 표시 의무 없음 — 감사 표기)

## 5. Pretendard (폰트) — `web/vendor/fonts/PretendardVariable-subset.woff2`
Copyright (c) 2021 Kil Hyung-jin (길형진), with Reserved Font Name "Pretendard".
License: SIL Open Font License 1.1 · https://scripts.sil.org/OFL
라이선스 전문: `web/vendor/fonts/OFL.txt` 동봉.
변경(2026-07-22): 공식 배포 PretendardVariable(가변 폰트, 1.3.9)에서 한글 5개
블록(U+1100-11FF, U+3130-318F, U+A960-A97F, U+AC00-D7A3, U+D7B0-D7FF — 이 프로젝트
에서는 NanumGothic이 담당·unicode-range로 우선 매칭됨)을 제외한 라틴·숫자·구두점·
통화 등 311자만 서브셋함(fvar wght 축 45-930 보존, 원본 6.7MB → 서브셋 60KB).
원저작물의 글리프 부분집합이며 font-family명 "Pretendard"는 원본 그대로 유지해
Reserved Font Name 조항을 위반하지 않습니다.

## 6. 나눔고딕 NanumGothic (폰트) — `web/vendor/fonts/NanumGothic-*.woff2`
Copyright (c) 2010 NHN Corporation. Font designed by Sandoll Communications Inc.
License: SIL Open Font License 1.1 · https://scripts.sil.org/OFL
라이선스 전문: `web/vendor/fonts/NanumGothic-OFL.txt` 동봉.
용도: 한글 본문 폰트(unicode-range로 한글에만 적용, 영문은 Pretendard). weight 400/700/800.
(fontsource `@fontsource/nanum-gothic`의 Korean 서브셋 woff2 사용 — 원저작물의 부분집합.)

## 7. Noto Serif KR (폰트) — `web/vendor/fonts/NotoSerifKR-*.woff2`
Copyright 2012 Google Inc. All Rights Reserved. (Google 빌드 — Reserved Font Name 없음)
License: SIL Open Font License 1.1 · https://scripts.sil.org/OFL
라이선스 전문: `web/vendor/fonts/NotoSerifKR-OFL.txt` 동봉.
용도: 에세이형 장문 텍스트(큐레이터 평문·작가 노트) 전용 세리프. UI 전역은 나눔고딕/
Pretendard 유지. weight 400.
변경: 웹 배포 최적화를 위해 한글은 KS X 1001 상용 2350자로 서브셋(971KB → 311KB),
라틴은 별도 서브셋 woff2. 원저작물의 글리프 부분집합입니다. (조달: fontsource
`@fontsource/noto-serif-kr` Korean/Latin 서브셋 → pyftsubset 재서브셋.) RFN 없음 →
family name "NotoSerifKR" 유지.

--------------------------------------------------------------------------------

※ `web/assets/`의 그 밖의 이미지·영상(`neon-vanitas.png`, `neon-motion.mp4`, `og.png`),
  절차적으로 생성되는 앰비언트 오디오(Web Audio API), 그리고 `web/js/`의 애플리케이션
  코드는 홍성용(OpenArtShow)의 자체 제작 저작물입니다.
