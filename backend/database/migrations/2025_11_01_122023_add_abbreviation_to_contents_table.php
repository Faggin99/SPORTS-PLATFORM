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
        Schema::table('contents', function (Blueprint $table) {
            $table->string('abbreviation', 10)->nullable()->after('name');
        });

        // Update existing contents with abbreviations
        DB::table('contents')->where('name', 'Organização Ofensiva')->update(['abbreviation' => 'OOF']);
        DB::table('contents')->where('name', 'Organização Defensiva')->update(['abbreviation' => 'ODF']);
        DB::table('contents')->where('name', 'Transição Ofensiva')->update(['abbreviation' => 'TOF']);
        DB::table('contents')->where('name', 'Transição Defensiva')->update(['abbreviation' => 'TDF']);
        DB::table('contents')->where('name', 'Bola Parada Ofensiva')->update(['abbreviation' => 'BPOF']);
        DB::table('contents')->where('name', 'Bola Parada Defensiva')->update(['abbreviation' => 'BPDF']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contents', function (Blueprint $table) {
            $table->dropColumn('abbreviation');
        });
    }
};
