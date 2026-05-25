import Client from 'ssh2-sftp-client';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { storage } from './storage';

interface HhaxSftpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  taxId: string;
}

export interface HhaxSyncResult {
  success: boolean;
  recordsTotal: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
  errors: string[];
  fileName?: string | null;
  /** Headers we did not recognize (forwarded so the UI can warn/help). */
  unrecognizedHeaders?: string[];
  /** True when no DB writes happened (validation/dry-run mode). */
  dryRun?: boolean;
  /** Result of the post-import /Outbox cleanup, if any was performed. */
  cleanup?: OutboxCleanupAction;
  /** Result of the post-import sweep of aged files, if retention is configured. */
  cleanupSweep?: OutboxCleanupSummary;
}

export interface OutboxFile {
  name: string;
  size: number;
  modifyTime: Date;
}

export type OutboxCleanupMode = 'off' | 'archive' | 'delete';

export interface OutboxCleanupConfig {
  mode: OutboxCleanupMode;
  archiveDir: string;
  deleteAfterDays: number;
}

export interface OutboxCleanupAction {
  fileName: string;
  action: 'archived' | 'deleted' | 'retained' | 'skipped';
  destination?: string;
  error?: string;
}

export interface OutboxCleanupSummary {
  mode: OutboxCleanupMode;
  archived: OutboxCleanupAction[];
  deleted: OutboxCleanupAction[];
  retained: OutboxCleanupAction[];
  errors: OutboxCleanupAction[];
}

/**
 * Cleanup behavior is opt-in via env vars. Defaults to 'off' so existing
 * deployments are unaffected.
 *
 *   HHAX_OUTBOX_CLEANUP            'off' | 'archive' | 'delete'  (default 'off')
 *   HHAX_OUTBOX_ARCHIVE_DIR        remote path                    (default '/Archive')
 *   HHAX_OUTBOX_DELETE_AFTER_DAYS  integer N >= 0                 (default 0)
 *       - In 'delete' mode, files newer than N days are kept; older files are
 *         deleted. N=0 means delete immediately after a successful import.
 *       - In 'archive' mode, the just-imported file is always moved.
 */
export function getOutboxCleanupConfig(): OutboxCleanupConfig {
  const raw = (process.env.HHAX_OUTBOX_CLEANUP || 'off').toLowerCase().trim();
  const mode: OutboxCleanupMode =
    raw === 'archive' || raw === 'delete' ? raw : 'off';
  const archiveDir = (process.env.HHAX_OUTBOX_ARCHIVE_DIR || '/Archive').replace(/\/+$/, '') || '/Archive';
  const daysRaw = parseInt(process.env.HHAX_OUTBOX_DELETE_AFTER_DAYS || '0', 10);
  const deleteAfterDays = Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : 0;
  return { mode, archiveDir, deleteAfterDays };
}

/**
 * HHAX exports use PascalCase column headers in their canonical docs, but the
 * actual files we have seen vary (snake_case, spaces, lowercase, etc). The
 * importer normalizes every header to a canonical key by stripping non-alnum
 * characters and lowercasing — and then matches against the alias maps below.
 */
export const CAREGIVER_HEADER_ALIASES: Record<string, string[]> = {
  CaregiverCode: ['caregivercode', 'caregiverid', 'caregiver', 'employeeid', 'employeecode', 'externalid'],
  FirstName: ['firstname', 'first', 'givenname'],
  LastName: ['lastname', 'last', 'surname', 'familyname'],
  SSN: ['ssn', 'socialsecuritynumber'],
  DateOfBirth: ['dateofbirth', 'dob', 'birthdate'],
  Gender: ['gender', 'sex'],
  Address1: ['address1', 'address', 'addressline1', 'street', 'street1'],
  Address2: ['address2', 'addressline2', 'street2', 'apt', 'unit'],
  City: ['city', 'town'],
  State: ['state', 'stateprovince', 'region'],
  Zip: ['zip', 'zipcode', 'postalcode', 'postal'],
  Phone: ['phone', 'phonenumber', 'homephone', 'mobile', 'cellphone'],
  Email: ['email', 'emailaddress'],
  Disciplines: ['disciplines', 'discipline', 'certifications', 'certification', 'certs'],
  Languages: ['languages', 'language'],
  HireDate: ['hiredate', 'starteddate', 'startdate'],
  TerminationDate: ['terminationdate', 'termdate', 'enddate'],
  // NOTE: Do NOT include 'state' here — it collides with the State (address)
  // alias above and would silently overwrite address.state during import.
  Status: ['status', 'employmentstatus', 'caregiverstatus', 'workstatus'],
  Branch: ['branch', 'office', 'officebranch', 'location', 'site'],
};

export const PATIENT_HEADER_ALIASES: Record<string, string[]> = {
  PatientCode: ['patientcode', 'patientid', 'memberid', 'clientcode', 'clientid'],
  AdmissionID: ['admissionid', 'admission', 'admissionnumber', 'admissionno', 'admit', 'admitid'],
  FirstName: ['firstname', 'first', 'givenname'],
  LastName: ['lastname', 'last', 'surname', 'familyname'],
  DateOfBirth: ['dateofbirth', 'dob', 'birthdate'],
  Gender: ['gender', 'sex'],
  Address1: ['address1', 'address', 'addressline1', 'street', 'street1'],
  Address2: ['address2', 'addressline2', 'street2', 'apt', 'unit'],
  City: ['city', 'town'],
  State: ['state', 'stateprovince', 'region'],
  Zip: ['zip', 'zipcode', 'postalcode', 'postal'],
  Phone: ['phone', 'phonenumber', 'homephone', 'mobile', 'cellphone'],
  Email: ['email', 'emailaddress'],
  MedicaidID: ['medicaidid', 'medicaid', 'medicaidnumber'],
  MedicareID: ['medicareid', 'medicare', 'medicarenumber'],
  EmergencyContactName: ['emergencycontactname', 'emergencycontact', 'eccontactname', 'ecname'],
  EmergencyContactPhone: ['emergencycontactphone', 'ecphone', 'emergencyphone'],
  EmergencyContactRelation: ['emergencycontactrelation', 'emergencycontactrelationship', 'ecrelation', 'ecrelationship'],
  PrimaryDiagnosis: ['primarydiagnosis', 'diagnosis', 'dx', 'icd', 'primarydx'],
  Status: ['status', 'patientstatus', 'admissionstatus'],
  Branch: ['branch', 'office', 'officebranch', 'location', 'site'],
  CoordinatorName: ['coordinatorname', 'coordinator', 'coordinatorfullname'],
  ServiceStartDate: ['servicestartdate', 'sostartdate', 'startofcare', 'soc'],
};

export const SCHEDULE_HEADER_ALIASES: Record<string, string[]> = {
  ScheduleID: ['scheduleid', 'visitid', 'shiftid', 'visitnumber', 'scheduleno', 'visitno'],
  PatientCode: ['patientcode', 'patientid', 'memberid', 'clientcode', 'clientid'],
  CaregiverCode: ['caregivercode', 'caregiverid', 'caregiver', 'employeeid', 'employeecode'],
  AdmissionID: ['admissionid', 'admission', 'admissionnumber', 'admissionno', 'admit', 'admitid'],
  ServiceCode: ['servicecode', 'service', 'visittype', 'shifttype'],
  ScheduleDate: ['scheduledate', 'visitdate', 'date', 'shiftdate', 'serviceday'],
  StartTime: ['starttime', 'visitstart', 'shiftstart', 'scheduledstart'],
  EndTime: ['endtime', 'visitend', 'shiftend', 'scheduledend'],
  Status: ['status', 'visitstatus', 'shiftstatus', 'schedulestatus'],
  Branch: ['branch', 'office', 'officebranch', 'location', 'site'],
};

/**
 * Filename matchers. We match case-insensitively on the bare filename and
 * accept several common aliases — HHAX customers configure their own export
 * names and they are not always "Caregiver_*.csv".
 */
export const FILE_KIND_ALIASES: Record<'caregiver' | 'patient' | 'schedule', string[]> = {
  caregiver: ['caregiver', 'aide', 'employee', 'staff', 'worker'],
  patient: ['patient', 'client', 'member', 'admission'],
  schedule: ['schedule', 'visit', 'shift', 'authorization', 'plan'],
};

export function canonicalizeHeader(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function pickFileForKind(
  files: OutboxFile[],
  kind: 'caregiver' | 'patient' | 'schedule',
): OutboxFile | null {
  const aliases = FILE_KIND_ALIASES[kind];
  const matches = files.filter((f) => {
    const lower = f.name.toLowerCase();
    return aliases.some((a) => lower.includes(a));
  });
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.modifyTime.getTime() - a.modifyTime.getTime());
  return matches[0];
}

export function normalizeRecord<T extends Record<string, any>>(
  raw: Record<string, unknown>,
  aliasMap: Record<string, string[]>,
): { normalized: T; unknownHeaders: string[] } {
  // Build lookup: canonical alias -> canonical field name.
  const lookup = new Map<string, string>();
  for (const [field, aliases] of Object.entries(aliasMap)) {
    lookup.set(canonicalizeHeader(field), field);
    for (const alias of aliases) lookup.set(canonicalizeHeader(alias), field);
  }
  const normalized: Record<string, any> = {};
  const unknown: string[] = [];
  for (const [key, value] of Object.entries(raw)) {
    if (key == null || key === '') continue;
    const canonical = lookup.get(canonicalizeHeader(key));
    const stringValue =
      typeof value === 'string'
        ? value.trim()
        : value == null
          ? ''
          : String(value).trim();
    if (canonical) {
      // Last writer wins; only overwrite if non-empty.
      if (stringValue || normalized[canonical] == null) {
        normalized[canonical] = stringValue;
      }
    } else {
      unknown.push(key);
    }
  }
  return { normalized: normalized as T, unknownHeaders: unknown };
}

interface HhaxCaregiverRecord {
  CaregiverCode: string;
  FirstName: string;
  LastName: string;
  SSN?: string;
  DateOfBirth?: string;
  Gender?: string;
  Address1?: string;
  Address2?: string;
  City?: string;
  State?: string;
  Zip?: string;
  Phone?: string;
  Email?: string;
  Disciplines?: string;
  Languages?: string;
  HireDate?: string;
  TerminationDate?: string;
  Status?: string;
  Branch?: string;
}

interface HhaxPatientRecord {
  PatientCode: string;
  AdmissionID?: string;
  FirstName: string;
  LastName: string;
  DateOfBirth?: string;
  Gender?: string;
  Address1?: string;
  Address2?: string;
  City?: string;
  State?: string;
  Zip?: string;
  Phone?: string;
  Email?: string;
  MedicaidID?: string;
  MedicareID?: string;
  EmergencyContactName?: string;
  EmergencyContactPhone?: string;
  EmergencyContactRelation?: string;
  PrimaryDiagnosis?: string;
  Status?: string;
  Branch?: string;
  CoordinatorName?: string;
  ServiceStartDate?: string;
}

interface HhaxScheduleRecord {
  ScheduleID: string;
  PatientCode: string;
  CaregiverCode: string;
  AdmissionID?: string;
  ServiceCode?: string;
  ScheduleDate: string;
  StartTime: string;
  EndTime: string;
  Status?: string;
  Branch?: string;
}

const getConfig = (): HhaxSftpConfig => {
  const host = process.env.HHAX_SFTP_HOST;
  const port = parseInt(process.env.HHAX_SFTP_PORT || '2222');
  const username = process.env.HHAX_SFTP_USERNAME;
  const password = process.env.HHAX_SFTP_PASSWORD;
  const taxId = process.env.HHAX_TAX_ID;

  if (!host || !username || !password || !taxId) {
    throw new Error('HHAX SFTP credentials not configured');
  }

  return { host: host.replace('http://', '').replace('https://', '').replace('/', ''), port, username, password, taxId };
};

function parseDateSafe(value: string | undefined | null): Date | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return null;
  return d;
}

function emptyResult(): HhaxSyncResult {
  return {
    success: true,
    recordsTotal: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    recordsSkipped: 0,
    recordsFailed: 0,
    errors: [],
  };
}

export class HhaxSftpService {
  private sftp: Client | null = null;
  private config: HhaxSftpConfig;
  private officeMapping: Map<string, string> = new Map();

  constructor() {
    this.config = getConfig();
  }

  async connect(): Promise<void> {
    this.sftp = new Client();
    await this.sftp.connect({
      host: this.config.host,
      port: this.config.port,
      username: this.config.username,
      password: this.config.password,
    });
    console.log('[HHAX SFTP] Connected successfully');
  }

  async disconnect(): Promise<void> {
    if (this.sftp) {
      try {
        await this.sftp.end();
      } catch (err) {
        console.warn('[HHAX SFTP] Error during disconnect (ignored):', err);
      }
      this.sftp = null;
      console.log('[HHAX SFTP] Disconnected');
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string; directories?: string[] }> {
    try {
      await this.connect();
      const list = await this.sftp!.list('/');
      const directories = list.map((item: { name: string }) => item.name);
      await this.disconnect();
      return { success: true, message: 'Connection successful', directories };
    } catch (error: any) {
      console.error('[HHAX SFTP] Connection test failed:', error);
      try { await this.disconnect(); } catch { /* noop */ }
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  async listOutboxFiles(): Promise<OutboxFile[]> {
    try {
      if (!this.sftp) await this.connect();
      const files = await this.sftp!.list('/Outbox');
      return files
        .filter((f: { type: string; name: string }) => f.type === '-' && /\.csv$/i.test(f.name))
        .map((f: { name: string; size: number; modifyTime: number }) => ({
          name: f.name,
          size: f.size,
          modifyTime: new Date(f.modifyTime),
        }));
    } catch (error) {
      console.error('[HHAX SFTP] Error listing Outbox files:', error);
      return [];
    }
  }

  async downloadFile(remotePath: string): Promise<Buffer> {
    if (!this.sftp) await this.connect();
    const buffer = await this.sftp!.get(remotePath);
    return buffer as Buffer;
  }

  private async ensureRemoteDir(dir: string): Promise<void> {
    if (!this.sftp) await this.connect();
    try {
      const existsType = await this.sftp!.exists(dir);
      if (existsType) return;
      await this.sftp!.mkdir(dir, true);
    } catch (err: any) {
      // Bubble up so callers can record the cleanup failure rather than
      // silently leaving files in /Outbox.
      throw new Error(`Could not ensure remote dir ${dir}: ${err?.message || err}`);
    }
  }

  /**
   * Clean up a single just-imported file in /Outbox according to env config.
   * Safe to call when cleanup is off (returns 'skipped' with no error).
   */
  async cleanupOutboxFile(fileName: string): Promise<OutboxCleanupAction> {
    const cfg = getOutboxCleanupConfig();
    if (cfg.mode === 'off') return { fileName, action: 'skipped' };
    if (!this.sftp) await this.connect();
    const src = `/Outbox/${fileName}`;
    try {
      if (cfg.mode === 'archive') {
        await this.ensureRemoteDir(cfg.archiveDir);
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const dest = `${cfg.archiveDir}/${ts}_${fileName}`;
        await this.sftp!.rename(src, dest);
        console.log(`[HHAX SFTP] Archived ${src} -> ${dest}`);
        return { fileName, action: 'archived', destination: dest };
      }
      if (cfg.mode === 'delete') {
        if (cfg.deleteAfterDays > 0) {
          try {
            const stat = await this.sftp!.stat(src);
            const ageMs = Date.now() - Number(stat.modifyTime);
            if (ageMs < cfg.deleteAfterDays * 86_400_000) {
              return { fileName, action: 'retained' };
            }
          } catch (err: any) {
            return { fileName, action: 'skipped', error: err?.message || String(err) };
          }
        }
        await this.sftp!.delete(src);
        console.log(`[HHAX SFTP] Deleted ${src}`);
        return { fileName, action: 'deleted' };
      }
      return { fileName, action: 'skipped' };
    } catch (err: any) {
      console.warn(`[HHAX SFTP] Cleanup of ${src} failed:`, err?.message || err);
      return { fileName, action: 'skipped', error: err?.message || String(err) };
    }
  }

  /**
   * Sweep every file currently in /Outbox, applying the configured cleanup
   * policy. Used by the manual "Clean up now" button and at the end of a
   * full sync to catch stragglers from prior runs.
   */
  async sweepOutbox(): Promise<OutboxCleanupSummary> {
    const cfg = getOutboxCleanupConfig();
    const summary: OutboxCleanupSummary = {
      mode: cfg.mode,
      archived: [],
      deleted: [],
      retained: [],
      errors: [],
    };
    if (cfg.mode === 'off') return summary;
    let ownedConnection = false;
    try {
      if (!this.sftp) { await this.connect(); ownedConnection = true; }
      const files = await this.listOutboxFiles();
      for (const f of files) {
        const action = await this.cleanupOutboxFile(f.name);
        if (action.action === 'archived') summary.archived.push(action);
        else if (action.action === 'deleted') summary.deleted.push(action);
        else if (action.action === 'retained') summary.retained.push(action);
        if (action.error) summary.errors.push(action);
      }
    } finally {
      if (ownedConnection) {
        try { await this.disconnect(); } catch { /* noop */ }
      }
    }
    return summary;
  }

  private async parseCsvRaw(content: Buffer): Promise<Record<string, unknown>[]> {
    return new Promise((resolve, reject) => {
      const records: Record<string, unknown>[] = [];
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_column_count: true,
      });

      parser.on('readable', () => {
        let record;
        while ((record = parser.read()) !== null) {
          records.push(record);
        }
      });

      parser.on('error', reject);
      parser.on('end', () => resolve(records));

      const stream = Readable.from(content);
      stream.pipe(parser);
    });
  }

  async loadOfficeMappings(): Promise<void> {
    const mappings = await storage.getHhaxOfficeMappings();
    this.officeMapping.clear();
    for (const mapping of mappings) {
      this.officeMapping.set(mapping.hhaxOfficeName.toLowerCase().trim(), mapping.officeId);
      if (mapping.hhaxOfficeCode) {
        this.officeMapping.set(mapping.hhaxOfficeCode.toLowerCase().trim(), mapping.officeId);
      }
    }
  }

  private getOfficeIdFromName(officeName?: string): string | null {
    if (!officeName) return null;
    return this.officeMapping.get(officeName.toLowerCase().trim()) || null;
  }

  private mapGender(hhaxGender?: string): 'male' | 'female' | 'non_binary' | 'prefer_not_to_say' | null {
    if (!hhaxGender) return null;
    const g = hhaxGender.toLowerCase().trim();
    if (g === 'm' || g === 'male') return 'male';
    if (g === 'f' || g === 'female') return 'female';
    return 'prefer_not_to_say';
  }

  /** Find a client by either AdmissionID or PatientCode (in that order). */
  private async findClient(
    admissionId: string | undefined,
    patientCode: string | undefined,
  ) {
    if (admissionId) {
      const byAdmission = await storage.getClientByHhaxAdmissionId(admissionId);
      if (byAdmission) return byAdmission;
    }
    if (patientCode) {
      const byPatient = await storage.getClientByHhaxPatientCode(patientCode);
      if (byPatient) return byPatient;
      // Fall back: in older imports PatientCode was stored as admissionId.
      const byPatientAsAdmission = await storage.getClientByHhaxAdmissionId(patientCode);
      if (byPatientAsAdmission) return byPatientAsAdmission;
    }
    return undefined;
  }

  // ==================== IMPORTERS ====================

  /**
   * Import caregivers. Provide `buffer` to import from an uploaded file
   * (used by the Validate Sample File flow). Otherwise the most recent
   * caregiver-like file in /Outbox is used.
   */
  async importCaregivers(opts: {
    fileName?: string;
    buffer?: Buffer;
    fallbackOfficeId?: string;
    dryRun?: boolean;
  } = {}): Promise<HhaxSyncResult> {
    const result = emptyResult();
    if (opts.dryRun) result.dryRun = true;

    try {
      await this.loadOfficeMappings();

      let content: Buffer;
      let resolvedFileName: string | null;

      if (opts.buffer) {
        content = opts.buffer;
        resolvedFileName = opts.fileName || 'uploaded sample';
      } else {
        if (!this.sftp) await this.connect();
        let fileToProcess = opts.fileName;
        if (!fileToProcess) {
          const files = await this.listOutboxFiles();
          const picked = pickFileForKind(files, 'caregiver');
          if (!picked) {
            result.success = false;
            result.errors.push(
              `No caregiver export file found in /Outbox. Looked for filenames containing any of: ${FILE_KIND_ALIASES.caregiver.join(', ')}. Available files: ${files.map((f) => f.name).join(', ') || '(none)'}`,
            );
            return result;
          }
          fileToProcess = picked.name;
        }
        resolvedFileName = fileToProcess;
        content = await this.downloadFile(`/Outbox/${fileToProcess}`);
      }
      result.fileName = resolvedFileName;

      const rawRecords = await this.parseCsvRaw(content);
      result.recordsTotal = rawRecords.length;
      const allUnknown = new Set<string>();

      for (const raw of rawRecords) {
        try {
          const { normalized: record, unknownHeaders } = normalizeRecord<HhaxCaregiverRecord>(
            raw,
            CAREGIVER_HEADER_ALIASES,
          );
          for (const h of unknownHeaders) allUnknown.add(h);

          if (!record.CaregiverCode) {
            result.recordsSkipped++;
            continue;
          }

          const officeId = this.getOfficeIdFromName(record.Branch) || opts.fallbackOfficeId || null;
          const existingCaregiver = await storage.getCaregiverByHhaxCode(record.CaregiverCode);

          const caregiverData = {
            hhaxCaregiverCode: record.CaregiverCode,
            firstName: record.FirstName || '',
            lastName: record.LastName || '',
            gender: this.mapGender(record.Gender),
            address: record.Address1 || null,
            address2: record.Address2 || null,
            city: record.City || null,
            state: record.State || null,
            zipCode: record.Zip || null,
            phone: record.Phone || null,
            email: record.Email || null,
            hireDate: parseDateSafe(record.HireDate),
            startDate: parseDateSafe(record.HireDate),
            terminationDate: parseDateSafe(record.TerminationDate),
            status: record.Status?.toLowerCase().trim() === 'active' ? 'active' : 'inactive',
            officeId: officeId || null,
            languages: record.Languages ? record.Languages.split('|').map((s) => s.trim()).filter(Boolean) : null,
            certifications: record.Disciplines
              ? record.Disciplines.split('|').map((s) => s.trim()).filter(Boolean)
              : null,
          };

          if (opts.dryRun) {
            if (existingCaregiver) result.recordsUpdated++;
            else result.recordsCreated++;
            continue;
          }

          if (existingCaregiver) {
            await storage.updateCaregiver(existingCaregiver.id, caregiverData);
            result.recordsUpdated++;
          } else {
            await storage.createCaregiver(caregiverData as any);
            result.recordsCreated++;
          }
        } catch (error: any) {
          result.recordsFailed++;
          const code = (raw as any).CaregiverCode || (raw as any).CaregiverID || '(unknown)';
          result.errors.push(`Caregiver ${code}: ${error.message}`);
        }
      }

      if (allUnknown.size > 0) {
        result.unrecognizedHeaders = Array.from(allUnknown);
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    await this.maybeCleanupAfterImport(opts, result);
    return result;
  }

  async importClients(opts: {
    fileName?: string;
    buffer?: Buffer;
    fallbackOfficeId?: string;
    dryRun?: boolean;
  } = {}): Promise<HhaxSyncResult> {
    const result = emptyResult();
    if (opts.dryRun) result.dryRun = true;

    try {
      await this.loadOfficeMappings();

      let content: Buffer;
      let resolvedFileName: string | null;

      if (opts.buffer) {
        content = opts.buffer;
        resolvedFileName = opts.fileName || 'uploaded sample';
      } else {
        if (!this.sftp) await this.connect();
        let fileToProcess = opts.fileName;
        if (!fileToProcess) {
          const files = await this.listOutboxFiles();
          const picked = pickFileForKind(files, 'patient');
          if (!picked) {
            result.success = false;
            result.errors.push(
              `No patient/client export file found in /Outbox. Looked for filenames containing any of: ${FILE_KIND_ALIASES.patient.join(', ')}. Available files: ${files.map((f) => f.name).join(', ') || '(none)'}`,
            );
            return result;
          }
          fileToProcess = picked.name;
        }
        resolvedFileName = fileToProcess;
        content = await this.downloadFile(`/Outbox/${fileToProcess}`);
      }
      result.fileName = resolvedFileName;

      const rawRecords = await this.parseCsvRaw(content);
      result.recordsTotal = rawRecords.length;
      const allUnknown = new Set<string>();

      for (const raw of rawRecords) {
        try {
          const { normalized: record, unknownHeaders } = normalizeRecord<HhaxPatientRecord>(
            raw,
            PATIENT_HEADER_ALIASES,
          );
          for (const h of unknownHeaders) allUnknown.add(h);

          const admissionId = record.AdmissionID || record.PatientCode;
          if (!admissionId) {
            result.recordsSkipped++;
            continue;
          }

          const officeId = this.getOfficeIdFromName(record.Branch) || opts.fallbackOfficeId || null;
          // Prefer an existing match by either AdmissionID or PatientCode
          // so a re-import doesn't create duplicates.
          const existingClient = await this.findClient(record.AdmissionID, record.PatientCode);

          const clientData = {
            hhaxAdmissionId: admissionId,
            hhaxPatientCode: record.PatientCode || null,
            firstName: record.FirstName || '',
            lastName: record.LastName || '',
            dateOfBirth: parseDateSafe(record.DateOfBirth),
            phone: record.Phone || null,
            email: record.Email || null,
            address: record.Address1 || null,
            address2: record.Address2 || null,
            city: record.City || null,
            state: record.State || null,
            zipCode: record.Zip || null,
            memberId: record.MedicaidID || null,
            emergencyContactName: record.EmergencyContactName || null,
            emergencyContactPhone: record.EmergencyContactPhone || null,
            emergencyContactRelation: record.EmergencyContactRelation || null,
            primaryDiagnosis: record.PrimaryDiagnosis || null,
            status: record.Status?.toLowerCase().trim() === 'active' ? 'active' : 'inactive',
            officeId: officeId || null,
            serviceStartDate: parseDateSafe(record.ServiceStartDate),
          };

          if (opts.dryRun) {
            if (existingClient) result.recordsUpdated++;
            else result.recordsCreated++;
            continue;
          }

          if (existingClient) {
            await storage.updateClient(existingClient.id, clientData);
            result.recordsUpdated++;
          } else {
            await storage.createClient(clientData as any);
            result.recordsCreated++;
          }
        } catch (error: any) {
          result.recordsFailed++;
          const code = (raw as any).PatientCode || (raw as any).AdmissionID || '(unknown)';
          result.errors.push(`Client ${code}: ${error.message}`);
        }
      }

      if (allUnknown.size > 0) {
        result.unrecognizedHeaders = Array.from(allUnknown);
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    await this.maybeCleanupAfterImport(opts, result);
    return result;
  }

  async importSchedules(opts: {
    fileName?: string;
    buffer?: Buffer;
    fallbackOfficeId?: string;
    dryRun?: boolean;
  } = {}): Promise<HhaxSyncResult> {
    const result = emptyResult();
    if (opts.dryRun) result.dryRun = true;

    try {
      await this.loadOfficeMappings();

      let content: Buffer;
      let resolvedFileName: string | null;

      if (opts.buffer) {
        content = opts.buffer;
        resolvedFileName = opts.fileName || 'uploaded sample';
      } else {
        if (!this.sftp) await this.connect();
        let fileToProcess = opts.fileName;
        if (!fileToProcess) {
          const files = await this.listOutboxFiles();
          const picked = pickFileForKind(files, 'schedule');
          if (!picked) {
            result.success = false;
            result.errors.push(
              `No schedule export file found in /Outbox. Looked for filenames containing any of: ${FILE_KIND_ALIASES.schedule.join(', ')}. Available files: ${files.map((f) => f.name).join(', ') || '(none)'}`,
            );
            return result;
          }
          fileToProcess = picked.name;
        }
        resolvedFileName = fileToProcess;
        content = await this.downloadFile(`/Outbox/${fileToProcess}`);
      }
      result.fileName = resolvedFileName;

      const rawRecords = await this.parseCsvRaw(content);
      result.recordsTotal = rawRecords.length;
      const allUnknown = new Set<string>();

      for (const raw of rawRecords) {
        try {
          const { normalized: record, unknownHeaders } = normalizeRecord<HhaxScheduleRecord>(
            raw,
            SCHEDULE_HEADER_ALIASES,
          );
          for (const h of unknownHeaders) allUnknown.add(h);

          // Schedule rows must identify the visit, the caregiver, and the
          // patient — but the patient may be identified by EITHER
          // AdmissionID or PatientCode, depending on the customer's HHAX
          // export configuration.
          const hasPatientIdentifier = Boolean(record.AdmissionID || record.PatientCode);
          if (!record.ScheduleID || !record.CaregiverCode || !hasPatientIdentifier) {
            result.recordsSkipped++;
            continue;
          }

          // Try to match by AdmissionID first, then PatientCode (which may
          // live in either hhaxPatientCode or, for older imports,
          // hhaxAdmissionId).
          const client = await this.findClient(record.AdmissionID, record.PatientCode);
          const caregiver = await storage.getCaregiverByHhaxCode(record.CaregiverCode);

          if (!client || !caregiver) {
            result.recordsSkipped++;
            const missing: string[] = [];
            if (!client) {
              const patientLabel = record.AdmissionID || record.PatientCode || '(unknown)';
              missing.push(`patient ${patientLabel}`);
            }
            if (!caregiver) missing.push(`caregiver ${record.CaregiverCode}`);
            result.errors.push(
              `Schedule ${record.ScheduleID}: skipped — ${missing.join(' and ')} not found. Import patients and caregivers first.`,
            );
            continue;
          }

          const officeId = this.getOfficeIdFromName(record.Branch) || opts.fallbackOfficeId || client.officeId;
          const scheduleDate = parseDateSafe(record.ScheduleDate);
          if (!scheduleDate) {
            result.recordsFailed++;
            result.errors.push(`Schedule ${record.ScheduleID}: invalid ScheduleDate "${record.ScheduleDate}"`);
            continue;
          }
          const startTime = record.StartTime || '09:00';
          const endTime = record.EndTime || '17:00';

          const scheduleData = {
            clientId: client.id,
            caregiverId: caregiver.id,
            officeId: officeId || undefined,
            date: scheduleDate,
            startTime,
            endTime,
            status: 'scheduled',
            notes: `HHAX Schedule ID: ${record.ScheduleID}`,
          };

          if (opts.dryRun) {
            result.recordsCreated++;
            continue;
          }

          await storage.createSchedule(scheduleData);
          result.recordsCreated++;
        } catch (error: any) {
          result.recordsFailed++;
          result.errors.push(`Schedule ${(raw as any).ScheduleID || '(unknown)'}: ${error.message}`);
        }
      }

      if (allUnknown.size > 0) {
        result.unrecognizedHeaders = Array.from(allUnknown);
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    await this.maybeCleanupAfterImport(opts, result);
    return result;
  }

  /**
   * Run cleanup for an import that just finished. Only runs when:
   *   - the importer pulled from SFTP (not an in-memory sample buffer),
   *   - it wasn't a dry run,
   *   - the import itself succeeded and a file was actually processed.
   * Records the action on the result so callers/UI can surface it.
   */
  private async maybeCleanupAfterImport(
    opts: { buffer?: Buffer; dryRun?: boolean },
    result: HhaxSyncResult,
  ): Promise<void> {
    if (opts.buffer || opts.dryRun) return;
    if (!result.success || !result.fileName) return;
    const cfg = getOutboxCleanupConfig();
    if (cfg.mode === 'off') return;
    try {
      // Per-file action for the just-imported file. In 'archive' mode this
      // moves it; in 'delete' mode with N=0 it deletes it immediately; in
      // 'delete' mode with N>0 it is reported as 'retained' (still too new).
      const action = await this.cleanupOutboxFile(result.fileName);
      if (action.action !== 'skipped' || action.error) {
        result.cleanup = action;
      }
      // Retention-based delete also needs to revisit older files in /Outbox
      // that have now aged past N days, otherwise processed files would
      // accumulate forever. Sweep them here so each successful import keeps
      // the directory tidy without requiring a manual click.
      if (cfg.mode === 'delete' && cfg.deleteAfterDays > 0) {
        try {
          const sweep = await this.sweepOutbox();
          // Only attach the sweep summary if it actually did something
          // worth surfacing — purely-retained sweeps would be noise.
          if (sweep.deleted.length > 0 || sweep.archived.length > 0 || sweep.errors.length > 0) {
            result.cleanupSweep = sweep;
          }
        } catch (err: any) {
          console.warn('[HHAX SFTP] post-import sweep error:', err?.message || err);
        }
      }
    } catch (err: any) {
      // Cleanup failure must never fail the import itself.
      console.warn('[HHAX SFTP] post-import cleanup error:', err?.message || err);
    }
  }

  async runFullSync(fallbackOfficeId?: string): Promise<{
    caregivers: HhaxSyncResult;
    clients: HhaxSyncResult;
    schedules: HhaxSyncResult;
    cleanupSweep?: OutboxCleanupSummary;
  }> {
    const results: {
      caregivers: HhaxSyncResult;
      clients: HhaxSyncResult;
      schedules: HhaxSyncResult;
      cleanupSweep?: OutboxCleanupSummary;
    } = {
      caregivers: emptyResult(),
      clients: emptyResult(),
      schedules: emptyResult(),
    };

    let connected = false;
    try {
      await this.connect();
      connected = true;

      // Order matters: clients and caregivers must exist before schedules
      // can match patient/caregiver foreign keys.
      results.clients = await this.importClients({ fallbackOfficeId });
      results.caregivers = await this.importCaregivers({ fallbackOfficeId });
      results.schedules = await this.importSchedules({ fallbackOfficeId });

      // Age-based sweep ONLY runs in retention mode ('delete' with N>0).
      // In archive mode and immediate-delete mode, the per-import cleanup
      // already handled each processed file, and unprocessed files in
      // /Outbox must be left alone (they may be queued for a later run).
      const cfg = getOutboxCleanupConfig();
      if (cfg.mode === 'delete' && cfg.deleteAfterDays > 0) {
        try {
          results.cleanupSweep = await this.sweepOutbox();
        } catch (err: any) {
          console.warn('[HHAX SFTP] full-sync sweep error:', err?.message || err);
        }
      }
    } catch (error: any) {
      console.error('[HHAX SFTP] Full sync error:', error);
      // Attribute the unexpected error to whichever stage hadn't started yet.
      const msg = error?.message || 'Unknown error during full sync';
      if (results.clients.recordsTotal === 0 && results.clients.errors.length === 0) results.clients.errors.push(msg);
      if (results.caregivers.recordsTotal === 0 && results.caregivers.errors.length === 0) results.caregivers.errors.push(msg);
      if (results.schedules.recordsTotal === 0 && results.schedules.errors.length === 0) results.schedules.errors.push(msg);
    } finally {
      if (connected) {
        try { await this.disconnect(); } catch { /* noop */ }
      }
    }

    return results;
  }
}

export const hhaxSftpService = new HhaxSftpService();
