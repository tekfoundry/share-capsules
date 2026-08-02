<?php

namespace App\Showcase;

use App\Models\User;
use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

final readonly class ShowcaseAutomationIdentityResolver
{
    public function resolve(ShowcaseConfiguration $configuration): ShowcaseAutomationIdentity
    {
        $owner = User::query()->where('email', $configuration->ownerEmail)->first();
        if (! $owner instanceof User) {
            $owner = new User;
            $owner->forceFill([
                'email' => $configuration->ownerEmail,
                'email_verified_at' => $configuration->ownerVerified ? now() : null,
                'password' => Hash::make(Str::random(64)),
                'terms_accepted_at' => now(),
                'terms_version' => config('accounts.terms.version'),
            ])->save();
        } elseif ($configuration->ownerVerified && $owner->email_verified_at === null) {
            $owner->forceFill(['email_verified_at' => now()])->save();
        }

        if ($configuration->ownerVerified && $owner->email_verified_at === null) {
            throw new ShowcaseGenerationFailed('Showcase owner must be verified.');
        }

        $device = ViewerDevice::query()
            ->where('user_id', $owner->getKey())
            ->where('name', 'Showcase automation')
            ->first();
        if (! $device instanceof ViewerDevice) {
            $device = ViewerDevice::query()->create([
                'user_id' => $owner->getKey(),
                'name' => 'Showcase automation',
                'proof_public_key' => $this->identifier($configuration->ownerEmail, 'proof-public-key'),
                'proof_jkt' => $this->identifier($configuration->ownerEmail, 'proof-jkt'),
                'agreement_public_key' => $this->identifier($configuration->ownerEmail, 'agreement-public-key'),
                'agreement_jkt' => $this->identifier($configuration->ownerEmail, 'agreement-jkt'),
                'status' => ViewerDeviceStatus::Active,
            ]);
        } elseif ($device->status !== ViewerDeviceStatus::Active) {
            $device->forceFill([
                'status' => ViewerDeviceStatus::Active,
                'suspended_at' => null,
                'revoked_at' => null,
            ])->save();
        }

        return new ShowcaseAutomationIdentity($owner, $device);
    }

    private function identifier(string $email, string $purpose): string
    {
        return sodium_bin2base64(
            hash('sha256', "share-capsules-showcase|{$email}|{$purpose}", true),
            SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING,
        );
    }
}
