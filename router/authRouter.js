import express from "express";
import {
  getCodeVerifier,
  getAuthorizationUrl,
} from "../controller/authController.js";

const authRouter = express.Router();

authRouter.get("/", async (req, res) => {
  try {
    const { client, config } = req.appContext;
    const codeVerifier = getCodeVerifier();
    req.session.codeVerifier = codeVerifier;

    const authorizationUrl = getAuthorizationUrl(
      client,
      config,
      codeVerifier
    );

    res.render("home", { authorizationUrl });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error: " + error.message);
  }
});

authRouter.get("/login/callback", async (req, res) => {
  try {
    const { client, config } = req.appContext;
    const params = client.callbackParams(req);
    const codeVerifier = req.session.codeVerifier;
    const tokenSet = await client.callback(config.redirectUri, params, {
      code_verifier: codeVerifier,
    });

    console.log(`[${config.label}] received and validated tokens %j`, tokenSet);
    req.session.tokenSet = tokenSet;
    console.log(
      `[${config.label}] validated ID Token claims %j`,
      tokenSet.claims()
    );

    res.redirect("/user");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error: " + error.message);
  }
});

authRouter.get("/inactive", async (req, res) => {
  try {
    const { client, config } = req.appContext;
    const codeVerifier = getCodeVerifier();
    req.session.codeVerifier = codeVerifier;

    const authorizationUrl = getAuthorizationUrl(
      client,
      config,
      codeVerifier
    );

    res.render("inactive", { authorizationUrl });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error: " + error.message);
  }
});

export default authRouter;
