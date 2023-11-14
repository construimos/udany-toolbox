import { Dictionary } from '../interfaces';

declare global {
	interface Math {
		randomInt(max: number, min?: number): number;
		roundTo(value: number, precision?: number): number;
	}

	interface NumberConstructor {
		setDecimalChar(char: string);
	}

	interface Number {
		pad(size: number, decimalSize?: number, decimalChar?: string);
		clamp(min: number, max: number):number;
		isBetween(min: number, max: number):boolean;
	}

	interface Date {
		format(f: string): string;
	}

	interface String {
		pad(character: string, size: number, right?: boolean): string;
		format(values: Dictionary<string>, pattern: ((key: string) => string) | string): string;
		nl2br(): string;
		capitalize(): string;
	}

	interface RegExpConstructor {
		escape(text: string):string;
	}

	interface Array<T> {
		selfConcat(...elements: T[][]): this;
		last(): T | undefined;
		move(from: Number, to: Number): void;
		remove(...elements: T[]): this;
		unique(value: boolean): this;
		unique(): boolean;
		insertAt(index: number, value: T): this;
		shuffle(): this;
		randomElement(): T;
	}
}
