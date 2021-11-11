<template>
	<div
		class="floater"
		:style="{
			'--x': pos.x + 'px',
			'--y': pos.y + 'px',
		}"
	>
		<slot />
	</div>
</template>

<script lang="ts">
	import { defineComponent } from 'vue';
	import Vector from '../../../classes/entities/Vector';

	export default defineComponent({
		name: 'Floater',
		props: {
			position: {
				type: [Array, Vector, Object],
				required: true
			}
		},
		computed: {
			pos(): Vector {
				return this.position instanceof Vector ? this.position : new Vector().$fill(this.position)
			}
		}
	})
</script>

<style lang="scss" scoped>
	.floater {
		position: absolute;
		left: 0;
		top: 0;

		transform: translate(var(--x), var(--y));
		z-index: 1;

		&::v-deep > * {
			pointer-events: all;
		}
	}
</style>
