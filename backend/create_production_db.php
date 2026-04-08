<?php

// This script creates a production-ready database with the trainer user

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

// Set database to production database file
$dbPath = __DIR__.'/database/database.sqlite';

// Delete old database if exists
if (file_exists($dbPath)) {
    unlink($dbPath);
    echo "Old database deleted\n";
}

// Create empty file
touch($dbPath);
echo "Empty database created at: $dbPath\n";

// Set environment
putenv("DB_DATABASE=$dbPath");
config(['database.connections.sqlite.database' => $dbPath]);

// Run migrations
echo "\nRunning migrations...\n";
\Artisan::call('migrate:fresh', ['--force' => true]);
echo \Artisan::output();

// Create trainer user
echo "\nCreating trainer user...\n";
$user = \App\Models\User::create([
    'name' => 'Prof. Lauro Martins',
    'email' => 'prof.lauromartins@gmail.com',
    'password' => bcrypt('Futsport123'),
    'email_verified_at' => now(),
]);

echo "✅ Trainer user created!\n";
echo "Email: prof.lauromartins@gmail.com\n";
echo "Password: Futsport123\n";
echo "\nDatabase size: " . filesize($dbPath) . " bytes\n";
echo "\nTotal users: " . \App\Models\User::count() . "\n";
