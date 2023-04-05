import EventEmitter from 'events';

export class GameState extends EventEmitter {
    #rows;
    #cols;
    #colorsAmount;
    #minGroupSizeLimit;
    #pointsGoal;
    #movesLimit;
    #shufflesLimit;
    #shufflesAmount = 0;
    #moves = 0;
    #score = 0;
    #tiles = [];

    constructor({
        n,
        m,
        colorsAmount,
        minGroupSizeLimit,
        pointsGoal,
        movesLimit,
        shufflesLimit
    }) {
        super();
        this.#rows = n;
        this.#cols = m;
        this.#colorsAmount = colorsAmount;
        this.#minGroupSizeLimit = minGroupSizeLimit;
        this.#pointsGoal = pointsGoal;
        this.#movesLimit = movesLimit;
        this.#shufflesLimit = shufflesLimit;
    }

    static #sortGroupAscending(group) {
        return group.sort((cell1, cell2) => {
            if (cell2.col < cell1.col) return 1;
            else if (cell2.col === cell1.col && cell2.row < cell1.row) return 1;
            return -1;
        });
    }

    static #groupToColsGapData(group) {
        const colsGapData = {}; // {[colIdx]: [{start: *gap's first row*, end: *gap's last row*}]}
        for (let i = 0; i !== group.length; i++) {
            const { row, col } = group[i];
            if (!colsGapData[col]) {
                colsGapData[col] = [{ start: row, end: row }];
                continue;
            }
            const currentColGaps = colsGapData[col];
            const currentColLastGap = currentColGaps[currentColGaps.length - 1];
            if (row - 1 === currentColLastGap.end) {
                currentColLastGap.end = row;
                continue;
            }
            currentColGaps.push({ start: row, end: row });
        }
        return colsGapData;
    }

    static #calculateScore(burntAmount) {
        return burntAmount;
    }

    clickTile(row, col) {
        const group = this.#getGroup(row, col);
        if (group.length >= this.#minGroupSizeLimit) {
            this.#handleMove(group);
            this.#checkGameOver();
        } else if (!this.#hasPossibleMoves()) {
            if (this.#shufflesAmount < this.#shufflesLimit) {
                this.#shuffleTiles();
            } else {
                return this.emit('lose', this.#pointsGoal - this.#score);
            }
        } else {
            this.#handleNoMove();
        }
    }

    start() {
        this.#tiles = [];
        for (let i = 0; i !== this.#rows; i++) {
            this.#tiles.push([]);
            for (let j = 0; j !== this.#cols; j++) {
                this.#tiles[i].push(this.#randomColor());
            }
        }
        this.emit('syncTiles', this.#tiles);
        this.emit('statsChange', this.#score, this.#movesLimit - this.#moves);
    }

    reset() {
        this.#moves = 0;
        this.#score = 0;
        this.emit('statsChange', 0, 0);
        this.#shuffleTiles();
        this.#shufflesAmount = 0;
    }

    emitSyncTiles() {
        this.emit('syncTiles', this.#tiles);
    }

    #randomColor() {
        return Math.ceil(Math.random() * this.#colorsAmount);
    }

    #handleMove(group) {
        this.#moves++;
        this.#score += GameState.#calculateScore(group.length);
        this.emit('statsChange', this.#score, this.#movesLimit - this.#moves);
        group = GameState.#sortGroupAscending(group);
        const colsGapData = GameState.#groupToColsGapData(group);
        this.emit(
            'burnTiles',
            structuredClone({ tiles: this.#tiles, colsGapData })
        );
        this.emit(
            'fallTiles',
            structuredClone({ tiles: this.#tiles, colsGapData })
        );
        this.#burnTiles(group);
        this.#moveTilesDown(colsGapData);
        const filledTiles = this.#fillEmptyTiles(Object.keys(colsGapData));
        this.emit(
            'fillTiles',
            structuredClone({ tiles: this.#tiles, filledTiles })
        );
    }

    #checkGameOver() {
        if (this.#score >= this.#pointsGoal) {
            return this.emit('win', this.#score);
        }
        if (this.#moves >= this.#movesLimit) {
            return this.emit('lose', this.#pointsGoal - this.#score);
        }
    }

    #getGroup(row, col) {
        const targetColor = this.#tiles[row][col];
        const visited = new Set();
        const group = [];

        const stack = [{ row, col }];
        while (stack.length > 0) {
            const { row, col } = stack.pop();
            if (visited.has(`${row},${col}`)) continue;
            visited.add(`${row},${col}`);
            const color = this.#tiles[row][col];
            if (color !== targetColor) continue;
            group.push({ row, col });
            if (row > 0) stack.push({ row: row - 1, col });
            if (row < this.#rows - 1) stack.push({ row: row + 1, col });
            if (col > 0) stack.push({ row, col: col - 1 });
            if (col < this.#cols - 1) stack.push({ row, col: col + 1 });
        }

        return group;
    }

    #shuffleTiles() {
        this.#shufflesAmount++;
        const flattenedTiles = this.#tiles.flat();
        flattenedTiles.sort(() => (Math.random() > 0.5 ? 1 : -1));
        const shuffledTiles = [];
        let i = 0;
        while (i < flattenedTiles.length) {
            const row = flattenedTiles.slice(i, i + this.#cols);
            shuffledTiles.push(row);
            i += this.#cols;
        }
        this.#tiles = shuffledTiles;
    }

    #burnTiles(group) {
        for (let i = 0; i !== group.length; i++) {
            const { row, col } = group[i];
            this.#tiles[row][col] = 0;
        }
    }

    #moveTilesDown(colsGapData) {
        for (const col in colsGapData) {
            const colGaps = colsGapData[col];
            while (colGaps.length) {
                let { start, end } = colGaps.pop();
                const topLimit =
                    (colGaps[colGaps.length - 1] &&
                        colGaps[colGaps.length - 1].end + 1) ||
                    0;
                while (start > topLimit) {
                    this.#tiles[end][col] = this.#tiles[start - 1][col];
                    this.#tiles[start - 1][col] = 0;
                    start--;
                    end--;
                }
                if (topLimit !== 0)
                    colGaps[colGaps.length - 1].end += end - start + 1;
            }
        }
    }

    #fillEmptyTiles(cols) {
        const filledTiles = [];
        for (let j of cols) {
            j = +j;
            for (let i = 0; i !== this.#rows; i++) {
                if (this.#tiles[i][j] !== 0) break;
                this.#tiles[i][j] = this.#randomColor();
                filledTiles.push({ x: i, y: j });
            }
        }
        return filledTiles;
    }

    #hasPossibleMoves() {
        for (let i = 0; i !== this.#rows; i++) {
            for (let j = 0; j !== this.#cols; j++) {
                if (this.#getGroup(i, j).length >= this.#minGroupSizeLimit) {
                    return true;
                }
            }
        }
    }

    #handleNoMove() {}
}
