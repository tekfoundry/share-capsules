<?php

namespace App\Http\Controllers\Ctx;

use App\Ctx\Challenges\ChallengeAttemptFailed;
use App\Ctx\Challenges\ChallengeAttemptOrchestrator;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ctx\CreateChallengeAttemptRequest;
use App\Models\CtxChallengeAttempt;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class CompleteMemoryPathChallengeController extends Controller
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
            'sequence_length' => ['required', 'integer', 'min:1', 'max:32'],
            'correct_count' => ['required', 'integer', 'min:0', 'max:32'],
            'mistake_count' => ['required', 'integer', 'min:0', 'max:20'],
            'replay_count' => ['required', 'integer', 'min:0', 'max:80'],
            'input_mode' => ['required', 'in:pointer,touch,keyboard,reduced_motion'],
        ]);

        $score = $this->score(
            correctCount: (int) $validated['correct_count'],
            mistakeCount: (int) $validated['mistake_count'],
            replayCount: (int) $validated['replay_count'],
            elapsedMs: (int) $validated['elapsed_ms'],
        );

        try {
            $orchestrator->recordModuleScore(
                CtxChallengeAttempt::query()->findOrFail($attempt),
                'memory_path',
                $score,
                $this->reasonCategories(
                    score: $score,
                    correctCount: (int) $validated['correct_count'],
                    mistakeCount: (int) $validated['mistake_count'],
                    replayCount: (int) $validated['replay_count'],
                    elapsedMs: (int) $validated['elapsed_ms'],
                    inputMode: (string) $validated['input_mode'],
                ),
                [
                    'elapsed_ms' => (int) $validated['elapsed_ms'],
                    'sequence_length' => (int) $validated['sequence_length'],
                    'correct_count' => (int) $validated['correct_count'],
                    'mistake_count' => (int) $validated['mistake_count'],
                    'replay_count' => (int) $validated['replay_count'],
                    'input_mode' => (string) $validated['input_mode'],
                ],
            );
        } catch (ChallengeAttemptFailed) {
            return redirect()->away($this->returnUrl($returnTo, 'failed'));
        }

        return redirect()->away($this->returnUrl($returnTo, 'completed', $score));
    }

    private function score(int $correctCount, int $mistakeCount, int $replayCount, int $elapsedMs): int
    {
        $score = max(0, min(100, ($correctCount * 20) - ($mistakeCount * 10)));
        if ($elapsedMs < 1200 && $correctCount > 2) {
            return min($score, 20);
        }

        return $score;
    }

    /** @return list<string> */
    private function reasonCategories(
        int $score,
        int $correctCount,
        int $mistakeCount,
        int $replayCount,
        int $elapsedMs,
        string $inputMode,
    ): array {
        $categories = [$inputMode];
        if ($score < 70) {
            $categories[] = 'not_complete_enough';
        }
        if ($mistakeCount > 0) {
            $categories[] = 'sequence_mistakes';
        }
        if ($elapsedMs < 1200) {
            $categories[] = 'too_fast';
        }
        if ($replayCount > $correctCount + $mistakeCount + 2) {
            $categories[] = 'extra_replays';
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
