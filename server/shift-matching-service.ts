import { storage } from "./storage";
import type { Caregiver, Client, CaregiverSchedule, CaregiverAvailability, CaregiverAvailabilityException } from "@shared/schema";

export interface ShiftMatchScore {
  caregiver: Caregiver;
  matchScore: number;
  reasons: string[];
  breakdown: {
    availability: number;
    skills: number;
    noConflicts: number;
    clientPreference: number;
    distance: number;
  };
}

export interface ShiftMatchRequest {
  clientId: string;
  date: Date;
  startTime: string;
  endTime: string;
  requiredSkills?: string[];
}

const SCORE_WEIGHTS = {
  availability: 30,
  skills: 25,
  noConflicts: 20,
  clientPreference: 15,
  distance: 10,
};

export class ShiftMatchingService {
  async suggestCaregiversForShift(
    clientId: string,
    date: Date,
    startTime: string,
    endTime: string,
    requiredSkills?: string[]
  ): Promise<ShiftMatchScore[]> {
    const client = await storage.getClient(clientId);
    if (!client) {
      throw new Error("Client not found");
    }

    const caregivers = await storage.getAllCaregivers(client.officeId || undefined);
    const activeCaregivers = caregivers.filter((c) => c.isActive);

    const matchResults: ShiftMatchScore[] = [];

    for (const caregiver of activeCaregivers) {
      const score = await this.calculateMatchScore(caregiver, client, date, startTime, endTime, requiredSkills);
      matchResults.push(score);
    }

    return matchResults
      .filter((m) => m.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  async calculateMatchScore(
    caregiver: Caregiver,
    client: Client,
    date: Date,
    startTime: string,
    endTime: string,
    requiredSkills?: string[]
  ): Promise<ShiftMatchScore> {
    const reasons: string[] = [];
    const breakdown = {
      availability: 0,
      skills: 0,
      noConflicts: 0,
      clientPreference: 0,
      distance: 0,
    };

    const availabilityResult = await storage.checkCaregiverAvailability(
      caregiver.id,
      date,
      startTime,
      endTime
    );
    if (availabilityResult.available) {
      breakdown.availability = SCORE_WEIGHTS.availability;
      reasons.push("Available during requested time");
    } else {
      reasons.push(`Not available: ${availabilityResult.reason || "Unknown reason"}`);
    }

    if (requiredSkills && requiredSkills.length > 0) {
      const caregiverSkills = caregiver.specializations || [];
      const matchedSkills = requiredSkills.filter((skill) =>
        caregiverSkills.some((cs) => cs.toLowerCase().includes(skill.toLowerCase()))
      );
      const skillMatchRatio = matchedSkills.length / requiredSkills.length;
      breakdown.skills = Math.round(SCORE_WEIGHTS.skills * skillMatchRatio);
      if (matchedSkills.length > 0) {
        reasons.push(`Matched skills: ${matchedSkills.join(", ")}`);
      }
      if (matchedSkills.length < requiredSkills.length) {
        const missingSkills = requiredSkills.filter((skill) => !matchedSkills.includes(skill));
        reasons.push(`Missing skills: ${missingSkills.join(", ")}`);
      }
    } else {
      breakdown.skills = SCORE_WEIGHTS.skills;
      reasons.push("No specific skills required");
    }

    const hasConflict = await this.checkScheduleConflict(caregiver.id, date, startTime, endTime);
    if (!hasConflict) {
      breakdown.noConflicts = SCORE_WEIGHTS.noConflicts;
      reasons.push("No schedule conflicts");
    } else {
      reasons.push("Has schedule conflict during this time");
    }

    if (client.primaryCaregiverId === caregiver.id) {
      breakdown.clientPreference = SCORE_WEIGHTS.clientPreference;
      reasons.push("Primary caregiver for this client");
    } else {
      const assignments = await storage.getAssignedCaregiversByClient(client.id);
      if (assignments.some((a) => a.id === caregiver.id)) {
        breakdown.clientPreference = Math.round(SCORE_WEIGHTS.clientPreference * 0.7);
        reasons.push("Previously assigned to this client");
      }
    }

    const distanceScore = this.calculateDistanceScore(caregiver, client);
    breakdown.distance = distanceScore.score;
    if (distanceScore.reason) {
      reasons.push(distanceScore.reason);
    }

    const totalScore =
      breakdown.availability +
      breakdown.skills +
      breakdown.noConflicts +
      breakdown.clientPreference +
      breakdown.distance;

    return {
      caregiver,
      matchScore: totalScore,
      reasons,
      breakdown,
    };
  }

  async checkScheduleConflict(
    caregiverId: string,
    date: Date,
    startTime: string,
    endTime: string
  ): Promise<boolean> {
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    const schedules = await storage.getCaregiverSchedules(caregiverId, dateStart, dateEnd);
    
    for (const schedule of schedules) {
      if (schedule.status === "cancelled") continue;
      
      if (this.timeRangesOverlap(startTime, endTime, schedule.startTime, schedule.endTime)) {
        return true;
      }
    }

    return false;
  }

  private calculateDistanceScore(
    caregiver: Caregiver,
    client: Client
  ): { score: number; reason?: string } {
    const caregiverZip = caregiver.zipCode;
    const clientZip = client.zipCode;

    if (!caregiverZip || !clientZip) {
      return { score: 0, reason: "Address data not available for distance calculation" };
    }

    if (caregiverZip === clientZip) {
      return { score: SCORE_WEIGHTS.distance, reason: "Same zip code as client" };
    }

    const caregiverPrefix = caregiverZip.substring(0, 3);
    const clientPrefix = clientZip.substring(0, 3);

    if (caregiverPrefix === clientPrefix) {
      return { score: Math.round(SCORE_WEIGHTS.distance * 0.7), reason: "Nearby zip code" };
    }

    const caregiverState = caregiver.state;
    const clientState = client.state;

    if (caregiverState && clientState && caregiverState === clientState) {
      return { score: Math.round(SCORE_WEIGHTS.distance * 0.3), reason: "Same state" };
    }

    return { score: 0, reason: "Different geographic area" };
  }

  private timeRangesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean {
    const toMinutes = (time: string): number => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };
    const s1 = toMinutes(start1),
      e1 = toMinutes(end1);
    const s2 = toMinutes(start2),
      e2 = toMinutes(end2);
    return s1 < e2 && e1 > s2;
  }
}

export const shiftMatchingService = new ShiftMatchingService();
