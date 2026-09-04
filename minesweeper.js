(() => {
    "use strict";

    const root = document.querySelector("[data-minesweeper]");
    if (!root) return;

    const byId = id => document.getElementById(`mine-${id}`);
    const board = byId("board");
    const status = byId("status");
    const difficulty = byId("difficulty");
    const counter = byId("count");
    const timer = byId("timer");
    const best = byId("best");
    const restart = byId("restart");
    const revealMode = byId("reveal");
    const flagMode = byId("flag");
    const soundButton = byId("sound");
    const Engine = window["minesweeperjs-engine"]?.default;
    const presets = {
        beginner: { columns: 9, rows: 9, mines: 10 },
        intermediate: { columns: 16, rows: 16, mines: 40 },
        expert: { columns: 30, rows: 16, mines: 99 }
    };

    if (!Engine) {
        board.setAttribute("aria-busy", "false");
        status.textContent = "The game could not load. Please refresh to try again.";
        return;
    }

    class FlagSafeGame extends Engine {
        // The upstream flood reveal otherwise opens flagged safe squares.
        explode(x, y, outcome) {
            if (this.getCell(x, y).getIsFlagged()) return outcome;
            return super.explode(x, y, outcome);
        }
    }

    const storage = {
        get(key) {
            try { return localStorage.getItem(`kb.minesweeper.${key}`); }
            catch { return null; }
        },
        set(key, value) {
            try { localStorage.setItem(`kb.minesweeper.${key}`, String(value)); }
            catch { /* Play still works when storage is unavailable. */ }
        }
    };

    const icon = name => {
        const img = document.createElement("img");
        img.src = `pictures/minesweeper/${name}.svg`;
        img.alt = "";
        img.width = 20;
        img.height = 20;
        img.draggable = false;
        return img;
    };

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let muted = storage.get("sound") === "off";
    let audioContext;
    let masterGain;
    let soundAvailable = Boolean(AudioContext);
    let soundGeneration = 0;
    const activeSources = new Set();

    function updateSoundButton() {
        soundButton.disabled = !soundAvailable;
        soundButton.setAttribute("aria-pressed", String(soundAvailable && !muted));
        soundButton.title = !soundAvailable ? "Sound effects unavailable in this browser" : muted ? "Enable sound effects" : "Mute sound effects";
        soundButton.replaceChildren(icon(muted || !soundAvailable ? "muted" : "sound"));
    }

    function connectSound(source, volume, start, duration) {
        const envelope = audioContext.createGain();
        envelope.gain.setValueAtTime(0.0001, start);
        envelope.gain.exponentialRampToValueAtTime(volume, start + 0.008);
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        source.connect(envelope);
        envelope.connect(masterGain);
        activeSources.add(source);
        source.onended = () => {
            activeSources.delete(source);
            source.disconnect();
            envelope.disconnect();
        };
        source.start(start);
        source.stop(start + duration + 0.01);
    }

    function tone(frequency, endFrequency, duration, delay = 0, volume = 0.35) {
        const oscillator = audioContext.createOscillator();
        const start = audioContext.currentTime + delay;
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
        connectSound(oscillator, volume, start, duration);
    }

    async function playSound(name) {
        if (muted || !soundAvailable) return;
        const generation = soundGeneration;
        try {
            // Create/resume audio only inside a player's action, never on page load.
            if (!audioContext) {
                audioContext = new AudioContext();
                masterGain = audioContext.createGain();
                masterGain.gain.value = 0.6;
                masterGain.connect(audioContext.destination);
            }
            if (audioContext.state !== "running") await audioContext.resume();
            if (muted || document.hidden || generation !== soundGeneration) return;

            if (name === "mine") {
                const buffer = audioContext.createBuffer(1, Math.ceil(audioContext.sampleRate * 0.28), audioContext.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
                const noise = audioContext.createBufferSource();
                noise.buffer = buffer;
                connectSound(noise, 0.45, audioContext.currentTime, 0.28);
                tone(125, 28, 0.42, 0, 0.6);
            } else if (name === "win") {
                [523, 659, 784, 1047].forEach((note, i) => tone(note, note, 0.18, i * 0.1));
            } else if (name === "flag") {
                tone(740, 1240, 0.09);
            } else if (name === "unflag") {
                tone(520, 260, 0.08);
            } else {
                tone(620, 420, 0.055, 0, 0.25);
            }
        } catch {
            soundAvailable = false;
            updateSoundButton();
        }
    }

    function silence() {
        soundGeneration++;
        activeSources.forEach(source => {
            try { source.stop(); } catch { /* A scheduled source may have already ended. */ }
        });
        activeSources.clear();
    }

    let game;
    let cells = [];
    let mode = "reveal";
    let result = null;
    let startedAt = null;
    let elapsed = 0;
    let timerId = null;
    let currentDifficulty = "beginner";

    function updateTimer() {
        if (startedAt !== null && !game.over) elapsed = Math.floor((performance.now() - startedAt) / 1000);
        timer.textContent = String(Math.min(999, elapsed)).padStart(3, "0");
        timer.setAttribute("aria-label", `${elapsed} seconds elapsed`);
        timer.title = `${elapsed} seconds`;
    }

    function stopTimer() {
        clearInterval(timerId);
        timerId = null;
    }

    function bestTime() {
        const saved = storage.get(`best.${currentDifficulty}`);
        const value = saved === null ? NaN : Number(saved);
        return Number.isSafeInteger(value) && value >= 0 ? value : null;
    }

    function updateBest() {
        const time = bestTime();
        best.textContent = time === null ? "--" : `${time}s`;
    }

    function setMode(value) {
        mode = value;
        revealMode.setAttribute("aria-pressed", String(value === "reveal"));
        flagMode.setAttribute("aria-pressed", String(value === "flag"));
        board.dataset.mode = value;
    }

    function render() {
        let flags = 0;
        cells.forEach(button => {
            const x = Number(button.dataset.x);
            const y = Number(button.dataset.y);
            const cell = game.getCell(x, y);
            const value = cell.getValue();
            const isMine = value === "X";
            const flagged = cell.getIsFlagged();
            const won = result?.state === "WIN";
            const showMine = isMine && result && !flagged && !won;
            const wrongFlag = flagged && !isMine && result;
            const hit = result?.state === "LOSE" && result.x === x && result.y === y;
            const open = cell.getIsVisible() || Boolean(showMine || wrongFlag);
            const showFlag = flagged || (won && isMine);
            if (showFlag) flags++;

            button.className = "mine-cell";
            button.classList.toggle("is-open", open);
            button.classList.toggle("is-hit", Boolean(hit));
            button.classList.toggle("is-wrong", Boolean(wrongFlag));
            button.setAttribute("aria-disabled", String(game.over));
            button.dataset.value = open && !isMine ? String(value) : "";
            button.replaceChildren();

            let label = "Hidden";
            if (wrongFlag) {
                button.append(icon("flag"), icon("wrong"));
                label = "Incorrect flag";
            } else if (showFlag) {
                button.append(icon("flag"));
                label = "Flagged";
            } else if (showMine) {
                button.append(icon("bomb"));
                label = hit ? "Mine hit" : "Mine";
            } else if (open) {
                button.textContent = value || "";
                label = value ? `${value} adjacent ${value === 1 ? "mine" : "mines"}` : "Empty";
            }
            button.setAttribute("aria-label", `Row ${y + 1}, column ${x + 1}: ${label}`);
            button.title = label;
        });
        const remaining = game.mineCount - flags;
        counter.textContent = remaining < 0 ? `-${String(-remaining).padStart(2, "0")}` : String(remaining).padStart(3, "0");
        counter.classList.toggle("is-wide", remaining < -99);
        counter.setAttribute("aria-label", `${remaining} mines minus flags`);
        counter.title = `${game.mineCount} mines, ${flags} flags`;
        board.setAttribute("aria-disabled", String(game.over));
    }

    function newGame() {
        stopTimer();
        silence();
        currentDifficulty = difficulty.value;
        const preset = presets[currentDifficulty];
        game = new FlagSafeGame(preset.columns, preset.rows, preset.mines);
        result = null;
        startedAt = null;
        elapsed = 0;
        cells = [];
        root.classList.remove("is-won", "is-lost");
        board.style.setProperty("--columns", preset.columns);
        board.setAttribute("aria-rowcount", preset.rows);
        board.setAttribute("aria-colcount", preset.columns);
        board.setAttribute("aria-label", `${currentDifficulty} Minesweeper, ${preset.mines} mines`);
        board.setAttribute("aria-keyshortcuts", "ArrowUp ArrowDown ArrowLeft ArrowRight Enter Space F");
        const fragment = document.createDocumentFragment();
        for (let y = 0; y < preset.rows; y++) {
            const row = document.createElement("div");
            row.className = "mine-row";
            row.setAttribute("role", "row");
            for (let x = 0; x < preset.columns; x++) {
                const wrapper = document.createElement("div");
                wrapper.className = "mine-cell-wrap";
                wrapper.setAttribute("role", "gridcell");
                const button = document.createElement("button");
                button.type = "button";
                button.dataset.x = x;
                button.dataset.y = y;
                button.tabIndex = x === 0 && y === 0 ? 0 : -1;
                wrapper.append(button);
                row.append(wrapper);
                cells.push(button);
            }
            fragment.append(row);
        }
        board.replaceChildren(fragment);
        board.parentElement.scrollLeft = 0;
        board.setAttribute("aria-busy", "false");
        setMode("reveal");
        render();
        updateTimer();
        updateBest();
        status.textContent = "Ready";
    }

    function play(x, y, action) {
        if (game.over) return;
        const cell = game.getCell(x, y);
        if (action === "flag") {
            if (cell.getIsVisible()) return;
            game.toggleFlag(x, y);
            render();
            playSound(cell.getIsFlagged() ? "flag" : "unflag");
            return;
        }
        if (cell.getIsFlagged()) return;

        const targets = cell.getIsVisible() ? game.getClickableNeighbors(x, y) : [{ x, y }];
        let changed = false;
        for (const target of targets) {
            // Stop a chord immediately after a mine or a win; upstream keeps clicking.
            if (game.over) break;
            const outcome = game.click(target.x, target.y);
            if (outcome.length) changed = true;
            result = outcome.find(item => item.state) || result;
        }
        if (!changed) return;

        if (startedAt === null) {
            startedAt = performance.now();
            if (!game.over) timerId = setInterval(updateTimer, 250);
        }
        if (result) {
            elapsed = Math.floor((performance.now() - startedAt) / 1000);
            stopTimer();
            const won = result.state === "WIN";
            root.classList.add(won ? "is-won" : "is-lost");
            status.textContent = won ? `Board cleared! ${elapsed}s` : "Mine hit. Try again?";
            if (won && (bestTime() === null || elapsed < bestTime())) {
                storage.set(`best.${currentDifficulty}`, elapsed);
                updateBest();
            }
            playSound(won ? "win" : "mine");
        } else {
            status.textContent = "In progress";
            playSound("reveal");
        }
        render();
        updateTimer();
    }

    function focusCell(button, scroll = false) {
        const previous = board.querySelector('[tabindex="0"]');
        if (previous) previous.tabIndex = -1;
        button.tabIndex = 0;
        button.focus({ preventScroll: true });
        if (scroll) button.scrollIntoView({ block: "nearest", inline: "nearest" });
    }

    board.addEventListener("click", event => {
        const button = event.target.closest(".mine-cell");
        if (!button) return;
        focusCell(button);
        play(Number(button.dataset.x), Number(button.dataset.y), mode);
    });

    board.addEventListener("contextmenu", event => {
        const button = event.target.closest(".mine-cell");
        if (!button) return;
        event.preventDefault();
        focusCell(button);
        play(Number(button.dataset.x), Number(button.dataset.y), "flag");
    });

    board.addEventListener("keydown", event => {
        const button = event.target.closest(".mine-cell");
        if (!button || event.altKey || event.ctrlKey || event.metaKey) return;
        let x = Number(button.dataset.x);
        let y = Number(button.dataset.y);
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            if (event.key === "ArrowLeft") x--;
            if (event.key === "ArrowRight") x++;
            if (event.key === "ArrowUp") y--;
            if (event.key === "ArrowDown") y++;
            if (event.key === "Home") x = 0;
            if (event.key === "End") x = game.getWidth() - 1;
            x = Math.max(0, Math.min(game.getWidth() - 1, x));
            y = Math.max(0, Math.min(game.getLength() - 1, y));
            focusCell(cells[y * game.getWidth() + x], true);
        } else if (event.key.toLowerCase() === "f" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!event.repeat) play(x, y, event.key.toLowerCase() === "f" ? "flag" : mode);
        }
    });

    restart.addEventListener("click", newGame);
    difficulty.addEventListener("change", () => {
        storage.set("difficulty", difficulty.value);
        newGame();
    });
    revealMode.addEventListener("click", () => setMode("reveal"));
    flagMode.addEventListener("click", () => setMode("flag"));
    soundButton.addEventListener("click", () => {
        muted = !muted;
        storage.set("sound", muted ? "off" : "on");
        if (muted) silence();
        else playSound("flag");
        updateSoundButton();
    });

    window.addEventListener("pagehide", () => {
        stopTimer();
        silence();
        if (audioContext) audioContext.suspend().catch(() => {});
    });
    window.addEventListener("pageshow", () => {
        if (startedAt !== null && !game.over && timerId === null) {
            updateTimer();
            timerId = setInterval(updateTimer, 250);
        }
    });

    const savedDifficulty = storage.get("difficulty");
    if (Object.hasOwn(presets, savedDifficulty)) difficulty.value = savedDifficulty;
    [difficulty, restart, revealMode, flagMode].forEach(control => { control.disabled = false; });
    updateSoundButton();
    newGame();
})();
