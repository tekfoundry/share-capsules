<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Balance Beam Playground</title>
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
            width: min(900px, 100%);
            padding: 20px;
            background: rgba(255, 255, 255, 0.86);
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

        .instructions {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
            margin: 0 0 14px;
        }

        .instruction {
            padding: 10px 12px;
            border: 1px solid #d7e1ec;
            border-radius: 8px;
            background: #f7fafc;
        }

        .instruction strong {
            display: block;
            margin-bottom: 4px;
        }

        .instruction span {
            color: #52677c;
            font-size: 0.94rem;
            line-height: 1.35;
        }

        .beam {
            position: relative;
            height: 220px;
            border: 1px solid #d7e1ec;
            border-radius: 8px;
            overflow: hidden;
            background:
                linear-gradient(90deg, transparent 0 34%, rgba(39, 174, 96, 0.16) 34% 66%, transparent 66%),
                linear-gradient(#eef3f7 1px, transparent 1px),
                linear-gradient(90deg, #eef3f7 1px, transparent 1px),
                #fbfdff;
            background-size: auto, 44px 44px, 44px 44px, auto;
            touch-action: none;
        }

        .safe-zone {
            position: absolute;
            inset: 0 34%;
            border-left: 4px solid #27ae60;
            border-right: 4px solid #27ae60;
            pointer-events: none;
        }

        .tilt-line {
            position: absolute;
            left: 50%;
            top: 12px;
            bottom: 12px;
            width: 4px;
            border-radius: 999px;
            background: #315d9f;
            opacity: 0.72;
            transform: translateX(-50%);
            pointer-events: none;
        }

        .marker {
            position: absolute;
            left: 50%;
            top: 50%;
            width: 54px;
            height: 54px;
            border-radius: 999px;
            background: #f7bd46;
            border: 5px solid #8f6100;
            box-shadow: 0 12px 22px rgba(143, 97, 0, 0.22);
            transform: translate(-50%, -50%);
            transition: box-shadow 120ms ease-out;
        }

        .marker[data-safe="false"] {
            box-shadow: 0 0 0 7px rgba(217, 68, 68, 0.24), 0 12px 22px rgba(143, 97, 0, 0.22);
        }

        .actions button {
            border: 0;
            border-radius: 6px;
            font: inherit;
            font-weight: 850;
            background: #172026;
            color: #ffffff;
            padding: 12px 16px;
            cursor: pointer;
        }

        .actions button.secondary {
            background: #e7eef5;
            color: #172026;
        }

        .actions button[disabled] {
            opacity: 0.45;
            cursor: not-allowed;
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

            .instructions {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
<main data-balance-beam-playground>
    <div class="eyebrow">Challenge Playground</div>
    <h1>Balance Beam</h1>
    <p id="instructions">Keep the marker inside the green zone while the force changes direction.</p>

    <form
        method="POST"
        action="{{ $completionUrl ?? route('ctx.challenge-playground.balance-beam') }}"
        class="board"
        data-board
        data-seed="{{ $seed }}"
        data-force-phase="{{ $forcePhase }}"
        data-force-rate="{{ $forceRate }}"
        data-force-strength="{{ $forceStrength }}"
        data-module-id="{{ $module->challenge_id ?? 'balance_beam' }}"
        data-module-version="{{ $module->module_version ?? 'playground' }}"
        data-input-modes="{{ isset($module) ? implode(',', $module->input_modes ?? []) : 'pointer,touch,keyboard,reduced_motion' }}"
        aria-describedby="instructions assistive-description"
    >
        <input type="hidden" name="elapsed_ms" value="0" data-elapsed>
        <input type="hidden" name="safe_ms" value="0" data-safe-ms>
        <input type="hidden" name="correction_count" value="0" data-correction-count>
        <input type="hidden" name="edge_touch_count" value="0" data-edge-touch-count>
        <input type="hidden" name="input_mode" value="pointer" data-input-mode>

        <p class="sr-only" id="assistive-description">
            Use pointer movement, arrow keys, or motion input to set the tilt and keep the marker near the center safe zone.
        </p>

        <div class="instructions" aria-label="Input instructions">
            <div class="instruction">
                <strong>Mouse or touch</strong>
                <span>Move inside the beam to set the tilt line. The ball rolls with that tilt.</span>
            </div>
            <div class="instruction">
                <strong>Keyboard</strong>
                <span>Hold the left or right arrow key to set the same tilt line.</span>
            </div>
            <div class="instruction">
                <strong>Motion</strong>
                <span>On devices that support it later, tilt gently to correct drift.</span>
            </div>
        </div>

        <div class="meter-row" aria-label="Balance telemetry">
            <div class="meter"><span>Safe Time</span><strong data-safe-label>0%</strong></div>
            <div class="meter"><span>Corrections</span><strong data-corrections-label>0</strong></div>
            <div class="meter"><span>Time</span><strong data-time>20s</strong></div>
            @if ($showLiveScore ?? true)
                <div class="meter"><span>Live score</span><strong data-score>0</strong></div>
            @endif
        </div>

        <div class="beam" data-beam aria-label="Balance area">
            <div class="safe-zone" aria-hidden="true"></div>
            <div class="tilt-line" data-tilt-line aria-hidden="true"></div>
            <div class="marker" data-marker data-safe="true"></div>
        </div>

        <p class="status" role="status" aria-live="polite" data-status>Start the balance run.</p>

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

    const beam = board.querySelector('[data-beam]');
    const marker = board.querySelector('[data-marker]');
    const tiltLine = board.querySelector('[data-tilt-line]');
    const status = board.querySelector('[data-status]');
    const start = board.querySelector('[data-start]');
    const complete = board.querySelector('[data-complete]');
    const reset = board.querySelector('[data-reset]');
    const elapsedField = board.querySelector('[data-elapsed]');
    const safeField = board.querySelector('[data-safe-ms]');
    const correctionField = board.querySelector('[data-correction-count]');
    const edgeField = board.querySelector('[data-edge-touch-count]');
    const inputModeField = board.querySelector('[data-input-mode]');
    const safeLabel = board.querySelector('[data-safe-label]');
    const correctionsLabel = board.querySelector('[data-corrections-label]');
    const timeLabel = board.querySelector('[data-time]');
    const scoreLabel = board.querySelector('[data-score]');

    const durationMs = 20000;
    const safeZoneHalfWidthPct = 16;
    const positionTravelPct = 44;
    const phase = Number(board.dataset.forcePhase ?? 0);
    const rate = Number(board.dataset.forceRate ?? 0.9);
    const strength = Number(board.dataset.forceStrength ?? 0.24) * 0.16;
    const tiltResponse = 0.09;
    let position = 0;
    let velocity = 0;
    let startedAt = null;
    let completedAt = null;
    let lastFrameAt = null;
    let safeMs = 0;
    let corrections = 0;
    let edgeTouches = 0;
    let wasUnsafe = false;
    let mode = 'pointer';
    let frame = null;
    let tilt = 0;
    let targetTilt = 0;
    const heldKeys = new Set();
    let countdownTimer = null;

    const setStatus = (message) => {
        if (status instanceof HTMLElement) status.textContent = message;
    };

    const currentElapsedMs = () => {
        if (startedAt === null) return 0;
        const end = completedAt === null ? performance.now() : completedAt;
        return Math.min(durationMs, Math.round(end - startedAt));
    };

    const liveScore = () => {
        const elapsed = currentElapsedMs();
        if (elapsed < 2500 && elapsed > 0) return 20;
        const ratio = elapsed > 0 ? Math.min(1, safeMs / elapsed) : 0;
        let score = Math.round(ratio * 100) - (edgeTouches * 4);
        if (corrections < 6 && elapsed > 0) score = Math.min(score, 55);
        return Math.max(0, Math.min(100, score));
    };

    const safeRadius = () => {
        if (!(beam instanceof HTMLElement) || !(marker instanceof HTMLElement)) {
            return safeZoneHalfWidthPct / positionTravelPct;
        }

        const beamWidth = beam.getBoundingClientRect().width;
        const markerWidth = marker.getBoundingClientRect().width;
        if (beamWidth <= 0 || markerWidth <= 0) {
            return safeZoneHalfWidthPct / positionTravelPct;
        }

        const markerRadiusPct = (markerWidth / 2 / beamWidth) * 100;

        return (safeZoneHalfWidthPct + markerRadiusPct) / positionTravelPct;
    };

    const updateMarker = () => {
        if (!(marker instanceof HTMLElement)) return;
        marker.style.left = `${50 + position * positionTravelPct}%`;
        const safe = Math.abs(position) <= safeRadius();
        marker.dataset.safe = safe ? 'true' : 'false';
        if (!safe && !wasUnsafe) edgeTouches += 1;
        wasUnsafe = !safe;
        if (tiltLine instanceof HTMLElement) {
            tiltLine.style.left = `${50 + tilt * 28}%`;
        }
    };

    const updateFields = () => {
        const elapsed = currentElapsedMs();
        if (elapsedField instanceof HTMLInputElement) elapsedField.value = String(elapsed);
        if (safeField instanceof HTMLInputElement) safeField.value = String(Math.round(safeMs));
        if (correctionField instanceof HTMLInputElement) correctionField.value = String(corrections);
        if (edgeField instanceof HTMLInputElement) edgeField.value = String(edgeTouches);
        if (inputModeField instanceof HTMLInputElement) inputModeField.value = mode;
        if (safeLabel instanceof HTMLElement) safeLabel.textContent = `${elapsed > 0 ? Math.round((safeMs / elapsed) * 100) : 0}%`;
        if (correctionsLabel instanceof HTMLElement) correctionsLabel.textContent = String(corrections);
        if (timeLabel instanceof HTMLElement) timeLabel.textContent = `${Math.max(0, Math.ceil((durationMs - elapsed) / 1000))}s`;
        if (scoreLabel instanceof HTMLElement) scoreLabel.textContent = String(liveScore());
        if (complete instanceof HTMLButtonElement) complete.disabled = startedAt === null;
    };

    const stopRun = () => {
        if (frame !== null) window.cancelAnimationFrame(frame);
        if (countdownTimer !== null) window.clearInterval(countdownTimer);
        frame = null;
        countdownTimer = null;
        lastFrameAt = null;
    };

    const finish = () => {
        if (startedAt !== null && completedAt === null) completedAt = startedAt + durationMs;
        stopRun();
        setStatus('Time is up. Complete the check when ready.');
        updateFields();
    };

    const tick = (now) => {
        if (startedAt === null || completedAt !== null) return;
        if (lastFrameAt === null) lastFrameAt = now;
        const deltaMs = Math.min(80, now - lastFrameAt);
        lastFrameAt = now;

        const elapsed = currentElapsedMs();
        const seconds = elapsed / 1000;
        const ramp = Math.min(1, elapsed / 2200);
        const force = Math.sin((seconds * rate) + phase) * strength * ramp;
        tilt += (targetTilt - tilt) * tiltResponse;
        velocity += (force + (tilt * 0.58)) * (deltaMs / 1000);
        velocity *= 0.9;
        if (Math.abs(position) > 0.74 && Math.sign(velocity) === Math.sign(position)) {
            velocity *= 0.55;
        }
        position = Math.max(-1, Math.min(1, position + velocity));

        if (Math.abs(position) <= safeRadius()) safeMs += deltaMs;
        updateMarker();
        updateFields();

        if (elapsed >= durationMs) {
            finish();
            return;
        }

        frame = window.requestAnimationFrame(tick);
    };

    const steerToPointer = (event) => {
        if (!(beam instanceof HTMLElement) || startedAt === null || completedAt !== null) return;
        const rect = beam.getBoundingClientRect();
        const relative = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        targetTilt = Math.max(-0.8, Math.min(0.8, relative));
        mode = event.pointerType === 'touch' ? 'touch' : 'pointer';
        corrections += 1;
        setStatus(targetTilt < 0 ? 'Tilting left.' : 'Tilting right.');
        updateFields();
    };

    const updateKeyboardSteering = () => {
        if (startedAt === null || completedAt !== null) return;
        const left = heldKeys.has('ArrowLeft');
        const right = heldKeys.has('ArrowRight');
        if (left === right) {
            targetTilt = 0;
            return;
        }

        targetTilt = left ? -0.68 : 0.68;
        mode = 'keyboard';
        corrections += 1;
        setStatus(left ? 'Tilting left.' : 'Tilting right.');
        updateFields();
    };

    const beginPhysics = () => {
        startedAt = performance.now();
        completedAt = null;
        lastFrameAt = null;
        setStatus('Keep the marker inside the green zone.');
        updateFields();
        frame = window.requestAnimationFrame(tick);
    };

    const startRun = () => {
        stopRun();
        startedAt = null;
        completedAt = null;
        lastFrameAt = null;
        position = 0;
        velocity = 0;
        tilt = 0;
        targetTilt = 0;
        heldKeys.clear();
        safeMs = 0;
        corrections = 0;
        edgeTouches = 0;
        wasUnsafe = false;
        mode = 'pointer';
        let remaining = 3;
        setStatus(`Get ready: ${remaining}`);
        updateMarker();
        updateFields();
        countdownTimer = window.setInterval(() => {
            remaining -= 1;
            if (remaining > 0) {
                setStatus(`Get ready: ${remaining}`);
                return;
            }

            if (countdownTimer !== null) window.clearInterval(countdownTimer);
            countdownTimer = null;
            beginPhysics();
        }, 1000);
    };

    const resetRun = () => {
        stopRun();
        startedAt = null;
        completedAt = null;
        position = 0;
        velocity = 0;
        tilt = 0;
        targetTilt = 0;
        heldKeys.clear();
        safeMs = 0;
        corrections = 0;
        edgeTouches = 0;
        wasUnsafe = false;
        mode = 'pointer';
        setStatus('Start the balance run.');
        updateMarker();
        updateFields();
    };

    board.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            if (!heldKeys.has(event.key)) {
                heldKeys.add(event.key);
                updateKeyboardSteering();
            }
        }
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            if (!heldKeys.has(event.key)) {
                heldKeys.add(event.key);
                updateKeyboardSteering();
            }
        }
    });
    board.addEventListener('keyup', (event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            heldKeys.delete(event.key);
            updateKeyboardSteering();
        }
    });
    if (beam instanceof HTMLElement) {
        beam.addEventListener('pointerdown', steerToPointer);
        beam.addEventListener('pointermove', steerToPointer);
        beam.addEventListener('pointerleave', () => {
            if (mode !== 'keyboard') targetTilt = 0;
        });
    }
    if (start instanceof HTMLButtonElement) start.addEventListener('click', startRun);
    if (reset instanceof HTMLButtonElement) reset.addEventListener('click', resetRun);
    if (complete instanceof HTMLButtonElement) {
        complete.addEventListener('click', () => {
            if (completedAt === null) completedAt = performance.now();
            stopRun();
            setStatus(`Completed with score ${liveScore()}.`);
            updateFields();
        });
    }
    board.addEventListener('submit', updateFields);
    resetRun();
})();
</script>
</body>
</html>
