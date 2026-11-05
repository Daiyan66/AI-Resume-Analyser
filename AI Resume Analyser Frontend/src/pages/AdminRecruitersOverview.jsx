import React, { useState } from 'react';
import { Card, Table, Button, Badge, Spinner, Row, Col, Alert, Breadcrumb } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import api from '../api/axios';
import { 
  Users, 
  Briefcase, 
  ArrowLeft, 
  ChevronRight, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Award,
  Layers,
  Sparkles,
  Info,
  ShieldCheck,
  Trash2
} from 'lucide-react';

export const AdminRecruitersOverview = () => {
  const queryClient = useQueryClient();
  const [selectedRecruiter, setSelectedRecruiter] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);

  // 1. Fetch All Recruiters
  const { data: recruiters = [], isLoading: loadingRecruiters } = useQuery({
    queryKey: ['adminRecruiters'],
    queryFn: async () => {
      const res = await api.get('/admin/recruiters');
      return res.data || [];
    }
  });

  // Delete Recruiter Mutation
  const deleteRecruiterMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/recruiters/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminRecruiters']);
      setSelectedRecruiter(null);
      setSelectedJob(null);
      setActionMsg({ 
        type: 'success', 
        text: 'Recruiter and all associated jobs removed successfully. Candidates who applied have received an encouraging position closed update.' 
      });
      setTimeout(() => setActionMsg(null), 6000);
    },
    onError: (err) => {
      setActionMsg({ 
        type: 'danger', 
        text: err.response?.data?.message || 'Failed to remove recruiter.' 
      });
      setTimeout(() => setActionMsg(null), 5000);
    }
  });

  const handleDeleteRecruiter = (rec) => {
    if (window.confirm(`Are you sure you want to permanently remove recruiter "${rec.firstName} ${rec.lastName}" (@${rec.username})?\n\nThis will remove all jobs posted by this recruiter, and all candidates who applied will receive a notification that the position has concluded.`)) {
      deleteRecruiterMutation.mutate(rec.id);
    }
  };

  // 2. Fetch Jobs for Selected Recruiter
  const { data: recruiterJobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['adminRecruiterJobs', selectedRecruiter?.id],
    queryFn: async () => {
      const res = await api.get(`/admin/recruiters/${selectedRecruiter.id}/jobs`);
      return res.data || [];
    },
    enabled: !!selectedRecruiter
  });

  // 3. Fetch Candidates for Selected Job
  const { data: candidates = [], isLoading: loadingCandidates } = useQuery({
    queryKey: ['adminJobCandidates', selectedJob?.id],
    queryFn: async () => {
      const res = await api.get(`/admin/jobs/${selectedJob.id}/candidates`);
      return res.data || [];
    },
    enabled: !!selectedJob
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACCEPTED':
        return <Badge bg="success" className="px-2 py-1"><CheckCircle size={13} className="me-1" /> Accepted</Badge>;
      case 'REJECTED':
        return <Badge bg="danger" className="px-2 py-1"><XCircle size={13} className="me-1" /> Rejected</Badge>;
      default:
        return <Badge bg="secondary" className="px-2 py-1"><Clock size={13} className="me-1" /> Pending Review</Badge>;
    }
  };

  return (
    <Layout>
      {/* Breadcrumb Header */}
      <div className="mb-4">
        <Breadcrumb className="small mb-2">
          <Breadcrumb.Item 
            active={!selectedRecruiter}
            onClick={() => { setSelectedRecruiter(null); setSelectedJob(null); }}
            style={{ cursor: selectedRecruiter ? 'pointer' : 'default' }}
          >
            All Recruiters
          </Breadcrumb.Item>
          {selectedRecruiter && (
            <Breadcrumb.Item 
              active={!selectedJob}
              onClick={() => setSelectedJob(null)}
              style={{ cursor: selectedJob ? 'pointer' : 'default' }}
            >
              {selectedRecruiter.firstName} {selectedRecruiter.lastName} (ID #REC-{selectedRecruiter.id})
            </Breadcrumb.Item>
          )}
          {selectedJob && (
            <Breadcrumb.Item active>
              {selectedJob.title} (Job ID #JOB-{selectedJob.id})
            </Breadcrumb.Item>
          )}
        </Breadcrumb>

        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h2 className="fw-extrabold text-dark mb-1 d-flex align-items-center gap-2">
              <Briefcase className="text-primary" size={26} />
              Recruiter Job Postings & Candidate Pipeline
            </h2>
            <p className="text-muted mb-0">
              {selectedJob ? (
                <>Candidate evaluation details for <strong>{selectedJob.title}</strong></>
              ) : selectedRecruiter ? (
                <>Active job openings managed by <strong>{selectedRecruiter.firstName} {selectedRecruiter.lastName}</strong> (Recruiter ID #REC-{selectedRecruiter.id})</>
              ) : (
                'Select a recruiter to inspect their posted openings and candidate pipelines'
              )}
            </p>
          </div>

          {(selectedJob || selectedRecruiter) && (
            <Button 
              variant="outline-secondary" 
              size="sm" 
              className="d-flex align-items-center gap-1 rounded-3"
              onClick={() => {
                if (selectedJob) {
                  setSelectedJob(null);
                } else {
                  setSelectedRecruiter(null);
                }
              }}
            >
              <ArrowLeft size={16} /> Back
            </Button>
          )}
        </div>
      </div>

      {/* Action Feedback Message */}
      {actionMsg && (
        <Alert variant={actionMsg.type} className="border-0 shadow-sm rounded-3 mb-4 d-flex align-items-center justify-content-between">
          <span>{actionMsg.text}</span>
          <Button variant="link" size="sm" className="p-0 text-dark" onClick={() => setActionMsg(null)}>✕</Button>
        </Alert>
      )}

      {/* Admin Privacy Alert Notice */}
      <Alert variant="info" className="py-2 px-3 small border-0 shadow-sm rounded-3 mb-4 d-flex align-items-center gap-2">
        <Info size={18} className="text-info flex-shrink-0" />
        <span>
          <strong>Administrator Audit Mode:</strong> You are viewing recruiter management pipelines and live match metrics. Direct resume downloads are restricted for admin compliance.
        </span>
      </Alert>

      {/* ----------------- STEP 1: ALL RECRUITERS LIST ----------------- */}
      {!selectedRecruiter && (
        <Card className="glass-card border-0 shadow-sm rounded-4 overflow-hidden">
          <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
            <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
              <Users size={20} className="text-primary" />
              Registered Recruiters ({recruiters.length})
            </h5>
            <Badge bg="primary-subtle" className="text-primary">Recruiter Roster</Badge>
          </Card.Header>
          <div className="table-responsive">
            <Table hover align="middle" className="mb-0">
              <thead className="table-light">
                <tr>
                  <th className="py-3 px-3">Recruiter ID</th>
                  <th className="py-3">Hiring Manager</th>
                  <th className="py-3">Email Address</th>
                  <th className="py-3 text-center">Jobs Posted</th>
                  <th className="py-3">Registered Date</th>
                  <th className="py-3 text-end px-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingRecruiters ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5">
                      <Spinner animation="border" variant="primary" />
                      <div className="small text-muted mt-2">Loading recruiters...</div>
                    </td>
                  </tr>
                ) : recruiters.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      No recruiters registered on the platform yet.
                    </td>
                  </tr>
                ) : (
                  recruiters.map((rec) => (
                    <tr 
                      key={rec.id} 
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedRecruiter(rec)}
                    >
                      <td className="px-3">
                        <Badge bg="light" className="text-primary border font-monospace px-2 py-1">
                          #REC-{rec.id}
                        </Badge>
                      </td>
                      <td>
                        <div className="fw-bold text-dark">
                          {rec.firstName} {rec.lastName}
                        </div>
                        <small className="text-muted">@{rec.username}</small>
                      </td>
                      <td className="text-muted small">{rec.email}</td>
                      <td className="text-center">
                        <Badge bg={rec.jobsCount > 0 ? "primary" : "secondary"} pill className="px-2 py-1">
                          {rec.jobsCount || 0} {rec.jobsCount === 1 ? 'Job' : 'Jobs'}
                        </Badge>
                      </td>
                      <td className="text-muted small">
                        {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="text-end px-3">
                        <div className="d-inline-flex gap-2 align-items-center">
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            className="d-inline-flex align-items-center gap-1 rounded-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRecruiter(rec);
                            }}
                          >
                            <span>Inspect Jobs</span>
                            <ChevronRight size={14} />
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            className="d-inline-flex align-items-center gap-1 rounded-3"
                            title="Remove Recruiter"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRecruiter(rec);
                            }}
                          >
                            <Trash2 size={13} />
                            <span>Remove</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card>
      )}

      {/* ----------------- STEP 2: JOBS POSTED BY SELECTED RECRUITER ----------------- */}
      {selectedRecruiter && !selectedJob && (
        <div>
          {/* Recruiter Summary Banner */}
          <Card className="glass-card border-0 rounded-4 p-4 mb-4 shadow-sm bg-primary-gradient text-white">
            <Row className="align-items-center">
              <Col md={8}>
                <div className="small text-white-50 text-uppercase fw-bold">Recruiter Profile</div>
                <h3 className="fw-bold mb-1">{selectedRecruiter.firstName} {selectedRecruiter.lastName}</h3>
                <div className="d-flex gap-3 text-white-50 small flex-wrap">
                  <span>Recruiter ID: <strong>#REC-{selectedRecruiter.id}</strong></span>
                  <span>•</span>
                  <span>Email: <strong>{selectedRecruiter.email}</strong></span>
                  <span>•</span>
                  <span>Total Jobs: <strong>{recruiterJobs.length}</strong></span>
                </div>
              </Col>
              <Col md={4} className="text-md-end mt-3 mt-md-0 d-flex gap-2 justify-content-md-end">
                <Button 
                  variant="light" 
                  size="sm"
                  className="text-primary fw-bold rounded-pill shadow-sm"
                  onClick={() => setSelectedRecruiter(null)}
                >
                  Switch Recruiter
                </Button>
                <Button 
                  variant="danger" 
                  size="sm"
                  className="fw-bold rounded-pill shadow-sm d-inline-flex align-items-center gap-1"
                  onClick={() => handleDeleteRecruiter(selectedRecruiter)}
                >
                  <Trash2 size={13} />
                  <span>Remove Recruiter</span>
                </Button>
              </Col>
            </Row>
          </Card>

          <Card className="glass-card border-0 shadow-sm rounded-4 overflow-hidden">
            <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                <Briefcase size={20} className="text-primary" />
                Jobs Posted by {selectedRecruiter.firstName} ({recruiterJobs.length})
              </h5>
              <Badge bg="success-subtle" className="text-success">Active Listings</Badge>
            </Card.Header>
            <div className="table-responsive">
              <Table hover align="middle" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="py-3 px-3">Job ID</th>
                    <th className="py-3">Job Title & Details</th>
                    <th className="py-3">Experience</th>
                    <th className="py-3 text-center">Applicants Screened</th>
                    <th className="py-3">Posted Date</th>
                    <th className="py-3 text-end px-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingJobs ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                        <div className="small text-muted mt-2">Loading posted jobs...</div>
                      </td>
                    </tr>
                  ) : recruiterJobs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5 text-muted">
                        This recruiter has not posted any jobs yet.
                      </td>
                    </tr>
                  ) : (
                    recruiterJobs.map((job) => (
                      <tr 
                        key={job.id} 
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedJob(job)}
                      >
                        <td className="px-3">
                          <Badge bg="light" className="text-dark border font-monospace px-2 py-1">
                            #JOB-{job.id}
                          </Badge>
                        </td>
                        <td>
                          <div className="fw-bold text-dark">{job.title}</div>
                          <small className="text-muted">
                            Reqs: {job.skillsRequired ? job.skillsRequired.substring(0, 50) + '...' : 'General Skills'}
                          </small>
                        </td>
                        <td>
                          <Badge bg="light" className="text-dark border">
                            {job.experienceRequired || 0}+ yrs exp
                          </Badge>
                        </td>
                        <td className="text-center">
                          <Badge bg={job.applicantCount > 0 ? "success" : "secondary"} pill className="px-2 py-1">
                            {job.applicantCount || 0} Applicants
                          </Badge>
                        </td>
                        <td className="text-muted small">
                          {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="text-end px-3">
                          <Button 
                            variant="primary" 
                            size="sm" 
                            className="d-inline-flex align-items-center gap-1 rounded-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedJob(job);
                            }}
                          >
                            <span>View Candidates</span>
                            <ChevronRight size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* ----------------- STEP 3: CANDIDATES FOR SELECTED JOB ----------------- */}
      {selectedJob && (
        <div>
          {/* Job Summary Banner */}
          <Card className="glass-card border-0 rounded-4 p-4 mb-4 shadow-sm bg-light">
            <Row className="align-items-center">
              <Col md={8}>
                <div className="small text-muted text-uppercase fw-bold">Active Role Inspection</div>
                <h3 className="fw-bold text-dark mb-1">{selectedJob.title}</h3>
                <div className="d-flex gap-3 text-muted small flex-wrap">
                  <span>Job ID: <strong>#JOB-{selectedJob.id}</strong></span>
                  <span>•</span>
                  <span>Managing Recruiter: <strong>{selectedRecruiter?.firstName} {selectedRecruiter?.lastName} (#REC-{selectedRecruiter?.id})</strong></span>
                  <span>•</span>
                  <span>Candidates Evaluated: <strong>{candidates.length}</strong></span>
                </div>
              </Col>
              <Col md={4} className="text-md-end mt-3 mt-md-0">
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  className="rounded-pill"
                  onClick={() => setSelectedJob(null)}
                >
                  ← Back to Jobs List
                </Button>
              </Col>
            </Row>
          </Card>

          <Card className="glass-card border-0 shadow-sm rounded-4 overflow-hidden">
            <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                <Users size={20} className="text-primary" />
                Screened Candidates for {selectedJob.title} ({candidates.length})
              </h5>
              <Badge bg="primary-subtle" className="text-primary">Ranked by Match Score</Badge>
            </Card.Header>
            <div className="table-responsive">
              <Table hover align="middle" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="py-3 px-3">Candidate ID</th>
                    <th className="py-3">Candidate Name</th>
                    <th className="py-3">Source & Applied Date</th>
                    <th className="py-3 text-center">AI Match Score</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Recruiter Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingCandidates ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                        <div className="small text-muted mt-2">Loading candidate evaluations...</div>
                      </td>
                    </tr>
                  ) : candidates.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5 text-muted">
                        No candidates have applied or been batch-screened for this role yet.
                      </td>
                    </tr>
                  ) : (
                    candidates.map((cand) => (
                      <tr key={cand.applicationId}>
                        <td className="px-3">
                          <Badge bg="light" className="text-dark border font-monospace px-2 py-1">
                            #CAN-{cand.candidateId || cand.applicationId}
                          </Badge>
                        </td>
                        <td>
                          <div className="fw-bold text-dark">{cand.name}</div>
                          <small className="text-muted">{cand.email}</small>
                        </td>
                        <td>
                          <Badge bg={cand.applicationSource === 'BATCH_UPLOAD' ? 'info' : 'primary'} className="me-1">
                            {cand.applicationSource === 'BATCH_UPLOAD' ? 'Batch Upload' : 'Individual Apply'}
                          </Badge>
                          <div className="small text-muted mt-1">
                            {cand.appliedAt ? new Date(cand.appliedAt).toLocaleDateString() : 'Recent'}
                          </div>
                        </td>
                        <td className="text-center">
                          <div className="d-flex flex-column align-items-center">
                            <h5 className={`fw-extrabold mb-0 ${
                              cand.matchScore >= 80 ? 'text-success' : cand.matchScore >= 60 ? 'text-warning' : 'text-danger'
                            }`}>
                              {Math.round(cand.matchScore || 0)}%
                            </h5>
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                              Skills: {Math.round(cand.skillMatchScore || 0)}% | Exp: {Math.round(cand.experienceScore || 0)}%
                            </small>
                          </div>
                        </td>
                        <td>
                          {getStatusBadge(cand.status)}
                        </td>
                        <td>
                          {cand.recruiterFeedback ? (
                            <div className="p-2 rounded bg-light border small text-dark" style={{ maxWidth: '280px' }}>
                              <em>"{cand.recruiterFeedback}"</em>
                            </div>
                          ) : (
                            <span className="text-muted small">No feedback recorded</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Card>
        </div>
      )}
    </Layout>
  );
};

export default AdminRecruitersOverview;
