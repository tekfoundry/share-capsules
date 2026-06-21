<?php

namespace App\Http\Middleware;

use App\Account\Deletion\DeletionRestoreReadiness;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final readonly class RequireDeletionLedgerReplay
{
    public function __construct(private DeletionRestoreReadiness $readiness) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->is('up') && ! $this->readiness->isReady()) {
            return response()->json([
                'error' => 'restore_replay_required',
                'message' => 'The service is unavailable while deletion obligations are reapplied.',
            ], 503);
        }

        return $next($request);
    }
}
