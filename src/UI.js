import EventEmitter from 'events';
import { Container, Point, Texture, Sprite, Text, BlurFilter } from 'pixi.js';

export class UI extends EventEmitter {
    #texturesLoader;
    #state;
    #animationPlayer;

    #tilesTextures;
    #stage;

    #gameOverContainer;
    #gameOverLabel;
    #gameContainer;
    #tilesContainer;
    #scoreLabel;
    #stepsLabel;

    constructor(stageRoot, texturesLoader, state, animationPlayer) {
        super();
        this.#texturesLoader = texturesLoader;
        this.#state = state;
        this.#animationPlayer = animationPlayer;

        this.#stage = stageRoot;
        this.#gameContainer = new Container();
        this.#stage.addChild(this.#gameContainer);
    }

    start() {
        const bodyContainer = new Container();
        bodyContainer.position.set(140, 70);
        bodyContainer.addChild(this.#makeStatsContainer());
        this.#makeTilesContainer(() => {
            bodyContainer.addChild(this.#tilesContainer);
            this.#state.emitSyncTiles();
            this.emit('ready');
        });
        this.#gameContainer.addChild(bodyContainer);
        this.#gameOverContainer = this.#makeGameOverContainer();
        this.#stage.addChild(this.#gameOverContainer);
        this.#animationPlayer.on('tileBurn', () => {
            this.#tilesContainer.interactive = false;
        });
        this.#animationPlayer.on('animationsComplete', () => {
            this.#tilesContainer.interactive = true;
        });
        this.#state.on('statsChange', this.#setStats.bind(this));
        this.#state.on('win', this.#showGameOver.bind(this, true));
        this.#state.on('lose', this.#showGameOver.bind(this, false));
    }

    setClickHandler(handler) {
        this.#tilesContainer.on('pointerdown', (event) => {
            handler(this.#tilesContainer.toLocal(event.data.global));
        });
    }

    #setStats(score, steps) {
        this.#scoreLabel.text = score;
        this.#stepsLabel.text = steps;
    }

    getTextureFor(tile) {
        return this.#tilesTextures[tile];
    }

    addTileSprites(sprites) {
        sprites.forEach((sprite) => this.#tilesContainer.addChild(sprite));
        this.#tilesContainer.children.reverse();
    }

    addFilledTileSprites(sprites) {
        sprites.forEach((sprite) => this.#tilesContainer.addChild(sprite));
    }

    removeTileSprite(sprite) {
        this.#tilesContainer.removeChild(sprite);
    }

    #makeTilesContainer(callback) {
        this.#tilesContainer = new Container();
        this.#tilesContainer.interactive = true;
        const bombTexture = this.#texturesLoader.loadBombTexture();
        this.#texturesLoader.on('loadedTilesTextures', (textures) => {
            this.#tilesTextures = [bombTexture, ...textures];
            callback();
        });
        this.#texturesLoader.loadTilesTextures();
        return this.#tilesContainer;
    }

    #makeStatsContainer() {
        const statsTexture = this.#texturesLoader.loadStatsTexture();

        const statsPosition = new Point(600, 100);
        const statsStepsPadding = new Point(166, 100);
        const statsScorePadding = new Point(166, 250);

        const container = new Container();
        container.position.copyFrom(statsPosition);

        const statsSprite = new Sprite(statsTexture);
        statsSprite.scale.set(0.3);
        container.addChild(statsSprite);

        this.#scoreLabel = UI.#makeStatsLabel(
            '0',
            new Point(statsScorePadding.x, statsScorePadding.y)
        );
        container.addChild(this.#scoreLabel);
        this.#stepsLabel = UI.#makeStatsLabel(
            '0',
            new Point(statsStepsPadding.x, statsStepsPadding.y)
        );
        container.addChild(this.#stepsLabel);

        return container;
    }

    static #makeStatsLabel(text, position) {
        const label = new Text(text, {
            fontFamily: 'Arial',
            fontSize: 50,
            fontWeight: 900,
            fill: 0xffffff,
            align: 'center'
        });
        label.anchor.set(0.5);
        label.position.copyFrom(position);
        return label;
    }

    #makeGameOverContainer() {
        const container = new Container();
        this.#gameOverLabel = new Text('Tap to start!', {
            fontFamily: 'Arial',
            fontSize: 60,
            fontWeight: 900,
            fill: 0xffffff,
            align: 'center'
        });
        this.#gameOverLabel.anchor.set(0.5);
        this.#gameOverLabel.position.set(1200 / 2, 700 / 2);
        const background = new Sprite();
        background.width = 1200;
        background.height = 700;
        background.alpha = 0;
        this.#gameContainer.filters = [new BlurFilter(10)];
        container.addChild(background, this.#gameOverLabel);
        container.interactive = true;
        container.on('pointerdown', () => {
            this.#gameOverContainer.visible = false;
            this.#gameOverContainer.interactive = false;
            this.#gameContainer.filters = [];
        });
        return container;
    }

    #showGameOver(hasWon, points) {
        this.#state.reset();
        this.#gameContainer.filters = [new BlurFilter(10)];
        this.#gameOverContainer.visible = true;
        this.#gameOverContainer.interactive = true;
        this.#gameOverLabel.text = hasWon
            ? `Вы победили. Ваш score: ${points}`
            : `Вы проиграли. Не хватило score: ${points}`;
    }
}
