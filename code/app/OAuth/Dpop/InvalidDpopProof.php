<?php

namespace App\OAuth\Dpop;

use RuntimeException;

final class InvalidDpopProof extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('invalid_dpop_proof');
    }
}
