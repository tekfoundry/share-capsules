<?php

namespace App\Http\Requests\ViewerDevices;

use App\ViewerDevices\OkpPublicKey;
use Illuminate\Foundation\Http\FormRequest;

final class CreateViewerDeviceChallengeRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'device_id' => ['required', 'uuid'],
            'proof_key' => ['required', 'array'],
            'agreement_key' => ['required', 'array'],
        ];
    }

    public function proofKey(): OkpPublicKey
    {
        /** @var array<string, mixed> $value */
        $value = $this->validated('proof_key');

        return OkpPublicKey::fromJwk($value, 'Ed25519', 'proof_key');
    }

    public function agreementKey(): OkpPublicKey
    {
        /** @var array<string, mixed> $value */
        $value = $this->validated('agreement_key');

        return OkpPublicKey::fromJwk($value, 'X25519', 'agreement_key');
    }
}
