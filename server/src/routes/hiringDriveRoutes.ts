import { Router } from 'express';
import { HiringDriveController } from '../controllers/hiringDriveController';

const router = Router();

// Create a new hiring drive
router.post('/hiring-drives', HiringDriveController.createHiringDrive);

// Get all hiring drives
router.get('/hiring-drives', HiringDriveController.getAllHiringDrives);

// Get a specific hiring drive
router.get('/hiring-drives/:driveId', HiringDriveController.getHiringDrive);

// Update an event (interviewer feedback)
router.patch('/hiring-drives/:driveId/events', HiringDriveController.updateEvent);

// Trigger scheduling manually
router.post('/hiring-drives/:driveId/schedule', HiringDriveController.triggerScheduling);

// Get dashboard statistics
router.get('/hiring-drives/:driveId/stats', HiringDriveController.getDashboardStats);

export default router;

