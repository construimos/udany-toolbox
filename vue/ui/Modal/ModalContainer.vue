<template>
	<div class="modals-container">
		<Dimmer
			:show="!!service.selected"
			@mousedown.stop="onOverlayClick"
		/>

		<template
			v-for="modal in service.modals"
			:key="modal.id"
		>
			<div class="modal-wrapper">
				<component
					:is="modal.component"

					v-show="modal === service.selected"

					v-bind="modal.attributes"
					v-on="modal.listeners"

					@close="service.closeModal(modal)"
				/>
			</div>
		</template>
	</div>
</template>

<script>
	import { modalService } from './modalService.js';
	import Dimmer from '../Dimmer/Dimmer.vue';

	export default {
		name: 'ModalContainer',
		components: { Dimmer },
		data: () => ({
			service: modalService
		}),
		methods: {
			onOverlayClick() {
				if (this.service.selected.closeOnClickOutside) {
					this.service.closeModal(this.service.selected);
				}
			}
		}
	}
</script>

<style lang="scss" scoped>
	.modals-container {
		@include fillAbsolute();
		position: fixed;
		z-index: 10;

		pointer-events: none;

		> * {
			pointer-events: auto;
		}
	}

	.modal-wrapper {
		@include centerAbsolute();
	}
</style>
