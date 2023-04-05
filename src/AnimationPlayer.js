import EventEmitter from 'events';
import BezierEasing from 'bezier-easing';

const easing = BezierEasing(1, 1, 0.5, 1);

const ANIMATIONS = {
    STALE: 0,
    BURN: 1,
    FALL: 2,
    FILL: 3
};

const ANIMATION_DURATION = {
    [ANIMATIONS.BURN]: 50,
    [ANIMATIONS.FALL]: 25,
    [ANIMATIONS.FILL]: 50
};

export class AnimationPlayer extends EventEmitter {
    #state;
    #timeElapsed;
    #stage = ANIMATIONS.STALE;
    #stageData;
    #animationQueue = [];

    constructor(ticker, state) {
        super();
        this.#state = state;
        this.#state.on('burnTiles', ({ tiles, colsGapData }) => {
            this.#animationQueue.push({
                id: ANIMATIONS.BURN,
                data: { tiles, colsGapData }
            });
        });
        this.#state.on('fallTiles', ({ tiles, colsGapData }) => {
            this.#animationQueue.push({
                id: ANIMATIONS.FALL,
                data: { tiles, colsGapData }
            });
        });
        this.#state.on('fillTiles', () =>
            this.#animationQueue.push({ id: ANIMATIONS.FILL })
        );
        ticker.add(this.#tick.bind(this));
    }

    #tick(delta) {
        if (
            this.#timeElapsed > ANIMATION_DURATION[this.#stage] ||
            this.#stage === ANIMATIONS.STALE
        ) {
            const nextAnimation = this.#animationQueue.shift();
            if (!nextAnimation) {
                if (this.#stage !== ANIMATIONS.STALE) {
                    this.emit('animationsComplete');
                    this.#state.emitSyncTiles();
                    this.#stage = ANIMATIONS.STALE;
                }
                return;
            }
            this.#stage = nextAnimation.id;
            this.#stageData = nextAnimation.data;
            this.#timeElapsed = 0;
        }
        if (this.#stage !== ANIMATIONS.STALE) {
            this.#timeElapsed += delta;
            switch (this.#stage) {
                case ANIMATIONS.BURN:
                    this.#tickBurning();
                    break;
                case ANIMATIONS.FALL:
                    this.#tickFalling();
                    break;
                case ANIMATIONS.FILL:
                    this.#tickFilling();
            }
        }
    }

    #tickBurning() {
        const { tiles, colsGapData } = this.#stageData;
        for (const col in colsGapData) {
            const colGaps = colsGapData[col];
            colGaps.forEach((gap) => {
                for (let row = gap.start; row <= gap.end; row++) {
                    this.emit('tileBurn', {
                        tile: tiles[row][col],
                        x: row,
                        y: +col,
                        tileSizeShift:
                            1 -
                            easing(
                                this.#timeElapsed /
                                    ANIMATION_DURATION[ANIMATIONS.BURN]
                            )
                    });
                }
            });
        }
    }

    #tickFalling() {
        const { tiles, colsGapData } = this.#stageData;
        for (const col in colsGapData) {
            const colGaps = colsGapData[col];
            let bottomGapsFallDistance = 0;
            for (let i = colGaps.length - 1; i !== -1; i--) {
                const gap = colGaps[i];
                const prevGapBottom =
                    (colGaps[i - 1] && colGaps[i - 1].end) || -1;
                const fallDistance = gap.end - gap.start + 1;
                for (let row = prevGapBottom + 1; row !== gap.start; row++) {
                    this.emit('tileFall', {
                        tile: tiles[row][col],
                        x: row,
                        y: +col,
                        tileFallShift:
                            (bottomGapsFallDistance + fallDistance) *
                            easing(
                                this.#timeElapsed /
                                    ANIMATION_DURATION[ANIMATIONS.FALL]
                            )
                    });
                }
                bottomGapsFallDistance += fallDistance;
            }
        }
    }

    #tickFilling() {
        this.emit(
            'tileFill',
            easing(this.#timeElapsed / ANIMATION_DURATION[ANIMATIONS.FILL])
        );
    }
}
