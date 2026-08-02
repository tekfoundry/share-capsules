<?php

namespace App\Showcase;

interface ShowcaseCapsuleBridge
{
    public function prepare(ShowcaseCapsulePrepareInput $input): ShowcaseCapsulePrepareResult;

    public function complete(ShowcaseCapsuleCompleteInput $input): ShowcaseCapsuleCompleteResult;
}
