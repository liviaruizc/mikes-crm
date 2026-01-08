import { Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import AppLayout from "./components/Layout/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import CalendarPage from "./pages/CalendarPage";
import CustomersPage from "./pages/CustomersPage";
import AppointmentFormPage from "./pages/AppointmentFormPage";
import AppointmentDetailsPage from "./pages/AppointmentDetailsPage";
import NotificationsPage from "./pages/NotificationsPage";
import MapPage from "./pages/MapPage";
import DealsPage from "./pages/DealsPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { initializeNotificationListener } from "./lib/notificationService";

export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize notification click handler
    initializeNotificationListener(navigate);
  }, [navigate]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/deals" element={<DealsPage />} />
        <Route path="/pipeline" element={<DashboardPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/appointments/new" element={<AppointmentFormPage />} />
        <Route path="/appointment/:id" element={<AppointmentDetailsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
