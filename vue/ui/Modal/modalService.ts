import { reactive, markRaw, defineAsyncComponent } from 'vue';

export enum ModalSize {
	tiny = 'tiny',
	small = 'small',
	medium = 'medium',
	large = 'large',
}

class ModalData {
	id: number;

	component: Object;
	attributes: Object;
	listeners: Object;

	shouldHideOnClose?: Boolean;
	closeOnClickOutside: Boolean;
}

class ModalInstance extends ModalData {
	constructor(data: ModalData) {
		super();
		Object.assign(this, data);
	}

	open() {
		modalService.openModal(this);

		return this;
	}

	close() {
		modalService.closeModal(this);

		return this;
	}
}

const ConfirmModal = defineAsyncComponent(() => import('./Confirm/ConfirmModal.vue'));
const AlertModal = defineAsyncComponent(() => import('./Confirm/AlertModal.vue'));

export class ModalService {
	modals: ModalInstance[] = [];
	stack: { modal: ModalInstance, scroll: number }[] = [];
	selected?: ModalInstance;
	maxId: number = 0;

	new({
		component,
		attributes = {},
		listeners = {},
		shouldHideOnClose = false,
		closeOnClickOutside = true
	}: Omit<ModalData, 'id'>): ModalInstance {
		this.modals.push(new ModalInstance({
			id: this.maxId++,
			component: markRaw(component),
			attributes,
			listeners,

			shouldHideOnClose,
			closeOnClickOutside
		}));

		return this.modals.last();
	}

	openModal(modal: ModalInstance) {
		if (this.modals.indexOf(modal) === -1) {
			this.modals.push(modal);
		}

		if (this.selected !== modal) {
			// If no modal is selected, it saves the original scroll position
			this.stackPush();

			window.scroll({ behavior: 'smooth', top: 0 });

			this.selected = modal;
		}
	}

	hideModal(modal: ModalInstance | number) {
		if (typeof modal === 'number') {
			modal = this.modals.find(m => m.id === modal);
		}

		if (modal instanceof ModalInstance) {
			if (this.selected === modal) {
				this.selected = null;
				this.stackPop();
			} else {
				let state = this.stack.find(s => s.modal === modal);
				if (state) {
					this.stack.remove(state);
				}
			}
		}
	}

	closeModal(modal: ModalInstance | number) {
		if (typeof modal === 'number') {
			modal = this.modals.find(m => m.id === modal);
		}

		if (modal instanceof ModalInstance) {
			this.hideModal(modal);

			if (!modal.shouldHideOnClose) this.modals.remove(modal);
		}
	}

	stackPush() {
		this.stack.push({
			modal: this.selected,
			scroll: window.scrollY
		});
	}

	stackPop() {
		let state = this.stack.pop();

		if (state) {
			this.selected = state.modal;
			window.scroll({ behavior: 'smooth', top: state.scroll });
		}
	}


	async confirm({
		message = '',
		title = 'Confirm',
		icon = '',
		confirmLabel = 'Ok',
		cancelLabel = 'Cancel',
	} = {}) {
		return new Promise<boolean>(async (accept) => {
			modalService.new({
				component: ConfirmModal,
				attributes: {
					message,
					title,
					icon,
					confirmLabel,
					cancelLabel,
				},
				listeners: {
					close: response => accept(!!response)
				},
				closeOnClickOutside: false,
			}).open();
		})
	}

	async alert({
		message = '',
		title = 'Alert',
		icon = '',
		confirmLabel = 'Ok'
	} = {}) {
		return new Promise<void>(async (accept) => {
			modalService.new({
				component: AlertModal,
				attributes: {
					message,
					title,
					icon,
					confirmLabel,
				},
				listeners: {
					close: () => accept()
				},
				closeOnClickOutside: false,
			}).open();
		})
	}
}

export const modalService: ModalService = reactive(new ModalService());
