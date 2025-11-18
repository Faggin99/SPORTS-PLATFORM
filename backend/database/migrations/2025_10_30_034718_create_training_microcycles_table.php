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
        Schema::create('training_microcycles', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('week_identifier'); // ISO week format: "YYYY-WW"
            $table->string('name')->nullable(); // Human-readable name
            $table->date('start_date');
            $table->date('end_date');
            $table->unsignedBigInteger('tenant_id');
            $table->timestamps();

            // Índices
            $table->index(['tenant_id', 'start_date']);
            $table->index(['tenant_id', 'week_identifier']); // Query optimization for week lookup

            // Foreign keys
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_microcycles');
    }
};
