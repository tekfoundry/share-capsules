<?php

namespace App\Showcase;

use App\Models\User;
use App\Models\ViewerDevice;

final readonly class ShowcaseAutomationIdentity
{
    public function __construct(
        public User $owner,
        public ViewerDevice $device,
    ) {}
}
