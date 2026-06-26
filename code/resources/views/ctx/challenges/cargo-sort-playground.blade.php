<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Cargo Sort Playground</title>
    <style>
        :root {
            color-scheme: light;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #172026;
            background: #f0f3ef;
        }

        body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 24px;
        }

        main {
            width: min(960px, 100%);
            padding: 20px;
            background: rgba(255, 255, 255, 0.84);
            border: 1px solid #d2ddcf;
            border-radius: 8px;
            box-shadow: 0 18px 50px rgba(23, 32, 38, 0.08);
        }

        .eyebrow {
            color: #7a5c18;
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
            border: 1px solid #d2ddcf;
            border-radius: 8px;
        }

        .layout {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(260px, 0.7fr);
            gap: 18px;
        }

        .cargo-grid,
        .bin-grid {
            display: grid;
            gap: 10px;
        }

        .cargo-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .bin-grid {
            grid-template-columns: 1fr;
        }

        .cargo,
        .bin,
        .actions button,
        .actions a {
            border: 0;
            border-radius: 6px;
            font: inherit;
            font-weight: 850;
            cursor: pointer;
        }

        .cargo {
            min-height: 84px;
            display: grid;
            place-items: center;
            gap: 6px;
            padding: 10px;
            background: #f8faf6;
            border: 1px solid #dce5d8;
            color: #172026;
        }

        .cargo[aria-pressed="true"] {
            outline: 4px solid #245dff;
            outline-offset: 2px;
        }

        .cargo[data-sorted="true"] {
            opacity: 0.35;
            cursor: not-allowed;
        }

        .symbol {
            width: 34px;
            height: 34px;
            background: var(--cargo-color);
        }

        .symbol[data-shape="circle"] {
            border-radius: 999px;
        }

        .symbol[data-shape="square"] {
            border-radius: 6px;
        }

        .symbol[data-shape="triangle"] {
            width: 0;
            height: 0;
            border-left: 20px solid transparent;
            border-right: 20px solid transparent;
            border-bottom: 36px solid var(--cargo-color);
            background: transparent;
        }

        .bin {
            min-height: 78px;
            padding: 12px;
            background: #172026;
            color: #ffffff;
            text-align: left;
        }

        .bin:focus-visible,
        .cargo:focus-visible,
        .actions button:focus-visible,
        .actions a:focus-visible {
            outline: 4px solid #245dff;
            outline-offset: 2px;
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
            border: 1px solid #dce5d8;
            border-radius: 8px;
            background: #f8faf6;
        }

        .meter span {
            display: block;
            color: #6f735d;
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
        }

        .actions a.secondary,
        .actions button.secondary {
            background: #ebe8dc;
            color: #172026;
        }

        .actions button[disabled] {
            opacity: 0.45;
            cursor: not-allowed;
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

            .layout,
            .meter-row {
                grid-template-columns: 1fr;
            }

            .cargo-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }
    </style>
</head>
<body>
<main data-cargo-sort-playground>
    <div class="eyebrow">Challenge Playground</div>
    <h1>Cargo Sort</h1>
    <p id="instructions">Select each cargo tile, then choose a bin that matches the active rule.</p>

    <form
        method="POST"
        action="{{ $completionUrl ?? route('ctx.challenge-playground.cargo-sort') }}"
        class="board"
        data-board
        data-seed="{{ $seed }}"
        data-module-id="{{ $module->challenge_id ?? 'cargo_sort' }}"
        data-module-version="{{ $module->module_version ?? 'playground' }}"
        data-input-modes="{{ isset($module) ? implode(',', $module->input_modes ?? []) : 'pointer,touch,keyboard,reduced_motion' }}"
        data-rule-break-at="{{ $cargoRuleBreakAt }}"
        data-items='@json($cargoItems)'
        aria-describedby="instructions assistive-description"
    >
        <input type="hidden" name="elapsed_ms" value="0" data-elapsed>
        <input type="hidden" name="correct_count" value="0" data-correct-field>
        <input type="hidden" name="mistake_count" value="0" data-mistake-field>
        <input type="hidden" name="move_count" value="0" data-move-field>
        <input type="hidden" name="input_mode" value="pointer" data-input-mode>

        <p class="sr-only" id="assistive-description">
            Sort all nine tiles. The active sorting rule changes during the round. Incorrect choices leave the tile available for another attempt.
        </p>

        <div class="meter-row" aria-label="Cargo telemetry">
            <div class="meter"><span>Sorted</span><strong data-sorted>0/9</strong></div>
            <div class="meter"><span>Corrections</span><strong data-mistakes>0</strong></div>
            <div class="meter"><span>Pace</span><strong data-pace>0s</strong></div>
            @if ($showLiveScore ?? true)
                <div class="meter"><span>Live score</span><strong data-score>0</strong></div>
            @endif
        </div>

        <p class="status" data-rule-status>Active rule: match the shape.</p>

        <div class="layout">
            <div class="cargo-grid" aria-label="Cargo tiles">
                @foreach ($cargoItems as $item)
                    <button
                        class="cargo"
                        type="button"
                        aria-pressed="false"
                        data-cargo="{{ $item['id'] }}"
                        data-shape="{{ $item['shape'] }}"
                        data-color="{{ $item['color'] }}"
                    >
                        <span class="symbol" data-shape="{{ $item['shape'] }}" style="--cargo-color: {{ match ($item['color']) {
                            'blue' => '#4c8dde',
                            'green' => '#2eb875',
                            'gold' => '#e9b84d',
                            default => '#d86b7d',
                        } }}"></span>
                        <span>{{ $item['label'] }}</span>
                    </button>
                @endforeach
            </div>

            <div class="bin-grid" aria-label="Sorting bins">
                @foreach ($cargoBins as $bin)
                    <button
                        class="bin"
                        type="button"
                        data-bin-kind="{{ $bin['kind'] }}"
                        data-bin-value="{{ $bin['value'] }}"
                    >
                        {{ $bin['label'] }}
                    </button>
                @endforeach
            </div>
        </div>

        <p class="status" role="status" aria-live="polite" data-status>Select a cargo tile.</p>

        <div class="actions">
            <button type="{{ isset($completionUrl) ? 'submit' : 'button' }}" disabled data-complete>Complete check</button>
            <button class="secondary" type="button" data-reset>Reset sort</button>
            <a class="secondary" href="{{ route('ctx.challenge-playground.cargo-sort') }}">New cargo</a>
        </div>
    </form>
</main>

<script>
(() => {
    const board = document.querySelector('[data-board]');
    if (!(board instanceof HTMLFormElement)) return;

    const cargoButtons = [...board.querySelectorAll('[data-cargo]')];
    const binButtons = [...board.querySelectorAll('[data-bin]')];
    const status = board.querySelector('[data-status]');
    const complete = board.querySelector('[data-complete]');
    const reset = board.querySelector('[data-reset]');
    const sortedLabel = board.querySelector('[data-sorted]');
    const mistakesLabel = board.querySelector('[data-mistakes]');
    const paceLabel = board.querySelector('[data-pace]');
    const scoreLabel = board.querySelector('[data-score]');
    const elapsed = board.querySelector('[data-elapsed]');
    const correctField = board.querySelector('[data-correct-field]');
    const mistakeField = board.querySelector('[data-mistake-field]');
    const moveField = board.querySelector('[data-move-field]');
    const inputMode = board.querySelector('[data-input-mode]');
    const ruleStatus = board.querySelector('[data-rule-status]');
    const ruleBreakAt = Number(board.dataset.ruleBreakAt ?? 4);

    let selected = null;
    let sorted = 0;
    let mistakes = 0;
    let moves = 0;
    let mode = 'pointer';
    let startedAt = null;
    let completedAt = null;

    const setStatus = (message) => {
        if (status instanceof HTMLElement) status.textContent = message;
    };

    const activeRule = () => sorted < ruleBreakAt ? 'shape' : 'color';

    const ruleLabel = () => activeRule() === 'shape' ? 'shape' : 'color';

    const expectedBinFor = (cargo) => {
        if (!(cargo instanceof HTMLButtonElement)) return null;
        return activeRule() === 'shape' ? cargo.dataset.shape : cargo.dataset.color;
    };

    const updateRuleDisplay = () => {
        const rule = activeRule();
        if (ruleStatus instanceof HTMLElement) {
            ruleStatus.textContent = `Active rule: match the ${rule}.`;
        }
        for (const bin of binButtons) {
            if (!(bin instanceof HTMLButtonElement)) continue;
            const isActive = bin.dataset.binKind === rule;
            bin.hidden = !isActive;
            bin.disabled = !isActive;
        }
    };

    const liveScore = () => {
        if (sorted < 9) return Math.max(0, Math.round((sorted / 9) * 70) - mistakes * 8);
        if (moves < 9) return 45;
        const elapsedMs = currentElapsedMs();
        const pacePenalty = elapsedMs > 45000 ? 15 : elapsedMs > 30000 ? 8 : 0;
        return Math.max(70, 100 - mistakes * 10 - pacePenalty);
    };

    const currentElapsedMs = () => {
        if (startedAt === null) return 0;
        const end = completedAt === null ? performance.now() : completedAt;
        return Math.round(end - startedAt);
    };

    const markCompleteIfDone = () => {
        if (sorted >= 9 && completedAt === null) completedAt = performance.now();
    };

    const updateFields = () => {
        markCompleteIfDone();
        const elapsedMs = currentElapsedMs();
        if (elapsed instanceof HTMLInputElement) elapsed.value = String(elapsedMs);
        if (correctField instanceof HTMLInputElement) correctField.value = String(sorted);
        if (mistakeField instanceof HTMLInputElement) mistakeField.value = String(mistakes);
        if (moveField instanceof HTMLInputElement) moveField.value = String(moves);
        if (inputMode instanceof HTMLInputElement) inputMode.value = mode;
        if (sortedLabel instanceof HTMLElement) sortedLabel.textContent = `${sorted}/9`;
        if (mistakesLabel instanceof HTMLElement) mistakesLabel.textContent = String(mistakes);
        if (paceLabel instanceof HTMLElement) paceLabel.textContent = `${Math.floor(elapsedMs / 1000)}s`;
        if (scoreLabel instanceof HTMLElement) scoreLabel.textContent = String(liveScore());
        if (complete instanceof HTMLButtonElement) complete.disabled = sorted < 9;
        updateRuleDisplay();
    };

    const clearSelection = () => {
        for (const cargo of cargoButtons) {
            cargo.setAttribute('aria-pressed', 'false');
        }
        selected = null;
    };

    const selectCargo = (cargo) => {
        if (!(cargo instanceof HTMLButtonElement) || cargo.dataset.sorted === 'true') return;
        if (startedAt === null) startedAt = performance.now();
        clearSelection();
        selected = cargo;
        cargo.setAttribute('aria-pressed', 'true');
        setStatus(`${cargo.textContent?.trim() ?? 'Cargo'} selected. Choose a ${ruleLabel()} bin.`);
    };

    const sortInto = (bin) => {
        if (!(bin instanceof HTMLButtonElement)) return;
        if (!(selected instanceof HTMLButtonElement)) {
            setStatus('Select a cargo tile first.');
            return;
        }

        moves += 1;
        if (expectedBinFor(selected) === bin.dataset.binValue) {
            selected.dataset.sorted = 'true';
            selected.disabled = true;
            sorted += 1;
            markCompleteIfDone();
            const label = selected.textContent?.trim() ?? 'Cargo';
            clearSelection();
            setStatus(sorted === 9 ? 'All cargo sorted. Complete the check when ready.' : `${label} sorted. Active rule: match the ${ruleLabel()}.`);
        } else {
            mistakes += 1;
            setStatus(`That bin does not match the ${ruleLabel()}. Try that cargo again.`);
        }
        updateFields();
    };

    const resetRun = () => {
        selected = null;
        sorted = 0;
        mistakes = 0;
        moves = 0;
        mode = 'pointer';
        startedAt = null;
        completedAt = null;
        for (const cargo of cargoButtons) {
            cargo.dataset.sorted = 'false';
            cargo.disabled = false;
            cargo.setAttribute('aria-pressed', 'false');
        }
        setStatus('Select a cargo tile.');
        updateFields();
    };

    board.addEventListener('pointerdown', (event) => {
        const target = event.target instanceof Element ? event.target.closest('[data-cargo], [data-bin-value]') : null;
        if (target instanceof HTMLElement) {
            mode = event.pointerType === 'touch' ? 'touch' : 'pointer';
        }
    });
    board.addEventListener('keydown', (event) => {
        const target = event.target instanceof Element ? event.target.closest('[data-cargo], [data-bin-value]') : null;
        if (target instanceof HTMLElement) {
            mode = 'keyboard';
        }
    });
    board.addEventListener('click', (event) => {
        const cargo = event.target instanceof Element ? event.target.closest('[data-cargo]') : null;
        if (cargo instanceof HTMLButtonElement) {
            selectCargo(cargo);
            return;
        }

        const bin = event.target instanceof Element ? event.target.closest('[data-bin-value]') : null;
        if (bin instanceof HTMLButtonElement) sortInto(bin);
    });
    if (reset instanceof HTMLButtonElement) reset.addEventListener('click', resetRun);
    if (complete instanceof HTMLButtonElement) {
        complete.addEventListener('click', () => {
            updateFields();
            if (sorted >= 9) setStatus(`Completed with score ${liveScore()}.`);
        });
    }
    board.addEventListener('submit', updateFields);
    resetRun();
    window.setInterval(updateFields, 1000);
})();
</script>
</body>
</html>
