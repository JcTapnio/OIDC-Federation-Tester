function getAppSession(req, appId) {
  if (!req.session.apps) {
    req.session.apps = {};
  }
  if (!req.session.apps[appId]) {
    req.session.apps[appId] = {};
  }
  return req.session.apps[appId];
}

function isTokenSetValid(tokenSet) {
  if (!tokenSet?.access_token) {
    return false;
  }

  if (tokenSet.expires_at) {
    return tokenSet.expires_at * 1000 > Date.now() + 5000;
  }

  return true;
}

function clearAppSession(req, appId) {
  if (req.session.apps?.[appId]) {
    delete req.session.apps[appId];
  }
}

export { getAppSession, isTokenSetValid, clearAppSession };
