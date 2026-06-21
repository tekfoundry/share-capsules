<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Passport\Contracts\OAuthenticatable;
use Laravel\Passport\HasApiTokens;

#[Fillable(['email', 'password', 'terms_accepted_at', 'terms_version'])]
#[Hidden(['password', 'remember_token', 'closure_recovery_token_hash'])]
class User extends Authenticatable implements MustVerifyEmail, OAuthenticatable, PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, PasskeyAuthenticatable;

    /** @return HasMany<ViewerDevice, $this> */
    public function viewerDevices(): HasMany
    {
        return $this->hasMany(ViewerDevice::class);
    }

    public function isClosed(): bool
    {
        return $this->closed_at !== null;
    }

    public function isRecoverable(): bool
    {
        return $this->isClosed()
            && $this->deletion_due_at !== null
            && $this->deletion_due_at->isFuture();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'terms_accepted_at' => 'immutable_datetime',
            'closed_at' => 'immutable_datetime',
            'deletion_due_at' => 'immutable_datetime',
            'last_restored_at' => 'immutable_datetime',
        ];
    }
}
