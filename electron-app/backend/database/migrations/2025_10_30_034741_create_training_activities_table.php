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
        Schema::create('training_activities', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->ulid('block_id');
            $table->ulid('title_id')->nullable();
            $table->text('description')->nullable();
            $table->json('groups'); // ["G1", "G3"]
            $table->boolean('is_rest')->default(false);
            $table->integer('duration_minutes')->nullable();
            $table->unsignedBigInteger('tenant_id');
            $table->timestamps();

            $table->index('block_id');
            $table->foreign('block_id')->references('id')->on('training_activity_blocks')->onDelete('cascade');
            $table->foreign('title_id')->references('id')->on('activity_titles')->onDelete('set null');
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_activities');
    }
};
