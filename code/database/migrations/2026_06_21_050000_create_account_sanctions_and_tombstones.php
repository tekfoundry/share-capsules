<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('account_sanctions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('category', 32);
            $table->timestamp('imposed_at');
            $table->timestamp('expires_at');
            $table->timestamp('reversed_at')->nullable();
            $table->string('appeal_reference', 64)->unique();

            $table->index(['user_id', 'reversed_at', 'expires_at']);
        });

        Schema::create('sanction_tombstones', function (Blueprint $table): void {
            $table->id();
            $table->binary('email_hmac', 32, true);
            $table->string('category', 32);
            $table->timestamp('imposed_at');
            $table->timestamp('sanction_expires_at');
            $table->string('appeal_reference', 64)->unique();
            $table->timestamp('retain_until')->index();
            $table->timestamp('created_at');

            $table->index('email_hmac');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sanction_tombstones');
        Schema::dropIfExists('account_sanctions');
    }
};
