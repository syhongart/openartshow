#!/usr/bin/env node
// GLB 내보내기·재읽기 측정

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright-core';
import { startServer } from './server.mjs';
import { SITE_DIR, BASE_PATH, CHROMIUM_EXECUTABLE, CHROMIUM_ARGS, WEBGL_WAIT_MS } from './config.mjs';
import { assembleSiteVite } from './assemble.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const downloads = {
  export1: '/tmp/export1.glb', // 원본 내보내기
  export2: '/tmp/export2.glb', // 재읽기 후 내보내기
};

// 측정 실행
async function measure() {
  console.log('=== GLB 내보내기·재읽기 측정 ===\n');

  // vite 빌드
  console.log('[②-1] vite 빌드 및 _site 조립 중...');
  try {
    assembleSiteVite(SITE_DIR);
    console.log('✓ _site 조립 완료\n');
  } catch (e) {
    console.error('✗ _site 조립 실패:', e.message);
    process.exit(1);
  }

  // 서버 시작
  console.log('[②-2] 정적 서버 시작 중...');
  const { origin, close: closeServer } = await startServer(SITE_DIR, BASE_PATH);
  console.log(`✓ 서버 시작: ${origin}\n`);

  try {
    // 크로미움 시작
    console.log('[②-3] 헤드리스 크로미움 시작 중...');
    const browser = await chromium.launch({
      executablePath: CHROMIUM_EXECUTABLE,
      args: CHROMIUM_ARGS,
      headless: true,
    });
    console.log('✓ 크로미움 시작\n');

    // 페이지 열기
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      acceptDownloads: true, // 다운로드 활성화
    });
    const page = await context.newPage();

    // 콘솔 에러 감시
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message || String(err));
    });

    // world2 접속
    console.log('[②-4] world2.html 접속...');
    const url = `${origin}${BASE_PATH}app/world2.html`;
    console.log(`    URL: ${url}`);
    const startLoadTime = Date.now();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const loadTime = Date.now() - startLoadTime;
    console.log(`✓ 페이지 로드 완료 (${loadTime}ms)\n`);

    // WebGL 부팅 대기
    console.log(`[②-5] WebGL 부팅 대기 (${WEBGL_WAIT_MS}ms)...`);
    await page.waitForTimeout(WEBGL_WAIT_MS);
    console.log('✓ 부팅 완료\n');

    // __world2 대기
    console.log('[②-6] __world2 초기화 대기...');
    try {
      await page.waitForFunction(() => typeof window.__world2 !== 'undefined', { timeout: 30000 });
      console.log('✓ __world2 로드 완료\n');
    } catch (e) {
      // 콘솔 에러 확인
      console.error(`✗ __world2 미등장. 콘솔 에러:`);
      for (const err of consoleErrors) {
        console.error(`  - ${err.substring(0, 120)}`);
      }
      for (const err of pageErrors) {
        console.error(`  - ${err.substring(0, 120)}`);
      }
      throw e;
    }

    // 신 모드 패널 열기
    console.log('[②-7] 신 모드 패널 열기...');
    await page.click('#w2-god-toggle');
    await page.waitForTimeout(500);
    console.log('✓ 패널 열림\n');

    // 첫 번째 내보내기
    console.log('[②-8] 첫 번째 GLB 내보내기...');
    const downloadPromise1 = page.waitForEvent('download');
    const exportStartTime1 = Date.now();
    await page.click('#w2-export-glb');
    const download1 = await downloadPromise1;
    const exportTime1 = Date.now() - exportStartTime1;

    await download1.saveAs(downloads.export1);
    console.log(`✓ ${downloads.export1} (소요: ${exportTime1}ms)`);

    // 첫 번째 GLB 분석
    console.log('[②-9] 첫 번째 GLB 파일 검증...');
    const buffer1 = fs.readFileSync(downloads.export1);
    const magic1 = buffer1.toString('ascii', 0, 4);
    const version1 = buffer1.readUInt32LE(4);
    const length1 = buffer1.readUInt32LE(8);

    console.log(`  Magic: ${magic1} (expect 'glTF')`);
    console.log(`  Version: ${version1} (expect 2)`);
    console.log(`  File size: ${buffer1.length} bytes = ${(buffer1.length / 1024 / 1024).toFixed(2)}MB`);

    let gltfJson1 = null;
    let stats1 = {};
    try {
      const jsonStart = 20;
      const jsonEnd = 20 + length1;
      const jsonBuf = buffer1.slice(jsonStart, jsonEnd);
      gltfJson1 = JSON.parse(jsonBuf.toString('utf8'));

      const nodes = gltfJson1.nodes?.length || 0;
      const meshes = gltfJson1.meshes?.length || 0;
      const materials = gltfJson1.materials?.length || 0;
      const images = gltfJson1.images?.length || 0;

      let triangles = 0;
      if (gltfJson1.meshes) {
        for (const mesh of gltfJson1.meshes) {
          for (const prim of mesh.primitives || []) {
            if (prim.indices !== undefined && gltfJson1.accessors?.[prim.indices]) {
              triangles += gltfJson1.accessors[prim.indices].count / 3;
            } else if (gltfJson1.accessors?.[prim.attributes?.POSITION]) {
              triangles += gltfJson1.accessors[prim.attributes.POSITION].count / 3;
            }
          }
        }
      }

      stats1 = { nodes, meshes, materials, images, triangles };
      console.log(`  ✓ glTF JSON 파싱 성공`);
      console.log(`    - nodes: ${nodes}`);
      console.log(`    - meshes: ${meshes}`);
      console.log(`    - materials: ${materials}`);
      console.log(`    - images: ${images}`);
      console.log(`    - triangles: ${triangles.toFixed(0)}`);
    } catch (e) {
      console.error(`  ✗ JSON 파싱 실패: ${e.message}`);
    }

    // 콘솔 에러 보고
    console.log(`[②-10] 콘솔 에러 검사...`);
    console.log(`  console.error: ${consoleErrors.length}건`);
    if (consoleErrors.length > 0) {
      consoleErrors.slice(0, 3).forEach((msg, i) => {
        console.log(`    ${i+1}. ${msg.substring(0, 100)}`);
      });
    }
    console.log(`  page.error: ${pageErrors.length}건`);
    if (pageErrors.length > 0) {
      pageErrors.slice(0, 3).forEach((msg, i) => {
        console.log(`    ${i+1}. ${msg.substring(0, 100)}`);
      });
    }

    console.log('\n=== 측정 ③ 왕복 (편집·재읽기·재출력) ===\n');

    // GLB 수정 (building 그룹 translate +7.5, tree 자식 절반)
    console.log('[③-1] GLB 파일 수정 (building +7.5m, tree 절반)...');
    if (!gltfJson1) {
      console.error('✗ JSON이 없어서 수정 불가');
    } else {
      // building 노드 찾기
      const buildingNode = gltfJson1.nodes?.find(n => n.name === 'building');
      if (buildingNode) {
        if (!buildingNode.translation) buildingNode.translation = [0, 0, 0];
        buildingNode.translation[0] += 7.5;
        console.log(`  ✓ building translation +7.5m: [${buildingNode.translation.join(', ')}]`);
      } else {
        console.log('  ⚠ building 노드 없음');
      }

      // tree 그룹 자식 절반
      const treeNode = gltfJson1.nodes?.find(n => n.name === 'tree');
      if (treeNode && treeNode.children) {
        const origCount = treeNode.children.length;
        treeNode.children = treeNode.children.slice(0, Math.floor(origCount / 2));
        console.log(`  ✓ tree children: ${origCount} → ${treeNode.children.length}`);
      } else {
        console.log('  ⚠ tree 노드 또는 children 없음');
      }

      // GLB 재패킹
      const modifiedJsonStr = JSON.stringify(gltfJson1);
      const modifiedJsonBuf = Buffer.from(modifiedJsonStr, 'utf8');

      // 새 파일 구성: glTF 헤더 + JSON 청크헤더 + JSON 데이터 + 바이너리 청크(미변경)
      const headerBuf = buffer1.slice(0, 12); // glTF 헤더
      const jsonChunkHeader = Buffer.alloc(8);
      jsonChunkHeader.writeUInt32LE(modifiedJsonBuf.length, 0);
      jsonChunkHeader.writeUInt32LE(0x4e4f534a, 4); // 'JSON' in little-endian

      // 원본 바이너리 청크 찾기
      const jsonChunkSize = 8 + length1;
      const binaryStart = 12 + jsonChunkSize;
      const binaryChunk = buffer1.slice(binaryStart);

      // 새 GLB 조립
      const newGlb = Buffer.concat([headerBuf, jsonChunkHeader, modifiedJsonBuf, binaryChunk]);

      // 파일 크기 업데이트 (glTF 헤더의 length 필드)
      newGlb.writeUInt32LE(newGlb.length, 8);

      const modifiedGlbPath = '/tmp/modified.glb';
      fs.writeFileSync(modifiedGlbPath, newGlb);
      console.log(`  ✓ 수정된 GLB: ${modifiedGlbPath}\n`);

      // 수정된 파일 업로드
      console.log('[③-2] 수정된 GLB 파일 업로드...');
      await page.locator('#w2-import-glb-file').setInputFiles(modifiedGlbPath);
      console.log('  ✓ 파일 선택됨');

      // 임포트 버튼 클릭
      console.log('[③-3] 임포트 실행...');
      const importStartTime = Date.now();
      await page.click('#w2-import-glb');

      // 완료 대기 (라벨이 ✓로 시작)
      let importLabel = '';
      try {
        await page.waitForFunction(() => {
          const label = document.querySelector('#w2-import-glb')?.textContent || '';
          return label.startsWith('✓');
        }, { timeout: 10000 });
        importLabel = await page.textContent('#w2-import-glb');
      } catch {
        importLabel = await page.textContent('#w2-import-glb');
      }
      const importTime = Date.now() - importStartTime;

      console.log(`  ✓ 임포트 완료 (${importTime}ms)`);
      console.log(`    라벨: ${importLabel.substring(0, 60)}`);

      // 임포트 고지
      const noteText = await page.textContent('#w2-import-note');
      console.log(`    고지: ${noteText?.substring(0, 60) || '(없음)'}\n`);

      // 재출력
      console.log('[③-4] 재출력 GLB 내보내기...');
      const downloadPromise2 = page.waitForEvent('download');
      const exportStartTime2 = Date.now();
      await page.click('#w2-export-glb');
      const download2 = await downloadPromise2;
      const exportTime2 = Date.now() - exportStartTime2;

      await download2.saveAs(downloads.export2);
      console.log(`✓ ${downloads.export2} (소요: ${exportTime2}ms)`);

      // 재출력 GLB 분석
      console.log('[③-5] 재출력 GLB 분석...');
      const buffer2 = fs.readFileSync(downloads.export2);
      const length2 = buffer2.readUInt32LE(8);

      let gltfJson2 = null;
      let stats2 = {};
      try {
        const jsonStart = 20;
        const jsonEnd = 20 + length2;
        const jsonBuf = buffer2.slice(jsonStart, jsonEnd);
        gltfJson2 = JSON.parse(jsonBuf.toString('utf8'));

        const nodes = gltfJson2.nodes?.length || 0;
        const meshes = gltfJson2.meshes?.length || 0;
        const materials = gltfJson2.materials?.length || 0;
        const images = gltfJson2.images?.length || 0;

        let triangles = 0;
        if (gltfJson2.meshes) {
          for (const mesh of gltfJson2.meshes) {
            for (const prim of mesh.primitives || []) {
              if (prim.indices !== undefined && gltfJson2.accessors?.[prim.indices]) {
                triangles += gltfJson2.accessors[prim.indices].count / 3;
              } else if (gltfJson2.accessors?.[prim.attributes?.POSITION]) {
                triangles += gltfJson2.accessors[prim.attributes.POSITION].count / 3;
              }
            }
          }
        }

        stats2 = { nodes, meshes, materials, images, triangles };
        console.log(`  ✓ glTF JSON 파싱 성공`);
        console.log(`    - nodes: ${nodes}`);
        console.log(`    - meshes: ${meshes}`);
        console.log(`    - materials: ${materials}`);
        console.log(`    - images: ${images}`);
        console.log(`    - triangles: ${triangles.toFixed(0)}`);

        // building 평균 x 비교
        const buildingNode2 = gltfJson2.nodes?.find(n => n.name === 'building');
        if (buildingNode2?.translation) {
          console.log(`    - building translation[0]: ${buildingNode2.translation[0]}`);
        }
      } catch (e) {
        console.error(`  ✗ JSON 파싱 실패: ${e.message}`);
      }

      console.log('\n=== 결과 비교 ===\n');
      console.log('측정값\t\t| 원본\t| 재출력\t| 기대');
      console.log('---\t\t|---\t|---\t|---');
      console.log(`nodes\t\t| ${stats1.nodes || '?'}\t| ${stats2.nodes || '?'}\t| 동일`);
      console.log(`meshes\t\t| ${stats1.meshes || '?'}\t| ${stats2.meshes || '?'}\t| 동일`);
      console.log(`triangles\t| ${stats1.triangles?.toFixed(0) || '?'}\t| ${stats2.triangles?.toFixed(0) || '?'}\t| 동일`);
    }

    // 정리
    await browser.close();
    closeServer();
    console.log('\n✓ 모든 측정 완료');
    console.log(`\n파일 위치:`);
    console.log(`  1단계: ${downloads.export1}`);
    console.log(`  3단계: ${downloads.export2}`);

  } catch (e) {
    console.error('✗ 측정 실패:', e);
    closeServer();
    process.exit(1);
  }
}

measure();
