<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('viewer_device_challenges', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('device_id')->index();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('nonce', 43);
            $table->string('proof_public_key', 43);
            $table->string('proof_jkt', 43);
            $table->string('agreement_public_key', 43);
            $table->string('agreement_jkt', 43);
            $table->string('server_agreement_public_key', 43);
            $table->binary('agreement_confirmation_hash');
            $table->timestamp('expires_at')->index();
            $table->timestamp('consumed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('viewer_device_challenges');
    }
};
