# DW Survey - Real-time Voting System

A Slido-like online voting system that allows audiences to participate in multiple-choice polls with instant results visualization.

## Features

- **Real-time Voting**: Participate in polls without registration
- **Live Results**: Watch results update in real-time as votes come in
- **Admin Panel**: Create and manage polls with password protection
- **Multiple Question Types**: Support for single and multiple choice questions
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Quick Start

### Local Development

1. Clone the repository
```bash
git clone <your-repo-url>
cd DWSurvey
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env file with your settings
```

4. Initialize the database
```bash
npm run init-db
```

5. Start the development server
```bash
npm run dev
```

6. Access the application
- Voting Interface: http://localhost:3000
- Admin Panel: http://localhost:3000/admin.html

## Deployment to Zeabur

### Prerequisites
- GitHub account
- Zeabur account

### Steps

1. **Push to GitHub**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Deploy on Zeabur**
   - Log in to [Zeabur](https://zeabur.com)
   - Click "New Project"
   - Connect your GitHub repository
   - Select the DWSurvey repository
   - Zeabur will automatically detect Node.js and start deployment

3. **Configure Environment Variables**
   - In Zeabur dashboard, go to your project
   - Click on "Environment Variables"
   - Add the following:
     ```
     ADMIN_PASSWORD=your-secure-password
     PORT=3000
     ```

4. **Database Setup**
   - The SQLite database will be created automatically on first run
   - For production, consider upgrading to PostgreSQL

5. **Access Your App**
   - Zeabur will provide a URL like `https://your-app.zeabur.app`
   - Admin panel: `https://your-app.zeabur.app/admin.html`

## Usage

### Creating a Poll (Admin)

1. Access the admin panel with your password
2. Click "Create New Poll"
3. Add poll title and questions
4. Each question can have multiple options
5. Choose between single or multiple choice
6. Save the poll

### Voting

1. Users visit the main page
2. Select a poll to participate
3. Choose their answers
4. Submit vote (one vote per session)
5. View real-time results

### Managing Polls (Admin)

- **Activate/Deactivate**: Control poll visibility
- **Delete**: Remove polls permanently
- **View Results**: Monitor participation in real-time

## API Documentation

### Public Endpoints

- `GET /api/polls` - Get all active polls
- `GET /api/polls/:id` - Get specific poll details
- `POST /api/votes` - Submit a vote
- `GET /api/polls/:id/results` - Get poll results

### Admin Endpoints (Password Required)

- `POST /api/admin/polls` - Create new poll
- `PUT /api/admin/polls/:id/status` - Update poll status
- `DELETE /api/admin/polls/:id` - Delete poll
- `GET /api/admin/polls` - Get all polls with stats

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: SQLite (upgradeable to PostgreSQL)
- **Real-time**: Socket.io
- **Frontend**: Vanilla JavaScript, CSS3

## Security

- Admin actions require password authentication
- Session-based voting prevention (one vote per session)
- Input validation and sanitization
- CORS protection

## License

MIT