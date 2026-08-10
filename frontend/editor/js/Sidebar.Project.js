import { UISpan } from './libs/ui.js';

import { SidebarProjectApp } from './Sidebar.Project.App.js';
/* import { SidebarProjectMaterials } from './Sidebar.Project.Materials.js'; */
import { SidebarProjectRenderer } from './Sidebar.Project.Renderer.js';
import { SidebarProjectImage } from './Sidebar.Project.Image.js';

function SidebarProject( editor ) {

	const container = new UISpan();

	container.add( new SidebarProjectRenderer( editor ) );

	/* container.add( new SidebarProjectMaterials( editor ) ); */

	container.add( new SidebarProjectApp( editor ) );

	container.add( new SidebarProjectImage( editor ) );

	if ( 'SharedArrayBuffer' in window ) {

		// [OpenArtShow] 비디오 내보내기 탭 제거 — @ffmpeg/ffmpeg 를 CDN 에서 받는 기능이라
		// 자기완결에 걸린다. 배치 도구에는 필요 없다(`Sidebar.Project.Video.js` 는 남아
		// 있지만 아무도 부르지 않으므로 번들에서 빠진다).

	}

	return container;

}

export { SidebarProject };
