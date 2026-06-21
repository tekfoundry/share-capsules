<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection((string) config('accounts.deletion_ledger.connection'))
            ->create('account_deletion_ledger', function (Blueprint $table): void {
                $table->ulid('id')->primary();
                $table->unsignedBigInteger('account_id')->unique();
                $table->timestamp('deletion_due_at');
                $table->timestamp('recorded_at');
                $table->timestamp('retain_until')->index();
            });

        Schema::create('deletion_restore_checkpoints', function (Blueprint $table): void {
            $table->uuid('restore_id')->primary();
            $table->ulid('ledger_high_watermark')->nullable();
            $table->timestamp('completed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deletion_restore_checkpoints');
        Schema::connection((string) config('accounts.deletion_ledger.connection'))
            ->dropIfExists('account_deletion_ledger');
    }
};
