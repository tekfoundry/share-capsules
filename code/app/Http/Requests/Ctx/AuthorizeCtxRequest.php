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
            'host_origin' => [
                'required',
                'max:2048',
                static function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! is_string($value) || ! CreateChallengeAttemptRequest::isOrigin($value)) {
                        $fail('The '.$attribute.' must be an HTTPS origin, or a loopback HTTP origin for local development.');
                    }
                },
            ],
            'broker' => [
                'required',
                'max:2048',
                static function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! is_string($value) || ! self::isAcceptedServiceIdentity($value)) {
                        $fail('The '.$attribute.' must be an HTTPS service identity, or a loopback HTTP identity for local development.');
                    }
                },
            ],
            'capsule_id' => ['required', 'regex:/\Aurn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\z/'],
            'capsule_revision' => ['required', 'integer', 'min:1'],
            'policy' => ['required', 'array'],
            'policy_sha256' => ['required', 'string', 'size:43', 'regex:/\A[A-Za-z0-9_-]+\z/'],
            'payload_id' => ['required', 'string', 'max:64', 'regex:/\A[a-z][a-z0-9]*(?:-[a-z0-9]+)*\z/'],
            'release_handle' => ['required', 'string', 'min:16', 'max:128', 'regex:/\A[A-Za-z0-9_-]+\z/'],
            'action' => ['required', 'in:render'],
            'cryptographic_suite' => ['required', 'in:ctx-capsule-v1'],
            'view_event_consent' => ['required', 'boolean'],
            'viewer' => ['required', 'array:name,version,browser_family,browser_major'],
            'viewer.name' => ['required', 'string', 'max:96', 'regex:/\A[a-z][a-z0-9]*(?:-[a-z0-9]+)*\z/'],
            'viewer.version' => ['required', 'string', 'max:32', 'regex:/\A\d+\.\d+\.\d+\z/'],
            'viewer.browser_family' => ['required', 'string', 'in:Chrome,Chromium'],
            'viewer.browser_major' => ['required', 'integer', 'min:1', 'max:999'],
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

    public static function isAcceptedServiceIdentity(string $value): bool
    {
        $parts = parse_url($value);
        if (! is_array($parts)) {
            return false;
        }

        $scheme = $parts['scheme'] ?? null;
        $host = $parts['host'] ?? null;
        if (! is_string($scheme) || ! is_string($host)
            || isset($parts['user'])
            || isset($parts['pass'])
            || isset($parts['query'])
            || isset($parts['fragment'])) {
            return false;
        }

        if ($scheme === 'https') {
            return true;
        }

        return app()->environment(['local', 'testing'])
            && $scheme === 'http'
            && in_array($host, ['localhost', '127.0.0.1', '::1', '[::1]'], true);
    }
}
