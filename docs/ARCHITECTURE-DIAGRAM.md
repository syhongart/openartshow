# OpenArtShow 전체 구조 (Mermaid)

> 이 파일은 **그림**이다. 규칙의 SSOT 는 [`ARCHITECTURE.md`](./ARCHITECTURE.md) 이고,
> 진입점 노출의 SSOT 는 [`scripts/lib/entrypoints.mjs`](../scripts/lib/entrypoints.mjs) 다.
> 그림과 코드가 어긋나면 **코드를 따른다.**
>
> 기준: `world12` 슬롯 포함 (behind-flag). 라이브 오픈월드는 **world2**.

## 1. 방문자가 닿는 면

```mermaid
flowchart TB
  subgraph live["라이브 — 사이트에서 링크됨"]
    landing["landing.html<br/>배포: /"]
    guide["guide.html"]
    about["about.html"]
    appIndex["index.html<br/>고정 미술관"]
    studio["studio.html"]
    builder["builder.html"]
    mypage["mypage.html"]
    world2["world2.html<br/>오픈월드 입장"]
  end

  subgraph flagged["behind-flag — 배포되지만 링크 없음"]
    world1["world.html<br/>구 월드1"]
    visit["visit.html"]
    lab["lab-glb.html"]
    w3["world3"]
    w5["world5"]
    w7["world7"]
    w8["world8"]
    w10["world10"]
    w11["world11"]
    w12["world12"]
    styl["world2-stylized"]
    editor["editor.html"]
  end

  landing --> appIndex
  landing --> world2
  landing --> mypage
  studio --> builder
  world2 -.-> styl
```

## 2. 런타임 층

```mermaid
flowchart LR
  subgraph schema["스키마 SSOT"]
    space["space.ts<br/>normalizeSpace"]
    chibi["chibi-schema<br/>normalizeChibi"]
  end

  subgraph parts["형상"]
    geo["space-parts<br/>partGeo · MATS"]
  end

  subgraph asm["조립"]
    assembler["space-assembler"]
    barrel["space-render.js<br/>배럴"]
  end

  subgraph protected["보호 4파일 — 라이브 고정 전시"]
    main["main.js"]
    player["player.js"]
    artworks["artworks.js"]
    config["config.js"]
  end

  space --> assembler
  geo --> assembler
  assembler --> barrel
  barrel --> main
  chibi --> main
  main --> player
  main --> artworks
  config --> main

  visitMod["visit.js<br/>가산 모듈"]
  barrel --> visitMod
```

보호 파일은 `visit.js` 를 **import 하지 않는다.**

## 3. 월드 계보

```mermaid
flowchart TB
  w2k["world2/<br/>Kernel + Systems + decide/"]
  w2page["world2.html · 라이브"]
  stylb["world2-stylized-boot<br/>?styl=1"]

  w2k --> w2page
  w2k --> stylb

  fork3["world3/ 포크"]
  fork5["world5/ 포크"]
  w2k -.->|복사 후 no-sync| fork3
  w2k -.->|복사 후 no-sync| fork5

  glb["world-glb/<br/>GLB 한 덩이"]
  w7["world7-boot<br/>파일 선택"]
  w8["world8-boot<br/>고정 GLB"]
  w11["world11-boot<br/>manhattan-180m"]
  w12["world12-boot<br/>초기 자산 = world11"]

  glb --> w7
  glb --> w8
  glb --> w11
  glb --> w12

  w10tree["world10/<br/>격자 셀 스트리밍"]
  nyc["nyc-cell.glb"]
  nyc --> w10tree
```

`world4` · `world6` · `world9` 는 결번이다.

## 4. 데이터가 화면에 닿기까지

```mermaid
flowchart LR
  author["작가"]
  json["공간 JSON<br/>localStorage · 링크"]
  norm["normalizeSpace"]
  gpu["기기 렌더<br/>three r171"]
  visitor["관람객 브라우저"]

  author --> json
  json --> norm
  norm --> gpu
  gpu --> visitor
```

서버에 전시 DB 는 없다. 방문자 브라우저는 기본적으로 **우리 호스트만** 본다.
예외: PeerJS 시그널링 · YouTube nocookie · `img-src https:`.

## 5. 배포

```mermaid
flowchart TB
  pr["PR"]
  verify["ci.yml verify<br/>lint · typecheck · test"]
  smoke["smoke"]
  mainb["main"]
  gen["생성기<br/>devlog · team · valuation"]
  vite["vite build<br/>base /openartshow/"]
  site["_site"]
  pages["gh-pages<br/>GitHub Pages"]
  live["verify-live<br/>알림 · 롤백 아님"]

  pr --> verify
  pr --> smoke
  verify --> mainb
  smoke --> mainb
  mainb --> gen
  gen --> vite
  vite --> site
  site --> pages
  pages --> live
```

`verify` 가 실패하면 `deploy` 는 뜨지 않는다. `verify-live` 실패는 이미 나간 배포를 되돌리지 않는다.
