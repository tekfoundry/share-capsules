<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ctx_challenge_attempts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
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
            $table->string('challenge_set_version', 64);
            $table->string('selector_version', 64);
            $table->string('scoring_model_version', 64);
            $table->string('status', 16);
            $table->unsignedTinyInteger('challenge_score')->nullable();
            $table->timestamp('issued_at');
            $table->timestamp('expires_at')->index();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->foreign('viewer_device_id')->references('id')->on('viewer_devices')->nullOnDelete();
            $table->index(['user_id', 'status', 'expires_at'], 'ctx_challenge_attempt_user_status');
            $table->index(
                ['user_id', 'viewer_device_id', 'capsule_id', 'capsule_revision', 'policy_sha256'],
                'ctx_challenge_attempt_binding',
            );
        });

        Schema::create('ctx_challenge_attempt_modules', function (Blueprint $table): void {
            $table->id();
            $table->uuid('ctx_challenge_attempt_id');
            $table->string('challenge_id', 64);
            $table->string('module_version', 32);
            $table->string('lifecycle_state', 16);
            $table->json('input_modes');
            $table->string('event_schema_version', 32);
            $table->string('scoring_adapter', 64);
            $table->string('scoring_adapter_version', 32);
            $table->unsignedSmallInteger('selection_weight')->default(1);
            $table->unsignedTinyInteger('score')->nullable();
            $table->json('reason_categories')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->foreign('ctx_challenge_attempt_id')
                ->references('id')->on('ctx_challenge_attempts')
                ->cascadeOnDelete();
            $table->unique(['ctx_challenge_attempt_id', 'challenge_id'], 'ctx_challenge_attempt_module_once');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ctx_challenge_attempt_modules');
        Schema::dropIfExists('ctx_challenge_attempts');
    }
};
