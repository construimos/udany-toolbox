<template>
	<div class="dimmer" :class="{ show }" :style="{ '--opacity': opacity }" />
</template>

<script>
	export default {
		name: 'Dimmer',
		props: {
			show: Boolean,
			opacity: {
				type: Number,
				default: 1
			}
		}
	}
</script>

<style lang="scss" scoped>
	.dimmer {
		@include fillAbsolute();
		position: fixed;
		pointer-events: none !important;

		background: rgba(black, .5);
		backdrop-filter: blur(3px);

		opacity: 0;

		transition: opacity .4s;

		&.show {
			pointer-events: auto !important;
			opacity: var(--opacity);
		}
	}
</style>
