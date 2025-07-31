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

const getUserClaims = async (req, res) => {
  try {
    const tokenSet = req.session.tokenSet;
    
    if (!tokenSet || !tokenSet.id_token) {
      return res.status(401).json({ error: "No valid session found" });
    }
    
    // Prepare response object
    let response = {};
    
    // Check if tokenSet.claims is a function, otherwise decode the id_token manually
    if (typeof tokenSet.claims === 'function') {
      response.idToken = tokenSet.claims();
    } else if (tokenSet.id_token) {
      try {
        // Manual decoding of JWT
        const parts = tokenSet.id_token.split('.');
        if (parts.length === 3) {
          const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            Buffer.from(base64Payload, 'base64').toString()
              .split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
              }).join('')
          );
          response.idToken = JSON.parse(jsonPayload);
        } else {
          response.idToken = { error: "Invalid token format" };
        }
      } catch (decodeError) {
        console.error("Error decoding token:", decodeError);
        response.idToken = { error: "Failed to decode token" };
      }
    }
    
    // Add the raw id_token for debugging
    response.raw = {
      id_token: tokenSet.id_token
    };
    
    try {
      // Get userinfo from the client if possible
      const userinfo = await req.app.locals.client.userinfo(tokenSet.access_token);
      response.userinfo = userinfo;
    } catch (userinfoError) {
      console.error("Error fetching userinfo:", userinfoError);
      response.userinfoError = "Failed to fetch userinfo";
    }
    
    // Return all claims as JSON
    return res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export { processCallback, getUserInfo, getUserClaims };
