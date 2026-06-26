# Static Image Envelope Benchmark

Status: Initial automated benchmark
Last updated: 2026-06-26

## Purpose

The V1 static-image profile is provisional until supported Chrome/Chromium desktop runs show that the accepted envelope is stable for browser encode, decode, render, and disposal behavior.

The current V1 envelope is:

- 25 MiB maximum encoded plaintext
- 16,384 pixels maximum width or height
- 40,000,000 maximum decoded pixels
- 160,000,000 nominal decoded RGBA bytes

## Command

Run from the repository root:

```sh
./_infra/kit npm run benchmark:image-envelope
```

By default, the command writes:

```text
_docs/operations/static-image-envelope-benchmark-latest.json
```

To preserve evidence for a specific machine or browser, set an output path:

```sh
IMAGE_ENVELOPE_BENCHMARK_OUTPUT=_docs/operations/static-image-envelope-benchmark-YYYY-MM-DD-machine.json ./_infra/kit npm run benchmark:image-envelope
```

To target an installed Chrome or Chromium binary, pass its executable path:

```sh
IMAGE_ENVELOPE_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" IMAGE_ENVELOPE_BENCHMARK_OUTPUT=_docs/operations/static-image-envelope-benchmark-YYYY-MM-DD-mac-chrome.json node code/scripts/static-image-envelope-benchmark.mjs
```

## Evidence To Record

Keep the JSON artifact. It records:

- Browser name and version
- User agent
- Platform, architecture, CPU model/count, and total system memory
- V1 envelope values and benchmark thresholds
- Per-case encoded bytes, decoded pixels, nominal decoded RGBA bytes, timings, and available Chromium metrics
- Pass/fail summary

Do not add screenshots, source images, protected content, account identifiers, tokens, tickets, content keys, or private keys to benchmark evidence.

## Release Decision

The profile can be frozen only after representative supported desktops pass this benchmark or the V1 limits are deliberately reduced and the reduced limits are documented in the design/specification files.
