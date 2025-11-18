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
        Schema::create('training_activity_blocks', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->ulid('session_id');
            $table->string('name');
            $table->integer('order');
            $table->timestamps();

            $table->index(['session_id', 'order']);
            $table->foreign('session_id')->references('id')->on('training_sessions')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_activity_blocks');
    }
};
