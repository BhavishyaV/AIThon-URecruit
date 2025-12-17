import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hiringDriveApi } from '../services/api';
import { parseInterviewersCSV, parseCandidatesCSV } from '../utils/csvParser';
import { InterviewerT, CandidateT, RoundT, RoundName } from '../types';
import './CreateHiringDrive.css';

const DEFAULT_ROUND_DURATION = 30;

const CreateHiringDrive: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Form state
  const [driveName, setDriveName] = useState('');
  const [driveStartTime, setDriveStartTime] = useState('');
  const [driveEndTime, setDriveEndTime] = useState('');
  const [rounds, setRounds] = useState<RoundT[]>([
    {
      roundName: RoundName.BPS,
      isElimination: true,
      isJobFamilyMatchingRequired: false,
      duration: DEFAULT_ROUND_DURATION
    }
  ]);
  const [interviewers, setInterviewers] = useState<InterviewerT[]>([]);
  const [candidates, setCandidates] = useState<CandidateT[]>([]);

  const handleAddRound = () => {
    setRounds([
      ...rounds,
      {
        roundName: RoundName.CODING1,
        isElimination: false,
        isJobFamilyMatchingRequired: false,
        duration: DEFAULT_ROUND_DURATION
      }
    ]);
  };

  const handleRemoveRound = (index: number) => {
    setRounds(rounds.filter((_, i) => i !== index));
  };

  const handleRoundChange = (index: number, field: keyof RoundT, value: any) => {
    const newRounds = [...rounds];
    newRounds[index] = { ...newRounds[index], [field]: value };
    setRounds(newRounds);
  };

  const handleInterviewersFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedInterviewers = await parseInterviewersCSV(file);
      setInterviewers(parsedInterviewers);
      setError('');
    } catch (err) {
      setError('Failed to parse interviewers CSV. Please check the format.');
      console.error(err);
    }
  };

  const handleCandidatesFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedCandidates = await parseCandidatesCSV(file);
      setCandidates(parsedCandidates);
      setError('');
    } catch (err) {
      setError('Failed to parse candidates CSV. Please check the format.');
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!driveName || !driveStartTime || !driveEndTime) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate end time is after start time
    if (new Date(driveEndTime) <= new Date(driveStartTime)) {
      setError('End time must be after start time');
      return;
    }

    if (rounds.length === 0) {
      setError('Please add at least one round');
      return;
    }

    if (interviewers.length === 0) {
      setError('Please upload interviewers CSV');
      return;
    }

    if (candidates.length === 0) {
      setError('Please upload candidates CSV');
      return;
    }

    setLoading(true);

    try {
      // Convert datetime-local values to ISO timestamps
      const startTimestamp = new Date(driveStartTime).toISOString();
      const endTimestamp = new Date(driveEndTime).toISOString();

      const hiringDrive = await hiringDriveApi.createHiringDrive({
        driveName,
        driveStartTime: startTimestamp,
        driveEndTime: endTimestamp,
        rounds,
        interviewers,
        candidates
      });

      navigate(`/${hiringDrive._id}`);
    } catch (err) {
      setError('Failed to create hiring drive. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-hiring-drive">
      <div className="container">
        <h1>Create Hiring Drive</h1>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h2>Basic Information</h2>
            
            <div className="form-group">
              <label htmlFor="driveName">Drive Name *</label>
              <input
                type="text"
                id="driveName"
                value={driveName}
                onChange={(e) => setDriveName(e.target.value)}
                placeholder="e.g., Engineering Hiring Drive Q1 2024"
                required
              />
            </div>

            <div className="datetime-row">
              <div className="form-group datetime-group">
                <label htmlFor="startTime">Start Date & Time *</label>
                <input
                  type="datetime-local"
                  id="startTime"
                  value={driveStartTime}
                  onChange={(e) => setDriveStartTime(e.target.value)}
                  required
                />
                <div className="datetime-hint">
                  When does the hiring drive begin?
                </div>
              </div>

              <div className="form-group datetime-group">
                <label htmlFor="endTime">End Date & Time *</label>
                <input
                  type="datetime-local"
                  id="endTime"
                  value={driveEndTime}
                  onChange={(e) => setDriveEndTime(e.target.value)}
                  required
                />
                <div className="datetime-hint">
                  When does the hiring drive end?
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Rounds Configuration</h2>
            
            {rounds.map((round, index) => (
              <div key={index} className="round-item">
                <div className="form-row">
                  <div className="form-group">
                    <label>Round Name</label>
                    <select
                      value={round.roundName}
                      onChange={(e) =>
                        handleRoundChange(index, 'roundName', e.target.value as RoundName)
                      }
                    >
                      {Object.values(RoundName).map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={round.isElimination}
                        onChange={(e) =>
                          handleRoundChange(index, 'isElimination', e.target.checked)
                        }
                      />
                      Elimination Round
                    </label>
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={round.isJobFamilyMatchingRequired}
                        onChange={(e) =>
                          handleRoundChange(index, 'isJobFamilyMatchingRequired', e.target.checked)
                        }
                      />
                      Job Family Matching Required
                    </label>
                  </div>

                  {rounds.length > 1 && (
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => handleRemoveRound(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button type="button" className="btn-secondary" onClick={handleAddRound}>
              + Add Round
            </button>
          </div>

          <div className="form-section">
            <h2>Upload Data</h2>
            
            <div className="upload-row">
              <div className="form-group">
                <label htmlFor="interviewersFile">Interviewers CSV *</label>
                <input
                  type="file"
                  id="interviewersFile"
                  accept=".csv"
                  onChange={handleInterviewersFile}
                />
                {interviewers.length > 0 && (
                  <p className="file-info">✓ {interviewers.length} interviewers loaded</p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="candidatesFile">Candidates CSV *</label>
                <input
                  type="file"
                  id="candidatesFile"
                  accept=".csv"
                  onChange={handleCandidatesFile}
                />
                {candidates.length > 0 && (
                  <p className="file-info">✓ {candidates.length} candidates loaded</p>
                )}
              </div>
            </div>

            <div className="csv-format-info">
              <h3>CSV Format Requirements:</h3>
              <div className="csv-columns">
                <div>
                  <strong>Interviewers CSV:</strong>
                  <ul>
                    <li>Interviewer Email</li>
                    <li>Interviewer Name</li>
                    <li>Rounds Eligible (comma-separated)</li>
                    <li>Available Slot Start (YYYY-MM-DD HH:MM)</li>
                    <li>Available Slot End (YYYY-MM-DD HH:MM)</li>
                    <li>Level</li>
                    <li>Job Family</li>
                    <li>Max Interviews</li>
                  </ul>
                </div>
                <div>
                  <strong>Candidates CSV:</strong>
                  <ul>
                    <li>Candidate Email</li>
                    <li>Candidate Name</li>
                    <li>Resume Link</li>
                    <li>Job Family</li>
                    <li>Level</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/')}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Hiring Drive'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateHiringDrive;

