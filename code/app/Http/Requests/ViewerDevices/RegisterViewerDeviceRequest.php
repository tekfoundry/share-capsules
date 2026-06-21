<?php

namespace App\Http\Requests\ViewerDevices;

use Illuminate\Foundation\Http\FormRequest;

final class RegisterViewerDeviceRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge(['name' => $this->string('name')->trim()->toString()]);
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'challenge_id' => ['required', 'uuid'],
            'name' => ['required', 'string', 'min:1', 'max:80'],
            'proof_signature' => ['required', 'string', 'size:86'],
            'agreement_confirmation' => ['required', 'string', 'size:43'],
        ];
    }
}
