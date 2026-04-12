# CampusIQ – Smart Campus Collaboration Platform

CampusIQ is a college-focused platform designed to help students access quality resources, collaborate efficiently, and prepare smarter in one place.

Built from real student problems, CampusIQ transforms scattered tools into a structured academic ecosystem.


# Features

## Resource Hub
- Upload and share notes
- Peer and mentor rating system
- Helps students choose the best quality material

## One Day Batsman Mode
- Structured last-day preparation
- Focus on important topics
- Designed for real student behavior

## Study Genie
- AI Summarizer
- Quiz Generator
- Doubt Solver

## Mentorship Support
- Directly message mentors
- No need for contact details

## Community
- Ask doubts
- Share announcements and achievements
- Find teammates for projects and hackathons
- Build your network

## Learn Together
- Study Rooms for discussion and collaboration
- Live Classes for scheduling and attending sessions


# Tech Stack

Frontend:
- React.js
- Vite
- Tailwind CSS

Backend:
- Node.js
- Express.js

Database:
- Firebase

Storage:
- Supabase (PDF storage)

Authentication:
- Firebase Authentication

AI Integration:
- APIs for summarization, quiz generation, and doubt solving


# How to Run the Project

# Clone the repository
```
git clone https://github.com/navyaalikanti/CampusIQ.git
```

# Navigate into project directory
```
cd CampusIQ
```


# Frontend Setup
```
cd frontend && npm install
```


# Add the following variables in frontend .env

```
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
GEMINI_API_KEY= your_gemini_api_key
```

# Run frontend
```
npm run dev
```


# Backend Setup
```
cd ../backend
npm install
```


# Add the following variables in backend .env
```
PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
```

# Run backend
```
npm start
```


# Why CampusIQ

Students already use tools like Google Drive, WhatsApp, and AI platforms, but everything is scattered.

CampusIQ brings everything into one structured platform designed for campus-level learning and collaboration.


# Project Impact

- Access to quality-rated notes
- Efficient last-day preparation
- Easier collaboration and team building
- Faster learning using AI



# Inspiration

No one understands a student better than a student.


# Support

Star the repository, share feedback, and contribute to improve the project.
