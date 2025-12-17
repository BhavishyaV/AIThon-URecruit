import Papa from 'papaparse';
import { InterviewerT, CandidateT, ParticipantStatus, Decision, RoundName } from '../types';

export interface InterviewerCSVRow {
  'Interviewer Email': string;
  'Interviewer Name': string;
  'Rounds Eligible': string; // Comma-separated round names
  'Available Slot Start': string; // DateTime string (e.g., "2024-12-17 09:00")
  'Available Slot End': string; // DateTime string (e.g., "2024-12-17 18:00")
  'Level': string;
  'Job Family': string;
  'Max Interviews': string;
}

export interface CandidateCSVRow {
  'Candidate Email': string;
  'Candidate Name': string;
  'Resume Link': string;
  'Job Family': string;
  'Level': string;
}

export const parseInterviewersCSV = (file: File): Promise<InterviewerT[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse<InterviewerCSVRow>(file, {
      header: true,
      complete: (results) => {
        try {
          const interviewers: InterviewerT[] = results.data
            .filter(row => row['Interviewer Email']) // Filter out empty rows
            .map(row => {
              const eligibleRounds = row['Rounds Eligible']
                .split(',')
                .map(r => r.trim() as RoundName);

              const eligibility: Record<RoundName, boolean> = {
                [RoundName.BPS]: false,
                [RoundName.CODING1]: false,
                [RoundName.CODING2]: false,
                [RoundName.BAR_RAISER]: false,
                [RoundName.HIRING_MANAGER]: false
              };

              eligibleRounds.forEach(round => {
                if (round in RoundName) {
                  eligibility[round] = true;
                }
              });

              // Parse datetime strings to ISO timestamps
              const slotStartStr = row['Available Slot Start'].trim();
              const slotEndStr = row['Available Slot End'].trim();
              
              return {
                email: row['Interviewer Email'].trim(),
                fullName: row['Interviewer Name'].trim(),
                level: row['Level'].trim(),
                jobFamily: row['Job Family'].trim(),
                eligibility,
                maxInterviews: parseInt(row['Max Interviews'], 10),
                slotStart: new Date(slotStartStr).toISOString(),
                slotEnd: new Date(slotEndStr).toISOString(),
                currentStatus: ParticipantStatus.WAITING
              };
            });

          resolve(interviewers);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

export const parseCandidatesCSV = (file: File): Promise<CandidateT[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse<CandidateCSVRow>(file, {
      header: true,
      complete: (results) => {
        try {
          const candidates: CandidateT[] = results.data
            .filter(row => row['Candidate Email']) // Filter out empty rows
            .map(row => ({
              email: row['Candidate Email'].trim(),
              fullName: row['Candidate Name'].trim(),
              resume: row['Resume Link'].trim(),
              jobFamily: row['Job Family'].trim(),
              level: row['Level'].trim(),
              overallDecision: Decision.PENDING,
              currentStatus: ParticipantStatus.WAITING
            }));

          resolve(candidates);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

