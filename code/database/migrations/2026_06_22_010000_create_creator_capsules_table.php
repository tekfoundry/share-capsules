<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('creator_capsules', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('registration_id', 128)->unique();
            $table->string('capsule_id', 45);
            $table->unsignedBigInteger('capsule_revision');
            $table->string('payload_id', 64);
            $table->string('broker', 2048);
            $table->string('release_handle', 128)->nullable()->unique();
            $table->string('policy_sha256', 43);
            $table->json('policy');
            $table->timestamp('not_before')->nullable();
            $table->timestamp('not_after')->nullable();
            $table->unsignedBigInteger('capsule_lifetime_limit')->nullable();
            $table->unsignedBigInteger('account_capsule_lifetime_limit')->nullable();
            $table->string('automation_risk_issuer', 2048)->nullable();
            $table->string('status', 32)->index();
            $table->timestamp('pending_expires_at')->index();
            $table->timestamp('finalized_at')->nullable();
            $table->timestamp('revocation_requested_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamp('cleanup_requested_at')->nullable();
            $table->timestamp('destroyed_at')->nullable();
            $table->timestamps();

            $table->unique(['capsule_id', 'capsule_revision'], 'creator_capsule_revision_unique');
            $table->index(['user_id', 'status'], 'creator_capsule_owner_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('creator_capsules');
    }
};
