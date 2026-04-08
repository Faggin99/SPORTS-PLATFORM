<?php

// Create production SQLite database

$dbPath = __DIR__.'/database/database.sqlite';

// Delete old database
if (file_exists($dbPath)) {
    unlink($dbPath);
    echo "Old database deleted\n";
}

// Create new SQLite database
$db = new PDO('sqlite:' . $dbPath);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "Creating tables...\n";

// Create users table
$db->exec("
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    email_verified_at TIMESTAMP NULL,
    password VARCHAR(255) NOT NULL,
    remember_token VARCHAR(100) NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);
");

echo "Users table created\n";

// Insert trainer user
$password = password_hash('Futsport123', PASSWORD_BCRYPT);
$now = date('Y-m-d H:i:s');

$stmt = $db->prepare("
    INSERT INTO users (name, email, email_verified_at, password, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
");

$stmt->execute([
    'Prof. Lauro Martins',
    'prof.lauromartins@gmail.com',
    $now,
    $password,
    $now,
    $now
]);

echo "\n✅ Database created successfully!\n";
echo "Email: prof.lauromartins@gmail.com\n";
echo "Password: Futsport123\n";
echo "\nDatabase size: " . filesize($dbPath) . " bytes\n";

$db = null;
