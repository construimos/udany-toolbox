export const queryFormat = function (query, values) {
	if (!values) return query;
	return query.replace(/:(\w+)/g, function (txt, key) {
		if (values.hasOwnProperty(key)) {
			return this.escape(values[key]);
		}
		return txt;
	}.bind(this));
};
