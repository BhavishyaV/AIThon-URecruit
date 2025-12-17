import {
  HiringDriveT,
  InterviewerT,
  CandidateT,
  Decision,
  ParticipantStatus,
  EventStatus
} from '../../../shared/types';

export class StatusUpdateService {
  /**
   * Update interviewer status based on rules
   */
  static updateInterviewerStatus(
    interviewer: InterviewerT,
    drive: HiringDriveT,
    currentTime: Date
  ): ParticipantStatus {
    // Parse interviewer slot times
    const slotStart = this.parseTimeString(drive.date, interviewer.slotStart);
    const slotEnd = this.parseTimeString(drive.date, interviewer.slotEnd);

    // If current time < interviewer's slot start time -> BUSY
    if (currentTime < slotStart) {
      return ParticipantStatus.BUSY;
    }

    // If current time > interviewer's slot end time -> DONE
    if (currentTime > slotEnd) {
      return ParticipantStatus.DONE;
    }

    // Count completed interviews
    const completedInterviews = drive.events.filter(
      event =>
        event.interviewerEmail === interviewer.email &&
        event.status === EventStatus.COMPLETED
    ).length;

    // If number of completed interviews >= maxInterviews -> DONE
    if (completedInterviews >= interviewer.maxInterviews) {
      return ParticipantStatus.DONE;
    }

    // Check if all candidates are done (no PENDING decisions)
    const allCandidatesDone = drive.candidates.every(
      candidate => candidate.overallDecision !== Decision.PENDING
    );

    if (allCandidatesDone) {
      return ParticipantStatus.DONE;
    }

    // Default to current status or WAITING
    return interviewer.currentStatus;
  }

  /**
   * Update candidate status based on rules
   */
  static updateCandidateStatus(
    candidate: CandidateT,
    drive: HiringDriveT,
    currentTime: Date
  ): ParticipantStatus {
    // If candidate's overallDecision is not PENDING -> DONE
    if (candidate.overallDecision !== Decision.PENDING) {
      return ParticipantStatus.DONE;
    }

    // Check if candidate has an ongoing interview
    const hasOngoingInterview = drive.events.some(
      event =>
        event.candidateEmail === candidate.email &&
        event.status === EventStatus.ONGOING
    );

    if (hasOngoingInterview) {
      return ParticipantStatus.BUSY;
    }

    // Check if candidate has a scheduled interview
    const hasScheduledInterview = drive.events.some(
      event =>
        event.candidateEmail === candidate.email &&
        event.status === EventStatus.SCHEDULED
    );

    if (hasScheduledInterview) {
      return ParticipantStatus.WAITING;
    }

    // Default to WAITING if still in progress
    return ParticipantStatus.WAITING;
  }

  /**
   * Update candidate overall decision
   */
  static updateCandidateOverallDecision(
    candidate: CandidateT,
    drive: HiringDriveT
  ): Decision {
    const candidateEvents = drive.events.filter(
      event =>
        event.candidateEmail === candidate.email &&
        event.status === EventStatus.COMPLETED
    );

    // Check if candidate failed any elimination round
    const failedElimination = candidateEvents.some(event => {
      const round = drive.rounds.find(r => r.roundName === event.round.roundName);
      return (
        round?.isElimination &&
        (event.decision === Decision.NO || event.decision === Decision.STRONG_NO)
      );
    });

    if (failedElimination) {
      return Decision.NO;
    }

    // Check if candidate completed all rounds
    const completedRoundNames = candidateEvents.map(event => event.round.roundName);
    const allRoundsCompleted = drive.rounds.every(round =>
      completedRoundNames.includes(round.roundName)
    );

    if (!allRoundsCompleted) {
      return Decision.PENDING;
    }

    // Calculate overall decision based on all rounds
    const yesCount = candidateEvents.filter(
      event => event.decision === Decision.YES || event.decision === Decision.STRONG_YES
    ).length;
    const totalRounds = drive.rounds.length;

    if (yesCount === totalRounds) {
      return Decision.STRONG_YES;
    } else if (yesCount >= totalRounds * 0.7) {
      return Decision.YES;
    } else {
      return Decision.NO;
    }
  }

  /**
   * Parse time string and combine with date
   */
  private static parseTimeString(date: string, time: string): Date {
    const [hour, minute] = time.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hour, minute, 0, 0);
    return result;
  }
}

