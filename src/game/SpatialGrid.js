// Uniform grid over [-size, size]^2 storing objects by their (x, z) centre.
export const CELL = 8;

export class SpatialGrid {
  constructor(size, cell = CELL) {
    this.cell = cell;
    this.size = size;
    this.n = Math.ceil((size * 2) / cell) + 2;
    this.cells = Array.from({ length: this.n * this.n }, () => []);
  }

  _c(v) {
    const i = Math.floor((v + this.size) / this.cell) + 1;
    return i < 0 ? 0 : i >= this.n ? this.n - 1 : i;
  }

  insert(o) {
    const k = this._c(o.z) * this.n + this._c(o.x);
    o.cellKey = k;
    this.cells[k].push(o);
  }

  /** Re-file a moved object; cheap no-op while it stays in the same cell. */
  move(o) {
    const k = this._c(o.z) * this.n + this._c(o.x);
    if (k === o.cellKey) return;
    this.remove(o);
    o.cellKey = k;
    this.cells[k].push(o);
  }

  remove(o) {
    const arr = this.cells[o.cellKey];
    if (!arr) return;
    const i = arr.indexOf(o);
    if (i >= 0) {
      arr[i] = arr[arr.length - 1];
      arr.pop();
    }
    o.cellKey = -1;
  }

  /** Pushes every object whose centre is within the square [x±r, z±r] into `out` (coarse; caller refines). */
  query(x, z, r, out) {
    const x0 = this._c(x - r), x1 = this._c(x + r);
    const z0 = this._c(z - r), z1 = this._c(z + r);
    for (let cz = z0; cz <= z1; cz++) {
      for (let cx = x0; cx <= x1; cx++) {
        const arr = this.cells[cz * this.n + cx];
        for (let i = 0; i < arr.length; i++) out.push(arr[i]);
      }
    }
    return out;
  }
}
