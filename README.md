
# OIDC-Federation-Tester

Welcome to OIDC-Federation-Tester! This project runs multiple OIDC relying parties from a single server process. Each app listens on its own `localhost` port so SAP CDC accepts the HTTP redirect URIs, and you can test different client IDs and RBA rules side by side without copying the repo.

## Pre-requisites

This project requires NodeJS to be installed on your computer.

## Environment Variables

Copy `.env.example` to `.env` and configure one block per app.

Global settings:

- `PORT` - index port for the app picker (default `8080`)
- `APP_IDS` - comma-separated app ids (for example `app1,app2,app3`)
- `OIDC_TLS_INSECURE` - set to `true` to disable TLS cert verification for OIDC calls (development only)
- `OIDC_CA_FILE` - optional path to a PEM certificate chain file for corporate/self-signed TLS interception
- `OIDC_HTTP_TIMEOUT` - optional timeout in milliseconds for OIDC discovery/token requests (default `15000`)

Per-app settings (replace `<id>` with the app id from `APP_IDS`, uppercased in env var names):

- `APP<ID>_PORT` - port for this app (defaults to `PORT + index + 1`, so `8081`, `8082`, `8083` when `PORT=8080`)
- `APP<ID>_LABEL` - display name shown in the UI (default is the app id)
- `APP<ID>_ISSUER` - issuer from OIDC OP metadata
- `APP<ID>_CLIENT_ID` - OIDC RP client id
- `APP<ID>_CLIENT_SECRET` - OIDC RP client secret
- `APP<ID>_GIGYA_API_KEY` - Gigya site API key for logout
- `APP<ID>_REDIRECT_URI` - optional; defaults to `http://localhost:<APP<ID>_PORT>/login/callback`

Example:

```env
PORT=8080
APP_IDS=app1,app2,app3
OIDC_TLS_INSECURE=true

APP1_PORT=8081
APP1_LABEL=App One
APP1_ISSUER=https://cdc-dev.example.org/oidc/op/v1.0/<apiKey1>/
APP1_CLIENT_ID=your_app1_client_id
APP1_CLIENT_SECRET=your_app1_client_secret
APP1_GIGYA_API_KEY=<apiKey1>
```

## Ports and URLs

SAP CDC only accepts `http://localhost` for HTTP redirect URIs (not `app1.localhost`). Each app therefore runs on its own localhost port:

- `http://localhost:8080` - app picker index
- `http://localhost:8081` - App One login
- `http://localhost:8082` - App Two login
- `http://localhost:8083` - App Three login

Because each port is a different browser origin, sessions and Gigya cookies stay isolated per app.

## CDC Redirect URIs

Register the matching redirect URI on each RP config in CDC:

- `http://localhost:8081/login/callback`
- `http://localhost:8082/login/callback`
- `http://localhost:8083/login/callback`

If you override `APP<ID>_REDIRECT_URI` in `.env`, register that exact value instead.

## URL Map

Each app uses the same route structure on its own port:

- `/` - login page
- `/login/callback` - OIDC callback
- `/user` - userinfo page
- `/inactive` - inactive logout page

## Run Locally

Clone the project

```bash
  git clone https://github.com/JcTapnio/OIDC-Federation-Tester.git
```

Go to the project directory

```bash
  cd OIDC-Federation-Tester
```

Install dependencies

```bash
  npm install
```

Start the server

```bash
  npm start
```

Then open `http://localhost:8080` for the app picker, or go directly to an app port such as `http://localhost:8081`.

## Logout Function

Logout uses the Gigya SDK with the per-app API key configured in `APP<ID>_GIGYA_API_KEY`. No manual edits to `views/user.ejs` are needed when switching apps.

## Verification

1. Start the server and open `http://localhost:8081`.
2. Log in and confirm `/user` shows the expected userinfo and app label.
3. Open `http://localhost:8082` in the same browser.
4. Confirm app2 still prompts for login and app1's session remains active when you return to app1.
