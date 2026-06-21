<?php

namespace App\Http\Controllers\Internal;

use App\Ctx\Tickets\CtxTicketRedemptionService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class RedeemCtxTicketController extends Controller
{
    public function __invoke(Request $request, CtxTicketRedemptionService $redemption): JsonResponse
    {
        $validated = $request->validate([
            'jti' => ['required', 'string', 'min:16', 'max:128', 'regex:/\A[A-Za-z0-9_-]+\z/'],
            'ticket_sha256' => ['required', 'string', 'size:64', 'regex:/\A[0-9a-f]+\z/'],
        ]);
        $keys = array_keys($request->all());
        sort($keys);
        abort_unless($keys === ['jti', 'ticket_sha256'], 422);
        $result = $redemption->redeem($validated['jti'], $validated['ticket_sha256']);

        return response()->json([
            'type' => 'ctx-ticket-redemption',
            'version' => 1,
            'code' => $result->code->value,
        ], $result->committed() ? 200 : 409, ['Cache-Control' => 'no-store']);
    }
}
