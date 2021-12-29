import { reactive, markRaw } from 'vue';

/**
 * @typedef {String} ModalSize
 */
/**
 * @enum {ModalSize}
 */
export const modalSizes = {
	tiny: 'tiny',
	small: 'small',
	medium: 'medium',
	large: 'large',
};

/**
 * @typedef {Object} ModalData
 *
 * @property {Number} id
 * @property {Object} component
 * @property {Object} attributes
 * @property {Object} listeners
 *
 * @property {Boolean} shouldHideOnClose
 * @property {Boolean} closeOnClickOutside
 *
 * @property {function() : ModalData} open
 * @property {function() : ModalData} close
 */

export const modalService = reactive({
	/** @type {ModalData[]} **/
	modals: [],
	/** @type {{modal: ModalData, scroll: Number}[]} **/
	stack: [],
	/** @type {?ModalData} **/
	selected: null,
	maxId: 0,

	/**
	 * @param {ModalData}
	 *
	 * @return {ModalData}
	 */
	new({
		component,
		attributes = {},
		listeners = {},
		shouldHideOnClose = false,
		closeOnClickOutside = true
	}) {
		this.modals.push({
			id: this.maxId++,
			component: markRaw(component),
			attributes,
			listeners,

			shouldHideOnClose,
			closeOnClickOutside,

			open() {
				modalService.openModal(this);

				return this;
			},
			close() {
				modalService.closeModal(this);

				return this;
			}
		});

		return this.modals.last();
	},

	/**
	 * @param {ModalData} modal
	 */
	openModal(modal) {
		if (this.modals.indexOf(modal) === -1) {
			this.modals.push(modal);
		}

		if (this.selected !== modal) {
			this.stackPush();
			window.scroll({ behavior: 'smooth', top: 0 });

			this.selected = modal;
		}
	},

	/**
	 * @param {ModalData} modal
	 */
	hideModal(modal) {
		if (typeof modal === 'number') {
			modal = this.modals.find(m => m.id === modal);
		}

		if (modal) {
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
	},

	/**
	 * @param {ModalData} modal
	 */
	closeModal(modal) {
		if (typeof modal === 'number') {
			modal = this.modals.find(m => m.id === modal);
		}

		if (modal) {
			this.hideModal(modal);

			if (!modal.shouldHideOnClose) this.modals.remove(modal);
		}
	},

	stackPush() {
		this.stack.push({
			modal: this.selected,
			scroll: window.scrollY
		});
	},

	stackPop() {
		let state = this.stack.pop();

		if (state) {
			this.selected = state.modal;
			window.scroll({ behavior: 'smooth', top: state.scroll });
		}
	}
});


export async function confirm({
	message = '',
	title = 'Confirm',
	confirmLabel = 'Ok',
	cancelLabel = 'Cancel',
} = {}) {
	return new Promise(async (accept) => {
		let ConfirmModal = (await import('./Confirm/ConfirmModal.vue')).default;

		modalService.new({
			component: ConfirmModal,
			attributes: {
				message,
				title,
				confirmLabel,
				cancelLabel,
			},
			listeners: {
				close: (response) => {
					accept(!!response)
				}
			},
			closeOnClickOutside: false,
		}).open();
	})
}
