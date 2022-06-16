import { Entity } from '../base';
import { Database } from './Database';
import { Constructor } from '../../interfaces';
import { DatabaseRelationship } from './DatabaseRelationship';

import {
	DatabaseQueryClause,
	DatabaseQueryComponent,
	DatabaseQueryCondition,
	DatabaseQueryConditionOptions
} from './DatabaseQueryComponent';

import { OkPacket, RowDataPacket } from 'mysql2';

export function dbBacktick(val) {
	return `\`${val}\``;
}
const _e = dbBacktick;

declare type ModelId = Number|String|(Number|String)[];
export declare type ModelFilters = (DatabaseQueryComponent | DatabaseQueryConditionOptions)[];

function getWhere(filters: ModelFilters): DatabaseQueryClause {
	filters = filters.map(f => (f instanceof DatabaseQueryComponent) ? f : new DatabaseQueryCondition(f));

	return new DatabaseQueryClause(filters as DatabaseQueryComponent[], 'AND');
}

export interface DatabaseFieldOptions {
	name: string;
	column?: string;
	type: string;
	length: number;
	unsigned?: boolean;
	nullable?: boolean;
	defaultValue?: any;
	autoIncrement?: boolean;
	primaryKey?: boolean;
	unique?: boolean;

	getFunction?: Function;
	setFunction?: Function;
}

export class DatabaseField implements DatabaseFieldOptions {
	name: string;
	column?: string;
	type: string;
	length: number;
	unsigned: boolean;
	nullable: boolean;
	defaultValue: any;
	autoIncrement: boolean;
	primaryKey: boolean;
	unique: boolean;

	getFunction: Function;
	setFunction: Function;

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
		column = null,
		getFunction = null,
		setFunction = null,
	}: DatabaseFieldOptions) {
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
		this.getFunction = getFunction;
		/** @type {Function} */
		this.setFunction = setFunction;
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

export interface DatabaseModelOptions<T extends Entity> {
	db: Database;
	table: string;
	entity: Constructor<T>;
	fields: DatabaseField[];
	relationships?: DatabaseRelationship<T, Entity>[];
	insertWithId?: boolean;
	updateOnDuplicate?: boolean;
}

export class DatabaseModel<T extends Entity> implements DatabaseModelOptions<T> {
	db: Database;
	table: string;
	entity: Constructor<T>;
	fields: DatabaseField[];
	relationships: DatabaseRelationship<T, Entity>[];
	insertWithId: boolean;
	updateOnDuplicate: boolean;

	constructor({
		db,
		table,
		entity = null,
		fields = [],
		relationships = [],
		insertWithId = false,
		updateOnDuplicate = false,
	}: DatabaseModelOptions<T>) {
		this.db = db;
		this.table = table;
		this.entity = entity;
		this.fields = fields;
		this.relationships = relationships;
		this.insertWithId = insertWithId;
		this.updateOnDuplicate = updateOnDuplicate;
	}

	/**
	 * Saves the model object to the database, either inserting or updating a row.
	 * In case the model has no id, the generated id on insertion will be set on the model object
	 */
	async save(obj: T, {
		allowedFields = [],
		insert = false
	}: { allowedFields?: string[], insert?: boolean	} = {}) {
		const pks = this.primaryKeys();
		const exists = pks.reduce((v, pk) => v && obj[pk.name], true);

		const fields = this.fields.filter(f => !allowedFields.length || allowedFields.indexOf(f.name) >= 0 || pks.indexOf(f) >= 0);

		const data = fields.reduce((data, field) => {
			data[field.name] = field.get(obj);
			return data;
		}, {});

		if (insert || !exists || this.updateOnDuplicate) {
			const query = this.getInsertQuery(data);

			const [result] = await this.db.connection.query(query, data);
			const insertData = result as OkPacket;

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

	async select({
		filters = [],
		order = '',
		fieldNames = []
	}: {
		filters?: ModelFilters,
		order?: string,
		fieldNames?: string[]
	} = {}): Promise<T[]> {
		if (!filters.length) {
			filters.push(new DatabaseQueryCondition({
				values: 1,
				column: '1',
				bound: false,
				escapeColumn: false
			}));
		}

		const where = getWhere(filters);

		const query = this.getSelectQuery({ where, fieldNames, order	});
		const params = where.getParams();

		let [rows] = await this.db.connection.query(query, params);

		return (rows as RowDataPacket[]).map(row => new this.entity().$fill(row));
	}

	async selectFirst({
		filters = [],
		order = '',
		fieldNames = []
	}: {
		filters?: ModelFilters,
		order?: string,
		fieldNames?: string[]
	} = {}): Promise<T|null> {
		let results = await this.select({
			filters, order, fieldNames
		});

		return results[0] as (T|null) ?? null;
	}

	async getById(id: ModelId): Promise<T|null> {
		if (!Array.isArray(id)) id = [id];

		const pks = this.primaryKeys();
		let filters = [];

		for (let [index, field] of pks.entries()) {
			filters.push({
				column: field.name,
				values: id[index]
			});
		}

		let results = await this.select({ filters });

		if (results.length) {
			let result = results[0] as (T|null);

			await this.selectRelationships(result);

			return result;
		}

		return null;
	}

	async deleteByModel(obj: T): Promise<boolean> {
		const pks = this.primaryKeys();

		const id = [];

		for (const pk of pks) {
			id.push(obj[pk.name]);
		}

		return this.deleteById(id);
	}

	async deleteById(id: ModelId): Promise<boolean>  {
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

	async delete(filters: ModelFilters): Promise<boolean> {
		const where = getWhere(filters);

		const query = this.getDeleteQuery(where);
		const params = where.getParams();

		let [data] = await this.db.connection.query(query, params) as OkPacket[];

		return !!data.affectedRows;
	}

	getSelectQuery({
		where = null,
		fieldNames = [],
		order = ''
	}: {
		where?: DatabaseQueryComponent,
		fieldNames?: string[],
		order?: string
	}) : string {
		const fields = this.fields.filter(f => !fieldNames.length || fieldNames.indexOf(f.name) >= 0);

		const columns = fields.map(f => _e(f.name));

		if (!where) {
			where = new DatabaseQueryCondition({
				values: 1,
				column: '1',
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

	getInsertQuery(data: Record<any,any>): string {
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
			let updates = [];

			for (let key in data) {
				if (data.hasOwnProperty(key)) {
					updates.push(`${_e(key)} = :${key}`);
				}
			}

			query += `\n  ON DUPLICATE KEY UPDATE  ${updates.join(', ')}`;
		}

		return query;
	}

	getUpdateQuery(data: Record<any,any>): string {
		const pks = this.primaryKeys();

		// Clone data so as not to taint the original object
		data = JSON.parse(JSON.stringify(data));

		// Extract primary keys to another object
		let idData = {};
		pks.forEach(pk => {
			idData[pk.name] = data[pk.name];
			delete data[pk.name];
		});

		let updates = [];
		let where = [];

		for (let key in data) {
			if (data.hasOwnProperty(key)) {
				updates.push(`${_e(key)} = :${key}`);
			}
		}

		for (let key in idData) {
			if (idData.hasOwnProperty(key)) {
				where.push(`${_e(key)} = :${key}`);
			}
		}

		return `UPDATE ${_e(this.table)} SET ${updates.join(', ')} WHERE ${where.join(' AND ')}`;
	}

	getDeleteQuery(where: DatabaseQueryClause): string {
		if (!where) {
			throw 'Good luck erasing the db on thine own, but not on my watch!';
		}

		return `DELETE FROM ${_e(this.table)} WHERE ${where.getClause()}`;
	}

	getCreateStatement(): string {
		let lines = [];

		for (let field of this.fields) {
			let line = `    ${_e(field.column)} ${field.getTypeString()} ${field.nullable ? 'NULL' : 'NOT NULL'}`;

			if (field.defaultValue !== null) line += ` DEFAULT ${field.getDefaultValue()}`;

			if (field.autoIncrement) line += ' AUTO_INCREMENT';

			lines.push(line);
		}

		let primaryKeys = this.primaryKeys().map(f => _e(f.name));

		lines.push(`    PRIMARY KEY (${primaryKeys.join(', ')})`);

		return `CREATE TABLE ${_e(this.table)} (\n${lines.join(',\n')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8mb4_0900_ai_ci;`;
	}

	primaryKeys(): DatabaseField[] {
		return this.fields.filter(f => f.primaryKey);
	}

	/**
	 * Compares two model objects by their primary keys
	 */
	compareByPK(obj1: T, obj2: T): boolean {
		const pks = this.primaryKeys();

		for (let pk of pks) {
			if (obj1[pk.name] !== obj2[pk.name]) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Retrieves relational data
	 */
	async selectRelationships(obj: T, relationships: DatabaseRelationship<T, Entity>[] = null): Promise<void> {
		if (!relationships) relationships = this.relationships.filter(r => r.autoload);

		for (const relationship of relationships) {
			await relationship.select(obj);
		}
	}

	/**
	 * Saves relational data
	 */
	async saveRelationships(obj: T, relationships: DatabaseRelationship<T, Entity>[] = null): Promise<void> {
		if (!relationships) relationships = this.relationships.filter(r => !r.readOnly);

		for (const relationship of relationships) {
			await relationship.save(obj);
		}
	}

	static Field = {
		Any: DatabaseField,
		Boolean: DatabaseFieldBoolean
	};
}

export default DatabaseModel
