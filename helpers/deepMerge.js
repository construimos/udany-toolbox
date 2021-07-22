/**
 * @template T
 * @param {T} target
 * @param {*} source
 * @return {T}
 */
export default function deepMerge (target, source) {
	for (const key of Object.keys(source)) {
		if (source[key] instanceof Object){
			Object.assign(source[key], deepMerge(target[key], source[key]));
		}
	}

	Object.assign(target || {}, source);

	return target;
}