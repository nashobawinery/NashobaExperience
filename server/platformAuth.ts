import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { databaseUrl } from "./db";
import { platformUsers, globalRoleEnum } from "@shared/schema";

export function getPlatformSession() {
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

export function isPlatformAuthMode(): boolean {
  return process.env.AUTH_STRATEGY === "platform";
}

async function setupPlatformAuth(app: Express) {
  console.log("[Auth] Starting in platform mode (individual email/password login)");
  app.set("trust proxy", 1);
  app.use(getPlatformSession());

  // Login page
  app.get("/api/login", (req, res) => {
    const sess = req.session as any;
    if (sess.platformAuth?.userId) {
      return res.redirect("/");
    }
    const showError = req.query.error ? "<p class=\"error\">Invalid email or password. Please try again.</p>" : "";
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nashoba Valley Winery &ndash; Staff Login</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f172a;min-height:100vh;display:flex;align-items:center;justify-content:center}
    .card{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:2rem;width:400px}
    h1{color:#f1f5f9;font-size:1.25rem;margin-bottom:.5rem}
    p.sub{color:#94a3b8;font-size:.875rem;margin-bottom:1.5rem}
    label{display:block;color:#cbd5e1;font-size:.875rem;margin-bottom:.5rem}
    input[type=email],input[type=password]{width:100%;padding:.625rem .75rem;background:#0f172a;border:1px solid #475569;border-radius:6px;color:#f1f5f9;font-size:.875rem;outline:none;margin-bottom:.75rem}
    input[type=email]:focus,input[type=password]:focus{border-color:#6366f1}
    button{width:100%;margin-top:1rem;padding:.625rem;background:#6366f1;color:#fff;border:none;border-radius:6px;font-size:.875rem;font-weight:500;cursor:pointer}
    button:hover{background:#4f46e5}
    p.error{color:#f87171;font-size:.875rem;margin-top:.75rem}
    .role-info{color:#64748b;font-size:.75rem;margin-top:.5rem}
  </style>
</head>
<body>
  <div class="card">
    <h1>Nashoba Valley Winery</h1>
    <p class="sub">Enter your email and password to access the staff portal</p>
    <form method="POST" action="/api/login">
      <label for="email">Email</label>
      <input type="email" id="email" name="email" placeholder="your.email@nashobawinery.com" required />
      
      <label for="password">Password</label>
      <input type="password" id="password" name="password" placeholder="Your password" required />
      
      <button type="submit">Sign In</button>
      ${showError}
    </form>
    <p class="role-info">Access is restricted to authorized staff members only</p>
  </div>
</body>
</html>`);
  });

  // Login submission
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.redirect("/api/login?error=1");
      }

      // Find user in platformUsers table
      const [user] = await storage.db
        .select()
        .from(platformUsers)
        .where(eq(platformUsers.email, email.toLowerCase()));

      if (!user || !user.passwordHash) {
        console.warn(`[Auth] Login attempt for non-existent user: ${email}`);
        return res.redirect("/api/login?error=1");
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        console.warn(`[Auth] Invalid password for user: ${email}`);
        return res.redirect("/api/login?error=1");
      }

      // Create session
      (req.session as any).platformAuth = {
        userId: user.id,
        email: user.email,
        globalRole: user.globalRole,
        firstName: user.firstName,
        lastName: user.lastName,
      };

      const returnTo = (req.session as any).returnTo || "/";
      delete (req.session as any).returnTo;
      
      console.log(`[Auth] Successful login: ${email} (${user.globalRole})`);
      return res.redirect(returnTo);

    } catch (error) {
      console.error("[Auth] Login error:", error);
      return res.redirect("/api/login?error=1");
    }
  });

  // Logout
  app.get("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/api/login");
    });
  });

  // Middleware to populate req.user from session
  app.use((req, _res, next) => {
    const sess = req.session as any;
    if (sess.platformAuth?.userId) {
      (req as any).user = {
        claims: {
          sub: sess.platformAuth.userId,
          email: sess.platformAuth.email,
          first_name: sess.platformAuth.firstName,
          last_name: sess.platformAuth.lastName,
          name: `${sess.platformAuth.firstName} ${sess.platformAuth.lastName}`,
        },
        globalRole: sess.platformAuth.globalRole,
      };
      (req as any).isAuthenticated = () => true;
    } else {
      (req as any).isAuthenticated = () => false;
    }
    next();
  });
}

// Middleware for authentication
export const isPlatformAuthenticated: RequestHandler = async (req, res, next) => {
  const sess = req.session as any;
  if (!sess.platformAuth?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};

// Middleware for role-based access
export const requirePlatformRole = (roles: string[]): RequestHandler => {
  return async (req, res, next) => {
    const sess = req.session as any;
    if (!sess.platformAuth?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userRole = sess.platformAuth.globalRole;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ 
        message: `Forbidden - Required role: ${roles.join(' or ')}. Current role: ${userRole}` 
      });
    }

    return next();
  };
};

// Helper function to create/update users with passwords
export async function createPlatformUser(userData: {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  globalRole?: "super_admin" | "admin" | "manager" | "staff" | "viewer";
  department?: string;
  jobTitle?: string;
}) {
  const passwordHash = await bcrypt.hash(userData.password, 10);
  
  const [user] = await storage.db
    .insert(platformUsers)
    .values({
      ...userData,
      email: userData.email.toLowerCase(),
      passwordHash,
      globalRole: userData.globalRole || "staff",
    })
    .onConflictDoUpdate({
      target: platformUsers.email,
      set: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash,
        globalRole: userData.globalRole || "staff",
        department: userData.department,
        jobTitle: userData.jobTitle,
        updatedAt: new Date(),
      },
    })
    .returning();

  return user;
}

export async function setupPlatformAuthSystem(app: Express) {
  if (isPlatformAuthMode()) {
    return setupPlatformAuth(app);
  }
  throw new Error("Platform auth mode not enabled");
}
