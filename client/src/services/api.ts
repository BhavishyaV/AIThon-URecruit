import axios from 'axios';
import {
  HiringDriveT,
  CreateHiringDriveRequest,
  UpdateEventRequest,
  DashboardStats
} from '../types';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const hiringDriveApi = {
  // Create a new hiring drive
  createHiringDrive: async (data: CreateHiringDriveRequest): Promise<HiringDriveT> => {
    const response = await api.post<HiringDriveT>('/hiring-drives', data);
    return response.data;
  },

  // Get all hiring drives
  getAllHiringDrives: async (): Promise<HiringDriveT[]> => {
    const response = await api.get<HiringDriveT[]>('/hiring-drives');
    return response.data;
  },

  // Get a specific hiring drive
  getHiringDrive: async (driveId: string): Promise<HiringDriveT> => {
    const response = await api.get<HiringDriveT>(`/hiring-drives/${driveId}`);
    return response.data;
  },

  // Update an event
  updateEvent: async (driveId: string, data: UpdateEventRequest): Promise<HiringDriveT> => {
    const response = await api.patch<HiringDriveT>(`/hiring-drives/${driveId}/events`, data);
    return response.data;
  },

  // Trigger scheduling
  triggerScheduling: async (driveId: string): Promise<{ message: string; newEventsCount: number }> => {
    const response = await api.post(`/hiring-drives/${driveId}/schedule`);
    return response.data;
  },

  // Get dashboard statistics
  getDashboardStats: async (driveId: string): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>(`/hiring-drives/${driveId}/stats`);
    return response.data;
  }
};

