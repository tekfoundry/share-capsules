<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('broker')->create('broker_device_proofs', function (Blueprint $table): void {
            $table->string('jti', 128)->primary();
            $table->string('ticket_jti', 128)->index();
            $table->timestamp('expires_at')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection('broker')->dropIfExists('broker_device_proofs');
    }
};
