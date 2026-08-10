import * as THREE from 'three';

import { UIPanel, UIBreak, UIRow, UIColor, UISelect, UIText, UINumber } from './libs/ui.js';
import { UIOutliner, UITexture } from './libs/ui.three.js';

function SidebarScene( editor ) {

	const signals = editor.signals;
	const strings = editor.strings;

	const container = new UIPanel();
	container.setBorderTop( '0' );
	container.setPaddingTop( '20px' );

	// outliner

	const nodeStates = new WeakMap();

	function buildOption( object, draggable ) {

		const option = document.createElement( 'div' );
		option.draggable = draggable;
		option.innerHTML = buildHTML( object );
		option.value = object.id;

		// opener

		if ( nodeStates.has( object ) ) {

			const state = nodeStates.get( object );

			const opener = document.createElement( 'span' );
			opener.classList.add( 'opener' );

			if ( object.children.length > 0 ) {

				opener.classList.add( state ? 'open' : 'closed' );

			}

			opener.addEventListener( 'click', function () {

				nodeStates.set( object, nodeStates.get( object ) === false ); // toggle
				refreshUI();

			} );

			option.insertBefore( opener, option.firstChild );

		}

		return option;

	}

	function getMaterialName( material ) {

		if ( Array.isArray( material ) ) {

			const array = [];

			for ( let i = 0; i < material.length; i ++ ) {

				array.push( material[ i ].name );

			}

			return array.join( ',' );

		}

		return material.name;

	}

	function escapeHTML( html ) {

		return html
			.replace( /&/g, '&amp;' )
			.replace( /"/g, '&quot;' )
			.replace( /'/g, '&#39;' )
			.replace( /</g, '&lt;' )
			.replace( />/g, '&gt;' );

	}

	function getObjectType( object ) {

		if ( object.isScene ) return 'Scene';
		if ( object.isCamera ) return 'Camera';
		if ( object.isLight ) return 'Light';
		if ( object.isMesh ) return 'Mesh';
		if ( object.isLine ) return 'Line';
		if ( object.isPoints ) return 'Points';

		return 'Object3D';

	}

	function buildHTML( object ) {

		let html = `<span class="type ${ getObjectType( object ) }"></span> ${ escapeHTML( object.name ) }`;

		if ( object.isMesh ) {

			const geometry = object.geometry;
			const material = object.material;

			html += ` <span class="type Geometry"></span> ${ escapeHTML( geometry.name ) }`;
			html += ` <span class="type Material"></span> ${ escapeHTML( getMaterialName( material ) ) }`;

		}

		html += getScript( object.uuid );

		return html;

	}

	function getScript( uuid ) {

		if ( editor.scripts[ uuid ] === undefined ) return '';

		if ( editor.scripts[ uuid ].length === 0 ) return '';

		return ' <span class="type Script"></span>';

	}

	let ignoreObjectSelectedSignal = false;

	const outliner = new UIOutliner( editor );
	outliner.setId( 'outliner' );
	outliner.onChange( function () {

		ignoreObjectSelectedSignal = true;

		editor.selectById( parseInt( outliner.getValue() ) );

		ignoreObjectSelectedSignal = false;

	} );
	outliner.onDblClick( function () {

		editor.focusById( parseInt( outliner.getValue() ) );

	} );
	container.add( outliner );
	container.add( new UIBreak() );

	// background

	const backgroundRow = new UIRow();

	const backgroundType = new UISelect().setOptions( {

		'None': '',
		'Color': 'Color',
		'Texture': 'Texture',
		'Equirectangular': 'Equirect'

	} ).setWidth( '150px' );
	backgroundType.onChange( function () {

		onBackgroundChanged();
		refreshBackgroundUI();

	} );

	backgroundRow.add( new UIText( strings.getKey( 'sidebar/scene/background' ) ).setClass( 'Label' ) );
	backgroundRow.add( backgroundType );

	const backgroundColor = new UIColor().setValue( '#000000' ).setMarginLeft( '8px' ).onInput( onBackgroundChanged );
	backgroundRow.add( backgroundColor );

	const backgroundTexture = new UITexture( editor ).setMarginLeft( '8px' ).onChange( onBackgroundChanged );
	backgroundTexture.setDisplay( 'none' );
	backgroundRow.add( backgroundTexture );

	const backgroundEquirectangularTexture = new UITexture( editor ).setMarginLeft( '8px' ).onChange( onBackgroundChanged );
	backgroundEquirectangularTexture.setDisplay( 'none' );
	backgroundRow.add( backgroundEquirectangularTexture );

	container.add( backgroundRow );

	const backgroundEquirectRow = new UIRow();
	backgroundEquirectRow.setDisplay( 'none' );
	backgroundEquirectRow.setMarginLeft( '120px' );

	const backgroundBlurriness = new UINumber( 0 ).setWidth( '40px' ).setRange( 0, 1 ).onChange( onBackgroundChanged );
	backgroundEquirectRow.add( backgroundBlurriness );

	const backgroundIntensity = new UINumber( 1 ).setWidth( '40px' ).setRange( 0, Infinity ).onChange( onBackgroundChanged );
	backgroundEquirectRow.add( backgroundIntensity );

	const backgroundRotation = new UINumber( 0 ).setWidth( '40px' ).setRange( - 180, 180 ).setStep( 10 ).setNudge( 0.1 ).setUnit( '°' ).onChange( onBackgroundChanged );
	backgroundEquirectRow.add( backgroundRotation );

	container.add( backgroundEquirectRow );

	function onBackgroundChanged() {

		signals.sceneBackgroundChanged.dispatch(
			backgroundType.getValue(),
			backgroundColor.getHexValue(),
			backgroundTexture.getValue(),
			backgroundEquirectangularTexture.getValue(),
			backgroundBlurriness.getValue(),
			backgroundIntensity.getValue(),
			backgroundRotation.getValue()
		);

	}

	function refreshBackgroundUI() {

		const type = backgroundType.getValue();

		backgroundType.setWidth( type === 'None' ? '150px' : '110px' );
		backgroundColor.setDisplay( type === 'Color' ? '' : 'none' );
		backgroundTexture.setDisplay( type === 'Texture' ? '' : 'none' );
		backgroundEquirectangularTexture.setDisplay( type === 'Equirectangular' ? '' : 'none' );
		backgroundEquirectRow.setDisplay( type === 'Equirectangular' ? '' : 'none' );

	}

	// environment

	const environmentRow = new UIRow();

	// [OpenArtShow] 사용자가 환경을 직접 골랐는가. 아래 `applyBootEnvironment` 의 유일한
	// 가드이고 `environmentType.onChange` 에서만 켜진다.
	//
	// ⚠️ **선언이 여기 있는 이유**: 대입은 바로 아래 `onChange` 콜백 안이고 선언은 원래
	// 70줄쯤 아래에 있었다. DOM 이벤트로만 실행되니 실제 TDZ 는 안 났지만, **이 파일은
	// 1회차에 정확히 TDZ 로 부팅을 죽였다**(아래 주석 참조). 검수관 권고 P9 — 비용 1줄로
	// 위험을 0으로 만든다.
	let userChoseEnvironment = false;

	const environmentType = new UISelect().setOptions( {

		'None': '',
		'Background': 'Background',
		'Equirectangular': 'Equirect',
		'ModelViewer': 'ModelViewer'

	} ).setWidth( '150px' );
	// [OpenArtShow] 기본값을 `None` → `ModelViewer` 로 바꿨다.
	//
	// 감독 실사용 보고(2026-08-09): *"불러와 지고. 어느정도 동작은 하는데 텍스쳐뷰가
	// 안되네. 그래서 어둡게보여. 와이어프레임은 보여"*
	//
	// 원본 editor 는 환경을 `None` 으로 시작한다. 그러면 **씬에 조명도 환경맵도 없어서**
	// GLB 의 PBR 재질(`MeshStandardMaterial`)이 받을 빛이 0 이다 — 검게 나온다.
	// 와이어프레임은 조명을 안 타므로 그것만 보였던 것이다. **우리가 만든 결함이 아니라
	// 원본 기본값**이고, 사용자가 Scene 탭에서 매번 바꿔야 했다.
	//
	// 이 도구의 용도는 *"GLB 를 불러와 놓고 보는 것"* 이다. 첫 화면이 캄캄하면 도구로서
	// 결함이므로 기본값을 바꾼다. `ModelViewer` 는 `RoomEnvironment`(three 내장, 파일
	// 없음)를 PMREM 으로 구워 환경광을 준다 — 외부 자산을 안 받으므로 자기완결에 걸리지
	// 않는다(`Viewport.js` 의 `case 'ModelViewer'`).
	//
	// ⚠️ **여기서 `setValue` 를 하면 안 된다.** 원본은 생성자 끝에서 `refreshUI()` 를 즉시
	// 부르고(이 파일 아래쪽), 그것이 `scene.environment` 가 비어 있으면 select 를
	// `'None'` 으로 **되돌린다.** 그래서 여기에 쓴 값은 몇 줄 뒤에 덮여 사라진다 —
	// 실제로 한 회차 동안 죽은 코드로 서 있었다.
	//
	// 기본값 적용은 전부 아래 `rendererCreated` **한 곳**에서 한다(그 자리 주석 참조).
	environmentType.onChange( function () {

		// [OpenArtShow] 사용자가 직접 고른 순간부터 부팅 기본값은 다시 끼어들지 않는다.
		// 이 플래그가 `applyBootEnvironment` 의 유일한 가드다(아래 주석 참조).
		userChoseEnvironment = true;

		onEnvironmentChanged();
		refreshEnvironmentUI();

	} );

	environmentRow.add( new UIText( strings.getKey( 'sidebar/scene/environment' ) ).setClass( 'Label' ) );
	environmentRow.add( environmentType );

	const environmentEquirectangularTexture = new UITexture( editor ).setMarginLeft( '8px' ).onChange( onEnvironmentChanged );
	environmentEquirectangularTexture.setDisplay( 'none' );
	environmentRow.add( environmentEquirectangularTexture );

	container.add( environmentRow );

	// [OpenArtShow] 부팅 시 1회 환경 적용. **이 파일에서 기본값이 적혀 있는 유일한 자리다.**
	//
	// ⚠️ **생성자 본문에서 직접 부르면 안 된다. 세 번 틀렸고 세 번 다 원인이 달랐다.**
	//
	//   1회차 — `environmentEquirectangularTexture` 선언 **앞**에서 호출.
	//     `ReferenceError: Cannot access … before initialization` (**TDZ**). 오판은
	//     *"함수 선언이라 hoisting 되니 위에서 불러도 된다"* — 함수는 hoisting 되지만
	//     **그 함수가 참조하는 `const` 는 안 된다.** 부팅이 통째로 죽었다.
	//   2회차 — 선언 **뒤**로 옮겼다. TDZ 는 사라졌고 같은 자리에서 다른 예외:
	//     `TypeError: Cannot read properties of null (reading 'fromScene')`. dispatch 를
	//     받은 `Viewport.js` 의 `ModelViewer` 분기가 `pmremGenerator.fromScene(...)` 를
	//     부르는데 그 값은 `rendererCreated` 가 와야 채워지고, 그 신호를 쏘는
	//     `SidebarProject`(렌더러 생성)는 `Sidebar.js` 에서 **`SidebarScene` 보다 나중에**
	//     만들어진다 — 생성자 시점의 `pmremGenerator` 는 **항상** null 이다. 타이밍 우연이
	//     아니라 동기 실행 순서라 실기기에서도 100% 재현된다. 또 부팅이 죽었다.
	//   3회차 — 신호로 옮겨 부팅은 살아났다(이 처방은 실측으로 옳았다 — 이 시점의
	//     `pmremGenerator` 는 유효하다). **그런데 화면은 여전히 어두웠다.** 위쪽에서 한
	//     `setValue('ModelViewer')` 를 생성자 끝의 `refreshUI()` 가 `'None'` 으로 되돌려
	//     놓았고, 이 콜백이 그 **오염된 값을 읽어** dispatch 했기 때문이다. 예외는 0건,
	//     부팅도 정상 — **아무것도 안 깨진 채로 조용히 틀렸다.**
	//
	//   4회차 — 3회차 처방(`rendererCreated` + 1회 가드)은 **새 프로필에서만** 맞았다.
	//     검수관이 잡았다: `boot.js` 가 부팅 뒤 **비동기로** `editor.fromJSON(state)` 를
	//     돌려 autosave 를 복원하는데, `Editor.js` 의 `setScene` 이
	//     `scene.environment = <저장값>` 으로 덮고 `sceneGraphChanged` 를 쏜다 →
	//     `refreshUI()` 가 또 `'None'` 으로 되돌린다. `fromJSON` 의 복구 분기는
	//     `json.environment === 'ModelViewer'` 일 때만 도는데, **이 커밋 이전에 저장된
	//     state 에는 그 값이 없다**(당시 환경이 None 이었으니 `toJSON` 이 `null` 로 적었다).
	//     그리고 1회 가드는 이미 소진돼 재적용이 없다.
	//     ⚠ **감독이 증상을 신고한 그 브라우저가 정확히 이 경우다** — GLB 를 한 번 불러온
	//     세션이면 autosave state 가 남아 있다. 헤드리스 새 컨텍스트는 IndexedDB 가 비어
	//     `fromJSON` 이 아예 안 돌므로 executor 의 `3/3 PASS` 는 이 경로를 **못 쟀다.**
	//     못 잰 것이 통과로 적힐 뻔했다.
	//
	// 네 번의 공통 원인은 하나다 — **"부팅 시 1회" 를 *어느 시점* 으로 잡을지를 매번 눈으로
	// 읽고 정했다.** 그래서 시점을 고르는 것을 그만둔다. 대신 **조건**으로 적는다:
	// *"사용자가 고르기 전까지, 씬에 환경이 없으면 채운다."* 그러면 그 조건이 언제
	// 참이 되든(렌더러 생성·autosave 복원·그 밖의 아직 모르는 경로) 저절로 걸린다.
	//
	// 가드가 **시점 1회가 아니라 사용자 선택 여부**인 것이 요점이다. 1회 가드는 복원처럼
	// 더 늦은 경로에서 소진돼 있고, 무가드는 사용자가 고른 `None` 을 되돌린다.
	//
	// 파급을 남긴다: 1·2회차의 예외는 `new SidebarScene()` → `new Sidebar()` 를 타고 올라가
	// `boot.js` 가 완료되지 못했고, 그 아래의 **Menubar·Resizer·드래그앤드롭 리스너**가
	// 전부 안 붙었다 — **캔버스조차 없는 빈 화면.** 그리고 **`console.error` 는 네 번 다
	// 0건이었다** — 콘솔만 보는 점검으로는 하나도 안 잡히고 pageerror 축에서만 잡힌다.
	// 3·4회차는 그 pageerror 축으로도 안 잡혔다(예외가 없으므로) — **화면을 봐야 잡힌다.**
	const BOOT_ENVIRONMENT = 'ModelViewer';

	function applyBootEnvironment() {

		if ( userChoseEnvironment ) return;              // 사용자 선택이 언제나 우선
		if ( editor.scene.environment !== null ) return; // 이미 있으면 건드리지 않는다

		environmentType.setValue( BOOT_ENVIRONMENT );
		onEnvironmentChanged();
		refreshEnvironmentUI();

	}

	signals.rendererCreated.add( function () {

		// 렌더러가 새로 생겼으면 현재 환경을 **이 렌더러 기준으로 다시 굽는다.**
		// `ModelViewer` 의 환경맵은 렌더러에 딸린 `PMREMGenerator` 가 만든 렌더타깃이라,
		// 안티앨리어싱 토글 등으로 렌더러가 재생성되면 `Viewport.js` 가 그 생성기를
		// `dispose()` 한다 — 다시 굽지 않으면 **폐기된 텍스처**가 씬에 남는다.
		// (부팅 때는 select 가 `'None'` 이라 여기서 걸리지 않고 아래가 채운다.)
		if ( environmentType.getValue() !== 'None' ) onEnvironmentChanged();

		applyBootEnvironment();

	} );

	// autosave 복원이 끝나면 `setScene` 이 이 신호를 쏜다. 복원된 state 에 환경이 없으면
	// 여기서 채운다. GLB 임포트 등으로도 자주 발화하지만 위 두 가드가 전부 걸러낸다.
	signals.sceneGraphChanged.add( applyBootEnvironment );

	// File ▸ New. `Editor.clear()` 는 `environment` 를 null 로 놓고 `editorCleared` 만 쏘므로
	// (`sceneGraphChanged` 가 아니다) 위 줄에 안 걸린다 — 없으면 빈 씬이 캄캄한 채로 남는다
	// (검수관 P11). **조건 가드로 바꾼 덕에 첫 import 때 자기치유가 되긴 한다** — 1회 가드
	// 였으면 New 이후 영구히 어두웠다. 그래도 빈 씬부터 밝은 편이 맞다.
	signals.editorCleared.add( applyBootEnvironment );

	function onEnvironmentChanged() {

		signals.sceneEnvironmentChanged.dispatch(
			environmentType.getValue(),
			environmentEquirectangularTexture.getValue()
		);

	}

	function refreshEnvironmentUI() {

		const type = environmentType.getValue();

		environmentType.setWidth( type !== 'Equirectangular' ? '150px' : '110px' );
		environmentEquirectangularTexture.setDisplay( type === 'Equirectangular' ? '' : 'none' );

	}

	// fog

	function onFogChanged() {

		signals.sceneFogChanged.dispatch(
			fogType.getValue(),
			fogColor.getHexValue(),
			fogNear.getValue(),
			fogFar.getValue(),
			fogDensity.getValue()
		);

	}

	function onFogSettingsChanged() {

		signals.sceneFogSettingsChanged.dispatch(
			fogType.getValue(),
			fogColor.getHexValue(),
			fogNear.getValue(),
			fogFar.getValue(),
			fogDensity.getValue()
		);

	}

	const fogTypeRow = new UIRow();
	const fogType = new UISelect().setOptions( {

		'None': '',
		'Fog': 'Linear',
		'FogExp2': 'Exponential'

	} ).setWidth( '150px' );
	fogType.onChange( function () {

		onFogChanged();
		refreshFogUI();

	} );

	fogTypeRow.add( new UIText( strings.getKey( 'sidebar/scene/fog' ) ).setClass( 'Label' ) );
	fogTypeRow.add( fogType );

	container.add( fogTypeRow );

	// fog color

	const fogPropertiesRow = new UIRow();
	fogPropertiesRow.setDisplay( 'none' );
	fogPropertiesRow.setMarginLeft( '120px' );
	container.add( fogPropertiesRow );

	const fogColor = new UIColor().setValue( '#aaaaaa' );
	fogColor.onInput( onFogSettingsChanged );
	fogPropertiesRow.add( fogColor );

	// fog near

	const fogNear = new UINumber( 0.1 ).setWidth( '40px' ).setRange( 0, Infinity ).onChange( onFogSettingsChanged );
	fogPropertiesRow.add( fogNear );

	// fog far

	const fogFar = new UINumber( 50 ).setWidth( '40px' ).setRange( 0, Infinity ).onChange( onFogSettingsChanged );
	fogPropertiesRow.add( fogFar );

	// fog density

	const fogDensity = new UINumber( 0.05 ).setWidth( '40px' ).setRange( 0, 0.1 ).setStep( 0.001 ).setPrecision( 3 ).onChange( onFogSettingsChanged );
	fogPropertiesRow.add( fogDensity );

	//

	function refreshUI() {

		const camera = editor.camera;
		const scene = editor.scene;

		const options = [];

		options.push( buildOption( camera, false ) );
		options.push( buildOption( scene, false ) );

		( function addObjects( objects, pad ) {

			for ( let i = 0, l = objects.length; i < l; i ++ ) {

				const object = objects[ i ];

				if ( nodeStates.has( object ) === false ) {

					nodeStates.set( object, false );

				}

				const option = buildOption( object, true );
				option.style.paddingLeft = ( pad * 18 ) + 'px';
				options.push( option );

				if ( nodeStates.get( object ) === true ) {

					addObjects( object.children, pad + 1 );

				}

			}

		} )( scene.children, 0 );

		outliner.setOptions( options );

		if ( editor.selected !== null ) {

			outliner.setValue( editor.selected.id );

		}

		if ( scene.background ) {

			if ( scene.background.isColor ) {

				backgroundType.setValue( 'Color' );
				backgroundColor.setHexValue( scene.background.getHex() );

			} else if ( scene.background.isTexture ) {

				if ( scene.background.mapping === THREE.EquirectangularReflectionMapping ) {

					backgroundType.setValue( 'Equirectangular' );
					backgroundEquirectangularTexture.setValue( scene.background );
					backgroundBlurriness.setValue( scene.backgroundBlurriness );
					backgroundIntensity.setValue( scene.backgroundIntensity );

				} else {

					backgroundType.setValue( 'Texture' );
					backgroundTexture.setValue( scene.background );

				}

			}

		} else {

			backgroundType.setValue( 'None' );
			backgroundTexture.setValue( null );
			backgroundEquirectangularTexture.setValue( null );

		}

		if ( scene.environment ) {

			if ( scene.background && scene.background.isTexture && scene.background.uuid === scene.environment.uuid ) {

				environmentType.setValue( 'Background' );

			} else if ( scene.environment.mapping === THREE.EquirectangularReflectionMapping ) {

				environmentType.setValue( 'Equirectangular' );
				environmentEquirectangularTexture.setValue( scene.environment );

			} else if ( scene.environment.isRenderTargetTexture === true ) {

				environmentType.setValue( 'ModelViewer' );

			}

		} else {

			environmentType.setValue( 'None' );
			environmentEquirectangularTexture.setValue( null );

		}

		if ( scene.fog ) {

			fogColor.setHexValue( scene.fog.color.getHex() );

			if ( scene.fog.isFog ) {

				fogType.setValue( 'Fog' );
				fogNear.setValue( scene.fog.near );
				fogFar.setValue( scene.fog.far );

			} else if ( scene.fog.isFogExp2 ) {

				fogType.setValue( 'FogExp2' );
				fogDensity.setValue( scene.fog.density );

			}

		} else {

			fogType.setValue( 'None' );

		}

		refreshBackgroundUI();
		refreshEnvironmentUI();
		refreshFogUI();

	}

	function refreshFogUI() {

		const type = fogType.getValue();

		fogPropertiesRow.setDisplay( type === 'None' ? 'none' : '' );
		fogNear.setDisplay( type === 'Fog' ? '' : 'none' );
		fogFar.setDisplay( type === 'Fog' ? '' : 'none' );
		fogDensity.setDisplay( type === 'FogExp2' ? '' : 'none' );

	}

	refreshUI();

	// events

	signals.editorCleared.add( refreshUI );

	signals.sceneGraphChanged.add( refreshUI );

	signals.refreshSidebarEnvironment.add( refreshUI );

	signals.objectChanged.add( function ( object ) {

		const options = outliner.options;

		for ( let i = 0; i < options.length; i ++ ) {

			const option = options[ i ];

			if ( option.value === object.id ) {

				const openerElement = option.querySelector( ':scope > .opener' );

				const openerHTML = openerElement ? openerElement.outerHTML : '';

				option.innerHTML = openerHTML + buildHTML( object );

				return;

			}

		}

	} );

	signals.scriptAdded.add( function () {

		if ( editor.selected !== null ) signals.objectChanged.dispatch( editor.selected );

	} );

	signals.scriptRemoved.add( function () {

		if ( editor.selected !== null ) signals.objectChanged.dispatch( editor.selected );

	} );


	signals.objectSelected.add( function ( object ) {

		if ( ignoreObjectSelectedSignal === true ) return;

		if ( object !== null && object.parent !== null ) {

			let needsRefresh = false;
			let parent = object.parent;

			while ( parent !== editor.scene ) {

				if ( nodeStates.get( parent ) !== true ) {

					nodeStates.set( parent, true );
					needsRefresh = true;

				}

				parent = parent.parent;

			}

			if ( needsRefresh ) refreshUI();

			outliner.setValue( object.id );

		} else {

			outliner.setValue( null );

		}

	} );

	signals.sceneBackgroundChanged.add( function () {

		if ( environmentType.getValue() === 'Background' ) {

			onEnvironmentChanged();
			refreshEnvironmentUI();

		}

	} );

	return container;

}

export { SidebarScene };
