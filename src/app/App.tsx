import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import PracticePage from "./pages/PracticePage.tsx";
import UserDashboardPage from "./pages/UserDashboardPage.tsx";
import LiveInterviewPage from "./pages/LiveInterviewPage.tsx";
import ProcessingPage from "./pages/ProcessingPage.tsx";
import ResultsDashboardPage from "./pages/ResultsDashboardPage.tsx";
import AdminLoginPage from "./pages/AdminLoginPage.tsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.tsx";
import AppLayout from "./components/layout/AppLayout.tsx";
import BackgroundProvider from "../components/background/BackgroundProvider.tsx";

export default function App() {
  return (
    <BackgroundProvider>
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
    </BackgroundProvider>
  );
}
