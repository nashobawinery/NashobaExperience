import { pool } from "./db";
import { storage } from "./storage";
import { interpretCategoryRoute } from "./support-category-route";

export type SupportTicketRoute = {
  categoryIds: string[];
  categoryNames: string[];
  categoryId: string | null;
  assignedAgentId: string | null;
  unsure: boolean;
};

const EMPTY_ROUTE: SupportTicketRoute = {
  categoryIds: [],
  categoryNames: [],
  categoryId: null,
  assignedAgentId: null,
  unsure: true,
};

/** Routes a ticket from the categories staff manage. Unsure and errors leave categoryNames empty so mail goes to the default mailbox. */
export async function routeSupportTicket(subject: string, message: string): Promise<SupportTicketRoute> {
  const categories = await storage.getSupportCategories(true);
  if (categories.length === 0) {
    return { ...EMPTY_ROUTE, assignedAgentId: await assignRoutedAgent(null) };
  }

  let raw: string | null = null;
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = (await import("openai")).default;
      const client = new openai();
      const categoryContext = categories.map((category) => (
        `Category: "${category.name}" (ID: ${category.id})\nDescription: ${category.description || ""}\nKeywords/Tags: ${(category.tags || []).join(", ")}`
      )).join("\n\n");
      const clipped = message.slice(0, 4000);
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You route customer support messages for Nashoba Valley Winery. Choose from the categories below.

AVAILABLE CATEGORIES:
${categoryContext}

Return JSON only, with this shape:
{"confident": true or false, "categoryIds": ["category-id"]}

Rules:
- confident true and exactly one id only when the message clearly belongs to that one category.
- If more than one category is a reasonable fit, set confident to false and include every plausible category id.
- If none fit, or you are not sure, set confident to false and categoryIds to an empty array.
- Use only ids from the list above.`,
          },
          {
            role: "user",
            content: `Subject: ${subject}\n\nMessage: ${clipped}`,
          },
        ],
        max_tokens: 200,
      });
      raw = completion.choices[0]?.message?.content ?? null;
    } catch {
      console.error("[AI Categorization] Routing failed");
      raw = null;
    }
  }

  const interpreted = interpretCategoryRoute(raw, categories);
  const primaryId = interpreted.categoryIds[0] ?? null;
  return {
    categoryIds: interpreted.categoryIds,
    categoryNames: interpreted.categoryNames,
    categoryId: primaryId,
    assignedAgentId: await assignRoutedAgent(primaryId),
    unsure: interpreted.unsure,
  };
}

async function assignRoutedAgent(categoryId: string | null): Promise<string | null> {
  if (categoryId) {
    const lead = await storage.getLeadAgentForCategory(categoryId);
    if (lead?.isActive) return lead.id;
    const agents = await storage.getAgentsForCategory(categoryId);
    const active = agents.find((agent) => agent.isActive);
    if (active) return active.id;
  }
  const fallback = await storage.getDefaultSupportAgent();
  return fallback?.isActive ? fallback.id : null;
}

/** Adds category mailboxes and fills the addresses that are still empty. Matches 014_support_category_notify_email.sql. */
export async function ensureSupportCategoryRouting(): Promise<void> {
  await pool.query(`ALTER TABLE support_categories ADD COLUMN IF NOT EXISTS notify_email varchar`);

  await pool.query(`
    INSERT INTO support_categories (name, slug, description, sort_order, is_active, notify_email)
    SELECT 'Accounting', 'accounting', 'Billing, payments, and accounting questions', 7, true, 'Rap@nashobawinery.com'
    WHERE NOT EXISTS (
      SELECT 1 FROM support_categories WHERE slug = 'accounting'
    )
  `);
  await pool.query(`
    UPDATE support_categories
    SET notify_email = 'Rap@nashobawinery.com', updated_at = now()
    WHERE slug = 'accounting' AND (notify_email IS NULL OR btrim(notify_email) = '')
  `);
  await pool.query(`
    UPDATE support_categories
    SET notify_email = 'Aparrow@nashobawinery.com', updated_at = now()
    WHERE slug = 'reservations' AND (notify_email IS NULL OR btrim(notify_email) = '')
  `);
  await pool.query(`
    UPDATE support_categories
    SET notify_email = 'crp@nashobawinery.com', updated_at = now()
    WHERE (notify_email IS NULL OR btrim(notify_email) = '')
      AND (
        slug IN ('events-entertainment', 'events-and-function')
        OR lower(name) IN ('events & entertainment', 'events and function', 'events and functions')
      )
  `);
  await pool.query(`
    INSERT INTO support_categories (name, slug, description, sort_order, is_active, notify_email)
    SELECT 'Events and Function', 'events-and-function', 'Events and function inquiries', 6, true, 'crp@nashobawinery.com'
    WHERE NOT EXISTS (
      SELECT 1 FROM support_categories
      WHERE slug IN ('events-entertainment', 'events-and-function')
         OR lower(name) LIKE '%event%'
    )
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_support_settings_key ON support_settings (setting_key)
  `);
  await pool.query(`
    INSERT INTO support_settings (setting_key, setting_value, description)
    SELECT
      'default_notify_email',
      'Jp@nashobawinery.com',
      'Mailbox for support tickets whose category has no notification email'
    WHERE NOT EXISTS (
      SELECT 1 FROM support_settings WHERE setting_key = 'default_notify_email'
    )
  `);
}
