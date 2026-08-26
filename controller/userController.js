const getUserInfo = async (req, res, appContext) => {
  const { client, config } = appContext;

  try {
    const tokenSet = req.session.tokenSet;

    if (!tokenSet?.access_token) {
      return res.redirect("/");
    }

    console.log(`[${config.label}] tokenSet:`, tokenSet);

    const userinfo = await client.userinfo(tokenSet.access_token);
    res.render("user", { userinfo });
  } catch (error) {
    if (error.error === "invalid_token") {
      return res.redirect("/");
    }

    console.error(error);
    res.status(500).send("Internal Server Error: " + error.message);
  }
};

export { getUserInfo };
