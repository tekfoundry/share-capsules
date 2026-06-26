<?php

namespace App\Http\Controllers\Ctx;

use App\Ctx\Challenges\ChallengeAttemptFailed;
use App\Ctx\Challenges\ChallengeAttemptOrchestrator;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ctx\CreateChallengeAttemptRequest;
use App\Models\CtxChallengeAttempt;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class CompleteBalanceBeamChallengeController extends Controller
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
            'safe_ms' => ['required', 'integer', 'min:0', 'max:600000'],
            'correction_count' => ['required', 'integer', 'min:0', 'max:300'],
            'edge_touch_count' => ['required', 'integer', 'min:0', 'max:300'],
            'input_mode' => ['required', 'in:pointer,touch,keyboard,reduced_motion'],
        ]);

        $score = $this->score(
            elapsedMs: (int) $validated['elapsed_ms'],
            safeMs: (int) $validated['safe_ms'],
            correctionCount: (int) $validated['correction_count'],
            edgeTouchCount: (int) $validated['edge_touch_count'],
        );

        try {
            $orchestrator->recordModuleScore(
                CtxChallengeAttempt::query()->findOrFail($attempt),
                'balance_beam',
                $score,
                $this->reasonCategories(
                    score: $score,
                    elapsedMs: (int) $validated['elapsed_ms'],
                    correctionCount: (int) $validated['correction_count'],
                    edgeTouchCount: (int) $validated['edge_touch_count'],
                    inputMode: (string) $validated['input_mode'],
                ),
                [
                    'elapsed_ms' => (int) $validated['elapsed_ms'],
                    'safe_ms' => (int) $validated['safe_ms'],
                    'correction_count' => (int) $validated['correction_count'],
                    'edge_touch_count' => (int) $validated['edge_touch_count'],
                    'input_mode' => (string) $validated['input_mode'],
                ],
            );
        } catch (ChallengeAttemptFailed) {
            return redirect()->away($this->returnUrl($returnTo, 'failed'));
        }

        return redirect()->away($this->returnUrl($returnTo, 'completed', $score));
    }

    private function score(int $elapsedMs, int $safeMs, int $correctionCount, int $edgeTouchCount): int
    {
        if ($elapsedMs < 2500) {
            return 20;
        }

        $safeRatio = $elapsedMs > 0 ? min(1, $safeMs / $elapsedMs) : 0;
        $score = (int) round($safeRatio * 100) - ($edgeTouchCount * 4);
        if ($correctionCount < 6) {
            $score = min($score, 55);
        }

        return max(0, min(100, $score));
    }

    /** @return list<string> */
    private function reasonCategories(
        int $score,
        int $elapsedMs,
        int $correctionCount,
        int $edgeTouchCount,
        string $inputMode,
    ): array {
        $categories = [$inputMode];
        if ($score < 75) {
            $categories[] = 'not_stable_enough';
        }
        if ($elapsedMs < 2500) {
            $categories[] = 'too_fast';
        }
        if ($correctionCount < 6) {
            $categories[] = 'too_few_corrections';
        }
        if ($edgeTouchCount > 0) {
            $categories[] = 'edge_touches';
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
