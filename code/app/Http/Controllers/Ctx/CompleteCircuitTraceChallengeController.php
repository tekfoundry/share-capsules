<?php

namespace App\Http\Controllers\Ctx;

use App\Ctx\Challenges\ChallengeAttemptFailed;
use App\Ctx\Challenges\ChallengeAttemptOrchestrator;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ctx\CreateChallengeAttemptRequest;
use App\Models\CtxChallengeAttempt;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class CompleteCircuitTraceChallengeController extends Controller
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
            'path_checkpoints' => ['required', 'integer', 'min:0', 'max:8'],
            'wall_touches' => ['required', 'integer', 'min:0', 'max:50'],
            'input_mode' => ['required', 'in:pointer,touch,keyboard,reduced_motion'],
        ]);

        $score = $this->score(
            checkpoints: (int) $validated['path_checkpoints'],
            wallTouches: (int) $validated['wall_touches'],
            elapsedMs: (int) $validated['elapsed_ms'],
        );

        try {
            $orchestrator->recordModuleScore(
                CtxChallengeAttempt::query()->findOrFail($attempt),
                'circuit_trace',
                $score,
                $this->reasonCategories(
                    checkpoints: (int) $validated['path_checkpoints'],
                    wallTouches: (int) $validated['wall_touches'],
                    elapsedMs: (int) $validated['elapsed_ms'],
                    inputMode: (string) $validated['input_mode'],
                ),
                [
                    'elapsed_ms' => (int) $validated['elapsed_ms'],
                    'path_checkpoints' => (int) $validated['path_checkpoints'],
                    'wall_touches' => (int) $validated['wall_touches'],
                    'input_mode' => (string) $validated['input_mode'],
                ],
            );
        } catch (ChallengeAttemptFailed) {
            return redirect()->away($this->returnUrl($returnTo, 'failed'));
        }

        return redirect()->away($this->returnUrl($returnTo, 'completed', $score));
    }

    private function score(int $checkpoints, int $wallTouches, int $elapsedMs): int
    {
        if ($checkpoints < 8) {
            return 0;
        }
        if ($elapsedMs < 1200) {
            return 20;
        }
        if ($wallTouches > 6) {
            return 55;
        }

        return max(70, 100 - ($wallTouches * 8));
    }

    /** @return list<string> */
    private function reasonCategories(int $checkpoints, int $wallTouches, int $elapsedMs, string $inputMode): array
    {
        $categories = [$inputMode];
        if ($checkpoints < 8) {
            $categories[] = 'incomplete_path';
        }
        if ($elapsedMs < 1200) {
            $categories[] = 'too_fast';
        }
        if ($wallTouches > 0) {
            $categories[] = 'wall_touches';
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
