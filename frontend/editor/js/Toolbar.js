// [OpenArtShow] 아이콘을 **문자열 경로가 아니라 import** 로 받는다.
// 원본은 `img.src = 'images/translate.svg'` 였는데 그것은 **페이지 기준 상대경로**다.
// 우리 배포는 `app/editor.html`(= `app/editor/` 가 아니라 `app/` 바로 밑)이라 브라우저가
// `app/images/…` 를 찾아 404 가 났다 — 파일을 옮겨도 안 풀리는 형태였다.
// import 로 두면 vite 가 해시 자산으로 굽고 URL 을 주므로 **페이지 위치와 무관**해진다.
import translateSvg from '../images/translate.svg';
import rotateSvg from '../images/rotate.svg';
import scaleSvg from '../images/scale.svg';

import { UIPanel, UIButton, UICheckbox } from './libs/ui.js';

function Toolbar( editor ) {

	const signals = editor.signals;
	const strings = editor.strings;

	const container = new UIPanel();
	container.setId( 'toolbar' );

	// translate / rotate / scale

	const translateIcon = document.createElement( 'img' );
	translateIcon.title = strings.getKey( 'toolbar/translate' );
	translateIcon.src = translateSvg;

	const translate = new UIButton();
	translate.dom.className = 'Button selected';
	translate.dom.appendChild( translateIcon );
	translate.onClick( function () {

		signals.transformModeChanged.dispatch( 'translate' );

	} );
	container.add( translate );

	const rotateIcon = document.createElement( 'img' );
	rotateIcon.title = strings.getKey( 'toolbar/rotate' );
	rotateIcon.src = rotateSvg;

	const rotate = new UIButton();
	rotate.dom.appendChild( rotateIcon );
	rotate.onClick( function () {

		signals.transformModeChanged.dispatch( 'rotate' );

	} );
	container.add( rotate );

	const scaleIcon = document.createElement( 'img' );
	scaleIcon.title = strings.getKey( 'toolbar/scale' );
	scaleIcon.src = scaleSvg;

	const scale = new UIButton();
	scale.dom.appendChild( scaleIcon );
	scale.onClick( function () {

		signals.transformModeChanged.dispatch( 'scale' );

	} );
	container.add( scale );

	const local = new UICheckbox( false );
	local.dom.title = strings.getKey( 'toolbar/local' );
	local.onChange( function () {

		signals.spaceChanged.dispatch( this.getValue() === true ? 'local' : 'world' );

	} );
	container.add( local );

	//

	signals.transformModeChanged.add( function ( mode ) {

		translate.dom.classList.remove( 'selected' );
		rotate.dom.classList.remove( 'selected' );
		scale.dom.classList.remove( 'selected' );

		switch ( mode ) {

			case 'translate': translate.dom.classList.add( 'selected' ); break;
			case 'rotate': rotate.dom.classList.add( 'selected' ); break;
			case 'scale': scale.dom.classList.add( 'selected' ); break;

		}

	} );

	return container;

}

export { Toolbar };
