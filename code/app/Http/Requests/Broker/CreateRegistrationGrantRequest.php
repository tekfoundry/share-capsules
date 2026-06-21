<?php

namespace App\Http\Requests\Broker;

use Illuminate\Foundation\Http\FormRequest;

final class CreateRegistrationGrantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'registration_id' => ['required', 'string', 'min:16', 'max:128', 'regex:/\A[A-Za-z0-9_-]+\z/'],
            'capsule_id' => ['required', 'string', 'regex:/\Aurn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\z/'],
            'capsule_revision' => ['required', 'integer', 'min:1'],
            'payload_id' => ['required', 'string', 'max:64', 'regex:/\A[a-z][a-z0-9]*(?:-[a-z0-9]+)*\z/'],
            'policy_sha256' => ['required', 'string', 'size:43', 'regex:/\A[A-Za-z0-9_-]+\z/'],
            'content_key_sha256' => ['required', 'string', 'size:43', 'regex:/\A[A-Za-z0-9_-]+\z/'],
        ];
    }
}
