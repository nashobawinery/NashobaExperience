import { Router } from "express";
import { db } from "./db";
import { sql, eq } from "drizzle-orm";
import { flightCardConfigs } from "@shared/schema";

const router = Router();

router.get("/api/media/flyer/embed", async (req, res) => {
  try {
    const {
      mode = "music",
      template = "classic",
      scale = "100",
      days = "60",
      title,
      footer,
      hidedesc,
      hideimg,
      hideprice,
      hidevenue,
    } = req.query as Record<string, string>;

    const daysAhead = parseInt(days) || 60;
    const fontScale = parseInt(scale) || 100;
    const hideDescriptions = hidedesc === "1";
    const hideImages = hideimg === "1";
    const hidePrices = hideprice === "1";
    const hideVenue = hidevenue === "1";

    let events: any[] = [];

    if (mode === "music") {
      const result = await db.execute(sql`
        SELECT 
          me.id, me.title, me.event_date, me.start_time, me.end_time,
          me.location, me.description, me.image_url, me.is_featured,
          m.name as musician_name, m.genre as musician_genre,
          m.image_url as musician_image_url, m.website_url as musician_website_url
        FROM media_music_events me
        LEFT JOIN media_musicians m ON me.musician_id = m.id
        WHERE me.is_active = true
          AND me.event_date::date >= CURRENT_DATE
          AND me.event_date::date <= CURRENT_DATE + ${daysAhead}
        ORDER BY me.event_date ASC
      `);
      events = result.rows as any[];
    } else {
      const result = await db.execute(sql`
        SELECT 
          id, title, description, event_date, start_time, end_time,
          location, image_url, price, shopify_url, category, is_featured
        FROM media_special_events
        WHERE is_active = true
          AND event_date::date >= CURRENT_DATE
          AND event_date::date <= CURRENT_DATE + ${daysAhead}
        ORDER BY event_date ASC
      `);
      events = result.rows as any[];
    }

    const defaultTitle = mode === "music" ? "Live Music" : "Upcoming Events";
    const flyerTitle = title || defaultTitle;

    const html = renderFlyerHtml(events, {
      mode,
      template,
      fontScale,
      flyerTitle,
      footer,
      hideDescriptions,
      hideImages,
      hidePrices,
      hideVenue,
    });

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (error: any) {
    console.error("Error rendering flyer:", error);
    res.status(500).send("Error generating flyer");
  }
});

function formatTime12(time24: string | null): string {
  if (!time24) return "";
  const [h, m] = time24.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${m} ${ampm}`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatDateLong(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

interface FlyerOptions {
  mode: string;
  template: string;
  fontScale: number;
  flyerTitle: string;
  footer?: string;
  hideDescriptions: boolean;
  hideImages: boolean;
  hidePrices: boolean;
  hideVenue: boolean;
}

function renderFlyerHtml(events: any[], opts: FlyerOptions): string {
  const { mode, template, fontScale, flyerTitle, footer, hideDescriptions, hideImages, hidePrices, hideVenue } = opts;

  const templateColors = {
    classic: { bg: "#faf8f5", text: "#2c1810", accent: "#8b6914", secondary: "#666", border: "#e8dcc8", fontFamily: "'Playfair Display', Georgia, serif" },
    modern: { bg: "#ffffff", text: "#1a1a1a", accent: "#6b46c1", secondary: "#666", border: "#e5e5e5", fontFamily: "'Inter', -apple-system, sans-serif" },
    bold: { bg: "#1a1a2e", text: "#ffffff", accent: "#e94560", secondary: "rgba(255,255,255,0.6)", border: "rgba(255,255,255,0.15)", fontFamily: "'Oswald', 'Inter', sans-serif" },
  };
  const c = templateColors[template as keyof typeof templateColors] || templateColors.classic;

  const eventRows = events.map((ev) => {
    const name = mode === "music" ? (ev.musician_name || ev.title) : ev.title;
    const genre = mode === "music" ? ev.musician_genre : ev.category;
    const imgUrl = ev.image_url || ev.musician_image_url;
    const desc = ev.description;
    const date = formatDate(ev.event_date);
    const time = formatTime12(ev.start_time) + (ev.end_time ? ` - ${formatTime12(ev.end_time)}` : "");
    const location = ev.location;
    const price = ev.price;
    const featured = ev.is_featured;

    const imgHtml = !hideImages && imgUrl
      ? `<div style="width:60px;height:60px;border-radius:6px;overflow:hidden;flex-shrink:0;">
           <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(name)}" style="width:100%;height:100%;object-fit:cover;" />
         </div>`
      : "";

    const genreHtml = genre
      ? `<span style="font-size:8pt;color:${c.accent};text-transform:uppercase;letter-spacing:1px;${template === "bold" ? "font-family:'Inter',sans-serif;" : ""}">${escapeHtml(genre === "cooking-demo" ? "Cooking Demo" : genre)}</span>`
      : "";

    const descHtml = !hideDescriptions && desc
      ? `<div style="font-size:8pt;color:${c.secondary};line-height:1.4;margin-top:2px;${template === "bold" ? "font-family:'Inter',sans-serif;" : ""}">${escapeHtml(desc)}</div>`
      : "";

    const priceHtml = !hidePrices && price
      ? ` | ${escapeHtml(price)}`
      : "";

    const featuredBadge = featured
      ? `<span style="font-size:7pt;background:${c.accent};color:${template === "bold" ? "#fff" : "#fff"};padding:1px 6px;border-radius:3px;margin-left:6px;font-weight:600;">Featured</span>`
      : "";

    return `
      <div style="display:flex;align-items:flex-start;gap:12px;padding:8px 0;border-bottom:1px solid ${c.border};">
        ${imgHtml}
        <div style="flex:1;min-width:0;">
          <div style="font-size:9pt;font-weight:600;color:${c.accent};">${escapeHtml(date)}</div>
          <div style="font-size:13pt;font-weight:${template === "bold" ? "600" : "700"};color:${c.text};${template === "bold" ? "text-transform:uppercase;" : ""}line-height:1.2;">
            ${escapeHtml(name)}${featuredBadge}
          </div>
          ${genreHtml}
          <div style="font-size:8pt;color:${c.secondary};margin-top:2px;${template === "bold" ? "font-family:'Inter',sans-serif;" : ""}">
            ${escapeHtml(time)}${location ? ` | ${escapeHtml(location)}` : ""}${priceHtml}
          </div>
          ${descHtml}
        </div>
      </div>
    `;
  }).join("\n");

  const venueHtml = !hideVenue ? `
    <div style="text-align:center;padding:16px 0 8px;border-top:1px solid ${c.border};margin-top:auto;">
      <div style="font-size:8pt;color:${c.secondary};${template === "bold" ? "font-family:'Inter',sans-serif;" : ""}">100 Wattaquadock Hill Road, Bolton, MA</div>
      <div style="font-size:9pt;font-weight:600;color:${c.accent};">nashobawinery.com</div>
    </div>
  ` : "";

  const footerHtml = footer ? `
    <div style="text-align:center;padding:8px 0;font-size:9pt;color:${c.secondary};${template === "bold" ? "font-family:'Inter',sans-serif;" : ""}">${escapeHtml(footer)}</div>
  ` : "";

  const venuePresentHtml = !hideVenue ? `
    <div style="font-size:11pt;${template === "classic" ? "letter-spacing:3px;" : "letter-spacing:4px;font-weight:600;"}text-transform:uppercase;color:${c.accent};">
      Nashoba Valley Winery
    </div>
    ${template === "classic" ? '<div style="font-size:9pt;font-style:italic;color:' + c.secondary + ';margin-top:2px;">presents</div>' : ""}
  ` : "";

  const titleStyle = template === "bold"
    ? `font-size:28pt;font-weight:700;text-transform:uppercase;letter-spacing:2px;`
    : template === "classic"
      ? `font-size:28pt;font-weight:900;font-style:italic;`
      : `font-size:26pt;font-weight:700;`;

  const dividerHtml = `<div style="width:60px;height:2px;background:${c.accent};margin:4px auto;"></div>`;

  const emptyMsg = events.length === 0
    ? `<div style="text-align:center;padding:40px 0;font-size:12pt;color:${c.secondary};">No upcoming events found.</div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(flyerTitle)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&family=Inter:wght@300;400;500;600;700&family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { font-size: ${fontScale}%; }
    body {
      font-family: ${c.fontFamily};
      background: ${c.bg};
      color: ${c.text};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      @page { margin: 0; size: letter portrait; }
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <div style="width:8.5in;min-height:11in;margin:0 auto;padding:0.5in 0.6in;display:flex;flex-direction:column;">
    <div style="text-align:center;margin-bottom:16px;">
      ${venuePresentHtml}
      <h1 style="${titleStyle}color:${c.text};text-align:center;line-height:1.1;margin-top:8px;">
        ${escapeHtml(flyerTitle)}
      </h1>
      ${dividerHtml}
    </div>
    ${emptyMsg}
    <div style="flex:1;">
      ${eventRows}
    </div>
    ${footerHtml}
    ${venueHtml}
  </div>
</body>
</html>`;
}

router.get("/api/media/shelf-talker/embed", async (req, res) => {
  try {
    const {
      ids,
      template = "classic",
      scale = "100",
      size = "4x6",
      showImage,
      showPrice,
      showDescription,
      showTastingNotes,
      showPairings,
      showAwards,
      showRating,
      showVarietal,
      showRegion,
      showAlcohol,
      showBody,
      showSweetness,
      showStaffPick,
    } = req.query as Record<string, string>;

    const fontScale = parseInt(scale) || 100;
    const show = {
      image: showImage !== "0",
      price: showPrice !== "0",
      description: showDescription !== "0",
      tastingNotes: showTastingNotes !== "0",
      pairings: showPairings !== "0",
      awards: showAwards !== "0",
      rating: showRating !== "0",
      varietal: showVarietal !== "0",
      region: showRegion !== "0",
      alcohol: showAlcohol !== "0",
      body: showBody !== "0",
      sweetness: showSweetness !== "0",
      staffPick: showStaffPick !== "0",
    };

    let products: any[] = [];
    if (ids && ids !== "all") {
      const idList = ids.split(",").map(id => id.trim()).filter(Boolean);
      if (idList.length > 0) {
        const pgArray = `{${idList.map(id => `"${id}"`).join(",")}}`;
        const result = await db.execute(sql`
          SELECT * FROM products
          WHERE id = ANY(${pgArray}::text[])
            AND available = true
            AND is_archived = false
          ORDER BY category, name
        `);
        products = result.rows as any[];
      }
    } else {
      const result = await db.execute(sql`
        SELECT * FROM products
        WHERE available = true
          AND is_archived = false
        ORDER BY category, name
      `);
      products = result.rows as any[];
    }

    const html = renderShelfTalkerHtml(products, {
      template,
      fontScale,
      cardSize: size,
      show,
    });

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (error: any) {
    console.error("Error rendering shelf talkers:", error);
    res.status(500).send("Error generating shelf talkers");
  }
});

interface ShelfTalkerOptions {
  template: string;
  fontScale: number;
  cardSize: string;
  show: Record<string, boolean>;
}

const CARD_SIZES: Record<string, { width: string; height: string; label: string }> = {
  "2x3.5": { width: "2in", height: "3.5in", label: "Business Card (2×3.5)" },
  "3x5": { width: "3in", height: "5in", label: "Index Card (3×5)" },
  "4x6": { width: "4in", height: "6in", label: "Postcard (4×6)" },
  "3.5x5": { width: "3.5in", height: "5in", label: "Shelf Tag (3.5×5)" },
  "2.5x3.5": { width: "2.5in", height: "3.5in", label: "Small Shelf Tag (2.5×3.5)" },
};

function renderShelfTalkerHtml(products: any[], opts: ShelfTalkerOptions): string {
  const { template, fontScale, cardSize, show } = opts;
  const sz = CARD_SIZES[cardSize] || CARD_SIZES["4x6"];

  const templateStyles = {
    classic: {
      bg: "#faf8f5", text: "#2c1810", accent: "#8b6914", secondary: "#666",
      border: "#d4c5a9", fontFamily: "'Playfair Display', Georgia, serif",
      headingStyle: "font-style:italic;", staffBg: "#8b6914", staffFg: "#fff",
    },
    modern: {
      bg: "#ffffff", text: "#1a1a1a", accent: "#6b46c1", secondary: "#555",
      border: "#e0e0e0", fontFamily: "'Inter', -apple-system, sans-serif",
      headingStyle: "", staffBg: "#6b46c1", staffFg: "#fff",
    },
    rustic: {
      bg: "#f5f0e8", text: "#3e2723", accent: "#795548", secondary: "#6d4c41",
      border: "#bcaaa4", fontFamily: "'Playfair Display', Georgia, serif",
      headingStyle: "", staffBg: "#795548", staffFg: "#fff",
    },
  };
  const s = templateStyles[template as keyof typeof templateStyles] || templateStyles.classic;

  const cards = products.map((p) => {
    const imgHtml = show.image && p.image_url
      ? `<div style="width:60px;height:80px;flex-shrink:0;margin:8px auto 4px auto;">
           <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" style="width:100%;height:100%;object-fit:contain;" />
         </div>`
      : "";

    const staffPickHtml = show.staffPick && p.staff_pick
      ? `<div style="position:absolute;top:6px;right:6px;background:${s.staffBg};color:${s.staffFg};font-size:6pt;font-weight:700;padding:2px 6px;border-radius:3px;text-transform:uppercase;letter-spacing:1px;font-family:'Inter',sans-serif;">Staff Pick</div>`
      : "";

    const vintageHtml = p.vintage_year
      ? `<div style="font-size:10pt;color:${s.accent};font-weight:600;margin-bottom:1px;">${escapeHtml(p.vintage_year)}</div>`
      : "";

    const varietalHtml = show.varietal && p.varietal
      ? `<div style="font-size:9pt;color:${s.secondary};text-transform:uppercase;letter-spacing:1px;">${escapeHtml(p.varietal)}</div>`
      : "";

    const regionHtml = show.region && p.region
      ? `<div style="font-size:9pt;color:${s.secondary};font-style:italic;">${escapeHtml(p.region)}</div>`
      : "";

    const ratingHtml = show.rating && p.rating
      ? `<div style="font-size:11pt;font-weight:700;color:${s.accent};margin-top:2px;">${escapeHtml(String(p.rating))} POINTS</div>`
      : "";

    const priceHtml = show.price
      ? `<div style="font-size:14pt;font-weight:700;color:${s.text};margin-top:3px;">$${Number(p.price).toFixed(2)}</div>`
      : "";

    const descHtml = show.description && p.description
      ? `<div style="font-size:9pt;color:${s.secondary};line-height:1.35;margin-top:3px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;">${escapeHtml(p.description)}</div>`
      : "";

    const tastingHtml = show.tastingNotes && p.tasting_notes
      ? `<div style="font-size:9pt;color:${s.secondary};line-height:1.35;margin-top:2px;font-style:italic;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escapeHtml(p.tasting_notes)}</div>`
      : "";

    const pairingsHtml = show.pairings && p.food_pairings
      ? `<div style="font-size:8pt;color:${s.secondary};margin-top:2px;"><strong>Pairs with:</strong> ${escapeHtml(p.food_pairings)}</div>`
      : "";

    const awardsHtml = show.awards && p.awards
      ? `<div style="font-size:8pt;color:${s.accent};margin-top:2px;font-weight:600;">${escapeHtml(p.awards)}</div>`
      : "";

    const alcoholHtml = show.alcohol && p.alcohol_content
      ? `<span style="font-size:8pt;color:${s.secondary};">${escapeHtml(p.alcohol_content)} ABV</span>`
      : "";

    const bodyHtml = show.body && p.body && p.body !== "N/A"
      ? `<span style="font-size:8pt;color:${s.secondary};">${escapeHtml(p.body)}</span>`
      : "";

    const sweetnessHtml = show.sweetness && p.sweetness && p.sweetness !== "N/A"
      ? `<span style="font-size:8pt;color:${s.secondary};">${escapeHtml(p.sweetness)}</span>`
      : "";

    const detailParts = [bodyHtml, sweetnessHtml, alcoholHtml].filter(Boolean);
    const separator = ` <span style="color:${s.border};">|</span> `;
    const detailLine = detailParts.length > 0
      ? `<div style="margin-top:2px;">${detailParts.join(separator)}</div>`
      : "";

    const categoryLabel = (p.category || "").replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());

    return `
      <div style="width:${sz.width};height:${sz.height};border:1px solid ${s.border};border-radius:6px;overflow:hidden;background:${s.bg};position:relative;display:flex;flex-direction:column;page-break-inside:avoid;break-inside:avoid;">
        ${staffPickHtml}
        ${imgHtml}
        <div style="flex:1;padding:8px 10px;display:flex;flex-direction:column;">
          ${vintageHtml}
          <div style="font-size:13pt;font-weight:700;color:${s.text};${s.headingStyle}line-height:1.15;">${escapeHtml(p.name)}</div>
          ${varietalHtml}
          ${regionHtml}
          ${ratingHtml}
          ${priceHtml}
          ${descHtml}
          ${tastingHtml}
          ${pairingsHtml}
          ${awardsHtml}
          ${detailLine}
          <div style="margin-top:auto;padding-top:4px;border-top:1px solid ${s.border};font-size:7pt;color:${s.secondary};text-align:center;text-transform:uppercase;letter-spacing:1px;">
            ${escapeHtml(categoryLabel)} · Nashoba Valley
          </div>
        </div>
      </div>
    `;
  }).join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Shelf Talkers - Nashoba Valley</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { font-size: ${fontScale}%; }
    body {
      font-family: ${s.fontFamily};
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .grid {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      padding: 0.25in;
      justify-content: center;
    }
    @media print {
      @page { margin: 0.25in; }
      body { margin: 0; }
      .grid { gap: 8px; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="grid">
    ${products.length === 0 ? '<div style="text-align:center;padding:40px;color:#999;font-size:14pt;">No products selected.</div>' : cards}
  </div>
</body>
</html>`;
}

// ─── Flight Card CRUD ────────────────────────────────────────────────────────

router.get("/api/media/flight-cards/configs", async (_req, res) => {
  try {
    const configs = await db.select().from(flightCardConfigs).orderBy(flightCardConfigs.name);
    res.json(configs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/media/flight-cards/configs", async (req, res) => {
  try {
    const body = req.body;
    const [created] = await db.insert(flightCardConfigs).values({
      name: body.name,
      header: body.header || null,
      footer: body.footer || null,
      productIds: body.productIds || "",
      template: body.template || "classic",
      paperSize: body.paperSize || "a6",
      showPrice: body.showPrice !== false,
      showDescription: body.showDescription !== false,
      showVintage: body.showVintage !== false,
      showVarietal: body.showVarietal !== false,
      showAlcohol: body.showAlcohol === true,
      showTastingLines: body.showTastingLines === true,
      fontScale: body.fontScale || 100,
      showOnStaffBoard: body.showOnStaffBoard === true,
    }).returning();
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/api/media/flight-cards/configs/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const [updated] = await db.update(flightCardConfigs).set({
      name: body.name,
      header: body.header || null,
      footer: body.footer || null,
      productIds: body.productIds || "",
      template: body.template || "classic",
      paperSize: body.paperSize || "a6",
      showPrice: body.showPrice !== false,
      showDescription: body.showDescription !== false,
      showVintage: body.showVintage !== false,
      showVarietal: body.showVarietal !== false,
      showAlcohol: body.showAlcohol === true,
      showTastingLines: body.showTastingLines === true,
      fontScale: body.fontScale || 100,
      showOnStaffBoard: body.showOnStaffBoard === true,
      updatedAt: new Date(),
    }).where(eq(flightCardConfigs.id, id)).returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/api/media/flight-cards/configs/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(flightCardConfigs).where(eq(flightCardConfigs.id, id));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Flight Card Print Renderer ───────────────────────────────────────────────

router.get("/api/media/flight-cards/print", async (req, res) => {
  try {
    const {
      ids = "",
      template = "classic",
      size = "a6",
      scale = "100",
      header,
      footer,
      showprice,
      showdesc,
      showvintage,
      showvarietal,
      showalcohol,
      showtasting,
    } = req.query as Record<string, string>;

    const fontScale = parseInt(scale) || 100;
    const show = {
      price: showprice !== "0",
      description: showdesc !== "0",
      vintage: showvintage !== "0",
      varietal: showvarietal !== "0",
      alcohol: showalcohol === "1",
      tastingLines: showtasting === "1",
    };

    let products: any[] = [];
    const idList = ids.split(",").map(s => s.trim()).filter(Boolean);
    if (idList.length > 0) {
      const pgArray = `{${idList.map(id => `"${id}"`).join(",")}}`;
      const result = await db.execute(sql`
        SELECT id, name, category, type, varietal, vintage_year, price,
               description, tasting_notes, alcohol_content, image_url, staff_pick
        FROM products
        WHERE id = ANY(${pgArray}::text[])
          AND is_archived = false
      `);
      const rows = result.rows as any[];
      products = idList.map(id => rows.find((r: any) => r.id === id)).filter(Boolean);
    }

    const html = renderFlightCardHtml(products, { template, fontScale, paperSize: size, header: header || "", footer: footer || "", show });
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (err: any) {
    console.error("Flight card render error:", err);
    res.status(500).send("Error generating flight card");
  }
});

interface FlightCardOptions {
  template: string;
  fontScale: number;
  paperSize: string;
  header: string;
  footer: string;
  show: {
    price: boolean;
    description: boolean;
    vintage: boolean;
    varietal: boolean;
    alcohol: boolean;
    tastingLines: boolean;
  };
}

const FLIGHT_PAPER_SIZES: Record<string, { width: string; height: string; label: string }> = {
  "a6":   { width: "4.13in", height: "5.83in",  label: "A6 (4.13×5.83\")" },
  "4x6":  { width: "4in",    height: "6in",      label: "4×6\" Postcard" },
  "a5":   { width: "5.83in", height: "8.27in",   label: "A5 (5.83×8.27\")" },
  "5x7":  { width: "5in",    height: "7in",      label: "5×7\" Photo Card" },
  "half": { width: "5.5in",  height: "8.5in",    label: "Half Sheet (5.5×8.5\")" },
};

function renderFlightCardHtml(products: any[], opts: FlightCardOptions): string {
  const { template, fontScale, paperSize, header, footer, show } = opts;
  const sz = FLIGHT_PAPER_SIZES[paperSize] || FLIGHT_PAPER_SIZES["a6"];

  const themes = {
    classic: {
      pageBg: "#fdfaf4",
      cardBg: "#faf7ef",
      border: "#c9b88a",
      text: "#2c1810",
      accent: "#7a3b1e",
      secondary: "#6b5240",
      muted: "#9a8060",
      headerFont: "'Playfair Display', Georgia, serif",
      bodyFont: "'Playfair Display', Georgia, serif",
      divider: "#c9b88a",
      tastingLineFill: "#f0e8d4",
      numberBg: "#7a3b1e",
      numberFg: "#fff",
    },
    modern: {
      pageBg: "#ffffff",
      cardBg: "#ffffff",
      border: "#e2e2e2",
      text: "#1a1a1a",
      accent: "#2563eb",
      secondary: "#555",
      muted: "#888",
      headerFont: "'Inter', -apple-system, sans-serif",
      bodyFont: "'Inter', -apple-system, sans-serif",
      divider: "#e2e2e2",
      tastingLineFill: "#f5f5f5",
      numberBg: "#2563eb",
      numberFg: "#fff",
    },
    rustic: {
      pageBg: "#f5ede0",
      cardBg: "#fdf6ec",
      border: "#b08860",
      text: "#3e2005",
      accent: "#7c4a03",
      secondary: "#6b4226",
      muted: "#8b6347",
      headerFont: "'Playfair Display', Georgia, serif",
      bodyFont: "'Playfair Display', Georgia, serif",
      divider: "#b08860",
      tastingLineFill: "#ede0cc",
      numberBg: "#7c4a03",
      numberFg: "#fff",
    },
  };

  const t = themes[template as keyof typeof themes] || themes.classic;
  const esc = (s: string) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const headerHtml = header
    ? `<div style="text-align:center;margin-bottom:10px;">
        <div style="font-size:15pt;font-weight:700;color:${t.accent};font-family:${t.headerFont};letter-spacing:0.5px;line-height:1.2;">${esc(header)}</div>
        <div style="width:50px;height:2px;background:${t.divider};margin:5px auto 0;"></div>
       </div>`
    : `<div style="text-align:center;margin-bottom:10px;">
        <div style="font-size:13pt;font-weight:700;color:${t.accent};font-family:${t.headerFont};letter-spacing:1px;text-transform:uppercase;">Tasting Flight</div>
        <div style="width:50px;height:2px;background:${t.divider};margin:5px auto 0;"></div>
       </div>`;

  const footerHtml = footer
    ? `<div style="text-align:center;font-size:7.5pt;color:${t.muted};font-family:${t.bodyFont};margin-top:auto;padding-top:8px;border-top:1px solid ${t.divider};font-style:italic;">${esc(footer)}</div>`
    : "";

  const emptyHtml = `<div style="text-align:center;color:${t.muted};font-size:10pt;padding:20px 0;">No products selected.</div>`;

  const itemRows = products.length === 0 ? emptyHtml : products.map((p, i) => {
    const num = i + 1;
    const name = esc(p.name || "");
    const vintage = show.vintage && p.vintage_year ? esc(p.vintage_year) : "";
    const varietal = show.varietal && p.varietal ? esc(p.varietal) : "";
    const alcohol = show.alcohol && p.alcohol_content ? esc(p.alcohol_content) + " ABV" : "";
    const price = show.price && p.price ? `$${Number(p.price).toFixed(2)}` : "";
    const desc = show.description && p.description
      ? `<div style="font-size:7.5pt;color:${t.secondary};line-height:1.4;margin-top:3px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;">${esc(p.description)}</div>`
      : "";

    const metaParts = [varietal, alcohol].filter(Boolean);
    const meta = metaParts.length
      ? `<div style="font-size:7.5pt;color:${t.muted};margin-top:1px;">${metaParts.join(" · ")}</div>`
      : "";

    const tastingLines = show.tastingLines
      ? `<div style="margin-top:5px;">
           <div style="font-size:6pt;color:${t.muted};letter-spacing:0.5px;text-transform:uppercase;margin-bottom:2px;">My Notes</div>
           <div style="height:1px;background:${t.divider};margin-bottom:4px;opacity:0.6;"></div>
           <div style="height:1px;background:${t.divider};margin-bottom:4px;opacity:0.6;"></div>
           <div style="height:1px;background:${t.divider};opacity:0.6;"></div>
         </div>`
      : "";

    const isLast = i === products.length - 1;
    return `
      <div style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;${!isLast ? `border-bottom:1px solid ${t.divider};` : ""}">
        <div style="flex-shrink:0;width:20px;height:20px;border-radius:50%;background:${t.numberBg};color:${t.numberFg};font-size:9pt;font-weight:700;font-family:${t.bodyFont};display:flex;align-items:center;justify-content:center;margin-top:1px;">${num}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:baseline;justify-content:space-between;gap:4px;">
            <div style="font-size:9.5pt;font-weight:700;color:${t.text};font-family:${t.headerFont};line-height:1.2;">${vintage ? `${name} <span style="font-weight:400;font-size:8pt;color:${t.muted};">${vintage}</span>` : name}</div>
            ${price ? `<div style="font-size:9pt;font-weight:700;color:${t.accent};white-space:nowrap;flex-shrink:0;">${price}</div>` : ""}
          </div>
          ${meta}
          ${desc}
          ${tastingLines}
        </div>
      </div>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Flight Card - Nashoba Valley</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { font-size: ${fontScale}%; }
    body {
      background: ${t.pageBg};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    @media print {
      @page { margin: 0; size: ${sz.width} ${sz.height}; }
      body { margin: 0; min-height: unset; }
      .card { box-shadow: none !important; }
    }
  </style>
</head>
<body>
  <div class="card" style="width:${sz.width};min-height:${sz.height};background:${t.cardBg};border:1.5px solid ${t.border};border-radius:6px;padding:18px 16px;display:flex;flex-direction:column;box-shadow:0 2px 8px rgba(0,0,0,0.10);">
    ${headerHtml}
    <div style="flex:1;">
      ${itemRows}
    </div>
    ${footerHtml}
  </div>
</body>
</html>`;
}

export default router;
