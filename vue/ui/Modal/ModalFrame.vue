<template>
	<Transition appear name="fade">
		<div
			class="modal-frame"
			:class="[size]"

			@mousedown.stop
		>
			<div class="header py-2 px-3">
				<span class="title">
					<fa-icon v-if="icon">{{icon}}</fa-icon>

					<slot name="title">
						{{title}}
					</slot>
				</span>

				<fa-icon
					v-if="showClose"
					class="close-icon"
					@click="$emit('close')"
				>times</fa-icon>
			</div>

			<div class="content py-2 px-3">
				<slot></slot>
			</div>

			<div class="footer py-2 px-3" v-if="showFooter">
				<slot name="footer"></slot>
			</div>
		</div>
	</Transition>
</template>

<script>
	import FaIcon from '../FontAwesome/FaIcon.vue';
	import { ModalSize } from './modalService';

	export default {
		name: 'ModalFrame',
		components: { FaIcon },
		emits: [
			'close'
		],
		props: {
			size: {
				type: String,
				validator: (v) => Object.values(ModalSize).includes(v),
				default: () => ModalSize.small
			},
			icon: {
				type: String,
				default: ''
			},
			title: {
				type: String,
				default: ''
			},
			showClose: {
				type: Boolean,
				default: true
			},
			showFooter: {
				type: Boolean,
				default: false
			}
		}
	}
</script>

<style lang="scss" scoped>
	.modal-frame {
		--modal-margin: var(--spacer-5);

		--default-shadow: 0 0 10px rgba(#100f17, .5);

		--modal-background-i: var(--modal-background, #19171f);
		--modal-shadow-i: var(--modal-shadow, var(--default-shadow));
		--modal-close-hover-color-i: var(--modal-close-hover-color, #b82920);

		background: var(--modal-background-i);
		box-shadow: var(--modal-shadow-i);

		.header {
			background: rgba(black, .2);

			display: flex;
			justify-content: space-between;
			align-items: center;
			user-select: none;

			.title {
				.fa-icon {
					margin-right: var(--spacer-3);
				}
			}

			.close-icon {
				cursor: pointer;
				transition: color .3s;

				&:hover {
					color: var(--modal-close-hover-color-i);
				}
			}
		}

		.footer {
			background: rgba(black, .2);
		}

		// Sizes
		max-height: calc(100vh - (var(--modal-margin) * 2));
		max-width: calc(100vw - (var(--modal-margin) * 2));
		&.tiny { width: 250px; }
		&.small { width: 380px; }
		&.medium { width: 600px; }
		&.large { width: 900px; }
	}

	.fade-enter-active,
	.fade-leave-active {
		transition: opacity 0.5s ease;
	}

	.fade-enter-from,
	.fade-leave-to {
		opacity: 0;
	}
</style>
