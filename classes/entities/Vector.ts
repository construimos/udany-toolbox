import { Entity } from '../Entity';

declare type Coordinates = [number, number, number?];
declare type VectorData = {x: number, y: number, z?: number};

export class Vector extends Entity {
	@Entity.Field.Float()
	x: number;

	@Entity.Field.Float()
	y: number;

	@Entity.Field.Float()
	z?: number;

    add(...values: Coordinates | VectorData[] | Vector[]): this {
        if (
        	values.length === 1 &&
	        values[0].hasOwnProperty('x') &&
	        values[0].hasOwnProperty('y')
        ) {
        	let vectors = values as Vector[];

			vectors.forEach(v => this.add(v.x, v.y, v.z));
        } else {
			let floats = values as Coordinates;

            this.x += floats[0];
	        this.y += floats[1];
	        if (values[2] !== undefined) this.z += floats[2];
        }

        return this;
    }

	scale(...ratios: number[] | Vector[]): this {
	    if (
		    ratios.length === 1 &&
		    ratios[0].hasOwnProperty('x') &&
		    ratios[0].hasOwnProperty('y')
	    ) {
			let vectors = ratios as Vector[];

			vectors.forEach(v => this.scale(v.x, v.y, v.z));
	    } else {
			let floats = ratios as number[];

			if (floats.length === 1) {
				this.x *= floats[0];
				this.y *= floats[0];
				this.z *= floats[0];
			} else if (floats.length > 1) {
				this.x *= floats[0];
				this.y *= floats[1];
				if (floats[2] !== undefined) this.z *= floats[2];
			}
		}

        return this;
    }

	transform(matrix: [Coordinates, Coordinates, Coordinates?]): Vector {
		if (matrix[0].length === 2) {
			matrix[0][2] = 0;
			matrix[1][2] = 0;
			matrix[2][2] = 1;
		}

		return new Vector().$fill([
			(this.x * matrix[0][0]) + (this.y * matrix[0][1]) + (this.z * matrix[0][2]),
			(this.x * matrix[1][0]) + (this.y * matrix[1][1]) + (this.z * matrix[1][2]),
			(this.x * matrix[2][0]) + (this.y * matrix[2][1]) + (this.z * matrix[2][2]),
		]);
    }

	rotateX(angle: number): Vector {
		return this.transform([
			[1, 0, 0],
			[0, Math.cos(angle), -Math.sin(angle)],
			[0, Math.sin(angle), Math.cos(angle)],
		]);
	}

	rotateY(angle: number): Vector {
		return this.transform([
			[Math.cos(angle), 0, Math.sin(angle)],
			[0, 1, 0],
			[-Math.sin(angle), 0, Math.cos(angle)],
		]);
	}

	rotateZ(angle: number): Vector {
		return this.transform([
			[Math.cos(angle), -Math.sin(angle), 0],
			[Math.sin(angle), Math.cos(angle), 0],
			[0, 0, 1],
		]);
	}

    set(a): this {
		return this.$fill(a);
    }

	$serialize(safeOnly = false, include = []) {
        return [this.x, this.y, this.z];
    }

	$fill(a: Coordinates | VectorData | any): this {
        if (a.hasOwnProperty('x')) {
            this.x = a.x;
	        this.y = a.y;
	        this.z = a.z !== undefined ? a.z : 0;
        } else {
            this.x = a[0];
            this.y = a[1];
	        this.z = a[2] !== undefined ? a[2] : 0;
        }

        return this;
    }
}

Vector.Register();

export default Vector;
