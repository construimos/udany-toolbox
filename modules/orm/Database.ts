import { ConnectionOptions, Connection, Pool } from 'mysql2/promise';
import * as mysql from 'mysql2/promise';
import { Emitter } from '../base';
import { queryFormat } from './queryFormat';

export class Database extends Emitter<{
	connected
}> {
	options: ConnectionOptions;
	connection: Pool;

	constructor(options: ConnectionOptions) {
		super();
		this.options = options;
		this.connection = null;
	}

	async connect() {
		this.connection = await mysql.createPool({
			queryFormat,
			...this.options
		});

		this.emit('connected');
	}
}

export default Database;
