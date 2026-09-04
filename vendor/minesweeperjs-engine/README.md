# Minesweeper Engine

Unmodified browser build of `minesweeperjs-engine` 1.0.3, distributed under
the accompanying MIT license.

- Source: https://github.com/finnor/MinesweeperJS-Engine
- Package: https://www.npmjs.com/package/minesweeperjs-engine/v/1.0.3
- Tarball SHA-1: f24c9832f6fc0ed47811e7fb5e5060055dc7837b

The page's adapter in `../../minesweeper.js` preserves flags during flood
reveals and stops chord actions immediately when the game ends. The library
handles board generation, mine counts, first-click safety, and win/loss rules.

UI icons in `../../pictures/minesweeper/` are generated from Lucide 1.8.0;
their license is included in that directory. Sound effects are synthesized
locally using Web Audio. There are no CDN or audio-file dependencies.
