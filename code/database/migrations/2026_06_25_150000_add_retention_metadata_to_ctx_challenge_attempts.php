<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ctx_challenge_attempts', function (Blueprint $table): void {
            $table->string('retention_purpose', 64)->nullable()->after('expires_at');
            $table->timestamp('evidence_retained_until')->nullable()->after('retention_purpose')->index();
        });
    }

    public function down(): void
    {
        Schema::table('ctx_challenge_attempts', function (Blueprint $table): void {
            $table->dropColumn(['retention_purpose', 'evidence_retained_until']);
        });
    }
};
