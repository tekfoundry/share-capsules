<?php

namespace App\Ctx\Tickets;

interface ReleaseBindingVerifier
{
    public function valid(CtxTicketBindings $bindings): bool;
}
