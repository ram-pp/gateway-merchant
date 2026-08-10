# merchant-pay

Standalone developer payment API: **dynamic UPI QR codes**, multi-UPI per merchant, a **same-amount pending lock**, an **own forwarder** for realtime SMS/app-notification verification, and webhook/SSE delivery to integrating apps.

This is an **entirely separate application** from `ssPaymentSolutions` — own git repo, own database, own processes, own UI hosts. See [`merchant_plan.plan.md`](./merchant_plan.plan.md) for the full product/design spec this repo implements.

## Product loop

1. Third-party app authenticates with `X-Api-Key` / `X-Api-Secret`.
2. `POST /api/v1/payments` picks one of the merchant's UPI accounts, enforces the same-amount pending lock, and returns a freshly generated `upi://pay?...` intent + QR.
3. Customer scans/pays the merchant VPA directly (money never touches this system).
4. The **own forwarder** app on the merchant's phone reports SMS / UPI-app credit notifications to this API, which matches them to the pending payment by amount + UPI account (+ `upiProvider` app name for notification events).
5. On match: payment flips to `paid`, a signed webhook fires, and any `GET /api/v1/payments/:id/events` SSE subscriber is notified.

## Repo layout

```
apps/api/            Express + Mongoose API — /api/v1 (developer), /api/merchant (dashboard BFF),
                      /api/admin (platform BFF), /api/public (pay page), /api/forwarder (device)
apps/merchant-web/    React + Vite + Tailwind — merchant.pay.example.com
apps/admin-web/       React + Vite + Tailwind — admin.pay.example.com
packages/shared/      UPI provider list, id helpers, shared constants (no runtime dep on apps/api)
docs/                 architecture, developer-api, forwarder-setup, admin-runbook, openapi.yaml
examples/             sample integration snippets (curl, Node)
```

## Quickstart (local dev)

Prerequisites: Node 18+, a local MongoDB (or `docker compose up mongo`).

```bash
npm install

cp .env.example apps/api/.env
# edit apps/api/.env — set MONGO_URI, JWT secrets

npm run seed --workspace apps/api   # creates a superadmin (see .env SEED_SUPERADMIN_*)

npm run dev:api        # http://localhost:4000
npm run dev:merchant   # http://localhost:5173
npm run dev:admin      # http://localhost:5174
```

Log into the admin panel (`http://localhost:5174/login`) with the seeded superadmin, create a merchant (this reveals the `apiKey`/`apiSecret` **once**), then log into the merchant panel to add a UPI account and take a test payment from `/pay`.

### Docker

```bash
docker compose up --build
```

Runs `mongo` + `api`. Frontends are still run with `npm run dev:*` locally (or build and serve statically — see `apps/merchant-web/README` style notes below).

## Isolation from ssPaymentSolutions

- Own Mongo URI, own port, own JWT secrets/audiences (`merchant_admin` vs `platform_admin`), own forwarder token space.
- No runtime imports from, or calls to, `ssPaymentSolutions` (Core, provider-gateway, or its forwarder).
- Only *ideas* (UPI provider handle map, SMS/notification matching heuristics, forwarder pairing flow) were ported and reimplemented here — see the "Relationship to ssPaymentSolutions" section of the plan.

## Docs

- [`docs/architecture.md`](./docs/architecture.md)
- [`docs/developer-api.md`](./docs/developer-api.md) — integrator guide (auth, create payment, webhooks, SSE, errors)
- [`docs/forwarder-setup.md`](./docs/forwarder-setup.md)
- [`docs/admin-runbook.md`](./docs/admin-runbook.md)
- [`docs/openapi.yaml`](./docs/openapi.yaml) — also served live at `GET /api/v1/openapi.json`

## License

Proprietary / internal — no license granted for external distribution.
