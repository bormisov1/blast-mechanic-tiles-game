import { GameState } from './GameState.js';
import { TileManager } from './TileManager.js';
import { AnimationPlayer } from './AnimationPlayer';
import { TexturesLoader } from './TexturesLoader';
import { UI } from './UI';
import * as PIXI from 'pixi.js';

const options = {
    n: 11,
    m: 9,
    tilesAmount: 5,
    minGroupSizeLimit: 2,
    pointsGoal: 40,
    movesLimit: 10,
    shufflesLimit: 10
};

const app = new PIXI.Application({
    antialias: false,
    width: 1200,
    height: 700,
    backgroundColor: 0xa0a0a0
});
document.getElementById('app').appendChild(app.view);

const state = new GameState(options);
const animationPlayer = new AnimationPlayer(app.ticker, state);
const texturesLoader = new TexturesLoader();
const ui = new UI(app.stage, texturesLoader, state, animationPlayer);
const tileManager = new TileManager(state, animationPlayer, ui);
ui.start();
state.start();
tileManager.start();
