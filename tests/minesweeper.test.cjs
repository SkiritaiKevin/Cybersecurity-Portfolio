const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require(process.env.JSDOM_PATH || 'jsdom');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function setup(t, options = {}) {
    const errors = [];
    const console = new VirtualConsole();
    console.on('jsdomError', error => errors.push(error));
    const dom = new JSDOM(read('minesweeper.html'), {
        url: 'https://portfolio.test/minesweeper.html',
        runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: console
    });
    const w = dom.window;
    const doc = w.document;
    let seed = 41;
    w.Math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
    w.HTMLElement.prototype.scrollIntoView = function () {};
    let now = 0;
    w.performance.now = () => now;
    let nextInterval = 0;
    const intervals = new Map();
    w.setInterval = callback => { intervals.set(++nextInterval, callback); return nextInterval; };
    w.clearInterval = id => intervals.delete(id);

    const sounds = [];
    const contexts = [];
    const parameter = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
    class FakeContext {
        constructor() { this.currentTime = 0; this.sampleRate = 22050; this.state = 'running'; this.destination = {}; contexts.push(this); }
        createGain() { return { gain: parameter(), connect() {}, disconnect() {} }; }
        source(kind) {
            const source = { kind, stops: 0, frequency: parameter(), connect() {}, disconnect() {}, start() { sounds.push(this); }, stop() { this.stops++; } };
            return source;
        }
        createOscillator() { return this.source('tone'); }
        createBufferSource() { return this.source('noise'); }
        createBuffer(channels, count) { return { getChannelData: () => new Float32Array(count) }; }
        async resume() { this.state = 'running'; }
        async suspend() { this.state = 'suspended'; }
    }
    if (!options.noAudio) w.AudioContext = FakeContext;
    if (options.audioFailure) w.AudioContext = class { constructor() { throw new Error('No audio device'); } };
    for (const [key, value] of Object.entries(options.storage || {})) w.localStorage.setItem(key, value);
    if (options.noStorage) Object.defineProperty(w, 'localStorage', { get() { throw new Error('Storage blocked'); } });

    const music = [];
    if (options.music) {
        w.Audio = function () {
            const element = doc.createElement('audio');
            let paused = true;
            Object.defineProperty(element, 'paused', { get: () => paused });
            element.load = () => {};
            element.play = async () => { paused = false; element.dispatchEvent(new w.Event('play')); };
            element.pause = () => { paused = true; element.dispatchEvent(new w.Event('pause')); };
            music.push(element);
            return element;
        };
        w.eval(read('script.js'));
    }
    const games = [];
    if (!options.noEngine) {
        w.eval(read('vendor/minesweeperjs-engine/minesweeperjs-engine.js'));
        const Original = w['minesweeperjs-engine'].default;
        w['minesweeperjs-engine'] = { default: class extends Original {
            constructor(...args) { super(...args); games.push(this); }
        } };
    }
    w.eval(read('minesweeper.js'));
    t.after(() => {
        w.dispatchEvent(new w.Event('pagehide'));
        dom.window.close();
        assert.equal(errors.length, 0, errors.map(error => error.message).join('\n'));
    });
    return {
        w, doc, sounds, contexts, music, intervals,
        get game() { return games.at(-1); },
        byId: id => doc.getElementById(`mine-${id}`),
        button: (x, y) => doc.querySelector(`.mine-cell[data-x="${x}"][data-y="${y}"]`),
        click(x, y) { this.button(x, y).click(); },
        flag(x, y) { this.button(x, y).dispatchEvent(new w.MouseEvent('contextmenu', { bubbles: true, cancelable: true })); },
        key(x, y, key, repeat = false) { this.button(x, y).dispatchEvent(new w.KeyboardEvent('keydown', { key, repeat, bubbles: true, cancelable: true })); },
        advance(ms) { now += ms; intervals.forEach(callback => callback()); },
        difficulty(value) { this.byId('difficulty').value = value; this.byId('difficulty').dispatchEvent(new w.Event('change')); },
        all() { return Array.from(this.game.getBoard()).flatMap(row => Array.from(row)); }
    };
}

const coords = cell => [cell.getX(), cell.getY()];
const safe = h => h.all().find(cell => cell.getValue() !== 'X' && cell.getValue() > 0);
const mine = h => h.all().find(cell => cell.getValue() === 'X');

test('initial board, controls, accessibility, and no automatic audio', t => {
    const h = setup(t);
    assert.equal(h.doc.querySelectorAll('.mine-cell').length, 81);
    assert.equal(h.doc.querySelectorAll('.mine-cell[tabindex="0"]').length, 1);
    assert.equal(h.byId('count').textContent, '010');
    assert.equal(h.byId('timer').textContent, '000');
    assert.equal(h.byId('status').textContent, 'Ready');
    assert.equal(h.byId('board').getAttribute('aria-busy'), 'false');
    assert.equal(h.byId('difficulty').disabled, false);
    assert.equal(h.contexts.length, 0);
    assert.equal(h.sounds.length, 0);
    assert.ok([...h.doc.querySelectorAll('.mine-cell')].every(button => /Hidden$/.test(button.getAttribute('aria-label'))));
});

test('all difficulties have correct mine counts and safe first clicks', t => {
    const h = setup(t);
    for (const [name, columns, rows, mines] of [['beginner', 9, 9, 10], ['intermediate', 16, 16, 40], ['expert', 30, 16, 99]]) {
        h.difficulty(name);
        assert.equal(h.doc.querySelectorAll('.mine-cell').length, columns * rows);
        assert.equal(h.all().filter(cell => cell.getValue() === 'X').length, mines);
        const firstMine = coords(mine(h));
        h.click(...firstMine);
        assert.notEqual(h.game.getCell(...firstMine).getValue(), 'X');
        assert.equal(h.game.over, false);
        assert.equal(h.all().filter(cell => cell.getValue() === 'X').length, mines);
        for (const cell of h.all().filter(cell => cell.getValue() !== 'X')) {
            assert.equal(cell.getValue(), h.game.getNeighbors(...coords(cell)).filter(neighbor => neighbor.getValue() === 'X').length);
        }
    }
});

test('right-click and touch flag mode toggle flags without starting the timer', t => {
    const h = setup(t);
    h.flag(0, 0);
    assert.equal(h.game.getCell(0, 0).getIsFlagged(), true);
    assert.equal(h.byId('count').textContent, '009');
    assert.equal(h.game.started, false);
    assert.equal(h.intervals.size, 0);
    h.click(0, 0);
    assert.equal(h.game.getCell(0, 0).getIsVisible(), false);
    assert.equal(h.sounds.length, 1);
    h.flag(0, 0);
    assert.equal(h.game.getCell(0, 0).getIsFlagged(), false);
    h.byId('flag').click();
    h.click(1, 0);
    assert.equal(h.game.getCell(1, 0).getIsFlagged(), true);
    assert.equal(h.byId('flag').getAttribute('aria-pressed'), 'true');
    h.byId('reveal').click();
    assert.equal(h.byId('reveal').getAttribute('aria-pressed'), 'true');
});

test('flood reveal preserves flagged safe squares', t => {
    const h = setup(t);
    const blank = h.all().find(cell => cell.getValue() === 0);
    const protectedCell = h.game.getNeighbors(...coords(blank))[0];
    h.flag(...coords(protectedCell));
    h.click(...coords(blank));
    assert.equal(protectedCell.getIsVisible(), false);
    assert.equal(protectedCell.getIsFlagged(), true);
    assert.equal(h.game.over, false);
    assert.ok(h.all().filter(cell => cell.getIsVisible()).length > 1);
    assert.equal(h.game.squaresLeft, h.all().filter(cell => cell.getValue() !== 'X' && !cell.getIsVisible()).length);
    h.flag(...coords(protectedCell));
    h.click(...coords(protectedCell));
    assert.equal(protectedCell.getIsVisible(), true);
});

test('number chording opens adjacent safe squares', t => {
    const h = setup(t);
    const cell = safe(h);
    h.click(...coords(cell));
    const neighbors = h.game.getNeighbors(...coords(cell));
    neighbors.filter(cell => cell.getValue() === 'X').forEach(cell => h.flag(...coords(cell)));
    h.click(...coords(cell));
    assert.equal(h.game.over, false);
    assert.ok(neighbors.filter(cell => cell.getValue() !== 'X').every(cell => cell.getIsVisible()));
});

test('a wrongly flagged chord loses and stops at the first mine', t => {
    const h = setup(t);
    const cell = h.all().find(cell => cell.getValue() === 1 && h.game.getNeighbors(...coords(cell)).filter(neighbor => neighbor.getValue() !== 'X').length > 1);
    h.click(...coords(cell));
    const wrong = h.game.getNeighbors(...coords(cell)).find(cell => cell.getValue() !== 'X');
    h.flag(...coords(wrong));
    const expected = h.game.getClickableNeighbors(...coords(cell));
    const mineIndex = expected.findIndex(cell => h.game.getCell(cell.x, cell.y).getValue() === 'X');
    const previousMoves = h.game.moveCount;
    h.click(...coords(cell));
    assert.equal(h.game.over, true);
    assert.ok(h.doc.querySelector('.minesweeper.is-lost'));
    assert.ok(h.game.moveCount <= previousMoves + mineIndex + 1);
    assert.equal(h.doc.querySelectorAll('.mine-cell.is-hit').length, 1);
    assert.equal(h.button(...coords(wrong)).getAttribute('aria-label').includes('Incorrect flag'), true);
});

test('mine hit ends the game, makes explosion audio, and locks all actions', t => {
    const h = setup(t);
    h.click(...coords(safe(h)));
    h.advance(2400);
    const bomb = coords(mine(h));
    h.click(...bomb);
    assert.equal(h.game.over, true);
    assert.equal(h.byId('board').getAttribute('aria-disabled'), 'true');
    assert.equal(h.byId('timer').textContent, '002');
    assert.ok(h.sounds.some(sound => sound.kind === 'noise'));
    assert.equal(h.intervals.size, 0);
    const moves = h.game.moveCount;
    const soundCount = h.sounds.length;
    h.click(8, 8);
    h.flag(7, 7);
    h.advance(10000);
    assert.equal(h.game.moveCount, moves);
    assert.equal(h.sounds.length, soundCount);
    assert.equal(h.byId('timer').textContent, '002');
});

test('clearing every safe cell wins, auto-flags mines, and saves best time', t => {
    const h = setup(t);
    h.click(...coords(safe(h)));
    h.advance(3700);
    h.all().filter(cell => cell.getValue() !== 'X').forEach(cell => h.click(...coords(cell)));
    assert.equal(h.game.squaresLeft, 0);
    assert.ok(h.doc.querySelector('.minesweeper.is-won'));
    assert.equal(h.byId('count').textContent, '000');
    assert.equal(h.byId('best').textContent, '3s');
    assert.equal(h.w.localStorage.getItem('kb.minesweeper.best.beginner'), '3');
    assert.equal(h.intervals.size, 0);
    assert.equal(h.doc.querySelectorAll('.mine-cell img[src$="flag.svg"]').length, 10);
    h.byId('restart').click();
    assert.equal(h.byId('best').textContent, '3s');
    assert.equal(h.byId('status').textContent, 'Ready');
    assert.equal(h.byId('timer').textContent, '000');
});

test('keyboard navigation has one tab stop; F flags; Enter and Space play', t => {
    const h = setup(t);
    h.button(0, 0).focus();
    h.key(0, 0, 'ArrowRight');
    assert.equal(h.doc.activeElement, h.button(1, 0));
    h.key(1, 0, 'ArrowDown');
    assert.equal(h.doc.activeElement, h.button(1, 1));
    h.key(1, 1, 'f');
    h.key(1, 1, 'f', true);
    assert.equal(h.game.getCell(1, 1).getIsFlagged(), true);
    h.key(1, 1, 'F');
    h.key(1, 1, 'Enter');
    assert.equal(h.game.getCell(1, 1).getIsVisible(), true);
    h.key(1, 1, 'End');
    assert.equal(h.doc.activeElement, h.button(8, 1));
    assert.equal(h.doc.querySelectorAll('.mine-cell[tabindex="0"]').length, 1);
});

test('restarts and difficulty changes reset state and do not leak timers', t => {
    const h = setup(t);
    h.click(...coords(safe(h)));
    h.advance(5000);
    assert.equal(h.byId('timer').textContent, '005');
    h.byId('flag').click();
    h.byId('restart').click();
    assert.equal(h.intervals.size, 0);
    assert.equal(h.byId('timer').textContent, '000');
    assert.equal(h.byId('reveal').getAttribute('aria-pressed'), 'true');
    h.difficulty('expert');
    assert.equal(h.byId('count').textContent, '099');
    assert.equal(h.byId('status').textContent, 'Ready');
    assert.equal(h.w.localStorage.getItem('kb.minesweeper.difficulty'), 'expert');
});

test('SFX mute persists, stops sounds, and does not alter site music', async t => {
    const h = setup(t, { music: true });
    h.doc.querySelector('.music-launcher').click();
    h.doc.querySelector('[data-player-play]').click();
    await Promise.resolve();
    assert.equal(h.music[0].paused, false);
    assert.equal(h.doc.querySelector('#site-music-player').hidden, false);
    h.flag(0, 0);
    h.byId('sound').click();
    const count = h.sounds.length;
    h.flag(0, 0);
    assert.equal(h.sounds.length, count);
    assert.equal(h.byId('sound').getAttribute('aria-pressed'), 'false');
    assert.equal(h.w.localStorage.getItem('kb.minesweeper.sound'), 'off');
    assert.equal(h.music[0].muted, false);
    assert.equal(h.music[0].paused, false);
    assert.ok(h.sounds.every(sound => sound.stops >= 2));
    h.byId('sound').click();
    assert.ok(h.sounds.length > count);
});

test('missing audio or blocked storage does not block gameplay', t => {
    const h = setup(t, { noAudio: true, noStorage: true });
    assert.equal(h.byId('sound').disabled, true);
    h.click(...coords(safe(h)));
    h.all().filter(cell => cell.getValue() !== 'X').forEach(cell => h.click(...coords(cell)));
    assert.ok(h.doc.querySelector('.minesweeper.is-won'));
    assert.equal(h.byId('best').textContent, '--');
});

test('audio device failures disable SFX without interrupting the board', t => {
    const h = setup(t, { audioFailure: true });
    h.flag(0, 0);
    assert.equal(h.game.getCell(0, 0).getIsFlagged(), true);
    assert.equal(h.byId('sound').disabled, true);
    h.flag(0, 0);
    h.click(...coords(safe(h)));
    assert.equal(h.game.started, true);
});

test('saved preferences are validated, and saved mute never starts audio', t => {
    const h = setup(t, { storage: {
        'kb.minesweeper.difficulty': 'invalid',
        'kb.minesweeper.sound': 'off',
        'kb.minesweeper.best.beginner': 'not a number'
    } });
    assert.equal(h.byId('difficulty').value, 'beginner');
    assert.equal(h.byId('best').textContent, '--');
    h.flag(0, 0);
    assert.equal(h.contexts.length, 0);
    assert.equal(h.byId('sound').getAttribute('aria-pressed'), 'false');
});

test('back-forward page lifecycle restores timer without duplication', t => {
    const h = setup(t);
    h.click(...coords(safe(h)));
    assert.equal(h.intervals.size, 1);
    h.w.dispatchEvent(new h.w.Event('pagehide'));
    assert.equal(h.intervals.size, 0);
    h.advance(2500);
    h.w.dispatchEvent(new h.w.Event('pageshow'));
    h.w.dispatchEvent(new h.w.Event('pageshow'));
    assert.equal(h.intervals.size, 1);
    assert.equal(h.byId('timer').textContent, '002');
});

test('missing engine shows a clear error and keeps controls disabled', t => {
    const h = setup(t, { noEngine: true });
    assert.match(h.byId('status').textContent, /could not load/);
    assert.equal(h.byId('board').getAttribute('aria-busy'), 'false');
    assert.equal(h.byId('restart').disabled, true);
});

test('new page links and assets resolve locally; navigation stays unchanged', t => {
    const h = setup(t);
    const ids = [...h.doc.querySelectorAll('[id]')].map(element => element.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const element of h.doc.querySelectorAll('[href], [src]')) {
        const value = element.getAttribute('href') || element.getAttribute('src');
        if (!value || value.startsWith('#') || /^[a-z]+:/i.test(value)) continue;
        const relative = decodeURIComponent(value.split(/[?#]/)[0]);
        assert.ok(fs.existsSync(path.join(root, relative)), `Missing local asset: ${relative}`);
    }
    assert.deepEqual([...h.doc.querySelectorAll('.site-nav a')].map(link => link.getAttribute('href')), ['projects.html', 'blog.html', 'about.html', 'MyResume.pdf']);
    assert.match(read('hobbies.html'), /class="arcade-link" href="minesweeper.html"/);
    const style = h.doc.createElement('style');
    style.textContent = read('minesweeper.css');
    h.doc.head.append(style);
    assert.ok(style.sheet.cssRules.length > 40);
});
