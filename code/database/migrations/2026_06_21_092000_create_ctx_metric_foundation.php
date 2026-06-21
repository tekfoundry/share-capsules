<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ctx_metric_event_records', function (Blueprint $table): void {
            $table->string('event_id', 128)->primary();
            $table->unsignedTinyInteger('schema_version');
            $table->string('event_type', 40);
            $table->string('provider', 2048);
            $table->string('provider_key', 43);
            $table->string('broker', 2048)->nullable();
            $table->string('capsule_id', 45);
            $table->unsignedBigInteger('capsule_revision');
            $table->string('denial_category', 24)->nullable();
            $table->json('optional_dimensions');
            $table->timestamp('occurred_at')->index();
            $table->timestamp('projected_at');
            $table->timestamps();

            $table->index(['provider_key', 'capsule_id', 'capsule_revision'], 'ctx_metric_event_capsule');
        });

        Schema::create('ctx_capsule_metric_projections', function (Blueprint $table): void {
            $table->id();
            $table->string('provider', 2048);
            $table->string('provider_key', 43);
            $table->string('capsule_id', 45);
            $table->unsignedBigInteger('capsule_revision');
            $table->unsignedBigInteger('authorization_attempts')->default(0);
            $table->unsignedBigInteger('authorization_approved')->default(0);
            $table->unsignedBigInteger('authorization_denied')->default(0);
            $table->unsignedBigInteger('redemption_committed')->default(0);
            $table->unsignedBigInteger('ticket_rejected')->default(0);
            $table->unsignedBigInteger('capsule_revoked')->default(0);
            $table->unsignedBigInteger('release_paused')->default(0);
            $table->timestamp('fresh_through')->nullable();
            $table->timestamps();

            $table->unique(['provider_key', 'capsule_id', 'capsule_revision'], 'ctx_metric_projection_unique');
        });

        Schema::create('ctx_capsule_metric_buckets', function (Blueprint $table): void {
            $table->id();
            $table->string('provider', 2048);
            $table->string('provider_key', 43);
            $table->string('capsule_id', 45);
            $table->unsignedBigInteger('capsule_revision');
            $table->timestamp('bucket_start');
            $table->unsignedBigInteger('authorization_attempts')->default(0);
            $table->unsignedBigInteger('authorization_approved')->default(0);
            $table->unsignedBigInteger('authorization_denied')->default(0);
            $table->unsignedBigInteger('redemption_committed')->default(0);
            $table->unsignedBigInteger('ticket_rejected')->default(0);
            $table->timestamps();

            $table->unique(
                ['provider_key', 'capsule_id', 'capsule_revision', 'bucket_start'],
                'ctx_metric_bucket_unique',
            );
        });

        Schema::create('ctx_capsule_metric_denials', function (Blueprint $table): void {
            $table->id();
            $table->string('provider', 2048);
            $table->string('provider_key', 43);
            $table->string('capsule_id', 45);
            $table->unsignedBigInteger('capsule_revision');
            $table->string('category', 24);
            $table->unsignedBigInteger('occurrences')->default(0);
            $table->timestamps();

            $table->unique(
                ['provider_key', 'capsule_id', 'capsule_revision', 'category'],
                'ctx_metric_denial_unique',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ctx_capsule_metric_denials');
        Schema::dropIfExists('ctx_capsule_metric_buckets');
        Schema::dropIfExists('ctx_capsule_metric_projections');
        Schema::dropIfExists('ctx_metric_event_records');
    }
};
