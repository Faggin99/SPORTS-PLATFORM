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
        Schema::create('athletes', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('name');
            $table->string('position')->nullable();
            $table->integer('jersey_number')->nullable();
            $table->string('status')->default('active');
            $table->text('observation')->nullable();
            $table->string('group')->nullable(); // G1, G2, G3, Transição, DM
            $table->string('photo_url')->nullable();
            $table->unsignedBigInteger('tenant_id');
            $table->timestamps();

            $table->index(['tenant_id', 'group']);
            // Unique constraint condicional (apenas quando jersey_number não for null)
            // PostgreSQL suporta isso, mas para compatibilidade faremos no model
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('athletes');
    }
};
