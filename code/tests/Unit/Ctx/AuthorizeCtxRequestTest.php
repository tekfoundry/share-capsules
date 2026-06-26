<?php

namespace Tests\Unit\Ctx;

use App\Http\Requests\Ctx\AuthorizeCtxRequest;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

final class AuthorizeCtxRequestTest extends TestCase
{
    public function test_it_accepts_https_and_loopback_http_broker_identities(): void
    {
        $this->assertTrue($this->validator(['broker' => 'https://broker.example'])->passes());
        $this->assertTrue($this->validator(['broker' => 'http://localhost:3004'])->passes());
        $this->assertTrue($this->validator(['broker' => 'http://127.0.0.1:3004'])->passes());
    }

    public function test_it_rejects_public_http_or_credentialed_broker_identities(): void
    {
        $this->assertFalse($this->validator(['broker' => 'http://broker.example'])->passes());
        $this->assertFalse($this->validator(['broker' => 'https://user@broker.example'])->passes());
        $this->assertFalse($this->validator(['broker' => 'https://broker.example?debug=1'])->passes());
        $this->assertFalse($this->validator(['broker' => 'https://broker.example#fragment'])->passes());
    }

    /** @param array<string, mixed> $overrides */
    private function validator(array $overrides): \Illuminate\Contracts\Validation\Validator
    {
        $request = new AuthorizeCtxRequest;

        return Validator::make([
            'type' => 'ctx-authorization-request',
            'version' => 1,
            'broker' => 'https://broker.example',
            'host_origin' => 'https://host.example',
            'capsule_id' => 'urn:uuid:00000000-0000-4000-8000-000000000001',
            'capsule_revision' => 1,
            'policy' => ['type' => 'ctx-policy'],
            'policy_sha256' => str_repeat('A', 43),
            'payload_id' => 'primary',
            'release_handle' => 'release_handle_0000000000000000000000000000',
            'action' => 'render',
            'cryptographic_suite' => 'ctx-capsule-v1',
            'view_event_consent' => true,
            'viewer' => [
                'name' => 'share-capsules-chromium-extension',
                'version' => '0.1.0',
                'browser_family' => 'Chrome',
                'browser_major' => 149,
            ],
            ...$overrides,
        ], $request->rules());
    }
}
