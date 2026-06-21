<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('oauth_access_tokens', function (Blueprint $table): void {
            $table->uuid('viewer_device_id')->nullable()->after('user_id');
            $table->string('proof_jkt', 43)->nullable()->after('viewer_device_id');
            $table->foreign('viewer_device_id')
                ->references('id')
                ->on('viewer_devices')
                ->cascadeOnUpdate()
                ->nullOnDelete();
            $table->index(['viewer_device_id', 'revoked']);
        });
    }

    public function down(): void
    {
        Schema::table('oauth_access_tokens', function (Blueprint $table): void {
            $table->dropForeign(['viewer_device_id']);
            $table->dropIndex(['viewer_device_id', 'revoked']);
            $table->dropColumn(['viewer_device_id', 'proof_jkt']);
        });
    }
};
