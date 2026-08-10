#!/usr/bin/env bash
# merchant-pay — curl quickstart.
# Usage: MERCHANT_PAY_API_KEY=mk_test_... MERCHANT_PAY_API_SECRET=ms_... ./curl-quickstart.sh
set -euo pipefail

BASE_URL="${MERCHANT_PAY_API_URL:-http://localhost:4000}"
API_KEY="${MERCHANT_PAY_API_KEY:?set MERCHANT_PAY_API_KEY}"
API_SECRET="${MERCHANT_PAY_API_SECRET:?set MERCHANT_PAY_API_SECRET}"

echo "== ping =="
curl -sf "$BASE_URL/api/v1/ping" -H "X-Api-Key: $API_KEY" -H "X-Api-Secret: $API_SECRET" | python3 -m json.tool

echo "== create payment =="
PAYMENT=$(curl -sf -X POST "$BASE_URL/api/v1/payments" \
  -H "X-Api-Key: $API_KEY" -H "X-Api-Secret: $API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"amount": 500, "merchantOrderRef": "EXAMPLE-ORDER-1"}')
echo "$PAYMENT" | python3 -m json.tool

PAYMENT_ID=$(echo "$PAYMENT" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')

echo "== get status =="
curl -sf "$BASE_URL/api/v1/payments/$PAYMENT_ID" -H "X-Api-Key: $API_KEY" -H "X-Api-Secret: $API_SECRET" | python3 -m json.tool

echo "== cancel =="
curl -sf -X POST "$BASE_URL/api/v1/payments/$PAYMENT_ID/cancel" -H "X-Api-Key: $API_KEY" -H "X-Api-Secret: $API_SECRET" | python3 -m json.tool
