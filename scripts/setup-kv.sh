set -euo pipefail
echo "==> Creating KV namespaces for mikoroku-v2"

PROD=$(npx wrangler kv namespace create MIKOROKU_CACHE --preview false 2>&1 || true)
echo "$PROD"

PREVIEW=$(npx wrangler kv namespace create MIKOROKU_CACHE --preview 2>&1 || true)
echo "$PREVIEW"

echo ""
echo "Copy the 'id' values into wrangler.jsonc:"
echo "  - NEXT_INC_CACHE_KV  (bisa pakai namespace yang sama atau buat terpisah)"
echo "  - MIKOROKU_V2_CACHE"
echo ""
echo "Example:"
echo '  "id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"'
echo '  "preview_id": "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"'
