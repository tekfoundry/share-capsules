<?php

namespace App\Http\Controllers\Ctx;

use App\Ctx\Challenges\ChallengeAttemptFailed;
use App\Ctx\Challenges\ChallengeAttemptOrchestrator;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ctx\CreateChallengeAttemptRequest;
use App\Models\CtxChallengeAttempt;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class CompleteCargoSortChallengeController extends Controller
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
            'correct_count' => ['required', 'integer', 'min:0', 'max:9'],
            'mistake_count' => ['required', 'integer', 'min:0', 'max:30'],
            'move_count' => ['required', 'integer', 'min:0', 'max:80'],
            'input_mode' => ['required', 'in:pointer,touch,keyboard,reduced_motion'],
        ]);

        $score = $this->score(
            correctCount: (int) $validated['correct_count'],
            mistakeCount: (int) $validated['mistake_count'],
            moveCount: (int) $validated['move_count'],
            elapsedMs: (int) $validated['elapsed_ms'],
        );

        try {
            $orchestrator->recordModuleScore(
                CtxChallengeAttempt::query()->findOrFail($attempt),
                'cargo_sort',
                $score,
                $this->reasonCategories(
                    score: $score,
                    correctCount: (int) $validated['correct_count'],
                    mistakeCount: (int) $validated['mistake_count'],
                    moveCount: (int) $validated['move_count'],
                    elapsedMs: (int) $validated['elapsed_ms'],
                    inputMode: (string) $validated['input_mode'],
                ),
                [
                    'elapsed_ms' => (int) $validated['elapsed_ms'],
                    'correct_count' => (int) $validated['correct_count'],
                    'mistake_count' => (int) $validated['mistake_count'],
                    'move_count' => (int) $validated['move_count'],
                    'input_mode' => (string) $validated['input_mode'],
                ],
            );
        } catch (ChallengeAttemptFailed) {
            return redirect()->away($this->returnUrl($returnTo, 'failed'));
        }

        return redirect()->away($this->returnUrl($returnTo, 'completed', $score));
    }

    private function score(int $correctCount, int $mistakeCount, int $moveCount, int $elapsedMs): int
    {
        if ($correctCount < 9) {
            return max(0, min(65, (int) round(($correctCount / 9) * 70) - ($mistakeCount * 8)));
        }

        $score = max(70, 100 - ($mistakeCount * 10));
        if ($elapsedMs < 1200) {
            return min($score, 20);
        }
        if ($moveCount < 9) {
            return min($score, 45);
        }
        if ($elapsedMs > 45000) {
            return max(70, $score - 15);
        }
        if ($elapsedMs > 30000) {
            return max(70, $score - 8);
        }

        return $score;
    }

    /** @return list<string> */
    private function reasonCategories(
        int $score,
        int $correctCount,
        int $mistakeCount,
        int $moveCount,
        int $elapsedMs,
        string $inputMode,
    ): array {
        $categories = [$inputMode];
        if ($score < 80) {
            $categories[] = 'not_complete_enough';
        }
        if ($correctCount < 9) {
            $categories[] = 'incomplete_sort';
        }
        if ($mistakeCount > 0) {
            $categories[] = 'sorting_mistakes';
        }
        if ($elapsedMs < 1200) {
            $categories[] = 'too_fast';
        }
        if ($elapsedMs > 45000) {
            $categories[] = 'very_slow';
        } elseif ($elapsedMs > 30000) {
            $categories[] = 'slow';
        }
        if ($moveCount < 9) {
            $categories[] = 'too_few_moves';
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
