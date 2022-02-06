import { ConnectionOptions, Connection } from 'mysql2/promise';
import * as mysql from 'mysql2/promise';
import Emitter from '../classes/Emitter';
import { queryFormat } from './queryFormat';

export class Database extends Emitter {
	options: ConnectionOptions;
	connection: Connection;

	constructor(options: ConnectionOptions) {
		super();
		this.options = options;
		this.connection = null;
	}

	async connect() {
		this.connection = await mysql.createConnection({
			queryFormat,
			...this.options
		});

		this.emit('connected');
	}
}
