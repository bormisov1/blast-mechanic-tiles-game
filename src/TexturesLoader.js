import EventEmitter from 'events';
import { Texture } from 'pixi.js';

import statsPath from '../assets/stats.png';

const tileImagesFilenames = require
    .context('../assets/tiles', true, /\.png$/)
    .keys()
    .map((filename) => {
        filename = filename.slice(filename.lastIndexOf('/') + 1);
        return filename.slice(0, filename.lastIndexOf('.'));
    });

export class TexturesLoader extends EventEmitter {
    constructor() {
        super();
    }

    async loadTilesTextures() {
        const textures = [];
        await Promise.all(
            tileImagesFilenames.map((filename) => {
                return new Promise((resolve) => {
                    import(`../assets/tiles/${filename}.png`).then(
                        (resolvedPath) => {
                            const texture = Texture.from(resolvedPath);
                            textures.push(texture);
                            resolve();
                            // texture.on('loaded', resolve);
                        }
                    );
                });
            })
        );
        this.emit('loadedTilesTextures', textures);
    }

    loadStatsTexture() {
        return Texture.from(statsPath);
    }
}
