import { computed } from 'vue';
import type { Ref } from 'vue';

declare type HtmlRefOrElement = HTMLElement | Ref<HTMLElement>

export function getHtmlElementFromRef(elementRef: HtmlRefOrElement): HTMLElement {
	if (!elementRef) return null;
	if (elementRef instanceof HTMLElement) return elementRef;

	let el = elementRef.value || elementRef;
	el = el.$el || el;

	if (!(el instanceof HTMLElement)) return null;

	return el;
}

export function useHtmlElement(elementRef: HtmlRefOrElement):computed<HTMLElement> {
	return computed<HTMLElement>(() => getHtmlElementFromRef(elementRef));
}

export function elementBelongsTo(element: HtmlRefOrElement, parent: HtmlRefOrElement) {
	let el = getHtmlElementFromRef(element);
	parent = getHtmlElementFromRef(parent);

	return (!el || el === document.body)
		? false
		: el === parent ? true : elementBelongsTo(el.parentNode, parent);
}
