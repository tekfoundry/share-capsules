<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

final class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered(): void
    {
        $this->get(route('register'))
            ->assertOk()
            ->assertSee('Create your account')
            ->assertSee('account terms')
            ->assertSee('privacy notice');
    }

    public function test_a_person_can_register_with_the_minimum_account_information(): void
    {
        Notification::fake();

        $response = $this->post(route('register.store'), [
            'email' => '  Creator@Example.COM ',
            'password' => 'Correct-Horse-42!',
            'password_confirmation' => 'Correct-Horse-42!',
            'terms' => '1',
        ]);

        $user = User::query()->sole();

        $response->assertRedirect(route('verification.notice'));
        $this->assertAuthenticatedAs($user);
        $this->assertSame('creator@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
        $this->assertNotNull($user->terms_accepted_at);
        $this->assertSame(config('accounts.terms.version'), $user->terms_version);
        $this->assertTrue(Hash::check('Correct-Horse-42!', $user->password));
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_registration_requires_current_terms_acceptance(): void
    {
        $this->post(route('register.store'), [
            'email' => 'viewer@example.com',
            'password' => 'Correct-Horse-42!',
            'password_confirmation' => 'Correct-Horse-42!',
        ])->assertSessionHasErrors('terms');

        $this->assertDatabaseCount('users', 0);
        $this->assertGuest();
    }

    public function test_registration_enforces_the_password_policy(): void
    {
        $this->post(route('register.store'), [
            'email' => 'viewer@example.com',
            'password' => 'too-short',
            'password_confirmation' => 'too-short',
            'terms' => '1',
        ])->assertSessionHasErrors('password');

        $this->assertDatabaseCount('users', 0);
    }

    public function test_an_email_address_can_only_be_registered_once(): void
    {
        User::factory()->create(['email' => 'viewer@example.com']);

        $this->post(route('register.store'), [
            'email' => 'VIEWER@example.com',
            'password' => 'Correct-Horse-42!',
            'password_confirmation' => 'Correct-Horse-42!',
            'terms' => '1',
        ])->assertSessionHasErrors('email');

        $this->assertDatabaseCount('users', 1);
    }

    public function test_repeated_registration_attempts_are_rate_limited(): void
    {
        foreach (range(1, 5) as $attempt) {
            $this->post(route('register.store'), [
                'email' => "invalid-{$attempt}",
            ])->assertRedirect();
        }

        $this->post(route('register.store'), [
            'email' => 'another-invalid-address',
        ])->assertTooManyRequests();
    }
}
