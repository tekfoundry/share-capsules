<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ctx_capsule_release_counters', function (Blueprint $table): void {
            $table->id();
            $table->string('capsule_id', 45);
            $table->unsignedBigInteger('capsule_revision');
            $table->unsignedBigInteger('committed_releases')->default(0);
            $table->timestamps();
            $table->unique(['capsule_id', 'capsule_revision'], 'ctx_capsule_counter_unique');
        });
        Schema::create('ctx_account_capsule_release_counters', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('capsule_id', 45);
            $table->unsignedBigInteger('capsule_revision');
            $table->unsignedBigInteger('committed_releases')->default(0);
            $table->timestamps();
            $table->unique(['user_id', 'capsule_id', 'capsule_revision'], 'ctx_account_capsule_counter_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ctx_account_capsule_release_counters');
        Schema::dropIfExists('ctx_capsule_release_counters');
    }
};
