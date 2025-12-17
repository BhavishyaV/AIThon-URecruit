import mongoose, { Schema, Document } from 'mongoose';
import {
  HiringDriveT,
  Decision,
  EventStatus,
  ParticipantStatus,
  RoundName
} from '../../../shared/types';

export interface IHiringDrive extends Omit<HiringDriveT, '_id'>, Document {}

const RoundSchema = new Schema({
  roundName: {
    type: String,
    enum: Object.values(RoundName),
    required: true
  },
  duration: { type: Number, required: true },
  isElimination: { type: Boolean, required: true },
  isJobFamilyMatchingRequired: { type: Boolean, required: true }
}, { _id: false });

const InterviewerSchema = new Schema({
  email: { type: String, required: true },
  fullName: { type: String, required: true },
  level: { type: String, required: true },
  jobFamily: { type: String, required: true },
  eligibility: {
    type: Map,
    of: Boolean,
    required: true
  },
  maxInterviews: { type: Number, required: true },
  slotStart: { type: String, required: true },
  slotEnd: { type: String, required: true },
  currentStatus: {
    type: String,
    enum: Object.values(ParticipantStatus),
    default: ParticipantStatus.WAITING
  }
}, { _id: false });

const CandidateSchema = new Schema({
  email: { type: String, required: true },
  fullName: { type: String, required: true },
  resume: { type: String, required: true },
  jobFamily: { type: String, required: true },
  level: { type: String, required: true },
  overallDecision: {
    type: String,
    enum: Object.values(Decision),
    default: Decision.PENDING
  },
  currentStatus: {
    type: String,
    enum: Object.values(ParticipantStatus),
    default: ParticipantStatus.WAITING
  }
}, { _id: false });

const EventSchema = new Schema({
  id: { type: String, required: true },
  round: { type: RoundSchema, required: true },
  candidateEmail: { type: String, required: true },
  interviewerEmail: { type: String, required: true },
  startTime: { type: String, required: true },
  duration: { type: Number, required: true },
  status: {
    type: String,
    enum: Object.values(EventStatus),
    default: EventStatus.SCHEDULED
  },
  decision: {
    type: String,
    enum: Object.values(Decision),
    default: Decision.PENDING
  },
  zoomLink: { type: String, required: true },
  hackerRankLink: { type: String, required: true },
  scorecardLink: { type: String, required: true },
  question: { type: String, required: false }
}, { _id: false });

const HiringDriveSchema = new Schema({
  driveName: { type: String, required: true },
  date: { type: String, required: true },
  driveStartTime: { type: String, required: true },
  driveEndTime: { type: String, required: true },
  rounds: [RoundSchema],
  candidates: [CandidateSchema],
  interviewers: [InterviewerSchema],
  events: [EventSchema]
}, {
  timestamps: true
});

export const HiringDrive = mongoose.model<IHiringDrive>('HiringDrive', HiringDriveSchema);

