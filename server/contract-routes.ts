import { Router } from "express";
import { db } from "./db";
import { contracts, contractDocuments, contractResponsibles, platformUsers } from "@shared/schema";
import { eq, sql, desc, and, inArray } from "drizzle-orm";
import { isAuthenticated, isAdmin } from "./replitAuth";
import { ObjectStorageService, objectStorageClient } from "./objectStorage";
import OpenAI from "openai";
import * as pdfParseModule from "pdf-parse";

const pdfParse = (pdfParseModule as any).default || pdfParseModule;
const router = Router();
const objectStorageService = new ObjectStorageService();

router.get("/", isAuthenticated, async (req, res) => {
  try {
    const allContracts = await db.execute(sql`
      SELECT c.*,
        COALESCE(
          (SELECT json_agg(json_build_object('id', cr.id, 'userId', cr.user_id, 'firstName', pu.first_name, 'lastName', pu.last_name, 'email', pu.email))
           FROM contract_responsibles cr
           JOIN platform_users pu ON cr.user_id = pu.id
           WHERE cr.contract_id = c.id), '[]'::json
        ) as responsibles,
        (SELECT COUNT(*) FROM contract_documents cd WHERE cd.contract_id = c.id) as document_count
      FROM contract_contracts c
      ORDER BY
        CASE c.status
          WHEN 'expiring_soon' THEN 1
          WHEN 'active' THEN 2
          WHEN 'expired' THEN 3
          WHEN 'renewed' THEN 4
          WHEN 'cancelled' THEN 5
        END,
        c.expiration_date ASC NULLS LAST
    `);
    res.json(allContracts.rows);
  } catch (error) {
    console.error("Error fetching contracts:", error);
    res.status(500).json({ error: "Failed to fetch contracts" });
  }
});

router.get("/categories", isAuthenticated, async (_req, res) => {
  res.json([
    { value: "insurance", label: "Insurance" },
    { value: "waste_disposal", label: "Waste Disposal" },
    { value: "software", label: "Software" },
    { value: "equipment", label: "Equipment" },
    { value: "utilities", label: "Utilities" },
    { value: "maintenance", label: "Maintenance" },
    { value: "professional_services", label: "Professional Services" },
    { value: "lease", label: "Lease" },
    { value: "licensing", label: "Licensing" },
    { value: "other", label: "Other" },
  ]);
});

router.get("/users", isAuthenticated, async (_req, res) => {
  try {
    const users = await db.select({
      id: platformUsers.id,
      firstName: platformUsers.firstName,
      lastName: platformUsers.lastName,
      email: platformUsers.email,
    }).from(platformUsers).where(eq(platformUsers.active, true));
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT c.*,
        COALESCE(
          (SELECT json_agg(json_build_object('id', cr.id, 'userId', cr.user_id, 'firstName', pu.first_name, 'lastName', pu.last_name, 'email', pu.email))
           FROM contract_responsibles cr
           JOIN platform_users pu ON cr.user_id = pu.id
           WHERE cr.contract_id = c.id), '[]'::json
        ) as responsibles
      FROM contract_contracts c
      WHERE c.id = ${parseInt(req.params.id)}
    `);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Contract not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch contract" });
  }
});

router.post("/", isAuthenticated, async (req, res) => {
  try {
    const { responsibleUserIds, ...contractData } = req.body;
    const result = await db.insert(contracts).values({
      name: contractData.name,
      category: contractData.category || "other",
      vendor: contractData.vendor,
      description: contractData.description || null,
      startDate: contractData.startDate ? new Date(contractData.startDate) : null,
      expirationDate: contractData.expirationDate ? new Date(contractData.expirationDate) : null,
      renewalTerms: contractData.renewalTerms || null,
      amount: contractData.amount || null,
      paymentFrequency: contractData.paymentFrequency || null,
      notificationSchedule: contractData.notificationSchedule || "60,45,30,15",
      status: contractData.status || "active",
      renewedFromId: contractData.renewedFromId || null,
      notes: contractData.notes || null,
    }).returning();

    const contract = result[0];

    if (responsibleUserIds && responsibleUserIds.length > 0) {
      await db.insert(contractResponsibles).values(
        responsibleUserIds.map((userId: string) => ({
          contractId: contract.id,
          userId,
        }))
      );
    }

    res.json(contract);
  } catch (error) {
    console.error("Error creating contract:", error);
    res.status(500).json({ error: "Failed to create contract" });
  }
});

router.patch("/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { responsibleUserIds, ...contractData } = req.body;

    const updateFields: any = { updatedAt: new Date() };
    if (contractData.name !== undefined) updateFields.name = contractData.name;
    if (contractData.category !== undefined) updateFields.category = contractData.category;
    if (contractData.vendor !== undefined) updateFields.vendor = contractData.vendor;
    if (contractData.description !== undefined) updateFields.description = contractData.description;
    if (contractData.startDate !== undefined) updateFields.startDate = contractData.startDate ? new Date(contractData.startDate) : null;
    if (contractData.expirationDate !== undefined) updateFields.expirationDate = contractData.expirationDate ? new Date(contractData.expirationDate) : null;
    if (contractData.renewalTerms !== undefined) updateFields.renewalTerms = contractData.renewalTerms;
    if (contractData.amount !== undefined) updateFields.amount = contractData.amount;
    if (contractData.paymentFrequency !== undefined) updateFields.paymentFrequency = contractData.paymentFrequency;
    if (contractData.notificationSchedule !== undefined) updateFields.notificationSchedule = contractData.notificationSchedule;
    if (contractData.status !== undefined) updateFields.status = contractData.status;
    if (contractData.notes !== undefined) updateFields.notes = contractData.notes;

    const result = await db.update(contracts).set(updateFields).where(eq(contracts.id, id)).returning();

    if (responsibleUserIds !== undefined) {
      await db.delete(contractResponsibles).where(eq(contractResponsibles.contractId, id));
      if (responsibleUserIds.length > 0) {
        await db.insert(contractResponsibles).values(
          responsibleUserIds.map((userId: string) => ({
            contractId: id,
            userId,
          }))
        );
      }
    }

    res.json(result[0]);
  } catch (error) {
    console.error("Error updating contract:", error);
    res.status(500).json({ error: "Failed to update contract" });
  }
});

router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    await db.delete(contracts).where(eq(contracts.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete contract" });
  }
});

router.get("/:id/documents", isAuthenticated, async (req, res) => {
  try {
    const docs = await db.select().from(contractDocuments)
      .where(eq(contractDocuments.contractId, parseInt(req.params.id)))
      .orderBy(desc(contractDocuments.createdAt));
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

router.post("/upload-url", isAuthenticated, async (_req, res) => {
  try {
    const privateDir = objectStorageService.getPrivateObjectDir();
    const uuid = require("crypto").randomUUID();
    const fullPath = `${privateDir}/contracts/${uuid}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    const request = {
      bucket_name: bucketName,
      object_name: objectName,
      method: "PUT",
      expires_at: new Date(Date.now() + 900 * 1000).toISOString(),
    };
    const response = await fetch(
      "http://127.0.0.1:1106/object-storage/signed-object-url",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to sign URL: ${response.status}`);
    }
    const { signed_url } = await response.json();
    res.json({ uploadUrl: signed_url, objectPath: fullPath });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

router.post("/:id/documents", isAuthenticated, async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    const { fileName, objectPath, fileSize, mimeType, uploadedById, uploadedByName } = req.body;

    await db.update(contractDocuments)
      .set({ isCurrent: false })
      .where(eq(contractDocuments.contractId, contractId));

    const result = await db.insert(contractDocuments).values({
      contractId,
      fileName,
      objectPath,
      fileSize: fileSize || null,
      mimeType: mimeType || null,
      isCurrent: true,
      uploadedById: uploadedById || null,
      uploadedByName: uploadedByName || null,
    }).returning();

    res.json(result[0]);
  } catch (error) {
    console.error("Error saving document:", error);
    res.status(500).json({ error: "Failed to save document" });
  }
});

router.post("/extract-from-path", isAuthenticated, async (req, res) => {
  try {
    const { objectPath, fileName } = req.body;
    if (!objectPath) {
      return res.status(400).json({ error: "objectPath is required" });
    }

    const { bucketName, objectName } = parseObjectPath(objectPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: "File not found in storage" });
    }

    const [buffer] = await file.download();
    let textContent = "";
    const isPdf = (fileName || "").toLowerCase().endsWith(".pdf") || objectPath.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      const pdfData = await pdfParse(buffer);
      textContent = pdfData.text;
    } else {
      textContent = buffer.toString("utf-8");
    }

    if (!textContent || textContent.trim().length < 10) {
      return res.status(400).json({ error: "Could not extract meaningful text from document. The document may be image-based or empty." });
    }

    const truncatedText = textContent.substring(0, 8000);

    const openai = new OpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a contract analysis assistant. Extract key information from the contract text and return a JSON object with the following fields (use null for any field you cannot determine):
{
  "vendor": "Company or organization name of the other party",
  "contractName": "A descriptive name for this contract",
  "description": "Brief 1-2 sentence description of what this contract covers",
  "startDate": "YYYY-MM-DD format or null",
  "expirationDate": "YYYY-MM-DD format or null",
  "amount": "Total dollar amount as a number (no $ sign or commas) or null",
  "paymentFrequency": "monthly/quarterly/semi-annually/annually/one-time or null",
  "renewalTerms": "Brief description of renewal terms or auto-renewal clauses",
  "category": "One of: insurance, waste_disposal, software, equipment, utilities, maintenance, professional_services, lease, licensing, other",
  "keyTerms": ["Array of 3-5 key terms or obligations"],
  "summary": "A comprehensive 3-5 sentence summary of the contract covering the parties, purpose, key obligations, financial terms, and important dates"
}
Return ONLY valid JSON, no markdown.`
        },
        {
          role: "user",
          content: `Extract the key information from this contract document:\n\n${truncatedText}`
        }
      ],
      temperature: 0.1,
      max_tokens: 1500,
    });

    const responseText = completion.choices[0]?.message?.content || "{}";
    let extractedData: any;
    try {
      extractedData = JSON.parse(responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      extractedData = { raw: responseText, parseError: true };
    }

    res.json({ extractedData, summary: extractedData.summary || null });
  } catch (error: any) {
    console.error("Error extracting from uploaded file:", error);
    res.status(500).json({ error: error.message || "Failed to extract document data" });
  }
});

router.post("/documents/:docId/extract", isAuthenticated, async (req, res) => {
  try {
    const docId = parseInt(req.params.docId);
    const doc = await db.select().from(contractDocuments).where(eq(contractDocuments.id, docId));
    if (doc.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    const document = doc[0];
    const objectPath = document.objectPath;

    const { bucketName, objectName } = parseObjectPath(objectPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: "File not found in storage" });
    }

    const [buffer] = await file.download();
    let textContent = "";

    if (document.mimeType === "application/pdf" || document.fileName.toLowerCase().endsWith(".pdf")) {
      const pdfData = await pdfParse(buffer);
      textContent = pdfData.text;
    } else {
      textContent = buffer.toString("utf-8");
    }

    if (!textContent || textContent.trim().length < 10) {
      return res.status(400).json({ error: "Could not extract meaningful text from document. The document may be image-based or empty." });
    }

    const truncatedText = textContent.substring(0, 8000);

    const openai = new OpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a contract analysis assistant. Extract key information from the contract text and return a JSON object with the following fields (use null for any field you cannot determine):
{
  "vendor": "Company or organization name of the other party",
  "contractName": "A descriptive name for this contract",
  "description": "Brief 1-2 sentence description of what this contract covers",
  "startDate": "YYYY-MM-DD format or null",
  "expirationDate": "YYYY-MM-DD format or null",
  "amount": "Total dollar amount as a number (no $ sign or commas) or null",
  "paymentFrequency": "monthly/quarterly/annually/one-time or null",
  "renewalTerms": "Brief description of renewal terms or auto-renewal clauses",
  "keyTerms": ["Array of 3-5 key terms or obligations"],
  "summary": "A comprehensive 3-5 sentence summary of the contract covering the parties, purpose, key obligations, financial terms, and important dates"
}
Return ONLY valid JSON, no markdown.`
        },
        {
          role: "user",
          content: `Extract the key information from this contract document:\n\n${truncatedText}`
        }
      ],
      temperature: 0.1,
      max_tokens: 1500,
    });

    const responseText = completion.choices[0]?.message?.content || "{}";
    let extractedData: any;
    try {
      extractedData = JSON.parse(responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      extractedData = { raw: responseText, parseError: true };
    }

    await db.update(contractDocuments)
      .set({
        extractedData: JSON.stringify(extractedData),
        aiSummary: extractedData.summary || null,
      })
      .where(eq(contractDocuments.id, docId));

    res.json({ extractedData, summary: extractedData.summary || null });
  } catch (error: any) {
    console.error("Error extracting document data:", error);
    res.status(500).json({ error: error.message || "Failed to extract document data" });
  }
});

router.post("/:id/renew", isAuthenticated, async (req, res) => {
  try {
    const oldId = parseInt(req.params.id);
    const { newContractData, responsibleUserIds } = req.body;

    await db.update(contracts)
      .set({ status: "renewed", updatedAt: new Date() })
      .where(eq(contracts.id, oldId));

    const result = await db.insert(contracts).values({
      name: newContractData.name,
      category: newContractData.category,
      vendor: newContractData.vendor,
      description: newContractData.description || null,
      startDate: newContractData.startDate ? new Date(newContractData.startDate) : null,
      expirationDate: newContractData.expirationDate ? new Date(newContractData.expirationDate) : null,
      renewalTerms: newContractData.renewalTerms || null,
      amount: newContractData.amount || null,
      paymentFrequency: newContractData.paymentFrequency || null,
      notificationSchedule: newContractData.notificationSchedule || "60,45,30,15",
      status: "active",
      renewedFromId: oldId,
      notes: newContractData.notes || null,
    }).returning();

    const newContract = result[0];

    if (responsibleUserIds && responsibleUserIds.length > 0) {
      await db.insert(contractResponsibles).values(
        responsibleUserIds.map((userId: string) => ({
          contractId: newContract.id,
          userId,
        }))
      );
    }

    res.json(newContract);
  } catch (error) {
    console.error("Error renewing contract:", error);
    res.status(500).json({ error: "Failed to renew contract" });
  }
});

router.get("/:id/documents/:docId/download-url", isAuthenticated, async (req, res) => {
  try {
    const docId = parseInt(req.params.docId);
    const doc = await db.select().from(contractDocuments).where(eq(contractDocuments.id, docId));
    if (doc.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    const objectPath = doc[0].objectPath;
    const { bucketName, objectName } = parseObjectPath(objectPath);

    const request = {
      bucket_name: bucketName,
      object_name: objectName,
      method: "GET",
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
    const response = await fetch(
      "http://127.0.0.1:1106/object-storage/signed-object-url",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      }
    );
    if (!response.ok) throw new Error("Failed to sign URL");
    const { signed_url } = await response.json();
    res.json({ downloadUrl: signed_url, fileName: doc[0].fileName });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate download URL" });
  }
});

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  if (path.startsWith("https://storage.googleapis.com/")) {
    const url = new URL(path);
    const parts = url.pathname.split("/").filter(p => p);
    return { bucketName: parts[0], objectName: parts.slice(1).join("/") };
  }
  if (!path.startsWith("/")) path = `/${path}`;
  const parts = path.split("/");
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

export default router;
