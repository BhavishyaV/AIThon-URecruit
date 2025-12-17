import React from 'react';
import { EventT, HiringDriveT } from '../types';
import './EventModal.css';

interface EventModalProps {
  event: EventT;
  drive: HiringDriveT;
  onClose: () => void;
}

const EventModal: React.FC<EventModalProps> = ({ event, drive, onClose }) => {
  const candidate = drive.candidates.find(c => c.email === event.candidateEmail);
  const interviewer = drive.interviewers.find(i => i.email === event.interviewerEmail);

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Interview Details</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="info-section">
            <h3>Round Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Round</span>
                <span className="info-value">{event.round.roundName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className={`info-value status-badge ${event.status.toLowerCase()}`}>
                  {event.status}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Decision</span>
                <span className={`info-value decision-badge ${event.decision.toLowerCase()}`}>
                  {event.decision}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Duration</span>
                <span className="info-value">{event.duration} minutes</span>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3>Schedule</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Start Time</span>
                <span className="info-value">{formatDateTime(event.startTime)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Event ID</span>
                <span className="info-value event-id">{event.id}</span>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3>Candidate</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Name</span>
                <span className="info-value">{candidate?.fullName || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email</span>
                <span className="info-value">{event.candidateEmail}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Level</span>
                <span className="info-value">{candidate?.level || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Job Family</span>
                <span className="info-value">{candidate?.jobFamily || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3>Interviewer</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Name</span>
                <span className="info-value">{interviewer?.fullName || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email</span>
                <span className="info-value">{event.interviewerEmail}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Level</span>
                <span className="info-value">{interviewer?.level || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Job Family</span>
                <span className="info-value">{interviewer?.jobFamily || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3>Links</h3>
            <div className="links-grid">
              <a
                href={event.zoomLink}
                target="_blank"
                rel="noopener noreferrer"
                className="link-button zoom"
              >
                🎥 Zoom Link
              </a>
              <a
                href={event.hackerRankLink}
                target="_blank"
                rel="noopener noreferrer"
                className="link-button hackerrank"
              >
                💻 HackerRank
              </a>
              <a
                href={event.scorecardLink}
                target="_blank"
                rel="noopener noreferrer"
                className="link-button scorecard"
              >
                📋 Scorecard
              </a>
              {candidate?.resume && (
                <a
                  href={candidate.resume}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-button resume"
                >
                  📄 Resume
                </a>
              )}
            </div>
          </div>

          {event.question && (
            <div className="info-section">
              <h3>Question Asked</h3>
              <p className="question-text">{event.question}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventModal;

