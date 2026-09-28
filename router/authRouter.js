import express from "express";
import {
  getCodeVerifier,
  getOAuthState,
  getAuthorizationUrl,
  SILENT_LOGIN_ERRORS,
} from "../controller/authController.js";
import {
  getAppSession,
  isTokenSetValid,
  clearAppSession,
} from "../controller/sessionStore.js";

const authRouter = express.Router();

function beginAuthorization(req, res, { silent = false } = {}) {
  const { client, config } = req.appContext;
  const appSession = getAppSession(req, config.id);
  const codeVerifier = getCodeVerifier();
  const state = getOAuthState();

  appSession.codeVerifier = codeVerifier;
  appSession.oauthState = state;
  appSession.silent = silent;

  const authorizationUrl = getAuthorizationUrl(client, config, codeVerifier, {
    state,
    ...(silent ? { prompt: "none" } : {}),
  });

  return res.redirect(authorizationUrl);
}

authRouter.get("/", async (req, res) => {
  try {
    const { client, config } = req.appContext;
    const appSession = getAppSession(req, config.id);

    if (isTokenSetValid(appSession.tokenSet)) {
      return res.redirect("/user");
    }

    let checkSso = !appSession.silentFailed;

    if (appSession.skipSsoCheckOnce) {
      checkSso = false;
      delete appSession.skipSsoCheckOnce;
    }

    const codeVerifier = getCodeVerifier();
    const state = getOAuthState();
    appSession.codeVerifier = codeVerifier;
    appSession.oauthState = state;

    const authorizationUrl = getAuthorizationUrl(
      client,
      config,
      codeVerifier,
      { state }
    );

    res.render("home", {
      authorizationUrl,
      checkSso,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error: " + error.message);
  }
});

authRouter.get("/login/silent", async (req, res) => {
  try {
    beginAuthorization(req, res, { silent: true });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error: " + error.message);
  }
});

authRouter.get("/login/callback", async (req, res) => {
  try {
    const { client, config } = req.appContext;
    const appSession = getAppSession(req, config.id);
    const params = client.callbackParams(req);

    if (params.error) {
      if (appSession.silent && SILENT_LOGIN_ERRORS.has(params.error)) {
        appSession.silentFailed = true;
        delete appSession.silent;
        return res.redirect("/");
      }

      console.error(
        `[${config.label}] OIDC callback error: ${params.error} ${params.error_description || ""}`
      );
      return res.redirect("/");
    }

    const tokenSet = await client.callback(config.redirectUri, params, {
      code_verifier: appSession.codeVerifier,
      state: appSession.oauthState,
    });

    console.log(`[${config.label}] received and validated tokens %j`, tokenSet);
    appSession.tokenSet = tokenSet;
    delete appSession.silentFailed;
    delete appSession.silent;
    delete appSession.codeVerifier;
    delete appSession.oauthState;

    console.log(
      `[${config.label}] validated ID Token claims %j`,
      tokenSet.claims()
    );

    res.redirect("/user");
  } catch (error) {
    const { config } = req.appContext;
    const appSession = getAppSession(req, config.id);

    if (appSession.silent) {
      appSession.silentFailed = true;
      delete appSession.silent;
      return res.redirect("/");
    }

    console.error(error);
    res.status(500).send("Internal Server Error: " + error.message);
  }
});

authRouter.get("/logout", async (req, res) => {
  try {
    const { client, config } = req.appContext;
    const appSession = getAppSession(req, config.id);
    const idToken = appSession.tokenSet?.id_token;
    const logoutState = getOAuthState();

    appSession.logoutState = logoutState;
    delete appSession.tokenSet;

    try {
      const endSessionUrl = client.endSessionUrl({
        ...(idToken ? { id_token_hint: idToken } : {}),
        post_logout_redirect_uri: config.postLogoutRedirectUri,
        state: logoutState,
      });

      return res.redirect(endSessionUrl);
    } catch (endSessionError) {
      console.warn(
        `[${config.label}] OIDC end_session unavailable: ${endSessionError.message}. Clearing local session only.`
      );
      clearAppSession(req, config.id);
      const freshSession = getAppSession(req, config.id);
      freshSession.skipSsoCheckOnce = true;
      return res.redirect("/");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error: " + error.message);
  }
});

authRouter.get("/logout/callback", async (req, res) => {
  try {
    const { config } = req.appContext;
    const appSession = getAppSession(req, config.id);
    const returnedState = req.query.state;

    if (!returnedState || returnedState !== appSession.logoutState) {
      return res.status(400).send("Invalid logout state.");
    }

    clearAppSession(req, config.id);
    const freshSession = getAppSession(req, config.id);
    freshSession.skipSsoCheckOnce = true;

    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error: " + error.message);
  }
});

authRouter.get("/inactive", async (req, res) => {
  try {
    const { client, config } = req.appContext;
    const appSession = getAppSession(req, config.id);
    const codeVerifier = getCodeVerifier();
    const state = getOAuthState();

    appSession.codeVerifier = codeVerifier;
    appSession.oauthState = state;

    const authorizationUrl = getAuthorizationUrl(
      client,
      config,
      codeVerifier,
      { state }
    );

    res.render("inactive", { authorizationUrl });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error: " + error.message);
  }
});

export default authRouter;
