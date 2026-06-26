<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Memory Path Playground</title>
    <style>
        :root {
            color-scheme: light;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #172026;
            background: #eef2f7;
        }

        body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 24px;
        }

        main {
            width: min(860px, 100%);
            padding: 20px;
            background: rgba(255, 255, 255, 0.84);
            border: 1px solid #ccd8e6;
            border-radius: 8px;
            box-shadow: 0 18px 50px rgba(23, 32, 38, 0.08);
        }

        .eyebrow {
            color: #315d9f;
            font-size: 0.78rem;
            font-weight: 900;
            letter-spacing: 0.18em;
            text-transform: uppercase;
        }

        h1 {
            margin: 10px 0 0;
            font-size: clamp(1.7rem, 4vw, 2.35rem);
            line-height: 1.05;
        }

        p {
            line-height: 1.55;
        }

        .board {
            margin-top: 22px;
            padding: 18px;
            background: #ffffff;
            border: 1px solid #ccd8e6;
            border-radius: 8px;
        }

        .meter-row {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
            margin-bottom: 14px;
        }

        .meter {
            min-height: 62px;
            padding: 10px 12px;
            border: 1px solid #d7e1ec;
            border-radius: 8px;
            background: #f7fafc;
        }

        .meter span {
            display: block;
            color: #577084;
            font-size: 0.78rem;
            font-weight: 900;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        .meter strong {
            display: block;
            margin-top: 5px;
            font-size: 1.35rem;
            line-height: 1;
        }

        .pad-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(110px, 1fr));
            gap: 12px;
            max-width: 440px;
            margin: 0 auto;
        }

        .pad,
        .actions button,
        .actions a {
            border: 0;
            border-radius: 6px;
            font: inherit;
            font-weight: 850;
        }

        .pad {
            min-height: 112px;
            color: #ffffff;
            cursor: pointer;
            text-indent: -999px;
            overflow: hidden;
            box-shadow: inset 0 -8px 0 rgba(0, 0, 0, 0.18);
            opacity: 0.9;
            transition: background 120ms ease-out, transform 120ms ease-out, opacity 120ms ease-out, box-shadow 120ms ease-out;
        }

        .pad[data-color="red"] { background: #ff9999; }
        .pad[data-color="yellow"] { background: #fff0aa; }
        .pad[data-color="blue"] { background: #9bc6ff; }
        .pad[data-color="green"] { background: #9ee8bd; }

        .pad[data-color="red"][data-active="true"],
        .pad[data-color="red"]:active { background: #ff0000; }

        .pad[data-color="yellow"][data-active="true"],
        .pad[data-color="yellow"]:active { background: #ffcc00; }

        .pad[data-color="blue"][data-active="true"],
        .pad[data-color="blue"]:active { background: #0055ff; }

        .pad[data-color="green"][data-active="true"],
        .pad[data-color="green"]:active { background: #00b140; }

        .pad[data-active="true"],
        .pad:active {
            opacity: 1;
            transform: translateY(2px) scale(0.98);
            box-shadow: 0 0 0 5px rgba(36, 93, 255, 0.22), inset 0 -3px 0 rgba(0, 0, 0, 0.18);
        }

        .pad[data-mistake="true"] {
            box-shadow: 0 0 0 5px rgba(217, 68, 68, 0.26), inset 0 -8px 0 rgba(0, 0, 0, 0.18);
        }

        .pad:focus-visible,
        .actions button:focus-visible,
        .actions a:focus-visible {
            outline: 4px solid #245dff;
            outline-offset: 2px;
        }

        .status {
            min-height: 28px;
            margin-top: 16px;
            font-weight: 800;
        }

        .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 20px;
        }

        .actions button,
        .actions a {
            background: #172026;
            color: #ffffff;
            padding: 12px 16px;
            text-decoration: none;
            cursor: pointer;
        }

        .actions a.secondary,
        .actions button.secondary {
            background: #e7eef5;
            color: #172026;
        }

        .actions button[disabled] {
            opacity: 0.45;
            cursor: not-allowed;
        }

        .pad[disabled] {
            cursor: not-allowed;
        }

        .pad[data-game-over="true"] {
            opacity: 0.45;
            filter: grayscale(0.35);
        }

        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }

        @media (max-width: 620px) {
            body {
                padding: 14px;
            }

            main,
            .board {
                padding: 14px;
            }

            .meter-row {
                grid-template-columns: 1fr 1fr;
            }
        }
    </style>
</head>
<body>
<main data-memory-path-playground>
    <div class="eyebrow">Challenge Playground</div>
    <h1>Memory Path</h1>
    <p id="instructions">Watch the colors, then repeat the growing sequence before time runs out.</p>

    <form
        method="POST"
        action="{{ $completionUrl ?? route('ctx.challenge-playground.memory-path') }}"
        class="board"
        data-board
        data-seed="{{ $seed }}"
        data-sequence='@json($memorySequence)'
        data-module-id="{{ $module->challenge_id ?? 'memory_path' }}"
        data-module-version="{{ $module->module_version ?? 'playground' }}"
        data-input-modes="{{ isset($module) ? implode(',', $module->input_modes ?? []) : 'pointer,touch,keyboard,reduced_motion' }}"
        aria-describedby="instructions assistive-description"
    >
        <input type="hidden" name="elapsed_ms" value="0" data-elapsed>
        <input type="hidden" name="sequence_length" value="0" data-sequence-length>
        <input type="hidden" name="correct_count" value="0" data-correct-field>
        <input type="hidden" name="mistake_count" value="0" data-mistake-field>
        <input type="hidden" name="replay_count" value="0" data-replay-field>
        <input type="hidden" name="input_mode" value="pointer" data-input-mode>

        <p class="sr-only" id="assistive-description">
            The computer plays a color sequence. Repeat it using the four color controls. A mistake repeats the same sequence.
        </p>

        <div class="meter-row" aria-label="Memory telemetry">
            <div class="meter"><span>Level</span><strong data-progress>0</strong></div>
            <div class="meter"><span>Mistakes</span><strong data-mistakes>0</strong></div>
            <div class="meter"><span>Time</span><strong data-time>30s</strong></div>
            @if ($showLiveScore ?? true)
                <div class="meter"><span>Live score</span><strong data-score>0</strong></div>
            @endif
        </div>

        <div class="pad-grid" aria-label="Color controls">
            @foreach (['red', 'yellow', 'blue', 'green'] as $color)
                <button class="pad" type="button" data-color="{{ $color }}">{{ ucfirst($color) }}</button>
            @endforeach
        </div>

        <p class="status" role="status" aria-live="polite" data-status>Start the sequence.</p>

        <div class="actions">
            <button type="button" data-start>Start</button>
            <button type="{{ isset($completionUrl) ? 'submit' : 'button' }}" disabled data-complete>Complete check</button>
            <button class="secondary" type="button" data-reset>Play Again</button>
        </div>
    </form>
</main>

<script>
(() => {
    const board = document.querySelector('[data-board]');
    if (!(board instanceof HTMLFormElement)) return;

    const seedSequence = JSON.parse(board.dataset.sequence ?? '[]');
    let sequence = [...seedSequence];
    const pads = [...board.querySelectorAll('[data-color]')];
    const status = board.querySelector('[data-status]');
    const start = board.querySelector('[data-start]');
    const complete = board.querySelector('[data-complete]');
    const reset = board.querySelector('[data-reset]');
    const elapsed = board.querySelector('[data-elapsed]');
    const sequenceLengthField = board.querySelector('[data-sequence-length]');
    const correctField = board.querySelector('[data-correct-field]');
    const mistakeField = board.querySelector('[data-mistake-field]');
    const replayField = board.querySelector('[data-replay-field]');
    const inputMode = board.querySelector('[data-input-mode]');
    const progressLabel = board.querySelector('[data-progress]');
    const mistakesLabel = board.querySelector('[data-mistakes]');
    const timeLabel = board.querySelector('[data-time]');
    const scoreLabel = board.querySelector('[data-score]');

    const durationMs = 30000;
    let startedAt = null;
    let completedAt = null;
    let level = 0;
    let inputIndex = 0;
    let mistakes = 0;
    let replays = 0;
    let mode = 'pointer';
    let showing = false;
    let timer = null;
    let runToken = 0;
    let pendingPlaybackTimeout = null;

    const setStatus = (message) => {
        if (status instanceof HTMLElement) status.textContent = message;
    };

    const currentElapsedMs = () => {
        if (startedAt === null) return 0;
        const end = completedAt === null ? performance.now() : completedAt;
        return Math.min(durationMs, Math.round(end - startedAt));
    };

    const remainingSeconds = () => Math.max(0, Math.ceil((durationMs - currentElapsedMs()) / 1000));

    const liveScore = () => {
        if (currentElapsedMs() < 1200 && level > 2) return 20;
        return Math.max(0, Math.min(100, (level * 20) - (mistakes * 10)));
    };

    const randomColor = () => {
        const colors = ['red', 'yellow', 'blue', 'green'];
        const bytes = new Uint32Array(1);
        if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
            window.crypto.getRandomValues(bytes);
            return colors[bytes[0] % colors.length];
        }

        return colors[Math.floor(Math.random() * colors.length)];
    };

    const randomSequence = () => {
        const next = [];
        for (let index = 0; index < Math.max(32, seedSequence.length); index += 1) {
            next.push(randomColor());
        }

        return next;
    };

    const setPadsEnabled = (enabled) => {
        for (const pad of pads) {
            if (pad instanceof HTMLButtonElement) pad.disabled = !enabled;
        }
    };

    const setGameOver = (isGameOver) => {
        for (const pad of pads) {
            if (pad instanceof HTMLElement) pad.dataset.gameOver = isGameOver ? 'true' : 'false';
        }
    };

    const clearPendingPlaybackTimeout = () => {
        if (pendingPlaybackTimeout !== null) {
            window.clearTimeout(pendingPlaybackTimeout);
            pendingPlaybackTimeout = null;
        }
    };

    const clearActivePads = () => {
        for (const pad of pads) {
            if (pad instanceof HTMLElement) pad.dataset.active = 'false';
        }
    };

    const stopPlayback = () => {
        runToken += 1;
        showing = false;
        clearPendingPlaybackTimeout();
        clearActivePads();
    };

    const updateFields = () => {
        if (elapsed instanceof HTMLInputElement) elapsed.value = String(currentElapsedMs());
        if (sequenceLengthField instanceof HTMLInputElement) sequenceLengthField.value = String(Math.max(1, level));
        if (correctField instanceof HTMLInputElement) correctField.value = String(level);
        if (mistakeField instanceof HTMLInputElement) mistakeField.value = String(mistakes);
        if (replayField instanceof HTMLInputElement) replayField.value = String(replays);
        if (inputMode instanceof HTMLInputElement) inputMode.value = mode;
        if (progressLabel instanceof HTMLElement) progressLabel.textContent = String(level);
        if (mistakesLabel instanceof HTMLElement) mistakesLabel.textContent = String(mistakes);
        if (timeLabel instanceof HTMLElement) timeLabel.textContent = `${remainingSeconds()}s`;
        if (scoreLabel instanceof HTMLElement) scoreLabel.textContent = String(liveScore());
        if (complete instanceof HTMLButtonElement) complete.disabled = startedAt === null;
    };

    const finishIfExpired = () => {
        if (startedAt !== null && completedAt === null && currentElapsedMs() >= durationMs) {
            completedAt = startedAt + durationMs;
            stopPlayback();
            setPadsEnabled(false);
            setGameOver(true);
            setStatus('Time is up. Complete the check when ready.');
            if (timer !== null) window.clearInterval(timer);
        }
        updateFields();
    };

    const flash = async (color) => {
        const pad = pads.find((candidate) => candidate instanceof HTMLElement && candidate.dataset.color === color);
        if (!(pad instanceof HTMLElement)) return;
        pad.dataset.active = 'true';
        setStatus(color);
        await new Promise((resolve) => {
            pendingPlaybackTimeout = window.setTimeout(resolve, 430);
        });
        pendingPlaybackTimeout = null;
        pad.dataset.active = 'false';
        await new Promise((resolve) => {
            pendingPlaybackTimeout = window.setTimeout(resolve, 140);
        });
        pendingPlaybackTimeout = null;
    };

    const showSequence = async () => {
        if (showing || completedAt !== null) return;
        const token = runToken;
        showing = true;
        setPadsEnabled(false);
        replays += 1;
        updateFields();
        setStatus(`Watch level ${level + 1}.`);
        for (let index = 0; index <= level; index += 1) {
            if (token !== runToken || completedAt !== null) return;
            await flash(sequence[index]);
        }
        if (token !== runToken || completedAt !== null) return;
        inputIndex = 0;
        showing = false;
        setPadsEnabled(true);
        setStatus('Repeat the colors.');
    };

    const startRun = () => {
        if (startedAt !== null) return;
        startedAt = performance.now();
        completedAt = null;
        sequence = randomSequence();
        level = 0;
        inputIndex = 0;
        mistakes = 0;
        replays = 0;
        mode = 'pointer';
        timer = window.setInterval(finishIfExpired, 250);
        setGameOver(false);
        showSequence();
        updateFields();
    };

    const choose = (color) => {
        if (showing || startedAt === null || completedAt !== null) return;
        if (color === sequence[inputIndex]) {
            inputIndex += 1;
            if (inputIndex > level) {
                level += 1;
                setStatus('Correct. Watch the next level.');
                updateFields();
                window.setTimeout(showSequence, 360);
                return;
            }
            setStatus('Correct. Continue.');
        } else {
            mistakes += 1;
            inputIndex = 0;
            setStatus('Mistake. Watch that level again.');
            for (const pad of pads) {
                if (pad instanceof HTMLElement) pad.dataset.mistake = 'true';
            }
            window.setTimeout(() => {
                for (const pad of pads) {
                    if (pad instanceof HTMLElement) pad.dataset.mistake = 'false';
                }
                showSequence();
            }, 420);
        }
        updateFields();
        finishIfExpired();
    };

    const resetRun = () => {
        if (timer !== null) window.clearInterval(timer);
        stopPlayback();
        startedAt = null;
        completedAt = null;
        level = 0;
        inputIndex = 0;
        mistakes = 0;
        replays = 0;
        mode = 'pointer';
        timer = null;
        setPadsEnabled(false);
        setGameOver(false);
        setStatus('Start the sequence.');
        updateFields();
    };

    board.addEventListener('pointerdown', (event) => {
        const target = event.target instanceof Element ? event.target.closest('[data-color]') : null;
        if (target instanceof HTMLElement) mode = event.pointerType === 'touch' ? 'touch' : 'pointer';
    });
    board.addEventListener('keydown', (event) => {
        const target = event.target instanceof Element ? event.target.closest('[data-color]') : null;
        if (target instanceof HTMLElement) mode = 'keyboard';
    });
    for (const pad of pads) {
        pad.addEventListener('click', () => choose(pad.dataset.color));
    }
    if (start instanceof HTMLButtonElement) start.addEventListener('click', startRun);
    if (reset instanceof HTMLButtonElement) reset.addEventListener('click', resetRun);
    if (complete instanceof HTMLButtonElement) {
        complete.addEventListener('click', () => {
            if (completedAt === null) completedAt = performance.now();
            stopPlayback();
            if (timer !== null) window.clearInterval(timer);
            setPadsEnabled(false);
            setGameOver(true);
            finishIfExpired();
            setStatus(`Completed with score ${liveScore()}.`);
        });
    }
    board.addEventListener('submit', updateFields);
    resetRun();
})();
</script>
</body>
</html>
