<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ctx_challenge_cadences', function (Blueprint $table): void {
            $table->id();
            $table->char('scope_sha256', 64)->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('viewer_device_id')->nullable();
            $table->string('host_origin', 2048);
            $table->string('broker', 2048);
            $table->string('capsule_id', 45);
            $table->unsignedBigInteger('capsule_revision');
            $table->string('policy_sha256', 43);
            $table->string('payload_id', 64);
            $table->string('release_handle', 128);
            $table->string('action', 32);
            $table->unsignedSmallInteger('challenge_success_streak')->default(0);
            $table->string('challenge_refresh_tier', 16)->default('standard');
            $table->unsignedTinyInteger('last_challenge_score')->nullable();
            $table->timestamp('last_challenged_at')->nullable();
            $table->timestamp('challenge_expires_at')->nullable()->index();
            $table->string('last_reset_reason', 64)->nullable();
            $table->timestamps();

            $table->foreign('viewer_device_id')->references('id')->on('viewer_devices')->nullOnDelete();
            $table->index(['user_id', 'viewer_device_id'], 'ctx_challenge_cadence_viewer');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ctx_challenge_cadences');
    }
};
