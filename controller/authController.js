import { generators } from "openid-client";

const getCodeVerifier = () => {
  return generators.codeVerifier();
};

const getAuthorizationUrl = (client, oidcIssuer, codeVerifier) => {
  const codeChallenge = generators.codeChallenge(codeVerifier);
  return client.authorizationUrl({
    scope: "openid email profile orgs roles uid",
    resource: oidcIssuer.metadata.authorization_endpoint,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
};

export { getCodeVerifier, getAuthorizationUrl };
