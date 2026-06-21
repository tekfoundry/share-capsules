<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('viewer_devices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 80);
            $table->string('proof_public_key', 43)->unique();
            $table->string('proof_jkt', 43)->unique();
            $table->string('agreement_public_key', 43)->unique();
            $table->string('agreement_jkt', 43)->unique();
            $table->string('status', 16)->index();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('suspended_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('viewer_devices');
    }
};
