import { setOrReturnKey } from '../helpers/setOrReturnKey.js';
import { DatabaseQueryClause, DatabaseQueryComponent, DatabaseQueryCondition } from './DatabaseQueryComponent.js';
import Entity from '../classes/Entity.ts';
import { Database } from './Database.js';

export function dbBacktick(val) {
	return `\`${val}\``;
}
const _e = dbBacktick;

/**
 * @typedef {Number|String|(Number|String)[]} ModelId
 */

/**
 * @typedef {DatabaseQueryComponent[]|DatabaseQueryConditionOptions[]} ModelFilters
 */

/**
 *
 * @param {ModelFilters} filters
 * @return {DatabaseQueryClause}
 */
function getWhere(filters) {
	filters = filters.map(f => f instanceof DatabaseQueryComponent ? f : new DatabaseQueryCondition(f));

	return new DatabaseQueryClause(filters, 'AND');
}

/**
 * @class DatabaseModel<T>
 *
 * @template {Entity} T
 */
export class DatabaseModel {
	/**
	 * @param {Database} db
	 * @param {String} table
	 * @param {Class<Entity>} entity
	 * @param {DatabaseField[]} fields
	 * @param {DatabaseRelationship[]} relationships
	 * @param {Boolean} insertWithId
	 * @param {Boolean} updateOnDuplicate
	 */
	constructor({
		db,
		table,
		entity = null,
		fields = [],
		relationships = [],
		insertWithId = false,
		updateOnDuplicate = false,
	}) {
		/** @type {Database} **/
		this.db = db;

		this.table = table;

		/** @type {Class<Entity>} **/
		this.entity = entity;

		/** @type {DatabaseField[]} **/
		this.fields = fields;

		/** @type {DatabaseRelationship[]} **/
		this.relationships = relationships;

		this.insertWithId = insertWithId;
		this.updateOnDuplicate = updateOnDuplicate;
	}

	// Main Operations

	/**
	 * Saves the model object to the database, either inserting or updating a row.
	 * In case the model has no id, the generated id on insertion will be set on the model object
	 *
	 * @param {T} obj Entity instance
	 * @param {String[]} allowedFields List of allowed fields
	 * @param {Boolean} insert Whether insert is to be forced
	 * @returns {Promise<*>}
	 */
	async save(obj, allowedFields = [], insert = false) {
		const pks = this.primaryKeys();
		const exists = pks.reduce((v, pk) => v && obj[pk.name], true);

		const fields = this.fields.filter(f => !allowedFields.length || allowedFields.indexOf(f.name) >= 0 || pks.indexOf(f) >= 0);

		const data = fields.reduce((data, field) => {
			data[field.name] = field.get(obj);
			return data;
		}, {});

		if (insert || !exists || this.updateOnDuplicate) {
			const query = this.getInsertQuery(data);

			const result = await this.db.connection.query(query, data);
			const [insertData] = result;

			if (!this.insertWithId) {
				if (insertData.insertId) {
					const aiPk = pks.find(x => x.autoIncrement);
					if (aiPk) {
						aiPk.set(obj, insertData.insertId);
					}
				}
			}

			await this.saveRelationships(obj);

			return result;
		} else {
			const query = this.getUpdateQuery(data);

			let result = await this.db.connection.query(query, data);

			await this.saveRelationships(obj);

			return result;
		}
	}

	/**
	 * Queries the database for entries
	 *
	 * @param {Object} options
	 * @param {ModelFilters} [options.filters]
	 * @param {String} [options.order]
	 * @param {String[]} [options.fieldNames]
	 *
	 * @returns {T[]}
	 */
	async select({
		filters = [],
		order = '',
		fieldNames = []
	} = {}) {
		if (!filters.length) {
			filters.push(new DatabaseQueryCondition({
				values: 1,
				column: 1,
				bound: false,
				escapeColumn: false
			}));
		}

		const where = getWhere(filters);

		const query = this.getSelectQuery({ where, fieldNames, order	});
		const params = where.getParams();

		let [rows] = await this.db.connection.query(query, params);

		return this.entity ? rows.map(row => new this.entity(row)) : rows;
	}
	/**
	 * Queries the database for entries
	 *
	 * @param {Object} options
	 * @param {ModelFilters} [options.filters]
	 * @param {String} [options.order]
	 * @param {String[]} [options.fieldNames]
	 *
	 * @returns {T|null}
	 */
	async selectFirst({
		filters = [],
		order = '',
		fieldNames = []
	} = {}) {
		let results = await this.select({
			filters, order, fieldNames
		});

		return results[0] ?? null;
	}

	/**
	 * @param {ModelId} id
	 * @return {Promise<null|T>}
	 */
	async getById(id) {
		if (!Array.isArray(id)) id = [id];

		const pks = this.primaryKeys();
		let filters = [];

		for (let [index, field] of pks.entries()) {
			filters.push({
				column: field.name,
				values: id[index]
			});
		}

		let result = await this.select({ filters });

		if (result.length) {
			result = result[0];

			await this.selectRelationships(result);

			return result;
		}

		return null;
	}

	/**
	 * @param {T} obj
	 * @return {Promise<boolean>}
	 */
	async deleteByModel(obj) {
		const pks = this.primaryKeys();

		const id = [];

		for (const pk of pks) {
			id.push(obj[pk.name]);
		}

		return this.deleteById(id);
	}

	/**
	 * @param {ModelId} id
	 * @return {Promise<boolean>}
	 */
	async deleteById(id) {
		const pks = this.primaryKeys();

		if (!Array.isArray(id)) id = [id];

		let filters = [];

		for (let [index, field] of pks.entries()) {
			filters.push({
				column: field.name,
				values: id[index]
			});
		}

		return this.delete(filters);
	}

	/**
	 * @param {ModelFilters} filters
	 * @return {Promise<boolean>}
	 */
	async delete(filters) {
		const where = getWhere(filters);

		const query = this.getDeleteQuery(where);
		const params = where.getParams();

		let [data] = await this.db.connection.query(query, params);

		return !!data.affectedRows;
	}


	// QUERIES

	/**
	 * Returns the select query with the given params
	 *
	 * @param {DatabaseQueryComponent} where
	 * @param {String[]} fieldNames
	 * @param {String} order
	 *
	 * @returns {string}
	 */
	getSelectQuery({
		where = null,
		fieldNames = [],
		order = ''
	}) {
		const fields = this.fields.filter(f => !fieldNames.length || fieldNames.indexOf(f.name) >= 0);

		const columns = fields.map(f => _e(f.name));

		if (!where) {
			where = new DatabaseQueryCondition({
				values: 1,
				column: 1,
				bound: false,
				escapeColumn: false
			});
		}

		if (order) {
			order = order.replace('ORDER BY ', '');
			order = 'ORDER BY ' + order;
		}

		return `SELECT ${columns.join(', ')} FROM ${_e(this.table)} WHERE ${where.getClause()} ${order}`;
	}

	/**
	 *
	 * @param {Object} data
	 * @return {string}
	 */
	getInsertQuery(data) {
		const pks = this.primaryKeys();

		// Clone data so as not to taint the original object
		data = JSON.parse(JSON.stringify(data));

		// Delete primary keys unless they should be inserted as well
		if (!this.insertWithId) {
			pks.forEach(pk => {
				delete data[pk.name];
			});
		}

		let keys = [];
		let values = [];

		for (let key in data) {
			if (data.hasOwnProperty(key)) {
				keys.push(_e(key));
				values.push(':' + key);
			}
		}

		let query = `INSERT INTO ${_e(this.table)} (${keys.join(', ')}) VALUES (${values.join(', ')})`;

		if (this.updateOnDuplicate) {
			let sets = [];

			for (let key in data) {
				if (data.hasOwnProperty(key)) {
					sets.push(`${_e(key)} = :${key}`);
				}
			}

			query += `\n  ON DUPLICATE KEY UPDATE  ${sets.join(', ')}`;
		}

		return query;
	}

	/**
	 *
	 * @param {Object} data
	 * @return {string}
	 */
	getUpdateQuery(data) {
		const pks = this.primaryKeys();

		// Clone data so as not to taint the original object
		data = JSON.parse(JSON.stringify(data));

		// Extract primary keys to another object
		let idData = {};
		pks.forEach(pk => {
			idData[pk.name] = data[pk.name];
			delete data[pk.name];
		});

		let sets = [];
		let where = [];

		for (let key in data) {
			if (data.hasOwnProperty(key)) {
				sets.push(`${_e(key)} = :${key}`);
			}
		}

		for (let key in idData) {
			if (idData.hasOwnProperty(key)) {
				where.push(`${_e(key)} = :${key}`);
			}
		}

		return `UPDATE ${_e(this.table)} SET ${sets.join(', ')} WHERE ${where.join(' AND ')}`;
	}

	/**
	 * @param {DatabaseQueryClause} where
	 * @return {string}
	 */
	getDeleteQuery(where) {
		if (!where) {
			throw 'Good luck erasing the db on thine own, but not on my watch!';
		}

		return `DELETE FROM ${_e(this.table)} WHERE ${where.getClause()}`;
	}

	/**
	 *
	 * @return {string}
	 */
	getCreateStatement() {
		let lines = [];

		for (let field of this.fields) {
			let line = `    ${_e(field.column)} ${field.getTypeString()} ${field.nullable ? 'NULL' : 'NOT NULL'}`;

			if (field.defaultValue !== null) line += ` DEFAULT ${field.getDefaultValue()}`;

			if (field.autoIncrement) line += ' AUTO_INCREMENT';

			lines.push(line);
		}

		let primaryKeys = this.primaryKeys().map(f => _e(f.name));

		lines.push(`    PRIMARY KEY (${primaryKeys.join(', ')})`);

		return `CREATE TABLE ${_e(this.table)} (\n${lines.join(',\n')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;`;
	}

	primaryKeys() {
		return this.fields.filter(f => f.primaryKey);
	}

	/**
	 * Compares two model objects by their primary keys
	 *
	 * @param {T} obj1
	 * @param {T} obj2
	 * @return {boolean}
	 */
	compareByPK(obj1, obj2) {
		const pks = this.primaryKeys();

		for (let pk of pks) {
			if (obj1[pk.name] !== obj2[pk.name]) {
				return false;
			}
		}

		return true;
	}

	/**
	 * @param {T} obj
	 * @param {DatabaseRelationship[]} relationships
	 * @return {Promise<void>}
	 */
	async selectRelationships(obj, relationships = null) {
		if (!relationships) relationships = this.relationships.filter(r => r.autoload());

		for (const relationship of relationships) {
			await relationship.select(obj);
		}
	}

	/**
	 * @param {T} obj
	 * @param {DatabaseRelationship[]} relationships
	 * @return {Promise<void>}
	 */
	async saveRelationships(obj, relationships = null) {
		if (!relationships) relationships = this.relationships.filter(r => !r.readonly());

		for (const relationship of relationships) {
			await relationship.save(obj);
		}
	}
}

/**
 * @typedef {Object} DatabaseFieldOptions
 *
 * @property {String} name
 * @property {String} type
 * @property {Number} length
 * @property {Boolean} unsigned
 * @property {Boolean} nullable
 * @property {Object} defaultValue
 * @property {Boolean} autoIncrement
 * @property {Boolean} primaryKey
 * @property {Boolean} unique
 * @property {String} [column]
 */


export class DatabaseField {
	/**
	 * @param {DatabaseFieldOptions} options
	 */
	constructor({
		name,
		type,
		length,
		unsigned = false,
		nullable = false,
		defaultValue = null,
		autoIncrement = false,
		primaryKey = false,
		unique = false,
		column = null
	}) {
		this.name = name;
		this.type = type;
		this.length = length;
		this.unsigned = unsigned;
		this.nullable = nullable;
		this.defaultValue = defaultValue;
		this.autoIncrement = autoIncrement;
		this.primaryKey = primaryKey;
		this.unique = unique;
		this.column = column ? column : name;

		/** @type {Function} */
		this.getFunction = null;
		/** @type {Function} */
		this.setFunction = null;
	}

	setType(v) {
		return this._setOrReturnKey('type', v);
	}

	setPrimaryKey(v) {
		return this._setOrReturnKey('primaryKey', v);
	}

	setUnsigned(v) {
		return this._setOrReturnKey('unsigned', v);
	}

	setNullable(v) {
		return this._setOrReturnKey('nullable', v);
	}

	setLength(v) {
		return this._setOrReturnKey('length', v);
	}

	setDefault(v) {
		return this._setOrReturnKey('defaultValue', v);
	}

	setAutoIncrement(v) {
		return this._setOrReturnKey('autoIncrement', v);
	}

	setUnique(v) {
		return this._setOrReturnKey('unique', v);
	}

	baseGet(o) {
		return o[this.name];
	}

	baseSet(o, val) {
		o[this.name] = val;
	}

	get(o) {
		return this.getFunction ? this.getFunction(o) : this.baseGet(o);
	}

	set(o, val) {
		return this.setFunction ? this.setFunction(o, val) : this.baseSet(o, val);
	}

	getTypeString() {
		return this.type + (this.length ? `(${this.length})` : '') + (this.unsigned ? ' unsigned' : '')
	}

	getDefaultValue() {
		if (typeof this.defaultValue === 'string') {
			return `"${this.defaultValue}"`;
		} else {
			return this.defaultValue;
		}
	}
}

export class DatabaseFieldBoolean extends DatabaseField {
	baseGet(o) {
		return o[this.name] ? 1 : 0;
	}

	baseSet(o, val) {
		o[this.name] = !!val;
	}
}

DatabaseField.prototype._setOrReturnKey = setOrReturnKey;
