export type notUndefined = string | number | boolean | symbol | object;

export interface Dictionary<V extends notUndefined = notUndefined> {
	[key: string]: V | undefined;
}

export type Constructor<C> = new (...args: any[]) => C;
