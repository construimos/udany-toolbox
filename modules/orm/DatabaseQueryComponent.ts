import {dbBacktick} from "./DatabaseModel";

export type ComparisonOperator = '=' | '!=' | '>=' | '<=' | '>' | '<' | 'LIKE' | 'IN';
export type LogicOperator = 'OR' | 'AND';


export abstract class DatabaseQueryComponent {
	abstract getClause(): string;
	abstract getParams(): Record<any, any>;
}

export class DatabaseQueryClause implements DatabaseQueryComponent {
	clauses: DatabaseQueryComponent[];
	mode: string;

	constructor(clauses: DatabaseQueryComponent[], mode:LogicOperator = "OR") {
		/** @type {} **/
		this.clauses = clauses || [];
		this.mode = mode;
	}

	getClause() {
		let clauses = this.clauses.map(c => `(${c.getClause()})`);
		return clauses.join(` ${this.mode} `);
	}

	getParams() {
		let params = {};
		this.clauses.forEach(c => Object.assign(params, c.getParams()));

		return params;
	}
}

export interface DatabaseQueryConditionOptions {
	column: string;
	values: any | Record<any, any>;
	operator?: ComparisonOperator;
	mode?: LogicOperator;
	boundParameter?: string;
	bound?: boolean;
	escapeColumn?: boolean;
}

export class DatabaseQueryCondition implements DatabaseQueryConditionOptions, DatabaseQueryComponent {
	column: string;
	values: any | Record<any, any>;
	operator: ComparisonOperator;
	mode: LogicOperator;
	boundParameter: string;
	bound: boolean;
	escapeColumn: boolean;

	constructor({
		column,
		values,
		operator = "=",
		mode = "OR",
		bound = true,
		boundParameter = '',
		escapeColumn = true
	}:DatabaseQueryConditionOptions) {
		this.column = column;
		this.values = Array.isArray(values) ? values : [values];
		this.operator = operator;
		this.mode = mode;
		this.bound = bound;
		this.boundParameter = boundParameter;
		this.escapeColumn = escapeColumn;
	}

	getParam(i) {
		return (this.boundParameter || this.column) + i;
	}

	getClause(): string {
		let clauses = [];

		for (let i = 0; i < this.values.length; i++) {
			let value;

			if (this.bound) {
				value = ':' + this.getParam(i);
			} else {
				value = this.values[i];
			}

			const column = this.escapeColumn ? dbBacktick(this.column) : this.column;

			clauses.push(`${column} ${this.operator} ${value}`);
		}

		return clauses.join(` ${this.mode} `)
	}

	getParams(): Record<any, any> {
		let params = {};

		for (let i = 0; i < this.values.length; i++) {
			const boundParameter = this.getParam(i);

			params[boundParameter] = this.values[i];
		}

		return params;
	}
}
