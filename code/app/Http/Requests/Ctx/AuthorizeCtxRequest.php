<?php

namespace App\Http\Requests\Ctx;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

final class AuthorizeCtxRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'type' => ['required', 'in:ctx-authorization-request'],
            'version' => ['required', 'integer', 'in:1'],
            'broker' => ['required', 'url:https', 'max:2048'],
            'capsule_id' => ['required', 'regex:/\Aurn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\z/'],
            'capsule_revision' => ['required', 'integer', 'min:1'],
            'policy' => ['required', 'array'],
            'policy_sha256' => ['required', 'string', 'size:43', 'regex:/\A[A-Za-z0-9_-]+\z/'],
            'payload_id' => ['required', 'string', 'max:64', 'regex:/\A[a-z][a-z0-9]*(?:-[a-z0-9]+)*\z/'],
            'release_handle' => ['required', 'string', 'min:16', 'max:128', 'regex:/\A[A-Za-z0-9_-]+\z/'],
            'action' => ['required', 'in:render'],
            'cryptographic_suite' => ['required', 'in:ctx-capsule-v1'],
            'view_event_consent' => ['required', 'boolean'],
        ];
    }

    protected function failedValidation(Validator $validator): never
    {
        throw new HttpResponseException(response()->json([
            'type' => 'ctx-error',
            'version' => 1,
            'code' => 'invalid_request',
            'retryable' => false,
        ], 422, ['Cache-Control' => 'no-store']));
    }
}
