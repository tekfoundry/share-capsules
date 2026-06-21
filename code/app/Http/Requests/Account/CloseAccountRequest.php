<?php

namespace App\Http\Requests\Account;

use Illuminate\Foundation\Http\FormRequest;

final class CloseAccountRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'acknowledge' => ['required', 'accepted'],
        ];
    }
}
