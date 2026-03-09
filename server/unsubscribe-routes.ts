import { Router } from "express";
import crypto from "crypto";
import { db } from "./db";
import { sql } from "drizzle-orm";

const router = Router();

const UNSUBSCRIBE_SECRET = process.env.SESSION_SECRET || "nashoba-valley-unsubscribe-secret-2024";

export function generateUnsubscribeToken(customerId: number, type: "sms" | "email"): string {
  const data = `${customerId}:${type}:${UNSUBSCRIBE_SECRET}`;
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 32);
}

export function generateUnsubscribeUrl(customerId: number, type: "sms" | "email"): string {
  const token = generateUnsubscribeToken(customerId, type);
  const baseUrl = process.env.APP_URL
    || (process.env.REPLIT_DOMAINS?.split(",")[0] ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : null)
    || 'https://nashobawinery.org';
  return `${baseUrl}/unsubscribe?id=${customerId}&type=${type}&token=${token}`;
}

function verifyToken(customerId: number, type: string, token: string): boolean {
  const expected = generateUnsubscribeToken(customerId, type as "sms" | "email");
  return token === expected;
}

router.get("/verify", async (req, res) => {
  try {
    const { id, type, token } = req.query;
    const customerId = parseInt(id as string);

    if (!id || !type || !token || isNaN(customerId)) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    if (type !== "sms" && type !== "email") {
      return res.status(400).json({ error: "Invalid type" });
    }

    if (!verifyToken(customerId, type as string, token as string)) {
      return res.status(403).json({ error: "Invalid token" });
    }

    const result = await db.execute(sql`
      SELECT id, first_name, last_name, email1, phone1 
      FROM toast_guests WHERE id = ${customerId}
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const customer = result.rows[0] as any;
    res.json({
      valid: true,
      type,
      firstName: customer.first_name || "Valued Customer",
    });
  } catch (error: any) {
    console.error("[Unsubscribe] Verify error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/confirm", async (req, res) => {
  try {
    const { id, type, token } = req.body;
    const customerId = parseInt(id);

    if (!id || !type || !token || isNaN(customerId)) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    if (type !== "sms" && type !== "email") {
      return res.status(400).json({ error: "Invalid type" });
    }

    if (!verifyToken(customerId, type, token)) {
      return res.status(403).json({ error: "Invalid token" });
    }

    if (type === "sms") {
      await db.execute(sql`
        UPDATE toast_guests SET 
          phone1_marketing_preference = 'OPT_OUT',
          updated_at = NOW()
        WHERE id = ${customerId}
      `);
    } else {
      await db.execute(sql`
        UPDATE toast_guests SET 
          email1_marketing_preference = 'OPT_OUT',
          updated_at = NOW()
        WHERE id = ${customerId}
      `);
    }

    console.log(`[Unsubscribe] Customer ${customerId} opted out of ${type}`);
    res.json({ success: true, type });
  } catch (error: any) {
    console.error("[Unsubscribe] Confirm error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
