import * as PIXI from 'pixi.js';

PIXI.settings.ROUND_PIXELS = true;

export class TileManager {
    #state;
    #animationPlayer;
    #ui;

    #tilesSprites = [];
    #tilesRowSize;
    #filledTilesSprites = [];
    #tileSize = 50;

    constructor(state, animationPlayer, ui) {
        this.#state = state;
        this.#animationPlayer = animationPlayer;
        this.#ui = ui;
    }

    start() {
        this.#hangAnimationPlayerHandlers();
        this.#hangStateHandlers();
        this.#ui.on('ready', () => {
            this.#ui.setClickHandler(this.#handleClick.bind(this));
        });
    }

    #handleClick({ x, y }) {
        console.log(x, y, y / this.#tileSize, x / this.#tileSize);
        this.#state.clickTile(
            Math.floor(y / this.#tileSize),
            Math.floor(x / this.#tileSize)
        );
    }

    #hangAnimationPlayerHandlers() {
        this.#animationPlayer.on(
            'tileBurn',
            ({ tile, x, y, tileSizeShift }) => {
                this.#burnTile(tile, x, y, tileSizeShift);
            }
        );
        this.#animationPlayer.on(
            'tileFall',
            ({ tile, x, y, tileFallShift }) => {
                this.#fallTile(tile, x, y, tileFallShift);
            }
        );
        this.#animationPlayer.on('tileFill', this.#fillTile.bind(this));
    }

    #hangStateHandlers() {
        this.#state.on('syncTiles', (tiles) => {
            this.#syncSprites(tiles);
        });
        this.#state.on('fillTiles', this.#prepareFilledTilesSprites.bind(this));
    }

    #syncSprites(tiles) {
        this.#removeAllSprites();
        this.#tilesRowSize = tiles[0].length;
        for (let i = 0; i !== tiles.length; i++) {
            for (let j = 0; j !== tiles[i].length; j++) {
                this.#tilesSprites.push(this.#makeSprite(tiles[i][j], i, j));
            }
        }
        this.#ui.addTileSprites(this.#tilesSprites);
    }

    #removeAllSprites() {
        this.#tilesSprites.forEach(this.#ui.removeTileSprite.bind(this.#ui));
        this.#filledTilesSprites.forEach(
            this.#ui.removeTileSprite.bind(this.#ui)
        );
        this.#tilesSprites = [];
        this.#filledTilesSprites = [];
    }

    #makeSprite(tile, x, y) {
        const sprite = new PIXI.Sprite(this.#ui.getTextureFor(tile));
        sprite.anchor.set(0.5);
        if (tile === 0) sprite.anchor.set(0.4, 0.45);
        const position = new PIXI.Point(
            this.#tileSize * (0.5 + y),
            this.#tileSize * (0.5 + x)
        );
        sprite.position.copyFrom(position);
        sprite.scale.set(this.#tileSize / 171);
        return sprite;
    }

    #burnTile(tile, x, y, tileSizeShift) {
        const sprite = this.#tilesSprites[x * this.#tilesRowSize + y];
        sprite.scale.set(tileSizeShift * (this.#tileSize / 171));
    }

    #fallTile(tile, x, y, tileFallShift) {
        const sprite = this.#tilesSprites[x * this.#tilesRowSize + y];
        sprite.position.y = (0.5 + x + tileFallShift) * this.#tileSize;
    }

    #fillTile(tileSizeShift) {
        this.#filledTilesSprites.forEach((sprite) => {
            sprite.scale.set(tileSizeShift * (this.#tileSize / 171));
        });
    }

    #prepareFilledTilesSprites({ tiles, filledTiles }) {
        filledTiles
            .sort((t1, t2) => t2.x - t1.x)
            .forEach(({ x, y }) => {
                const sprite = this.#makeSprite(tiles[x][y], x, y);
                sprite.scale.set(0);
                this.#filledTilesSprites.push(sprite);
            });
        this.#ui.addFilledTileSprites(this.#filledTilesSprites);
    }
}
