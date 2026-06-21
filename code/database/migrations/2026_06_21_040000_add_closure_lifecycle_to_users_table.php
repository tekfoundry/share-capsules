<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->timestamp('closed_at')->nullable()->after('remember_token');
            $table->timestamp('deletion_due_at')->nullable()->after('closed_at')->index();
            $table->string('closure_recovery_token_hash', 64)
                ->nullable()
                ->after('deletion_due_at');
            $table->timestamp('last_restored_at')->nullable()->after('closure_recovery_token_hash');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropIndex(['deletion_due_at']);
            $table->dropColumn([
                'closed_at',
                'deletion_due_at',
                'closure_recovery_token_hash',
                'last_restored_at',
            ]);
        });
    }
};
