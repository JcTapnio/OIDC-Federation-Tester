import express from "express";
import dotenv from "dotenv";
import session from "express-session";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import { Issuer, custom } from "openid-client";
import authRouter from "./router/authRouter.js";
import userRouter from "./router/userRouter.js";

dotenv.config();

if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
  custom.setHttpOptionsDefaults({
    rejectUnauthorized: false,
  });
  console.warn(
    "Warning: TLS certificate verification is disabled. This is not recommended for production."
  );
}

const app = express();
const PORT = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static("public"));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(session({ secret: "secret", resave: false, saveUninitialized: true }));

(async () => {
  try {
    const oidcIssuer = await Issuer.discover(process.env.ISSUER);
    console.log(
      "Discovered issuer %s %O",
      oidcIssuer.issuer,
      oidcIssuer.metadata
    );
    const client = new oidcIssuer.Client({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      redirect_uris: [process.env.REDIRECT_URI],
      response_types: ["code"],
    });

    app.locals.client = client;
    app.locals.oidcIssuer = oidcIssuer;

    app.use("/", authRouter);
    app.use("/user", userRouter);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to initialize OIDC client:", error);
    process.exit(1);
  }
})();
