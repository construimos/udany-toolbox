import { Entity } from './Entity';
import { Constructor } from '../../interfaces';

function hue2rgb(p: number, q: number, t: number): number {
	if(t < 0) t += 1;
	if(t > 1) t -= 1;
	if(t < 1/6) return p + (q - p) * 6 * t;
	if(t < 1/2) return q;
	if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
	return p;
}

declare type ColorValues = [number, number, number, number?];

function hsl2rgb([h, s, l, a = 1]: ColorValues): ColorValues {
	let r, g, b;

	if (s === 0) {
		r = g = b = l; // achromatic
	} else {
		let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		let p = 2 * l - q;

		r = hue2rgb(p, q, h + 1/3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1/3);
	}

	r = Math.min(Math.floor(r*256),255);
	g = Math.min(Math.floor(g*256),255);
	b = Math.min(Math.floor(b*256),255);

	return [r, g, b, a];
}

function rgb2hsl([r, g, b, a]: ColorValues): ColorValues {
	r /= 255;
	g /= 255;
	b /= 255;

	let max = Math.max(r, g, b),
		min = Math.min(r, g, b);

	let h, s, l = (max + min) / 2;

	if(max === min){
		h = s = 0; // achromatic
	} else {
		let d = (max - min);
		s = l >= 0.5 ? d / (2 - (max + min)) : d / (max + min);
		switch(max){
			case r: h = (g - b) / d + (g < b ? 6 : 0); break;
			case g: h = (b - r) / d + 2; break;
			case b: h = (r - g) / d + 4; break;
		}
	}

	return [h/6, s, l, a];
}


/**
 * @name Color
 * @property {Number} r
 * @property {Number} g
 * @property {Number} b
 * @property {Number} a
 */
class Color extends Entity {
	@Entity.Field.Integer()
	r: number;

	@Entity.Field.Integer()
	g: number;

	@Entity.Field.Integer()
	b: number;

	@Entity.Field.Float()
	a?: number;

    toString() {
        return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
    }

    $serialize() {
        return [this.r, this.g, this.b, this.a];
    }

	$fill(a) {
    	if (!a) return;

        if (a.r) {
            super.$fill(a);
        } else {
            this.r = a[0];
            this.g = a[1];
            this.b = a[2];
            this.a = a[3];
        }

        return this;
    }

	$delta(a) {
		if (!a) return;

		if (a.r) {
			super.$delta(a);
		} else {
			this.r = a[0];
			this.g = a[1];
			this.b = a[2];
			this.a = a[3];
		}

		return this;
	}

    $clone() {
    	return new (this.constructor as Constructor<Entity>)().$fill(this.$serialize()) as this;
    }

    fromHsl([h, s, l, a = 1]: ColorValues) {
	    let rgba = hsl2rgb([h, s, l, a]);

	    this.$fill(rgba);

	    return this;
    }

    toHsl(): ColorValues {
    	let { r, g, b, a } = this;

	    return rgb2hsl([r, g, b, a]);
    }

    equals(other) {
	    return this.a === other.a
		    && this.r === other.r
		    && this.g === other.g
		    && this.b === other.b;
    }

    toHex(alpha = false) {
    	let array = this.$serialize().slice(0, 3);

    	if (alpha) {
    		array.push(Math.round(this.a * 255));
	    }

	    return Color.arrayToHex(array as ColorValues);
    }

    fillFromHex(hex) {
    	if (!Color.hexIsValid(hex)) return;

    	let values = Color.hexToArray(hex);

    	if (values.length === 4) {
		    values[3] = values[3] / 255;
	    } else {
		    values[3] = this.a;
	    }

    	this.$fill(values);
    }

	static arrayToHex(values: ColorValues): string {
    	return values
		    .map(v => v.toString(16).pad('0', 2))
		    .join('')
		    .toUpperCase();
    }

	static hexToArray(hex: string): ColorValues {
    	return hex.match(/[A-F0-9]{2}/g).map(v => parseInt(v, 16)) as ColorValues;
    }

    static hexIsValid(hex: string): boolean {
		let values = Color.hexToArray(hex);

		return values.length.isBetween(3,4) && values.every(v => v.isBetween(0, 255));
    }

    static transition(from: Color, to: Color, percent: number): Color {
        // Calculate the deltas for each component
        let dR = Math.round((to.r - from.r) * percent);
        let dG = Math.round((to.g - from.g) * percent);
        let dB = Math.round((to.b - from.b) * percent);
        let dA = Math.round((to.a - from.a) * percent);

        return new Color().$fill(
        	[from.r + dR, from.g + dG, from.b + dB, from.a + dA]
		);
    }

    /**
     * Transitions between N colors
     * @param {Color[]} colors
     * @param {Number} percent
     * @returns {Color}
     */
    static gradient(colors, percent) {
        let sectionSize = 1.01 / (colors.length - 1);

        let currentSection = Math.floor(percent / sectionSize);
        let currentProgress = (percent % sectionSize) / sectionSize;

        return this.transition(colors[currentSection], colors[currentSection + 1], currentProgress);
    }
}


/**
 * @name HslColor
 * @property {Number} h
 * @property {Number} s
 * @property {Number} l
 * @property {Number} a
 */
class HslColor extends Color {
	@Entity.Field.Float()
	h: number;

	@Entity.Field.Float()
	s: number;

	@Entity.Field.Float()
	l: number;

	toString() {
		return `hsla(${this.h}turn, ${this.s*100}%, ${this.l*100}%, ${this.a})`;
	}

	$serialize(): ColorValues {
		return [this.h, this.s, this.l, this.a];
	}

	$fill(a) {
		if (!a) return;

		if (a.h) {
			super.$fill(a);
		} else {
			this.h = a[0];
			this.s = a[1];
			this.l = a[2];
			this.a = a[3];
		}

		return this;
	}

	fromRgb([r, g, b, a = 1]: ColorValues) {
		let hsla = rgb2hsl([r, g, b, a]);

		this.$fill(hsla);

		return this;
	}

	toRgb() {
		let { h, s, l, a } = this;

		return hsl2rgb([h, s, l, a]);
	}

	toHex(alpha = false) {
		let array = this.toRgb().slice(0, 3);

		if (alpha) {
			array.push(Math.round(this.a * 255));
		}

		return Color.arrayToHex(array as ColorValues);
	}

	fillFromHex(hex) {
		if (!Color.hexIsValid(hex)) return;

		let values = Color.hexToArray(hex);
		if (values.length === 4) {
			values[3] = values[3] / 255;
		} else {
			values[3] = this.a;
		}

		values = rgb2hsl(values);

		this.$fill(values);
	}
}

export {Color, HslColor};
