import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import BackgroundProvider from "../components/background/BackgroundProvider";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminLayout from "./components/layout/AdminLayout";

const LandingPage = React.lazy(() => import("./pages/LandingPage"));
const LoginPage = React.lazy(() => import("./pages/LoginPage"));
const HowItWorksPage = React.lazy(() => import("./pages/HowItWorksPage"));
const PracticePage = React.lazy(() => import("./pages/PracticePage"));
const UserDashboardPage = React.lazy(() => import("./pages/UserDashboardPage"));
const LiveInterviewPage = React.lazy(() => import("./pages/LiveInterviewPage"));
const ProcessingPage = React.lazy(() => import("./pages/ProcessingPage"));
const ResumeAnalysisPage = React.lazy(() => import("./pages/ResumeAnalysisPage"));
const InterviewModePage = React.lazy(() => import("./pages/InterviewModePage"));
const ResultsDashboardPage = React.lazy(
  () => import("./pages/ResultsDashboardPage"),
);
const AdminLoginPage = React.lazy(() => import("./pages/AdminLoginPage"));
const AdminDashboardPage = React.lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminUsersPage = React.lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminQuestionsPage = React.lazy(() => import("./pages/admin/AdminQuestionsPage"));
const AdminTemplatesPage = React.lazy(() => import("./pages/admin/AdminTemplatesPage"));
const AdminReportsPage = React.lazy(() => import("./pages/admin/AdminReportsPage"));
const AdminAnalyticsPage = React.lazy(() => import("./pages/admin/AdminAnalyticsPage"));
const AdminLivePage = React.lazy(() => import("./pages/admin/AdminLivePage"));
const AdminLiveObservePage = React.lazy(() => import("./pages/admin/AdminLiveObservePage"));
const AdminSettingsPage = React.lazy(() => import("./pages/admin/AdminSettingsPage"));
const InterviewPreparationPage = React.lazy(
  () => import("./pages/InterviewPreparationPage"),
);
const InterviewReadinessPage = React.lazy(
  () => import("./pages/InterviewReadinessPage"),
);

export default function App() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "PROVIDE_YOUR_CLIENT_ID";

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <BackgroundProvider>
      <Suspense
        fallback={
          <div className="h-screen w-full flex items-center justify-center bg-[#030712]">
            <div className="animate-pulse flex flex-col items-center gap-4">
              <div className="w-8 h-8 rounded-full border-t-2 border-teal-500 animate-spin" />
              <span className="text-sm font-medium tracking-widest text-teal-500/50">
                INITIALIZING AI MODULES...
              </span>
            </div>
          </div>
        }
      >
        <Routes>
          {/* Public / Marketing */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Admin Flow */}
          <Route path="/admin" element={<AdminLoginPage />} />
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/questions" element={<AdminQuestionsPage />} />
            <Route path="/admin/templates" element={<AdminTemplatesPage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
            <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
            <Route path="/admin/live" element={<AdminLivePage />} />
            <Route path="/admin/live/:sessionId" element={<AdminLiveObservePage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
          </Route>

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            {/* Standalone Application Pages */}
            <Route path="/resume-analysis" element={<ResumeAnalysisPage />} />
            <Route path="/interview-mode" element={<InterviewModePage />} />
            <Route
              path="/interview-preparation"
              element={<InterviewPreparationPage />}
            />
            <Route
              path="/interview-readiness"
              element={<InterviewReadinessPage />}
            />
            <Route path="/interview" element={<LiveInterviewPage />} />
            <Route path="/processing" element={<ProcessingPage />} />

            {/* Nested App Layout for User Dashboard & Results */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<UserDashboardPage />} />
              <Route path="/results" element={<ResultsDashboardPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
        </BackgroundProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
