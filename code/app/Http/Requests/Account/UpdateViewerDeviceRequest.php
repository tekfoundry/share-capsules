<?php

namespace App\Http\Requests\Account;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateViewerDeviceRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge(['name' => $this->string('name')->trim()->toString()]);
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:1', 'max:80'],
        ];
    }
}
