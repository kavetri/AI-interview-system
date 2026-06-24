# 🚀 AI Interview System (PERFEXA)

![React](https://img.shields.io/badge/React-18.2.0-blue?style=for-the-badge&logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3.5-38B2AC?style=for-the-badge&logo=tailwind-css)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Vision-FF8C00?style=for-the-badge)

PERFEXA is an advanced AI-powered Interview System designed to help candidates prepare for their dream jobs. By analyzing resumes, generating tailored questions, and evaluating responses, the system acts as a personalized interview coach. It also includes an ATS (Applicant Tracking System) checker and gamified progression to keep users engaged.

## ✨ Features

- **📄 Smart Resume Parsing:** Upload your resume (PDF/Word) to automatically extract your skills, experience, and profile.
- **🎯 Dynamic Interview Generation:** Choose between HR, Technical, or Combined interviews. The AI generates contextual questions based on your unique profile.
- **🤖 AI Evaluation & Feedback:** Get real-time, comprehensive feedback and scoring on your answers.
- **✅ ATS Resume Checker:** Compare your resume against a specific job description to get an ATS compatibility score and actionable improvement tips.
- **🎮 Gamified Learning:** Earn XP, level up your rank, and complete daily challenges to maintain a streak and improve consistently.
- **🎥 MediaPipe Vision Integration:** Support for advanced computer vision tasks during interviews (e.g., posture and expression analysis).
- **🌓 Dark/Light Mode:** A beautifully designed interface with full dark mode support using Tailwind CSS.

## 🛠️ Tech Stack

**Frontend:**
- React 18
- Tailwind CSS (with autoprefixer & postcss)
- Lucide React (Icons)
- MediaPipe Vision Tasks

**Backend:**
- Node.js & Express.js
- Multer (File Uploads)
- PDF-Parse & Mammoth (Document parsing)

## 🚀 Getting Started (Local Development)

Follow these steps to set up the project locally. (Note: The frontend and backend are currently under development and are not yet deployed to production.)

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### 1. Install dependencies
Install the required packages for both frontend and backend.
```bash
npm install
```

### 2. Run the application
You can start both the React frontend and the Express backend simultaneously using concurrently:
```bash
npm run dev
```

## 📂 Project Structure

```text
ai-interview-system/
├── public/             # Static assets
├── server/             # Express.js backend
│   ├── index.js        # Server entry point
│   └── services/       # AI & parsing logic
├── src/                # React frontend
│   ├── components/     # Reusable UI components
│   ├── utils/          # Gamification & storage logic
│   ├── App.js          # Main application routing
│   └── index.css       # Tailwind CSS entry
├── package.json        # Dependencies & scripts
└── tailwind.config.js  # Tailwind configuration
```

## 🔐 License

This is a totally private project. Currently, it does not have any formal open-source license attached to it.

---
*Best of luck on your next interview! 🍀*
