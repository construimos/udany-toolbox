<template>
	<teleport :to="overlay" v-if="ready">
		<slot />
	</teleport>
</template>

<script lang="ts">
	import { defineComponent } from 'vue';
	import overlayElement from './overlayElement';

	export default defineComponent({
		name: 'ToOverlay',
		data: () => ({
			overlay: overlayElement,
			ready: false
		}),

		mounted () {
			this.ready = true;
		}
	})
</script>
