<?php

namespace App\Actions\Fortify;

use App\Models\User;
use App\Rules\NotUnderActiveDeletionSanction;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\CreatesNewUsers;

final class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;

    public function __construct(
        private readonly NotUnderActiveDeletionSanction $notUnderActiveDeletionSanction,
    ) {}

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     *
     * @throws ValidationException
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            'email' => [
                'required',
                'string',
                'email',
                'max:254',
                Rule::unique(User::class),
                $this->notUnderActiveDeletionSanction,
            ],
            'password' => $this->passwordRules(),
            'terms' => ['required', 'accepted'],
        ])->validate();

        return User::create([
            'email' => $input['email'],
            'password' => $input['password'],
            'terms_accepted_at' => now(),
            'terms_version' => config('accounts.terms.version'),
        ]);
    }
}
