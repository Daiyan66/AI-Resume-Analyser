import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from './auth/PrivateRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { LandingPage } from './pages/LandingPage';
import { RecruiterOnboardPage } from './pages/RecruiterOnboardPage';
import { Dashboard } from './pages/Dashboard';
import { Admin } from './pages/Admin';
import { AddRecruiter } from './pages/AddRecruiter';
import { UploadJob } from './pages/UploadJob';
import { UploadResumes } from './pages/UploadResumes';
import { Candidates } from './pages/Candidates';
import { AnalyzedResumes } from './pages/AnalyzedResumes';
import { CandidateJobBoard } from './pages/CandidateJobBoard';
import { CandidateStatus } from './pages/CandidateStatus';
import { SkillGapAnalysis } from './pages/SkillGapAnalysis';
import { AdminCandidatesOverview } from './pages/AdminCandidatesOverview';
import { AdminRecruitersOverview } from './pages/AdminRecruitersOverview';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/recruiter/onboard" element={<RecruiterOnboardPage />} />

      {/* Authenticated Dashboard & Aliases */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/candidate/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/recruiter/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />

      {/* Recruiter Routes */}
      <Route
        path="/recruiter/upload-job"
        element={
          <PrivateRoute allowedRoles={['ROLE_RECRUITER']}>
            <UploadJob />
          </PrivateRoute>
        }
      />
      <Route
        path="/recruiter/upload-resumes"
        element={
          <PrivateRoute allowedRoles={['ROLE_RECRUITER']}>
            <UploadResumes />
          </PrivateRoute>
        }
      />
      <Route
        path="/recruiter/candidates"
        element={
          <PrivateRoute allowedRoles={['ROLE_RECRUITER']}>
            <Candidates />
          </PrivateRoute>
        }
      />
      <Route
        path="/recruiter/analyzed"
        element={
          <PrivateRoute allowedRoles={['ROLE_RECRUITER']}>
            <AnalyzedResumes />
          </PrivateRoute>
        }
      />

      {/* Candidate Routes */}
      <Route
        path="/candidate/jobs"
        element={
          <PrivateRoute allowedRoles={['ROLE_CANDIDATE']}>
            <CandidateJobBoard />
          </PrivateRoute>
        }
      />
      <Route
        path="/candidate/status"
        element={
          <PrivateRoute allowedRoles={['ROLE_CANDIDATE']}>
            <CandidateStatus />
          </PrivateRoute>
        }
      />
      <Route
        path="/candidate/skill-gap"
        element={
          <PrivateRoute allowedRoles={['ROLE_CANDIDATE']}>
            <SkillGapAnalysis />
          </PrivateRoute>
        }
      />
      <Route
        path="/candidate/skill-gap/:appId"
        element={
          <PrivateRoute allowedRoles={['ROLE_CANDIDATE']}>
            <SkillGapAnalysis />
          </PrivateRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <PrivateRoute allowedRoles={['ROLE_ADMIN']}>
            <AdminRecruitersOverview />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/recruiters"
        element={
          <PrivateRoute allowedRoles={['ROLE_ADMIN']}>
            <AdminRecruitersOverview />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/candidates"
        element={
          <PrivateRoute allowedRoles={['ROLE_ADMIN']}>
            <AdminCandidatesOverview />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/add-recruiter"
        element={
          <PrivateRoute allowedRoles={['ROLE_ADMIN']}>
            <AddRecruiter />
          </PrivateRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
