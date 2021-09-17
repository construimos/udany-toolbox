import mysql from 'mysql2/promise';
import Emitter from '../classes/Emitter.js';
import { queryFormat } from './queryFormat.js';

export class Database extends Emitter {
	/**
	 * @param {mysql.ConnectionOptions} options
	 */
	constructor(options) {
		super();
		this.options = options;

		/** @type {mysql.Connection} **/
		this.connection = null;
	}

	async connect() {
		this.connection = await mysql.createConnection({
			...this.options,
			queryFormat
		});

		this.emit('connected');
	}
}
