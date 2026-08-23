// ⚠️ **OpenArtShow 대체 구현 — 원본이 아니다.**
//
// three.js editor 원본 `Viewport.Pathtracer.js` 는 `three-gpu-pathtracer` 와
// `three-mesh-bvh` 를 **jsdelivr CDN 에서** import 한다. 우리 자기완결 원칙
// (*"방문자 브라우저가 남의 서버를 부르지 마라"*)에 걸리므로 **같은 공개 API 를 가진
// no-op 으로 갈아 끼웠다.**
//
// 왜 파일을 지우지 않았나: `Viewport.js` 가 pathtracer 를 8곳에서 부른다
// (`init`·`reset`·`setSize`·`setBackground`·`update`·`getSamples`…). 지우면 뷰포트가
// 통째로 안 뜬다. **API 를 남기고 속을 비우면 호출부를 한 줄도 안 고쳐도 된다** —
// 원본 editor 를 갱신할 때 이 파일만 다시 씌우면 되므로 포크 드리프트가 최소다.
//
// 잃는 것: 패스트레이싱 미리보기(Solid/Realistic 셰이딩 모드). **배치 도구에는 필요 없다** —
// 룩 판정은 world2 라이브에서 하고, 이 editor 는 좌표를 만드는 곳이다.
//
// 되살리려면: `three-gpu-pathtracer`·`three-mesh-bvh` 를 npm 으로 받아 `vendor/` 에
// 직서빙하고 원본 파일을 복원한다(CDN 링크만 아니면 된다 — CLAUDE.md 자기완결 절).

function ViewportPathtracer( /* renderer */ ) {

	function init() {}
	function setSize() {}
	function setBackground() {}
	function setEnvironment() {}
	function updateMaterials() {}
	function update() {}
	function reset() {}
	function getSamples() { return 0; }

	return {
		init: init,
		setSize: setSize,
		setBackground: setBackground,
		setEnvironment: setEnvironment,
		updateMaterials: updateMaterials,
		update: update,
		reset: reset,
		getSamples: getSamples
	};

}

export { ViewportPathtracer };
