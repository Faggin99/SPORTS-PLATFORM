<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('training_activity_files', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->ulid('activity_id')->nullable();
            $table->ulid('session_id')->nullable();
            $table->string('file_path');
            $table->enum('file_type', ['video', 'pdf']);
            $table->enum('phase', ['pre', 'post', 'none'])->default('none');
            $table->string('original_name');
            $table->bigInteger('file_size');
            $table->string('mime_type');
            $table->unsignedBigInteger('created_by');
            $table->unsignedBigInteger('tenant_id');
            $table->timestamps();

            $table->index(['tenant_id', 'session_id']);
            $table->index('activity_id');
            $table->foreign('session_id')->references('id')->on('training_sessions')->onDelete('cascade');
            $table->foreign('activity_id')->references('id')->on('training_activities')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });

        // CHECK constraint: session_id IS NULL OR activity_id IS NULL
        DB::statement('ALTER TABLE training_activity_files ADD CONSTRAINT check_single_parent CHECK ((session_id IS NULL AND activity_id IS NOT NULL) OR (session_id IS NOT NULL AND activity_id IS NULL))');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE training_activity_files DROP CONSTRAINT IF EXISTS check_single_parent');
        Schema::dropIfExists('training_activity_files');
    }
};
