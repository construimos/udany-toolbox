export class HasUniqueId {
	static counter:number = 0;
	__uid:string;

	getUId() {
		if (!this.__uid) {
			HasUniqueId.counter++;
			const now = Date.now();
			const rand = Math.randomInt(9999999).pad(7);
			this.__uid = `${now}_${HasUniqueId.counter}_${rand}`;
		}
		return this.__uid;
	}
}

export default HasUniqueId;
