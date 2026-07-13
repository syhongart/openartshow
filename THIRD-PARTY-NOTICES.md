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

## 5. Pretendard (폰트) — `web/vendor/fonts/Pretendard-*.woff2`
Copyright (c) 2021 Kil Hyung-jin (길형진), with Reserved Font Name "Pretendard".
License: SIL Open Font License 1.1 · https://scripts.sil.org/OFL
라이선스 전문: `web/vendor/fonts/OFL.txt` 동봉.
변경: 웹 배포 최적화를 위해 KS X 1001 상용 2350자 + 라틴·자모·구두점·통화로
서브셋함 (용량 4.4MB → 1.2MB). 원저작물의 글리프 부분집합입니다.

--------------------------------------------------------------------------------

※ `web/assets/`의 그 밖의 이미지·영상(`neon-vanitas.png`, `neon-motion.mp4`, `og.png`),
  절차적으로 생성되는 앰비언트 오디오(Web Audio API), 그리고 `web/js/`의 애플리케이션
  코드는 홍성용(OpenArtShow)의 자체 제작 저작물입니다.
