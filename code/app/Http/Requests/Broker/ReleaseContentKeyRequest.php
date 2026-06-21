<?php

namespace App\Http\Requests\Broker;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

final class ReleaseContentKeyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'ticket' => ['required', 'string', 'max:8192'],
            'proof' => ['required', 'string', 'max:4096'],
            'agreement_public_key' => ['required', 'string', 'size:43', 'regex:/\A[A-Za-z0-9_-]+\z/'],
        ];
    }

    protected function failedValidation(Validator $validator): never
    {
        throw new HttpResponseException(response()->json([
            'type' => 'ctx-error',
            'version' => 1,
            'code' => 'invalid_request',
            'retryable' => false,
        ], 400, ['Cache-Control' => 'no-store']));
    }
}
