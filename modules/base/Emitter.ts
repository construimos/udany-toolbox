import '../../extend/Date';
import HasUniqueId from './HasUniqueId';
import { Dictionary } from '../../interfaces';

interface EventHandler<T extends any[]> {
	callback: HandlerFunction<T>;
	key?: string;
	once: boolean
}

type EventMap = Record<string, any[]>;
type EventKey<T extends EventMap> = string & keyof T;

declare type HandlerFunction<T extends any[]> = ((...args: T | undefined) => void);
declare type HandlerIdentifier<T extends any[]> = HandlerFunction<T> | EventHandler<T> | string;

function isEventHandler(data: HandlerIdentifier<any[]>): data is EventHandler<any[]> {
	return typeof data === 'object' ? 'callback' in data : false;
}

export class Emitter<T extends EventMap> extends HasUniqueId {
	static AnyEvent = '*';

	protected autoEvents?: () => void;
	declare protected boundEvents: Dictionary<EventHandler<any[]>[]>;

	constructor() {
		super();

		if (this.autoEvents) {
			this.autoEvents();
		}
	}

	ensureBoundEventsExists() {
		if (!this.boundEvents) {
			Object.defineProperty(this, 'boundEvents', {enumerable: false, writable: true, value: {}});
		}
	}

	on<K extends EventKey<T>>(event: K, callback: HandlerFunction<T[K]>, key?: string, once: boolean = false): this {
		this.ensureBoundEventsExists();
		if (!this.boundEvents[event]) this.boundEvents[event] = [];

		this.boundEvents[event].push({callback, key, once});

		return this;
	}

	onAny(callback: HandlerFunction<any[]>, key?: string, once: boolean = false) {
		return this.on(Emitter.AnyEvent, callback, key, once);
	}

	off<K extends EventKey<T>>(event: K, data: HandlerIdentifier<T[K]> | HandlerIdentifier<T[K]>[]) {
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

	offAny(data: HandlerIdentifier<any[]>) {
		return this.off(Emitter.AnyEvent, data);
	}

	emit<K extends EventKey<T>>(event: K, args?: T[K]) {
		this.ensureBoundEventsExists();

		if (this.boundEvents[event]) {
			let handlersToRemove: EventHandler<T[K]>[] = [];
			let handlers = this.boundEvents[event].concat([]);

			for (let handler of handlers) {
				handler.callback.apply(this, args);

				if (handler.once) handlersToRemove.push(handler);
			}

			this.off(event, handlersToRemove);
		}

		if (event !== Emitter.AnyEvent && this.boundEvents[Emitter.AnyEvent]) {
			//this.emit(Emitter.AnyEvent, ([event]).concat(args));
		}

		return this;
	}

	once<K extends EventKey<T>>(event: K, callback: HandlerFunction<T[K]>, key?: string) {
		this.on(event, callback, key, true);

		return this;
	}
}

export default Emitter;
