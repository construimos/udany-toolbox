<template>
	<button class="base-button" :class="{ disabled, toggled }">
		<slot name="icon">
			<FaIcon class="button-icon" v-if="icon">
				{{icon}}
			</FaIcon>
		</slot>

		<slot/>

		<InlineTooltip top v-if="title" :timeout="500">
			<slot name="tooltip">{{title}}</slot>
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
			title: {
				type: String,
				default: ''
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
		border: none;
		border-radius: 2px;

		position: relative;

		transition: all .3s;
		background-color: rgba(255, 255, 255, 0);

		cursor: pointer;

		color: inherit;

		padding: var(--spacer-1) var(--spacer-2);

		&:focus {
			background-color: rgba(255, 255, 255, 0.08);
			box-shadow: 0 1px 9px rgba(6, 6, 17, 0.5);
			outline: none;
		}

		&:hover {
			background-color: rgba(255, 255, 255, 0.1);
			box-shadow: 0 1px 9px rgba(6, 6, 17, 0.5);
		}

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

			transition: transform .1s;
		}

		&:hover, &:focus {
			.button-icon {
				transform: scale(1.1);
			}
		}
	}
</style>
