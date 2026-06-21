<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ctx_authorization_tickets', function (Blueprint $table): void {
            $table->string('jti', 128)->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('viewer_device_id');
            $table->string('signing_kid', 32);
            $table->char('ticket_sha256', 64)->unique();
            $table->string('broker', 2048);
            $table->string('capsule_id', 45);
            $table->unsignedBigInteger('capsule_revision');
            $table->string('policy_sha256', 43);
            $table->string('payload_id', 128);
            $table->string('release_handle', 128);
            $table->string('proof_jkt', 43);
            $table->string('agreement_jkt', 43);
            $table->unsignedBigInteger('capsule_lifetime_limit')->nullable();
            $table->unsignedBigInteger('account_capsule_lifetime_limit')->nullable();
            $table->string('automation_risk_issuer', 2048)->nullable();
            $table->string('status', 16)->index();
            $table->timestamp('issued_at');
            $table->timestamp('expires_at')->index();
            $table->timestamp('redeemed_at')->nullable();
            $table->timestamps();

            $table->foreign('viewer_device_id')->references('id')->on('viewer_devices')->cascadeOnDelete();
            $table->foreign('signing_kid')->references('kid')->on('ctx_ticket_signing_keys');
            $table->index(['capsule_id', 'capsule_revision', 'status'], 'ctx_ticket_capsule_status');
            $table->index(['user_id', 'capsule_id', 'capsule_revision'], 'ctx_ticket_account_capsule');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ctx_authorization_tickets');
    }
};
