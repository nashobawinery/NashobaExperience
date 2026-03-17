import { Router, Request, Response } from "express";
import { db } from "./db";
import { meetingNotes } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import OpenAI, { toFile } from "openai";
import multer from "multer";
import { requirePlatformRole } from "./platformAuth";

const router = Router();
const isAdmin = requirePlatformRole(['super_admin']);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.get("/api/meeting-notes", isAdmin, async (_req: Request, res: Response) => {
  try {
    const notes = await db.select().from(meetingNotes).orderBy(desc(meetingNotes.createdAt));
    res.json(notes);
  } catch (error) {
    console.error("Error fetching meeting notes:", error);
    res.status(500).json({ error: "Failed to fetch meeting notes" });
  }
});

router.get("/api/meeting-notes/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const [note] = await db.select().from(meetingNotes).where(eq(meetingNotes.id, parseInt(req.params.id)));
    if (!note) return res.status(404).json({ error: "Meeting note not found" });
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch meeting note" });
  }
});

router.post("/api/meeting-notes", isAdmin, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const [note] = await db.insert(meetingNotes).values({
      ...req.body,
      createdBy: user?.claims?.sub || null,
    }).returning();
    res.json(note);
  } catch (error) {
    console.error("Error creating meeting note:", error);
    res.status(500).json({ error: "Failed to create meeting note" });
  }
});

router.put("/api/meeting-notes/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const [note] = await db.update(meetingNotes)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(meetingNotes.id, parseInt(req.params.id)))
      .returning();
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: "Failed to update meeting note" });
  }
});

router.delete("/api/meeting-notes/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    await db.delete(meetingNotes).where(eq(meetingNotes.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete meeting note" });
  }
});

router.post("/api/meeting-notes/transcribe", isAdmin, upload.single("audio"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio file provided" });

    const openai = new OpenAI();

    const audioFile = await toFile(req.file.buffer, "recording.webm", { type: req.file.mimetype || "audio/webm" });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "gpt-4o-mini-transcribe",
      response_format: "json",
    });

    res.json({ transcript: transcription.text });
  } catch (error: any) {
    console.error("Transcription error:", error);
    res.status(500).json({ error: "Failed to transcribe audio: " + (error.message || "Unknown error") });
  }
});

router.post("/api/meeting-notes/:id/summarize", isAdmin, async (req: Request, res: Response) => {
  try {
    const [note] = await db.select().from(meetingNotes).where(eq(meetingNotes.id, parseInt(req.params.id)));
    if (!note) return res.status(404).json({ error: "Meeting note not found" });

    if (!note.transcript) return res.status(400).json({ error: "No transcript available to summarize" });

    const openai = new OpenAI();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a meeting summarizer for Nashoba Valley Winery. Create a concise, well-organized summary of the meeting transcript provided. Include:

1. **Meeting Summary**: A brief 2-3 sentence overview of what was discussed
2. **Key Discussion Points**: Bullet points of the main topics covered
3. **Decisions Made**: Any decisions that were reached
4. **Action Items**: Specific tasks assigned with who is responsible (if mentioned)
5. **Follow-up Items**: Things that need further discussion or attention

Format your response in clear markdown. Be concise but thorough.`
        },
        {
          role: "user",
          content: `Please summarize this meeting transcript:\n\n${note.transcript}`
        }
      ],
      max_tokens: 2048,
    });

    const summary = response.choices[0]?.message?.content || "Unable to generate summary";

    const actionItemsResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Extract action items from this meeting transcript. Return them as a simple bulleted list, each starting with '- '. Include who is responsible if mentioned. If no clear action items, return '- No specific action items identified'."
        },
        {
          role: "user",
          content: note.transcript
        }
      ],
      max_tokens: 1024,
    });

    const actionItems = actionItemsResponse.choices[0]?.message?.content || "";

    const [updated] = await db.update(meetingNotes)
      .set({ summary, actionItems, status: "summarized", updatedAt: new Date() })
      .where(eq(meetingNotes.id, note.id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    console.error("Summarization error:", error);
    res.status(500).json({ error: "Failed to summarize: " + (error.message || "Unknown error") });
  }
});

export default router;
