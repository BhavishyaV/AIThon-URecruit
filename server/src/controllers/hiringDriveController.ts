import { Request, Response } from 'express';
import { HiringDrive } from '../models/HiringDrive';
import { SchedulingService } from '../services/schedulingService';
import { StatusUpdateService } from '../services/statusUpdateService';
import {
  CreateHiringDriveRequest,
  UpdateEventRequest,
  DashboardStats,
  Decision,
  EventStatus,
  ParticipantStatus,
  HiringDriveT,
  NotificationResponseRequest,
  ScheduledNotifData,
  StartNotifData,
  CompletedNotifData
} from '../../../shared/types';

export class HiringDriveController {
  /**
   * Helper function to save with retry on version conflict
   */
  private static async saveWithRetry(doc: any, maxRetries = 3): Promise<void> {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        await doc.save();
        return;
      } catch (error: any) {
        if (error.name === 'VersionError' && retries < maxRetries - 1) {
          retries++;
          console.log(`Version conflict, retrying (${retries}/${maxRetries})...`);
          // Wait a bit before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retries)));
          // Refetch the document to get the latest version
          const fresh = await HiringDrive.findById(doc._id);
          if (fresh) {
            Object.assign(doc, fresh);
          }
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Create a new hiring drive
   */
  static async createHiringDrive(req: Request, res: Response): Promise<void> {
    try {
      const driveData: CreateHiringDriveRequest = req.body;

      // Initialize empty events array
      const hiringDrive = new HiringDrive({
        ...driveData,
        events: []
      });

      await hiringDrive.save();

      // Run scheduling algorithm for pre-scheduling
      const driveObj = JSON.parse(JSON.stringify(hiringDrive)) as HiringDriveT;
      SchedulingService.scheduleInterviews(driveObj);
      
      const currentTime = new Date();
      hiringDrive.interviewers.forEach((i) => {
        if(new Date(i.slotStart) > currentTime) {
          setTimeout(async () => {
            const updatedDrive = await HiringDrive.findById(hiringDrive._id);
            if (updatedDrive) {
              const driveObj = JSON.parse(JSON.stringify(updatedDrive)) as HiringDriveT;
              SchedulingService.scheduleInterviews(driveObj);
              updatedDrive.events = driveObj.events;
              await HiringDriveController.saveWithRetry(updatedDrive);
            }
          }, (new Date(i.slotStart).getTime() - currentTime.getTime()) / 60 * 1000);
        }
      });
      hiringDrive.events = driveObj.events;
      


      await hiringDrive.save();


      res.status(201).json(hiringDrive);
    } catch (error) {
      console.error('Error creating hiring drive:', error);
      res.status(500).json({ error: 'Failed to create hiring drive' });
    }
  }

  /**
   * Get hiring drive by ID
   */
  static async getHiringDrive(req: Request, res: Response): Promise<void> {
    try {
      const { driveId } = req.params;
      const hiringDrive = await HiringDrive.findById(driveId);

      if (!hiringDrive) {
        res.status(404).json({ error: 'Hiring drive not found' });
        return;
      }

      res.json(hiringDrive);
    } catch (error) {
      console.error('Error fetching hiring drive:', error);
      res.status(500).json({ error: 'Failed to fetch hiring drive' });
    }
  }

  /**
   * Get all hiring drives
   */
  static async getAllHiringDrives(req: Request, res: Response): Promise<void> {
    try {
      const hiringDrives = await HiringDrive.find().sort({ createdAt: -1 });
      res.json(hiringDrives);
    } catch (error) {
      console.error('Error fetching hiring drives:', error);
      res.status(500).json({ error: 'Failed to fetch hiring drives' });
    }
  }

  /**
   * Get dashboard statistics
   */
  static async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const { driveId } = req.params;
      const hiringDrive = await HiringDrive.findById(driveId);

      if (!hiringDrive) {
        res.status(404).json({ error: 'Hiring drive not found' });
        return;
      }

      const driveObj = JSON.parse(JSON.stringify(hiringDrive)) as HiringDriveT;

      const totalCandidates = driveObj.candidates.length;
      const totalInterviewers = driveObj.interviewers.length;
      
      const ongoingInterviews = driveObj.events.filter(
        e => e.status === EventStatus.ONGOING
      ).length;

      const candidatesWithDecisionPending = driveObj.candidates.filter(
        c => c.overallDecision === Decision.PENDING
      ).length;

      const completedCandidates = driveObj.candidates.filter(
        c => c.overallDecision !== Decision.PENDING
      ).length;
      const percentCompletedCandidates = totalCandidates > 0
        ? (completedCandidates * 100) / totalCandidates
        : 0;

      const selectedCandidates = driveObj.candidates.filter(
        c => c.overallDecision === Decision.YES || c.overallDecision === Decision.STRONG_YES
      ).length;
      const percentSelectedCandidates = totalCandidates > 0
        ? (selectedCandidates * 100) / totalCandidates
        : 0;

      const stats: DashboardStats = {
        totalCandidates,
        totalInterviewers,
        ongoingInterviews,
        candidatesWithDecisionPending,
        percentCompletedCandidates: Math.round(percentCompletedCandidates * 100) / 100,
        percentSelectedCandidates: Math.round(percentSelectedCandidates * 100) / 100
      };

      res.json(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  }

  /**
   * Receive notification response from interviewer or candidate
   */
  static async receiveNotificationResponse(req: Request, res: Response): Promise<void> {
    try {
      const {
        source,
        email,
        driveId,
        eventId,
        notificationType,
        data
      }: NotificationResponseRequest = req.body;

      console.log(`Received ${notificationType} response from ${source}: ${email} for drive ${driveId} event ${eventId}`);

      const hiringDrive = await HiringDrive.findById(driveId);

      if (!hiringDrive) {
        res.status(404).json({ error: 'Hiring drive not found' });
        return;
      }
      const event = hiringDrive.events.find(e => e.id === eventId);
      if (!event) {
        res.status(404).json({ error: 'Event not found in drive' });
        return;
      }

      // Handle different notification types
      switch (notificationType) {
        case 'scheduled_notif': {
          const scheduledData = data as ScheduledNotifData;
          
          if (!scheduledData.isAccepted) {
            console.log(`${source} ${email} rejected the scheduled interview for event ${eventId}`);
            // Cancel the event and trigger rescheduling
            event.status = EventStatus.SCHEDULED;
            // In a real scenario, you might want to mark this event as cancelled
            // and create a new one, but for now we'll just log it
            console.log('Event needs to be rescheduled (cancellation handling not implemented)');
          } else {
            console.log(`${source} ${email} accepted the scheduled interview for event ${eventId}`);
            // Do nothing as event is already scheduled
          }
          break;
        }

        case 'start_notif': {
          const startData = data as StartNotifData;
          
          if (startData.isStarted) {
            console.log(`Interview started for event ${eventId}`);
            event.status = EventStatus.ONGOING;
            
            // Update participant statuses
            const interviewer = hiringDrive.interviewers.find(i => i.email === event.interviewerEmail);
            const candidate = hiringDrive.candidates.find(c => c.email === event.candidateEmail);
            const driveObj = JSON.parse(JSON.stringify(hiringDrive)) as HiringDriveT;
            if (interviewer) {
              interviewer.currentStatus = StatusUpdateService.updateInterviewerStatus(interviewer, driveObj);
            }
            if (candidate) {
              candidate.currentStatus = StatusUpdateService.updateCandidateStatus(candidate, driveObj);
            }
            
            console.log(`Updated status to ONGOING for event ${eventId}`);
            console.log(`Interviewer ${interviewer?.email} status updated to: ${interviewer?.currentStatus}`);
            console.log(`Candidate ${candidate?.email} status updated to: ${candidate?.currentStatus}`);
          }
          break;
        }

        case 'completed_notif': {
          const completedData = data as CompletedNotifData;
          
          console.log(`Interview completed for event ${eventId} with decision: ${completedData.decision}`);
          
          // Update event with completion data
          event.status = EventStatus.COMPLETED;
          event.decision = completedData.decision;
          event.question = completedData.questionAsked;
          
          // Find candidate and interviewer
          const candidate = hiringDrive.candidates.find(c => c.email === event.candidateEmail);
          const interviewer = hiringDrive.interviewers.find(i => i.email === event.interviewerEmail);
          const driveObj = JSON.parse(JSON.stringify(hiringDrive)) as HiringDriveT;
          
          if (candidate) {
            // Update candidate status
            candidate.currentStatus = StatusUpdateService.updateCandidateStatus(candidate, driveObj);
            candidate.overallDecision = StatusUpdateService.updateCandidateOverallDecision(candidate, driveObj);  
            console.log(`Candidate ${candidate.email} completed all rounds. Overall decision: ${candidate.overallDecision}`);
          }
          
          if (interviewer) {
            // Handle interviewer break time or ready for next round
            if (completedData.isReadyForNextRound) {
              interviewer.currentStatus = StatusUpdateService.updateInterviewerStatus(interviewer, driveObj);
              console.log(`Interviewer ${interviewer.email} is ready for next round`);
            } else if (completedData.breakTime > 0) {
              console.log(`Interviewer ${interviewer.email} taking a ${completedData.breakTime} min break`);
              
              // Schedule status update after break
              setTimeout(async () => {
                try {
                  const updatedDrive = await HiringDrive.findById(driveId);
                  if (updatedDrive) {
                    const interviewerToUpdate = updatedDrive.interviewers.find(
                      i => i.email === interviewer.email
                    );
                    if (interviewerToUpdate) {
                      interviewerToUpdate.currentStatus =  StatusUpdateService.updateInterviewerStatus(interviewerToUpdate, JSON.parse(JSON.stringify(updatedDrive)) as HiringDriveT);
                      await HiringDriveController.saveWithRetry(updatedDrive);
                      console.log(`Interviewer ${interviewer.email} status updated to WAITING after break`);
                      
                      // Refetch to get latest version
                      const freshDrive = await HiringDrive.findById(driveId);
                      if (freshDrive) {
                        // Trigger scheduling algorithm after break
                        const driveObj = JSON.parse(JSON.stringify(freshDrive)) as HiringDriveT;
                        SchedulingService.scheduleInterviews(driveObj);
                        // Update the drive with any new events
                        freshDrive.events = driveObj.events;
                        await HiringDriveController.saveWithRetry(freshDrive);
                        console.log(`Updated drive with new events: ${freshDrive.events.length}`);
                      }
                    }
                  }
                } catch (timeoutErr) {
                  console.error(`Error updating interviewer status after break for ${interviewer.email}:`, timeoutErr);
                }
              }, completedData.breakTime * 60 * 1000);
            }
          }
          break;
        }

        default:
          res.status(400).json({ error: 'Invalid notification type' });
          return;
      }

      // Save the updated hiring drive with retry logic
      await HiringDriveController.saveWithRetry(hiringDrive);

      // Trigger scheduling algorithm if needed
      if (notificationType === 'completed_notif') {
        // Refetch to get latest version after save
        const freshDrive = await HiringDrive.findById(driveId);
        if (freshDrive) {
          const driveObj = JSON.parse(JSON.stringify(freshDrive)) as HiringDriveT;
          SchedulingService.scheduleInterviews(driveObj);
          
          // Update the drive with any new events
          freshDrive.events = driveObj.events;
          await HiringDriveController.saveWithRetry(freshDrive);
        }
      }

      res.json({ 
        success: true, 
        message: 'Notification response processed successfully',
        eventId: eventId
      });
    } catch (error) {
      console.error('Error processing notification response:', error);
      res.status(500).json({ error: 'Failed to process notification response' });
    }
  }
}

