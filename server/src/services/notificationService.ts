import { EventT, InterviewerT, CandidateT } from '../../../shared/types';

export class NotificationService {
  /**
   * Send notification to interviewer when event is created
   */
  static sendInterviewerScheduledNotification(
    event: EventT,
    interviewer: InterviewerT
  ): void {
    console.log('Sending notification to interviewer:', {
      to: interviewer.email,
      subject: `Interview Scheduled - ${event.round.roundName}`,
      body: {
        zoomLink: event.zoomLink,
        hackerRankLink: event.hackerRankLink,
        round: event.round.roundName,
        startTime: event.startTime,
        duration: event.duration,
        scorecardLink: event.scorecardLink,
        candidateEmail: event.candidateEmail
      }
    });
    // TODO: Implement actual notification sending (email, Slack, etc.)
  }

  /**
   * Send notification to candidate when event is created
   */
  static sendCandidateScheduledNotification(
    event: EventT,
    candidate: CandidateT
  ): void {
    console.log('Sending notification to candidate:', {
      to: candidate.email,
      subject: `Interview Scheduled - ${event.round.roundName}`,
      body: {
        zoomLink: event.zoomLink,
        hackerRankLink: event.hackerRankLink,
        round: event.round.roundName,
        startTime: event.startTime,
        duration: event.duration,
        candidateEmail: candidate.email
      }
    });
    // TODO: Implement actual notification sending (email, Slack, etc.)
  }

  /**
   * Send notification to interviewer to start interview
   */
  static sendInterviewStartNotification(
    event: EventT,
    interviewer: InterviewerT
  ): void {
    console.log('Sending start notification to interviewer:', {
      to: interviewer.email,
      subject: `Interview Starting - ${event.round.roundName}`,
      body: {
        message: 'Has the interview started?',
        eventId: event.id
      }
    });
    // TODO: Implement actual notification sending
  }

  /**
   * Send notification to interviewer to complete interview
   */
  static sendInterviewCompleteNotification(
    event: EventT,
    interviewer: InterviewerT
  ): void {
    console.log('Sending completion notification to interviewer:', {
      to: interviewer.email,
      subject: `Interview Ending - ${event.round.roundName}`,
      body: {
        message: 'Please provide interview feedback',
        eventId: event.id,
        requiredFields: [
          'Decision (YES/NO/STRONG_YES/STRONG_NO)',
          'Question Asked',
          'Ready for next interview? (Y/N)',
          'If No, Break Time (15/30 mins)'
        ]
      }
    });
    // TODO: Implement actual notification sending
  }
}

