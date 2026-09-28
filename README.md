
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
- `APP<ID>_GIGYA_API_KEY` - Gigya site API key for the SSO session check on the login page
- `APP<ID>_REDIRECT_URI` - optional; defaults to `http://localhost:<APP<ID>_PORT>/login/callback`
- `APP<ID>_POST_LOGOUT_REDIRECT_URI` - optional; defaults to `http://localhost:<APP<ID>_PORT>/logout/callback`

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

Each app port is a different browser origin, but the tester uses one shared session cookie name (`oidc_tester_sid`) on `localhost`. Token and PKCE state are stored **per app id** under `req.session.apps[<id>]`, so logging into one port does not overwrite another app's local OIDC session.

## CDC Redirect URIs

Register the matching redirect URI on each RP config in CDC:

- `http://localhost:8081/login/callback`
- `http://localhost:8082/login/callback`
- `http://localhost:8083/login/callback`

Register post-logout redirect URIs for OIDC RP-initiated logout:

- `http://localhost:8081/logout/callback`
- `http://localhost:8082/logout/callback`
- `http://localhost:8083/logout/callback`

If you override `APP<ID>_REDIRECT_URI` or `APP<ID>_POST_LOGOUT_REDIRECT_URI` in `.env`, register those exact values instead.

## URL Map

Each app uses the same route structure on its own port:

- `/` - login page (checks for an existing SAP CDC session when appropriate)
- `/login/silent` - silent OIDC authorize (`prompt=none`) after `gigya.hasSession()` succeeds
- `/login/callback` - OIDC callback
- `/user` - userinfo page
- `/logout` - RP-initiated logout via OIDC `end_session_endpoint`
- `/logout/callback` - return URL after CDC ends the session
- `/inactive` - inactive logout page

## SSO session checker

When you open an app and it has no valid local tokens, the login page loads the Gigya Web SDK and calls `gigya.hasSession()`. If CDC reports an existing SSO session, the app redirects to `/login/silent` and completes OIDC with `prompt=none`. If there is no session, or silent login fails, the LOGIN button is shown.

### Required SAP CDC setup

- Child sites (API keys) must belong to the same parent **Site Group** with **SSO enabled**.
- Add `localhost` (or your dev hostname) to each site's **Trusted Site URLs** so `gigya.hasSession()` works.
- OIDC OP login / proxy pages must honor an existing Gigya session when `prompt=none` is used; otherwise CDC returns `login_required`.
- Cross-domain issuers rely on CDC's SSO gateway; third-party cookie blocking in the browser can prevent SSO across sites.

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

On startup, the server logs each issuer's `end_session_endpoint` when SAP CDC advertises it in OIDC metadata.

## Logout

Logout uses the OIDC **`end_session_endpoint`** from discovery metadata (SAP CDC RP-initiated logout). The user page links to `/logout`, which redirects to CDC with `id_token_hint` and `post_logout_redirect_uri`, then returns to `/logout/callback` and the login page.

If an issuer does not publish `end_session_endpoint`, the app clears the local session only and logs a warning.

## Verification

1. Start the server and open `http://localhost:8081`.
2. Log in and confirm `/user` shows the expected userinfo and app label.
3. Open `http://localhost:8082` in the same browser. With SSO configured, you should see "Checking existing session..." and land on `/user` without a full login prompt.
4. Return to app1; it should also recognize the shared session (or reuse its existing local tokens).
5. Log out from app1 via **Logout**. Confirm the browser visits CDC's end-session URL and returns to app1's login page.
6. Open app2. If CDC cleared the shared SSO session, app2 should prompt for login again. If app2 still silent-logs in, CDC may have ended only that RP's session; check Site Group SSO and post-logout settings in CDC.
