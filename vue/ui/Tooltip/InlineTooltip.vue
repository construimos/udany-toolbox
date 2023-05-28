<template>
	<span
		class="simple-tooltip"
		:class="{...classes, visible: forceShow || visible}"
		:style="style"
	>
		<slot></slot>
	</span>
</template>

<script>
	export default {
		name: 'InlineTooltip',
		props: {
			top: {
				type: Boolean,
				default: false
			},
			bottom: {
				type: Boolean,
				default: false
			},
			left: {
				type: Boolean,
				default: false
			},
			right: {
				type: Boolean,
				default: false
			},
			auto: {
				type: Boolean,
				default: false
			},
			constrain: {
				type: Boolean,
				default: false
			},
			forceShow: {
				type: Boolean,
				default: false
			},
			timeout: {
				type: Number,
				default: 0
			}
		},
		data: () => ({
			visible: false,
			showTimeout: null,
			hideTimeout: null,
			style: null,
			autoClasses: { top: false, bottom: false, left: false, right: false }
		}),
		mounted() {
			let parent = this.$el.parentElement;

			if (parent) {
				parent.addEventListener('mouseenter', this.show, true);
				parent.addEventListener('mousemove', this.show, true);
				parent.addEventListener('mouseleave', this.hide, true);

				const boundsRect = parent.parentElement.getBoundingClientRect();

				this.$el.setAttribute('style', '');
				let tooltipRect = this.$el.getBoundingClientRect();

				if (this.auto) {
					let parentRect = parent.getBoundingClientRect();

					if (parentRect.top - boundsRect.top < tooltipRect.height + 10) {
						this.autoClasses.bottom = true;
					} else {
						this.autoClasses.top = true;
					}
				}

				// Allows for final classes to be applied
				this.$nextTick(() => {
					// Update tooltip rect
					let tooltipRect = this.$el.getBoundingClientRect();
				})
			}

			if (this.forceShow && this.constrain) {
				this.show();
			}
		},
		beforeUnmount() {
			let parent = this.$el.parentElement;

			if (parent) {
				parent.removeEventListener('mouseenter', this.show, true);
				parent.removeEventListener('mousemove', this.show, true);
				parent.removeEventListener('mouseleave', this.hide, true);
			}
		},
		methods: {
			show() {
				this.clearHideTimeout();
				this.clearShowTimeout();

				this.showTimeout = setTimeout(() => {
					if (this.constrain && !this.style) {
						this.style = {};
						const boundsRect = this.$el.parentElement.parentElement.getBoundingClientRect();
						let tooltipRect = this.$el.getBoundingClientRect();

						if (this.classes.top && tooltipRect.top < boundsRect.top) {
							this.style.marginTop = (boundsRect.top - tooltipRect.top) + 'px';
						} else if (this.classes.bottom && tooltipRect.bottom > boundsRect.bottom) {
							this.style.marginBottom = -(boundsRect.bottom - tooltipRect.bottom) + 'px';
						}

						if (this.classes.left && tooltipRect.left < boundsRect.left) {
							this.style.marginLeft = (boundsRect.left - tooltipRect.left) + 'px';
						} else if (this.classes.right && tooltipRect.right > boundsRect.right) {
							this.style.marginLeft = (boundsRect.right - tooltipRect.right) + 'px';
						}
					}

					this.visible = true;
				}, this.timeout);
			},

			clearShowTimeout() {
				if (!this.showTimeout) return;

				clearTimeout(this.showTimeout);
				this.showTimeout = null;
			},

			hide() {
				this.clearHideTimeout();
				this.clearShowTimeout();

				this.hideTimeout = setTimeout(() => this.visible = false, 100);
			},

			clearHideTimeout() {
				if (!this.hideTimeout) return;

				clearTimeout(this.hideTimeout);
				this.hideTimeout = null;
			}
		},
		computed: {
			classes() {
				if (this.auto) {
					return this.autoClasses;
				} else {
					return {
						top: this.top,
						bottom: this.bottom,
						left: this.left,
						right: this.right
					}
				}
			}
		}
	};
</script>

<style src="./InlineTooltip.scss" lang="scss" scoped />
