import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import {
  extractCaregiverFromPdf,
  extractClientFromPdf,
  extractFromImageFile,
  extractPaystubsFromPdf,
  cleanupPaystubTempFiles,
} from "./ocr-core";

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

function requireSharedSecret(req: express.Request, res: express.Response, next: express.NextFunction) {
  const expected = process.env.OCR_SERVICE_SECRET;
  if (!expected) {
    return res.status(500).json({ message: "OCR_SERVICE_SECRET is not configured" });
  }
  if (req.headers.authorization !== `Bearer ${expected}`) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// Writes the uploaded buffer to a temp file (ocr-core's pdf2pic/getPageCount
// calls need a filesystem path, not a buffer) and returns a cleanup function.
function bufferToTempFile(buffer: Buffer, originalName: string): { filePath: string; cleanup: () => void } {
  const filePath = path.join(os.tmpdir(), `${crypto.randomUUID()}${path.extname(originalName)}`);
  fs.writeFileSync(filePath, buffer);
  return { filePath, cleanup: () => fs.existsSync(filePath) && fs.unlinkSync(filePath) };
}

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.post("/extract-caregiver", requireSharedSecret, upload.single("document"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No document uploaded" });
  const { filePath, cleanup } = bufferToTempFile(req.file.buffer, req.file.originalname);
  try {
    const data = req.file.mimetype === "application/pdf"
      ? await extractCaregiverFromPdf(filePath)
      : req.file.mimetype.startsWith("image/")
        ? await extractFromImageFile(filePath, "caregiver")
        : null;
    if (!data) return res.status(400).json({ message: "Unsupported file type. Please upload a PDF or image file." });
    res.json(data);
  } catch (error: any) {
    console.error("extract-caregiver failed:", error);
    res.status(500).json({ message: "Failed to extract data from document. Please ensure the document is readable." });
  } finally {
    cleanup();
  }
});

app.post("/extract-client", requireSharedSecret, upload.single("document"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No document uploaded" });
  const { filePath, cleanup } = bufferToTempFile(req.file.buffer, req.file.originalname);
  try {
    const data = req.file.mimetype === "application/pdf"
      ? await extractClientFromPdf(filePath)
      : req.file.mimetype.startsWith("image/")
        ? await extractFromImageFile(filePath, "client")
        : null;
    if (!data) return res.status(400).json({ message: "Unsupported file type. Please upload a PDF or image file." });
    res.json(data);
  } catch (error: any) {
    console.error("extract-client failed:", error);
    res.status(500).json({ message: "Failed to extract data from document. Please ensure the document is readable." });
  } finally {
    cleanup();
  }
});

app.post("/extract-paystubs", requireSharedSecret, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  if (path.extname(req.file.originalname).toLowerCase() !== ".pdf") {
    return res.status(400).json({ message: "Only PDF files are supported for paystub extraction" });
  }
  const { filePath, cleanup } = bufferToTempFile(req.file.buffer, req.file.originalname);
  try {
    const extractedPages = await extractPaystubsFromPdf(filePath);
    cleanupPaystubTempFiles(extractedPages.map((p) => p.imagePath));
    res.json({ pages: extractedPages.map(({ pageNumber, data }) => ({ pageNumber, data })) });
  } catch (error: any) {
    console.error("extract-paystubs failed:", error);
    res.status(500).json({ message: "Failed to process paystub upload" });
  } finally {
    cleanup();
  }
});

const port = parseInt(process.env.PORT || "8080", 10);
app.listen(port, () => {
  console.log(`OCR service listening on port ${port}`);
});
