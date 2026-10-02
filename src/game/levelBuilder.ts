/** Paints an ASCII tile grid; `toRows()` output is fed to `parseLevel`. */
export class LevelBuilder {
  private grid: string[][];

  constructor(
    readonly cols: number,
    readonly rows = 12,
  ) {
    this.grid = Array.from({ length: rows }, () => Array<string>(cols).fill('.'));
  }

  put(col: number, row: number, ch: string): this {
    if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) this.grid[row][col] = ch;
    return this;
  }

  rect(col: number, row: number, w: number, h: number, ch: string): this {
    for (let r = row; r < row + h; r++) for (let c = col; c < col + w; c++) this.put(c, r, ch);
    return this;
  }

  toRows(trimToCols?: number): string[] {
    return this.grid.map((r) => r.join('').slice(0, trimToCols ?? this.cols));
  }
}
