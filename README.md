# Hiring Drive Management System

A comprehensive system for managing technical hiring drives with automated interview scheduling, real-time dashboard, and candidate tracking.

## Features

### Backend (Node.js + Express + MongoDB)
- **Automated Scheduling Algorithm**: Intelligently matches candidates with interviewers based on:
  - Level matching (interviewer level >= candidate level)
  - Job family matching for specific rounds
  - Interviewer availability and capacity
  - Round eligibility
  - Fair distribution (prefers interviewers with lower completion rates)
  
- **Status Management**: Automatic updates for candidate and interviewer statuses
- **Event Tracking**: Complete interview lifecycle from scheduled to completed
- **RESTful API**: Clean API endpoints for all operations

### Frontend (React + TypeScript)
- **Create Hiring Drive**: Intuitive form with CSV upload for bulk data entry
- **Real-time Dashboard**: 
  - Statistics cards showing key metrics
  - Interactive timeline visualization
  - Auto-refresh every 60 seconds
  - Event details modal
  - Manual scheduling trigger

## Architecture

```
hiring-drive/
├── server/          # Node.js backend
│   ├── src/
│   │   ├── config/      # Database configuration
│   │   ├── models/      # MongoDB schemas
│   │   ├── services/    # Business logic
│   │   ├── controllers/ # API controllers
│   │   ├── routes/      # API routes
│   │   └── index.ts     # Server entry point
│   └── package.json
├── client/          # React frontend
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/  # Reusable components
│   │   ├── services/    # API client
│   │   └── utils/       # Helper functions
│   └── package.json
├── shared/          # Shared TypeScript types
│   └── types.ts
└── sample-data/     # Sample CSV files
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Install dependencies:**

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

2. **Configure environment variables:**

Create a `.env` file in the `server` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hiring-drive
```

3. **Start MongoDB:**

If using local MongoDB:
```bash
mongod
```

Or use MongoDB Atlas (cloud) and update the `MONGODB_URI` accordingly.

4. **Start the development servers:**

```bash
# Terminal 1: Start backend
cd server
npm run dev

# Terminal 2: Start frontend
cd client
npm start
```

The frontend will be available at `http://localhost:3000` and the backend at `http://localhost:5000`.

## Usage

### 1. Create a Hiring Drive

1. Navigate to `/create-hiring-drive`
2. Fill in the basic information:
   - Drive name
   - Date
   - Start and end times
3. Configure rounds:
   - Add/remove rounds
   - Set round names
   - Mark elimination rounds
   - Set job family matching requirements
4. Upload CSV files:
   - **Interviewers CSV**: See format below
   - **Candidates CSV**: See format below
5. Click "Create Hiring Drive"

### 2. View Dashboard

After creating a drive, you'll be redirected to the dashboard where you can:
- View real-time statistics
- See the interview timeline
- Click on events to view details
- Manually trigger scheduling
- Toggle auto-refresh

## CSV File Formats

### Interviewers CSV

Required columns:
- **Interviewer Email**: Email address
- **Interviewer Name**: Full name
- **Rounds Eligible**: Comma-separated list (e.g., "BPS, CODING1")
- **Available Slot Start**: HH:MM format (e.g., "09:00")
- **Available Slot End**: HH:MM format (e.g., "17:00")
- **Level**: Junior, Mid, Senior, Staff, or Principal
- **Job Family**: Engineering, Product, etc.
- **Max Interviews**: Number of interviews willing to conduct

**Example:**
```csv
Interviewer Email,Interviewer Name,Rounds Eligible,Available Slot Start,Available Slot End,Level,Job Family,Max Interviews
john.doe@company.com,John Doe,"BPS, CODING1",09:00,13:00,Senior,Engineering,3
```

### Candidates CSV

Required columns:
- **Candidate Email**: Email address
- **Candidate Name**: Full name
- **Resume Link**: URL to resume
- **Job Family**: Engineering, Product, etc.
- **Level**: Junior, Mid, Senior, Staff, or Principal

**Example:**
```csv
Candidate Email,Candidate Name,Resume Link,Job Family,Level
sarah.johnson@email.com,Sarah Johnson,https://resume.com/sarah,Engineering,Mid
```

Sample CSV files are available in the `sample-data/` directory.

## API Endpoints

### Hiring Drives
- `POST /api/hiring-drives` - Create a new hiring drive
- `GET /api/hiring-drives` - Get all hiring drives
- `GET /api/hiring-drives/:driveId` - Get specific hiring drive
- `GET /api/hiring-drives/:driveId/stats` - Get dashboard statistics
- `POST /api/hiring-drives/:driveId/schedule` - Trigger scheduling
- `PATCH /api/hiring-drives/:driveId/events` - Update event (interviewer feedback)

## Scheduling Algorithm

The scheduling algorithm runs automatically when:
1. A hiring drive is created
2. A candidate's status changes to WAITING
3. An interviewer's status changes to WAITING
4. Manually triggered from the dashboard

**Rules:**
- Only schedules elimination rounds first
- After passing elimination, schedules remaining rounds
- Maintains 15-minute buffer before interview start
- Prevents same interviewer-candidate pairs from meeting multiple times
- Respects time slots and availability
- Prefers interviewers with lower completion percentages

## Technologies Used

### Backend
- Node.js + Express
- MongoDB + Mongoose
- TypeScript
- UUID for event IDs

### Frontend
- React 19
- TypeScript
- React Router
- Axios
- PapaParse (CSV parsing)
- CSS3 (custom styling)

## Future Enhancements

- [ ] Slack/Email notification integration
- [ ] Real-time updates via WebSockets
- [ ] Interview feedback form
- [ ] Analytics and reporting
- [ ] Calendar integration (Google Calendar, Outlook)
- [ ] Video conferencing integration
- [ ] Bulk operations for status updates
- [ ] Export interview reports

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

