<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Check if user exists
$user = \App\Models\User::where('email', 'prof.lauromartins@gmail.com')->first();

if ($user) {
    echo "Usuario ja existe!\n";
    echo "Email: {$user->email}\n";
    echo "Atualizando senha...\n";
    $user->password = bcrypt('Futsport123');
    $user->save();
    echo "Senha atualizada com sucesso!\n";
} else {
    // Create trainer user
    $user = \App\Models\User::create([
        'name' => 'Prof. Lauro Martins',
        'email' => 'prof.lauromartins@gmail.com',
        'password' => bcrypt('Futsport123'),
        'email_verified_at' => now(),
    ]);

    echo "Usuario treinador criado com sucesso!\n";
    echo "Email: prof.lauromartins@gmail.com\n";
    echo "Senha: Futsport123\n";
}

echo "\nTotal de usuarios no sistema: " . \App\Models\User::count() . "\n";
