# Saj Service Desk

Saj Service Desk is a single-business service-management application for Sajeevan Veeriah. It keeps requests, customers, tickets, jobs, quotes, invoices, payments, attachments and follow-up messages in one PostgreSQL-backed system.

The app is designed for technical services covering computers, networks, websites, software, AI workflows, automation, robotics, electronics and prototyping. Service categories and rates are owner-controlled. It does not file BAS statements or replace accounting software.

## Local stack

The checked-in versions are exact, not ranges.

| Component | Version used by this project |
| --- | --- |
| Node.js | 24.19.0 tested locally |
| npm | 11.17.0 tested locally |
| Next.js | 16.3.4 |
| React | 19.2.8 |
| TypeScript | 5.9.3 |
| PostgreSQL | 18.6 |
| Docker Desktop | 4.90.0 tested locally |
| Mailpit | 1.31.1 |

PostgreSQL is used in development and production. Browser storage is not a business-record store.

## Windows PowerShell 7 setup

Run these commands from the project folder. Quoted paths are intentional and work when a parent folder contains spaces.

```powershell
Set-Location -LiteralPath 'C:\Dev\Saj-Service-Desk'
Copy-Item -LiteralPath '.env.example' -Destination '.env'
```

Open `.env` and replace these development placeholders:

- `BETTER_AUTH_SECRET`: at least 32 random bytes.
- `OWNER_BOOTSTRAP_TOKEN`: a separate, single-use random value.

PowerShell can generate each value without installing another tool:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Start the local database and email catcher:

```powershell
docker compose up -d --wait
docker compose ps
```

Install the pinned project dependencies, apply migrations and add the labelled demonstration records:

```powershell
npm install
npm run db:migrate
npm run db:seed
```

Start the web app and outbox worker in separate PowerShell windows:

```powershell
npm run dev
```

```powershell
npm run worker
```

Open `http://localhost:3000`. Mailpit is local-only at `http://127.0.0.1:8025`.

## First owner setup

1. Open the first-run setup page.
2. Enter the one-time `OWNER_BOOTSTRAP_TOKEN` from `.env`.
3. Set the owner email and password.
4. Enrol owner two-factor authentication and save the recovery codes somewhere outside this repository.
5. Confirm the legal name and ABN.
6. Add public contact details. They are blank until Saj supplies them.
7. Upload the authorised SV monogram if available. The app uses a plain text identity until then.
8. Add service categories and the rate catalogue.
9. Confirm quote validity, payment terms and document-number prefixes.
10. Set GST status and its effective date. It begins as `unconfirmed`, which permits drafts but blocks issued financial documents.
11. Add and confirm a PayPal URL only if Link mode will be used.

The supplied identity fields are:

- Legal name: Sajeevan Veeriah
- Preferred name: Saj
- ABN: 17 630 081 594
- Currency: AUD
- Business timezone: Australia/Melbourne
- Portfolio: sajeevanveeriah.github.io

No rate, phone number, public email address, GST registration or PayPal handle is assumed.

## Database and demonstration data

Generate a migration after an intentional schema change:

```powershell
npm run db:generate
```

Apply committed migrations:

```powershell
npm run db:migrate
```

Add isolated demonstration records:

```powershell
npm run db:seed
```

Demonstration data is marked as demo data. The reset command refuses a production environment or a database URL that is not explicitly marked for local demonstration use, and asks for confirmation:

```powershell
npm run db:reset:demo
```

## Business state rules

The job lifecycle is guarded:

```text
new -> triage -> awaiting customer -> quoted -> approved -> scheduled
    -> in progress -> blocked -> in progress -> completed
```

Cancellation and reopening require a reason and an audit entry. Job completion and invoice payment are separate states. A completed job may still have an outstanding invoice or a later support ticket.

Quotes are versioned. An acceptance records the customer identity, exact version, terms snapshot and time. Expired or superseded versions cannot be accepted. Retried or concurrent acceptance must create no more than one job. A variation creates a new linked document and does not rewrite the accepted quote.

Issued invoices preserve business, customer, line-item, tax and terms snapshots. Changes to settings do not alter them. Corrections use credit, void or replacement records with audit history.

## Financial calculations

Money is stored as integer cents. Floating-point values are not stored as money.

For each line:

```text
line net cents = round-half-up(quantity x unit cents) - discount cents
line GST cents = round-half-up(line net cents x GST rate / 100)
line gross cents = line net cents + line GST cents
```

Totals are the sum of their rounded line values. Deposits, credits and payments are explicit allocations. Provider fees are recorded separately from gross payment and net proceeds. Overpayments remain visible as unapplied money; they do not reduce an invoice below zero. Refund records describe externally completed refunds during local development and never initiate one.

When GST status is unconfirmed, financial documents remain drafts. When unregistered, GST is not charged. When registered, the effective date and issued-document snapshot decide the tax treatment.

## Authorisation rules

- Owner and authorised admin sessions can manage business records.
- Customer sessions can read and change only records linked to their customer ID.
- Every route handler, server action, document operation and attachment download repeats its authorisation check near the data access.
- An email address or request reference alone does not attach a request to an account.
- Internal notes are never included in customer messages, portal data or notification payloads.
- Private files are served only after an ownership check. S3 deployments use short-lived signed access after that check.
- Session revocation and expiry are enforced from database state, not only from page navigation.

## Attachments

Development files are written beneath `runtime/attachments`, which is excluded from Git. The application rejects path traversal, executable formats, unsupported media types, mismatched sizes and files larger than the configured limit.

Production uses the S3-compatible adapter. Keep the bucket private and set:

```text
ATTACHMENT_STORAGE=s3
S3_ENDPOINT=...
S3_REGION=ap-southeast-2
S3_BUCKET=...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

Do not place real customer files, exports or database dumps in the repository.

## Email and the outbox worker

Development delivery goes to Mailpit at `127.0.0.1:1025`. `LIVE_EMAIL_ENABLED=false` is the safe default.

The worker leases due outbox rows, sends each deduplication key once, records attempts and uses a retry delay after failure. Rows remain in PostgreSQL across worker restarts. Reminder rules create drafts until the owner deliberately enables sending.

For a later live provider:

1. Configure the provider credentials outside Git.
2. Keep `LIVE_EMAIL_ENABLED=false` while testing the connection.
3. Send a deliberate owner-approved test.
4. Inspect the provider result and local delivery record.
5. Enable live delivery only after that check.

## PayPal modes

### Link mode

The owner enters and confirms the real HTTPS PayPal destination. The app never infers a handle. A verified `paypal.me` link may include the outstanding AUD amount using PayPal's documented path form.

A link click, browser return, screenshot or customer `I paid` action does not mark an invoice paid. `I paid` creates a pending reconciliation record. The owner must verify the external transaction and enter its amount, date, reference and audit evidence. Duplicate provider references cannot be allocated twice.

### Checkout mode

Checkout is disabled without credentials. Sandbox configuration uses:

```text
PAYPAL_MODE=checkout
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
PAYPAL_MERCHANT_ID=...
```

Orders and captures are created on the server from the current invoice balance. The server checks merchant, invoice mapping, AUD currency, amount and completion state. Webhook signatures are verified using PayPal's documented verification method. Event IDs and transaction references are deduplicated, and processing tolerates retries and out-of-order delivery.

The local PayPal double tests application rules only. Passing those tests is not PayPal sandbox verification.

## PDFs and exports

Quotes, invoices, credit notes and receipts have an accessible HTML view and a server-generated A4 PDF. CSV exports prefix spreadsheet-formula characters so customer-supplied text is treated as text when opened in spreadsheet software.

Inspect both normal and long multi-page documents after changes to document layout.

## Backup and restore

A backup contains the PostgreSQL dump, attachments and a SHA-256 manifest:

```powershell
npm run backup -- --output 'C:\Backups\Saj-Service-Desk'
```

Restore is deliberately restricted to an empty, non-production database. It verifies the manifest before changing the target:

```powershell
npm run restore -- --archive 'C:\Backups\Saj-Service-Desk\20260908-Saj-Service-Desk-Backup-Rev00.zip' --database-url 'postgresql://.../saj_service_desk_restore_test'
```

Test restoration into an isolated database. Never point restore or demo reset at production.

## Checks

Run the local quality gate:

```powershell
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run build
npm run test:e2e
```

The browser suite covers desktop and mobile workflows, keyboard focus, visible recovery from form errors and an automated accessibility baseline. Automated accessibility checks do not replace testing with a screen reader.

Run a production-mode smoke test after the build:

```powershell
npm run build
$env:ALLOW_INSECURE_LOCAL_PRODUCTION = 'true'
npm run start
```

Then open `http://localhost:3000` in a separate browser session and repeat the owner and customer smoke flows.
The override is accepted only for `localhost` or `127.0.0.1`; do not set it in a deployed environment.

## Troubleshooting

### Docker command is not found after installation

Close and reopen PowerShell so it receives Docker Desktop's updated `PATH`, then run:

```powershell
docker version
docker compose version
```

### Database is not ready

```powershell
docker compose ps
docker compose logs postgres
```

Wait for the PostgreSQL health check to report `healthy` before applying migrations.

### Email does not appear

```powershell
docker compose ps mailpit
```

Confirm `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025` and `LIVE_EMAIL_ENABLED=false`, then inspect `http://127.0.0.1:8025`.

### A command fails in a path containing spaces

Use `Set-Location -LiteralPath` and quote each path:

```powershell
Set-Location -LiteralPath 'C:\Development Work\Saj-Service-Desk'
npm run test
```

### Authentication configuration is rejected in production

Production refuses placeholder secrets, localhost auth URLs and an unused owner bootstrap token. Replace the values in the deployment secret store. Do not commit `.env`.

## Production requirements

Before deployment:

- Provision PostgreSQL 18 with encrypted backups and a tested restore path.
- Provision private S3-compatible storage and confirm authorised download expiry.
- Set long random secrets in the deployment secret store.
- Complete owner MFA and remove or rotate the bootstrap token.
- Set the public application and authentication HTTPS URLs.
- Confirm GST status and document settings with their effective dates.
- Configure a live email provider, then complete a deliberate delivery test.
- Configure PayPal sandbox and complete real order, capture, webhook, cancellation, refund and reversal tests before considering live mode.
- Apply migrations as a separate controlled release step.
- Run lint, type checks, unit, PostgreSQL integration, build and browser tests in CI.
- Review retention, privacy, backup and recovery settings.

Deployment, live sending, payment, repository creation and push are not performed by local setup commands.

## GitHub Pages

The Pages workflow publishes a static export at `https://sajeevanveeriah.github.io/saj-service-desk/`. GitHub Pages cannot run the Next.js route handlers, Better Auth, PostgreSQL, private attachments, payment reconciliation or the outbox worker.

The dedicated public page is `https://sajeevanveeriah.github.io/saj-service-desk/request/`. It shows only the service request form. It uses no database or paid form service: the visitor prepares a structured email, reviews it and sends it from their own email app. Preparing the request does not send anything automatically. The page also provides a copyable public link and downloadable QR code.

The complete server-capable source remains in this repository for deployment to a Node.js or Docker host. The Pages workflow temporarily excludes server routes only inside its isolated build runner, after the full source passes lint and type checking.
