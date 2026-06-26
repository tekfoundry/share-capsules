<?php

namespace App\Http\Requests\Ctx;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

final class CreateChallengeAttemptRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'type' => ['required', 'in:ctx-challenge-attempt-request'],
            'version' => ['required', 'integer', 'in:1'],
            'host_origin' => [
                'required',
                'max:2048',
                static function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! is_string($value) || ! self::isOrigin($value)) {
                        $fail('The '.$attribute.' must be an HTTPS origin, or a loopback HTTP origin for local development.');
                    }
                },
            ],
            'broker' => [
                'required',
                'max:2048',
                static function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! is_string($value) || ! AuthorizeCtxRequest::isAcceptedServiceIdentity($value)) {
                        $fail('The '.$attribute.' must be an accepted service identity.');
                    }
                },
            ],
            'capsule_id' => ['required', 'regex:/\Aurn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\z/'],
            'capsule_revision' => ['required', 'integer', 'min:1'],
            'policy_sha256' => ['required', 'string', 'size:43', 'regex:/\A[A-Za-z0-9_-]+\z/'],
            'payload_id' => ['required', 'string', 'max:64', 'regex:/\A[a-z][a-z0-9]*(?:-[a-z0-9]+)*\z/'],
            'release_handle' => ['required', 'string', 'min:16', 'max:128', 'regex:/\A[A-Za-z0-9_-]+\z/'],
            'action' => ['required', 'in:render'],
            'return_to' => [
                'required',
                'max:2048',
                static function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! is_string($value) || ! self::isChallengeReturnUrl($value)) {
                        $fail('The '.$attribute.' must be a Share Capsules extension callback URL.');
                    }
                },
            ],
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

    public static function isOrigin(string $value): bool
    {
        $parts = parse_url($value);
        if (! is_array($parts)
            || isset($parts['user'])
            || isset($parts['pass'])
            || isset($parts['path'])
            || isset($parts['query'])
            || isset($parts['fragment'])) {
            return false;
        }

        $scheme = $parts['scheme'] ?? null;
        $host = $parts['host'] ?? null;
        if (! is_string($scheme) || ! is_string($host)) {
            return false;
        }

        return $scheme === 'https'
            || (app()->environment(['local', 'testing'])
                && $scheme === 'http'
                && in_array($host, ['localhost', '127.0.0.1', '::1', '[::1]'], true));
    }

    public static function isChallengeReturnUrl(string $value): bool
    {
        if (self::isLocalChallengePlaygroundReturnUrl($value)) {
            return true;
        }

        $parts = parse_url($value);
        if (! is_array($parts)
            || isset($parts['user'])
            || isset($parts['pass'])
            || isset($parts['query'])
            || isset($parts['fragment'])) {
            return false;
        }

        $scheme = $parts['scheme'] ?? null;
        $host = $parts['host'] ?? null;
        $path = $parts['path'] ?? '';
        if (! is_string($scheme) || ! is_string($host) || ! is_string($path)) {
            return false;
        }

        return $scheme === 'https'
            && str_ends_with($host, '.chromiumapp.org')
            && $path === '/challenge/callback';
    }

    public static function isLocalChallengePlaygroundReturnUrl(string $value): bool
    {
        $parts = parse_url($value);
        if (! is_array($parts)
            || isset($parts['user'])
            || isset($parts['pass'])
            || isset($parts['query'])
            || isset($parts['fragment'])) {
            return false;
        }

        $scheme = $parts['scheme'] ?? null;
        $host = $parts['host'] ?? null;
        $path = $parts['path'] ?? '';
        if (! is_string($scheme) || ! is_string($host) || ! is_string($path)) {
            return false;
        }

        return app()->environment(['local', 'testing'])
            && $scheme === 'http'
            && in_array($host, ['localhost', '127.0.0.1', '::1', '[::1]'], true)
            && in_array($path, [
                '/ctx/challenge-playground/balance-beam',
                '/ctx/challenge-playground/cargo-sort',
                '/ctx/challenge-playground/circuit-trace',
                '/ctx/challenge-playground/memory-path',
                '/ctx/challenge-playground/pattern-repair',
                '/ctx/challenge-playground/signal-tune',
            ], true);
    }
}
