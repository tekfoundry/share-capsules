<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ctx_automation_risk_assessments', function (Blueprint $table): void {
            $table->unsignedTinyInteger('usage_score')->default(100)->after('reason');
            $table->string('usage_confidence', 16)->default('zero')->after('usage_score');
        });
    }

    public function down(): void
    {
        Schema::table('ctx_automation_risk_assessments', function (Blueprint $table): void {
            $table->dropColumn(['usage_score', 'usage_confidence']);
        });
    }
};
