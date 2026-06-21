import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
const LandingPage = React.lazy(() => import("./pages/LandingPage.tsx"));
const LoginPage = React.lazy(() => import("./pages/LoginPage.tsx"));
const PracticePage = React.lazy(() => import("./pages/PracticePage.tsx"));
const UserDashboardPage = React.lazy(() => import("./pages/UserDashboardPage.tsx"));
const LiveInterviewPage = React.lazy(() => import("./pages/LiveInterviewPage.tsx"));
const ProcessingPage = React.lazy(() => import("./pages/ProcessingPage.tsx"));
const ResultsDashboardPage = React.lazy(() => import("./pages/ResultsDashboardPage.tsx"));
const AdminLoginPage = React.lazy(() => import("./pages/AdminLoginPage.tsx"));
const AdminDashboardPage = React.lazy(() => import("./pages/AdminDashboardPage.tsx"));
import AppLayout from "./components/layout/AppLayout.tsx";
import BackgroundProvider from "../components/background/BackgroundProvider.tsx";

export default function App() {
  return (
    <BackgroundProvider>
      <Suspense fallback={
        <div className="h-screen w-full flex items-center justify-center bg-[#030712]">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-8 h-8 rounded-full border-t-2 border-teal-500 animate-spin" />
            <span className="text-sm font-medium tracking-widest text-teal-500/50">INITIALIZING AI MODULES...</span>
          </div>
        </div>
      }>
        <Routes>
      {/* Public / Marketing */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/practice" element={<PracticePage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Admin Flow */}
      <Route path="/admin" element={<AdminLoginPage />} />
      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />

      {/* Standalone Application Pages */}
      <Route path="/interview" element={<LiveInterviewPage />} />
      <Route path="/processing" element={<ProcessingPage />} />

      {/* Nested App Layout for User Dashboard & Results */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<UserDashboardPage />} />
        <Route path="/results" element={<ResultsDashboardPage />} />
      </Route>
        </Routes>
      </Suspense>
    </BackgroundProvider>
  );
}
