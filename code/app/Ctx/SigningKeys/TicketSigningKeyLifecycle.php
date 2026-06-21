<?php

namespace App\Ctx\SigningKeys;

use App\Ctx\Contracts\CtxV1;
use App\Models\CtxTicketSigningKey;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class TicketSigningKeyLifecycle
{
    public function __construct(
        private readonly TicketSigningKeyGenerator $generator,
    ) {}

    public function stage(?CarbonImmutable $now = null): CtxTicketSigningKey
    {
        $now ??= CarbonImmutable::now();

        return DB::transaction(function () use ($now): CtxTicketSigningKey {
            $publishableCount = CtxTicketSigningKey::query()
                ->whereIn('status', [
                    TicketSigningKeyStatus::Published,
                    TicketSigningKeyStatus::Active,
                    TicketSigningKeyStatus::Retiring,
                ])
                ->lockForUpdate()
                ->count();

            if ($publishableCount >= CtxV1::MAX_PUBLISHED_SIGNING_KEYS) {
                throw new SigningKeyLifecycleViolation('The CTX JWKS key limit has been reached.');
            }

            $material = $this->generator->generate();

            return CtxTicketSigningKey::query()->create([
                'kid' => strtolower((string) Str::ulid()),
                'public_key' => $material->publicKey,
                'encrypted_private_key' => $material->privateKey,
                'status' => TicketSigningKeyStatus::Published,
                'published_at' => $now,
            ]);
        });
    }

    public function activate(string $kid, ?CarbonImmutable $now = null): void
    {
        $now ??= CarbonImmutable::now();

        DB::transaction(function () use ($kid, $now): void {
            $keys = CtxTicketSigningKey::query()->lockForUpdate()->get()->keyBy('kid');
            $target = $keys->get($kid);

            if (! $target instanceof CtxTicketSigningKey
                || $target->status !== TicketSigningKeyStatus::Published) {
                throw new SigningKeyLifecycleViolation('Only a published CTX signing key can be activated.');
            }

            foreach ($keys as $key) {
                if ($key->status !== TicketSigningKeyStatus::Active) {
                    continue;
                }

                $key->forceFill([
                    'status' => TicketSigningKeyStatus::Retiring,
                    'publish_until' => $now->addSeconds(
                        CtxV1::TICKET_LIFETIME_SECONDS + CtxV1::CLOCK_SKEW_SECONDS,
                    ),
                ])->save();
            }

            $target->forceFill([
                'status' => TicketSigningKeyStatus::Active,
                'activated_at' => $now,
            ])->save();
        });
    }

    public function revoke(string $kid, ?CarbonImmutable $now = null): void
    {
        $now ??= CarbonImmutable::now();

        DB::transaction(function () use ($kid, $now): void {
            $key = CtxTicketSigningKey::query()->lockForUpdate()->find($kid);
            if (! $key instanceof CtxTicketSigningKey
                || in_array($key->status, [TicketSigningKeyStatus::Retired, TicketSigningKeyStatus::Revoked], true)) {
                throw new SigningKeyLifecycleViolation('The CTX signing key cannot be revoked from its current state.');
            }

            $key->forceFill([
                'status' => TicketSigningKeyStatus::Revoked,
                'publish_until' => null,
                'revoked_at' => $now,
            ])->save();
        });
    }

    /** @return Collection<int, CtxTicketSigningKey> */
    public function publicKeys(?CarbonImmutable $now = null): Collection
    {
        $now ??= CarbonImmutable::now();

        return CtxTicketSigningKey::query()
            ->where(function ($query) use ($now): void {
                $query->whereIn('status', [
                    TicketSigningKeyStatus::Published,
                    TicketSigningKeyStatus::Active,
                ])->orWhere(function ($query) use ($now): void {
                    $query->where('status', TicketSigningKeyStatus::Retiring)
                        ->where('publish_until', '>', $now);
                });
            })
            ->orderBy('kid')
            ->get();
    }

    public function retireExpired(?CarbonImmutable $now = null): int
    {
        $now ??= CarbonImmutable::now();

        return CtxTicketSigningKey::query()
            ->where('status', TicketSigningKeyStatus::Retiring)
            ->where('publish_until', '<=', $now)
            ->update(['status' => TicketSigningKeyStatus::Retired]);
    }
}
