<template>
	<ModalFrame
		icon="question"
		:title="title"

		:size="ModalSize.small"

		:show-close="false"
	>
		<p class="pt-3 px-2 pb-3">{{message}}</p>

		<div class="text-end pt-2 pb-3" ref="rootRef" @keydown.esc="$emit('close', false)">
			<BaseButton @click="$emit('close', false)" icon="times">
				{{cancelLabel}}
			</BaseButton>

			<BaseButton class="ms-2" @click="$emit('close', true)" ref="confirmButtonRef" icon="check">
				{{confirmLabel}}
			</BaseButton>
		</div>
	</ModalFrame>
</template>

<script>
	import { useFocusTrap } from '@vueuse/integrations/useFocusTrap';

	import ModalFrame from '../ModalFrame.vue';
	import BaseButton from '../../Button/BaseButton.vue';
	import { ModalSize } from '../modalService';
	import { onBeforeUnmount, onMounted, ref } from 'vue';
	import { useHtmlElement } from '../../../util/useHtmlElement';
	import FaIcon from '../../FontAwesome/FaIcon.vue';

	export default {
		name: 'ConfirmModal',
		components: { FaIcon, BaseButton, ModalFrame },
		data: () => ({
			ModalSize
		}),
		props: {
			message: {
				type: String,
			},
			title: {
				type: String,
			},
			confirmLabel: {
				type: String,
				default: 'Ok',
			},
			cancelLabel: {
				type: String,
				default: 'Cancel',
			},
		},
		setup() {
			let rootRef = ref();
			let confirmButtonRef = ref();
			let confirmButton = useHtmlElement(confirmButtonRef);

			const trap = useFocusTrap(rootRef, { immediate: true });

			onMounted(() => {
				confirmButton.value.focus();
			});

			onBeforeUnmount(() => {
				trap.deactivate();
			});

			return {
				rootRef,
				confirmButtonRef,
			}
		}
	}
</script>

<style lang="scss" scoped>
	p {
		font-size: $font-size-sm;
	}
</style>
