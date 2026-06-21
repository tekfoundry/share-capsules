<?php

namespace App\Http\Requests\Account;

use Illuminate\Foundation\Http\FormRequest;

final class RequestAccountRecoveryLink extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:254'],
        ];
    }
}
