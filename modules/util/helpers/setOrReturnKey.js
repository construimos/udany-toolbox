export function setOrReturnKey(key, val) {
	if (val !== null && typeof val !== 'undefined') {
		this[key] = val;

		return this;
	} else {
		return this[key];
	}
}
