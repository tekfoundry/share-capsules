<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Signal Tune Playground</title>
    <style>
        :root {
            color-scheme: light;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #172026;
            background: #eef3f0;
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
            background: rgba(255, 255, 255, 0.82);
            border: 1px solid #cbd9d3;
            border-radius: 8px;
            box-shadow: 0 18px 50px rgba(23, 32, 38, 0.08);
        }

        .eyebrow {
            color: #2a6b55;
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
            border: 1px solid #cbd9d3;
            border-radius: 8px;
        }

        .signal {
            width: 100%;
            min-height: 260px;
            border: 1px solid #d6e2dc;
            border-radius: 8px;
            background:
                linear-gradient(90deg, rgba(23, 32, 38, 0.045) 1px, transparent 1px),
                linear-gradient(rgba(23, 32, 38, 0.045) 1px, transparent 1px),
                #f9fbfa;
            background-size: 34px 34px;
        }

        .target-wave {
            fill: none;
            stroke: #23313a;
            stroke-width: 5;
            stroke-linecap: round;
            opacity: 0.82;
        }

        .viewer-wave {
            fill: none;
            stroke: #28a1a8;
            stroke-width: 5;
            stroke-linecap: round;
            filter: drop-shadow(0 0 8px rgba(40, 161, 168, 0.28));
        }

        .lock-band {
            fill: #26b36f;
            opacity: 0;
            transition: opacity 160ms ease-out;
        }

        .board[data-locked="true"] .lock-band {
            opacity: 0.14;
        }

        .panel-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.3fr) minmax(260px, 0.7fr);
            gap: 18px;
            align-items: start;
        }

        .controls {
            display: grid;
            gap: 16px;
        }

        .control {
            padding: 12px;
            border: 1px solid #d6e2dc;
            border-radius: 8px;
            background: #f7faf8;
        }

        label,
        .meter span {
            display: block;
            color: #557066;
            font-size: 0.78rem;
            font-weight: 900;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        input[type="range"] {
            width: 100%;
            margin-top: 10px;
            accent-color: #28a1a8;
        }

        .readout {
            margin-top: 8px;
            font-weight: 800;
        }

        .meter {
            min-height: 72px;
            padding: 12px;
            border: 1px solid #d6e2dc;
            border-radius: 8px;
            background: #f7faf8;
        }

        .meter strong {
            display: block;
            margin-top: 5px;
            font-size: 1.65rem;
            line-height: 1;
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

        .actions a.secondary {
            background: #e8f0ec;
            color: #172026;
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

        @media (max-width: 760px) {
            body {
                padding: 14px;
            }

            main,
            .board {
                padding: 14px;
            }

            .panel-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
<main data-signal-tune-playground>
    <div class="eyebrow">Challenge Playground</div>
    <h1>Signal Tune</h1>
    <p id="instructions">Adjust the three controls until the blue signal locks onto the dark target.</p>

    <form
        method="POST"
        action="{{ $completionUrl ?? route('ctx.challenge-playground.signal-tune') }}"
        class="board"
        data-board
        data-target-amplitude="{{ $targetAmplitude }}"
        data-target-frequency="{{ $targetFrequency }}"
        data-target-phase="{{ $targetPhase }}"
        data-seed="{{ $seed }}"
        data-module-id="{{ $module->challenge_id ?? 'signal_tune' }}"
        data-module-version="{{ $module->module_version ?? 'playground' }}"
        data-input-modes="{{ isset($module) ? implode(',', $module->input_modes ?? []) : 'pointer,touch,keyboard,reduced_motion' }}"
        aria-describedby="instructions assistive-description"
    >
        <input type="hidden" name="elapsed_ms" value="0" data-elapsed>
        <input type="hidden" name="amplitude" value="42" data-amplitude-field>
        <input type="hidden" name="frequency" value="42" data-frequency-field>
        <input type="hidden" name="phase" value="0" data-phase-field>
        <input type="hidden" name="adjustment_count" value="0" data-adjustments>
        <input type="hidden" name="input_mode" value="pointer" data-input-mode>

        <p class="sr-only" id="assistive-description">
            Use the waveform, score, and lock status to tune the signal. A total score of 80 or higher is currently treated as a successful tune.
        </p>
        <div class="panel-grid">
            <svg class="signal" viewBox="0 0 720 300" role="img" aria-label="Signal tuning waveform">
                <rect class="lock-band" x="0" y="112" width="720" height="76" rx="8" />
                <path class="target-wave" data-target-wave d="" />
                <path class="viewer-wave" data-viewer-wave d="" />
            </svg>

            <div class="controls">
                @if ($showLiveScore ?? true)
                    <div class="meter">
                        <span>Live score</span>
                        <strong data-score>0</strong>
                    </div>
                @endif

                <div class="control">
                    <label for="amplitude">Amplitude</label>
                    <input id="amplitude" type="range" min="20" max="62" value="42" data-control="amplitude">
                    <div class="readout"><span data-amplitude-value>42</span></div>
                </div>

                <div class="control">
                    <label for="frequency">Frequency</label>
                    <input id="frequency" type="range" min="18" max="66" value="42" data-control="frequency">
                    <div class="readout"><span data-frequency-value>42</span></div>
                </div>

                <div class="control">
                    <label for="phase">Phase</label>
                    <input id="phase" type="range" min="-50" max="50" value="0" data-control="phase">
                    <div class="readout"><span data-phase-value>0</span></div>
                </div>
            </div>
        </div>

        <p class="status" role="status" aria-live="polite" data-status>Start tuning the signal.</p>

        <div class="actions">
            <button type="{{ isset($completionUrl) ? 'submit' : 'button' }}" data-complete>Complete check</button>
            <a class="secondary" href="{{ route('ctx.challenge-playground.signal-tune') }}">New signal</a>
        </div>
    </form>
</main>

<script>
(() => {
    const board = document.querySelector('[data-board]');
    if (!(board instanceof HTMLElement)) return;

    const targetWave = board.querySelector('[data-target-wave]');
    const viewerWave = board.querySelector('[data-viewer-wave]');
    const scoreLabel = board.querySelector('[data-score]');
    const status = board.querySelector('[data-status]');
    const complete = board.querySelector('[data-complete]');
    const elapsed = board.querySelector('[data-elapsed]');
    const amplitudeField = board.querySelector('[data-amplitude-field]');
    const frequencyField = board.querySelector('[data-frequency-field]');
    const phaseField = board.querySelector('[data-phase-field]');
    const adjustmentsField = board.querySelector('[data-adjustments]');
    const inputMode = board.querySelector('[data-input-mode]');
    const controls = {
        amplitude: board.querySelector('[data-control="amplitude"]'),
        frequency: board.querySelector('[data-control="frequency"]'),
        phase: board.querySelector('[data-control="phase"]'),
    };
    const valueLabels = {
        amplitude: board.querySelector('[data-amplitude-value]'),
        frequency: board.querySelector('[data-frequency-value]'),
        phase: board.querySelector('[data-phase-value]'),
    };
    if (!(targetWave instanceof SVGPathElement) || !(viewerWave instanceof SVGPathElement)) return;

    const target = {
        amplitude: Number(board.dataset.targetAmplitude ?? 42),
        frequency: Number(board.dataset.targetFrequency ?? 42),
        phase: Number(board.dataset.targetPhase ?? 0),
    };
    const startedAt = performance.now();
    let adjustmentCount = 0;
    let mode = 'pointer';

    const wavePath = ({ amplitude, frequency, phase }) => {
        const center = 150;
        const phaseRadians = (phase / 50) * Math.PI;
        const cycles = frequency / 18;
        const points = Array.from({ length: 150 }, (_, index) => {
            const t = index / 149;
            const x = 24 + t * 672;
            const y = center + amplitude * Math.sin((Math.PI * 2 * cycles * t) + phaseRadians);
            return { x, y };
        });
        return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
    };

    const match = (name, value) => {
        const ranges = { amplitude: 42, frequency: 48, phase: 100 };
        return Math.max(0, Math.round(100 - (Math.abs(value - target[name]) / ranges[name]) * 100));
    };

    const currentValues = () => ({
        amplitude: Number(controls.amplitude.value),
        frequency: Number(controls.frequency.value),
        phase: Number(controls.phase.value),
    });

    const score = (values) => {
        const amplitude = match('amplitude', values.amplitude);
        const frequency = match('frequency', values.frequency);
        const phase = match('phase', values.phase);
        return Math.round((amplitude * 0.34) + (frequency * 0.38) + (phase * 0.28));
    };

    const setStatus = (message) => {
        if (status instanceof HTMLElement) status.textContent = message;
    };

    const render = () => {
        const values = currentValues();
        viewerWave.setAttribute('d', wavePath(values));
        const liveScore = score(values);
        board.dataset.locked = liveScore >= 80 ? 'true' : 'false';
        if (scoreLabel instanceof HTMLElement) scoreLabel.textContent = String(liveScore);
        if (elapsed instanceof HTMLInputElement) elapsed.value = String(Math.round(performance.now() - startedAt));
        if (amplitudeField instanceof HTMLInputElement) amplitudeField.value = String(values.amplitude);
        if (frequencyField instanceof HTMLInputElement) frequencyField.value = String(values.frequency);
        if (phaseField instanceof HTMLInputElement) phaseField.value = String(values.phase);
        if (adjustmentsField instanceof HTMLInputElement) adjustmentsField.value = String(adjustmentCount);
        if (inputMode instanceof HTMLInputElement) inputMode.value = mode;

        for (const name of ['amplitude', 'frequency', 'phase']) {
            if (valueLabels[name] instanceof HTMLElement) valueLabels[name].textContent = String(values[name]);
            controls[name].setAttribute('aria-valuetext', `${values[name]}`);
        }

        if (liveScore >= 92) {
            setStatus('Signal locked strongly.');
        } else if (liveScore >= 80) {
            setStatus('Signal locked. Complete the check when ready.');
        } else if (liveScore >= 60) {
            setStatus('Signal is close. Keep tuning.');
        } else {
            setStatus('Signal is not locked yet.');
        }
    };

    targetWave.setAttribute('d', wavePath(target));
    for (const control of Object.values(controls)) {
        control.addEventListener('pointerdown', (event) => {
            mode = event.pointerType === 'touch' ? 'touch' : 'pointer';
        });
        control.addEventListener('keydown', () => {
            mode = 'keyboard';
        });
        control.addEventListener('input', () => {
            adjustmentCount += 1;
            render();
        });
    }
    if (complete instanceof HTMLButtonElement) {
        complete.addEventListener('click', () => {
            render();
            const liveScore = score(currentValues());
            setStatus(liveScore >= 80 ? `Completed with score ${liveScore}.` : `Completed below threshold with score ${liveScore}.`);
        });
    }
    board.addEventListener('submit', render);
    render();
})();
</script>
</body>
</html>
