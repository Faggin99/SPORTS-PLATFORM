#!/bin/bash
# Backup diário dos bancos do TactiPlan (prod + staging).
# Roda como root via cron; usa `sudo -u postgres` (peer auth, sem senha no disco).
# Formato custom comprimido (-Fc) → restaura com: pg_restore -d <db> <arquivo>.
set -euo pipefail

BACKUP_DIR=/var/backups/postgres
RETENTION_DAYS=14
DBS=(sports_platform sports_platform_staging)
DATE=$(date +%Y%m%d_%H%M%S)
LOG=/var/log/tactiplan-db-backup.log

mkdir -p "$BACKUP_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

for DB in "${DBS[@]}"; do
  OUT="$BACKUP_DIR/${DB}_${DATE}.dump"
  if sudo -u postgres pg_dump -Fc "$DB" > "$OUT" 2>>"$LOG"; then
    SIZE=$(du -h "$OUT" | cut -f1)
    log "OK  $DB → $OUT ($SIZE)"
  else
    log "ERRO ao fazer backup de $DB"
    rm -f "$OUT"
  fi
done

# Retenção: remove dumps com mais de RETENTION_DAYS dias
find "$BACKUP_DIR" -name '*.dump' -type f -mtime +"$RETENTION_DAYS" -delete 2>>"$LOG" || true

# Alerta simples se o backup de prod de hoje não existir/estiver vazio
LATEST_PROD=$(ls -t "$BACKUP_DIR"/sports_platform_*.dump 2>/dev/null | head -1 || true)
if [ -z "$LATEST_PROD" ] || [ ! -s "$LATEST_PROD" ]; then
  log "ALERTA: backup de produção ausente ou vazio!"
fi

log "Backup finalizado. Total no diretório: $(ls -1 "$BACKUP_DIR"/*.dump 2>/dev/null | wc -l) arquivos."
