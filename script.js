document.documentElement.classList.add("js");

const yearElements = document.querySelectorAll("[data-current-year]");
yearElements.forEach((element) => {
    element.textContent = new Date().getFullYear();
});

const emailLinks = document.querySelectorAll('a[href^="mailto:"]');

if (emailLinks.length) {
    const copyNotice = document.createElement("div");
    copyNotice.className = "copy-notice";
    copyNotice.setAttribute("role", "status");
    copyNotice.setAttribute("aria-live", "polite");
    document.body.appendChild(copyNotice);

    let noticeTimer;

    const showCopyNotice = (message) => {
        window.clearTimeout(noticeTimer);
        copyNotice.textContent = message;
        copyNotice.classList.add("is-visible");

        noticeTimer = window.setTimeout(() => {
            copyNotice.classList.remove("is-visible");
        }, 2200);
    };

    const copyText = async (text) => {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return;
        }

        const copyField = document.createElement("textarea");
        copyField.value = text;
        copyField.setAttribute("readonly", "");
        copyField.style.position = "fixed";
        copyField.style.opacity = "0";
        document.body.appendChild(copyField);
        copyField.select();

        const copied = document.execCommand("copy");
        copyField.remove();

        if (!copied) {
            throw new Error("Clipboard copy failed");
        }
    };

    emailLinks.forEach((link) => {
        const email = link.href.slice("mailto:".length).split("?")[0];
        link.setAttribute("title", "Copy email address");
        link.setAttribute("aria-label", `Copy email address ${email}`);

        link.addEventListener("click", async (event) => {
            event.preventDefault();

            try {
                await copyText(email);
                showCopyNotice("Email copied to clipboard");
            } catch {
                showCopyNotice("Could not copy email");
            }
        });
    });
}

const revealElements = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                return;
            }

            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
        });
    }, {
        threshold: 0.12
    });

    revealElements.forEach((element) => revealObserver.observe(element));
} else {
    revealElements.forEach((element) => element.classList.add("is-visible"));
}

const musicTrackBaseUrl = window.location.hostname.endsWith("neocities.org")
    ? "https://raw.githubusercontent.com/SkiritaiKevin/Cybersecurity-Portfolio/main/audio/"
    : "audio/";

const musicTracks = [
    {
        title: "X-Naut Fortress",
        src: `${musicTrackBaseUrl}x-naut-fortress.mp3`
    },
    {
        title: "Title Theme",
        src: `${musicTrackBaseUrl}title-theme.mp3`
    },
    {
        title: "Pit of 100 Trials",
        src: `${musicTrackBaseUrl}pit-of-100-trials.mp3`
    },
    {
        title: "We're Counting on You, Mario!",
        src: `${musicTrackBaseUrl}were-counting-on-you-mario.mp3`
    },
    {
        title: "Zess T.'s Cooking",
        src: `${musicTrackBaseUrl}zess-ts-cooking.mp3`
    },
    {
        title: "What an Enormous Dragon!",
        src: `${musicTrackBaseUrl}what-an-enormous-dragon.mp3`
    },
    {
        title: "World 2 Hurry Up!",
        src: `${musicTrackBaseUrl}world-2-hurry-up.mp3`
    },
    {
        title: "World 3 Hurry Up!",
        src: `${musicTrackBaseUrl}world-3-hurry-up.mp3`
    },
    {
        title: "World of Darkness",
        src: `${musicTrackBaseUrl}world-of-darkness.mp3`
    }
];

if (musicTracks.length) {
    const musicLauncher = document.createElement("button");
    musicLauncher.className = "music-launcher";
    musicLauncher.type = "button";
    musicLauncher.setAttribute("aria-controls", "site-music-player");
    musicLauncher.setAttribute("aria-expanded", "false");
    musicLauncher.setAttribute("title", "Open music player");
    musicLauncher.innerHTML = `
        <span class="music-launcher__note" aria-hidden="true">♪</span>
        <span>MUSIC</span>
        <span class="music-launcher__light" aria-hidden="true"></span>
    `;

    const musicPlayer = document.createElement("section");
    musicPlayer.className = "music-player";
    musicPlayer.id = "site-music-player";
    musicPlayer.setAttribute("aria-label", "Site music player");
    musicPlayer.hidden = true;
    musicPlayer.innerHTML = `
        <div class="music-player__titlebar">
            <span>KB SOUND UNIT / 音楽</span>
            <button class="music-player__close" type="button" aria-label="Close music player" title="Close music player">×</button>
        </div>
        <div class="music-player__body">
            <div class="music-player__model">
                <span>PORTABLE AUDIO DEVICE</span>
                <strong>KB-98</strong>
            </div>
            <div class="music-player__display" aria-live="polite">
                <div class="music-player__display-top">
                    <span data-player-status>READY</span>
                    <span data-player-number>01 / 02</span>
                </div>
                <strong data-player-title>X-Naut Fortress</strong>
                <div class="music-player__meter" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
            </div>
            <div class="music-player__timeline">
                <input data-player-progress type="range" min="0" max="100" value="0" step="0.1" aria-label="Track position">
                <div><span data-player-elapsed>0:00</span><span data-player-duration>0:00</span></div>
            </div>
            <div class="music-player__transport" aria-label="Playback controls">
                <button type="button" data-player-previous aria-label="Previous track" title="Previous track">|◀</button>
                <button class="music-player__play" type="button" data-player-play aria-label="Play" title="Play">▶</button>
                <button type="button" data-player-next aria-label="Next track" title="Next track">▶|</button>
                <button type="button" data-player-mute aria-label="Mute" title="Mute">MUTE</button>
            </div>
            <div class="music-player__volume">
                <label for="site-music-volume">VOL</label>
                <input id="site-music-volume" data-player-volume type="range" min="0" max="1" value="0.65" step="0.05" aria-label="Volume">
            </div>
            <ol class="music-player__tracks" aria-label="Track list">
                ${musicTracks.map((track, index) => `
                    <li>
                        <button type="button" data-track-index="${index}">
                            <span>${String(index + 1).padStart(2, "0")}</span>
                            <strong>${track.title}</strong>
                        </button>
                    </li>
                `).join("")}
            </ol>
            <div class="music-player__footer"><span>${musicTracks.length} TRACK MEMORY</span><span>STEREO</span></div>
        </div>
    `;

    document.body.append(musicPlayer, musicLauncher);

    const audio = new Audio();
    audio.preload = "metadata";

    const closeButton = musicPlayer.querySelector(".music-player__close");
    const playButton = musicPlayer.querySelector("[data-player-play]");
    const previousButton = musicPlayer.querySelector("[data-player-previous]");
    const nextButton = musicPlayer.querySelector("[data-player-next]");
    const muteButton = musicPlayer.querySelector("[data-player-mute]");
    const progressControl = musicPlayer.querySelector("[data-player-progress]");
    const volumeControl = musicPlayer.querySelector("[data-player-volume]");
    const statusDisplay = musicPlayer.querySelector("[data-player-status]");
    const numberDisplay = musicPlayer.querySelector("[data-player-number]");
    const titleDisplay = musicPlayer.querySelector("[data-player-title]");
    const elapsedDisplay = musicPlayer.querySelector("[data-player-elapsed]");
    const durationDisplay = musicPlayer.querySelector("[data-player-duration]");
    const trackButtons = [...musicPlayer.querySelectorAll("[data-track-index]")];
    let currentTrack = 0;
    let pendingHandoff = null;

    const readStoredValue = (key) => {
        try {
            return window.localStorage.getItem(key);
        } catch {
            return null;
        }
    };

    const storeValue = (key, value) => {
        try {
            window.localStorage.setItem(key, value);
        } catch {
            // Playback remains fully functional when storage is unavailable.
        }
    };

    const readPlaybackHandoff = () => {
        try {
            const handoff = JSON.parse(window.sessionStorage.getItem("kb-music-handoff"));
            const isRecent = handoff && Number.isFinite(handoff.savedAt) && Date.now() - handoff.savedAt < 15000;
            return isRecent ? handoff : null;
        } catch {
            return null;
        }
    };

    const playbackHandoff = readPlaybackHandoff();
    pendingHandoff = playbackHandoff;

    const storedTrack = Number.parseInt(readStoredValue("kb-music-track") || "0", 10);
    const handedOffTrack = Number.parseInt(playbackHandoff?.track, 10);
    if (Number.isInteger(handedOffTrack) && handedOffTrack >= 0 && handedOffTrack < musicTracks.length) {
        currentTrack = handedOffTrack;
    } else if (Number.isInteger(storedTrack) && storedTrack >= 0 && storedTrack < musicTracks.length) {
        currentTrack = storedTrack;
    }

    const storedVolume = Number.parseFloat(readStoredValue("kb-music-volume") || "0.65");
    audio.volume = Number.isFinite(storedVolume) ? Math.min(1, Math.max(0, storedVolume)) : 0.65;
    audio.muted = Boolean(playbackHandoff?.muted);
    volumeControl.value = String(audio.volume);
    muteButton.classList.toggle("is-active", audio.muted);
    muteButton.setAttribute("aria-label", audio.muted ? "Unmute" : "Mute");
    muteButton.setAttribute("title", audio.muted ? "Unmute" : "Mute");
    muteButton.textContent = audio.muted ? "MUTED" : "MUTE";

    const formatTime = (time) => {
        if (!Number.isFinite(time) || time < 0) {
            return "0:00";
        }

        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60).toString().padStart(2, "0");
        return `${minutes}:${seconds}`;
    };

    const setPlayerOpen = (isOpen, moveFocus = true) => {
        musicPlayer.hidden = !isOpen;
        musicLauncher.setAttribute("aria-expanded", String(isOpen));
        musicLauncher.setAttribute("title", isOpen ? "Close music player" : "Open music player");

        if (isOpen && moveFocus) {
            closeButton.focus();
        }
    };

    const savePlaybackHandoff = () => {
        try {
            window.sessionStorage.setItem("kb-music-handoff", JSON.stringify({
                track: currentTrack,
                currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
                playing: !audio.paused && !audio.ended,
                muted: audio.muted,
                open: !musicPlayer.hidden,
                savedAt: Date.now()
            }));
        } catch {
            // A page change will simply reset the player when storage is unavailable.
        }
    };

    const updatePlayState = () => {
        const isPlaying = !audio.paused;
        playButton.textContent = isPlaying ? "Ⅱ" : "▶";
        playButton.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
        playButton.setAttribute("title", isPlaying ? "Pause" : "Play");
        musicPlayer.classList.toggle("is-playing", isPlaying);
        musicLauncher.classList.toggle("is-playing", isPlaying);
        statusDisplay.textContent = isPlaying ? "PLAY" : "PAUSE";
    };

    const loadTrack = (index, shouldPlay = false, preserveHandoff = false) => {
        if (!preserveHandoff) {
            pendingHandoff = null;
        }

        currentTrack = (index + musicTracks.length) % musicTracks.length;
        const track = musicTracks[currentTrack];

        audio.src = new URL(track.src, document.baseURI).href;
        audio.load();
        titleDisplay.textContent = track.title;
        numberDisplay.textContent = `${String(currentTrack + 1).padStart(2, "0")} / ${String(musicTracks.length).padStart(2, "0")}`;
        statusDisplay.textContent = "LOAD";
        elapsedDisplay.textContent = "0:00";
        durationDisplay.textContent = "0:00";
        progressControl.value = "0";
        trackButtons.forEach((button, trackIndex) => {
            const isCurrent = trackIndex === currentTrack;
            button.classList.toggle("is-current", isCurrent);
            button.setAttribute("aria-current", isCurrent ? "true" : "false");
        });
        storeValue("kb-music-track", String(currentTrack));

        if (shouldPlay) {
            audio.play().catch(() => {
                statusDisplay.textContent = "PRESS PLAY";
            });
        }
    };

    musicLauncher.addEventListener("click", () => {
        setPlayerOpen(musicPlayer.hidden);
    });

    closeButton.addEventListener("click", () => {
        setPlayerOpen(false);
        musicLauncher.focus();
    });

    playButton.addEventListener("click", () => {
        if (audio.paused) {
            audio.play().catch(() => {
                statusDisplay.textContent = "AUDIO ERROR";
            });
        } else {
            audio.pause();
        }
    });

    previousButton.addEventListener("click", () => {
        loadTrack(currentTrack - 1, !audio.paused);
    });

    nextButton.addEventListener("click", () => {
        loadTrack(currentTrack + 1, !audio.paused);
    });

    muteButton.addEventListener("click", () => {
        audio.muted = !audio.muted;
        muteButton.classList.toggle("is-active", audio.muted);
        muteButton.setAttribute("aria-label", audio.muted ? "Unmute" : "Mute");
        muteButton.setAttribute("title", audio.muted ? "Unmute" : "Mute");
        muteButton.textContent = audio.muted ? "MUTED" : "MUTE";
    });

    progressControl.addEventListener("input", () => {
        if (Number.isFinite(audio.duration)) {
            audio.currentTime = Number(progressControl.value);
        }
    });

    volumeControl.addEventListener("input", () => {
        audio.volume = Number(volumeControl.value);
        audio.muted = false;
        muteButton.classList.remove("is-active");
        muteButton.textContent = "MUTE";
        muteButton.setAttribute("aria-label", "Mute");
        muteButton.setAttribute("title", "Mute");
        storeValue("kb-music-volume", String(audio.volume));
    });

    trackButtons.forEach((button) => {
        button.addEventListener("click", () => {
            loadTrack(Number(button.dataset.trackIndex), !audio.paused);
        });
    });

    audio.addEventListener("loadedmetadata", () => {
        progressControl.max = String(audio.duration || 100);
        durationDisplay.textContent = formatTime(audio.duration);

        if (pendingHandoff) {
            const handoff = pendingHandoff;
            pendingHandoff = null;
            const navigationTime = handoff.playing ? Math.max(0, (Date.now() - handoff.savedAt) / 1000) : 0;
            const handedOffTime = Number.isFinite(handoff.currentTime) ? handoff.currentTime + navigationTime : 0;
            const maximumTime = Math.max(0, audio.duration - 0.1);
            audio.currentTime = Math.min(Math.max(0, handedOffTime), maximumTime);
            progressControl.value = String(audio.currentTime);
            elapsedDisplay.textContent = formatTime(audio.currentTime);

            if (handoff.playing) {
                statusDisplay.textContent = "RESUME";
                audio.play().catch(() => {
                    statusDisplay.textContent = "PRESS PLAY";
                });
            } else {
                statusDisplay.textContent = "PAUSE";
            }
        } else {
            statusDisplay.textContent = "READY";
        }
    });

    audio.addEventListener("timeupdate", () => {
        progressControl.value = String(audio.currentTime);
        elapsedDisplay.textContent = formatTime(audio.currentTime);
    });

    audio.addEventListener("play", updatePlayState);
    audio.addEventListener("pause", updatePlayState);
    audio.addEventListener("ended", () => loadTrack(currentTrack + 1, true));
    audio.addEventListener("error", () => {
        statusDisplay.textContent = "AUDIO ERROR";
        updatePlayState();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !musicPlayer.hidden) {
            setPlayerOpen(false);
            musicLauncher.focus();
        }
    });

    window.addEventListener("pagehide", savePlaybackHandoff);
    setPlayerOpen(Boolean(playbackHandoff?.open), false);
    loadTrack(currentTrack, false, true);
}
