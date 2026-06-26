<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ctx_authorization_tickets', function (Blueprint $table): void {
            $table->string('host_origin', 2048)->nullable()->after('ticket_sha256');
            $table->string('action', 32)->default('render')->after('release_handle');
        });
    }

    public function down(): void
    {
        Schema::table('ctx_authorization_tickets', function (Blueprint $table): void {
            $table->dropColumn(['host_origin', 'action']);
        });
    }
};
