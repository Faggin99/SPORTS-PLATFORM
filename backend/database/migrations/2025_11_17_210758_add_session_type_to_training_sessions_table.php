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
        Schema::table('training_sessions', function (Blueprint $table) {
            $table->string('session_type')->default('training')->after('day_of_week'); // 'training', 'rest', 'match'
            $table->string('opponent_name')->nullable()->after('session_type'); // Nome do adversário quando session_type = 'match'

            $table->index('session_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('training_sessions', function (Blueprint $table) {
            $table->dropIndex(['session_type']);
            $table->dropColumn(['session_type', 'opponent_name']);
        });
    }
};
