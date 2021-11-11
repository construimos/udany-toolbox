<template>
	<div class="auto-resizer" :style="{height}" :class="{ resizing, 'resize-overflow-hidden': overflowHidden }">
		<div class="auto-resizer-content" ref="content">
			<slot />
		</div>
	</div>
</template>

<script>
	const ResizeObserver = window.ResizeObserver || null;

	export default {
		name: 'AutoResizer',
		data: () => ({
			height: 'auto',
			resizing: false,
			observer: null
		}),
		props: {
			overflowHidden: {
				type: Boolean,
				default: true
			},
			closed: {
				type: Boolean,
				default: false
			},
		},
		watch: {
		},
		methods: {
			updateHeight() {
				if (!this.observer) {
					this.height = 'auto';
					return;
				}

				const contentElement = this.$refs.content;
				if (!document.body.contains(contentElement)) {
					return;
				}

				let height = contentElement.getBoundingClientRect().height + 'px';

				if (this.closed) {
					height = 0;
				}

				if (this.height !== height) {
					this.resizing = true;
					this.height = height;
					this.$emit('resizing', height);
				}
			},
			onTransitionEnd(e) {
				if (e.target === this.$el) {
					this.resizing = false;
					this.$emit('resized');
				}
			}
		},
		mounted() {
			if (ResizeObserver) {
				this.observer = new ResizeObserver(() => {
					this.updateHeight();
				});
				this.observer.observe(this.$refs.content);
			}
			this.updateHeight();
			this.$el.addEventListener('transitionend', this.onTransitionEnd);
		},
		beforeUnmount() {
			if (this.observer) {
				this.observer.disconnect();
			}
			this.$el.removeEventListener('transitionend', this.onTransitionEnd);
		}
	};
</script>

<style lang="scss" scoped>
	.auto-resizer {
		height: auto;
		position: relative;
		transition: height .6s cubic-bezier(.51,-0.01,.11,1);
		.auto-resizer-content {
			/*
			 * This prevents margin collapse.
			 * Without it having immediate elements within the collapse that have a margin will incur a "jump" by the
			 * animation's end because it's height will be wrongly calculated.
			 */
			&:before, &:after{
				content: ' ';
				display: table;
			}
			height: auto;
		}
		&.resize-overflow-hidden.resizing {
			overflow: hidden;
		}
	}
</style>