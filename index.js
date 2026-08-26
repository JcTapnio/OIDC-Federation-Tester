import express from "express";
import dotenv from "dotenv";
import session from "express-session";
import path from "path";
import fs from "fs";
import https from "https";
import { fileURLToPath } from "url";
import { Issuer, custom } from "openid-client";
import {
  appConfigs,
  getAppConfigByPort,
  indexPort,
} from "./config/apps.js";
import authRouter from "./router/authRouter.js";
import userRouter from "./router/userRouter.js";

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static("public"));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

function configureOidcHttp() {
  const httpOptions = {
    timeout: Number(process.env.OIDC_HTTP_TIMEOUT) || 15000,
  };

  const caFilePath = process.env.OIDC_CA_FILE;

  if (caFilePath) {
    const resolvedPath = path.resolve(caFilePath);
    httpOptions.ca = fs.readFileSync(resolvedPath, "utf8");
    console.log(`OIDC TLS configured with CA file: ${resolvedPath}`);
  } else if (process.env.OIDC_TLS_INSECURE === "true") {
    httpOptions.agent = new https.Agent({
      rejectUnauthorized: false,
    });

    console.warn(
      "OIDC TLS certificate verification is disabled via OIDC_TLS_INSECURE=true (development only)."
    );
  }

  custom.setHttpOptionsDefaults(httpOptions);
}

configureOidcHttp();

const oidcClientCache = new Map();

function getOidcContext(appConfig) {
  if (!oidcClientCache.has(appConfig.id)) {
    const contextPromise = (async () => {
      const oidcIssuer = await Issuer.discover(appConfig.issuer);
      console.log(
        "Discovered issuer for %s: %s",
        appConfig.label,
        oidcIssuer.issuer
      );

      const client = new oidcIssuer.Client({
        client_id: appConfig.clientId,
        client_secret: appConfig.clientSecret,
        redirect_uris: [appConfig.redirectUri],
        response_types: ["code"],
      });

      return { client, oidcIssuer };
    })().catch((error) => {
      oidcClientCache.delete(appConfig.id);
      throw error;
    });

    oidcClientCache.set(appConfig.id, contextPromise);
  }

  return oidcClientCache.get(appConfig.id);
}

async function warmUpOidcClients() {
  console.log("Discovering OIDC issuers for configured apps...");

  const results = await Promise.allSettled(
    appConfigs.map((appConfig) => getOidcContext(appConfig))
  );

  for (let index = 0; index < results.length; index++) {
    const result = results[index];
    const appConfig = appConfigs[index];

    if (result.status === "rejected") {
      console.error(
        `Failed to discover issuer for ${appConfig.label}: ${result.reason.message}`
      );
    }
  }
}

app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(
  session({
    name: "oidc_tester_sid",
    secret: "secret",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(async (req, res, next) => {
  const requestPort = req.socket.localPort;

  if (requestPort === indexPort) {
    if (req.path === "/" && req.method === "GET") {
      return res.render("apps", {
        apps: appConfigs,
        indexPort,
      });
    }

    return res
      .status(404)
      .send(
        `This port is the app index only. Open http://localhost:${indexPort} or choose an app port.`
      );
  }

  const appConfig = getAppConfigByPort(requestPort);

  if (!appConfig) {
    return res.status(404).send(`No app configured for port ${requestPort}.`);
  }

  try {
    const { client, oidcIssuer } = await getOidcContext(appConfig);
    req.appContext = { config: appConfig, client, oidcIssuer };
    res.locals.app = appConfig;
    next();
  } catch (error) {
    console.error(`OIDC init failed for ${appConfig.id}`, error);
    res
      .status(500)
      .send(
        `OIDC initialization failed for ${appConfig.label}: ${error.message}`
      );
  }
});

app.use("/", authRouter);
app.use("/user", userRouter);

const portsToListen = [indexPort, ...appConfigs.map((config) => config.port)];

console.log("Starting server...");
for (const port of portsToListen) {
  app.listen(port, () => {
    if (port === indexPort) {
      console.log(`App index: http://localhost:${port}`);
      return;
    }

    const appConfig = getAppConfigByPort(port);
    console.log(`  - ${appConfig.label}: http://localhost:${port}`);
    console.log(`    redirect URI: ${appConfig.redirectUri}`);
  });
}

warmUpOidcClients().catch((error) => {
  console.error("OIDC warm-up failed:", error.message);
});
