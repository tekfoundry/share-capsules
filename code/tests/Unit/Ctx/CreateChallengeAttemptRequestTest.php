<?php

namespace Tests\Unit\Ctx;

use App\Http\Requests\Ctx\CreateChallengeAttemptRequest;
use Tests\TestCase;

final class CreateChallengeAttemptRequestTest extends TestCase
{
    public function test_challenge_return_url_accepts_extension_callback_and_local_playground_only(): void
    {
        $this->assertTrue(CreateChallengeAttemptRequest::isChallengeReturnUrl(
            'https://dhconceamghcnndjodjhjikknblhkmej.chromiumapp.org/challenge/callback',
        ));
        $this->assertTrue(CreateChallengeAttemptRequest::isChallengeReturnUrl(
            'http://localhost:3003/ctx/challenge-playground/circuit-trace',
        ));
        $this->assertTrue(CreateChallengeAttemptRequest::isChallengeReturnUrl(
            'http://localhost:3003/ctx/challenge-playground/balance-beam',
        ));
        $this->assertTrue(CreateChallengeAttemptRequest::isChallengeReturnUrl(
            'http://localhost:3003/ctx/challenge-playground/signal-tune',
        ));
        $this->assertTrue(CreateChallengeAttemptRequest::isChallengeReturnUrl(
            'http://localhost:3003/ctx/challenge-playground/cargo-sort',
        ));
        $this->assertTrue(CreateChallengeAttemptRequest::isChallengeReturnUrl(
            'http://localhost:3003/ctx/challenge-playground/memory-path',
        ));
        $this->assertTrue(CreateChallengeAttemptRequest::isChallengeReturnUrl(
            'http://localhost:3003/ctx/challenge-playground/pattern-repair',
        ));
        $this->assertFalse(CreateChallengeAttemptRequest::isChallengeReturnUrl(
            'http://localhost:3003/ctx/challenge-playground/other',
        ));
        $this->assertFalse(CreateChallengeAttemptRequest::isChallengeReturnUrl(
            'https://sharecapsules.test/ctx/challenge-playground/circuit-trace',
        ));
    }
}
