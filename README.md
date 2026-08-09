# OpenArtShow — 웹 3D 가상 전시 플랫폼

OpenArtShow는 **웹 브라우저만으로 접속하는 3D 가상 전시 플랫폼**입니다. 작가는 손쉽게 전시를 등록하고, 관람객은 루이지애나 미술관 스타일의 몰입감 있는 3D 전시장에서 작품을 감상할 수 있습니다.

<!-- AUTO:STATUS -->
## 상태

- **개발일지**: 141건
- **팀 규모**: 12명 (창업자 1 · 정규직 4 · 계약직 7)
- **누적 인건비**: 확정 6613만원 · 범위형 4건 · 시세 미확인 2건
- **밸류에이션**: 2.20억원(2026-08-10)
- **갱신일**: 2026-08-10

자세한 인사기록·급여는 [/making/team/](./making/team/) 참조.
<!-- /AUTO:STATUS -->

## 라이브 링크

- **랜딩 페이지**: https://syhongart.github.io/openartshow/
- **전시장 입장**: https://syhongart.github.io/openartshow/app/
- **작가 스튜디오**: https://syhongart.github.io/openartshow/app/studio.html

## 주요 기능

- **3D 전시 감상**: 아치형 목조 볼트 천장, 통유리 벽, 중정의 큰 나무가 있는 실내 공간
  - PC: WASD 이동, Shift 달리기, 마우스 시점 조작
  - 모바일: 왼쪽 화면 터치 이동 + 오른쪽 화면 드래그 시점
- **작품 정보**: 작품 3m 이내 접근 시 우측에 정보 패널 표시
- **라이트박스**: E키로 작품 전체화면 확대 (ESC/X/배경클릭 닫기)
- **멀티플레이어**: 같은 전시장에 접속한 사람들이 아바타로 표시되고, Enter키로 채팅 가능
- **사운드**: 입장 시 새소리·바람 앰비언트 음향
- **전시 선택**: 로비의 전시 목록 또는 URL 파라미터(`?g=<전시id>`)로 전시 선택
- **아야모(Ayamo)**: 자체 제작 마스코트 캐릭터 — 헤어·표정·의상 꾸미기 (저장됨). 콕 찌르면 "아얏!" 하는 리액션에서 이름이 왔다
- **방명록·도슨트 투어·사진 촬영**: G키 방명록, T키 자동 투어, P키 SNS용 캡처
- **시간 연동 테마**: 접속 시각에 따라 아침/낮/석양/밤 조명 자동 전환

## 크레딧

- 밤하늘 은하수 파노라마: [ESO/S. Brunier](https://www.eso.org/public/images/eso0932a/) (CC BY 4.0, 웹 배포용 크기 조정함)
- 낮/석양 하늘 HDRI: [Poly Haven](https://polyhaven.com) (CC0)
- 번들 라이브러리·에셋의 전체 라이선스 고지는 [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md) 참조

## 기술 스택

- **3D 렌더링**: Three.js r160 (ES 모듈, 빌드 도구 없음)
- **멀티플레이어**: PeerJS (P2P 연결)
- **오디오**: Web Audio API (앰비언트 사운드)
- **배포**: GitHub Pages (`gh-pages` 브랜치)

## 폴더 구조

> 아래는 **개요**다. `frontend/js/`의 실제 모듈은 이후 SOLID 분해로 다수의 하위 모듈로
> 나뉘었고(예: `scene.js`·`ui.js`·`space-render.js`는 얇은 재수출 배럴), 소스는 TypeScript(`.ts`)로
> 점진 전환 중이다. **현행 모듈 지도·아키텍처 원칙은 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)가 SSOT.**

```
openartshow/
├── frontend/                   # 프론트엔드 소스
│   ├── index.html              # 3D 전시장 (app/로 배포)
│   ├── landing.html            # 랜딩 페이지 (루트의 index.html로 배포)
│   ├── guide.html              # 이용 안내 (루트의 guide.html로 배포)
│   ├── studio.html             # 작가 스튜디오 (app/로 배포)
│   ├── js/                     # 프런트엔드 모듈 (.ts 소스 + 컴파일 .js)
│   │   ├── main.js             # 메인 진입점(Composition Root) 및 전시장 초기화
│   │   ├── player.js           # 플레이어 이동 및 카메라 제어
│   │   ├── artworks.js         # 작품 로딩 및 정보 패널
│   │   ├── config.js           # 전역 설정 상수
│   │   ├── space.ts            # 공간 문서 스키마 SSOT (normalizeSpace/migrateSpace)
│   │   ├── space-parts.ts      # 파츠 지오메트리·재질 (partGeo/partAccent/MATS)
│   │   ├── multiplayer.js      # PeerJS 기반 멀티플레이어 (P2P 연결, 채팅)
│   │   └── …                   # 그 외 다수 (전체 지도는 docs/ARCHITECTURE.md)
│   ├── galleries/              # 전시 갤러리 데이터
│   │   └── index.json          # 등록된 전시 목록 및 메타데이터
│   ├── assets/                 # 자산 (이미지, 리소스)
│   └── vendor/                 # 외부 라이브러리 (Three.js 등)
└── README.md                   # 이 파일
```

### 배포 구조

- 개발 저장소의 `frontend/landing.html`, `frontend/guide.html` → 루트(`index.html`, `guide.html`)로 배포
- `frontend/index.html`, `frontend/studio.html` → `app/`로 배포
- **자동배포**: `main`에 push하면 GitHub Actions(`.github/workflows/deploy.yml`)가 빌드 후
  `gh-pages` 브랜치로 배포 → GitHub Pages 자동 갱신 (수동 조작 불필요)

## 새 전시 열기

### 방법 A — 공유 링크 발행 (권장, 서버·가입 불필요)
1. https://syhongart.github.io/openartshow/app/studio.html 접속
2. 전시 제목·설명·작품(이미지 URL, 최대 14점 + 대표작 2점) 입력
3. **[공유 링크 만들기]** → 전시 데이터가 압축되어 URL(#gz=)에 통째로 담긴 링크 생성
4. 그 링크를 SNS/메신저에 공유 — 받는 사람은 클릭 즉시 그 전시에 입장
   (같은 링크로 들어온 사람끼리 같은 멀티플레이 방에서 만난다)

### 방법 B — 저장소 상설 등록 (전시 디렉터리에 노출)
1. 스튜디오에서 **[JSON 다운로드]**
2. 파일을 `frontend/galleries/`에 추가하고 `frontend/galleries/index.json`에 메타데이터 등록
3. `main`에 커밋·push → 자동배포(위 "배포 구조" 참조)

## 라이선스 · 저작권 · 상표

- **저작권**: © 2026 홍성용 (Hong Sungyong). All rights reserved. 무단 복제·배포·상업적
  이용을 금합니다. 자세한 조건은 [LICENSE](./LICENSE)를 참조하세요.
- **제3자 구성요소**: `frontend/vendor/`의 라이브러리(Three.js · PeerJS = MIT)와 크레딧 에셋
  (ESO = CC BY 4.0, Poly Haven = CC0)은 각 라이선스를 따릅니다 —
  [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
- **상표**: **OpenArtShow™** 및 마스코트 **아야모™(Ayamo™)**는 홍성용(OpenArtShow)이
  사용하는 상표입니다(미등록 · 출원 준비 중). 무단 사용을 금합니다.
  ※ 아직 미등록 상태이므로 등록상표 기호(®)는 사용하지 않습니다.

문의 · 신고: syhongartist@gmail.com
