<?php

namespace App\Http\Controllers\Ctx;

use App\Ctx\Challenges\ChallengeAttemptFailed;
use App\Ctx\Challenges\ChallengeAttemptOrchestrator;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ctx\CreateChallengeAttemptRequest;
use App\Models\CtxChallengeAttempt;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class CompleteSignalTuneChallengeController extends Controller
{
    public function __invoke(
        Request $request,
        string $attempt,
        ChallengeAttemptOrchestrator $orchestrator,
    ): RedirectResponse {
        $returnTo = $request->query('return_to');
        abort_unless(is_string($returnTo) && CreateChallengeAttemptRequest::isChallengeReturnUrl($returnTo), 404);

        $validated = $request->validate([
            'elapsed_ms' => ['required', 'integer', 'min:1', 'max:600000'],
            'amplitude' => ['required', 'integer', 'min:20', 'max:62'],
            'frequency' => ['required', 'integer', 'min:18', 'max:66'],
            'phase' => ['required', 'integer', 'min:-50', 'max:50'],
            'adjustment_count' => ['required', 'integer', 'min:0', 'max:200'],
            'input_mode' => ['required', 'in:pointer,touch,keyboard,reduced_motion'],
        ]);

        $attemptModel = CtxChallengeAttempt::query()->findOrFail($attempt);
        $target = $this->targetFor((string) $attemptModel->getKey());
        $score = $this->score(
            amplitude: (int) $validated['amplitude'],
            frequency: (int) $validated['frequency'],
            phase: (int) $validated['phase'],
            elapsedMs: (int) $validated['elapsed_ms'],
            adjustmentCount: (int) $validated['adjustment_count'],
            target: $target,
        );

        try {
            $orchestrator->recordModuleScore(
                $attemptModel,
                'signal_tune',
                $score,
                $this->reasonCategories(
                    score: $score,
                    elapsedMs: (int) $validated['elapsed_ms'],
                    adjustmentCount: (int) $validated['adjustment_count'],
                    inputMode: (string) $validated['input_mode'],
                ),
                [
                    'elapsed_ms' => (int) $validated['elapsed_ms'],
                    'adjustment_count' => (int) $validated['adjustment_count'],
                    'amplitude_error' => abs((int) $validated['amplitude'] - $target['amplitude']),
                    'frequency_error' => abs((int) $validated['frequency'] - $target['frequency']),
                    'phase_error' => abs((int) $validated['phase'] - $target['phase']),
                    'input_mode' => (string) $validated['input_mode'],
                ],
            );
        } catch (ChallengeAttemptFailed) {
            return redirect()->away($this->returnUrl($returnTo, 'failed'));
        }

        return redirect()->away($this->returnUrl($returnTo, 'completed', $score));
    }

    /** @return array{amplitude: int, frequency: int, phase: int} */
    private function targetFor(string $seed): array
    {
        $hash = abs(crc32($seed));

        return [
            'amplitude' => 24 + ($hash % 35),
            'frequency' => 22 + (($hash >> 5) % 39),
            'phase' => (($hash >> 11) % 101) - 50,
        ];
    }

    /** @param array{amplitude: int, frequency: int, phase: int} $target */
    private function score(int $amplitude, int $frequency, int $phase, int $elapsedMs, int $adjustmentCount, array $target): int
    {
        $baseScore = (int) round(
            ($this->match($amplitude, $target['amplitude'], 42) * 0.34)
            + ($this->match($frequency, $target['frequency'], 48) * 0.38)
            + ($this->match($phase, $target['phase'], 100) * 0.28)
        );

        if ($elapsedMs < 1200) {
            return min($baseScore, 20);
        }
        if ($adjustmentCount < 3) {
            return min($baseScore, 45);
        }

        return $baseScore;
    }

    private function match(int $value, int $target, int $range): int
    {
        return max(0, (int) round(100 - (abs($value - $target) / $range) * 100));
    }

    /** @return list<string> */
    private function reasonCategories(int $score, int $elapsedMs, int $adjustmentCount, string $inputMode): array
    {
        $categories = [$inputMode];
        if ($score < 80) {
            $categories[] = 'not_locked';
        }
        if ($elapsedMs < 1200) {
            $categories[] = 'too_fast';
        }
        if ($adjustmentCount < 3) {
            $categories[] = 'too_few_adjustments';
        }

        return $categories;
    }

    private function returnUrl(string $returnTo, string $status, ?int $score = null): string
    {
        $query = ['status' => $status];
        if ($score !== null && CreateChallengeAttemptRequest::isLocalChallengePlaygroundReturnUrl($returnTo)) {
            $query['score'] = (string) $score;
        }

        $separator = str_contains($returnTo, '?') ? '&' : '?';

        return $returnTo.$separator.http_build_query($query, '', '&', PHP_QUERY_RFC3986);
    }
}
