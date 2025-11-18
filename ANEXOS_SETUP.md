# Configuração de Anexos - Sistema de Cronograma

## Problema Identificado

O sistema de upload de anexos não estava salvando os arquivos porque as pastas de destino não existiam no storage.

## Mudanças Realizadas

### 1. Estrutura de Pastas Criadas

Foram criadas as seguintes pastas no storage para armazenamento dos arquivos:

- `backend/storage/app/public/training-files/` - Para arquivos de sessões de treino
- `backend/storage/app/public/training/` - Para arquivos do FileUploadService (vídeos e PDFs)

Ambas as pastas contêm arquivos `.gitignore` para evitar que os arquivos sejam commitados ao repositório.

### 2. Limite de Upload Aumentado para 5GB

#### Backend Laravel

**Arquivo:** [SessionFileController.php](backend/app/Modules/TrainingManagement/Controllers/SessionFileController.php#L19)

```php
// Mudança na linha 19
'file' => 'required|file|max:5242880', // 5GB max (5120MB * 1024)
```

#### Configuração PHP

**Arquivo:** [backend/public/.user.ini](backend/public/.user.ini)

Criado arquivo de configuração PHP com os seguintes limites:

```ini
upload_max_filesize = 5120M
post_max_size = 5120M
max_execution_time = 600
max_input_time = 600
memory_limit = 512M
```

### 3. Como Funciona o Sistema de Anexos

O sistema possui dois controladores para gerenciar arquivos:

#### SessionFileController
- **Rota:** `POST /api/training-management/sessions/{sessionId}/files`
- **Propósito:** Upload de anexos gerais para sessões de treino
- **Localização:** `training-files/{tenant_id}/{session_id}/`
- **Tipos aceitos:** Qualquer tipo de arquivo
- **Limite:** 5GB por arquivo

#### FileController (não utilizado atualmente no cronograma)
- **Rota:** `POST /api/training-management/files/upload`
- **Propósito:** Upload de vídeos e PDFs específicos para atividades
- **Localização:** `training/{tenant_id}/videos/` ou `training/{tenant_id}/pdfs/`
- **Tipos aceitos:** mp4, mov, avi, pdf
- **Limite:** 200MB para vídeos, 50MB para PDFs

### 4. Fluxo de Upload no Frontend

1. O usuário abre o modal de treino através do [UnifiedTrainingModal.jsx](frontend/src/components/training/UnifiedTrainingModal.jsx)
2. Na aba "Anexos", seleciona arquivos para upload
3. Os arquivos são armazenados temporariamente no estado do componente
4. Ao salvar, o [TrainingPage.jsx](frontend/src/pages/TrainingPage.jsx#L485) envia cada arquivo via `trainingService.uploadSessionFile()`
5. O backend salva o arquivo no storage e registra no banco de dados

### 5. Verificando se os Arquivos Estão Sendo Salvos

#### Via Sistema de Arquivos

```bash
# Verificar arquivos salvos para um tenant específico
ls -lh backend/storage/app/public/training-files/{tenant_id}/

# Verificar via link simbólico
ls -lh backend/public/storage/training-files/{tenant_id}/
```

#### Via Banco de Dados

```sql
-- Verificar arquivos registrados
SELECT * FROM training_session_files WHERE session_id = 'SESSION_ID';
```

#### Via API

```bash
# Listar arquivos de uma sessão
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/training-management/sessions/{sessionId}/files
```

## Testando o Sistema

### 1. Teste Manual via Interface

1. Acesse a página de cronograma
2. Clique em qualquer dia da semana para abrir o modal de treino
3. Vá para a aba "Anexos"
4. Faça upload de um arquivo (imagem, vídeo, PDF, etc.)
5. Clique em "Salvar Alterações"
6. Reabra o modal e verifique se o arquivo aparece na lista

### 2. Verificar no Storage

```bash
# Windows
dir backend\storage\app\public\training-files /s

# Linux/Mac
find backend/storage/app/public/training-files -type f
```

### 3. Verificar Limites PHP

```bash
# Verificar configurações atuais
php -r "echo ini_get('upload_max_filesize') . ' / ' . ini_get('post_max_size');"
```

## Possíveis Problemas e Soluções

### Erro: "File size exceeds maximum"

**Causa:** Limites do PHP não foram atualizados

**Solução:**
- Reinicie o servidor PHP após criar o arquivo `.user.ini`
- Se estiver usando Apache, reinicie o serviço
- Se estiver usando `php artisan serve`, pare e inicie novamente

### Erro: "Failed to store file"

**Causa:** Permissões incorretas nas pastas de storage

**Solução:**
```bash
# Linux/Mac
chmod -R 775 backend/storage
chown -R www-data:www-data backend/storage

# Windows - executar como administrador
icacls backend\storage /grant Users:F /T
```

### Arquivos não aparecem após upload

**Causa:** Link simbólico do storage não está criado

**Solução:**
```bash
cd backend
php artisan storage:link
```

### Erro: "The file path does not exist"

**Causa:** Tentando acessar arquivo deletado ou caminho incorreto

**Solução:**
- Verificar se o arquivo existe fisicamente no storage
- Verificar se o campo `file_path` no banco está correto

## Estrutura do Banco de Dados

### Tabela: training_session_files

```sql
CREATE TABLE training_session_files (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    session_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,  -- 'image', 'video', 'document'
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## Checklist de Implementação

- [x] Criar pastas de storage (`training-files/` e `training/`)
- [x] Adicionar `.gitignore` nas pastas de storage
- [x] Atualizar limite de upload no `SessionFileController` para 5GB
- [x] Criar arquivo `.user.ini` com configurações PHP para 5GB
- [x] Verificar que o link simbólico do storage está criado
- [x] Documentar o sistema de anexos

## Próximos Passos (Opcional)

1. **Adicionar progresso de upload**: Mostrar barra de progresso para uploads grandes
2. **Validação de tipos**: Limitar tipos de arquivo permitidos se necessário
3. **Compressão automática**: Comprimir imagens grandes antes do upload
4. **Cleanup automático**: Deletar arquivos órfãos (sem registro no banco)
5. **Thumbnails**: Gerar miniaturas para vídeos e imagens

## Referências

- [SessionFileController.php](backend/app/Modules/TrainingManagement/Controllers/SessionFileController.php)
- [UnifiedTrainingModal.jsx](frontend/src/components/training/UnifiedTrainingModal.jsx)
- [trainingService.js](frontend/src/services/trainingService.js)
- [SessionFile Model](backend/app/Modules/TrainingManagement/Models/SessionFile.php)
