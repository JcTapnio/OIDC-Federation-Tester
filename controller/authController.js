import { generators } from "openid-client";

const getCodeVerifier = () => {
  return generators.codeVerifier();
};

const getAuthorizationUrl = (client, appConfig, codeVerifier) => {
  const codeChallenge = generators.codeChallenge(codeVerifier);
  return client.authorizationUrl({
    redirect_uri: appConfig.redirectUri,
    response_type: "code",
    scope: "openid email profile uid",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
};

export { getCodeVerifier, getAuthorizationUrl };
