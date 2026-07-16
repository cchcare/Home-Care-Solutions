// Proxies OCR extraction requests to the standalone ocr-service/ app, which
// runs on a normal persistent Node host (not Vercel) because it needs
// GraphicsMagick/Ghostscript to rasterize PDF pages — binaries Vercel's
// serverless runtime can't provide.
import type { ExtractedPaystubData } from "./ocr-service";

async function callOcrService(
  path: string,
  fieldName: string,
  buffer: Buffer,
  originalname: string,
  mimetype: string,
): Promise<any> {
  const baseUrl = process.env.OCR_SERVICE_URL;
  if (!baseUrl) {
    throw new Error("OCR_SERVICE_URL is not configured");
  }
  const form = new FormData();
  form.append(fieldName, new Blob([buffer], { type: mimetype }), originalname);

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OCR_SERVICE_SECRET || ""}` },
    body: form,
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.message || `OCR service request failed (${response.status})`);
  }
  return body;
}

export async function extractCaregiverViaOcrService(buffer: Buffer, originalname: string, mimetype: string) {
  return callOcrService("/extract-caregiver", "document", buffer, originalname, mimetype);
}

export async function extractClientViaOcrService(buffer: Buffer, originalname: string, mimetype: string) {
  return callOcrService("/extract-client", "document", buffer, originalname, mimetype);
}

export async function extractPaystubsViaOcrService(
  buffer: Buffer,
  originalname: string,
  mimetype: string,
): Promise<{ pages: { pageNumber: number; data: ExtractedPaystubData }[] }> {
  return callOcrService("/extract-paystubs", "file", buffer, originalname, mimetype);
}
