<?php

namespace App\Http\Controllers\Broker;

use App\Broker\Release\FinalContentKeyReleaseCheck;
use App\Broker\Release\InvalidDeviceProof;
use App\Broker\Release\InvalidKeyRelease;
use App\Broker\Release\PrepareKeyRelease;
use App\Broker\Release\TicketRedemptionClient;
use App\Ctx\Contracts\CtxErrorCode;
use App\Http\Controllers\Controller;
use App\Http\Requests\Broker\ReleaseContentKeyRequest;
use Illuminate\Http\JsonResponse;
use Throwable;

final class ReleaseContentKeyController extends Controller
{
    public function __invoke(
        ReleaseContentKeyRequest $request,
        PrepareKeyRelease $prepare,
        TicketRedemptionClient $redemption,
        FinalContentKeyReleaseCheck $finalCheck,
    ): JsonResponse {
        $keys = array_keys($request->all());
        sort($keys);
        if ($keys !== ['agreement_public_key', 'proof', 'ticket']) {
            return $this->error(CtxErrorCode::InvalidRequest);
        }
        try {
            $ticket = $request->string('ticket')->toString();
            $prepared = $prepare->prepare(
                $ticket,
                $request->string('proof')->toString(),
                $request->string('agreement_public_key')->toString(),
            );
            $outcome = $redemption->redeem($prepared->ticketJti, hash('sha256', $ticket));
            if (! $outcome->committed()) {
                $error = $outcome->publicError();

                return $this->error(
                    $error,
                    $error === CtxErrorCode::TemporarilyUnavailable,
                    $error === CtxErrorCode::TemporarilyUnavailable ? 503 : 400,
                );
            }
            if (! $finalCheck->active($prepared->recordId)) {
                return $this->error(CtxErrorCode::ReleaseUnavailable);
            }
        } catch (InvalidDeviceProof) {
            return $this->error(CtxErrorCode::InvalidProof);
        } catch (InvalidKeyRelease) {
            return $this->error(CtxErrorCode::InvalidTicket);
        } catch (Throwable) {
            return $this->error(CtxErrorCode::TemporarilyUnavailable, true, 503);
        }

        return response()->json([
            'type' => 'ctx-key-release',
            'version' => 1,
            'ticket_jti' => $prepared->ticketJti,
            'cryptographic_suite' => 'ctx-capsule-v1',
            'enc' => $prepared->enc,
            'ciphertext' => $prepared->ciphertext,
        ], 200, ['Cache-Control' => 'no-store']);
    }

    private function error(CtxErrorCode $code, bool $retryable = false, int $status = 400): JsonResponse
    {
        return response()->json([
            'type' => 'ctx-error',
            'version' => 1,
            'code' => $code->value,
            'retryable' => $retryable,
        ], $status, ['Cache-Control' => 'no-store']);
    }
}
