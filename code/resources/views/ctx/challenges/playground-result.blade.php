<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Challenge Result</title>
    <style>
        :root {
            color-scheme: light;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #172026;
            background: #f4f7f6;
        }

        body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 24px;
        }

        main {
            width: min(560px, 100%);
            padding: 28px;
            background: #ffffff;
            border: 1px solid #cbd8d3;
            border-radius: 8px;
            box-shadow: 0 18px 50px rgba(23, 32, 38, 0.1);
        }

        h1 {
            margin: 0;
            font-size: 2rem;
            line-height: 1.1;
        }

        .score {
            margin: 22px 0 8px;
            font-size: 4rem;
            line-height: 1;
            font-weight: 800;
        }

        p {
            line-height: 1.55;
        }

        a {
            display: inline-flex;
            margin-top: 18px;
            border-radius: 6px;
            background: #172026;
            color: #ffffff;
            padding: 12px 16px;
            font-weight: 700;
            text-decoration: none;
        }
    </style>
</head>
<body>
<main>
    <h1>{{ $status === 'completed' ? 'Challenge complete' : 'Challenge failed' }}</h1>

    @if ($score !== null)
        <div class="score">{{ $score }}</div>
        <p>Score out of 100.</p>
    @else
        <p>No score was recorded for this run.</p>
    @endif

    <p>Starting the next check in <span data-countdown>5</span> seconds.</p>
    <a href="{{ $nextUrl }}">Start next check</a>
</main>
<script>
(() => {
    const countdown = document.querySelector('[data-countdown]');
    let remaining = 5;
    const interval = window.setInterval(() => {
        remaining -= 1;
        if (countdown instanceof HTMLElement) countdown.textContent = String(remaining);
        if (remaining <= 0) {
            window.clearInterval(interval);
            window.location.assign(@json($nextUrl));
        }
    }, 1000);
})();
</script>
</body>
</html>
