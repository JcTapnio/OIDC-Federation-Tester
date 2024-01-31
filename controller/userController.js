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
    res.status(500).send("Internal Server Error");
  }
};

const getUserInfo = async (req, res, client) => {
  try {
    const tokenSet = req.session.tokenSet;
    const userinfo = await client.userinfo(tokenSet.access_token);
    res.render("user", { userinfo });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

export { processCallback, getUserInfo };
