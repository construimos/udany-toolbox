import { library, IconDefinition } from '@fortawesome/fontawesome-svg-core'

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import FaIcon from './FaIcon.vue';

export default function fontAwesomePlugin(app, icons: IconDefinition[]) {
	library.add(
		...icons
	);

	app.component('font-awesome-icon', FontAwesomeIcon);
	app.component('FaIcon', FaIcon);
}
