<?php

namespace App\Http\Controllers\Ctx;

use App\Ctx\Challenges\ChallengeAttemptContext;
use App\Ctx\Challenges\ChallengeAttemptOrchestrator;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\View\View;

final class ChallengePlaygroundController extends Controller
{
    public function __invoke(Request $request, ChallengeAttemptOrchestrator $orchestrator): RedirectResponse|View
    {
        abort_unless(app()->environment(['local', 'testing']), 404);

        $status = $request->query('status');
        if ($status === 'completed' || $status === 'failed') {
            $score = $request->query('score');

            return view('ctx.challenges.playground-result', [
                'status' => $status,
                'score' => is_numeric($score) ? max(0, min(100, (int) $score)) : null,
                'nextUrl' => route('ctx.challenge-playground.circuit-trace', absolute: true),
            ]);
        }

        $user = User::query()->firstOrFail();
        $device = ViewerDevice::query()
            ->where('user_id', $user->getKey())
            ->where('status', ViewerDeviceStatus::Active)
            ->firstOrFail();

        $attempt = $orchestrator->create($user, $device, new ChallengeAttemptContext(
            hostOrigin: rtrim((string) config('app.url'), '/'),
            broker: (string) config('sharecapsules.broker.base_url'),
            capsuleId: 'urn:uuid:11111111-1111-4111-8111-111111111111',
            capsuleRevision: 1,
            policySha256: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            payloadId: 'playground',
            releaseHandle: 'challenge-playground-release-handle',
            action: 'render',
        ));

        $returnTo = route('ctx.challenge-playground.circuit-trace', absolute: true);

        return redirect()->away(URL::temporarySignedRoute(
            'ctx.challenge-attempts.show',
            $attempt->expires_at,
            [
                'attempt' => $attempt->getKey(),
                'return_to' => $returnTo,
            ],
        ));
    }
}
