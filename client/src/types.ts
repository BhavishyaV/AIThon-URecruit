export enum Decision {
  PENDING = 'PENDING',
  STRONG_NO = 'STRONG_NO',
  NO = 'NO',
  YES = 'YES',
  STRONG_YES = 'STRONG_YES'
}

export enum EventStatus {
  SCHEDULED = 'SCHEDULED',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED'
}

export enum ParticipantStatus {
  WAITING = 'WAITING',
  BUSY = 'BUSY',
  DONE = 'DONE'
}

export enum RoundName {
  BPS = 'BPS',
  CODING1 = 'CODING1',
  CODING2 = 'CODING2',
  BAR_RAISER = 'BAR_RAISER',
  HIRING_MANAGER = 'HIRING_MANAGER'
}

export type InterviewerT = {
  email: string;
  fullName: string;
  level: string;
  jobFamily: string;
  eligibility: Record<RoundName, boolean>;
  maxInterviews: number;
  slotStart: string; // ISO timestamp
  slotEnd: string; // ISO timestamp
  currentStatus: ParticipantStatus;
}

export type CandidateT = {
  email: string;
  fullName: string;
  resume: string;
  jobFamily: string;
  level: string;
  overallDecision: Decision;
  currentStatus: ParticipantStatus;
}

export type RoundT = {
  roundName: RoundName;
  duration: number;
  isElimination: boolean;
  isJobFamilyMatchingRequired: boolean;
}

export type EventT = {
  id: string;
  round: RoundT;
  candidateEmail: string;
  interviewerEmail: string;
  startTime: string; // ISO timestamp
  duration: number; // Duration in minutes
  status: EventStatus;
  decision: Decision;
  zoomLink: string;
  hackerRankLink: string;
  scorecardLink: string;
  question?: string;
}

export type HiringDriveT = {
  _id: string;
  driveName: string;
  driveStartTime: string; // ISO timestamp
  driveEndTime: string; // ISO timestamp
  rounds: Array<RoundT>;
  candidates: Array<CandidateT>;
  interviewers: Array<InterviewerT>;
  events: Array<EventT>;
}

// Helper types for API requests
export type CreateHiringDriveRequest = Omit<HiringDriveT, '_id' | 'events'>;

export type UpdateEventRequest = {
  eventId: string;
  decision?: Decision;
  question?: string;
  status?: EventStatus;
  readyForNext?: boolean;
  breakTime?: number;
}

export type DashboardStats = {
  totalCandidates: number;
  totalInterviewers: number;
  ongoingInterviews: number;
  candidatesWithDecisionPending: number;
  percentCompletedCandidates: number;
  percentSelectedCandidates: number;
}

// Notification response types
export type NotificationType = 'scheduled_notif' | 'start_notif' | 'completed_notif';

export type ScheduledNotifData = {
  isAccepted: boolean;
}

export type StartNotifData = {
  isStarted: boolean;
}

export type CompletedNotifData = {
  decision: Decision;
  questionAsked: string;
  isReadyForNextRound: boolean;
  breakTime: number; // in minutes: 15, 30, 45, 60
}

export type NotificationResponseRequest = {
  source: 'interviewer' | 'candidate';
  email: string;
  driveId: string;
  eventId: string;
  notificationType: NotificationType;
  data: ScheduledNotifData | StartNotifData | CompletedNotifData;
}

