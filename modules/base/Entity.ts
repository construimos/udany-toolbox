import Emitter from './Emitter';
import { Constructor } from '../../interfaces';

type Serialize<I, O> = (x: O, safeOnly?: boolean) => I;
type Deserialize<I, O> = (x: I) => O | null;
type Default<O> = (() => O) | O | null;

interface FieldOptions<I, O> {
	name?: string;
	key?: boolean;

	serialize?: Serialize<I, O>;
	deserialize?: Deserialize<I, O>;

	serializable?: boolean;
	nullable?: boolean;
	watch?: boolean;
	safe?: boolean;

	defaultValue?: Default<O>;
}

class BaseField<I, O> implements FieldOptions<I, O> {
	name: string;
	key: boolean;

	serialize: Serialize<I, O>;
	deserialize: Deserialize<I, O>;

	serializable: boolean;
	nullable: boolean;
	watch: boolean;
	safe: boolean;

	defaultValue: Default<O>;

	privateKey: string = '';

	constructor(o: FieldOptions<I, O>) {
		this.name = o.name;
		this.key = o.key || false;

		this.serialize = o.serialize || ((value: any) => value);
		this.deserialize = o.deserialize || ((value: any) => value);

		this.serializable = o.hasOwnProperty('serializable') ? !!o.serializable : true;
		this.nullable = o.hasOwnProperty('nullable') ? !!o.nullable : false;
		this.watch = o.hasOwnProperty('watch') ? !!o.watch : false;
		this.safe = o.hasOwnProperty('safe') ? !!o.safe : true;

		this.defaultValue = o.defaultValue || null;
	}

	define(target: Entity) {
		let descriptor: PropertyDescriptor = Object.getOwnPropertyDescriptor(target, this.name) || {
			configurable: true,
			enumerable: true,
		};

		if (this.watch) {
			this.privateKey = '__' + this.name;

			Object.defineProperty(target, this.privateKey, {
				configurable: true,
				enumerable: false,
				writable: true
			});

			descriptor.get = () => {
				target.emit('get', [this]);

				return target[this.privateKey];
			}

			descriptor.set = (value: any) => {
				let old = target[this.privateKey];
				target[this.privateKey] = value;

				target.emit('set', [this, value, old]);
			}
		} else {
			descriptor.value = null;
			descriptor.writable = true;
		}

		if (descriptor && target[this.name] === undefined) {
			Object.defineProperty(target, this.name, descriptor);
		}
	}

	set(target: any, value: I) {
		if (value === null && !this.nullable){
			target[this.name] = this.default;
		} else {
			target[this.name] = this.deserialize(value);
		}
	}

	get(target:Entity, safeOnly?: boolean): I {
		if (target[this.name] === null && !this.nullable){
			return this.serialize(this.default, safeOnly);
		}
		return this.serialize(target[this.name], safeOnly);
	}

	get default(): O {
		if (this.defaultValue instanceof Function) {
			return this.defaultValue();
		} else {
			return this.defaultValue;
		}
	}

	compare(a:Entity, b:Entity) {
		if (this.get(a) < this.get(b)) {
			return -1;
		}

		if (this.get(a) > this.get(b)) {
			return 1;
		}

		return 0;
	}

	equals(a:Entity, b:Entity) {
		return this.get(a) === this.get(b);
	}

	delta(from: Entity, to: Entity): Object {
		return this.get(to);
	}

	applyDelta(target: Entity, delta: Object) {
		return this.set(target, delta as I);
	}
}

type StringFieldOptions = FieldOptions<string, string>;
class StringField extends BaseField<string, string> {
	constructor(o: StringFieldOptions) {
		super(o);

		this.serialize = o.serialize || ((value: any) => value ? value.toString() : '');
		this.deserialize = o.deserialize || ((value: any) => value.toString());
	}
}

type IntegerFieldOptions = FieldOptions<number, number> & { radix?: number };
class IntegerField extends BaseField<number, number> {
	radix: number = 10;
	constructor(o: IntegerFieldOptions) {
		super(o);

		this.radix = o.radix || 10;

		this.serialize = o.serialize || ((value: any) => {
			let parsed = parseInt(value, this.radix);

			return isNaN(parsed) ? (this.nullable ? null : this.default) : parsed;
		});

		this.deserialize = o.deserialize || ((value: any) => {
			let parsed = parseInt(value, this.radix);

			return isNaN(parsed) ? (this.nullable ? null : this.default) : parsed;
		});
	}
}

type FloatFieldOptions = FieldOptions<number, number>;
class FloatField extends BaseField<number, number> {
	constructor(o: FloatFieldOptions) {
		super(o);

		this.serialize = o.serialize || ((value: any) => {
			let parsed = parseFloat(value);

			return isNaN(parsed) ? (this.nullable ? null : this.default) : parsed;
		});

		this.deserialize = o.deserialize || ((value: any) => {
			let parsed = parseFloat(value);

			return isNaN(parsed) ? (this.nullable ? null : this.default) : parsed;
		});
	}
}

type BooleanFieldOptions = FieldOptions<boolean, boolean>;
class BooleanField extends BaseField<boolean, boolean> {
	constructor(o: BooleanFieldOptions) {
		super(o);

		this.serialize = o.serialize || ((value: any) => {
			if (this.nullable) {
				if (value === null) return null;
			}

			return !!value;
		});

		this.deserialize = o.deserialize || ((value: any) => {
			if (value === null || value === undefined) {
				if (this.nullable) {
					return null;
				} else {
					return !!this.default;
				}
			}

			return !!value;
		});
	}
}

type DateFieldOptions = FieldOptions<number, Date> & {
	absolute?: boolean
};
class DateField extends BaseField<number, Date> {
	absolute: boolean;

	constructor(o: DateFieldOptions) {
		super(o);

		this.absolute = !!o.absolute;

		this.serialize = o.serialize || ((value: any) => {
			if (value instanceof Date) {
				if (this.absolute) {
					let dt = new Date(value.getTime());
					dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());

					return Math.floor(dt.getTime() / 1000);
				} else {
					return Math.floor(value.getTime() / 1000);
				}
			} else {
				return null;
			}
		});

		this.deserialize = o.deserialize || ((value: any) => {
			if (value instanceof Date) {
				return value
			} else {
				if (typeof value === 'string') {
					let intval = Date.parse(value);

					if (!isNaN(intval)) {
						value = intval;
					} else {
						value = parseInt(value, 10) * 1000;
					}
				} else {
					value *= 1000;
				}

				if (value !== null && !isNaN(value)) {
					let dt = new Date(value);

					if (this.absolute) {
						dt.setMinutes(dt.getMinutes() + dt.getTimezoneOffset());
					}

					return dt;
				}
			}

			return null;
		});
	}
}


type JsonFieldOptions = FieldOptions<string, Object>;
class JsonField extends BaseField<string, Object> {
	constructor(o: JsonFieldOptions) {
		super(o);

		this.serialize = o.serialize || ((value: Object) => {
			return JSON.stringify(value);
		});

		this.deserialize = o.deserialize || ((value: string) => {
			return JSON.parse(value);
		});
	}
}


type BaseEntityFieldOptions<E extends Entity, I, O> = FieldOptions<I, O> & { class?: Constructor<E> };
class BaseEntityField<E extends Entity, I, O> extends BaseField<I, O> {
	class: Constructor<E>;

	fromPlainObject(plain) {
		let obj;

		if (this.class) {
			if (plain instanceof this.class) {
				obj = plain;
			} else {
				obj = plain ? new this.class(plain) : null;
			}
		} else {
			if (plain instanceof Entity) {
				obj = plain;
			} else {
				obj = plain ? Entity.FromObject(plain) : null;
			}
		}

		if (this.class && !(obj instanceof this.class)) {
			console.error(`Unexpected class for the value of ${this.name}, expected ${this.class.name}`, obj);
			obj = null;
		}

		return obj? obj.$fill(plain) : null;
	}
}

type EntityFieldOptions<E extends Entity> = BaseEntityFieldOptions<E, Object, E>;
class EntityField<E extends Entity> extends BaseEntityField<E, Object, E> {
	constructor(o: EntityFieldOptions<E>) {
		super(o);
		this.class = o.class;

		this.serialize = o.serialize || ((value: E, safeOnly= false) => value ? value.$serialize(safeOnly) : value);

		this.deserialize = o.deserialize || ((value: Object) => this.fromPlainObject(value));
	}

	equals(a, b) {
		if (!a[this.name] || !b[this.name]) return a[this.name] === b[this.name];

		return (a[this.name] as E).$equalsDeep(b[this.name]);
	}

	delta(from, to) {
		let fromV: E = from[this.name];
		let toV: E = to[this.name];

		return fromV ? fromV.$delta(toV) : toV.$serialize();
	}

	applyDelta(from, delta) {
		if (from[this.name]) {
			from[this.name].$applyDelta(delta);
		} else {
			this.set(from, delta);
		}
	}
}

type EntityListFieldOptions<E extends Entity> = BaseEntityFieldOptions<E,Object[], E[]>;
class EntityListField<E extends Entity> extends BaseEntityField<E, Object[], E[]> {
	constructor(o: EntityListFieldOptions<E>) {
		super(o);
		this.class = o.class;

		this.serialize = o.serialize || ((value: E[], safeOnly= false) => value.map(v => v.$serialize(safeOnly)));

		this.deserialize = o.deserialize || ((value: Object[]) => value.map(v => this.fromPlainObject(v)));
	}

	equals(a, b) {
		let aV: Entity[] = a[this.name];
		let bV: Entity[] = b[this.name];

		if (aV.length !== bV.length) return false;

		for (let i = 0; i < aV.length; i++) {
			let aI = aV[i];
			let bI = bV[i];

			if (!aI.$equalsDeep(bI)) {
				return false;
			}
		}

		return true;
	}

	delta(from, to) {
		let fromV: Entity[] = from[this.name];
		let toV: Entity[] = to[this.name];

		// Single letter variables were used to minimize delta serialized length
		let delta = {
			// Length
			l: toV.length,
			// Change list
			c: []
		};

		for (let i = 0; i < toV.length; i++) {
			let item = fromV[i];
			let newItem = toV[i];

			if (i >= fromV.length) {
				delta.c.push([i, newItem.$serialize()])
			} else if (!item.$equalsDeep(newItem)) {
				delta.c.push([i, item.$delta(newItem)])
			}
		}

		return delta;
	}

	applyDelta(from, delta) {
		let fromV: Entity[] = from[this.name].slice(0, delta.l);

		for (let change of delta.c) {
			let [idx, val] = change;

			if (idx < fromV.length && fromV[idx]) {
				fromV[idx].$applyDelta(val);
			} else {
				if (this.class) {
					val = new this.class(val);
				} else {
					val = Entity.FromObject(val);
				}

				fromV[idx] = val;
			}
		}

		from[this.name] = fromV;
	}
}

const getFieldDecorator = (field: BaseField<any, any>) => (target: Entity, property: string) => {
	if (!field.name) field.name = property;

	let fields = Entity.GetOwnFields(target);
	fields.push(field);
};


export class Entity
	extends	Emitter<{
		fill,
		get: [BaseField<any, any>],
		set: [BaseField<any, any>, any, any]
	}>
{
	static __class: string = '';
	declare _fields: BaseField<any, any>[];
	declare static _fieldCache: BaseField<any, any>[];
	static namespace: string;

	get $class() {
		return (this.constructor as typeof Entity).class;
	}

	get $fields(): BaseField<any, any>[] {
		return Entity.GetFields(this);
	}

	$field(name: string): BaseField<any, any> {
		return this.$fields.find(f => f.name === name);
	}

	$define() {
		for (let field of this.$fields) {
			field.define(this);
		}
	}

	$fill(a: any): this {
		if (!a) a = [];
		if (a instanceof Entity) a = a.$serialize();

		this.$define();

		for (let field of this.$fields) {
			let name = field.name;

			if (a.hasOwnProperty(name) || !this.hasOwnProperty(name)) {
				let val = a[name];
				if (typeof val === 'undefined') val = null;

				field.set(this, val);
			}
		}

		this.emit('fill');

		return this;
	}

	$serialize(safeOnly = false, include = []) {
		safeOnly = !!safeOnly;

		let result = {};

		for (let field of this.$fields) {
			if (!field.serializable) continue;
			if (include.length && include.indexOf(field.name) === -1) continue;

			if (!safeOnly || field.safe) {
				result[field.name] = field.get(this, safeOnly);
			}
		}

		result['__class'] = this.$class;

		return result;
	}

	toJSON() {
		return this.$serialize();
	}

	static get class() {
		if (!this.__class) {
			if (this.namespace) {
				this.__class = `${this.namespace}.${this.name}`;
			} else {
				this.__class = `${this.name}`;
			}
		}

		return this.__class;
	}

	static GetFields(target: Entity): BaseField<any, any>[] {
		let constructor = target.constructor as any;

		if (!constructor.hasOwnProperty('_fieldCache')) {
			let fields: BaseField<any, any>[] = [];

			let focus = (target as any).__proto__;
			while (focus) {
				if (focus._fields) {
					let nonSpecifiedFields = focus._fields.filter(field => {
						return !fields.find(higherField => higherField.name === field.name)
					});

					fields.splice(0, 0, ...nonSpecifiedFields);
				}

				focus = focus.__proto__;
			}

			Object.defineProperty(constructor, '_fieldCache', {
				enumerable: false,
				value: fields
			});
		}

		return constructor._fieldCache;
	}

	static GetOwnFields(target: Entity): BaseField<any, any>[] {
		if (!target.hasOwnProperty('_fields')) {
			Object.defineProperty(target, '_fields', {
				value: [],
				enumerable: false
			});
		}

		return (target as any)._fields;
	}

	static Field = {
		Any: (o: FieldOptions<any, any> = {}) => getFieldDecorator(new BaseField(o)),
		String: (o: StringFieldOptions = {}) => getFieldDecorator(new StringField(o)),
		Integer: (o: IntegerFieldOptions = {}) => getFieldDecorator(new IntegerField(o)),
		Float: (o: FloatFieldOptions = {}) => getFieldDecorator(new FloatField(o)),
		Boolean: (o: BooleanFieldOptions = {}) => getFieldDecorator(new BooleanField(o)),
		Date: (o: DateFieldOptions = {}) => getFieldDecorator(new DateField(o)),
		Json: (o: JsonFieldOptions = {}) => getFieldDecorator(new JsonField(o)),
		Entity: <E extends Entity>(o: EntityFieldOptions<E> = {}) => getFieldDecorator(new EntityField(o)),
		EntityList: <E extends Entity>(o: EntityListFieldOptions<E> = {}) => getFieldDecorator(new EntityListField(o)),
	};

	$clone(): this {
		let data = JSON.parse(JSON.stringify(this.$serialize()));
		return (this.constructor as typeof Entity).new(data) as this;
	}

	$equals(obj: this): boolean {
		let keys = this.$fields.map(k => k.name);

		return obj.$serialize(false, keys) === this.$serialize(false, keys);
	}

	$equalsDeep(obj) {
		if (!obj) return false;

		for (let field of this.$fields) {
			if (!field.equals(this, obj)) return false;
		}

		return true;
	}

	$delta(to) {
		let delta = {};

		for (let field of this.$fields) {
			if (!field.equals(this, to)) {
				delta[field.name] = field.delta(this, to);
			}
		}

		return delta;
	}

	$applyDelta(delta) {
		for (let field of this.$fields) {
			if (delta.hasOwnProperty(field.name)) {
				field.applyDelta(this, delta[field.name]);
			}
		}
	}

	static Map = {
		map: {},
		fromName: function (name) {
			return this.map[name];
		},
		register: function (fn, name) {
			if (!name) name = fn.name;
			if (fn.prototype.namespace) {
				name = `${fn.prototype.namespace}.${name}`;
			}

			fn.__class = name;
			this.map[name] = fn;
		}
	};

	static Register(name = '') {
		Entity.Map.register(this, this.class);
	}

	static new<T extends Entity>(this: Constructor<T>, a): T {
		return (new this()).$fill(a);
	}

	static FromObject(a) {
		if (!a) {
			return null;
		}

		if (!a.__class) {
			throw 'Object doesn\'t describe it\'s class, make sure it contains a __class property';
		}

		let C = this.Map.fromName(a.__class);

		if (!(C instanceof Function)) {
			throw 'Couldn\'t locate class within current scope, make sure the script defining the class: ' + a.__class;
		}

		return (new C()).$fill(a);
	}

	static FromArray(array, entity?) {
		let r = [];
		for (let i in array) {
			if (array.hasOwnProperty(i)) {
				if (entity) {
					r[i] = new entity().$fill(array[i]);
				} else {
					r[i] = Entity.FromObject(array[i]);
				}
			}
		}

		return r;
	}
}

export class PolymorphicEntity extends Entity {
	static typeKey: string = 'type';
	static classMap: Record<string, Constructor<Entity>>;

	$fill<E extends this>(a: any): E {
		const $class = <typeof PolymorphicEntity>this.constructor;

		if (!$class.classMap) {
			throw `Failed to construct Polymorphic Class ${ this.constructor.name } because no class map was defined`;
		}

		if (!a[$class.typeKey]) {
			throw `Failed to construct Polymorphic Class ${ this.constructor.name } because of missing key "${ $class.typeKey }"`;
		}

		const $finalClass = <Constructor<E>> $class.classMap[a[$class.typeKey]];

		if (!$finalClass) {
			throw `Failed to construct Polymorphic Class ${this.constructor.name} because none was found with key "${a[$class.typeKey]}"`;
		}

		return new $finalClass().$fill(a);
	}
}

/// Attributes

// /// == EntityMap
// export class EntityMapEntityAttribute extends EntityEntityAttribute {
// 	Get(obj, safeOnly) {
// 		let map = obj[this.name];
// 		if (!map) map = {};
//
// 		let r = Object.map(map, x => x.Serialize(!!safeOnly));
//
// 		return this.encodeAsJson ? JSON.stringify(r) : r;
// 	}
//
// 	Set(obj, val) {
// 		let map = typeof val === 'string' ? JSON.parse(val) : val;
// 		if (!map) map = {};
//
// 		map = Object.map(map, x => {
// 			if (this.defaultEntity) {
// 				return new this.defaultEntity(x);
// 			} else {
// 				return Entity.FromPlainObject(x);
// 			}
// 		});
//
// 		obj[this.name] = map;
// 	}
// }
//
// /// == Date
// export class DateEntityAttribute extends ObjectEntityAttribute {
// 	constructor(name, unix, absolute) {
// 		super(name);
// 		this.unix = !!unix;
// 		this.absolute = !!absolute;
// 	}
//
// 	Get(obj) {
// 		if (obj[this.name] instanceof Date) {
// 			if (!this.unix) return obj[this.name];
//
// 			if (this.absolute) {
//
// 				let dt = new Date(obj[this.name].getTime());
// 				dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
//
// 				return Math.floor(dt.getTime() / 1000);
//
// 			} else {
// 				return Math.floor(obj[this.name].getTime() / 1000);
// 			}
// 		} else {
// 			return null;
// 		}
// 	}
//
// 	Set(obj, val) {
// 		if (val instanceof Date) {
// 			obj[this.name] = val;
// 		} else {
// 			if (typeof val === 'string') {
// 				let intval = Date.parse(val);
// 				if (!isNaN(intval)) {
// 					val = intval;
// 				} else {
// 					val = parseInt(val, 10) * 1000;
// 				}
// 			} else {
// 				val *= 1000;
// 			}
//
// 			if (val !== null && !isNaN(val)) {
// 				let dt = new Date(val);
//
// 				if (this.absolute) {
// 					dt.setMinutes(dt.getMinutes() + dt.getTimezoneOffset());
// 				}
//
// 				obj[this.name] = dt;
// 			} else {
// 				obj[this.name] = null;
// 			}
// 		}
// 	}
// }
//
// /// == Custom
// export class CustomEntityAttribute extends ObjectEntityAttribute {
// 	constructor(name, type, get, set) {
// 		super(name);
// 		this.type = type;
// 		this.getFn = get;
// 		this.setFn = set;
// 	}
//
// 	Get(obj) {
// 		return this.getFn(obj);
// 	}
//
// 	Set(obj, val) {
// 		if (this.setFn) {
// 			this.setFn(obj, val);
// 		}
// 	}
// }
//
// /// == Enum
// export class EnumEntityAttribute extends ObjectEntityAttribute {
// 	/**
// 	 * @param name
// 	 * @param {Enum} enumObj
// 	 * @param key
// 	 * @constructor
// 	 */
// 	constructor(name, enumObj, key = 'value') {
// 		super(name);
// 		this.name = name;
// 		this.enum = enumObj;
// 		this.key = key;
// 	}
//
// 	default(val) {
// 		return this._setOrReturnKey('_default', val);
// 	}
//
// 	Get(obj) {
// 		let val = obj[this.name];
//
// 		if (!val) {
// 			val = this.default();
// 		}
//
// 		if (val && (val.hasOwnProperty(this.key) || val.constructor.prototype.hasOwnProperty(this.key))) {
// 			return val[this.key];
// 		}
//
// 		return null;
// 	}
//
// 	Set(obj, val) {
// 		val = this.enum.getByProperty(this.key, val);
//
// 		if (!val) val = this.default();
//
// 		obj[this.name] = val;
// 	}
// }
//
// /// == EnumList
// export class EnumListEntityAttribute extends ObjectEntityAttribute {
// 	/**
// 	 * @param name
// 	 * @param {Enum} enumObj
// 	 * @param key
// 	 * @constructor
// 	 */
// 	constructor(name, enumObj, key = 'value') {
// 		super(name);
// 		this.name = name;
// 		this.enum = enumObj;
// 		this.key = key;
// 		this._unique = false;
// 	}
//
// 	default(val) {
// 		return this._setOrReturnKey('_default', val);
// 	}
//
// 	unique(val) {
// 		return this._setOrReturnKey('_unique', val);
// 	}
//
// 	Get(obj) {
// 		let val = obj[this.name];
//
// 		if (!val)  val = this.default();
// 		if (!val) val = [];
// 		let r = val.map(x => x[this.key]);
//
// 		return this.unique() ? r.dedupe() : r;
// 	}
//
// 	Set(obj, val) {
// 		if (!val) val = this.default();
// 		if (!val) val = [];
//
// 		obj[this.name] = val.map(x => this.enum.getByProperty(this.key, x));
//
// 		if (this.unique()) obj[this.name].unique(true);
// 	}
// }
//
// /// == Flags
// export class FlagsEntityAttribute extends ObjectEntityAttribute {
// 	/**
// 	 * @param name
// 	 * @param {Enum} enumObj
// 	 * @param key
// 	 * @constructor
// 	 */
// 	constructor(name, enumObj, key = 'value') {
// 		super(name);
// 		this.name = name;
// 		this.enum = enumObj;
// 		this.key = key;
// 		this.default = null;
// 	}
//
// 	Get(obj) {
// 		let val = obj[this.name];
//
// 		if (val instanceof Array) {
// 			return val.reduce((v, item) => v | item[this.key], 0);
// 		}
//
// 		return 0;
// 	}
//
// 	Set(obj, val) {
// 		obj[this.name] = this.enum.listByProperty((x) => x[this.key] & val);
// 	}
// }
