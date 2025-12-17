import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { hiringDriveApi } from '../services/api';
import { HiringDriveT, DashboardStats, EventT, EventStatus, Decision } from '../types';
import EventModal from '../components/EventModal';
import './Dashboard.css';

type TabType = 'timeline' | 'candidates' | 'interviewers';

const Dashboard: React.FC = () => {
  const { driveId } = useParams<{ driveId: string }>();
  const [drive, setDrive] = useState<HiringDriveT | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventT | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [interviewerSearch, setInterviewerSearch] = useState('');

  const fetchData = useCallback(async () => {
    if (!driveId) return;

    try {
      const [driveData, statsData] = await Promise.all([
        hiringDriveApi.getHiringDrive(driveId),
        hiringDriveApi.getDashboardStats(driveId)
      ]);

      setDrive(driveData);
      setStats(statsData);
      setError('');
    } catch (err) {
      setError('Failed to load hiring drive data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [driveId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, 60000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const handleManualRefresh = () => {
    setLoading(true);
    fetchData();
  };

  const handleTriggerScheduling = async () => {
    if (!driveId) return;

    try {
      await hiringDriveApi.triggerScheduling(driveId);
      fetchData();
    } catch (err) {
      setError('Failed to trigger scheduling');
      console.error(err);
    }
  };

  const getEventColor = (event: EventT): string => {
    if (event.status === EventStatus.COMPLETED) {
      return '#48bb78'; // Green for completed
    } else if (event.status === EventStatus.ONGOING) {
      return '#4299e1'; // Blue for ongoing
    }
    return '#ed8936'; // Orange for scheduled
  };

  const getEventWidth = (duration: number, startTime: string, endTime: string): number => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    return (duration / totalMinutes) * 100;
  };

  const getInterviewerSlotPosition = (slotStart: string, driveStartTime: string, driveEndTime: string): { left: number; width: number } => {
    const [driveStartHour, driveStartMin] = driveStartTime.split(':').map(Number);
    const [driveEndHour, driveEndMin] = driveEndTime.split(':').map(Number);
    const [slotStartHour, slotStartMin] = slotStart.split(':').map(Number);
    
    const driveStartTotal = driveStartHour * 60 + driveStartMin;
    const driveEndTotal = driveEndHour * 60 + driveEndMin;
    const slotStartTotal = slotStartHour * 60 + slotStartMin;
    
    const totalMinutes = driveEndTotal - driveStartTotal;
    const left = ((slotStartTotal - driveStartTotal) / totalMinutes) * 100;
    
    return { left: Math.max(0, left), width: 0 };
  };

  const getInterviewerSlotWidth = (slotStart: string, slotEnd: string, driveStartTime: string, driveEndTime: string): number => {
    const [driveStartHour, driveStartMin] = driveStartTime.split(':').map(Number);
    const [driveEndHour, driveEndMin] = driveEndTime.split(':').map(Number);
    const [slotStartHour, slotStartMin] = slotStart.split(':').map(Number);
    const [slotEndHour, slotEndMin] = slotEnd.split(':').map(Number);
    
    const driveStartTotal = driveStartHour * 60 + driveStartMin;
    const driveEndTotal = driveEndHour * 60 + driveEndMin;
    const slotStartTotal = slotStartHour * 60 + slotStartMin;
    const slotEndTotal = slotEndHour * 60 + slotEndMin;
    
    const totalMinutes = driveEndTotal - driveStartTotal;
    const slotDuration = slotEndTotal - slotStartTotal;
    
    return (slotDuration / totalMinutes) * 100;
  };

  const getTimePosition = (time: string, startTime: string, endTime: string): number => {
    const eventDate = new Date(time);
    const eventHour = eventDate.getHours();
    const eventMin = eventDate.getMinutes();
    const eventTotalMin = eventHour * 60 + eventMin;

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startTotalMin = startHour * 60 + startMin;
    const endTotalMin = endHour * 60 + endMin;

    const position = ((eventTotalMin - startTotalMin) / (endTotalMin - startTotalMin)) * 100;
    return Math.max(0, Math.min(100, position));
  };

  const generateTimeIntervals = (startTime: string, endTime: string): string[] => {
    const intervals: string[] = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMin = startMin;
    
    while (currentHour < endHour || (currentHour === endHour && currentMin <= endMin)) {
      const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
      intervals.push(timeStr);
      
      currentMin += 30;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour++;
      }
    }
    
    return intervals;
  };

  if (loading && !drive) {
    return (
      <div className="dashboard loading">
        <div className="spinner"></div>
        <p>Loading hiring drive...</p>
      </div>
    );
  }

  if (error && !drive) {
    return (
      <div className="dashboard error">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!drive || !stats) {
    return (
      <div className="dashboard error">
        <h2>Hiring drive not found</h2>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>{drive.driveName}</h1>
          <p className="drive-details">
            {drive.date} | {drive.driveStartTime} - {drive.driveEndTime}
          </p>
        </div>
        <div className="header-actions">
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (1 min)
          </label>
          <button onClick={handleManualRefresh} className="btn-refresh">
            🔄 Refresh
          </button>
          <button onClick={handleTriggerScheduling} className="btn-schedule">
            ⚡ Trigger Scheduling
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalCandidates}</div>
          <div className="stat-label">Total Candidates</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalInterviewers}</div>
          <div className="stat-label">Total Interviewers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.ongoingInterviews}</div>
          <div className="stat-label">Ongoing Interviews</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.candidatesWithDecisionPending}</div>
          <div className="stat-label">Pending Decisions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.percentCompletedCandidates.toFixed(1)}%</div>
          <div className="stat-label">Completed Candidates</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.percentSelectedCandidates.toFixed(1)}%</div>
          <div className="stat-label">Selected Candidates</div>
        </div>
      </div>

      <div className="timeline-section">
        <div className="tabs-container">
          <button 
            className={`tab ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            Interview Timeline
          </button>
          <button 
            className={`tab ${activeTab === 'candidates' ? 'active' : ''}`}
            onClick={() => setActiveTab('candidates')}
          >
            Candidate View
          </button>
          <button 
            className={`tab ${activeTab === 'interviewers' ? 'active' : ''}`}
            onClick={() => setActiveTab('interviewers')}
          >
            Interviewer View
          </button>
        </div>

        {activeTab === 'timeline' && (
          <>
            <div className="timeline-legend">
              <span><span className="legend-dot scheduled"></span> Scheduled</span>
              <span><span className="legend-dot ongoing"></span> Ongoing</span>
              <span><span className="legend-dot completed"></span> Completed</span>
            </div>

            <div className="timeline-container">
          <div className="timeline-header">
            <div className="timeline-label">Interviewer</div>
            <div className="timeline-track">
              <div className="time-grid">
                {generateTimeIntervals(drive.driveStartTime, drive.driveEndTime).map((time, idx) => {
                  const [hour, min] = time.split(':').map(Number);
                  const [startHour, startMin] = drive.driveStartTime.split(':').map(Number);
                  const [endHour, endMin] = drive.driveEndTime.split(':').map(Number);
                  
                  const timeTotal = hour * 60 + min;
                  const startTotal = startHour * 60 + startMin;
                  const endTotal = endHour * 60 + endMin;
                  
                  const position = ((timeTotal - startTotal) / (endTotal - startTotal)) * 100;
                  
                  return (
                    <div key={idx} className="time-grid-line" style={{ left: `${position}%` }}></div>
                  );
                })}
              </div>
              <div className="time-labels">
                {generateTimeIntervals(drive.driveStartTime, drive.driveEndTime).map((time, idx) => {
                  const [hour, min] = time.split(':').map(Number);
                  const [startHour, startMin] = drive.driveStartTime.split(':').map(Number);
                  const [endHour, endMin] = drive.driveEndTime.split(':').map(Number);
                  
                  const timeTotal = hour * 60 + min;
                  const startTotal = startHour * 60 + startMin;
                  const endTotal = endHour * 60 + endMin;
                  
                  const position = ((timeTotal - startTotal) / (endTotal - startTotal)) * 100;
                  
                  return (
                    <span key={idx} style={{ left: `${position}%` }}>{time}</span>
                  );
                })}
              </div>
            </div>
          </div>

          {drive.interviewers.map((interviewer) => {
            const interviewerEvents = drive.events.filter(
              (event) => event.interviewerEmail === interviewer.email
            );

            return (
              <div key={interviewer.email} className="timeline-row">
                <div className="timeline-label">
                  <div className="candidate-name">{interviewer.fullName}</div>
                  <div className="candidate-status">
                    <span className={`status-badge ${interviewer.currentStatus.toLowerCase()}`}>
                      {interviewer.currentStatus}
                    </span>
                  </div>
                </div>
                <div className="timeline-track">
                  <div className="time-grid">
                    {generateTimeIntervals(drive.driveStartTime, drive.driveEndTime).map((time, idx) => {
                      const [hour, min] = time.split(':').map(Number);
                      const [startHour, startMin] = drive.driveStartTime.split(':').map(Number);
                      const [endHour, endMin] = drive.driveEndTime.split(':').map(Number);
                      
                      const timeTotal = hour * 60 + min;
                      const startTotal = startHour * 60 + startMin;
                      const endTotal = endHour * 60 + endMin;
                      
                      const position = ((timeTotal - startTotal) / (endTotal - startTotal)) * 100;
                      
                      return (
                        <div key={idx} className="time-grid-line" style={{ left: `${position}%` }}></div>
                      );
                    })}
                  </div>
                  <div 
                    className="interviewer-slot"
                    style={{
                      left: `${getInterviewerSlotPosition(interviewer.slotStart, drive.driveStartTime, drive.driveEndTime).left}%`,
                      width: `${getInterviewerSlotWidth(interviewer.slotStart, interviewer.slotEnd, drive.driveStartTime, drive.driveEndTime)}%`
                    }}
                  ></div>
                  {interviewerEvents.map((event) => {
                    const position = getTimePosition(
                      event.startTime,
                      drive.driveStartTime,
                      drive.driveEndTime
                    );
                    const width = getEventWidth(
                      event.duration,
                      drive.driveStartTime,
                      drive.driveEndTime
                    );

                    const candidate = drive.candidates.find(c => c.email === event.candidateEmail);

                    return (
                      <div
                        key={event.id}
                        className="event-card"
                        style={{
                          left: `${position}%`,
                          width: `${width}%`,
                          backgroundColor: getEventColor(event)
                        }}
                        onClick={() => setSelectedEvent(event)}
                        title={`${candidate?.fullName} - ${event.round.roundName} - ${event.status}`}
                      >
                        <div className="event-content">
                          <div className="event-candidate">{candidate?.fullName}</div>
                          <div className="event-badges">
                            <span className={`event-badge round-badge`}>
                              {event.round.roundName}
                            </span>
                            <span className={`event-badge status-${event.status.toLowerCase()}`}>
                              {event.status.substring(0, 4)}
                            </span>
                            {event.decision !== 'PENDING' && (
                              <span className={`event-badge decision-${event.decision.toLowerCase()}`}>
                                {event.decision === 'STRONG_YES' ? 'S-YES' : 
                                 event.decision === 'STRONG_NO' ? 'S-NO' : 
                                 event.decision}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
            </div>
          </>
        )}

        {activeTab === 'candidates' && (
          <div className="view-container">
            <div className="view-header">
              <h3>Candidates</h3>
              <input
                type="text"
                className="search-input"
                placeholder="Search by name, email, level, job family, status, or overall decision..."
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
              />
            </div>
            <div className="list-view">
              {(() => {
                const filteredCandidates = drive.candidates.filter((candidate) => {
                  const searchLower = candidateSearch.toLowerCase();
                  return (
                    candidate.email.toLowerCase().includes(searchLower) ||
                    candidate.level.toLowerCase().includes(searchLower) ||
                    candidate.jobFamily.toLowerCase().includes(searchLower) ||
                    candidate.currentStatus.toLowerCase().includes(searchLower) ||
                    candidate.overallDecision.toLowerCase().includes(searchLower) ||
                    candidate.fullName.toLowerCase().includes(searchLower)
                  );
                });

                if (filteredCandidates.length === 0) {
                  return (
                    <div className="empty-state">
                      <div className="empty-icon">🔍</div>
                      <p>No candidates found matching your search criteria.</p>
                    </div>
                  );
                }

                return filteredCandidates.map((candidate) => {
                const candidateEvents = drive.events.filter(
                  (event) => event.candidateEmail === candidate.email
                );
                const completedEvents = candidateEvents.filter(e => e.status === EventStatus.COMPLETED);
                const progress = drive.rounds.length > 0 
                  ? (completedEvents.length / drive.rounds.length) * 100 
                  : 0;

                return (
                  <div key={candidate.email} className="list-card">
                    <div className="card-header">
                      <div>
                        <h4>{candidate.fullName}</h4>
                        <p className="card-email">{candidate.email}</p>
                      </div>
                      <div className="header-badges">
                        <span className={`status-badge ${candidate.currentStatus.toLowerCase()}`}>
                          {candidate.currentStatus}
                        </span>
                        <span className={`decision-badge ${candidate.overallDecision.toLowerCase()}`}>
                          {candidate.overallDecision === 'STRONG_YES' ? 'STRONG YES' :
                           candidate.overallDecision === 'STRONG_NO' ? 'STRONG NO' :
                           candidate.overallDecision}
                        </span>
                      </div>
                    </div>
                    <div className="card-details">
                      <div className="detail-row">
                        <span className="detail-label">Level:</span>
                        <span className="detail-value">{candidate.level}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Job Family:</span>
                        <span className="detail-value">{candidate.jobFamily}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Resume:</span>
                        <a 
                          href={candidate.resume} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="resume-link"
                        >
                          📄 View Resume
                        </a>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Progress:</span>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                          <span className="progress-text">{completedEvents.length}/{drive.rounds.length} rounds</span>
                        </div>
                      </div>
                    </div>
                    {candidateEvents.length > 0 && (
                      <div className="card-events">
                        <strong>Events:</strong>
                        <div className="event-list">
                          {candidateEvents.map((event) => {
                            const interviewer = drive.interviewers.find(i => i.email === event.interviewerEmail);
                            const eventTime = new Date(event.startTime);
                            return (
                              <div 
                                key={event.id} 
                                className="event-item"
                                onClick={() => setSelectedEvent(event)}
                              >
                                <div className="event-time">
                                  {eventTime.toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </div>
                                <div className="event-info">
                                  <div className="event-round">{event.round.roundName}</div>
                                  <div className="event-interviewer">with {interviewer?.fullName}</div>
                                </div>
                                <div className="event-badges-inline">
                                  <span className={`badge-sm status-${event.status.toLowerCase()}`}>
                                    {event.status}
                                  </span>
                                  {event.decision !== Decision.PENDING && (
                                    <span className={`badge-sm decision-${event.decision.toLowerCase()}`}>
                                      {event.decision}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })})()}
            </div>
          </div>
        )}

        {activeTab === 'interviewers' && (
          <div className="view-container">
            <div className="view-header">
              <h3>Interviewers</h3>
              <input
                type="text"
                className="search-input"
                placeholder="Search by name, email, level, job family, or status..."
                value={interviewerSearch}
                onChange={(e) => setInterviewerSearch(e.target.value)}
              />
            </div>
            <div className="list-view">
              {(() => {
                const filteredInterviewers = drive.interviewers.filter((interviewer) => {
                  const searchLower = interviewerSearch.toLowerCase();
                  return (
                    interviewer.email.toLowerCase().includes(searchLower) ||
                    interviewer.level.toLowerCase().includes(searchLower) ||
                    interviewer.jobFamily.toLowerCase().includes(searchLower) ||
                    interviewer.currentStatus.toLowerCase().includes(searchLower) ||
                    interviewer.fullName.toLowerCase().includes(searchLower)
                  );
                });

                if (filteredInterviewers.length === 0) {
                  return (
                    <div className="empty-state">
                      <div className="empty-icon">🔍</div>
                      <p>No interviewers found matching your search criteria.</p>
                    </div>
                  );
                }

                return filteredInterviewers.map((interviewer) => {
                const interviewerEvents = drive.events.filter(
                  (event) => event.interviewerEmail === interviewer.email
                );
                const completedEvents = interviewerEvents.filter(e => e.status === EventStatus.COMPLETED);
                const utilizationRate = interviewer.maxInterviews > 0
                  ? (interviewerEvents.length / interviewer.maxInterviews) * 100
                  : 0;

                return (
                  <div key={interviewer.email} className="list-card">
                    <div className="card-header">
                      <div>
                        <h4>{interviewer.fullName}</h4>
                        <p className="card-email">{interviewer.email}</p>
                      </div>
                      <span className={`status-badge ${interviewer.currentStatus.toLowerCase()}`}>
                        {interviewer.currentStatus}
                      </span>
                    </div>
                    <div className="card-details">
                      <div className="detail-row">
                        <span className="detail-label">Level:</span>
                        <span className="detail-value">{interviewer.level}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Job Family:</span>
                        <span className="detail-value">{interviewer.jobFamily}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Available Slot:</span>
                        <span className="detail-value">{interviewer.slotStart} - {interviewer.slotEnd}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Max Interviews:</span>
                        <span className="detail-value">{interviewer.maxInterviews}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Utilization:</span>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ 
                              width: `${Math.min(utilizationRate, 100)}%`,
                              backgroundColor: utilizationRate > 100 ? '#f56565' : '#667eea'
                            }}
                          ></div>
                          <span className="progress-text">
                            {interviewerEvents.length}/{interviewer.maxInterviews} ({utilizationRate.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                    {interviewerEvents.length > 0 && (
                      <div className="card-events">
                        <strong>Events ({completedEvents.length}/{interviewerEvents.length} completed):</strong>
                        <div className="event-list">
                          {interviewerEvents.map((event) => {
                            const candidate = drive.candidates.find(c => c.email === event.candidateEmail);
                            const eventTime = new Date(event.startTime);
                            return (
                              <div 
                                key={event.id} 
                                className="event-item"
                                onClick={() => setSelectedEvent(event)}
                              >
                                <div className="event-time">
                                  {eventTime.toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </div>
                                <div className="event-info">
                                  <div className="event-round">{event.round.roundName}</div>
                                  <div className="event-interviewer">with {candidate?.fullName}</div>
                                </div>
                                <div className="event-badges-inline">
                                  <span className={`badge-sm status-${event.status.toLowerCase()}`}>
                                    {event.status}
                                  </span>
                                  {event.decision !== Decision.PENDING && (
                                    <span className={`badge-sm decision-${event.decision.toLowerCase()}`}>
                                      {event.decision}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })})()}
            </div>
          </div>
        )}
      </div>

      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          drive={drive}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;

