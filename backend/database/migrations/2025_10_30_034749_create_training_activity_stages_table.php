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
        Schema::create('training_activity_stages', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->ulid('activity_id');
            $table->string('stage_name');
            $table->integer('order');
            $table->timestamps();

            $table->index(['activity_id', 'order']);
            $table->foreign('activity_id')->references('id')->on('training_activities')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_activity_stages');
    }
};
