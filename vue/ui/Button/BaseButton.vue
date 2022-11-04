<template>
	<button class="base-button" :class="{ disabled, toggled }">
		<slot name="icon">
			<FaIcon class="button-icon" v-if="icon">
				{{icon}}
			</FaIcon>
		</slot>

		<slot/>

		<InlineTooltip top v-if="tooltip" :timeout="tooltipTimeout">
			<slot name="tooltip">{{tooltip}}</slot>
		</InlineTooltip>

		<slot name="anchor"/>
	</button>
</template>

<script>
	import InlineTooltip from '../Tooltip/InlineTooltip.vue';
	import FaIcon from '../FontAwesome/FaIcon.vue';

	export default {
		name: 'BaseButton',
		components: { FaIcon, InlineTooltip },
		data: () => ({}),
		props: {
			disabled: {
				type: Boolean,
				default: false
			},
			toggled: {
				type: Boolean,
				default: false
			},
			tooltip: {
				type: String,
				default: ''
			},
			tooltipTimeout: {
				type: Number,
				default: 500
			},
			icon: {
				type: String,
				default: ''
			}
		}
	}
</script>

<style lang="scss" scoped>
	.base-button {
		--button-background-i: var(--button-background, rgba(255, 255, 255, 0));
		--button-background-focus-i: var(--button-background-focus, rgba(255, 255, 255, 0.08));
		--button-background-hover-i: var(--button-background-hover, rgba(255, 255, 255, 0.12));

		--button-icon-color-i: var(--button-icon-color, inherit);
		--button-icon-color-focus-i: var(--button-icon-color-focus, var(--button-icon-color-i));
		--button-icon-color-hover-i: var(--button-icon-color-hover, var(--button-icon-color-i));

		border: none;
		border-radius: 2px;

		position: relative;

		transition: all .3s;
		background-color: var(--button-background-i);

		cursor: pointer;

		color: inherit;

		padding: var(--spacer-1) var(--spacer-2);

		&.disabled {
			color: var(--neutral-md);
			pointer-events: none;
		}

		&.toggled {
			color: var(--primary);
		}

		.button-icon {
			margin-right: var(--spacer-2);
			font-size: .9em;
			color: var(--button-icon-color-i);

			transition: transform .3s;
		}

		&:hover {
			background-color: var(--button-background-hover-i);
			box-shadow: 0 1px 9px rgba(6, 6, 17, 0.5);

			.button-icon {
				color: var(--button-icon-color-hover-i);
			}
		}

		&:focus {
			background-color: var(--button-background-focus-i);
			box-shadow: 0 1px 9px rgba(6, 6, 17, 0.5);
			outline: none;

			.button-icon {
				color: var(--button-icon-color-focus-i);
			}
		}

		&:hover, &:focus {
			.button-icon {
				transform: scale(1.2);
			}
		}
	}
</style>
