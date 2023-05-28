<template>
	<div ref="hydration-wrapper" :style="{ display: 'contents' }" v-if="hydrated">
		<slot></slot>
	</div>
	<div ref="hydration-wrapper" v-else></div>
</template>

<script lang="ts">
	import { computed, defineComponent, ref } from 'vue';

	export default defineComponent({
		name: 'DelayHydration',
		props: {
			hydrate: { type: Boolean, default: false },
		},
		setup(props) {
			const isBrowser = () => {
				return typeof window === "object";
			};

			const wrapper = ref<Element | null>(null);
			const hydrated = computed(() => !isBrowser() || props.hydrate);

			return {
				wrapper,
				hydrated,
			};
		}
	})
</script>

<style lang="scss" scoped></style>
