<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('broker')->table('broker_content_keys', function (Blueprint $table): void {
            $table->string('creator_id')->nullable()->change();
            $table->string('protection_algorithm', 64)->nullable()->change();
            $table->string('protection_key_id', 128)->nullable()->change();
            $table->string('protection_nonce', 64)->nullable()->change();
            $table->text('protected_content_key')->nullable()->change();
            $table->timestamp('paused_at')->nullable()->after('status');
            $table->timestamp('revoked_at')->nullable()->after('paused_at');
            $table->timestamp('destroyed_at')->nullable()->after('revoked_at');
            $table->index(['creator_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::connection('broker')->table('broker_content_keys', function (Blueprint $table): void {
            $table->dropIndex(['creator_id', 'status']);
            $table->dropColumn(['paused_at', 'revoked_at', 'destroyed_at']);
            $table->string('creator_id')->nullable(false)->change();
            $table->string('protection_algorithm', 64)->nullable(false)->change();
            $table->string('protection_key_id', 128)->nullable(false)->change();
            $table->string('protection_nonce', 64)->nullable(false)->change();
            $table->text('protected_content_key')->nullable(false)->change();
        });
    }
};
