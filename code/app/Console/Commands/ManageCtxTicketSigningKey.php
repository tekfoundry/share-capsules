<?php

namespace App\Console\Commands;

use App\Ctx\SigningKeys\SigningKeyLifecycleViolation;
use App\Ctx\SigningKeys\TicketSigningKeyLifecycle;
use Illuminate\Console\Command;

final class ManageCtxTicketSigningKey extends Command
{
    protected $signature = 'ctx:ticket-signing-key
        {action : stage, activate, revoke, or retire-expired}
        {kid? : Key identifier for activate or revoke}';

    protected $description = 'Manage the controlled lifecycle of CTX ticket-signing keys';

    public function handle(TicketSigningKeyLifecycle $lifecycle): int
    {
        $action = (string) $this->argument('action');
        $kid = $this->argument('kid');

        try {
            return match ($action) {
                'stage' => $this->stage($lifecycle),
                'activate' => $this->changeState($lifecycle, $kid, 'activate'),
                'revoke' => $this->changeState($lifecycle, $kid, 'revoke'),
                'retire-expired' => $this->retireExpired($lifecycle),
                default => $this->invalidAction(),
            };
        } catch (SigningKeyLifecycleViolation $exception) {
            $this->components->error($exception->getMessage());

            return self::FAILURE;
        }
    }

    private function stage(TicketSigningKeyLifecycle $lifecycle): int
    {
        $key = $lifecycle->stage();
        $this->components->info("Published CTX ticket-signing key {$key->kid}.");

        return self::SUCCESS;
    }

    private function changeState(
        TicketSigningKeyLifecycle $lifecycle,
        mixed $kid,
        string $action,
    ): int {
        if (! is_string($kid) || $kid === '') {
            $this->components->error("A key identifier is required to {$action} a key.");

            return self::INVALID;
        }

        $lifecycle->{$action}($kid);
        $this->components->info(ucfirst($action)."d CTX ticket-signing key {$kid}.");

        return self::SUCCESS;
    }

    private function retireExpired(TicketSigningKeyLifecycle $lifecycle): int
    {
        $count = $lifecycle->retireExpired();
        $this->components->info("Retired {$count} expired CTX ticket-signing key(s).");

        return self::SUCCESS;
    }

    private function invalidAction(): int
    {
        $this->components->error('Action must be stage, activate, revoke, or retire-expired.');

        return self::INVALID;
    }
}
