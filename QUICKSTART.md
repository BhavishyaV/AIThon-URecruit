# Quick Start Guide

## Prerequisites
- Node.js v16+ installed
- MongoDB running (locally or Atlas)

## Setup (3 steps)

### 1. Install Dependencies

```bash
npm run install-all
```

Or manually:
```bash
# Root
npm install

# Server
cd server && npm install

# Client
cd ../client && npm install
```

### 2. Start MongoDB

**Option A: Local MongoDB**
```bash
mongod
```

**Option B: MongoDB Atlas**
Update `server/.env` with your Atlas connection string:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hiring-drive
```

### 3. Start the Application

```bash
npm run dev
```

This will start both the backend (port 5000) and frontend (port 3000).

## Access the Application

Open your browser to: `http://localhost:3000`

## Test with Sample Data

1. Navigate to "Create Hiring Drive"
2. Fill in basic info:
   - Drive Name: "Q1 2024 Engineering Hiring"
   - Date: Select any future date
   - Start Time: 09:00
   - End Time: 17:00
3. Add rounds (default BPS is fine, or add more)
4. Upload CSV files from `sample-data/` folder:
   - `interviewers.csv`
   - `candidates.csv`
5. Click "Create Hiring Drive"
6. You'll be redirected to the dashboard

## What You'll See

**Dashboard Features:**
- 6 statistics cards at the top
- Interview timeline showing:
  - Each candidate as a row
  - Events as colored cards on the timeline
  - Status badges and decision badges
- Click any event card to see full details
- Auto-refresh every 60 seconds
- Manual refresh button
- Trigger scheduling button

**Event Colors:**
- 🟠 Orange = Scheduled
- 🔵 Blue = Ongoing
- 🟢 Green = Completed (Pass)
- 🔴 Red = Completed (Fail)
- ⚪ Gray = Completed (Pending Decision)

## Troubleshooting

### MongoDB Connection Error
- Make sure MongoDB is running
- Check the connection string in `server/.env`
- Verify firewall/network settings if using Atlas

### Port Already in Use
- Change ports in `server/.env` (backend) and `client/.env` (frontend proxy)
- Or stop the process using the port

### CSV Upload Issues
- Ensure CSV has correct headers (see README.md)
- Check for extra spaces or special characters
- Use the sample CSV files as templates

## Next Steps

1. **Explore the API**: Check `README.md` for API endpoint documentation
2. **Customize**: Modify round types, add more job families, etc.
3. **Integrate Notifications**: Implement actual email/Slack notifications
4. **Add Features**: See "Future Enhancements" in README.md

## Common Commands

```bash
# Start both server and client
npm run dev

# Start only server
npm run server

# Start only client
npm run client

# Build for production
npm run build
```

## Project Structure

```
hiring-drive/
├── server/              # Backend (port 5000)
│   ├── src/
│   │   ├── config/      # DB config
│   │   ├── models/      # Mongoose schemas
│   │   ├── services/    # Business logic
│   │   ├── controllers/ # API handlers
│   │   └── routes/      # API routes
│   └── .env             # Environment variables
├── client/              # Frontend (port 3000)
│   ├── src/
│   │   ├── pages/       # Main pages
│   │   ├── components/  # UI components
│   │   ├── services/    # API client
│   │   └── utils/       # Helpers
│   └── .env             # Frontend config
├── shared/              # Shared types
│   └── types.ts         # TypeScript definitions
└── sample-data/         # Sample CSV files
```

## Support

For issues or questions:
1. Check the full README.md
2. Review the code comments
3. Check MongoDB connection
4. Verify all dependencies are installed

Happy hiring! 🚀

