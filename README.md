<div align="center">
  <img src="public/favicon.svg" alt="HireFlow Logo" width="120" />
  <h1>HireFlow</h1>
  <p><strong>AI-Powered Mock Interview & Resume Intelligence Platform</strong></p>
</div>

<br />

HireFlow is an advanced, AI-driven SaaS platform designed to help candidates prepare for real-world interviews. By analyzing your resume and utilizing intelligent AI interview simulations, HireFlow generates targeted, role-specific technical and behavioral questions while providing live performance analytics.

---

## 🌟 Key Features

- **AI Mock Interviews**: Realistic interview scenarios with an adaptive AI coach that listens, thinks, and speaks dynamically.
- **Resume Intelligence**: Upload your resume and let the AI tailor the entire interview specific to your experience and target role.
- **Live Telemetry & Analytics**: Gain actionable insights on:
  - Communication Skills
  - Confidence Levels
  - Technical Clarity
  - Eye Contact
- **Modern Architecture**: Beautiful dark-mode enterprise UI featuring glassmorphism, Framer Motion animations, and seamless React transitions.

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js installed (v18+ recommended).

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jeedijoshua-art/incuxhireflow.git
   cd incuxhireflow
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## 🛠 Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Routing**: React Router DOM (v6)
- **Charts/Telemetry**: Recharts

## 👥 The Team

The intelligence behind HireFlow is powered by our dedicated developers:

- **Sashi** – Project Lead & System Designer
- **Sruthi** – Database & Data Analytics Manager
- **Joshua** – Frontend Developer & Product Designer
- **Vishnu** – AI Model Trainer (Facial Expression & Performance)
- **Charan** – AI Model Trainer (Resume Analyzer)

## 🏛 Project Architecture

HireFlow operates on a modular architecture divided into specific focus areas:
- **Frontend**: The user interface and experience (React, Vite, Tailwind).
- **Backend (Micro-services)**:
  - **Resume Analyzer**: Parses resumes and extracts skills for targeted questions.
  - **Interview Engine**: Manages interview flow, dynamic question generation, and STT.
  - **Expression Tracker**: Handles facial analysis, eye contact tracking, and emotion recognition.
  - **API**: The bridge connecting the frontend to all backend AI modules.

## 👑 Team Ownership

To maintain a clean and scalable codebase, each major module is strictly owned by specific team members:
- **Joshua**: `frontend/`, `docs/` (Product Management & UI/UX)
- **Charan**: `backend/resume-analyzer/`, `backend/interview-engine/` (AI Engineering)
- **Vishnu**: `backend/expression-tracker/` (Computer Vision Engineering)
- **Shared**: `backend/api/`

## 📁 Folder Responsibilities

Please respect the workspace structure:
- **`/frontend`**: Contains all UI components, pages, and React logic.
- **`/backend/resume-analyzer`**: Resume intelligence logic.
- **`/backend/interview-engine`**: Voice-based interview intelligence.
- **`/backend/expression-tracker`**: Computer vision and camera processing logic.
- **`/backend/api`**: FastAPI/REST endpoints connecting modules.
- **`/docs`**: Team documentation, sprint notes, and architecture diagrams.

*Note: Look inside each module for its specific `OWNER.md` file detailing expected files and rules.*

## 🤝 Contribution Guidelines

1. **Check Ownership**: Before modifying a backend module, check its `OWNER.md` file. Ensure you have permission or are coordinating with the owner.
2. **Module Isolation**: Do not bleed logic between modules. If the Interview Engine needs Expression data, route it through the API.
3. **Frontend Rules**: All UI changes must go through Joshua. Do not modify the `frontend/` directory if you are working on a backend AI module.
4. **Documentation**: Keep the `docs/` folder updated with meeting notes, sprint progress, and any new API definitions.

## 📄 License

© 2026 HireFlow. All Rights Reserved.