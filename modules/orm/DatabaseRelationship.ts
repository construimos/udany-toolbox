import { DatabaseQueryCondition } from './DatabaseQueryComponent';
import { Entity } from '../base';
import { DatabaseModel, ModelFilters } from './DatabaseModel';
import type { PoolConnection } from 'mysql2/promise';

type propertyKey = string | number | symbol;

interface DatabaseRelationshipOptions<T extends Entity, E extends Entity> {
	model?: DatabaseModel<T>;
	externalModel: DatabaseModel<E>;
	property: string;

	localKey?: propertyKey;
	localForeignKey?: propertyKey;

	externalKey?: propertyKey;
	externalForeignKey?: propertyKey;

	readOnly?: boolean;
	autoload?: boolean;

	filters?: ModelFilters;
	order?: string;
}

export abstract class DatabaseRelationship<T extends Entity, E extends Entity> implements DatabaseRelationshipOptions<T,E> {
	// The main model
	model: DatabaseModel<T>;
	// The external model
	externalModel: DatabaseModel<E>;

	// The property on the main model the relationship will be stored within
	property: string;

	localKey: propertyKey;
	localForeignKey: propertyKey;

	externalKey: propertyKey;
	externalForeignKey: propertyKey;

	// Means the current relationship will only ever query data and never attempt to update it automatically
	readOnly: boolean;
	// Means the current relationship will always be retrieved when retrieving it's main model
	autoload: boolean;

	// Filters to apply when querying the relationship
	filters: ModelFilters;
	// Order clause to be used when querying the relationship
	order: string;

	protected constructor({
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
	}: DatabaseRelationshipOptions<T,E>) {
		this.model = model;
		this.externalModel = externalModel;

		this.property = property;

		this.localKey = localKey;
		this.localForeignKey = localForeignKey;

		this.externalKey = externalKey;
		this.externalForeignKey = externalForeignKey;

		this.readOnly = readOnly;
		this.autoload = autoload;

		this.filters = filters;
		this.order = order;
	}

	abstract selectSingle(item: T): Promise<any>;
	abstract selectMany(items: T[]): Promise<any>;

	async select(items: T|T[]): Promise<any> {
		return items instanceof Array ? this.selectMany(items) : this.selectSingle(items);
	}

	//async selectMany(objs) {}

	abstract save(
		obj: T,
		transaction?: PoolConnection
	): Promise<void>;

	setFilters(f) {
		this.filters = f;
		return this;
	}

	setOrder(o) {
		this.order = o;
		return this;
	}
}

interface DatabaseRelationshipManyToOneOptions<T extends Entity, E extends Entity>
	extends Omit<Omit<Omit<DatabaseRelationshipOptions<T, E>, 'readOnly'>, 'localKey'>, 'externalForeignKey'> {
	localForeignKey: keyof T;
	externalKey?: keyof E;
}

export class DatabaseRelationshipManyToOne<T extends Entity, E extends Entity> extends DatabaseRelationship<T, E> {
	constructor({
		model,
		externalModel,

		property,

		// The property that identifies the external model within the local model (e.g.: a Post's authorId)
		localForeignKey,

		// The property that identifies the external model within itself (e.g.: an Author's id)
		externalKey = 'id' as keyof E,

		autoload = false,

		filters = [],
		order = '',
	}: DatabaseRelationshipManyToOneOptions<T, E>) {
		super({
			model,
			externalModel,

			property,

			localForeignKey,
			externalKey,

			readOnly: true,
			autoload,

			filters,
			order,
		})
	}

	async query(items: T[]): Promise<E[]> {
		const ids = items.map(i => i[this.localForeignKey]).filter(v => v !== null);

		if (!ids.length) return [];

		const filters = [
			...this.filters,
			new DatabaseQueryCondition({
				column: this.externalKey as string,
				values: `(${ids.join(',')})`,
				bound: false,
				operator: 'IN'
			})
		];

		return this.externalModel.select({
			filters: filters,
			order: this.order
		});
	}

	async selectSingle(item: T): Promise<E> {
		const result = await this.query([item]);

		item[this.property] = result.length ? result[0] : null;

		return result[0];
	}

	async selectMany(items: T[]): Promise<E[]> {
		const results = await this.query(items);

		for (let item of items) {
			// @ts-ignore
			item[this.property] = results.find(r => r[this.externalKey] === item[this.localForeignKey]);
		}

		return results;
	}

	async save(obj: T, transaction: PoolConnection = null): Promise<void> {}
}

interface DatabaseRelationshipOneToManyOptions<T extends Entity, E extends Entity>
	extends Omit<Omit<DatabaseRelationshipOptions<T, E>, 'externalKey'>, 'externalForeignKey'> {
	localKey: keyof T;
	localForeignKey?: keyof E;
}

export class DatabaseRelationshipOneToMany<T extends Entity, E extends Entity> extends DatabaseRelationship<T, E> {
	constructor({
		model,
		externalModel,

		property,

		// The property that identifies the current model within itself (e.g.: an Author's id)
		localKey,
		// The property that identifies the current model within the external model (e.g.: a Book's authorId)
		localForeignKey,

		readOnly = true,
		autoload = false,

		filters = [],
		order = '',
	}: DatabaseRelationshipOneToManyOptions<T, E>) {
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

	async query(items: T[]): Promise<E[]> {
		const ids = items.map(i => i[this.localKey]).filter(v => v !== null);

		if (!ids.length) return [];

		const filters = [
			...this.filters,
			new DatabaseQueryCondition({
				column: this.localForeignKey as string,
				values: `(${ids.join(',')})`,
				bound: false,
				operator: 'IN'
			})
		];

		return this.externalModel.select({
			filters: filters,
			order: this.order
		});
	}

	async selectSingle(item: T): Promise<E[]> {
		const result = await this.query([item]);

		item[this.property] = result;

		return result;
	}

	async selectMany(items: T[]): Promise<E[]> {
		const results = await this.query(items);

		for (let item of items) {
			// @ts-ignore
			item[this.property] = results.filter(r => r[this.localForeignKey] === item[this.localKey]);
		}

		return results;
	}

	async save(obj: T, transaction: PoolConnection = null): Promise<void> {
		let id = obj[this.localKey];
		let data: E[] = obj[this.property];

		for (const item of data) {
			item[this.localForeignKey] = id as any;

			await this.externalModel.save(item, { transaction });
		}

		let list = await this.query([obj]);
		let deleted = list.filter(element => !data.find(x => this.externalModel.compareByPK(x, element)));

		for (const item of deleted) {
			await this.externalModel.deleteByModel(item, transaction);
		}
	}
}


interface DatabaseRelationshipManyToManyOptions<T extends Entity, E extends Entity, I extends Entity>
	extends DatabaseRelationshipOptions<T, E>
{
	intermediaryModel: DatabaseModel<I>;

	localKey?: keyof T;
	localForeignKey: keyof I;

	externalKey?: keyof E;
	externalForeignKey: keyof I;
}

export class DatabaseRelationshipManyToMany<T extends Entity, E extends Entity, I extends Entity>
	extends DatabaseRelationship<T, E>
	implements DatabaseRelationshipManyToManyOptions<T, E, I>
{
	// The intermediary model between both models that stores the relationship
	intermediaryModel: DatabaseModel<I>;

	constructor({
		model,
		externalModel,
		intermediaryModel,

		property,

		// The property that identifies the current model within itself (e.g.: a Author's id)
		localKey = 'id' as keyof T,
		// The property that identifies the current model within the relationship model (e.g.: a BookAuthors's authorId)
		localForeignKey,

		// The property that identifies the external model within itself (e.g.: a Book's id)
		externalKey = 'id' as keyof E,
		// The property that identifies the external model within the relationship model (e.g.: a BookAuthors's bookId)
		externalForeignKey,

		readOnly = true,
		autoload = false,

		filters = [],
		order = '',
	}: DatabaseRelationshipManyToManyOptions<T, E, I>) {
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

	async selectSingle(obj: T) {
		const id = obj[this.localKey];

		let filters: ModelFilters = [
			new DatabaseQueryCondition({
				column: this.localForeignKey as string,
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
				column: this.externalKey as string,
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

	async save(obj: T, transaction: PoolConnection = null) {
		const id = obj[this.localKey];
		const data = obj[this.property];

		let intermediaryData = data.map(d => {
			let obj = {};

			obj[this.localForeignKey as propertyKey] = id;
			obj[this.externalForeignKey as propertyKey] = d[this.externalKey];

			return obj;
		});

		let intermediaryItems:I[] = intermediaryData.map(d => new this.intermediaryModel.entity(d));

		let filters = [
			new DatabaseQueryCondition({
				column: this.localForeignKey as string,
				values: id
			})
		];

		await this.intermediaryModel.delete(filters, transaction);

		for (const item of intermediaryItems) {
			await this.intermediaryModel.save(item, { insert: true, transaction });
		}
	}
}

const Relationship = {
	ManyToOne: DatabaseRelationshipManyToOne,
	OneToMany: DatabaseRelationshipOneToMany,
	ManyToMany: DatabaseRelationshipManyToMany
}

export default Relationship;
