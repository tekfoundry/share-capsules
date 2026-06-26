<?php

namespace App\Http\Controllers\Ctx;

use App\Ctx\Challenges\ChallengeAttemptFailed;
use App\Ctx\Challenges\ChallengeAttemptOrchestrator;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ctx\CreateChallengeAttemptRequest;
use App\Models\CtxChallengeAttempt;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class CompletePatternRepairChallengeController extends Controller
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
            'correct_count' => ['required', 'integer', 'min:0', 'max:60'],
            'mistake_count' => ['required', 'integer', 'min:0', 'max:60'],
            'attempt_count' => ['required', 'integer', 'min:0', 'max:120'],
            'input_mode' => ['required', 'in:pointer,touch,keyboard,reduced_motion'],
        ]);

        $attemptModel = CtxChallengeAttempt::query()->findOrFail($attempt);
        $score = $this->score(
            correctCount: (int) $validated['correct_count'],
            mistakeCount: (int) $validated['mistake_count'],
            attemptCount: (int) $validated['attempt_count'],
            elapsedMs: (int) $validated['elapsed_ms'],
        );

        try {
            $orchestrator->recordModuleScore(
                $attemptModel,
                'pattern_repair',
                $score,
                $this->reasonCategories(
                    score: $score,
                    correctCount: (int) $validated['correct_count'],
                    mistakeCount: (int) $validated['mistake_count'],
                    attemptCount: (int) $validated['attempt_count'],
                    elapsedMs: (int) $validated['elapsed_ms'],
                    inputMode: (string) $validated['input_mode'],
                ),
                [
                    'elapsed_ms' => (int) $validated['elapsed_ms'],
                    'correct_count' => (int) $validated['correct_count'],
                    'mistake_count' => (int) $validated['mistake_count'],
                    'attempt_count' => (int) $validated['attempt_count'],
                    'input_mode' => (string) $validated['input_mode'],
                ],
            );
        } catch (ChallengeAttemptFailed) {
            return redirect()->away($this->returnUrl($returnTo, 'failed'));
        }

        return redirect()->away($this->returnUrl($returnTo, 'completed', $score));
    }

    private function score(int $correctCount, int $mistakeCount, int $attemptCount, int $elapsedMs): int
    {
        $score = min(100, ($correctCount * 20) - ($mistakeCount * 8));
        if ($correctCount === 0 || $attemptCount === 0) {
            $score = min($score, 20);
        }

        if ($elapsedMs < 5000 && $correctCount > 2) {
            return min($score, 25);
        }

        return max(0, $score);
    }

    /** @return list<string> */
    private function reasonCategories(
        int $score,
        int $correctCount,
        int $mistakeCount,
        int $attemptCount,
        int $elapsedMs,
        string $inputMode,
    ): array {
        $categories = [$inputMode];
        if ($correctCount === 0) {
            $categories[] = 'no_correct_patterns';
        }
        if ($mistakeCount > 0) {
            $categories[] = 'pattern_mistakes';
        }
        if ($elapsedMs < 5000 && $correctCount > 2) {
            $categories[] = 'too_fast';
        }
        if ($attemptCount > $correctCount + $mistakeCount + 2) {
            $categories[] = 'attempt_mismatch';
        }
        if ($score < 75) {
            $categories[] = 'not_complete_enough';
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
