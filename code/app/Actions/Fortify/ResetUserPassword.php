<?php

namespace App\Actions\Fortify;

use App\Account\Sessions\AccountSessionService;
use App\Models\User;
use App\Notifications\PasswordChanged;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\ResetsUserPasswords;

final readonly class ResetUserPassword implements ResetsUserPasswords
{
    use PasswordValidationRules;

    public function __construct(private AccountSessionService $sessions) {}

    /**
     * Validate and reset the user's forgotten password.
     *
     * @param  array<string, string>  $input
     *
     * @throws ValidationException
     */
    public function reset(User $user, array $input): void
    {
        Validator::make($input, [
            'password' => $this->passwordRules(),
        ])->validate();

        $user->forceFill([
            'password' => $input['password'],
        ])->save();

        $this->sessions->revokeAll($user);
        $user->notify(new PasswordChanged);
    }
}
