import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import SplashScreen from './screens/SplashScreen.jsx';
import LoginScreen from './screens/LoginScreen.jsx';
import PermissionsScreen from './screens/PermissionsScreen.jsx';
import OnboardingDoneScreen from './screens/OnboardingDoneScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import ProjectListScreen from './screens/ProjectListScreen.jsx';
import ProjectDetailScreen from './screens/ProjectDetailScreen.jsx';
import CreateProjectScreen from './screens/CreateProjectScreen.jsx';
import CameraScreen from './screens/CameraScreen.jsx';
import AIAnalyzingScreen from './screens/AIAnalyzingScreen.jsx';
import AIResultScreen from './screens/AIResultScreen.jsx';
import OfflineQueueScreen from './screens/OfflineQueueScreen.jsx';
import ReportSettingsScreen from './screens/ReportSettingsScreen.jsx';
import ReportGeneratingScreen from './screens/ReportGeneratingScreen.jsx';
import ReportListScreen from './screens/ReportListScreen.jsx';
import ReportPreviewScreen from './screens/ReportPreviewScreen.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';
import Sidebar from './components/Sidebar.jsx';
import { useResponsive } from './hooks/useResponsive.js';

// Routes shared by both layouts
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/splash" replace />} />
      <Route path="/splash" element={<SplashScreen />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/permissions" element={<PermissionsScreen />} />
      <Route path="/onboarding-done" element={<OnboardingDoneScreen />} />
      <Route path="/home" element={<HomeScreen />} />
      <Route path="/projects" element={<ProjectListScreen />} />
      <Route path="/projects/new" element={<CreateProjectScreen />} />
      <Route path="/projects/:id" element={<ProjectDetailScreen />} />
      <Route path="/camera" element={<CameraScreen />} />
      <Route path="/analyzing" element={<AIAnalyzingScreen />} />
      <Route path="/result" element={<AIResultScreen />} />
      <Route path="/offline" element={<OfflineQueueScreen />} />
      <Route path="/reports/settings/:id" element={<ReportSettingsScreen />} />
      <Route path="/reports/generating" element={<ReportGeneratingScreen />} />
      <Route path="/reports" element={<ReportListScreen />} />
      <Route path="/reports/:id/preview" element={<ReportPreviewScreen />} />
      <Route path="/profile" element={<ProfileScreen />} />
      <Route path="*" element={<Navigate to="/splash" replace />} />
    </Routes>
  );
}

export default function App() {
  const { isDesktop } = useResponsive();

  if (isDesktop) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <AppRoutes />
        </div>
      </div>
    );
  }

  return (
    <div className="phone-outer">
      <div className="phone-frame">
        <AppRoutes />
      </div>
    </div>
  );
}
