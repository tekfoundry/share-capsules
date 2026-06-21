<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('broker')->create('broker_content_keys', function (Blueprint $table): void {
            $table->string('record_id', 43)->primary();
            $table->string('registration_id', 128)->unique();
            $table->string('release_handle', 43)->unique();
            $table->string('creator_id');
            $table->string('capsule_id', 45);
            $table->string('payload_id', 64);
            $table->string('content_key_sha256', 43);
            $table->string('protection_algorithm', 64);
            $table->string('protection_key_id', 128);
            $table->string('protection_nonce', 64);
            $table->text('protected_content_key');
            $table->string('status', 16)->default('active');
            $table->timestamps();

            $table->unique(['capsule_id', 'payload_id']);
        });
    }

    public function down(): void
    {
        Schema::connection('broker')->dropIfExists('broker_content_keys');
    }
};
