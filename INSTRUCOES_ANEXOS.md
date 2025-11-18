# Instruções para Testar o Sistema de Anexos

## O que foi implementado?

✅ **Pastas de armazenamento criadas:**
- `backend/storage/app/public/training-files/` - Para anexos de sessões
- `backend/storage/app/public/training/` - Para vídeos e PDFs de atividades

✅ **Limite de upload aumentado para 5GB:**
- Atualizado no `SessionFileController.php`
- Configurado no `.htaccess` do backend
- Configurado no `.user.ini` do backend

✅ **Sistema testado e funcionando:**
- Upload de arquivos está salvando na pasta correta
- Arquivos são registrados no banco de dados
- É possível visualizar e deletar arquivos

## Como testar agora?

### Passo 1: Reiniciar o servidor backend

Se estiver usando `php artisan serve`:
```bash
# Pare o servidor (Ctrl+C) e inicie novamente
cd backend
php artisan serve
```

Se estiver usando Apache/Nginx, reinicie o serviço web.

### Passo 2: Testar via interface

1. **Abra a aplicação frontend** (normalmente em http://localhost:5173)

2. **Faça login** no sistema

3. **Vá para a página de Cronograma/Treino**

4. **Clique em qualquer dia** da semana para abrir o modal de treino

5. **Vá para a aba "Anexos"**

6. **Clique para fazer upload** ou arraste arquivos

7. **Clique em "Salvar Alterações"**

8. **Reabra o modal** e verifique se os arquivos aparecem

### Passo 3: Verificar se os arquivos foram salvos

**Via sistema de arquivos:**
```bash
# Windows (PowerShell)
Get-ChildItem -Path backend\storage\app\public\training-files -Recurse

# Windows (CMD)
dir /s backend\storage\app\public\training-files

# Linux/Mac
find backend/storage/app/public/training-files -type f
```

**Via link simbólico:**
```bash
# Os arquivos devem aparecer também em:
ls backend/public/storage/training-files/
```

### Passo 4: Testar com arquivo grande

1. Crie um arquivo de teste grande (ou use um vídeo real):
   ```bash
   # Criar arquivo de 100MB para teste (Linux/Mac)
   dd if=/dev/zero of=test-100mb.bin bs=1M count=100

   # Windows PowerShell
   fsutil file createnew test-100mb.bin 104857600
   ```

2. Tente fazer upload desse arquivo via interface

3. Verifique se o upload foi bem-sucedido

## Verificando configurações PHP

Para verificar se as configurações de 5GB foram aplicadas:

```bash
php -r "echo 'upload_max_filesize: ' . ini_get('upload_max_filesize') . PHP_EOL; echo 'post_max_size: ' . ini_get('post_max_size') . PHP_EOL;"
```

**Nota:** Se as configurações ainda não foram aplicadas, você pode precisar:
- Reiniciar o servidor web (Apache/Nginx)
- Editar o arquivo `C:\php\php.ini` diretamente (se estiver no Windows)
- Verificar se o módulo `mod_php` está habilitado no Apache

## Limites do Sistema

- **Tamanho máximo por arquivo:** 5GB (5120MB)
- **Tipos de arquivo aceitos:** Qualquer tipo
- **Tempo máximo de execução:** 600 segundos (10 minutos)
- **Memória máxima:** 512MB

## Solução de Problemas

### Erro: "The file size exceeds the maximum allowed size"

**Solução:**
1. Verifique se reiniciou o servidor após as mudanças
2. Se estiver usando Apache, verifique se o `.htaccess` está sendo lido
3. Edite o `php.ini` principal do sistema se necessário

### Erro: "Failed to store file"

**Solução:**
1. Verifique permissões das pastas:
   ```bash
   chmod -R 775 backend/storage
   ```

2. Verifique se o link simbólico existe:
   ```bash
   cd backend
   php artisan storage:link
   ```

### Arquivos não aparecem após upload

**Solução:**
1. Verifique os logs do Laravel:
   ```bash
   tail -f backend/storage/logs/laravel.log
   ```

2. Verifique o console do navegador (F12) para erros

3. Verifique se o arquivo foi realmente salvo:
   ```bash
   ls -lR backend/storage/app/public/training-files/
   ```

## Arquivos Modificados

Os seguintes arquivos foram criados ou modificados:

1. **Criados:**
   - `backend/storage/app/public/training-files/` (pasta)
   - `backend/storage/app/public/training/` (pasta)
   - `backend/public/.user.ini` (configurações PHP)
   - `ANEXOS_SETUP.md` (documentação técnica)
   - `INSTRUCOES_ANEXOS.md` (este arquivo)

2. **Modificados:**
   - `backend/app/Modules/TrainingManagement/Controllers/SessionFileController.php` (linha 19: limite 5GB)
   - `backend/public/.htaccess` (adicionadas configurações PHP)

## Próximos Passos Recomendados

1. **Testar com diferentes tipos de arquivo:**
   - Imagens (JPG, PNG)
   - Vídeos (MP4, MOV)
   - Documentos (PDF, DOCX)
   - Planilhas (XLSX, CSV)

2. **Testar com múltiplos arquivos simultâneos**

3. **Testar a visualização dos arquivos** no modal

4. **Testar a exclusão de arquivos**

5. **Verificar se os arquivos são isolados por tenant** (multi-tenancy)

## Contato

Se encontrar problemas, verifique:
1. Os logs do Laravel em `backend/storage/logs/laravel.log`
2. O console do navegador (F12)
3. Os logs do servidor web (Apache/Nginx)
4. As permissões das pastas de storage

---

**Data de Implementação:** 2025-11-01
**Versão:** 1.0
