import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from './auth/PrivateRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
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

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

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
          <PrivateRoute allowedRoles={['ROLE_RECRUITER', 'ROLE_ADMIN']}>
            <UploadJob />
          </PrivateRoute>
        }
      />
      <Route
        path="/recruiter/upload-resumes"
        element={
          <PrivateRoute allowedRoles={['ROLE_RECRUITER', 'ROLE_ADMIN']}>
            <UploadResumes />
          </PrivateRoute>
        }
      />
      <Route
        path="/recruiter/candidates"
        element={
          <PrivateRoute allowedRoles={['ROLE_RECRUITER', 'ROLE_ADMIN']}>
            <Candidates />
          </PrivateRoute>
        }
      />
      <Route
        path="/recruiter/analyzed"
        element={
          <PrivateRoute allowedRoles={['ROLE_RECRUITER', 'ROLE_ADMIN']}>
            <AnalyzedResumes />
          </PrivateRoute>
        }
      />

      {/* Candidate Routes */}
      <Route
        path="/candidate/jobs"
        element={
          <PrivateRoute allowedRoles={['ROLE_CANDIDATE', 'ROLE_ADMIN']}>
            <CandidateJobBoard />
          </PrivateRoute>
        }
      />
      <Route
        path="/candidate/status"
        element={
          <PrivateRoute allowedRoles={['ROLE_CANDIDATE', 'ROLE_ADMIN']}>
            <CandidateStatus />
          </PrivateRoute>
        }
      />
      <Route
        path="/candidate/skill-gap"
        element={
          <PrivateRoute allowedRoles={['ROLE_CANDIDATE', 'ROLE_ADMIN']}>
            <SkillGapAnalysis />
          </PrivateRoute>
        }
      />
      <Route
        path="/candidate/skill-gap/:appId"
        element={
          <PrivateRoute allowedRoles={['ROLE_CANDIDATE', 'ROLE_ADMIN']}>
            <SkillGapAnalysis />
          </PrivateRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <PrivateRoute allowedRoles={['ROLE_ADMIN']}>
            <Admin />
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
