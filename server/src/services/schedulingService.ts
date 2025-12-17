import { v4 as uuidv4 } from 'uuid';
import differenceBy from 'lodash/differenceBy';
import {
  HiringDriveT,
  InterviewerT,
  CandidateT,
  RoundT,
  EventT,
  Decision,
  EventStatus,
  ParticipantStatus,
  RoundName
} from '../../../shared/types';

// Level hierarchy (higher number = higher level)
const LEVEL_HIERARCHY: Record<string, number> = {
  '3': 1,
  '4': 2,
  '5A': 3,
  '5B': 4,
  '6': 5
};

export class SchedulingService {
  
  /**
   * Main scheduling function - schedules interviews for candidates
   */
  static scheduleInterviews(drive: HiringDriveT): EventT[] {
    const newEvents: EventT[] = [];
    const currentTime = new Date();
    const bufferTime = 15 * 60 * 1000; // 15 minutes in milliseconds

    for (const candidate of drive.candidates) {
      // Skip candidates who have been eliminated or who have completed all rounds
      if (candidate.overallDecision !== Decision.PENDING) {
        continue;
      }

      // Skip if candidate is BUSY
      if (candidate.currentStatus === ParticipantStatus.BUSY) {
        continue;
      }

      // Determine which rounds this candidate still needs
      const eligibleRounds = this.getEligibleRoundsForCandidate(candidate, drive);
      
      for (const round of eligibleRounds) {
        // Find eligible interviewer
        const {interviewer, startTime} = this.findEligibleInterviewer(
          candidate,
          round,
          drive,
          currentTime,
          bufferTime
        );

        if (interviewer && startTime) {
          const event = this.createEvent(
            candidate,
            interviewer,
            round,
            drive,
            new Date(startTime),
          );
          newEvents.push(event);
          drive.events.push(event);
          
          // Only schedule one round at a time per candidate
          break;
        }
      }
    }

    return newEvents;
  }

  /**
   * Get eligible rounds for a candidate based on their progress
   */
  private static getEligibleRoundsForCandidate(
    candidate: CandidateT,
    drive: HiringDriveT
  ): RoundT[] {

    let canSchedule = false;
    const candidateEvents = drive.events.filter(
      event => event.candidateEmail === candidate.email
    );
    const candidateEliminationEvents = candidateEvents.filter(
      event => event.round.isElimination
    );
    // If the candidate was not scheduled for elimination rounds before, return true
    if (candidateEliminationEvents.length === 0) {
      canSchedule = true;
    } else {
      // Check if the decision of the last elimination round is YES or STRONG_YES and return true 
      const lastEliminationEvent = candidateEliminationEvents[candidateEliminationEvents.length - 1];
      if (lastEliminationEvent.decision === Decision.YES || lastEliminationEvent.decision === Decision.STRONG_YES) {
        canSchedule = true;
      }
    }

    if(!canSchedule) {
      return [];
    }

    const pendingRoundsToBeScheduled = differenceBy(
      drive.rounds, 
      candidateEvents.map(event => event.round), 
      'roundName');

    // If pending rounds to be scheduled contains an elimination round, return only the elimination round
    // Else return all pending rounds
    if(pendingRoundsToBeScheduled.some((round: RoundT) => round.isElimination)) {
      const eliminationRound = pendingRoundsToBeScheduled.find((round: RoundT) => round.isElimination);
      return eliminationRound ? [eliminationRound] : [];
    } else {
      return pendingRoundsToBeScheduled;
    }
  }

  /**
   * Find an eligible interviewer for a candidate and round
   */
  private static findEligibleInterviewer(
    candidate: CandidateT,
    round: RoundT,
    drive: HiringDriveT,
    currentTime: Date,
    bufferTime: number
  ): {interviewer: InterviewerT | null, startTime: string | null} {
    const eligibleInterviewers: Array<{ interviewer: InterviewerT; scheduledRate: number; earliestAvailableSlot: string }> = [];

    for (const interviewer of drive.interviewers) {
      // Skip if interviewer is not WAITING
      if (interviewer.currentStatus !== ParticipantStatus.WAITING) {
        continue;
      }

      // Check if interviewer is eligible for this round
      if (!interviewer.eligibility[round.roundName]) {
        continue;
      }

      // Check if interviewer has reached their maxInterviews limit
      const scheduledInterviewsCount = drive.events.filter(
        event => event.interviewerEmail === interviewer.email
      ).length;
      if (scheduledInterviewsCount >= interviewer.maxInterviews) {
        continue;
      }

      // Check level matching (interviewer level >= candidate level)
      const interviewerLevel = LEVEL_HIERARCHY[interviewer.level] || 0;
      const candidateLevel = LEVEL_HIERARCHY[candidate.level] || 0;
      if (interviewerLevel < candidateLevel) {
        continue;
      }

      // Check job family matching if required
      if (round.isJobFamilyMatchingRequired &&interviewer.jobFamily !== candidate.jobFamily) {
          continue;
      }

      // Check if interviewer already interviewed this candidate
      const hasInterviewedCandidate = drive.events.some(
        event =>
          event.candidateEmail === candidate.email &&
          event.interviewerEmail === interviewer.email
      );
      if (hasInterviewedCandidate) {
        continue;
      }

      // Find the interviewer's earliest available slot after current time + buffer time
      const earliestAvailableSlot = this.findEarliestAvailableSlot(
        interviewer,
        drive,
        round.duration,
        currentTime,
        bufferTime
      );

      // If no available slot found, skip this interviewer
      if (!earliestAvailableSlot) {
        continue;
      }

      // Calculate % interviews already scheduled for this interviewer
      const scheduledInterviews = drive.events.filter(
        event =>
          event.interviewerEmail === interviewer.email
      ).length;
      const scheduledRate = (scheduledInterviews * 100) / interviewer.maxInterviews;

      eligibleInterviewers.push({ interviewer, scheduledRate, earliestAvailableSlot });
    }

    // Sort eligible interviewers by earliest available slot
    // If multiple interviewers have the same earliest available slot, prefer interviewers with lower scheduled rate
    eligibleInterviewers.sort((a, b) => {
      const timeA = new Date(a.earliestAvailableSlot).getTime();
      const timeB = new Date(b.earliestAvailableSlot).getTime();
      
      // First, sort by earliest available slot
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      
      // If slots are the same, prefer lower scheduled rate
      return a.scheduledRate - b.scheduledRate;
    });

    return eligibleInterviewers.length > 0 ? 
          {interviewer: eligibleInterviewers[0].interviewer, startTime: eligibleInterviewers[0].earliestAvailableSlot} :
          {interviewer: null, startTime: null};
  }

  /**
   * Create an event
   */
  private static createEvent(
    candidate: CandidateT,
    interviewer: InterviewerT,
    round: RoundT,
    drive: HiringDriveT,
    startTime: Date,
  ): EventT {    
    // Ensure start time is within drive hours
    const driveDate = new Date(drive.date);
    const [driveStartHour, driveStartMinute] = drive.driveStartTime.split(':').map(Number);
    const driveStart = new Date(driveDate);
    driveStart.setHours(driveStartHour, driveStartMinute, 0, 0);

    if (startTime < driveStart) {
      startTime.setTime(driveStart.getTime());
    }

    // Ensure start time is within interviewer slot
    const interviewerSlotStart = this.parseTimeString(drive.date, interviewer.slotStart);
    if (startTime < interviewerSlotStart) {
      startTime.setTime(interviewerSlotStart.getTime());
    }

    const duration = round.duration;

    return {
      id: uuidv4(),
      round,
      candidateEmail: candidate.email,
      interviewerEmail: interviewer.email,
      startTime: startTime.toISOString(),
      duration,
      status: EventStatus.SCHEDULED,
      decision: Decision.PENDING,
      zoomLink: this.generateZoomLink(),
      hackerRankLink: this.generateHackerRankLink(),
      scorecardLink: this.generateScorecardLink(candidate.email, interviewer.email, round.roundName)
    };
  }

  /**
   * Parse time string (HH:MM) and combine with date
   */
  private static parseTimeString(date: string, time: string): Date {
    const [hour, minute] = time.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hour, minute, 0, 0);
    return result;
  }

  /**
   * Generate mock zoom link
   */
  private static generateZoomLink(): string {
    return `https://zoom.us/j/${Math.floor(Math.random() * 1000000000)}`;
  }

  /**
   * Generate mock hackerrank link
   */
  private static generateHackerRankLink(): string {
    return `https://hackerrank.com/test/${uuidv4()}`;
  }

  /**
   * Generate mock scorecard link
   */
  private static generateScorecardLink(
    candidateEmail: string,
    interviewerEmail: string,
    roundName: string
  ): string {
    return `https://scorecard.company.com/${candidateEmail}/${interviewerEmail}/${roundName}`;
  }

  /**
   * Find the earliest available slot for an interviewer
   */
  private static findEarliestAvailableSlot(
    interviewer: InterviewerT,
    drive: HiringDriveT,
    duration: number,
    currentTime: Date,
    bufferTime: number
  ): string | null {
    // Calculate the earliest possible start time (current time + buffer)
    const earliestStart = new Date(currentTime.getTime() + bufferTime);
    
    // Get interviewer's slot start and end times
    const slotStart = this.parseTimeString(drive.date, interviewer.slotStart);
    const slotEnd = this.parseTimeString(drive.date, interviewer.slotEnd);
    
    // If earliest start is after slot end, no available slot
    if (earliestStart >= slotEnd) {
      return null;
    }
    
    // Start from the later of earliestStart or slotStart
    let candidateStart = earliestStart > slotStart ? earliestStart : slotStart;
    
    // Get all events for this interviewer, sorted by start time
    const interviewerEvents = drive.events
      .filter(event => event.interviewerEmail === interviewer.email)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    // If no events, return the candidate start time
    if (interviewerEvents.length === 0) {
      const candidateEnd = new Date(candidateStart.getTime() + duration * 60 * 1000);
      if (candidateEnd <= slotEnd) {
        return candidateStart.toISOString();
      }
      return null;
    }
    
    // Check for gaps between events
    for (const event of interviewerEvents) {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(eventStart.getTime() + event.duration * 60 * 1000);
      
      // Check if there's enough space before this event
      const candidateEnd = new Date(candidateStart.getTime() + duration * 60 * 1000);
      
      if (candidateEnd <= eventStart && candidateStart >= slotStart && candidateEnd <= slotEnd) {
        return candidateStart.toISOString();
      }
      
      // Move candidate start to after this event
      candidateStart = eventEnd;
    }
    
    // Check if there's space after all events
    const candidateEnd = new Date(candidateStart.getTime() + duration * 60 * 1000);
    if (candidateStart >= slotStart && candidateEnd <= slotEnd) {
      return candidateStart.toISOString();
    }
    
    // No available slot found
    return null;
  }
}

