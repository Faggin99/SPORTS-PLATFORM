#!/bin/bash
# Daily backup script for sports_platform database
DATE=$(date +%Y%m%d_%H%M)
BACKUP_DIR=/home/deploy/backups
mkdir -p $BACKUP_DIR
pg_dump -U sports_admin sports_platform > $BACKUP_DIR/backup_$DATE.sql
# Keep only last 30 backups
ls -t $BACKUP_DIR/backup_*.sql | tail -n +31 | xargs rm -f 2>/dev/null
echo "Backup completed: $BACKUP_DIR/backup_$DATE.sql"
