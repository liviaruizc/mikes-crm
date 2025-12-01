import { Routes, Route } from "react-router-dom";
import AppLayout from "./components/Layout/AppLayout";

import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import CalendarPage from "./pages/CalendarPage";
import CustomersPage from "./pages/CustomersPage";
import AppointmentFormPage from "./pages/AppointmentFormPage";
import MapPage from "./pages/MapPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/pipeline" element={<DashboardPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/appointments/new" element={<AppointmentFormPage />} />
        <Route path="/map" element={<MapPage />} />
      </Route>
    </Routes>
  );
}
