import '../extend/Date';
import HasUniqueId from './HasUniqueId';
import { Dictionary } from '../interfaces';

interface EventHandler {
	callback: HandlerFunction;
	key?: string;
	once: boolean
}

declare type HandlerFunction = ((...args: any[] | undefined) => void);

declare type HandlerIdentifier = HandlerFunction | EventHandler | string;

function isEventHandler(data: HandlerIdentifier): data is EventHandler {
	return typeof data === 'object' ? 'callback' in data : false;
}

/**
 * Emitter class
 * @name Emitter
 * @property {Function} __autoEvents
 * @extends HasUniqueId
 */
export class Emitter extends HasUniqueId {
	static AnyEvent = '*';

	protected autoEvents?: () => void;
	declare protected boundEvents: Dictionary<EventHandler[]>;

	constructor() {
		super();

		if (this.autoEvents) {
			this.autoEvents();
		}
	}

	ensureBoundEventsExists() {
		if (!this.boundEvents) {
			Object.defineProperty(this, 'boundEvents', {enumerable: false, writable: false, value: {}});
		}
	}

	on(event: string, callback: HandlerFunction, key?: string, once: boolean = false): this {
		this.ensureBoundEventsExists();
		if (!this.boundEvents[event]) this.boundEvents[event] = [];

		this.boundEvents[event].push({callback, key, once});

		return this;
	}

	onAny(callback: HandlerFunction, key?: string, once: boolean = false) {
		return this.on(Emitter.AnyEvent, callback, key, once);
	}

	off(event: string, data: HandlerIdentifier | HandlerIdentifier[]) {
		this.ensureBoundEventsExists();
		if (!this.boundEvents[event]) return this;

		const handlers = this.boundEvents[event];

		if (data instanceof Array) {
			data.forEach(fn => this.off(event, fn));

		} else if (data) {
			let idx;

			if (isEventHandler(data)) {
				idx = handlers.indexOf(data);
			} else {
				data = handlers.find((e) => e.key === data);
				idx = handlers.indexOf(data[0]);
			}

			if (idx >= 0) {
				handlers.splice(idx, 1);
			}
		} else {
			handlers.splice(0, handlers.length);
		}

		return this;
	}

	offAny(data: HandlerIdentifier) {
		return this.off(Emitter.AnyEvent, data);
	}

	emit(event, args?: any[]) {
		this.ensureBoundEventsExists();

		if (!(args instanceof Array)) args = [args];

		if (this.boundEvents[event]) {
			let handlersToRemove: EventHandler[] = [];

			let handlers = this.boundEvents[event].concat([]);

			for (let handler of handlers) {
				handler.callback.apply(this, args);

				if (handler.once) handlersToRemove.push(handler);
			}

			this.off(event, handlersToRemove);
		}

		if (event !== Emitter.AnyEvent && this.boundEvents[Emitter.AnyEvent]) {
			this.emit(Emitter.AnyEvent, ([event]).concat(args));
		}

		return this;
	}

	once(event: string, callback: HandlerFunction, key?: string) {
		this.on(event, callback, key, true);

		return this;
	}
}

export default Emitter;
