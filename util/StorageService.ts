export class StorageService {
	prefix: string;
	onBeforeUnload: () => any;

	constructor(prefix: string) {
		this.prefix = prefix;

		this.onBeforeUnload = () => {
			const keys = Object.keys(this);

			for (let key of keys) {
				this.store(key, this[key]);
			}

			return true;
		};

		window.addEventListener('beforeunload', this.onBeforeUnload);

		return new Proxy(this, {
			get: (target, prop) => {
				if (!target.hasOwnProperty(prop)) {
					target[prop] = this.retrieve(prop);
				}

				return target[prop];
			},
			set: (target, prop, value: any) => {
				this.store(prop, value);

				return target[prop] = value;
			}
		});
	}

	retrieve(key: string | symbol) {
		let storedValue = localStorage.getItem(this.prefix + key.toString());
		if (storedValue) {
			return JSON.parse(storedValue);
		}

		return null;
	}

	store(key: string | symbol, value: any) {
		localStorage.setItem(this.prefix + key.toString(), JSON.stringify(value));
	}

	destroy() {
		window.removeEventListener('beforeunload', this.onBeforeUnload);
	}
}
