import { generators } from "openid-client";

const getCodeVerifier = () => {
  return generators.codeVerifier();
};

const getAuthorizationUrl = (client, oidcIssuer, codeVerifier) => {
  const codeChallenge = generators.codeChallenge(codeVerifier);
  return client.authorizationUrl({
    scope: "openid profile picture email uid roles orgs CI_open_closed_status CI_operational_status TC_operational_status CI_product_eligibilities TC_product_eligibilities",
    resource: oidcIssuer.metadata.authorization_endpoint,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
};

export { getCodeVerifier, getAuthorizationUrl };
