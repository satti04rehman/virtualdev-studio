import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './services/api';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CreateProjectPage from './pages/CreateProjectPage';
import ProjectWorkspacePage from './pages/ProjectWorkspacePage';
import AITeamPage from './pages/AITeamPage';
import RequirementsPage from './pages/RequirementsPage';
import ResearchPage from './pages/ResearchPage';
import ArchitecturePage from './pages/ArchitecturePage';
import TaskExecutionPage from './pages/TaskExecutionPage';
import TestingPage from './pages/TestingPage';
import DocumentationPage from './pages/DocumentationPage';
import ApprovalsPage from './pages/ApprovalsPage';
import FinalProjectPage from './pages/FinalProjectPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!api.getToken()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/projects/new" element={<ProtectedRoute><CreateProjectPage /></ProtectedRoute>} />
        <Route path="/ai-team" element={<ProtectedRoute><AITeamPage /></ProtectedRoute>} />
        <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectWorkspacePage /></ProtectedRoute>} />
        <Route path="/projects/:projectId/requirements" element={<ProtectedRoute><RequirementsPage /></ProtectedRoute>} />
        <Route path="/projects/:projectId/research" element={<ProtectedRoute><ResearchPage /></ProtectedRoute>} />
        <Route path="/projects/:projectId/architecture" element={<ProtectedRoute><ArchitecturePage /></ProtectedRoute>} />
        <Route path="/projects/:projectId/tasks" element={<ProtectedRoute><TaskExecutionPage /></ProtectedRoute>} />
        <Route path="/projects/:projectId/testing" element={<ProtectedRoute><TestingPage /></ProtectedRoute>} />
        <Route path="/projects/:projectId/documentation" element={<ProtectedRoute><DocumentationPage /></ProtectedRoute>} />
        <Route path="/projects/:projectId/approvals" element={<ProtectedRoute><ApprovalsPage /></ProtectedRoute>} />
        <Route path="/projects/:projectId/final" element={<ProtectedRoute><FinalProjectPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
