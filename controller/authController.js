import { generators } from "openid-client";

const SILENT_LOGIN_ERRORS = new Set([
  "login_required",
  "interaction_required",
  "consent_required",
  "account_selection_required",
]);

const getCodeVerifier = () => {
  return generators.codeVerifier();
};

const getOAuthState = () => {
  return generators.state();
};

const getAuthorizationUrl = (client, appConfig, codeVerifier, options = {}) => {
  const codeChallenge = generators.codeChallenge(codeVerifier);
  const params = {
    redirect_uri: appConfig.redirectUri,
    response_type: "code",
    scope: "openid email profile uid",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  };

  if (options.state) {
    params.state = options.state;
  }

  if (options.prompt) {
    params.prompt = options.prompt;
  }

  return client.authorizationUrl(params);
};

export {
  getCodeVerifier,
  getOAuthState,
  getAuthorizationUrl,
  SILENT_LOGIN_ERRORS,
};
