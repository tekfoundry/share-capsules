<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('creator_capsules', function (Blueprint $table): void {
            $table->string('title', 200)->nullable()->after('payload_id');
            $table->string('management_label', 200)->nullable()->after('title');
            $table->string('content_profile_id', 128)->nullable()->after('management_label');
            $table->string('content_profile_version', 32)->nullable()->after('content_profile_id');
            $table->string('media_type', 127)->nullable()->after('content_profile_version');
        });
    }

    public function down(): void
    {
        Schema::table('creator_capsules', function (Blueprint $table): void {
            $table->dropColumn([
                'title',
                'management_label',
                'content_profile_id',
                'content_profile_version',
                'media_type',
            ]);
        });
    }
};
