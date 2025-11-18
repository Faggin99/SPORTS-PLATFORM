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
        Schema::create('training_activity_contents', function (Blueprint $table) {
            $table->ulid('activity_id');
            $table->ulid('content_id');

            $table->primary(['activity_id', 'content_id']);
            $table->foreign('activity_id')->references('id')->on('training_activities')->onDelete('cascade');
            $table->foreign('content_id')->references('id')->on('contents')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_activity_contents');
    }
};
