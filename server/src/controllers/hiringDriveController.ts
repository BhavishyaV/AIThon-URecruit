import { Request, Response } from 'express';
import { HiringDrive } from '../models/HiringDrive';
import { SchedulingService } from '../services/schedulingService';
import { StatusUpdateService } from '../services/statusUpdateService';
import { NotificationService } from '../services/notificationService';
import {
  CreateHiringDriveRequest,
  UpdateEventRequest,
  DashboardStats,
  Decision,
  EventStatus,
  ParticipantStatus,
  HiringDriveT
} from '../../../shared/types';

export class HiringDriveController {
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
      const newEvents = SchedulingService.scheduleInterviews(driveObj);

      // Update drive with new events
      hiringDrive.events = driveObj.events;
      await hiringDrive.save();

      // Send notifications for scheduled events
      for (const event of newEvents) {
        const interviewer = driveObj.interviewers.find(
          i => i.email === event.interviewerEmail
        );
        const candidate = driveObj.candidates.find(
          c => c.email === event.candidateEmail
        );

        if (interviewer && candidate) {
          NotificationService.sendInterviewerScheduledNotification(event, interviewer);
          NotificationService.sendCandidateScheduledNotification(event, candidate);
        }
      }

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
   * Update event (when interviewer provides feedback)
   */
  static async updateEvent(req: Request, res: Response): Promise<void> {
    try {
      const { driveId } = req.params;
      const updateData: UpdateEventRequest = req.body;

      const hiringDrive = await HiringDrive.findById(driveId);
      if (!hiringDrive) {
        res.status(404).json({ error: 'Hiring drive not found' });
        return;
      }

      const driveObj = JSON.parse(JSON.stringify(hiringDrive)) as HiringDriveT;
      const event = driveObj.events.find(e => e.id === updateData.eventId);
      
      if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }

      // Update event
      if (updateData.decision) event.decision = updateData.decision;
      if (updateData.question) event.question = updateData.question;
      if (updateData.status) event.status = updateData.status;

      // Update interviewer status based on response
      const interviewer = driveObj.interviewers.find(
        i => i.email === event.interviewerEmail
      );
      
      if (interviewer && updateData.readyForNext !== undefined) {
        if (updateData.readyForNext) {
          interviewer.currentStatus = ParticipantStatus.WAITING;
        } else {
          // interviewer.currentStatus is already BUSY, no need to set again
          // Schedule updating status to WAITING after break time
          if (updateData.breakTime && updateData.breakTime > 0) {
            const breakTimeMs = updateData.breakTime * 60 * 1000; // Convert minutes to milliseconds
            
            setTimeout(async () => {
              try {
                const drive = await HiringDrive.findById(driveId);
                if (drive) {
                  const interviewerToUpdate = drive.interviewers.find(
                    (i) => i.email === event.interviewerEmail
                  );
                  if (interviewerToUpdate && interviewerToUpdate.currentStatus === ParticipantStatus.BUSY) {
                    interviewerToUpdate.currentStatus = ParticipantStatus.WAITING;
                    await drive.save();
                    console.log(`Updated interviewer ${event.interviewerEmail} status to WAITING after break`);
                    
                    // Trigger scheduling after status update
                    const updatedDrive = JSON.parse(JSON.stringify(drive)) as HiringDriveT;
                    SchedulingService.scheduleInterviews(updatedDrive);
                    await drive.save();
                  }
                }
              } catch (error) {
                console.error('Error updating interviewer status after break:', error);
              }
            }, breakTimeMs);
            
            console.log(`Scheduled status update for interviewer ${event.interviewerEmail} after ${updateData.breakTime} minutes`);
          }
        }
      }

      // Update candidate status
      const candidate = driveObj.candidates.find(
        c => c.email === event.candidateEmail
      );
      
      if (candidate) {
        candidate.currentStatus = ParticipantStatus.WAITING;
        
        // Update candidate overall decision
        candidate.overallDecision = StatusUpdateService.updateCandidateOverallDecision(
          candidate,
          driveObj
        );
        
        // Update candidate status
        candidate.currentStatus = StatusUpdateService.updateCandidateStatus(
          candidate,
          driveObj,
          new Date()
        );
      }

      // Update the hiring drive in database
      hiringDrive.events = driveObj.events;
      hiringDrive.interviewers = driveObj.interviewers;
      hiringDrive.candidates = driveObj.candidates;
      await hiringDrive.save();

      // Run scheduling algorithm to schedule next interviews
      const newEvents = SchedulingService.scheduleInterviews(driveObj);
      
      if (newEvents.length > 0) {
        hiringDrive.events = driveObj.events;
        await hiringDrive.save();

        // Send notifications
        for (const newEvent of newEvents) {
          const newInterviewer = driveObj.interviewers.find(
            i => i.email === newEvent.interviewerEmail
          );
          const newCandidate = driveObj.candidates.find(
            c => c.email === newEvent.candidateEmail
          );

          if (newInterviewer && newCandidate) {
            NotificationService.sendInterviewerScheduledNotification(newEvent, newInterviewer);
            NotificationService.sendCandidateScheduledNotification(newEvent, newCandidate);
          }
        }
      }

      res.json(hiringDrive);
    } catch (error) {
      console.error('Error updating event:', error);
      res.status(500).json({ error: 'Failed to update event' });
    }
  }

  /**
   * Trigger scheduling manually
   */
  static async triggerScheduling(req: Request, res: Response): Promise<void> {
    try {
      const { driveId } = req.params;
      const hiringDrive = await HiringDrive.findById(driveId);

      if (!hiringDrive) {
        res.status(404).json({ error: 'Hiring drive not found' });
        return;
      }

      const driveObj = JSON.parse(JSON.stringify(hiringDrive)) as HiringDriveT;
      
      // Update all statuses first
      const currentTime = new Date();
      for (const interviewer of driveObj.interviewers) {
        interviewer.currentStatus = StatusUpdateService.updateInterviewerStatus(
          interviewer,
          driveObj,
          currentTime
        );
      }

      for (const candidate of driveObj.candidates) {
        candidate.currentStatus = StatusUpdateService.updateCandidateStatus(
          candidate,
          driveObj,
          currentTime
        );
      }

      // Run scheduling
      const newEvents = SchedulingService.scheduleInterviews(driveObj);

      // Update drive
      hiringDrive.events = driveObj.events;
      hiringDrive.interviewers = driveObj.interviewers;
      hiringDrive.candidates = driveObj.candidates;
      await hiringDrive.save();

      // Send notifications
      for (const event of newEvents) {
        const interviewer = driveObj.interviewers.find(
          i => i.email === event.interviewerEmail
        );
        const candidate = driveObj.candidates.find(
          c => c.email === event.candidateEmail
        );

        if (interviewer && candidate) {
          NotificationService.sendInterviewerScheduledNotification(event, interviewer);
          NotificationService.sendCandidateScheduledNotification(event, candidate);
        }
      }

      res.json({ message: 'Scheduling triggered successfully', newEventsCount: newEvents.length });
    } catch (error) {
      console.error('Error triggering scheduling:', error);
      res.status(500).json({ error: 'Failed to trigger scheduling' });
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
}

