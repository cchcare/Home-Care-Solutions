import { storage } from './storage';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';

interface OigRecord {
  LASTNAME: string;
  FIRSTNAME: string;
  MIDNAME?: string;
  BUSNAME?: string;
  GENERAL?: string;
  SPECIALTY?: string;
  UPIN?: string;
  NPI?: string;
  DOB?: string;
  ADDRESS?: string;
  CITY?: string;
  STATE?: string;
  ZIP?: string;
  EXCLTYPE?: string;
  EXCLDATE?: string;
  REINDATE?: string;
  WESSION?: string;
  WAIESSION?: string;
}

interface SamRecord {
  Name?: string;
  Prefix?: string;
  'First Name'?: string;
  'Middle Name'?: string;
  'Last Name'?: string;
  Suffix?: string;
  Address1?: string;
  Address2?: string;
  City?: string;
  State?: string;
  Zip?: string;
  Country?: string;
  'Exclusion Type'?: string;
  'Exclusion Program'?: string;
  'Excluding Agency'?: string;
  'CT Code'?: string;
  'Exclusion Date'?: string;
  'Termination Date'?: string;
  'Record Status'?: string;
  'Cross-Reference'?: string;
  SAM_Number?: string;
  CAGE_Code?: string;
  NPI?: string;
}

interface MatchResult {
  exclusionRecordId: string;
  matchType: 'exact' | 'fuzzy';
  matchScore: number;
  matchedFirstName: string;
  matchedLastName: string;
  sourceId: string;
}

export class ExclusionService {
  private static instance: ExclusionService;

  private constructor() {}

  static getInstance(): ExclusionService {
    if (!ExclusionService.instance) {
      ExclusionService.instance = new ExclusionService();
    }
    return ExclusionService.instance;
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  private calculateSimilarity(a: string, b: string): number {
    if (!a || !b) return 0;
    const aLower = a.toLowerCase().trim();
    const bLower = b.toLowerCase().trim();
    if (aLower === bLower) return 100;
    const maxLen = Math.max(aLower.length, bLower.length);
    if (maxLen === 0) return 100;
    const distance = this.levenshteinDistance(aLower, bLower);
    return Math.round((1 - distance / maxLen) * 100);
  }

  generateMatchSignature(caregiverId: string, sourceId: string, firstName: string, lastName: string): string {
    return `${caregiverId}:${sourceId}:${firstName.toLowerCase().trim()}:${lastName.toLowerCase().trim()}`;
  }

  async fetchOigData(): Promise<{ success: boolean; recordCount: number; errors: string[] }> {
    const errors: string[] = [];
    let recordCount = 0;

    try {
      console.log('[Exclusion Service] Fetching OIG LEIE data...');
      const oigSource = await storage.getExclusionSourceByType('oig');
      if (!oigSource) {
        throw new Error('OIG exclusion source not found in database');
      }

      const response = await fetch('https://oig.hhs.gov/exclusions/downloadables/UPDATED.csv');
      if (!response.ok) {
        throw new Error(`Failed to fetch OIG data: ${response.status} ${response.statusText}`);
      }

      const csvText = await response.text();
      const records = await this.parseOigCsv(csvText);
      console.log(`[Exclusion Service] Parsed ${records.length} OIG records`);

      await storage.deleteExclusionRecordsBySource(oigSource.id);

      const exclusionRecords = records.map((record) => ({
        sourceId: oigSource.id,
        externalIdentifier: record.NPI || record.UPIN || null,
        firstName: record.FIRSTNAME || null,
        lastName: record.LASTNAME || null,
        middleName: record.MIDNAME || null,
        npi: record.NPI || null,
        upin: record.UPIN || null,
        address: record.ADDRESS || null,
        city: record.CITY || null,
        state: record.STATE || null,
        zipCode: record.ZIP || null,
        exclusionType: record.EXCLTYPE || null,
        exclusionDate: record.EXCLDATE ? this.parseDate(record.EXCLDATE) : null,
        reinstateDate: record.REINDATE ? this.parseDate(record.REINDATE) : null,
        specialty: record.SPECIALTY || null,
        general: record.GENERAL || null,
        rawPayload: record as unknown as Record<string, unknown>,
        isActive: true,
      }));

      recordCount = await storage.createExclusionRecordsBulk(exclusionRecords);

      await storage.updateExclusionSource(oigSource.id, {
        lastFetchedAt: new Date(),
        lastRecordCount: recordCount,
      });

      console.log(`[Exclusion Service] Successfully imported ${recordCount} OIG records`);
    } catch (error: any) {
      console.error('[Exclusion Service] Error fetching OIG data:', error);
      errors.push(error.message);
    }

    return { success: errors.length === 0, recordCount, errors };
  }

  async fetchSamData(): Promise<{ success: boolean; recordCount: number; errors: string[] }> {
    const errors: string[] = [];
    let recordCount = 0;

    try {
      console.log('[Exclusion Service] SAM.gov data requires downloading a large ZIP file.');
      console.log('[Exclusion Service] For production, implement ZIP download from: https://sam.gov/data-services/Exclusions');
      
      const samSource = await storage.getExclusionSourceByType('sam');
      if (samSource) {
        await storage.updateExclusionSource(samSource.id, {
          lastFetchedAt: new Date(),
        });
      }
      
      errors.push('SAM.gov bulk download not implemented - requires ZIP file processing');
    } catch (error: any) {
      console.error('[Exclusion Service] Error with SAM data:', error);
      errors.push(error.message);
    }

    return { success: false, recordCount, errors };
  }

  async fetchMedicheckData(): Promise<{ success: boolean; recordCount: number; errors: string[] }> {
    const errors: string[] = [];
    let recordCount = 0;

    try {
      console.log('[Exclusion Service] PA Medicheck requires manual CSV upload or web scraping.');
      console.log('[Exclusion Service] The PA DHS website does not provide a direct CSV download.');
      
      const medicheckSource = await storage.getExclusionSourceByType('medicheck');
      if (medicheckSource) {
        await storage.updateExclusionSource(medicheckSource.id, {
          lastFetchedAt: new Date(),
        });
      }

      errors.push('Medicheck data requires manual upload - no bulk download available');
    } catch (error: any) {
      console.error('[Exclusion Service] Error with Medicheck data:', error);
      errors.push(error.message);
    }

    return { success: false, recordCount, errors };
  }

  async refreshAllSources(): Promise<{
    oig: { success: boolean; recordCount: number; errors: string[] };
    sam: { success: boolean; recordCount: number; errors: string[] };
    medicheck: { success: boolean; recordCount: number; errors: string[] };
  }> {
    const oig = await this.fetchOigData();
    const sam = await this.fetchSamData();
    const medicheck = await this.fetchMedicheckData();
    return { oig, sam, medicheck };
  }

  async checkCaregiverAgainstExclusions(
    caregiverId: string,
    firstName: string,
    lastName: string,
    dateOfBirth?: Date | null
  ): Promise<MatchResult[]> {
    const matches: MatchResult[] = [];
    
    const falsePositives = await storage.getCaregiverFalsePositives(caregiverId);
    const fpSignatures = new Set(falsePositives.map(fp => fp.matchSignature));

    const exactMatches = await storage.getExclusionRecordsByName(lastName, firstName);
    
    for (const record of exactMatches) {
      const signature = this.generateMatchSignature(
        caregiverId,
        record.sourceId,
        record.firstName || '',
        record.lastName || ''
      );
      
      if (fpSignatures.has(signature)) {
        continue;
      }

      matches.push({
        exclusionRecordId: record.id,
        matchType: 'exact',
        matchScore: 100,
        matchedFirstName: record.firstName || '',
        matchedLastName: record.lastName || '',
        sourceId: record.sourceId,
      });
    }

    const fuzzyMatches = await storage.searchExclusionRecords(lastName, firstName);
    
    for (const record of fuzzyMatches) {
      const alreadyMatched = matches.some(m => m.exclusionRecordId === record.id);
      if (alreadyMatched) continue;

      const signature = this.generateMatchSignature(
        caregiverId,
        record.sourceId,
        record.firstName || '',
        record.lastName || ''
      );
      
      if (fpSignatures.has(signature)) {
        continue;
      }

      const lastNameScore = this.calculateSimilarity(lastName, record.lastName || '');
      const firstNameScore = this.calculateSimilarity(firstName, record.firstName || '');
      const avgScore = (lastNameScore + firstNameScore) / 2;

      if (avgScore >= 80 && avgScore < 100) {
        matches.push({
          exclusionRecordId: record.id,
          matchType: 'fuzzy',
          matchScore: avgScore,
          matchedFirstName: record.firstName || '',
          matchedLastName: record.lastName || '',
          sourceId: record.sourceId,
        });
      }
    }

    return matches;
  }

  async runFullExclusionCheck(userId?: string): Promise<{
    totalCaregivers: number;
    totalClear: number;
    totalPossibleMatches: number;
    newMatches: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let totalCaregivers = 0;
    let totalClear = 0;
    let totalPossibleMatches = 0;
    let newMatches = 0;

    try {
      console.log('[Exclusion Service] Starting full exclusion check...');
      
      const caregivers = await storage.getActiveCaregiversForExclusionCheck();
      totalCaregivers = caregivers.length;
      console.log(`[Exclusion Service] Checking ${totalCaregivers} active caregivers`);

      const sources = await storage.getExclusionSources();

      for (const caregiver of caregivers) {
        try {
          const matches = await this.checkCaregiverAgainstExclusions(
            caregiver.id,
            caregiver.firstName,
            caregiver.lastName,
            caregiver.dateOfBirth
          );

          if (matches.length === 0) {
            totalClear++;
            for (const source of sources) {
              await storage.createCaregiverExclusionCheck({
                caregiverId: caregiver.id,
                sourceId: source.id,
                status: 'clear',
                checkedAt: new Date(),
                autoFlag: true,
              });
            }
          } else {
            totalPossibleMatches++;
            for (const match of matches) {
              const existing = await storage.getLatestCaregiverExclusionCheck(
                caregiver.id,
                match.sourceId
              );
              
              if (!existing || existing.exclusionRecordId !== match.exclusionRecordId) {
                newMatches++;
              }

              await storage.createCaregiverExclusionCheck({
                caregiverId: caregiver.id,
                sourceId: match.sourceId,
                exclusionRecordId: match.exclusionRecordId,
                status: 'possible_match',
                matchType: match.matchType,
                matchScore: match.matchScore.toString(),
                matchedFirstName: match.matchedFirstName,
                matchedLastName: match.matchedLastName,
                checkedAt: new Date(),
                autoFlag: true,
              });
            }
          }
        } catch (error: any) {
          errors.push(`Error checking caregiver ${caregiver.id}: ${error.message}`);
        }
      }

      console.log(`[Exclusion Service] Exclusion check complete: ${totalClear} clear, ${totalPossibleMatches} possible matches`);
    } catch (error: any) {
      console.error('[Exclusion Service] Error during full exclusion check:', error);
      errors.push(error.message);
    }

    return {
      totalCaregivers,
      totalClear,
      totalPossibleMatches,
      newMatches,
      errors,
    };
  }

  async generateMonthlyReport(userId?: string): Promise<{
    success: boolean;
    reportId?: string;
    errors: string[];
  }> {
    const errors: string[] = [];
    let reportId: string | undefined;

    try {
      console.log('[Exclusion Service] Generating monthly exclusion report...');
      
      const now = new Date();
      const reportMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const existingReport = await storage.getExclusionReportByMonth(reportMonth);
      if (existingReport) {
        console.log('[Exclusion Service] Report for this month already exists');
        return { success: true, reportId: existingReport.id, errors: [] };
      }

      const sources = await storage.getExclusionSources();
      const oigSource = sources.find(s => s.type === 'oig');
      const medicheckSource = sources.find(s => s.type === 'medicheck');
      const samSource = sources.find(s => s.type === 'sam');

      const caregivers = await storage.getActiveCaregiversForExclusionCheck();
      const allChecks = await storage.getCaregiverExclusionChecks();
      
      const clearChecks = allChecks.filter(c => c.status === 'clear');
      const possibleMatches = allChecks.filter(c => c.status === 'possible_match');
      const confirmedExcluded = allChecks.filter(c => c.status === 'confirmed_excluded');
      const falsePositives = allChecks.filter(c => c.status === 'false_positive');

      const oigCount = await storage.getExclusionRecordsCount(oigSource?.id);
      const medicheckCount = await storage.getExclusionRecordsCount(medicheckSource?.id);
      const samCount = await storage.getExclusionRecordsCount(samSource?.id);

      const reportData = {
        generatedAt: now.toISOString(),
        caregiverDetails: caregivers.map(c => ({
          id: c.id,
          name: `${c.firstName} ${c.lastName}`,
        })),
        matchDetails: possibleMatches.map(m => ({
          caregiverId: m.caregiverId,
          sourceId: m.sourceId,
          matchScore: m.matchScore,
          matchType: m.matchType,
        })),
      };

      const report = await storage.createExclusionReport({
        reportMonth,
        totalCaregiversChecked: caregivers.length,
        totalClear: clearChecks.length,
        totalPossibleMatches: possibleMatches.length,
        totalConfirmedExcluded: confirmedExcluded.length,
        totalFalsePositives: falsePositives.length,
        oigRecordsCount: oigCount,
        medicheckRecordsCount: medicheckCount,
        samRecordsCount: samCount,
        reportData,
        generatedBy: userId || null,
      });

      reportId = report.id;
      console.log(`[Exclusion Service] Generated monthly report: ${reportId}`);
    } catch (error: any) {
      console.error('[Exclusion Service] Error generating report:', error);
      errors.push(error.message);
    }

    return { success: errors.length === 0, reportId, errors };
  }

  private async parseOigCsv(csvText: string): Promise<OigRecord[]> {
    return new Promise((resolve, reject) => {
      const records: OigRecord[] = [];
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });

      parser.on('readable', () => {
        let record;
        while ((record = parser.read()) !== null) {
          records.push(record as OigRecord);
        }
      });

      parser.on('error', (err) => {
        reject(err);
      });

      parser.on('end', () => {
        resolve(records);
      });

      const stream = Readable.from(csvText);
      stream.pipe(parser);
    });
  }

  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    try {
      const cleaned = dateStr.replace(/[^0-9\/\-]/g, '');
      const date = new Date(cleaned);
      if (isNaN(date.getTime())) return null;
      return date;
    } catch {
      return null;
    }
  }

  async importMedicheckCsv(csvContent: string): Promise<{ success: boolean; recordCount: number; errors: string[] }> {
    const errors: string[] = [];
    let recordCount = 0;

    try {
      console.log('[Exclusion Service] Importing Medicheck CSV data...');
      const medicheckSource = await storage.getExclusionSourceByType('medicheck');
      if (!medicheckSource) {
        throw new Error('Medicheck exclusion source not found in database');
      }

      const records = await this.parseMedicheckCsv(csvContent);
      console.log(`[Exclusion Service] Parsed ${records.length} Medicheck records`);

      await storage.deleteExclusionRecordsBySource(medicheckSource.id);

      const exclusionRecords = records.map((record: any) => ({
        sourceId: medicheckSource.id,
        firstName: record.FirstName || record.FIRSTNAME || record['First Name'] || null,
        lastName: record.LastName || record.LASTNAME || record['Last Name'] || null,
        middleName: record.MiddleName || record.MIDNAME || record['Middle Name'] || null,
        npi: record.NPI || null,
        address: record.Address || record.ADDRESS || null,
        city: record.City || record.CITY || null,
        state: record.State || record.STATE || 'PA',
        zipCode: record.Zip || record.ZIP || null,
        exclusionType: record.ExclusionType || record.Type || null,
        exclusionDate: record.ExclusionDate ? this.parseDate(record.ExclusionDate) : null,
        rawPayload: record as unknown as Record<string, unknown>,
        isActive: true,
      }));

      recordCount = await storage.createExclusionRecordsBulk(exclusionRecords);

      await storage.updateExclusionSource(medicheckSource.id, {
        lastFetchedAt: new Date(),
        lastRecordCount: recordCount,
      });

      console.log(`[Exclusion Service] Successfully imported ${recordCount} Medicheck records`);
    } catch (error: any) {
      console.error('[Exclusion Service] Error importing Medicheck CSV:', error);
      errors.push(error.message);
    }

    return { success: errors.length === 0, recordCount, errors };
  }

  async importSamCsv(csvContent: string): Promise<{ success: boolean; recordCount: number; errors: string[] }> {
    const errors: string[] = [];
    let recordCount = 0;

    try {
      console.log('[Exclusion Service] Importing SAM.gov CSV data...');
      const samSource = await storage.getExclusionSourceByType('sam');
      if (!samSource) {
        throw new Error('SAM exclusion source not found in database');
      }

      const records = await this.parseSamCsv(csvContent);
      console.log(`[Exclusion Service] Parsed ${records.length} SAM records`);

      await storage.deleteExclusionRecordsBySource(samSource.id);

      const exclusionRecords = records.map((record: SamRecord) => ({
        sourceId: samSource.id,
        externalIdentifier: record.SAM_Number || record.CAGE_Code || null,
        firstName: record['First Name'] || null,
        lastName: record['Last Name'] || null,
        middleName: record['Middle Name'] || null,
        npi: record.NPI || null,
        address: record.Address1 || null,
        city: record.City || null,
        state: record.State || null,
        zipCode: record.Zip || null,
        exclusionType: record['Exclusion Type'] || null,
        exclusionDate: record['Exclusion Date'] ? this.parseDate(record['Exclusion Date']) : null,
        reinstateDate: record['Termination Date'] ? this.parseDate(record['Termination Date']) : null,
        rawPayload: record as unknown as Record<string, unknown>,
        isActive: true,
      }));

      recordCount = await storage.createExclusionRecordsBulk(exclusionRecords);

      await storage.updateExclusionSource(samSource.id, {
        lastFetchedAt: new Date(),
        lastRecordCount: recordCount,
      });

      console.log(`[Exclusion Service] Successfully imported ${recordCount} SAM records`);
    } catch (error: any) {
      console.error('[Exclusion Service] Error importing SAM CSV:', error);
      errors.push(error.message);
    }

    return { success: errors.length === 0, recordCount, errors };
  }

  private async parseMedicheckCsv(csvText: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const records: any[] = [];
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });

      parser.on('readable', () => {
        let record;
        while ((record = parser.read()) !== null) {
          records.push(record);
        }
      });

      parser.on('error', (err) => reject(err));
      parser.on('end', () => resolve(records));

      const stream = Readable.from(csvText);
      stream.pipe(parser);
    });
  }

  private async parseSamCsv(csvText: string): Promise<SamRecord[]> {
    return new Promise((resolve, reject) => {
      const records: SamRecord[] = [];
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });

      parser.on('readable', () => {
        let record;
        while ((record = parser.read()) !== null) {
          records.push(record as SamRecord);
        }
      });

      parser.on('error', (err) => reject(err));
      parser.on('end', () => resolve(records));

      const stream = Readable.from(csvText);
      stream.pipe(parser);
    });
  }
}

export const exclusionService = ExclusionService.getInstance();
