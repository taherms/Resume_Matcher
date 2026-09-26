# 🎯 ATS Resume Matcher & Google Drive / Gmail Suite

A powerful, full-stack AI-driven application designed to analyze resumes against Job Descriptions, calculate precise ATS match scores, generate tailored cover letters, verify technical skills, and seamlessly integrate with **Google Drive**, **Gmail**, **GitHub**, and **LinkedIn**.

---

## 🌟 Key Features

### 1. 🎯 ATS Resume Matcher & AI Score Engine
- **File Parsing Support**: Upload resumes in `.pdf`, `.docx`, or `.txt` formats, or paste resume text directly.
- **AI Matching**: Powered by **Google Gemini AI** (`@google/genai`) to evaluate resume content against target Job Descriptions.
- **Detailed Feedback**:
  - Overall ATS Compatibility Score (%)
  - Keyword Matching & Missing Critical Keywords Breakdown
  - Formatting & Readability Assessment
  - Actionable Improvement Recommendations

### 2. 📊 Score History & Analytics
- Interactive visual trends powered by **Recharts**.
- Track your resume score progression over time across different job roles and revisions.

### 3. 🛠️ Interactive AI Skill Verification
- Test and verify technical skills mentioned in your resume.
- Automatically generates customized skill quizzes and proficiency tests powered by Gemini AI.

### 4. ✉️ AI Cover Letter & Email Suite
- **Tailored Cover Letters**: Auto-generate targeted cover letters structured specifically for the position and company.
- **Gmail Outreach**: Draft and send application emails directly from the web app using integrated Google authentication.

### 5. 📂 Google Drive Workspace Integration
- Connect your **Google Drive** using Google OAuth 2.0.
- Browse Drive files, import stored resumes directly, and save generated cover letters or tailored documents back to Drive.

### 6. 🌐 Social & Professional Profile Integration
- **GitHub Integration**: Import repository stats, top languages, and projects to enrich your ATS matching profile.
- **LinkedIn Integration**: Sync skills and experience overview for comprehensive application tailoring.

### 7. 👁️ Live Resume Preview & Viewer
- Rich resume modal preview supporting direct text inspection and formatted document rendering (`mammoth`, `docx`).

---

## 🔑 Environment Setup & API Keys

To run this application, you need to configure your environment variables in a `.env` file in the project root.

### 1. Create your `.env` File
Copy the provided `.env.example` template to `.env`:
```bash
cp .env.example .env
```

### 2. Required Credentials

| Variable Name | Required | Description | Where to Get It |
|---|---|---|---|
| `GEMINI_API_KEY` | **Yes** | Required for AI resume analysis, scoring, skill verification, and cover letter generation. | [Google AI Studio](https://aistudio.google.com/) |
| `GOOGLE_CLIENT_ID` | Optional | Required for Google Drive browsing & Gmail outreach capabilities. | [Google Cloud Console](https://console.cloud.google.com/) |
| `PORT` | Optional | Port for the Express backend server (Default: `3000`). | Set to any open port |

---

## 🛠️ Step-by-Step API Key Setup Guide

### 📍 Step A: How to Get a Google Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google Account.
3. Click on **Get API Key** in the top-left sidebar.
4. Click **Create API Key in new project** (or select an existing project).
5. Copy the generated key and paste it into your `.env` file:
   ```env
   GEMINI_API_KEY=AIzaSyYourGeneratedGeminiApiKeyHere
   ```

### 📍 Step B: How to Setup Google OAuth Client ID (Drive & Gmail)
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Go to **APIs & Services** > **Library** and enable:
   - **Google Drive API**
   - **Gmail API**
4. Go to **APIs & Services** > **OAuth consent screen**:
   - Select **User Type** (External) and fill in application details.
   - Add required scopes (`.../auth/drive.readonly`, `.../auth/gmail.send`).
5. Go to **APIs & Services** > **Credentials**:
   - Click **Create Credentials** -> **OAuth client ID**.
   - Select **Web application** as the Application type.
   - Add Authorized JavaScript origins: `http://localhost:3000` (and `http://localhost:5173` if running Vite standalone).
   - Add Authorized redirect URIs: `http://localhost:3000`.
6. Copy the **Client ID** and add it to your `.env` file:
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```

---

## 💻 Running the Application Locally

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (or **bun** / **yarn**)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Credentials
Ensure your `.env` file has your `GEMINI_API_KEY` set:
```bash
GEMINI_API_KEY=your_actual_gemini_api_key
GOOGLE_CLIENT_ID=your_actual_google_client_id
```

### 3. Start the Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000` (or the port specified in terminal output).

---

## 🏗️ Production Build & Commands

| Command | Action |
|---|---|
| `npm run dev` | Runs Express server + Vite dev middleware concurrently via `server.ts` |
| `npm run build` | Builds the production Vite frontend bundle into `dist/` |
| `npm run start` | Runs the Express server in production mode |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) |
| `npm run clean` | Removes build outputs (`dist/`) |

---

## 📁 Project Architecture

```
Gmail-Suite/
├── server.ts                       # Express backend server with Vite middleware & API proxy
├── src/
│   ├── App.tsx                     # Main application layout and state manager
│   ├── components/
│   │   ├── CoverLetterEmail.tsx    # Cover letter & Gmail draft component
│   │   ├── DriveManager.tsx        # Google Drive file browser & picker
│   │   ├── ResumePreviewModal.tsx  # Modal preview for parsed resumes
│   │   ├── ResumeViewer.tsx       # Resume content renderer
│   │   ├── ScoreHistoryChart.tsx   # Recharts visualization for historical scores
│   │   ├── ScoreOverview.tsx       # ATS Match score cards & breakdown
│   │   ├── SkillVerificationModal.tsx # AI-generated skill verification quizzes
│   │   └── SocialProfileManager.tsx  # GitHub & LinkedIn profile integrations
│   ├── services/
│   │   ├── githubService.ts        # GitHub REST API service
│   │   ├── linkedinService.ts      # LinkedIn data sync service
│   │   └── workspace.ts           # Storage & workspace utilities
│   ├── sampleData.ts               # Demo data for initial state
│   ├── types.ts                    # TypeScript interfaces & types
│   └── index.css                   # TailwindCSS styles
├── .env.example                    # Environment variables template
├── package.json                    # Dependencies and scripts
└── vite.config.ts                  # Vite build configuration
```

---

## 🛡️ License

This project is open source and available under the [MIT License](LICENSE).