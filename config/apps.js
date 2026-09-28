import dotenv from "dotenv";

dotenv.config();

const REQUIRED_FIELDS = [
  "ISSUER",
  "CLIENT_ID",
  "CLIENT_SECRET",
  "GIGYA_API_KEY",
];

function toEnvPrefix(appId) {
  return appId.toUpperCase().replace(/-/g, "_");
}

function readAppConfig(appId, index, indexPort) {
  const envPrefix = toEnvPrefix(appId);
  const missing = REQUIRED_FIELDS.filter(
    (field) => !process.env[`${envPrefix}_${field}`]
  );

  if (missing.length > 0) {
    throw new Error(
      `App "${appId}" is missing required env vars: ${missing
        .map((field) => `${envPrefix}_${field}`)
        .join(", ")}`
    );
  }

  const port =
    Number(process.env[`${envPrefix}_PORT`]) || indexPort + index + 1;
  const label = process.env[`${envPrefix}_LABEL`] || appId;
  const redirectUri =
    process.env[`${envPrefix}_REDIRECT_URI`] ||
    `http://localhost:${port}/login/callback`;
  const postLogoutRedirectUri =
    process.env[`${envPrefix}_POST_LOGOUT_REDIRECT_URI`] ||
    `http://localhost:${port}/logout/callback`;

  return {
    id: appId,
    port,
    label,
    issuer: process.env[`${envPrefix}_ISSUER`],
    clientId: process.env[`${envPrefix}_CLIENT_ID`],
    clientSecret: process.env[`${envPrefix}_CLIENT_SECRET`],
    gigyaApiKey: process.env[`${envPrefix}_GIGYA_API_KEY`],
    redirectUri,
    postLogoutRedirectUri,
    url: `http://localhost:${port}`,
  };
}

function parseAppConfigs() {
  const indexPort = Number(process.env.PORT || 8080);
  const appIdsRaw = process.env.APP_IDS;

  if (!appIdsRaw) {
    throw new Error(
      "APP_IDS is required (e.g. APP_IDS=app1,app2,app3). See .env.example."
    );
  }

  const appIds = appIdsRaw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (appIds.length === 0) {
    throw new Error("APP_IDS must contain at least one app id.");
  }

  const appConfigs = [];
  const appConfigsByPort = new Map();

  appIds.forEach((appId, index) => {
    const config = readAppConfig(appId, index, indexPort);
    const portKey = config.port;

    if (portKey === indexPort) {
      throw new Error(
        `App "${appId}" port ${config.port} conflicts with the index PORT (${indexPort}). Use APP${toEnvPrefix(appId)}_PORT or change PORT.`
      );
    }

    if (appConfigsByPort.has(portKey)) {
      throw new Error(
        `Duplicate port ${config.port} configured for apps "${appConfigsByPort.get(portKey).id}" and "${appId}".`
      );
    }

    appConfigsByPort.set(portKey, config);
    appConfigs.push(config);
  });

  return { appConfigs, appConfigsByPort, indexPort };
}

const { appConfigs, appConfigsByPort, indexPort } = parseAppConfigs();

function getAppConfigByPort(port) {
  return appConfigsByPort.get(Number(port)) ?? null;
}

export { appConfigs, getAppConfigByPort, indexPort };
