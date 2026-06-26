<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Circuit Trace</title>
    <style>
        :root {
            color-scheme: light;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #172026;
            background: #edf3f6;
        }

        body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 24px;
        }

        main {
            width: min(820px, 100%);
        }

        .shell {
            padding: 20px;
            background: rgba(255, 255, 255, 0.72);
            border: 1px solid #c8d7df;
            border-radius: 8px;
            box-shadow: 0 18px 50px rgba(23, 32, 38, 0.08);
        }

        .shell-header {
            display: grid;
            gap: 12px;
        }

        .eyebrow {
            color: #315d9f;
            font-size: 0.78rem;
            font-weight: 900;
            letter-spacing: 0.18em;
            text-transform: uppercase;
        }

        h1 {
            margin: 0;
            font-size: clamp(1.7rem, 4vw, 2.35rem);
            line-height: 1.05;
        }

        h2 {
            margin: 0;
            font-size: 1.2rem;
        }

        p {
            line-height: 1.55;
        }

        .module-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin: 16px 0 0;
            padding: 0;
            list-style: none;
        }

        .module-pill {
            display: inline-flex;
            align-items: center;
            min-height: 34px;
            padding: 7px 10px;
            border: 1px solid #c8d7df;
            border-radius: 999px;
            background: #f7fafb;
            color: #55707f;
            font-size: 0.82rem;
            font-weight: 800;
        }

        .module-pill[aria-current="step"] {
            border-color: #245dff;
            color: #172026;
            background: #eef4ff;
        }

        .board {
            margin-top: 22px;
            padding: 18px;
            background: #ffffff;
            border: 1px solid #c8d7df;
            border-radius: 8px;
            box-shadow: 0 18px 50px rgba(23, 32, 38, 0.1);
        }

        .meter-row {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
            margin-bottom: 14px;
        }

        .meter {
            min-height: 62px;
            padding: 10px 12px;
            border: 1px solid #d5e0e5;
            border-radius: 8px;
            background: #f7fafb;
        }

        .meter span {
            display: block;
            color: #55707f;
            font-size: 0.78rem;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        .meter strong {
            display: block;
            margin-top: 5px;
            font-size: 1.35rem;
            line-height: 1;
        }

        .trace-wrap {
            position: relative;
            border: 1px solid #d5e0e5;
            border-radius: 8px;
            overflow: hidden;
            background:
                linear-gradient(90deg, rgba(23, 32, 38, 0.045) 1px, transparent 1px),
                linear-gradient(rgba(23, 32, 38, 0.045) 1px, transparent 1px),
                #f8fbfb;
            background-size: 34px 34px;
            touch-action: none;
        }

        .trace-board {
            display: block;
            width: 100%;
            height: auto;
            min-height: 300px;
            outline: none;
            cursor: crosshair;
        }

        .trace-board:focus-visible {
            outline: 4px solid #245dff;
            outline-offset: -4px;
        }

        .trace-wall {
            fill: none;
            stroke: #23313a;
            stroke-width: var(--trace-wall-width, 74);
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        .trace-safe {
            fill: none;
            stroke: #f8fbfb;
            stroke-width: var(--trace-safe-width, 58);
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        .trace-center {
            fill: none;
            stroke: #28a1a8;
            stroke-width: 4;
            stroke-dasharray: 8 14;
            stroke-linecap: round;
            opacity: 0.75;
        }

        .trace-progress {
            fill: none;
            stroke: #26b36f;
            stroke-width: 9;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-dasharray: var(--dash, 0) var(--gap, 999);
            filter: drop-shadow(0 0 8px rgba(38, 179, 111, 0.35));
        }

        .pad {
            fill: #ffffff;
            stroke: #23313a;
            stroke-width: 4;
        }

        .pad-label {
            fill: #172026;
            font-size: 17px;
            font-weight: 800;
            pointer-events: none;
            text-anchor: middle;
        }

        .checkpoint {
            fill: #ffffff;
            stroke: #28a1a8;
            stroke-width: 3;
        }

        .checkpoint[data-state="complete"] {
            fill: #26b36f;
            stroke: #174f3c;
        }

        .probe {
            fill: #f2b84b;
            stroke: #9a6500;
            stroke-width: 3;
            filter: drop-shadow(0 8px 14px rgba(23, 32, 38, 0.25));
            pointer-events: none;
        }

        .trace-wrap[data-fault="true"] {
            animation: fault 160ms ease-out 2;
        }

        @keyframes fault {
            0%, 100% { background-color: #f8fbfb; }
            50% { background-color: #ffe4e0; }
        }

        .status {
            min-height: 28px;
            margin-top: 16px;
            font-weight: 800;
        }

        .status-subtle {
            margin: 12px 0 0;
            color: #55707f;
            font-size: 0.95rem;
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

        .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 20px;
        }

        .actions button,
        .actions a {
            border: 0;
            border-radius: 6px;
            background: #172026;
            color: #ffffff;
            padding: 12px 16px;
            font: inherit;
            font-weight: 800;
            text-decoration: none;
            cursor: pointer;
        }

        .actions button.secondary {
            background: #e7eef1;
            color: #172026;
        }

        .actions button[disabled] {
            opacity: 0.45;
            cursor: not-allowed;
        }

        @media (max-width: 620px) {
            body {
                padding: 14px;
            }

            .shell {
                padding: 14px;
            }

            .meter-row {
                grid-template-columns: 1fr;
            }

            .board {
                padding: 14px;
            }
        }
    </style>
</head>
<body>
@php
    $moduleInputModes = implode(',', $module->input_modes ?? []);
@endphp
<main
    class="shell"
    data-challenge-shell
    data-challenge-set-version="{{ $attempt->challenge_set_version }}"
    data-selector-version="{{ $attempt->selector_version }}"
    data-scoring-model-version="{{ $attempt->scoring_model_version }}"
>
    <header class="shell-header">
        <div class="eyebrow">Share Capsules Check</div>
        <h1>Quick check</h1>
        <p class="status-subtle">Complete the selected check to continue to the Capsule.</p>
        <ul class="module-list" aria-label="Selected challenge modules">
            @foreach ($challengeModules as $selectedModule)
                <li
                    class="module-pill"
                    @if ($selectedModule['id'] === $module->challenge_id) aria-current="step" @endif
                    data-module-id="{{ $selectedModule['id'] }}"
                    data-module-version="{{ $selectedModule['version'] }}"
                    data-input-modes="{{ implode(',', $selectedModule['inputModes']) }}"
                    data-module-status="{{ $selectedModule['status'] }}"
                >
                    {{ $selectedModule['name'] }}
                </li>
            @endforeach
        </ul>
    </header>

    @if (! $isAvailable)
        <div class="board">
            <h2>Check expired</h2>
            <p>This challenge is no longer active. Return to the Capsule and start a fresh check.</p>
            <p class="sr-only" role="status" aria-live="polite">The active challenge has expired.</p>
            <div class="actions">
                <a href="{{ $returnTo }}?status=failed">Return to Capsule</a>
            </div>
        </div>
    @else
        <form
            class="board"
            method="POST"
            action="{{ $completionUrl }}"
            data-circuit-trace
            data-module-id="{{ $module->challenge_id }}"
            data-module-version="{{ $module->module_version }}"
            data-input-modes="{{ $moduleInputModes }}"
            aria-describedby="challenge-instructions challenge-assistive-description"
        >
            <h2>Circuit Trace</h2>
            <p id="challenge-instructions">Drag the yellow ball to the finish without touching the walls.</p>
            <p class="sr-only" id="challenge-assistive-description">
                This check supports pointer, touch, keyboard, and reduced-motion input. Use Steady mode for keyboard movement.
            </p>
            <input type="hidden" name="elapsed_ms" value="0" data-elapsed>
            <input type="hidden" name="path_checkpoints" value="0" data-checkpoints>
            <input type="hidden" name="wall_touches" value="0" data-wall-touches>
            <input type="hidden" name="input_mode" value="pointer" data-input-mode>

            <div class="meter-row" aria-label="Circuit telemetry">
                <div class="meter"><span>Progress</span><strong data-progress>0/8</strong></div>
                <div class="meter"><span>Wall touches</span><strong data-faults>0</strong></div>
                @if ($showLiveScore ?? false)
                    <div class="meter"><span>Live score</span><strong data-live-score>100</strong></div>
                @endif
            </div>

            <div class="trace-wrap" data-trace-wrap>
                <svg
                    class="trace-board"
                    viewBox="0 0 720 390"
                    role="application"
                    aria-label="Circuit trace board"
                    tabindex="0"
                    data-seed="{{ $attempt->getKey() }}"
                    data-board
                >
                    <path class="trace-wall" data-track-wall d="M70 298 C142 300 139 118 230 122 C318 126 275 284 385 252 C481 224 453 92 552 116 C627 134 620 244 648 308" />
                    <path class="trace-safe" data-track-safe d="M70 298 C142 300 139 118 230 122 C318 126 275 284 385 252 C481 224 453 92 552 116 C627 134 620 244 648 308" />
                    <path class="trace-center" data-track-center d="M70 298 C142 300 139 118 230 122 C318 126 275 284 385 252 C481 224 453 92 552 116 C627 134 620 244 648 308" />
                    <path class="trace-progress" data-track-progress d="M70 298 C142 300 139 118 230 122 C318 126 275 284 385 252 C481 224 453 92 552 116 C627 134 620 244 648 308" />

                    <circle class="pad" data-start-pad cx="70" cy="298" r="35" />
                    <text class="pad-label" data-start-label x="70" y="304">Power</text>
                    <circle class="pad" data-finish-pad cx="648" cy="308" r="35" />
                    <text class="pad-label" data-finish-label x="648" y="314">Finish</text>

                    @foreach ([0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 0.985] as $index => $point)
                        <circle class="checkpoint" data-checkpoint="{{ $index + 1 }}" data-at="{{ $point }}" cx="0" cy="0" r="10" />
                    @endforeach

                    <circle class="probe" data-probe cx="70" cy="298" r="25" />
                </svg>
            </div>

            <p class="status" role="status" aria-live="polite" data-status>Drag the yellow ball to the finish without touching the walls.</p>

            <div class="actions">
                <button type="submit" disabled data-submit>Complete check</button>
                <button class="secondary" type="button" data-steady-mode>Steady mode</button>
                <button class="secondary" type="button" data-reset>Reset trace</button>
            </div>
        </form>
    @endif
</main>

<script>
(() => {
    const form = document.querySelector('[data-circuit-trace]');
    if (!(form instanceof HTMLFormElement)) return;

    const board = form.querySelector('[data-board]');
    const wallTrack = form.querySelector('[data-track-wall]');
    const safeTrack = form.querySelector('[data-track-safe]');
    const wrap = form.querySelector('[data-trace-wrap]');
    const track = form.querySelector('[data-track-center]');
    const progressTrack = form.querySelector('[data-track-progress]');
    const probe = form.querySelector('[data-probe]');
    const startPad = form.querySelector('[data-start-pad]');
    const startLabel = form.querySelector('[data-start-label]');
    const finishPad = form.querySelector('[data-finish-pad]');
    const finishLabel = form.querySelector('[data-finish-label]');
    const checkpoints = [...form.querySelectorAll('[data-checkpoint]')];
    const status = form.querySelector('[data-status]');
    const submit = form.querySelector('[data-submit]');
    const reset = form.querySelector('[data-reset]');
    const steady = form.querySelector('[data-steady-mode]');
    const elapsed = form.querySelector('[data-elapsed]');
    const checkpointInput = form.querySelector('[data-checkpoints]');
    const wallTouches = form.querySelector('[data-wall-touches]');
    const inputMode = form.querySelector('[data-input-mode]');
    const progressLabel = form.querySelector('[data-progress]');
    const faultsLabel = form.querySelector('[data-faults]');
    const scoreLabel = form.querySelector('[data-live-score]');

    if (
        !(board instanceof SVGSVGElement) ||
        !(wallTrack instanceof SVGPathElement) ||
        !(safeTrack instanceof SVGPathElement) ||
        !(track instanceof SVGPathElement) ||
        !(progressTrack instanceof SVGPathElement) ||
        !(probe instanceof SVGCircleElement) ||
        !(startPad instanceof SVGCircleElement) ||
        !(startLabel instanceof SVGTextElement) ||
        !(finishPad instanceof SVGCircleElement) ||
        !(finishLabel instanceof SVGTextElement)
    ) {
        return;
    }

    const hashSeed = (value) => {
        let hash = 2166136261;
        for (let index = 0; index < value.length; index += 1) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    };

    const mulberry32 = (seed) => () => {
        let value = seed += 0x6D2B79F5;
        value = Math.imul(value ^ value >>> 15, value | 1);
        value ^= value + Math.imul(value ^ value >>> 7, value | 61);
        return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };

    const generatePath = () => {
        const random = mulberry32(hashSeed(board.dataset.seed ?? 'circuit-trace'));
        const left = 70;
        const right = 650;
        const width = right - left;
        const margin = 94;
        const minCurvatureRadius = 68;
        let cycles = 1.6;
        let amplitude = 30;
        for (let attempt = 0; attempt < 12; attempt += 1) {
            cycles = 1.6 + random() * 0.45;
            amplitude = 28 + random() * 12;
            const angularFrequency = (Math.PI * 2 * cycles) / width;
            const minRadius = 1 / (amplitude * angularFrequency * angularFrequency);
            if (minRadius >= minCurvatureRadius) break;
        }
        const centerMin = margin + amplitude;
        const centerMax = 390 - margin - amplitude;
        const center = centerMin + random() * Math.max(1, centerMax - centerMin);
        const phase = random() * Math.PI * 2;
        const points = Array.from({ length: 120 }, (_, index) => {
            const t = index / 119;
            const x = left + t * (right - left);
            const y = center + amplitude * Math.sin((Math.PI * 2 * cycles * t) + phase);
            return { x, y };
        });
        let d = `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
        for (let index = 0; index < points.length - 1; index += 1) {
            const current = points[index];
            const next = points[index + 1];
            const previous = points[Math.max(0, index - 1)];
            const following = points[Math.min(points.length - 1, index + 2)];
            const cp1 = {
                x: current.x + (next.x - previous.x) / 6,
                y: current.y + (next.y - previous.y) / 6,
            };
            const cp2 = {
                x: next.x - (following.x - current.x) / 6,
                y: next.y - (following.y - current.y) / 6,
            };
            d += ` C${cp1.x.toFixed(2)} ${cp1.y.toFixed(2)} ${cp2.x.toFixed(2)} ${cp2.y.toFixed(2)} ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
        }

        return { d, points, cycles, amplitude };
    };

    const generated = generatePath();
    for (const path of [wallTrack, safeTrack, track, progressTrack]) {
        path.setAttribute('d', generated.d);
    }
    const firstPoint = generated.points[0];
    const lastPoint = generated.points[generated.points.length - 1];
    for (const [element, point] of [[startPad, firstPoint], [finishPad, lastPoint]]) {
        element.setAttribute('cx', String(point.x));
        element.setAttribute('cy', String(point.y));
    }
    startLabel.setAttribute('x', String(firstPoint.x));
    startLabel.setAttribute('y', String(firstPoint.y + 6));
    finishLabel.setAttribute('x', String(lastPoint.x));
    finishLabel.setAttribute('y', String(lastPoint.y + 6));

    const totalLength = track.getTotalLength();
    const probeRadius = 25;
    const clearance = 10;
    const allowedCenterDistance = clearance;
    const safeHalfWidth = probeRadius + clearance;
    const wallHalfWidth = safeHalfWidth + 8;
    const startRadius = 42;
    const maxProgressAdvance = 45;
    const finishProgress = 0.985;
    const samples = Array.from({ length: 260 }, (_, index) => {
        const length = (index / 259) * totalLength;
        const point = track.getPointAtLength(length);
        return { length, x: point.x, y: point.y };
    });
    safeTrack.style.setProperty('--trace-safe-width', String(safeHalfWidth * 2));
    wallTrack.style.setProperty('--trace-wall-width', String(wallHalfWidth * 2));

    let startedAt = performance.now();
    let active = false;
    let finished = false;
    let faultedOutside = false;
    let touches = 0;
    let checkpointCount = 0;
    let bestLength = 0;
    let probePoint = track.getPointAtLength(0);
    let mode = 'pointer';

    progressTrack.style.setProperty('--dash', '0');
    progressTrack.style.setProperty('--gap', String(totalLength));

    const setStatus = (message) => {
        if (status instanceof HTMLElement) status.textContent = message;
    };

    const pointAtProgress = (progress) => track.getPointAtLength(totalLength * progress);

    for (const marker of checkpoints) {
        if (!(marker instanceof SVGCircleElement)) continue;
        const at = Number(marker.dataset.at);
        const point = pointAtProgress(at);
        marker.setAttribute('cx', String(point.x));
        marker.setAttribute('cy', String(point.y));
    }

    const updateProbe = (x, y) => {
        probePoint = { x, y };
        probe.setAttribute('cx', String(x));
        probe.setAttribute('cy', String(y));
    };

    const nearest = (point) => {
        let best = samples[0];
        let bestDistance = Number.POSITIVE_INFINITY;
        for (const sample of samples) {
            const distance = Math.hypot(point.x - sample.x, point.y - sample.y);
            if (distance < bestDistance) {
                best = sample;
                bestDistance = distance;
            }
        }

        return { sample: best, distance: bestDistance };
    };

    const svgPoint = (event) => {
        const matrix = board.getScreenCTM();
        if (matrix === null) return null;
        const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
        return { x: point.x, y: point.y };
    };

    const liveScore = () => {
        if (checkpointCount < 8) return Math.max(0, Math.round((checkpointCount / 8) * 60) - touches * 8);
        if (touches > 6) return 55;
        return Math.max(70, 100 - touches * 8);
    };

    const updateFields = () => {
        if (elapsed instanceof HTMLInputElement) elapsed.value = String(Math.round(performance.now() - startedAt));
        if (checkpointInput instanceof HTMLInputElement) checkpointInput.value = String(checkpointCount);
        if (wallTouches instanceof HTMLInputElement) wallTouches.value = String(touches);
        if (inputMode instanceof HTMLInputElement) inputMode.value = mode;
        if (progressLabel instanceof HTMLElement) progressLabel.textContent = `${checkpointCount}/8`;
        if (faultsLabel instanceof HTMLElement) faultsLabel.textContent = String(touches);
        if (scoreLabel instanceof HTMLElement) scoreLabel.textContent = String(liveScore());
    };

    const updateProgress = (length) => {
        bestLength = Math.max(bestLength, length);
        progressTrack.style.setProperty('--dash', String(bestLength));
        progressTrack.style.setProperty('--gap', String(totalLength));
        checkpointCount = Math.min(8, Math.floor((bestLength / totalLength) * 8.1));

        for (const marker of checkpoints) {
            if (!(marker instanceof SVGCircleElement)) continue;
            const index = Number(marker.dataset.checkpoint);
            marker.dataset.state = index <= checkpointCount ? 'complete' : 'idle';
        }

        updateFields();
        if (bestLength / totalLength >= finishProgress) {
            checkpointCount = 8;
            finished = true;
            active = false;
            updateFields();
            setStatus('Circuit complete. Submit the check to score this run.');
            if (submit instanceof HTMLButtonElement) submit.disabled = false;
        }
    };

    const markFault = () => {
        if (faultedOutside) return;
        faultedOutside = true;
        touches += 1;
        updateFields();
        if (wrap instanceof HTMLElement) {
            wrap.dataset.fault = 'true';
            window.setTimeout(() => {
                wrap.dataset.fault = 'false';
            }, 340);
        }
        setStatus('Wall touch recorded. Re-enter the circuit and keep going.');
    };

    const moveToNearestTrackPoint = (point) => {
        const result = nearest(point);
        if (result.distance > allowedCenterDistance) {
            updateProbe(point.x, point.y);
            markFault();
            return;
        }
        if (active && result.sample.length > bestLength + maxProgressAdvance) {
            updateProbe(point.x, point.y);
            markFault();
            return;
        }

        faultedOutside = false;
        updateProbe(point.x, point.y);
        updateProgress(result.sample.length);
        if (!finished) setStatus('Keep the probe centered in the circuit.');
    };

    const begin = (point, event) => {
        const result = nearest(point);
        if (result.sample.length > totalLength * 0.11 || result.distance > startRadius) {
            setStatus('Drag the yellow ball to the finish without touching the walls.');
            return;
        }

        event.preventDefault();
        board.setPointerCapture?.(event.pointerId);
        mode = event.pointerType === 'touch' ? 'touch' : 'pointer';
        startedAt = performance.now();
        active = true;
        finished = false;
        faultedOutside = false;
        setStatus('Drag the yellow ball to the finish without touching the walls.');
        updateProbe(point.x, point.y);
        updateFields();
    };

    board.addEventListener('pointerdown', (event) => {
        const point = svgPoint(event);
        if (point !== null) begin(point, event);
    });

    board.addEventListener('pointermove', (event) => {
        if (!active || finished) return;
        const point = svgPoint(event);
        if (point === null) return;
        event.preventDefault();
        moveToNearestTrackPoint(point);
    });

    board.addEventListener('pointerup', (event) => {
        board.releasePointerCapture?.(event.pointerId);
        active = false;
    });

    board.addEventListener('pointercancel', () => {
        active = false;
    });

    board.addEventListener('keydown', (event) => {
        if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home'].includes(event.key)) return;
        event.preventDefault();
        mode = 'reduced_motion';
        if (event.key === 'Home') {
            resetRun();
            return;
        }
        if (finished) return;
        if (!active) {
            active = true;
            startedAt = performance.now();
            setStatus('Drag the yellow ball to the finish without touching the walls.');
        }
        const step = event.shiftKey ? 7 : 13;
        const nextPoint = {
            x: probePoint.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0),
            y: probePoint.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0),
        };
        moveToNearestTrackPoint(nextPoint);
        updateFields();
    });

    const resetRun = () => {
        active = false;
        finished = false;
        faultedOutside = false;
        touches = 0;
        checkpointCount = 0;
        bestLength = 0;
        probePoint = track.getPointAtLength(0);
        startedAt = performance.now();
        mode = 'pointer';
        const start = track.getPointAtLength(0);
        updateProbe(start.x, start.y);
        progressTrack.style.setProperty('--dash', '0');
        for (const marker of checkpoints) {
            if (marker instanceof SVGCircleElement) marker.dataset.state = 'idle';
        }
        if (submit instanceof HTMLButtonElement) submit.disabled = true;
        setStatus('Drag the yellow ball to the finish without touching the walls.');
        updateFields();
    };

    if (reset instanceof HTMLButtonElement) {
        reset.addEventListener('click', resetRun);
    }

    if (steady instanceof HTMLButtonElement) {
        steady.addEventListener('click', () => {
            mode = 'reduced_motion';
            board.focus();
            setStatus('Steady mode active. Use arrow keys to move the probe.');
            updateFields();
        });
    }

    form.addEventListener('submit', updateFields);
    resetRun();
})();
</script>
</body>
</html>
