<template>
	<div class="modals-container" v-if="service">
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
	import Dimmer from '../Dimmer/Dimmer.vue';
	import { ModalService } from './modalService';

	export default {
		name: 'ModalContainer',
		components: { Dimmer },
		props: {
			service: {
				type: ModalService,
				required: true
			}
		},
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
