const processCallback = async (req, res, client, codeVerifier) => {
  try {
    const params = client.callbackParams(req);
    const tokenSet = await client.callback(process.env.REDIRECT_URI, params, {
      code_verifier: codeVerifier,
    });

    req.session.tokenSet = tokenSet;
    res.redirect("/welcome/user");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error: " + error.message);
  }
};

const getUserInfo = async (req, res, client) => {
  try {
    const tokenSet = req.session.tokenSet;

    console.log("tokenSet: ", tokenSet);

    const userinfo = await client.userinfo(tokenSet.access_token);
    res.render("user", { userinfo });
  } catch (error) {
    if (error.error === "invalid_token") {
      // Redirect the user to localhost:8080
      return res.redirect("http://localhost:8080");
    } else if (error.error === "Cannot read properties of undefined") {
      // Redirect the user to localhost:8080
      return res.redirect("http://localhost:8080");
    }
    console.error(error);
    res.status(500).send("Internal Server Error: " + error.message);
  }
};

export { processCallback, getUserInfo };
