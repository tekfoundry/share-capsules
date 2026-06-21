<?php

namespace App\Broker\Release;

use App\Broker\Lifecycle\BrokerContentKeyStatus;
use App\Models\BrokerContentKey;
use Illuminate\Support\Facades\DB;

final class FinalContentKeyReleaseCheck
{
    public function active(string $recordId): bool
    {
        return DB::connection('broker')->transaction(
            fn (): bool => BrokerContentKey::query()
                ->whereKey($recordId)
                ->where('status', BrokerContentKeyStatus::Active->value)
                ->lockForUpdate()
                ->exists(),
        );
    }
}
