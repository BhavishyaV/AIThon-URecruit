import { EventT, InterviewerT, CandidateT, NotificationResponseRequest, ScheduledNotifData, Decision } from '../../../shared/types';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5001/api';

export class NotificationService {
  /**
   * Send notification to interviewer when event is created
   */
  static sendInterviewerScheduledNotification(
    event: EventT,
    interviewer: InterviewerT,
    driveId: string
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
    // Mock interviewer accepting the scheduled interview
    setTimeout(() => {
      const response: NotificationResponseRequest = {
        source: 'interviewer',
        email: interviewer.email,
        driveId: driveId,
        eventId: event.id,
        notificationType: 'scheduled_notif',
        data: {
          isAccepted: true
        } as ScheduledNotifData
      };
      
      fetch(`${API_BASE_URL}/notification-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response)
      }).catch(err => console.error('Error sending mock interviewer scheduled response:', err));
    }, 1000); // Mock 1 second delay for response
  }

  /**
   * Send notification to candidate when event is created
   */
  static sendCandidateScheduledNotification(
    event: EventT,
    candidate: CandidateT,
    driveId: string
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
    // Mock candidate accepting the scheduled interview
    setTimeout(() => {
      const response: NotificationResponseRequest = {
        source: 'candidate',
        email: candidate.email,
        driveId: driveId,
        eventId: event.id,
        notificationType: 'scheduled_notif',
        data: {
          isAccepted: true
        } as ScheduledNotifData
      };
      
      fetch(`${API_BASE_URL}/notification-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response)
      }).catch(err => console.error('Error sending mock candidate scheduled response:', err));
    }, 1500); // Mock 1.5 second delay for response
  }

  /**
   * Send notification to interviewer to start interview
   */
  static sendInterviewStartNotification(
    event: EventT,
    interviewer: InterviewerT,
    driveId: string
  ): void {
    console.log('Sending start notification to interviewer:', {
      to: interviewer.email,
      subject: `Interview Starting for ${event.candidateEmail} - ${event.round.roundName}`,
      body: {
        message: 'Has the interview started?',
        eventId: event.id,
        candidateEmail: event.candidateEmail
      }
    });
    // TODO: Implement actual notification sending (email, Slack, etc.)
    // Mock interviewer confirming interview has started
    setTimeout(() => {
      const response: NotificationResponseRequest = {
        source: 'interviewer',
        email: interviewer.email,
        driveId: driveId,
        eventId: event.id,
        notificationType: 'start_notif',
        data: {
          isStarted: true
        }
      };
      
      fetch(`${API_BASE_URL}/notification-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response)
      }).catch(err => console.error('Error sending mock interview start response:', err));
    }, 2000); // Mock 2 second delay for response
  }

  /**
   * Send notification to interviewer to complete interview
   */
  static sendInterviewCompleteNotification(
    event: EventT,
    interviewer: InterviewerT,
    driveId: string
  ): void {
    console.log('Sending completion notification to interviewer:', {
      to: interviewer.email,
      subject: `Interview Ending for ${event.candidateEmail} - ${event.round.roundName}`,
      body: {
        message: 'Please provide interview feedback',
        eventId: event.id,
        candidateEmail: event.candidateEmail,
        requiredFields: [
          'Decision (YES/NO/STRONG_YES/STRONG_NO)',
          'Question Asked',
          'Ready for next interview? (Y/N)',
          'If No, Break Time (15/30 mins)'
        ]
      }
    });
    // TODO: Implement actual notification sending (email, Slack, etc.)
    // Mock interviewer providing feedback after interview completion
    setTimeout(() => {
      // Randomly simulate different decisions and scenarios for testing
      const decisions = [Decision.YES, Decision.NO, Decision.STRONG_YES, Decision.STRONG_NO];
      const randomDecision = decisions[Math.floor(Math.random() * decisions.length)];
      const isReadyForNext = Math.random() > 0.3; // 70% ready for next round
      const breakTime = isReadyForNext ? 0 : [15, 30][Math.floor(Math.random() * 2)];
      
      const response: NotificationResponseRequest = {
        source: 'interviewer',
        email: interviewer.email,
        driveId: driveId,
        eventId: event.id,
        notificationType: 'completed_notif',
        data: {
          decision: randomDecision,
          questionAsked: `Sample question for ${event.round.roundName}`,
          isReadyForNextRound: isReadyForNext,
          breakTime: breakTime
        }
      };
      
      fetch(`${API_BASE_URL}/notification-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response)
      }).catch(err => console.error('Error sending mock interview completion response:', err));
    }, 3000); // Mock 3 second delay for response
  }
}

