<?php

namespace App\Rules;

use App\Account\Sanctions\SanctionEmailHasher;
use App\Models\SanctionTombstone;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

final readonly class NotUnderActiveDeletionSanction implements ValidationRule
{
    public function __construct(private SanctionEmailHasher $hasher) {}

    /** @param Closure(string): PotentiallyTranslatedString $fail */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            return;
        }

        $isRestricted = SanctionTombstone::query()
            ->where('email_hmac', $this->hasher->hash($value))
            ->where('retain_until', '>', now())
            ->exists();

        if ($isRestricted) {
            $fail('This email address cannot be used while an account sanction is active. Contact info@tekfoundry.com for appeal assistance.');
        }
    }
}
