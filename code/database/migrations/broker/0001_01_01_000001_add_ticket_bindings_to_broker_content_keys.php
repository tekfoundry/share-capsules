<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('broker')->table('broker_content_keys', function (Blueprint $table): void {
            $table->unsignedBigInteger('capsule_revision')->after('capsule_id');
            $table->string('policy_sha256', 43)->after('payload_id');
        });
    }

    public function down(): void
    {
        Schema::connection('broker')->table('broker_content_keys', function (Blueprint $table): void {
            $table->dropColumn(['capsule_revision', 'policy_sha256']);
        });
    }
};
