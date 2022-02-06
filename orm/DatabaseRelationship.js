import { setOrReturnKey } from '../helpers/setOrReturnKey.js';
import { DatabaseQueryCondition } from './DatabaseQueryComponent.ts';

/**
 * @name DatabaseRelationship
 *
 * @template {Entity} T
 * @template {Entity} E
 */
export class DatabaseRelationship {
	/**
	 * @param {DatabaseModel<T>} model The model
	 * @param {DatabaseModel<E>} externalModel The external model
	 *
	 * @param {string} property The property the relationship is stored within the current model
	 *
	 * @param {string} localKey A field that identifies the current model within itself
	 * @param {string} localForeignKey A field that identifies the current model within the external model
	 *
	 * @param {string} externalKey A field that identifies the external model within itself
	 * @param {string} externalForeignKey A field that identifies the external model within the current model
	 *
	 * @param {Boolean} readOnly Means the current relationship will only ever query data and never attempt to update it automatically
	 * @param {Boolean} autoload Means the current relationship will always be queried when querying it's own model
	 *
	 * @param {ModelFilters} filters Filters to apply when querying the relationship
	 * @param {string} order Order clause to be used when querying the relationship
	 */
	constructor({
		model,
		externalModel,

		property,

		localKey = '',
		localForeignKey = '',

		externalKey = '',
		externalForeignKey = '',

		readOnly = true,
		autoload = false,

		filters = [],
		order = '',
	}) {
		this.model = model;
		this.externalModel = externalModel;

		this.property = property;

		this.localKey = localKey;
		this.localForeignKey = localForeignKey;

		this.externalKey = externalKey;
		this.externalForeignKey = externalForeignKey;

		this._readOnly = readOnly;
		this._autoload = autoload;

		this.filters = filters;
		this.order = order;
	}

	async query(obj) {}

	async select(obj) {}

	//async selectMany(objs) {}

	async save(obj) {}

	readonly(v) {
		return this._setOrReturnKey('_readOnly', v)
	}

	autoload(v) {
		return this._setOrReturnKey('_autoload', v)
	}

	setFilters(f) {
		this.filters = f;
		return this;
	}

	setOrder(o) {
		this.order = o;
		return this;
	}
}

DatabaseRelationship.prototype._setOrReturnKey = setOrReturnKey;


/**
 * @name DatabaseRelationshipOneToMany
 *
 * @extends {DatabaseRelationship<T, E>}
 *
 * @template {Entity} T
 * @template {Entity} E
 */
export class DatabaseRelationshipOneToMany extends DatabaseRelationship {
	/**
	 * @param {DatabaseModel<T>} model The model
	 * @param {DatabaseModel<E>} externalModel The external model
	 *
	 * @param {string} property The property the relationship is stored within the current model
	 *
	 * @param {string} localKey A field that identifies the current model within itself
	 * @param {string} localForeignKey A field that identifies the current model within the external model
	 *
	 * @param {Boolean} readOnly Means the current relationship will only ever query data and never attempt to update it automatically
	 * @param {Boolean} autoload Means the current relationship will always be queried when querying it's own model
	 *
	 * @param {ModelFilters} filters Filters to apply when querying the relationship
	 * @param {string} order Order clause to be used when querying the relationship
	 */
	constructor({
		model,
		externalModel,

		property,

		localKey = '',
		localForeignKey = '',

		readOnly = true,
		autoload = false,

		filters = [],
		order = '',
	}) {
		super({
			model,
			externalModel,

			property,

			localKey,
			localForeignKey,

			readOnly,
			autoload,

			filters,
			order,
		})
	}

	async query(obj) {
		const id = obj[this.localKey];

		const filters = this.filters.concat([
			new DatabaseQueryCondition({
				column: this.localForeignKey,
				values: id
			})
		]);

		return this.externalModel.select({
			filters: filters,
			order: this.order
		});
	}

	async select(obj) {
		const result = await this.query(obj);

		obj[this.property] = result;

		return result;
	}

	async save(obj) {
		let id = obj[this.localKey];
		let data = obj[this.property];

		for (const item of data) {
			item[this.localForeignKey] = id;

			await this.externalModel.save(item);
		}

		let list = await this.query(obj);
		let deleted = list.filter(element => !data.find(x => this.externalModel.compareByPK(x, element)));

		for (const item of deleted) {
			await this.externalModel.deleteByModel(item);
		}
	}
}


/**
 * @name DatabaseRelationshipManyToMany
 *
 * @extends {DatabaseRelationship<T, E>}
 *
 * @template {Entity} T
 * @template {Entity} E
 * @template {Entity} I
 */
export class DatabaseRelationshipManyToMany extends DatabaseRelationship {
	/**
	 * @param {DatabaseModel<T>} model The model
	 * @param {DatabaseModel<E>} externalModel The external model
	 * @param {DatabaseModel<I>} intermediaryModel The intermediary model between both models
	 *
	 * @param {string} property The property the relationship is stored within the current model
	 *
	 * @param {string} [localKey] A field that identifies the current model within itself
	 * @param {string} localForeignKey A field that identifies the current model within the intermediary model
	 *
	 * @param {string} [externalKey] A field that identifies the external model within itself
	 * @param {string} externalForeignKey A field that identifies the external model within the intermediary model
	 *
	 * @param {Boolean} readOnly Means the current relationship will only ever query data and never attempt to update it automatically
	 * @param {Boolean} autoload Means the current relationship will always be queried when querying it's own model
	 *
	 * @param {ModelFilters} filters Filters to apply when querying the relationship
	 * @param {string} order Order clause to be used when querying the relationship
	 */
	constructor({
		model,
		externalModel,
		intermediaryModel,

		property,

		localKey = 'id',
		localForeignKey,

		externalKey = 'id',
		externalForeignKey,

		readOnly = true,
		autoload = false,

		filters = [],
		order = '',
	}) {
		super({
			model,
			externalModel,

			property,

			localKey,
			localForeignKey,

			externalKey,
			externalForeignKey,

			readOnly,
			autoload,

			filters,
			order,
		});

		this.intermediaryModel = intermediaryModel;
	}

	async select(obj) {
		const id = obj[this.localKey];

		let filters = [
			new DatabaseQueryCondition({
				column: this.localForeignKey,
				values: id
			})
		];

		const intermediaryResult = await this.intermediaryModel.select({
			filters
		});

		if (!intermediaryResult.length) return [];

		const externalIds = intermediaryResult.map(r => r[this.externalForeignKey]);

		filters = this.filters.concat([
			new DatabaseQueryCondition({
				column: this.externalKey,
				operator: 'IN',
				values: `(${externalIds.join(', ')})`,
				bound: false
			})
		]);

		const result = await this.externalModel.select({
			filters,
			order: this.order
		});

		obj[this.property] = result;

		return result;
	}

	async save(obj) {
		const id = obj[this.localKey];
		const data = obj[this.property];

		let intermediaryData = data.map(d => {
			let obj = {};

			obj[this.localForeignKey] = id;
			obj[this.externalForeignKey] = d[this.externalKey];

			return obj;
		});

		if (this.intermediaryModel.entity) intermediaryData = intermediaryData.map(d => new this.intermediaryModel.entity(d));

		let filters = [
			new DatabaseQueryCondition({
				column: this.localForeignKey,
				values: id
			})
		];

		await this.intermediaryModel.delete(filters);

		for (const item of intermediaryData) {
			await this.intermediaryModel.save(item, [], true);
		}
	}
}
