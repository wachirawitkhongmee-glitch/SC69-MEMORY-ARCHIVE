/**
 * MEMORY MIRROR SC69 — Music Player & Sound Engine
 * Handles "หัวใจผูกกัน - Acoustic" playback, uninterrupted SPA continuity,
 * YouTube IFrame Player integration (DA_JjHpVRRY), local MP3 playback,
 * graceful acoustic chord synth fallback, and tactile vintage UI sound FX.
 */

const SoundEngine = (function () {
    const AUDIO_PATH = APP_CONFIG.songPath;
    const SONG_TITLE = APP_CONFIG.songTitle;
    const YOUTUBE_ID = APP_CONFIG.youtubeVideoId || "DA_JjHpVRRY";

    let audioElement = null;
    let audioContext = null;
    let synthInterval = null;
    let ytPlayer = null;
    let isYtReady = false;
    let isUsingYouTube = false;
    let pendingYtPlay = false;

    let isPlaying = false;
    let isMuted = false;
    let hasStartedOnce = false;
    let usingFallbackSynth = false;
    let fileNotFound = false;

    // Callbacks for UI updates
    const listeners = [];

    function notifyState() {
        const state = {
            isPlaying,
            isMuted,
            hasStartedOnce,
            usingFallbackSynth,
            isUsingYouTube,
            fileNotFound,
            songTitle: SONG_TITLE,
            audioPath: AUDIO_PATH,
            youtubeVideoId: YOUTUBE_ID,
            youtubeUrl: `https://www.youtube.com/watch?v=${YOUTUBE_ID}`
        };
        listeners.forEach(fn => {
            try { fn(state); } catch (e) { console.error(e); }
        });
    }

    function onStateChange(callback) {
        listeners.push(callback);
        callback({
            isPlaying,
            isMuted,
            hasStartedOnce,
            usingFallbackSynth,
            isUsingYouTube,
            fileNotFound,
            songTitle: SONG_TITLE,
            audioPath: AUDIO_PATH,
            youtubeVideoId: YOUTUBE_ID,
            youtubeUrl: `https://www.youtube.com/watch?v=${YOUTUBE_ID}`
        });
    }

    function getAudioContext() {
        if (!audioContext) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                audioContext = new AudioContextClass();
            }
        }
        if (audioContext && audioContext.state === "suspended") {
            audioContext.resume();
        }
        return audioContext;
    }

    // Initialize YouTube Iframe API
    function initYouTubePlayer() {
        // Create hidden player container
        let ytContainer = document.getElementById("ytAudioContainer");
        if (!ytContainer) {
            ytContainer = document.createElement("div");
            ytContainer.id = "ytAudioContainer";
            ytContainer.style.cssText = "position:fixed;bottom:-999px;right:-999px;width:1px;height:1px;opacity:0.001;pointer-events:none;z-index:-10;";
            document.body.appendChild(ytContainer);
        }

        function createPlayer() {
            try {
                ytPlayer = new window.YT.Player("ytAudioContainer", {
                    height: "120",
                    width: "160",
                    videoId: YOUTUBE_ID,
                    playerVars: {
                        autoplay: 0,
                        controls: 0,
                        loop: 1,
                        playlist: YOUTUBE_ID,
                        playsinline: 1,
                        rel: 0,
                        enablejsapi: 1
                    },
                    events: {
                        onReady: () => {
                            isYtReady = true;
                            if (isMuted && ytPlayer && ytPlayer.mute) {
                                ytPlayer.mute();
                            }
                            if (pendingYtPlay) {
                                pendingYtPlay = false;
                                playYouTube();
                            }
                        },
                        onStateChange: (event) => {
                            // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
                            if (event.data === 1) {
                                isPlaying = true;
                                isUsingYouTube = true;
                                stopFallbackSynth();
                                if (audioElement) audioElement.pause();
                                notifyState();
                            } else if (event.data === 2) {
                                isPlaying = false;
                                notifyState();
                            } else if (event.data === 0) {
                                if (ytPlayer && ytPlayer.playVideo) {
                                    ytPlayer.playVideo();
                                }
                            }
                        },
                        onError: (err) => {
                            console.log("[SoundEngine] YouTube player notice; utilizing audio/synth", err);
                            isUsingYouTube = false;
                            if (hasStartedOnce && !isPlaying) {
                                playLocalAudioOrSynth();
                            }
                        }
                    }
                });
            } catch (e) {
                console.warn("[SoundEngine] Failed to create YT.Player:", e);
            }
        }

        if (window.YT && window.YT.Player) {
            createPlayer();
        } else {
            // Load YouTube API script
            if (!document.getElementById("ytApiScript")) {
                const tag = document.createElement("script");
                tag.id = "ytApiScript";
                tag.src = "https://www.youtube.com/iframe_api";
                const firstScript = document.getElementsByTagName("script")[0];
                if (firstScript && firstScript.parentNode) {
                    firstScript.parentNode.insertBefore(tag, firstScript);
                } else {
                    document.head.appendChild(tag);
                }
            }

            const prevReady = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = function () {
                if (typeof prevReady === "function") prevReady();
                createPlayer();
            };
        }
    }

    // Initialize HTML5 Audio Element (as secondary/offline fallback)
    function init() {
        if (!audioElement) {
            audioElement = new Audio();
            audioElement.src = AUDIO_PATH;
            audioElement.loop = true;
            audioElement.preload = "auto";

            audioElement.addEventListener("play", () => {
                if (!isUsingYouTube) {
                    isPlaying = true;
                    stopFallbackSynth();
                    notifyState();
                }
            });

            audioElement.addEventListener("pause", () => {
                if (!isUsingYouTube && !usingFallbackSynth) {
                    isPlaying = false;
                    notifyState();
                }
            });

            audioElement.addEventListener("error", () => {
                fileNotFound = true;
                if (!isUsingYouTube && hasStartedOnce && !isPlaying) {
                    startFallbackSynth();
                }
                notifyState();
            });
        }

        // Initialize YouTube audio player
        if (typeof document !== "undefined") {
            initYouTubePlayer();
        }
    }

    function playYouTube() {
        if (ytPlayer && ytPlayer.playVideo) {
            try {
                if (isMuted && ytPlayer.mute) ytPlayer.mute();
                ytPlayer.playVideo();
                isUsingYouTube = true;
                isPlaying = true;
                stopFallbackSynth();
                if (audioElement) audioElement.pause();
                notifyState();
                return true;
            } catch (e) {
                console.warn("[SoundEngine] playYouTube error:", e);
                return false;
            }
        }
        return false;
    }

    function playLocalAudioOrSynth() {
        const ctx = getAudioContext();
        if (audioElement && !fileNotFound) {
            const playPromise = audioElement.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    isPlaying = true;
                    usingFallbackSynth = false;
                    notifyState();
                }).catch(() => {
                    startFallbackSynth();
                });
                return;
            }
        }
        startFallbackSynth();
    }

    // Start playback upon user interaction (OPEN LETTER)
    function startOnOpenLetter() {
        init();
        getAudioContext();
        hasStartedOnce = true;

        // Try YouTube first (user provided DA_JjHpVRRY)
        if (isYtReady && ytPlayer) {
            const started = playYouTube();
            if (!started) playLocalAudioOrSynth();
        } else {
            pendingYtPlay = true;
            // Play gentle chord synth / local audio while YouTube player finishes loading
            playLocalAudioOrSynth();
        }
    }

    function togglePlay() {
        if (!hasStartedOnce) {
            startOnOpenLetter();
            return;
        }

        if (isPlaying) {
            pause();
        } else {
            resume();
        }
    }

    function pause() {
        if (isUsingYouTube && ytPlayer && ytPlayer.pauseVideo) {
            try { ytPlayer.pauseVideo(); } catch (e) {}
        }
        if (audioElement && !usingFallbackSynth) {
            audioElement.pause();
        }
        if (usingFallbackSynth) {
            stopFallbackSynth();
        }
        isPlaying = false;
        notifyState();
    }

    function resume() {
        getAudioContext();
        if (isUsingYouTube && ytPlayer && ytPlayer.playVideo) {
            playYouTube();
            return;
        }

        if (isYtReady && ytPlayer) {
            playYouTube();
            return;
        }

        if (fileNotFound || usingFallbackSynth) {
            startFallbackSynth();
        } else if (audioElement) {
            audioElement.play().then(() => {
                isPlaying = true;
                notifyState();
            }).catch(() => {
                startFallbackSynth();
            });
        }
    }

    function toggleMute() {
        isMuted = !isMuted;
        if (ytPlayer) {
            try {
                if (isMuted && ytPlayer.mute) ytPlayer.mute();
                if (!isMuted && ytPlayer.unMute) ytPlayer.unMute();
            } catch (e) {}
        }
        if (audioElement) {
            audioElement.muted = isMuted;
        }
        notifyState();
    }

    /**
     * Gentle Web Audio Acoustic Guitar / Lullaby Synthesizer Fallback
     * Emulates warm acoustic arpeggios of "หัวใจผูกกัน" chord progression
     */
    function startFallbackSynth() {
        const ctx = getAudioContext();
        if (!ctx) return;

        usingFallbackSynth = true;
        isPlaying = true;
        notifyState();

        if (synthInterval) clearInterval(synthInterval);

        const chords = [
            [261.63, 329.63, 392.00, 493.88], // C, E, G, B
            [246.94, 293.66, 392.00, 493.88], // B, D, G, B
            [220.00, 261.63, 329.63, 392.00], // A, C, E, G
            [174.61, 261.63, 329.63, 349.23]  // F, C, E, F
        ];

        let chordIndex = 0;
        let noteIndex = 0;

        function playPluck(freq, timeOffset = 0) {
            if (isMuted || !isPlaying || isUsingYouTube) return;
            try {
                const now = ctx.currentTime + timeOffset;

                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();

                osc1.type = "sine";
                osc1.frequency.setValueAtTime(freq, now);

                osc2.type = "triangle";
                osc2.frequency.setValueAtTime(freq * 2, now);

                filter.type = "lowpass";
                filter.frequency.setValueAtTime(900, now);
                filter.frequency.exponentialRampToValueAtTime(300, now + 1.2);

                gain.gain.setValueAtTime(0.0001, now);
                gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

                osc1.connect(filter);
                osc2.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                osc1.start(now);
                osc2.start(now);
                osc1.stop(now + 1.6);
                osc2.stop(now + 1.6);
            } catch (e) {
                console.warn(e);
            }
        }

        synthInterval = setInterval(() => {
            if (!isPlaying || isUsingYouTube) return;
            const currentChord = chords[chordIndex];
            const freq = currentChord[noteIndex % currentChord.length];
            playPluck(freq, 0);

            noteIndex++;
            if (noteIndex >= currentChord.length) {
                noteIndex = 0;
                chordIndex = (chordIndex + 1) % chords.length;
            }
        }, 550);
    }

    function stopFallbackSynth() {
        if (synthInterval) {
            clearInterval(synthInterval);
            synthInterval = null;
        }
        usingFallbackSynth = false;
    }

    /**
     * Tactile Vintage Sound FX
     */
    function playWaxSealBreakSound() {
        const ctx = getAudioContext();
        if (!ctx || isMuted) return;
        try {
            const now = ctx.currentTime;
            const bufferSize = ctx.sampleRate * 0.12;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = "bandpass";
            filter.frequency.value = 1600;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            noise.start(now);
        } catch (e) {}
    }

    function playPaperRustleSound() {
        const ctx = getAudioContext();
        if (!ctx || isMuted) return;
        try {
            const now = ctx.currentTime;
            const bufferSize = ctx.sampleRate * 0.25;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.value = 800;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.09, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            noise.start(now);
        } catch (e) {}
    }

    function playStampThudSound() {
        const ctx = getAudioContext();
        if (!ctx || isMuted) return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "triangle";
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(45, now + 0.15);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.2);
        } catch (e) {}
    }

    return {
        init,
        startOnOpenLetter,
        togglePlay,
        pause,
        resume,
        toggleMute,
        onStateChange,
        playWaxSealBreakSound,
        playPaperRustleSound,
        playStampThudSound
    };
})();

if (typeof window !== "undefined") {
    window.SoundEngine = SoundEngine;
}
