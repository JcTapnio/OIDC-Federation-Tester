import express from "express";
import {
  getCodeVerifier,
  getAuthorizationUrl,
} from "../controller/authController.js";

const authRouter = express.Router();

authRouter.get("/", async (req, res) => {
  try {
    const codeVerifier = getCodeVerifier();
    req.session.codeVerifier = codeVerifier;

    const authorizationUrl = getAuthorizationUrl(
      req.app.locals.client,
      req.app.locals.oidcIssuer,
      codeVerifier
    );

    res.render("home", { authorizationUrl });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

authRouter.get("/login/callback", async (req, res) => {
  try {
    const params = req.app.locals.client.callbackParams(req);
    let codeVerifier = req.session.codeVerifier;
    const tokenSet = await req.app.locals.client.callback(
      process.env.REDIRECT_URI,
      params,
      {
        code_verifier: codeVerifier,
      }
    );

    console.log("received and validated tokens %j", tokenSet);
    req.session.tokenSet = tokenSet;
    console.log("validated ID Token claims %j", tokenSet.claims());

    res.redirect("/user");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

export default authRouter;
