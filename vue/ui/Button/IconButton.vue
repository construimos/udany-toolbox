<template>
	<BaseButton class="icon-button" :style="{'--size': size + 'px'}">
		<FaIcon><slot/></FaIcon>
		<template v-slot:tooltip><slot name="tooltip"/></template>
		<template v-slot:anchor><slot name="anchor"/></template>
	</BaseButton>
</template>

<script>
	import FaIcon from '../FontAwesome/FaIcon.vue';
	import BaseButton from './BaseButton.vue';

	export default {
		name: 'IconButton',
		components: { FaIcon, BaseButton },
		data: () => ({}),
		props: {
			size: {
				type: Number,
				default: 24
			}
		}
	}
</script>

<style lang="scss" scoped>
	.icon-button {
		width: var(--size);
		min-height: var(--size);
		flex-shrink: 0;

		.fa-icon {
			@include centerAbsolute();
			font-size: calc(var(--size) - 10px);
		}
	}
</style>
