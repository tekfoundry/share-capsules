<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ctx_ticket_signing_keys', function (Blueprint $table): void {
            $table->string('kid', 32)->primary();
            $table->string('public_key', 43)->unique();
            $table->text('encrypted_private_key');
            $table->string('status', 16)->index();
            $table->timestamp('published_at');
            $table->timestamp('activated_at')->nullable();
            $table->timestamp('publish_until')->nullable()->index();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ctx_ticket_signing_keys');
    }
};
