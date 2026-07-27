#!/usr/bin/env python3
"""
구름 픽셀 덩어리의 가로:세로 비율 분석

방법:
1. 스크린샷 로드
2. 하늘 배경(약 RGB(11,13,18) 또는 유사)보다 밝은 픽셀 추출
3. connected component analysis(BFS)로 덩어리 식별
4. 각 덩어리의 bounding box 크기 측정
5. 가로:세로 비율 계산
"""

from PIL import Image
from collections import deque
import sys

def connected_components_bfs(binary_image):
    """BFS를 사용한 connected component 분석"""
    H = len(binary_image)
    W = len(binary_image[0]) if H > 0 else 0
    visited = [[False] * W for _ in range(H)]
    components = []

    for start_y in range(H):
        for start_x in range(W):
            if binary_image[start_y][start_x] and not visited[start_y][start_x]:
                # BFS로 이 연결 성분의 모든 픽셀 찾기
                component = []
                queue = deque([(start_y, start_x)])
                visited[start_y][start_x] = True

                while queue:
                    y, x = queue.popleft()
                    component.append((y, x))

                    # 상하좌우 네 방향 확인
                    for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < H and 0 <= nx < W and not visited[ny][nx] and binary_image[ny][nx]:
                            visited[ny][nx] = True
                            queue.append((ny, nx))

                if component:
                    components.append(component)

    return components

def analyze_screenshot(image_path):
    """스크린샷에서 구름 덩어리 분석"""
    try:
        img = Image.open(image_path).convert('RGB')
    except Exception as e:
        print(f"이미지 로드 실패: {e}")
        return

    pixels = img.load()
    W, H = img.size

    # 하늘 배경 색상 분석 (좌상단 코너에서 샘플링)
    sky_samples = []
    for y in range(10, min(50, H)):
        for x in range(10, min(50, W)):
            r, g, b = pixels[x, y]
            sky_samples.append((r, g, b))

    if not sky_samples:
        print("하늘 샘플을 충분히 수집할 수 없습니다.")
        return

    # 평균 하늘 색상
    avg_sky_r = sum(r for r, g, b in sky_samples) // len(sky_samples)
    avg_sky_g = sum(g for r, g, b in sky_samples) // len(sky_samples)
    avg_sky_b = sum(b for r, g, b in sky_samples) // len(sky_samples)
    print(f"하늘 배경 색상 (평균): RGB({avg_sky_r}, {avg_sky_g}, {avg_sky_b})")

    # 하늘보다 밝은 픽셀 추출
    def luminance(r, g, b):
        return 0.299 * r + 0.587 * g + 0.114 * b

    sky_lum = luminance(avg_sky_r, avg_sky_g, avg_sky_b)
    threshold_lum = sky_lum + 30

    binary = [[False] * W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            r, g, b = pixels[x, y]
            if luminance(r, g, b) > threshold_lum:
                binary[y][x] = True

    print(f"하늘 밝기: {sky_lum:.1f}, threshold: {threshold_lum:.1f}")

    # Connected component 분석 (BFS)
    components = connected_components_bfs(binary)
    print(f"감지된 덩어리: {len(components)}개")

    if not components:
        print("구름 덩어리를 감지하지 못했습니다.")
        return

    # 덩어리별 bounding box 및 비율 계산
    ratios = []
    for comp in components:
        ys = [p[0] for p in comp]
        xs = [p[1] for p in comp]
        min_y, max_y = min(ys), max(ys)
        min_x, max_x = min(xs), max(xs)
        height = max_y - min_y + 1
        width = max_x - min_x + 1
        area = len(comp)

        # 최소 30픽셀 이상만 포함
        if area >= 30:
            ratio = width / max(height, 1)
            ratios.append({
                'width': width,
                'height': height,
                'area': area,
                'ratio': ratio,
            })

    # 면적 기준 상위 10개 정렬
    ratios.sort(key=lambda x: x['area'], reverse=True)
    top_10 = ratios[:10]

    print(f"\n=== 상위 10개 덩어리 (면적 기준) ===")
    for i, r in enumerate(top_10, 1):
        print(f"{i}. {r['width']}:{r['height']} (면적={r['area']} 비율={r['ratio']:.2f}:1)")

    # 8:1 이하인 덩어리 비율
    count_le_8 = sum(1 for r in ratios if r['ratio'] <= 8.0)
    pct_le_8 = (count_le_8 / len(ratios) * 100) if ratios else 0
    print(f"\n8:1 이하인 덩어리: {count_le_8}/{len(ratios)} ({pct_le_8:.1f}%)")

    return top_10, pct_le_8

if __name__ == '__main__':
    screenshot_path = '/tmp/claude-0/-home-user-openartshow/10dfe60b-b9cb-5564-968f-1fa0c0d50697/scratchpad/world2_sky.png'
    analyze_screenshot(screenshot_path)
