<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ctx_automation_risk_activities', function (Blueprint $table): void {
            $table->string('event_id', 43)->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('viewer_device_id')->nullable();
            $table->string('activity_type', 32);
            $table->string('capsule_id', 45);
            $table->unsignedBigInteger('capsule_revision');
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->foreign('viewer_device_id')->references('id')->on('viewer_devices')->nullOnDelete();
            $table->index(['user_id', 'activity_type', 'occurred_at'], 'ctx_risk_activity_window');
            $table->index(['user_id', 'occurred_at', 'capsule_id'], 'ctx_risk_capsule_spread');
        });

        Schema::create('ctx_automation_risk_assessments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('issuer', 2048);
            $table->string('issuer_key', 43);
            $table->string('ruleset', 64);
            $table->string('decision', 16);
            $table->string('reason', 40);
            $table->timestamp('evaluated_at');
            $table->timestamp('expires_at')->index();
            $table->timestamps();

            $table->unique(['user_id', 'issuer_key'], 'ctx_risk_assessment_identity');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ctx_automation_risk_assessments');
        Schema::dropIfExists('ctx_automation_risk_activities');
    }
};
