// 배치 에디터 부트스트랩 — **원본 three.js editor 의 `index.html` 인라인 블록을 파일로 뺀 것이다.**
//
// 왜 뺐나: 우리 CSP 는 `script-src 'self'` 이고, 인라인을 쓰면 sha256 핀을 소스 HTML 에
// 박아야 한다(`tests/csp-inline-pins.test.ts` 가 강제한다). 핀은 **블록을 한 글자만 고쳐도
// 갱신해야 하는 값**이라 원본 editor 를 갱신할 때마다 걸린다. 파일로 빼면 그 축이 사라지고,
// 우리 다른 페이지(`world2` 등)와도 같은 형태가 된다.
//
// ⚠️ 내용은 원본 그대로다 — import 경로만 이 파일 기준으로 바꿨다(`./editor/js/` → `./`).


import * as THREE from 'three';

import { Editor } from './Editor.js';
import { Viewport } from './Viewport.js';
import { Toolbar } from './Toolbar.js';
import { Player } from './Player.js';
import { Sidebar } from './Sidebar.js';
import { Menubar } from './Menubar.js';
import { Resizer } from './Resizer.js';

window.URL = window.URL || window.webkitURL;
window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;

//

const editor = new Editor();

window.editor = editor; // Expose editor to Console
window.THREE = THREE; // Expose THREE to APP Scripts and Console

const viewport = new Viewport( editor );
document.body.appendChild( viewport.dom );

const toolbar = new Toolbar( editor );
document.body.appendChild( toolbar.dom );


const player = new Player( editor );
document.body.appendChild( player.dom );

const sidebar = new Sidebar( editor );
document.body.appendChild( sidebar.dom );

const menubar = new Menubar( editor );
document.body.appendChild( menubar.dom );

const resizer = new Resizer( editor );
document.body.appendChild( resizer.dom );

//

editor.storage.init( function () {

	editor.storage.get( async function ( state ) {

		if ( isLoadingFromHash ) return;

		if ( state !== undefined ) {

			await editor.fromJSON( state );

		}

		const selected = editor.config.getKey( 'selected' );

		if ( selected !== undefined ) {

			editor.selectByUuid( selected );

		}

	} );

	//

	let timeout;

	function saveState() {

		if ( editor.config.getKey( 'autosave' ) === false ) {

			return;

		}

		clearTimeout( timeout );

		timeout = setTimeout( function () {

			editor.signals.savingStarted.dispatch();

			timeout = setTimeout( function () {

				editor.storage.set( editor.toJSON() );

				editor.signals.savingFinished.dispatch();

			}, 100 );

		}, 1000 );

	}

	const signals = editor.signals;

	signals.geometryChanged.add( saveState );
	signals.objectAdded.add( saveState );
	signals.objectChanged.add( saveState );
	signals.objectRemoved.add( saveState );
	signals.materialChanged.add( saveState );
	signals.sceneBackgroundChanged.add( saveState );
	signals.sceneEnvironmentChanged.add( saveState );
	signals.sceneFogChanged.add( saveState );
	signals.sceneGraphChanged.add( saveState );
	signals.scriptChanged.add( saveState );
	signals.historyChanged.add( saveState );

} );

//

document.addEventListener( 'dragover', function ( event ) {

	event.preventDefault();
	event.dataTransfer.dropEffect = 'copy';

} );

document.addEventListener( 'drop', function ( event ) {

	event.preventDefault();

	if ( event.dataTransfer.types[ 0 ] === 'text/plain' ) return; // Outliner drop

	if ( event.dataTransfer.items ) {

		// DataTransferItemList supports folders

		editor.loader.loadItemList( event.dataTransfer.items );

	} else {

		editor.loader.loadFiles( event.dataTransfer.files );

	}

} );

function onWindowResize() {

	editor.signals.windowResize.dispatch();

}

window.addEventListener( 'resize', onWindowResize );

onWindowResize();

//

let isLoadingFromHash = false;
const hash = window.location.hash;

if ( hash.slice( 1, 6 ) === 'file=' ) {

	const file = hash.slice( 6 );

	if ( confirm( editor.strings.getKey( 'prompt/file/open' ) ) ) {

		const loader = new THREE.FileLoader();
		loader.crossOrigin = '';
		loader.load( file, function ( text ) {

			editor.clear();
			editor.fromJSON( JSON.parse( text ) );

		} );

		isLoadingFromHash = true;

	}

}

// ServiceWorker

if ( 'serviceWorker' in navigator ) {

	try {

		navigator.serviceWorker.register( 'sw.js' );

	} catch ( error ) {

	}

}

