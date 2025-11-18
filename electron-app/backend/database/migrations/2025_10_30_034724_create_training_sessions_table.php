<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('training_sessions', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->ulid('microcycle_id');
            $table->date('date');
            $table->string('day_name'); // Segunda, Terça, etc
            $table->integer('day_of_week'); // 1-7 (Monday-Sunday)
            $table->unsignedBigInteger('tenant_id');
            $table->timestamps();

            // Constraints
            $table->unique(['tenant_id', 'date']);
            $table->index(['tenant_id', 'date']);

            // Foreign keys
            $table->foreign('microcycle_id')->references('id')->on('training_microcycles')->onDelete('cascade');
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_sessions');
    }
};
