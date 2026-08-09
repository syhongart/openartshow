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
	// ⚠️ 값만 바꾸면 **UI 표시만** 바뀐다. 실제 적용은 `onChange` 뿐이라 부팅 시에는 안
	// 돈다 — 그래서 아래에서 `rendererCreated` 를 받아 한 번 dispatch 한다(그 시점이어야
	// 하는 이유는 그 자리 주석에 있다 — 여기서 두 번 틀렸다).
	environmentType.setValue( 'ModelViewer' );
	environmentType.onChange( function () {

		onEnvironmentChanged();
		refreshEnvironmentUI();

	} );

	environmentRow.add( new UIText( strings.getKey( 'sidebar/scene/environment' ) ).setClass( 'Label' ) );
	environmentRow.add( environmentType );

	const environmentEquirectangularTexture = new UITexture( editor ).setMarginLeft( '8px' ).onChange( onEnvironmentChanged );
	environmentEquirectangularTexture.setDisplay( 'none' );
	environmentRow.add( environmentEquirectangularTexture );

	container.add( environmentRow );

	// [OpenArtShow] 부팅 시 1회 적용 — `setValue` 는 UI 표시만 바꾸고 신호를 안 쏜다.
	//
	// ⚠️ **생성자 본문에서 직접 부르면 안 된다. 두 번 시도했고 두 번 다 부팅을 죽였다.**
	//
	//   1회차 — `setValue` 바로 아래(= `environmentEquirectangularTexture` 선언 앞)에 뒀다.
	//     `onEnvironmentChanged` 가 그 `const` 를 읽는데 **TDZ** 라 `ReferenceError:
	//     Cannot access … before initialization`. 내 오판은 *"함수 선언이라 hoisting 되니
	//     위에서 불러도 된다"* — 함수는 hoisting 되지만 **그 함수가 참조하는 `const` 는
	//     안 된다.**
	//   2회차 — 선언 **뒤**로 옮겼다. TDZ 는 사라졌는데 같은 자리에서 다른 예외가 났다:
	//     `TypeError: Cannot read properties of null (reading 'fromScene')`. dispatch 를
	//     받은 `Viewport.js` 의 `ModelViewer` 분기가 `pmremGenerator.fromScene(...)` 를
	//     부르는데, 그 값은 `rendererCreated` 신호가 와야 채워진다. 그런데 그 신호를 쏘는
	//     `SidebarProject`(렌더러 생성)는 `Sidebar.js` 에서 **`SidebarScene` 보다 나중에**
	//     만들어진다 — 즉 생성자 시점의 `pmremGenerator` 는 **항상** null 이다. 타이밍
	//     우연이 아니라 동기 실행 순서라 실기기에서도 100% 재현된다.
	//
	// **두 실패의 원인은 하나다 — "부팅 시 1회" 를 *어느 시점* 으로 잡을지를 내가 두 번 다
	// 눈으로 읽고 정했다.** 그래서 시점을 추측하지 않고 **신호로 받는다**: 렌더러가 실제로
	// 생긴 뒤에만 실행되므로 `pmremGenerator` 도 채워져 있고, 콜백 안이라 TDZ 도 없다.
	// (리스너 실행 순서도 안전하다 — `Viewport` 가 `boot.js` 에서 `Sidebar` 보다 먼저
	//  생성돼 `pmremGenerator` 를 채우는 리스너가 **먼저 등록**된다.)
	//
	// 덤: 렌더러가 재생성될 때(안티앨리어싱 토글 등)도 다시 발화하므로 새 `pmremGenerator`
	// 로 환경맵이 다시 구워진다. 원본 editor 는 그때 환경이 날아간다.
	//
	// 파급이 컸던 이유를 남긴다: 예외가 `new SidebarScene()` → `new Sidebar()` 를 타고
	// 올라가 `boot.js:41` 이 완료되지 못했고, 그 아래의 **Menubar·Resizer·드래그앤드롭
	// 리스너**가 전부 안 붙었다 — **캔버스조차 없는 빈 화면.**
	// **`console.error` 는 두 번 다 0건이었다** — 콘솔만 보는 점검으로는 안 잡히고
	// pageerror 축에서만 잡힌다.
	signals.rendererCreated.add( onEnvironmentChanged );

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
