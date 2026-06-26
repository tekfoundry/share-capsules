<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ctx_challenge_attempt_modules', function (Blueprint $table): void {
            $table->json('interaction_summary')->nullable()->after('reason_categories');
        });
    }

    public function down(): void
    {
        Schema::table('ctx_challenge_attempt_modules', function (Blueprint $table): void {
            $table->dropColumn('interaction_summary');
        });
    }
};
