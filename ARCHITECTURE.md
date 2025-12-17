# System Architecture Diagrams

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         USER BROWSER                         │
│                     (http://localhost:3000)                  │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ HTTP/REST
                             │
┌────────────────────────────▼────────────────────────────────┐
│                      REACT CLIENT                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Pages      │  │  Components  │  │   Services   │     │
│  │              │  │              │  │              │     │
│  │ - Create     │  │ - EventModal │  │ - API Client │     │
│  │   Drive      │  │              │  │ - CSV Parser │     │
│  │ - Dashboard  │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ Axios HTTP Requests
                             │
┌────────────────────────────▼────────────────────────────────┐
│                    EXPRESS.JS SERVER                         │
│                   (http://localhost:5000)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    API Routes                         │  │
│  │  POST   /api/hiring-drives                           │  │
│  │  GET    /api/hiring-drives                           │  │
│  │  GET    /api/hiring-drives/:id                       │  │
│  │  GET    /api/hiring-drives/:id/stats                 │  │
│  │  POST   /api/hiring-drives/:id/schedule              │  │
│  │  PATCH  /api/hiring-drives/:id/events                │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │              Controllers Layer                        │  │
│  │         (HiringDriveController)                       │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │              Services Layer                           │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌─────────────┐  │  │
│  │  │ Scheduling   │ │ Status       │ │Notification │  │  │
│  │  │ Service      │ │ Update       │ │Service      │  │  │
│  │  │              │ │ Service      │ │             │  │  │
│  │  └──────────────┘ └──────────────┘ └─────────────┘  │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │              Models Layer                             │  │
│  │           (Mongoose Schemas)                          │  │
│  └────────────────────┬─────────────────────────────────┘  │
└───────────────────────┼──────────────────────────────────────┘
                        │
                        │ Mongoose ODM
                        │
┌───────────────────────▼──────────────────────────────────┐
│                    MONGODB                                │
│              (mongodb://localhost:27017)                  │
│  ┌────────────────────────────────────────────────────┐  │
│  │         HiringDrive Collection                      │  │
│  │  {                                                  │  │
│  │    _id: ObjectId,                                   │  │
│  │    driveName: String,                               │  │
│  │    date: String,                                    │  │
│  │    rounds: [RoundSchema],                           │  │
│  │    candidates: [CandidateSchema],                   │  │
│  │    interviewers: [InterviewerSchema],               │  │
│  │    events: [EventSchema]                            │  │
│  │  }                                                  │  │
│  └────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

## Data Flow: Creating a Hiring Drive

```
┌──────────────┐
│     USER     │
└──────┬───────┘
       │ 1. Fills form + uploads CSVs
       ▼
┌──────────────────────────┐
│  CreateHiringDrive Page  │
└──────┬───────────────────┘
       │ 2. Parse CSVs
       ▼
┌──────────────────────────┐
│    csvParser.ts          │
│  - parseInterviewersCSV  │
│  - parseCandidatesCSV    │
└──────┬───────────────────┘
       │ 3. POST /api/hiring-drives
       ▼
┌──────────────────────────┐
│      API Client          │
│  (axios request)         │
└──────┬───────────────────┘
       │ 4. HTTP Request
       ▼
┌──────────────────────────┐
│  Express Route Handler   │
└──────┬───────────────────┘
       │ 5. Call controller
       ▼
┌──────────────────────────────────┐
│  HiringDriveController           │
│  .createHiringDrive()            │
└──────┬───────────────────────────┘
       │ 6. Save to DB
       ▼
┌──────────────────────────────────┐
│  MongoDB (via Mongoose)          │
│  HiringDrive.save()              │
└──────┬───────────────────────────┘
       │ 7. Trigger scheduling
       ▼
┌──────────────────────────────────┐
│  SchedulingService               │
│  .scheduleInterviews()           │
│  - Find eligible matches         │
│  - Create events                 │
│  - Generate links                │
└──────┬───────────────────────────┘
       │ 8. Send notifications
       ▼
┌──────────────────────────────────┐
│  NotificationService             │
│  .sendScheduledNotification()    │
└──────┬───────────────────────────┘
       │ 9. Return created drive
       ▼
┌──────────────────────────────────┐
│  Response to Client              │
└──────┬───────────────────────────┘
       │ 10. Navigate to dashboard
       ▼
┌──────────────────────────────────┐
│  Dashboard Page                  │
│  (/:driveId)                     │
└──────────────────────────────────┘
```

## Scheduling Algorithm Flow

```
┌─────────────────────────────────────┐
│  Trigger Scheduling                 │
│  - Drive created                    │
│  - Status changed                   │
│  - Manual trigger                   │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Update All Statuses                │
│  - Interviewers                     │
│  - Candidates                       │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  For Each WAITING Candidate         │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Get Eligible Rounds                │
│  - If no elimination done:          │
│    return [first elimination]       │
│  - If elimination passed:           │
│    return [all remaining]           │
│  - If elimination failed:           │
│    return []                        │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  For Each Eligible Round            │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Find Eligible Interviewers         │
│  Filter by:                         │
│  ✓ Status = WAITING                 │
│  ✓ Eligible for round               │
│  ✓ Level >= candidate level         │
│  ✓ Job family match (if required)   │
│  ✓ Not interviewed candidate before │
│  ✓ Under max interviews             │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Calculate Completion Rates         │
│  rate = completed / maxInterviews   │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Sort by Completion Rate (ASC)      │
│  (Prefer lower completion rates)    │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Select Best Match                  │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Create Event                       │
│  - Calculate start time             │
│  - Add 15-min buffer                │
│  - Generate UUID                    │
│  - Generate Zoom link               │
│  - Generate HackerRank link         │
│  - Generate Scorecard link          │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Send Notifications                 │
│  - To interviewer                   │
│  - To candidate                     │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Break (One round per candidate)    │
└─────────────────────────────────────┘
```

## Component Hierarchy

```
App
├── Router
    ├── Route: /create-hiring-drive
    │   └── CreateHiringDrive
    │       ├── Form
    │       │   ├── Basic Info Section
    │       │   ├── Rounds Section
    │       │   │   └── Round Items (dynamic)
    │       │   └── Upload Section
    │       │       ├── Interviewers CSV Input
    │       │       └── Candidates CSV Input
    │       └── Submit Button
    │
    └── Route: /:driveId
        └── Dashboard
            ├── Header
            │   ├── Drive Info
            │   └── Actions
            │       ├── Auto-refresh Toggle
            │       ├── Refresh Button
            │       └── Schedule Button
            ├── Stats Grid
            │   ├── Total Candidates Card
            │   ├── Total Interviewers Card
            │   ├── Ongoing Interviews Card
            │   ├── Pending Decisions Card
            │   ├── % Completed Card
            │   └── % Selected Card
            ├── Timeline Section
            │   ├── Legend
            │   ├── Timeline Header
            │   └── Timeline Rows (per candidate)
            │       └── Event Cards (clickable)
            └── EventModal (conditional)
                ├── Modal Header
                ├── Modal Body
                │   ├── Round Info
                │   ├── Schedule Info
                │   ├── Candidate Info
                │   ├── Interviewer Info
                │   ├── Links
                │   └── Question (if present)
                └── Close Button
```

## Database Schema

```
HiringDrive Collection
│
├── _id: ObjectId
├── driveName: String
├── date: String
├── driveStartTime: String
├── driveEndTime: String
│
├── rounds: Array
│   └── RoundSchema
│       ├── roundName: Enum(RoundName)
│       ├── isElimination: Boolean
│       └── isJobFamilyMatchingRequired: Boolean
│
├── candidates: Array
│   └── CandidateSchema
│       ├── email: String (indexed)
│       ├── fullName: String
│       ├── resume: String
│       ├── jobFamily: String
│       ├── level: String
│       ├── overallDecision: Enum(Decision)
│       └── currentStatus: Enum(ParticipantStatus)
│
├── interviewers: Array
│   └── InterviewerSchema
│       ├── email: String (indexed)
│       ├── fullName: String
│       ├── level: String
│       ├── jobFamily: String
│       ├── eligibility: Map<RoundName, Boolean>
│       ├── maxInterviews: Number
│       ├── slotStart: String
│       ├── slotEnd: String
│       └── currentStatus: Enum(ParticipantStatus)
│
├── events: Array
│   └── EventSchema
│       ├── id: String (UUID)
│       ├── round: RoundSchema
│       ├── candidateEmail: String
│       ├── interviewerEmail: String
│       ├── startTime: String (ISO)
│       ├── duration: Number
│       ├── status: Enum(EventStatus)
│       ├── decision: Enum(Decision)
│       ├── zoomLink: String
│       ├── hackerRankLink: String
│       ├── scorecardLink: String
│       └── question: String (optional)
│
├── createdAt: Date (auto)
└── updatedAt: Date (auto)
```

## State Machines

### Event Status State Machine

```
     ┌──────────────┐
     │  SCHEDULED   │ (Initial state)
     └──────┬───────┘
            │
            │ Interview starts
            │ (at startTime)
            ▼
     ┌──────────────┐
     │   ONGOING    │
     └──────┬───────┘
            │
            │ Interview ends
            │ (at startTime + duration)
            ▼
     ┌──────────────┐
     │  COMPLETED   │ (Final state)
     └──────────────┘
```

### Participant Status State Machine

```
     ┌──────────────┐
  ┌──│   WAITING    │◄──┐
  │  └──────┬───────┘   │
  │         │            │
  │         │ Event      │ Event ends
  │         │ starts     │ or break ends
  │         │            │
  │         ▼            │
  │  ┌──────────────┐   │
  │  │     BUSY     │───┘
  │  └──────┬───────┘
  │         │
  │         │ Max interviews reached
  │         │ or time slot ended
  │         │ or all candidates done
  │         ▼
  │  ┌──────────────┐
  └─►│     DONE     │ (Final state)
     └──────────────┘
```

### Decision State Machine

```
     ┌──────────────┐
     │   PENDING    │ (Initial state)
     └──────┬───────┘
            │
            │ Interviewer provides decision
            │
            ├────────┬────────┬────────┬────────┐
            ▼        ▼        ▼        ▼        ▼
     ┌──────────┐ ┌────┐ ┌────┐ ┌──────────┐ ┌──────────┐
     │STRONG_NO │ │ NO │ │YES │ │STRONG_YES│ │ PENDING  │
     └──────────┘ └────┘ └────┘ └──────────┘ └──────────┘
     (Final)      (Final)(Final)  (Final)     (Can update)
```

## Request/Response Flow

### Create Hiring Drive

```
Request:
POST /api/hiring-drives
Content-Type: application/json

{
  "driveName": "Q1 2024 Engineering",
  "date": "2024-01-15",
  "driveStartTime": "09:00",
  "driveEndTime": "17:00",
  "rounds": [...],
  "interviewers": [...],
  "candidates": [...]
}

Response:
201 Created
{
  "_id": "65a1b2c3d4e5f6...",
  "driveName": "Q1 2024 Engineering",
  ...
  "events": [
    {
      "id": "uuid-1",
      "status": "SCHEDULED",
      ...
    }
  ],
  "createdAt": "2024-01-10T10:00:00Z",
  "updatedAt": "2024-01-10T10:00:00Z"
}
```

### Get Dashboard Stats

```
Request:
GET /api/hiring-drives/:driveId/stats

Response:
200 OK
{
  "totalCandidates": 5,
  "totalInterviewers": 5,
  "ongoingInterviews": 2,
  "candidatesWithDecisionPending": 3,
  "percentCompletedCandidates": 40.00,
  "percentSelectedCandidates": 20.00
}
```

## Timeline Visualization Logic

```
Timeline Positioning Calculation:

Given:
- driveStartTime: "09:00"
- driveEndTime: "17:00"
- eventStartTime: "11:30"

Calculate:
1. Convert times to milliseconds
   start = Date("2024-01-15T09:00:00")
   end = Date("2024-01-15T17:00:00")
   event = Date("2024-01-15T11:30:00")

2. Calculate position percentage
   position = ((event - start) / (end - start)) * 100
   position = ((11:30 - 09:00) / (17:00 - 09:00)) * 100
   position = (2.5 hours / 8 hours) * 100
   position = 31.25%

3. Apply to CSS
   left: 31.25%

Event Width:
   width = (duration / totalDuration) * 100
   width = (60 min / 480 min) * 100
   width = 12.5%
```

## Error Handling Flow

```
┌─────────────────┐
│  User Action    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Try Block      │
└────────┬────────┘
         │
         ├──Success──┐
         │           ▼
         │    ┌─────────────────┐
         │    │  Return Success │
         │    │  Status 200/201 │
         │    └─────────────────┘
         │
         └──Error────┐
                     ▼
              ┌─────────────────┐
              │  Catch Block    │
              └────────┬────────┘
                       │
                       ├──Validation Error──┐
                       │                    ▼
                       │             ┌─────────────┐
                       │             │ Status 400  │
                       │             └─────────────┘
                       │
                       ├──Not Found──┐
                       │             ▼
                       │      ┌─────────────┐
                       │      │ Status 404  │
                       │      └─────────────┘
                       │
                       └──Server Error──┐
                                        ▼
                                 ┌─────────────┐
                                 │ Status 500  │
                                 │ Log Error   │
                                 └─────────────┘
```

---

This architecture ensures:
- ✅ Separation of concerns
- ✅ Scalability
- ✅ Maintainability
- ✅ Type safety
- ✅ Clear data flow
- ✅ Proper error handling

