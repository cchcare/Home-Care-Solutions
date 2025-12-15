import OpenAI from "openai";
import { fromPath } from "pdf2pic";
import fs from "fs";
import path from "path";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export interface ExtractedCaregiverData {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  ssn?: string;
  employeeId?: string;
  gender?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  experienceYears?: number;
  specializations?: string[];
  certifications?: string[];
}

export interface ExtractedClientData {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  gender?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  medicaidNumber?: string;
  medicareNumber?: string;
  primaryDiagnosis?: string;
  allergies?: string[];
  medications?: string[];
}

const CAREGIVER_EXTRACTION_PROMPT = `You are an OCR extraction assistant for a home care agency management system.
Analyze this document image and extract all personal information for a caregiver/employee.

Extract the following fields if present:
- firstName: First name
- lastName: Last name  
- middleName: Middle name or initial
- dateOfBirth: Date of birth (format: YYYY-MM-DD)
- email: Email address
- phone: Phone number
- address: Street address
- city: City
- state: State (2-letter abbreviation preferred)
- zipCode: ZIP/Postal code
- ssn: Social Security Number (last 4 digits only for security)
- employeeId: Employee ID or badge number
- gender: Gender (male/female/other)
- emergencyContactName: Emergency contact name
- emergencyContactPhone: Emergency contact phone
- experienceYears: Years of experience (number)
- specializations: Array of care specializations
- certifications: Array of certification names

Return ONLY a valid JSON object with the extracted fields. Use null for fields that cannot be found.
Do not include any explanation or markdown formatting.`;

const CLIENT_EXTRACTION_PROMPT = `You are an OCR extraction assistant for a home care agency management system.
Analyze this document image and extract all personal information for a client/patient.

Extract the following fields if present:
- firstName: First name
- lastName: Last name
- middleName: Middle name or initial
- dateOfBirth: Date of birth (format: YYYY-MM-DD)
- email: Email address
- phone: Phone number
- address: Street address
- city: City
- state: State (2-letter abbreviation preferred)
- zipCode: ZIP/Postal code
- gender: Gender (male/female/other)
- emergencyContactName: Emergency contact name
- emergencyContactPhone: Emergency contact phone
- emergencyContactRelation: Emergency contact relationship
- insuranceProvider: Insurance provider/company name
- insuranceNumber: Insurance ID/policy number
- medicaidNumber: Medicaid ID number
- medicareNumber: Medicare ID number
- primaryDiagnosis: Primary diagnosis or condition
- allergies: Array of known allergies
- medications: Array of current medications

Return ONLY a valid JSON object with the extracted fields. Use null for fields that cannot be found.
Do not include any explanation or markdown formatting.`;

async function convertPdfToImages(pdfPath: string): Promise<string[]> {
  const outputDir = path.join("uploads", "ocr-temp");
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = Date.now();
  const baseFileName = `ocr-${timestamp}`;

  const options = {
    density: 150,
    saveFilename: baseFileName,
    savePath: outputDir,
    format: "png",
    width: 1200,
    height: 1600,
  };

  const convert = fromPath(pdfPath, options);
  const imagePaths: string[] = [];

  try {
    const pageCount = await getPageCount(pdfPath);
    const pagesToProcess = Math.min(pageCount, 5);

    for (let page = 1; page <= pagesToProcess; page++) {
      const result = await convert(page);
      if (result.path) {
        imagePaths.push(result.path);
      }
    }
  } catch (error) {
    console.error("Error converting PDF to images:", error);
    throw new Error("Failed to convert PDF to images for processing");
  }

  return imagePaths;
}

async function getPageCount(pdfPath: string): Promise<number> {
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfString = pdfBuffer.toString("binary");
  const matches = pdfString.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 1;
}

function imageToBase64(imagePath: string): string {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString("base64");
}

function cleanupTempFiles(filePaths: string[]): void {
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Failed to cleanup temp file: ${filePath}`, error);
    }
  }
}

async function extractDataFromImages<T>(
  imagePaths: string[],
  prompt: string
): Promise<T> {
  const imageContents = imagePaths.map((imagePath) => ({
    type: "image_url" as const,
    image_url: {
      url: `data:image/png;base64,${imageToBase64(imagePath)}`,
      detail: "high" as const,
    },
  }));

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...imageContents,
        ],
      },
    ],
    max_completion_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error("No response from AI model");
  }

  try {
    const cleanedContent = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    
    return JSON.parse(cleanedContent) as T;
  } catch (error) {
    console.error("Failed to parse AI response:", content);
    throw new Error("Failed to parse extracted data from document");
  }
}

export async function extractCaregiverFromPdf(
  pdfPath: string
): Promise<ExtractedCaregiverData> {
  let imagePaths: string[] = [];
  
  try {
    imagePaths = await convertPdfToImages(pdfPath);
    
    if (imagePaths.length === 0) {
      throw new Error("No pages could be extracted from the PDF");
    }

    const extractedData = await extractDataFromImages<ExtractedCaregiverData>(
      imagePaths,
      CAREGIVER_EXTRACTION_PROMPT
    );

    return extractedData;
  } finally {
    cleanupTempFiles(imagePaths);
  }
}

export async function extractClientFromPdf(
  pdfPath: string
): Promise<ExtractedClientData> {
  let imagePaths: string[] = [];
  
  try {
    imagePaths = await convertPdfToImages(pdfPath);
    
    if (imagePaths.length === 0) {
      throw new Error("No pages could be extracted from the PDF");
    }

    const extractedData = await extractDataFromImages<ExtractedClientData>(
      imagePaths,
      CLIENT_EXTRACTION_PROMPT
    );

    return extractedData;
  } finally {
    cleanupTempFiles(imagePaths);
  }
}

export async function extractFromImageFile(
  imagePath: string,
  type: "caregiver" | "client"
): Promise<ExtractedCaregiverData | ExtractedClientData> {
  const prompt = type === "caregiver" 
    ? CAREGIVER_EXTRACTION_PROMPT 
    : CLIENT_EXTRACTION_PROMPT;

  if (type === "caregiver") {
    return extractDataFromImages<ExtractedCaregiverData>([imagePath], prompt);
  } else {
    return extractDataFromImages<ExtractedClientData>([imagePath], prompt);
  }
}
