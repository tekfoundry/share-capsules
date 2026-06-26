<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Pattern Repair Playground</title>
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
            width: min(920px, 100%);
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

        .pattern-wrap {
            display: grid;
            grid-template-columns: minmax(260px, 1fr) minmax(220px, 0.7fr);
            gap: 18px;
            align-items: start;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(52px, 1fr));
            gap: 8px;
        }

        .tile,
        .option {
            min-height: 72px;
            border: 1px solid #d7e1ec;
            border-radius: 8px;
            background: #f7fafc;
            display: grid;
            place-items: center;
            position: relative;
        }

        .tile[data-broken="true"] {
            border: 3px dashed #172026;
            background: repeating-linear-gradient(135deg, #f7fafc 0 8px, #e7eef5 8px 16px);
        }

        .shape {
            width: 34px;
            height: 34px;
            background: var(--tile-color);
        }

        .shape.circle {
            border-radius: 999px;
        }

        .shape.square {
            border-radius: 6px;
        }

        .shape.triangle {
            width: 0;
            height: 0;
            border-left: 20px solid transparent;
            border-right: 20px solid transparent;
            border-bottom: 36px solid var(--tile-color);
            background: transparent;
        }

        .shape.diamond {
            transform: rotate(45deg);
            border-radius: 4px;
        }

        .blue { --tile-color: #3d8bfd; }
        .green { --tile-color: #31b978; }
        .gold { --tile-color: #f5bd3d; }
        .rose { --tile-color: #eb6f92; }

        .options {
            display: grid;
            gap: 10px;
        }

        .option {
            min-height: 58px;
            grid-template-columns: 58px 1fr;
            justify-items: start;
            padding: 8px 10px;
            font: inherit;
            font-weight: 800;
            cursor: pointer;
        }

        .option[data-selected="true"] {
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

        @media (max-width: 720px) {
            body {
                padding: 14px;
            }

            main,
            .board {
                padding: 14px;
            }

            .meter-row,
            .pattern-wrap {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
<main data-pattern-repair-playground>
    <div class="eyebrow">Challenge Playground</div>
    <h1>Pattern Repair</h1>
    <p id="instructions">Find the tile that repairs the broken spot in the pattern.</p>

    <form
        method="POST"
        action="{{ $completionUrl ?? route('ctx.challenge-playground.pattern-repair') }}"
        class="board"
        data-board
        data-seed="{{ $seed }}"
        data-correct-key="{{ $correctPatternKey }}"
        data-module-id="{{ $module->challenge_id ?? 'pattern_repair' }}"
        data-module-version="{{ $module->module_version ?? 'playground' }}"
        data-input-modes="{{ isset($module) ? implode(',', $module->input_modes ?? []) : 'pointer,touch,keyboard,reduced_motion' }}"
        aria-describedby="instructions assistive-description"
    >
        <input type="hidden" name="elapsed_ms" value="0" data-elapsed>
        <input type="hidden" name="correct_count" value="0" data-correct-field>
        <input type="hidden" name="mistake_count" value="0" data-mistake-field>
        <input type="hidden" name="attempt_count" value="0" data-attempt-count>
        <input type="hidden" name="input_mode" value="pointer" data-input-mode>

        <p class="sr-only" id="assistive-description">
            The grid follows a repeating color and shape pattern. Select the option that belongs in the dashed missing tile.
        </p>

        <div class="meter-row" aria-label="Pattern telemetry">
            <div class="meter"><span>Correct</span><strong data-correct-label>0</strong></div>
            <div class="meter"><span>Mistakes</span><strong data-mistakes-label>0</strong></div>
            <div class="meter"><span>Time</span><strong data-time>30s</strong></div>
            @if ($showLiveScore ?? true)
                <div class="meter"><span>Live score</span><strong data-score>0</strong></div>
            @endif
        </div>

        <div class="pattern-wrap">
            <div class="grid" aria-label="Pattern grid">
                @foreach ($patternTiles as $tile)
                    <div
                        class="tile"
                        data-broken="{{ $tile['broken'] ? 'true' : 'false' }}"
                        aria-label="{{ $tile['broken'] ? 'Broken tile' : $tile['label'] }}"
                    >
                        @if (! $tile['broken'])
                            <span class="shape {{ $tile['color'] }} {{ $tile['shape'] }}" aria-hidden="true"></span>
                        @else
                            <span aria-hidden="true">?</span>
                        @endif
                    </div>
                @endforeach
            </div>

            <div class="options" aria-label="Repair options">
                @foreach ($patternOptions as $option)
                    <button class="option" type="button" data-option="{{ $option['key'] }}">
                        <span class="shape {{ $option['color'] }} {{ $option['shape'] }}" aria-hidden="true"></span>
                        <span>{{ $option['label'] }}</span>
                    </button>
                @endforeach
            </div>
        </div>

        <p class="status" role="status" aria-live="polite" data-status>Choose the tile that completes the pattern.</p>

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

    const initialCorrectKey = board.dataset.correctKey ?? '';
    const correctField = board.querySelector('[data-correct-field]');
    const mistakeField = board.querySelector('[data-mistake-field]');
    const elapsedField = board.querySelector('[data-elapsed]');
    const attemptField = board.querySelector('[data-attempt-count]');
    const inputModeField = board.querySelector('[data-input-mode]');
    const correctLabel = board.querySelector('[data-correct-label]');
    const mistakesLabel = board.querySelector('[data-mistakes-label]');
    const timeLabel = board.querySelector('[data-time]');
    const scoreLabel = board.querySelector('[data-score]');
    const status = board.querySelector('[data-status]');
    const start = board.querySelector('[data-start]');
    const complete = board.querySelector('[data-complete]');
    const reset = board.querySelector('[data-reset]');
    const grid = board.querySelector('.grid');
    const options = board.querySelector('.options');
    const durationMs = 30000;
    const colors = ['blue', 'green', 'gold', 'rose'];
    const shapes = ['circle', 'square', 'triangle', 'diamond'];
    let startedAt = null;
    let completedAt = null;
    let attempts = 0;
    let correct = 0;
    let mistakes = 0;
    let selected = '';
    let correctKey = initialCorrectKey;
    let mode = 'pointer';
    let puzzleIndex = 0;
    let timer = null;

    const elapsedMs = () => {
        if (startedAt === null) return 0;
        const end = completedAt === null ? performance.now() : completedAt;
        return Math.min(durationMs, Math.max(1, Math.round(end - startedAt)));
    };

    const liveScore = () => {
        let score = Math.min(100, (correct * 20) - (mistakes * 8));
        if (correct === 0 || attempts === 0) score = Math.min(score, 20);
        if (elapsedMs() < 5000 && correct > 2) score = Math.min(score, 25);
        return Math.max(0, score);
    };

    const remainingSeconds = () => Math.max(0, Math.ceil((durationMs - elapsedMs()) / 1000));

    const hash = (value) => {
        let result = 2166136261;
        for (let index = 0; index < value.length; index += 1) {
            result ^= value.charCodeAt(index);
            result = Math.imul(result, 16777619);
        }

        return result >>> 0;
    };

    const shapeHtml = (color, shape) => `<span class="shape ${color} ${shape}" aria-hidden="true"></span>`;

    const optionLabel = (key) => key.split('_').map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ');

    const puzzleFor = (index) => {
        const seed = `${board.dataset.seed ?? 'pattern'}-${index}`;
        const baseHash = hash(seed);
        const colorOffset = baseHash % colors.length;
        const shapeOffset = (baseHash >> 4) % shapes.length;
        const brokenIndex = 5 + ((baseHash >> 9) % 6);
        const tiles = [];
        let key = '';
        for (let tileIndex = 0; tileIndex < 16; tileIndex += 1) {
            const row = Math.floor(tileIndex / 4);
            const column = tileIndex % 4;
            const color = colors[(row + (column * 2) + colorOffset) % colors.length];
            const shape = shapes[((row * 2) + column + shapeOffset) % shapes.length];
            const tileKey = `${color}_${shape}`;
            if (tileIndex === brokenIndex) key = tileKey;
            tiles.push({ index: tileIndex, key: tileKey, color, shape, broken: tileIndex === brokenIndex });
        }

        const [correctColor, correctShape] = key.split('_');
        const optionKeys = [key];
        for (let offset = 1; optionKeys.length < 4; offset += 1) {
            const optionKey = `${colors[(colors.indexOf(correctColor) + offset) % colors.length]}_${shapes[(shapes.indexOf(correctShape) + (offset * 2)) % shapes.length]}`;
            if (!optionKeys.includes(optionKey)) optionKeys.push(optionKey);
        }
        optionKeys.sort((left, right) => hash(`${seed}-${left}`) - hash(`${seed}-${right}`));

        return { tiles, correctKey: key, optionKeys };
    };

    const bindOptions = () => {
        for (const option of board.querySelectorAll('[data-option]')) {
            option.addEventListener('pointerdown', (event) => {
                mode = event.pointerType === 'touch' ? 'touch' : 'pointer';
            });
            option.addEventListener('keydown', () => {
                mode = 'keyboard';
            });
            option.addEventListener('click', () => choose(option.dataset.option ?? ''));
        }
    };

    const renderPuzzle = () => {
        const puzzle = puzzleFor(puzzleIndex);
        correctKey = puzzle.correctKey;
        selected = '';
        if (grid instanceof HTMLElement) {
            grid.innerHTML = puzzle.tiles.map((tile) => `
                <div class="tile" data-broken="${tile.broken ? 'true' : 'false'}" aria-label="${tile.broken ? 'Broken tile' : optionLabel(tile.key)}">
                    ${tile.broken ? '<span aria-hidden="true">?</span>' : shapeHtml(tile.color, tile.shape)}
                </div>
            `).join('');
        }
        if (options instanceof HTMLElement) {
            options.innerHTML = puzzle.optionKeys.map((key) => {
                const [color, shape] = key.split('_');

                return `
                    <button class="option" type="button" data-option="${key}">
                        ${shapeHtml(color, shape)}
                        <span>${optionLabel(key)}</span>
                    </button>
                `;
            }).join('');
        }
        bindOptions();
    };

    const updateFields = () => {
        if (correctField instanceof HTMLInputElement) correctField.value = String(correct);
        if (mistakeField instanceof HTMLInputElement) mistakeField.value = String(mistakes);
        if (elapsedField instanceof HTMLInputElement) elapsedField.value = String(elapsedMs());
        if (attemptField instanceof HTMLInputElement) attemptField.value = String(attempts);
        if (inputModeField instanceof HTMLInputElement) inputModeField.value = mode;
        if (correctLabel instanceof HTMLElement) correctLabel.textContent = String(correct);
        if (mistakesLabel instanceof HTMLElement) mistakesLabel.textContent = String(mistakes);
        if (timeLabel instanceof HTMLElement) timeLabel.textContent = `${remainingSeconds()}s`;
        if (scoreLabel instanceof HTMLElement) scoreLabel.textContent = String(liveScore());
        if (complete instanceof HTMLButtonElement) complete.disabled = startedAt === null;
    };

    const finish = () => {
        if (startedAt !== null && completedAt === null) completedAt = startedAt + durationMs;
        if (timer !== null) window.clearInterval(timer);
        timer = null;
        if (status instanceof HTMLElement) status.textContent = 'Time is up. Complete the check when ready.';
        updateFields();
    };

    const choose = (key) => {
        if (startedAt === null || completedAt !== null) return;
        selected = key;
        attempts += 1;
        if (key === correctKey) {
            correct += 1;
            puzzleIndex += 1;
            if (status instanceof HTMLElement) status.textContent = 'Correct. Repair the next pattern.';
            renderPuzzle();
        } else {
            mistakes += 1;
            for (const candidate of board.querySelectorAll('[data-option]')) {
                if (candidate instanceof HTMLElement) {
                    candidate.dataset.selected = candidate.dataset.option === key ? 'true' : 'false';
                }
            }
            if (status instanceof HTMLElement) status.textContent = 'That does not fit. Try another tile.';
        }
        if (elapsedMs() >= durationMs) finish();
        updateFields();
    };

    const startRun = () => {
        startedAt = performance.now();
        completedAt = null;
        attempts = 0;
        correct = 0;
        mistakes = 0;
        selected = '';
        puzzleIndex = 0;
        renderPuzzle();
        if (status instanceof HTMLElement) status.textContent = 'Repair as many patterns as you can.';
        if (timer !== null) window.clearInterval(timer);
        timer = window.setInterval(() => {
            if (elapsedMs() >= durationMs) finish();
            updateFields();
        }, 250);
        updateFields();
    };

    if (start instanceof HTMLButtonElement) start.addEventListener('click', startRun);
    if (complete instanceof HTMLButtonElement) {
        complete.addEventListener('click', () => {
            if (completedAt === null) completedAt = performance.now();
            if (timer !== null) window.clearInterval(timer);
            updateFields();
            if (status instanceof HTMLElement) status.textContent = `Completed with score ${liveScore()}.`;
        });
    }
    if (reset instanceof HTMLButtonElement) {
        reset.addEventListener('click', () => {
            window.location.href = '{{ route('ctx.challenge-playground.pattern-repair') }}';
        });
    }

    board.addEventListener('submit', updateFields);
    renderPuzzle();
    updateFields();
})();
</script>
</body>
</html>
