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
    
    // Get BPID from query parameters if provided
    const bpid = req.query.bpid || null;
    
    // Get userinfo from the token
    const userinfo = await client.userinfo(tokenSet.access_token);
    
    // Get organization information from userinfo if available
    let organizations = [];
    if (userinfo && userinfo.orgs) {
      console.log("Organization data:", JSON.stringify(userinfo.orgs, null, 2));
      organizations = Array.isArray(userinfo.orgs) ? userinfo.orgs : [userinfo.orgs];
      
      // Try to extract BPIDs from org names if they're strings that contain BPID information
      organizations = organizations.map(org => {
        if (typeof org === 'string') {
          return org;
        } else if (typeof org === 'object') {
          // If org already has a bpid property, return as is
          if (org.bpid) {
            return org;
          }
          
          // Try to extract BPID from org name or other properties
          const orgStr = org.name || org.orgName || org.id || '';
          if (typeof orgStr === 'string') {
            const bpidMatch = orgStr.match(/BPID:([^,\s\-]+)/i);
            if (bpidMatch && bpidMatch[1]) {
              // Add bpid property to the org object
              return { ...org, bpid: bpidMatch[1] };
            }
          }
          return org;
        }
        return org;
      });
    }
    
    // Pass the BPID, organizations, and Gigya credentials to the template
    res.render("user", {
      userinfo,
      bpid,
      organizations,
      gigyaUserKey: process.env.USERKEY,
      gigyaSecret: process.env.SECRET,
      gigyaApiKey: process.env.GIGYA_API_KEY
    });
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
