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

interface SyncResult {
  success: boolean;
  recordsTotal: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
  errors: string[];
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
      await this.sftp.end();
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
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  async listOutboxFiles(): Promise<{ name: string; size: number; modifyTime: Date }[]> {
    try {
      if (!this.sftp) await this.connect();
      const files = await this.sftp!.list('/Outbox');
      return files
        .filter((f: { type: string; name: string }) => f.type === '-' && f.name.endsWith('.csv'))
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

  private async parseCsv<T>(content: Buffer): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const records: T[] = [];
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      parser.on('readable', () => {
        let record;
        while ((record = parser.read()) !== null) {
          records.push(record as T);
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
      this.officeMapping.set(mapping.hhaxOfficeName.toLowerCase(), mapping.officeId);
    }
  }

  private getOfficeIdFromName(officeName?: string): string | null {
    if (!officeName) return null;
    return this.officeMapping.get(officeName.toLowerCase()) || null;
  }

  async importCaregivers(fileName?: string, fallbackOfficeId?: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      recordsTotal: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
      errors: [],
    };

    try {
      await this.loadOfficeMappings();
      if (!this.sftp) await this.connect();

      let fileToProcess = fileName;
      if (!fileToProcess) {
        const files = await this.listOutboxFiles();
        const caregiverFile = files.find(f => f.name.includes('Caregiver'));
        if (!caregiverFile) {
          result.success = false;
          result.errors.push('No caregiver export file found in Outbox');
          return result;
        }
        fileToProcess = caregiverFile.name;
      }

      const content = await this.downloadFile(`/Outbox/${fileToProcess}`);
      const records = await this.parseCsv<HhaxCaregiverRecord>(content);
      result.recordsTotal = records.length;

      for (const record of records) {
        try {
          if (!record.CaregiverCode) {
            result.recordsSkipped++;
            continue;
          }

          const officeId = this.getOfficeIdFromName(record.Branch) || fallbackOfficeId || null;
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
            hireDate: record.HireDate ? new Date(record.HireDate) : null,
            startDate: record.HireDate ? new Date(record.HireDate) : null,
            terminationDate: record.TerminationDate ? new Date(record.TerminationDate) : null,
            status: record.Status?.toLowerCase() === 'active' ? 'active' : 'inactive',
            officeId: officeId || null,
            languages: record.Languages ? record.Languages.split('|') : null,
            certifications: record.Disciplines ? record.Disciplines.split('|') : null,
          };

          if (existingCaregiver) {
            await storage.updateCaregiver(existingCaregiver.id, caregiverData);
            result.recordsUpdated++;
          } else {
            await storage.createCaregiver(caregiverData as any);
            result.recordsCreated++;
          }
        } catch (error: any) {
          result.recordsFailed++;
          result.errors.push(`Caregiver ${record.CaregiverCode}: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  async importClients(fileName?: string, fallbackOfficeId?: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      recordsTotal: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
      errors: [],
    };

    try {
      await this.loadOfficeMappings();
      if (!this.sftp) await this.connect();

      let fileToProcess = fileName;
      if (!fileToProcess) {
        const files = await this.listOutboxFiles();
        const patientFile = files.find(f => f.name.includes('Patient') || f.name.includes('Client'));
        if (!patientFile) {
          result.success = false;
          result.errors.push('No patient/client export file found in Outbox');
          return result;
        }
        fileToProcess = patientFile.name;
      }

      const content = await this.downloadFile(`/Outbox/${fileToProcess}`);
      const records = await this.parseCsv<HhaxPatientRecord>(content);
      result.recordsTotal = records.length;

      for (const record of records) {
        try {
          const admissionId = record.AdmissionID || record.PatientCode;
          if (!admissionId) {
            result.recordsSkipped++;
            continue;
          }

          const officeId = this.getOfficeIdFromName(record.Branch) || fallbackOfficeId || null;
          const existingClient = await storage.getClientByHhaxAdmissionId(admissionId);

          const clientData = {
            hhaxAdmissionId: admissionId,
            firstName: record.FirstName || '',
            lastName: record.LastName || '',
            dateOfBirth: record.DateOfBirth ? new Date(record.DateOfBirth) : null,
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
            status: record.Status?.toLowerCase() === 'active' ? 'active' : 'inactive',
            officeId: officeId || null,
            serviceStartDate: record.ServiceStartDate ? new Date(record.ServiceStartDate) : null,
          };

          if (existingClient) {
            await storage.updateClient(existingClient.id, clientData);
            result.recordsUpdated++;
          } else {
            await storage.createClient(clientData as any);
            result.recordsCreated++;
          }
        } catch (error: any) {
          result.recordsFailed++;
          result.errors.push(`Client ${record.PatientCode}: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  async importSchedules(fileName?: string, fallbackOfficeId?: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      recordsTotal: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
      errors: [],
    };

    try {
      await this.loadOfficeMappings();
      if (!this.sftp) await this.connect();

      let fileToProcess = fileName;
      if (!fileToProcess) {
        const files = await this.listOutboxFiles();
        const scheduleFile = files.find(f => f.name.includes('Schedule'));
        if (!scheduleFile) {
          result.success = false;
          result.errors.push('No schedule export file found in Outbox');
          return result;
        }
        fileToProcess = scheduleFile.name;
      }

      const content = await this.downloadFile(`/Outbox/${fileToProcess}`);
      const records = await this.parseCsv<HhaxScheduleRecord>(content);
      result.recordsTotal = records.length;

      for (const record of records) {
        try {
          if (!record.ScheduleID || !record.PatientCode || !record.CaregiverCode) {
            result.recordsSkipped++;
            continue;
          }

          const client = await storage.getClientByHhaxAdmissionId(record.PatientCode);
          const caregiver = await storage.getCaregiverByHhaxCode(record.CaregiverCode);

          if (!client || !caregiver) {
            result.recordsSkipped++;
            result.errors.push(`Schedule ${record.ScheduleID}: Client or caregiver not found`);
            continue;
          }

          const officeId = this.getOfficeIdFromName(record.Branch) || fallbackOfficeId || client.officeId;
          const scheduleDate = new Date(record.ScheduleDate);
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

          await storage.createSchedule(scheduleData);
          result.recordsCreated++;
        } catch (error: any) {
          result.recordsFailed++;
          result.errors.push(`Schedule ${record.ScheduleID}: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  private mapGender(hhaxGender?: string): 'male' | 'female' | 'non_binary' | 'prefer_not_to_say' | null {
    if (!hhaxGender) return null;
    const g = hhaxGender.toLowerCase();
    if (g === 'm' || g === 'male') return 'male';
    if (g === 'f' || g === 'female') return 'female';
    return 'prefer_not_to_say';
  }

  async runFullSync(syncLogId: string, userId?: string, fallbackOfficeId?: string): Promise<{ caregivers: SyncResult; clients: SyncResult; schedules: SyncResult }> {
    const results = {
      caregivers: { success: true, recordsTotal: 0, recordsCreated: 0, recordsUpdated: 0, recordsSkipped: 0, recordsFailed: 0, errors: [] as string[] },
      clients: { success: true, recordsTotal: 0, recordsCreated: 0, recordsUpdated: 0, recordsSkipped: 0, recordsFailed: 0, errors: [] as string[] },
      schedules: { success: true, recordsTotal: 0, recordsCreated: 0, recordsUpdated: 0, recordsSkipped: 0, recordsFailed: 0, errors: [] as string[] },
    };

    try {
      await this.connect();
      
      results.clients = await this.importClients(undefined, fallbackOfficeId);
      results.caregivers = await this.importCaregivers(undefined, fallbackOfficeId);
      results.schedules = await this.importSchedules(undefined, fallbackOfficeId);
      
      await this.disconnect();
    } catch (error: any) {
      console.error('[HHAX SFTP] Full sync error:', error);
      results.caregivers.errors.push(error.message);
      results.clients.errors.push(error.message);
      results.schedules.errors.push(error.message);
    }

    return results;
  }
}

export const hhaxSftpService = new HhaxSftpService();
