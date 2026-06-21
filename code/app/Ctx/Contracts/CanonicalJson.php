<?php

namespace App\Ctx\Contracts;

final class CanonicalJson
{
    public function encode(mixed $value): string
    {
        if (is_array($value)) {
            if (array_is_list($value)) {
                return '['.implode(',', array_map($this->encode(...), $value)).']';
            }
            ksort($value, SORT_STRING);
            $members = [];
            foreach ($value as $key => $member) {
                $members[] = json_encode((string) $key, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
                    .':'.$this->encode($member);
            }

            return '{'.implode(',', $members).'}';
        }

        return json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
}
