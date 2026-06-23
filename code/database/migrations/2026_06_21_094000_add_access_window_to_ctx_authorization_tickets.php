<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ctx_authorization_tickets', function (Blueprint $table): void {
            $table->dateTime('not_before')->nullable()->after('agreement_jkt');
            $table->dateTime('not_after')->nullable()->after('not_before');
        });
    }

    public function down(): void
    {
        Schema::table('ctx_authorization_tickets', function (Blueprint $table): void {
            $table->dropColumn(['not_before', 'not_after']);
        });
    }
};
