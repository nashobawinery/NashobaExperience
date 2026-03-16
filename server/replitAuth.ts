import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { databaseUrl } from "./db";

// ---------------------------------------------------------------------------
// Helpers shared by both auth modes
// ---------------------------------------------------------------------------

const getOidcConfig = memoize(
  async () => {
    const issuerUrl = process.env.ISSUER_URL ?? "https://replit.com/oidc";
    const replId = process.env.REPL_ID;
    if (!replId) {
      throw new Error("REPL_ID environment variable is required for authentication.");
    }
    return await client.discovery(new URL(issuerUrl), replId);
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET environment variable is required. Please set it in your environment.");
  }
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: databaseUrl,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
    errorLog: (error: Error) => {
      if (!error?.message?.includes('terminating connection due to administrator command')) {
        console.error('Session store error:', error);
      }
    },
  });
  return session({
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

// ---------------------------------------------------------------------------
// Convenience: detect the active auth strategy
// ---------------------------------------------------------------------------

export function isToastStandardMode(): boolean {
  return process.env.AUTH_STRATEGY === "toast_standard";
}

// Synthetic req.user injected in toast_standard mode so downstream handlers
// (which read req.user?.claims?.name etc.) don't crash.
// sub is set to 'admin123' — the existing admin record in both users and
// platform_users tables — so storage.getUser() and getUserPermissions()
// resolve correctly without any phantom/synthetic DB entries.
const toastStandardUser = () => ({
  claims: {
    sub: "admin123",
    email: process.env.ADMIN_EMAIL ?? "admin@nashobawinery.com",
    name: "Admin",
    first_name: "Admin",
    last_name: "User",
  },
  expires_at: Math.floor(Date.now() / 1000) + 86400,
});

// ---------------------------------------------------------------------------
// Toast Standard auth mode (Render / non-Replit)
// ---------------------------------------------------------------------------

async function setupToastStandardAuth(app: Express) {
  console.log("[Auth] Starting in toast_standard mode (password-based, no OIDC)");
  app.set("trust proxy", 1);
  app.use(getSession());

  // Populate req.user from session so downstream code works unchanged.
  app.use((req, _res, next) => {
    const sess = req.session as any;
    if (sess.toastAuth?.authenticated) {
      (req as any).user = toastStandardUser();
      (req as any).isAuthenticated = () => true;
    } else {
      (req as any).isAuthenticated = () => false;
    }
    next();
  });

  // Simple HTML login page
  app.get("/api/login", (req, res) => {
    const sess = req.session as any;
    if (sess.toastAuth?.authenticated) {
      return res.redirect("/");
    }
    const showError = req.query.error ? "<p class=\"error\">Incorrect password. Please try again.</p>" : "";
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nashoba Valley Winery &ndash; Admin Login</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f172a;min-height:100vh;display:flex;align-items:center;justify-content:center}
    .card{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:2rem;width:360px}
    h1{color:#f1f5f9;font-size:1.25rem;margin-bottom:.5rem}
    p.sub{color:#94a3b8;font-size:.875rem;margin-bottom:1.5rem}
    label{display:block;color:#cbd5e1;font-size:.875rem;margin-bottom:.5rem}
    input[type=password]{width:100%;padding:.625rem .75rem;background:#0f172a;border:1px solid #475569;border-radius:6px;color:#f1f5f9;font-size:.875rem;outline:none}
    input[type=password]:focus{border-color:#6366f1}
    button{width:100%;margin-top:1rem;padding:.625rem;background:#6366f1;color:#fff;border:none;border-radius:6px;font-size:.875rem;font-weight:500;cursor:pointer}
    button:hover{background:#4f46e5}
    p.error{color:#f87171;font-size:.875rem;margin-top:.75rem}
  </style>
</head>
<body>
  <div class="card">
    <h1>Nashoba Valley Winery</h1>
    <p class="sub">Enter your admin password to continue</p>
    <form method="POST" action="/api/login">
      <label for="pw">Password</label>
      <input type="password" id="pw" name="password" placeholder="Admin password" autofocus required />
      <button type="submit">Sign In</button>
      ${showError}
    </form>
  </div>
</body>
</html>`);
  });

  // Password form submission
  app.post("/api/login", (req, res) => {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error("[Auth] ADMIN_PASSWORD is not set — cannot authenticate in toast_standard mode");
      return res.status(500).send("Server misconfiguration: ADMIN_PASSWORD is not set.");
    }
    if (req.body.password === adminPassword) {
      (req.session as any).toastAuth = { authenticated: true };
      const returnTo = (req.session as any).returnTo || "/";
      delete (req.session as any).returnTo;
      console.log("[Auth] toast_standard login success");
      return res.redirect(returnTo);
    }
    console.warn("[Auth] toast_standard login failed — wrong password");
    return res.redirect("/api/login?error=1");
  });

  // Logout
  app.get("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/api/login");
    });
  });
}

// ---------------------------------------------------------------------------
// Replit OIDC auth mode (production / Replit)
// ---------------------------------------------------------------------------

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any): Promise<boolean> {
  const email = claims["email"];
  const whitelisted = await storage.getWhitelistedEmail(email);
  if (!whitelisted) {
    console.log(`Login attempt from non-whitelisted email: ${email}`);
    return false;
  }
  await storage.upsertUser({
    id: claims["sub"],
    email,
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    role: whitelisted.role,
  });
  return true;
}

async function setupReplitAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const isWhitelisted = await upsertUser(tokens.claims());
    if (!isWhitelisted) {
      return verified(new Error("Access denied. Your email is not authorized to access this application."), false);
    }
    const user = {};
    updateUserSession(user, tokens);
    verified(null, user);
  };

  const registeredStrategies = new Set<string>();

  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    const returnTo = req.query.returnTo as string;
    if (returnTo && req.session) {
      (req.session as any).returnTo = returnTo;
    }
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    const returnTo = (req.session as any)?.returnTo || "/";
    if (req.session) {
      delete (req.session as any).returnTo;
    }
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: returnTo,
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

// ---------------------------------------------------------------------------
// Public setupAuth — picks the right strategy automatically
// ---------------------------------------------------------------------------

export async function setupAuth(app: Express) {
  if (isToastStandardMode()) {
    return setupToastStandardAuth(app);
  }
  return setupReplitAuth(app);
}

// ---------------------------------------------------------------------------
// isAuthenticated middleware
// ---------------------------------------------------------------------------

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // toast_standard mode: simple session check
  if (isToastStandardMode()) {
    if (!(req.session as any).toastAuth?.authenticated) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!(req as any).user) {
      (req as any).user = toastStandardUser();
    }
    return next();
  }

  // Replit OIDC mode
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// ---------------------------------------------------------------------------
// isAdmin middleware
// ---------------------------------------------------------------------------

export const isAdmin: RequestHandler = async (req, res, next) => {
  // toast_standard mode: any authenticated session is admin
  if (isToastStandardMode()) {
    if (!(req.session as any).toastAuth?.authenticated) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!(req as any).user) {
      (req as any).user = toastStandardUser();
    }
    return next();
  }

  // Replit OIDC mode
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    console.log('[isAdmin] Auth failed - isAuthenticated:', req.isAuthenticated(), 'expires_at:', user?.expires_at);
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now > user.expires_at) {
    const refreshToken = user.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const config = await getOidcConfig();
      const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
      updateUserSession(user, tokenResponse);
    } catch {
      return res.status(401).json({ message: "Unauthorized" });
    }
  }

  try {
    const userId = user.claims.sub;
    const dbUser = await storage.getUser(userId);
    if (!dbUser || dbUser.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden - Admin access required" });
    }
    next();
  } catch (error) {
    console.error("Error checking admin status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ---------------------------------------------------------------------------
// requireModuleAccess middleware
// ---------------------------------------------------------------------------

export const requireModuleAccess = (moduleKey: string): RequestHandler => {
  return async (req, res, next) => {
    // toast_standard mode: any authenticated session passes
    if (isToastStandardMode()) {
      if (!(req.session as any).toastAuth?.authenticated) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      if (!(req as any).user) {
        (req as any).user = toastStandardUser();
      }
      return next();
    }

    // Replit OIDC mode
    const user = req.user as any;

    if (!req.isAuthenticated() || !user.expires_at) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const now = Math.floor(Date.now() / 1000);
    if (now > user.expires_at) {
      const refreshToken = user.refresh_token;
      if (!refreshToken) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      try {
        const config = await getOidcConfig();
        const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
        updateUserSession(user, tokenResponse);
      } catch {
        return res.status(401).json({ message: "Unauthorized" });
      }
    }

    try {
      const userId = user.claims.sub;
      const dbUser = await storage.getUser(userId);
      if (!dbUser) {
        return res.status(401).json({ message: "User not found" });
      }
      if (dbUser.role === 'admin') {
        return next();
      }
      return res.status(403).json({ message: `Forbidden - Access to ${moduleKey} module required` });
    } catch (error) {
      console.error("Error checking module access:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};

// ---------------------------------------------------------------------------
// requireGlobalRole middleware
// ---------------------------------------------------------------------------

export const requireGlobalRole = (roles: ('super_admin' | 'admin' | 'manager' | 'staff' | 'viewer')[]): RequestHandler => {
  return async (req, res, next) => {
    // toast_standard mode: any authenticated session is treated as admin
    if (isToastStandardMode()) {
      if (!(req.session as any).toastAuth?.authenticated) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      if (!(req as any).user) {
        (req as any).user = toastStandardUser();
      }
      return next();
    }

    // Replit OIDC mode
    const user = req.user as any;

    if (!req.isAuthenticated() || !user.expires_at) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const now = Math.floor(Date.now() / 1000);
    if (now > user.expires_at) {
      const refreshToken = user.refresh_token;
      if (!refreshToken) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      try {
        const config = await getOidcConfig();
        const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
        updateUserSession(user, tokenResponse);
      } catch {
        return res.status(401).json({ message: "Unauthorized" });
      }
    }

    try {
      const userId = user.claims.sub;
      const dbUser = await storage.getUser(userId);
      if (!dbUser) {
        return res.status(401).json({ message: "User not found" });
      }
      const effectiveRole = dbUser.role === 'admin' ? 'admin' : 'viewer';
      if (roles.includes(effectiveRole as any)) {
        return next();
      }
      return res.status(403).json({ message: `Forbidden - One of the following roles required: ${roles.join(', ')}` });
    } catch (error) {
      console.error("Error checking global role:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};
