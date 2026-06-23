<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('broker')->table('broker_content_keys', function (Blueprint $table): void {
            $table->timestamp('pending_expires_at')->nullable()->index()->after('status');
            $table->timestamp('finalized_at')->nullable()->after('pending_expires_at');
        });
    }

    public function down(): void
    {
        Schema::connection('broker')->table('broker_content_keys', function (Blueprint $table): void {
            $table->dropColumn(['pending_expires_at', 'finalized_at']);
        });
    }
};
