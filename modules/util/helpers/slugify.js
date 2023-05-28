import diacritics from './diacritics.js';

export function slugify(str) {
	return diacritics.remove(str.toLowerCase().replace(/\s/gi, '-').replace(/-+/gi, '-'))
}
