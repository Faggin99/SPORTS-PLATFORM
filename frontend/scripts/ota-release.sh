#!/bin/bash
# Publica uma atualização OTA (over-the-air) do frontend, sem reinstalar o app
# nem passar pela loja. Builda o frontend, zipa o dist, publica o zip + o
# manifesto que o app lê no boot (via src/lib/otaUpdater.js).
#
# Uso:
#   scripts/ota-release.sh staging   # publica pro app de staging
#   scripts/ota-release.sh prod      # publica pro app de produção
#
# O app baixa o novo bundle no próximo boot e aplica no restart seguinte
# (não interrompe a sessão). Se o bundle novo quebrar, o plugin faz rollback
# automático pro anterior.
set -euo pipefail

ENV="${1:-prod}"
export PATH="/usr/local/bin:$PATH"

if [ "$ENV" = "staging" ]; then
  ROOT=/var/www/sports-platform-staging/frontend
  OTA_DIR=/var/www/sports-platform-staging/ota
  BASE_URL=https://staging.app.tactiplan.faggin.com.br
elif [ "$ENV" = "prod" ]; then
  ROOT=/var/www/sports-platform/frontend
  OTA_DIR=/var/www/sports-platform/ota
  BASE_URL=https://app.tactiplan.faggin.com.br
else
  echo "Ambiente inválido: use 'staging' ou 'prod'"; exit 1
fi

VERSION=$(date -u +%Y.%m.%d-%H%M%S)
echo "→ Publicando OTA ($ENV) versão $VERSION"

cd "$ROOT"
npm run build >/dev/null 2>&1
echo "  build ok"

mkdir -p "$OTA_DIR"
ZIP="$OTA_DIR/$VERSION.zip"
# O zip precisa conter o index.html na RAIZ (não dentro de dist/).
( cd dist && zip -qr "$ZIP" . )
SIZE=$(du -h "$ZIP" | cut -f1)
echo "  zip: $ZIP ($SIZE)"

# Manifesto que o app lê (por plataforma). Android e iOS compartilham o mesmo
# bundle web, então escrevemos os dois.
for PLAT in android ios; do
  cat > "$OTA_DIR/manifest-$PLAT.json" <<JSON
{
  "version": "$VERSION",
  "url": "$BASE_URL/ota/$VERSION.zip",
  "platform": "$PLAT"
}
JSON
done
echo "  manifesto atualizado → $BASE_URL/ota/manifest-android.json"

# Retenção: mantém os 5 zips mais recentes (o resto é lixo de versões antigas).
ls -t "$OTA_DIR"/*.zip 2>/dev/null | tail -n +6 | xargs -r rm -f

echo "✓ OTA $ENV publicada: $VERSION"
echo "  Os apps ($ENV) vão baixar no próximo boot e aplicar no restart seguinte."
