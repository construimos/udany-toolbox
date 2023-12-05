import { DatabaseQueryCondition } from './DatabaseQueryComponent';
import { Entity } from '../base';
import { DatabaseModel, ModelFilters } from './DatabaseModel';
import type { PoolConnection } from 'mysql2/promise';

interface DatabaseRelationshipOptions<T extends Entity, E extends Entity> {
	model?: DatabaseModel<T>;
	externalModel: DatabaseModel<E>;
	property: string;

	localKey?: string;
	localForeignKey?: string;

	externalKey?: string;
	externalForeignKey?: string;

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

	localKey: string;
	localForeignKey: string;

	externalKey: string;
	externalForeignKey: string;

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

	abstract select(obj: T): Promise<any>;

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
	extends Omit<Omit<Omit<DatabaseRelationshipOptions<T, E>, 'readOnly'>, 'localKey'>, 'externalForeignKey'> {}

export class DatabaseRelationshipManyToOne<T extends Entity, E extends Entity> extends DatabaseRelationship<T, E> {
	constructor({
		model,
		externalModel,

		property,

		// The property that identifies the external model within the local model (e.g.: a Post's authorId)
		localForeignKey,

		// The property that identifies the external model within itself (e.g.: an Author's id)
		externalKey = 'id',

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

	async query(obj): Promise<E> {
		const id = obj[this.localForeignKey];

		const filters = [
			...this.filters,
			new DatabaseQueryCondition({
				column: this.externalKey,
				values: id
			})
		];

		return this.externalModel.selectFirst({
			filters: filters,
			order: this.order
		});
	}

	async select(obj): Promise<E> {
		const result = await this.query(obj);

		obj[this.property] = result;

		return result;
	}

	async save(obj: T, transaction: PoolConnection = null): Promise<void> {}
}

interface DatabaseRelationshipOneToManyOptions<T extends Entity, E extends Entity>
	extends Omit<Omit<DatabaseRelationshipOptions<T, E>, 'externalKey'>, 'externalForeignKey'> {}

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

	async query(obj: T): Promise<E[]> {
		const id = obj[this.localKey];

		const filters = [
			...this.filters,
			new DatabaseQueryCondition({
				column: this.localForeignKey,
				values: id
			})
		];

		return this.externalModel.select({
			filters: filters,
			order: this.order
		});
	}

	async select(obj: T): Promise<E[]> {
		const result = await this.query(obj);

		obj[this.property] = result;

		return result;
	}

	async save(obj: T, transaction: PoolConnection = null): Promise<void> {
		let id = obj[this.localKey];
		let data: E[] = obj[this.property];

		for (const item of data) {
			item[this.localForeignKey] = id;

			await this.externalModel.save(item, { transaction });
		}

		let list = await this.query(obj);
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
		localKey = 'id',
		// The property that identifies the current model within the relationship model (e.g.: a BookAuthors's authorId)
		localForeignKey,

		// The property that identifies the external model within itself (e.g.: a Book's id)
		externalKey = 'id',
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

	async select(obj: T) {
		const id = obj[this.localKey];

		let filters: ModelFilters = [
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

	async save(obj: T, transaction: PoolConnection = null) {
		const id = obj[this.localKey];
		const data = obj[this.property];

		let intermediaryData = data.map(d => {
			let obj = {};

			obj[this.localForeignKey] = id;
			obj[this.externalForeignKey] = d[this.externalKey];

			return obj;
		});

		let intermediaryItems:I[] = intermediaryData.map(d => new this.intermediaryModel.entity(d));

		let filters = [
			new DatabaseQueryCondition({
				column: this.localForeignKey,
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
