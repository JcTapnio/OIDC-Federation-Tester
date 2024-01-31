import express from "express";
import dotenv from "dotenv";
import session from "express-session";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import { Issuer, generators } from "openid-client";

const app = express();
const PORT = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("views", path.join(__dirname, "views"));

app.set("view engine", "ejs");

dotenv.config();
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(session({ secret: "secret", resave: false, saveUninitialized: true }));

const oidcIssuer = await Issuer.discover(process.env.ISSUER);
console.log("Discovered issuer %s %O", oidcIssuer.issuer, oidcIssuer.metadata);

const client = new oidcIssuer.Client({
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  redirect_uris: [process.env.REDIRECT_URI],
  response_types: ["code"],
});

app.get("/", async (req, res) => {
  try {
    const code_verifier = generators.codeVerifier();
    req.session.code_verifier = code_verifier;
    const code_challenge = generators.codeChallenge(code_verifier);

    const authorizationUrl = client.authorizationUrl({
      scope: "openid email profile",
      resource: oidcIssuer.metadata.authorization_endpoint,
      code_challenge,
      code_challenge_method: "S256",
    });

    // You can render a button in the response to trigger the login
    res.send(`<a href="${authorizationUrl}"><button>Login</button></a>`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/login/callback", async (req, res) => {
  try {
    const params = client.callbackParams(req);
    let code_verifier = req.session.code_verifier;
    const tokenSet = await client.callback(process.env.REDIRECT_URI, params, {
      code_verifier,
    });

    // You can use the obtained tokenSet to perform any necessary actions
    console.log("received and validated tokens %j", tokenSet);
    req.session.tokenSet = tokenSet;
    console.log("validated ID Token claims %j", tokenSet.claims());

    // Redirect to /welcome/user after successful login
    res.redirect("/welcome/user");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/welcome/user", async (req, res) => {
  try {
    let tokenSet = req.session.tokenSet;
    const userinfo = await client.userinfo(tokenSet.access_token);
    console.log("userinfo %j", userinfo);

    // You can render the user info in the response
    res.send(`<pre>${JSON.stringify(userinfo, null, 2)}</pre>`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
