import './String';

/**
 * Generates a random integer
 * @param max
 * @param min
 * @returns {number}
 */
Math.randomInt = function (max, min= 0) {
	if (!min) min = 0;
	return Math.floor(Math.random() * (max - min)) + min;
};

Math.roundTo = function (value, precision) {
	const n = Math.pow(10, precision);

	return Math.round(value * n) / n;
}

let _decimalChar = '.';
Number.setDecimalChar = function (val) {
	_decimalChar = val;
};

Number.prototype.pad = function (size: number, decimalSize: number = 0, decimalChar?: string) {
	if (!decimalChar) decimalChar = _decimalChar;

	let negative = this < 0;
	let val = Math.abs(this);

	let str = val.toString();
	let strParts:string[] = str.split('.');

	let result = strParts[0].pad('0', size || 0);

	if (decimalSize && str.length === 1) {
		strParts[1] = '0';
	}

	if (strParts.length === 2) {
		result += decimalChar + strParts[1].pad('0', decimalSize, true);
	}

	if (negative) result = '-' + result;

	return result;
};

/**
 * Returns a number whose value is limited to the given range.
 *
 * Example: limit the output of this computation to between 0 and 255
 * (x * 255).clamp(0, 255)
 *
 * @param {Number} min The lower boundary of the output range
 * @param {Number} [max] The upper boundary of the output range
 * @returns A number in the range [min, max]
 * @type Number
 */
Number.prototype.clamp = function(min: number, max: number= Infinity) {
	return Math.min(Math.max(this, min), max);
};

Number.prototype.isBetween = function(min: number, max: number) {
	return this === this.clamp(min, max);
};
