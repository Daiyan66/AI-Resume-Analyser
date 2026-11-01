import React, { useState } from 'react';
import { Card, Table, Button, Badge, Spinner, Row, Col, Alert, Breadcrumb } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
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
  Info
} from 'lucide-react';

export const AdminCandidatesOverview = () => {
  const [selectedRecruiter, setSelectedRecruiter] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);

  // 1. Fetch All Recruiters
  const { data: recruiters = [], isLoading: loadingRecruiters } = useQuery({
    queryKey: ['adminRecruiters'],
    queryFn: async () => {
      const res = await api.get('/admin/recruiters');
      return res.data || [];
    }
  });

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
              {selectedRecruiter.firstName} {selectedRecruiter.lastName} (ID #{selectedRecruiter.id})
            </Breadcrumb.Item>
          )}
          {selectedJob && (
            <Breadcrumb.Item active>
              {selectedJob.title} (Job ID #{selectedJob.id})
            </Breadcrumb.Item>
          )}
        </Breadcrumb>

        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h2 className="fw-extrabold text-dark mb-1 d-flex align-items-center gap-2">
              <Layers className="text-primary" size={26} />
              Platform Candidate Intelligence & Hierarchy
            </h2>
            <p className="text-muted mb-0">
              {selectedJob ? (
                <>Candidate evaluation details for <strong>{selectedJob.title}</strong></>
              ) : selectedRecruiter ? (
                <>Active job openings managed by <strong>{selectedRecruiter.firstName} {selectedRecruiter.lastName}</strong></>
              ) : (
                'Select a recruiter to inspect their posted openings and candidate pipelines'
              )}
            </p>
          </div>

          {(selectedJob || selectedRecruiter) && (
            <Button 
              variant="outline-secondary" 
              size="sm"
              className="d-flex align-items-center gap-1"
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

      {/* Admin Privacy Alert Notice */}
      <Alert variant="info" className="py-2 px-3 small border-0 shadow-sm rounded-3 mb-4 d-flex align-items-center gap-2">
        <Info size={18} className="text-info flex-shrink-0" />
        <span>
          <strong>Administrator Audit Mode:</strong> You are viewing candidate pipeline metadata and match metrics across recruiters. Direct resume document downloads are restricted for admin compliance.
        </span>
      </Alert>

      {/* ----------------- STEP 1: ALL RECRUITERS LIST ----------------- */}
      {!selectedRecruiter && (
        <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
          <Card.Header className="bg-white py-3 border-bottom">
            <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
              <Users size={20} className="text-primary" />
              Registered Recruiters ({recruiters.length})
            </h5>
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
                    </td>
                  </tr>
                ) : recruiters.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      No recruiters registered yet.
                    </td>
                  </tr>
                ) : (
                  recruiters.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3">
                        <Badge bg="primary-subtle" className="text-primary border border-primary-subtle font-monospace px-2 py-1">
                          Recruiter ID: #{r.id}
                        </Badge>
                      </td>
                      <td>
                        <div className="fw-bold text-dark">{r.firstName} {r.lastName}</div>
                        <div className="text-muted small">@{r.username}</div>
                      </td>
                      <td>{r.email}</td>
                      <td className="text-center">
                        <Badge bg="indigo-subtle" className="text-indigo border border-indigo-subtle px-2 py-1 fs-6">
                          {r.jobsCount} {r.jobsCount === 1 ? 'Job' : 'Jobs'}
                        </Badge>
                      </td>
                      <td className="text-muted small">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="text-end px-3">
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          className="d-inline-flex align-items-center gap-1"
                          onClick={() => setSelectedRecruiter(r)}
                        >
                          <span>View Posted Jobs</span>
                          <ChevronRight size={15} />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card>
      )}

      {/* ----------------- STEP 2: RECRUITER'S JOBS LIST ----------------- */}
      {selectedRecruiter && !selectedJob && (
        <div>
          <Card className="border-0 shadow-sm rounded-4 p-4 mb-4 bg-primary text-white">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <span className="badge bg-white text-primary mb-2 font-monospace">
                  Recruiter ID: #{selectedRecruiter.id}
                </span>
                <h4 className="fw-bold mb-1">{selectedRecruiter.firstName} {selectedRecruiter.lastName}</h4>
                <div className="text-white-50 small">{selectedRecruiter.email} &bull; @{selectedRecruiter.username}</div>
              </div>
              <Button 
                variant="light" 
                size="sm" 
                onClick={() => setSelectedRecruiter(null)}
              >
                Change Recruiter
              </Button>
            </div>
          </Card>

          <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
            <Card.Header className="bg-white py-3 border-bottom">
              <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                <Briefcase size={20} className="text-primary" />
                Jobs Posted by this Recruiter ({recruiterJobs.length})
              </h5>
            </Card.Header>
            <div className="table-responsive">
              <Table hover align="middle" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="py-3 px-3">Job ID</th>
                    <th className="py-3">Job Title</th>
                    <th className="py-3">Experience & Education</th>
                    <th className="py-3">Skills Required</th>
                    <th className="py-3 text-center">Total Applicants</th>
                    <th className="py-3">Date Posted</th>
                    <th className="py-3 text-end px-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingJobs ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                      </td>
                    </tr>
                  ) : recruiterJobs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">
                        This recruiter has not posted any jobs yet.
                      </td>
                    </tr>
                  ) : (
                    recruiterJobs.map((j) => (
                      <tr key={j.id}>
                        <td className="px-3">
                          <Badge bg="secondary-subtle" className="text-secondary border border-secondary-subtle font-monospace px-2 py-1">
                            Job ID: #{j.id}
                          </Badge>
                        </td>
                        <td>
                          <div className="fw-bold text-dark">{j.title}</div>
                        </td>
                        <td>
                          <div className="small fw-semibold">{j.experienceRequired || 0}+ Years Exp</div>
                          <div className="text-muted small">{j.educationLevel || "Bachelor's"}</div>
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-1" style={{ maxWidth: '280px' }}>
                            {(j.skillsRequired || '').split(',').slice(0, 3).map((s, idx) => (
                              <Badge key={idx} bg="light" className="text-dark border small">
                                {s.trim()}
                              </Badge>
                            ))}
                            {(j.skillsRequired || '').split(',').length > 3 && (
                              <Badge bg="light" className="text-muted border small">
                                +{(j.skillsRequired || '').split(',').length - 3} more
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="text-center">
                          <Badge bg="primary-subtle" className="text-primary border border-primary-subtle px-2 py-1 fs-6">
                            {j.applicantCount || 0} {j.applicantCount === 1 ? 'Candidate' : 'Candidates'}
                          </Badge>
                        </td>
                        <td className="text-muted small">
                          {new Date(j.createdAt).toLocaleDateString()}
                        </td>
                        <td className="text-end px-3">
                          <Button 
                            variant="primary" 
                            size="sm"
                            className="d-inline-flex align-items-center gap-1"
                            onClick={() => setSelectedJob(j)}
                          >
                            <span>Inspect Candidates</span>
                            <ChevronRight size={15} />
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
      {selectedRecruiter && selectedJob && (
        <div>
          <Card className="border-0 shadow-sm rounded-4 p-4 mb-4 bg-white">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
              <div>
                <div className="d-flex gap-2 mb-2 flex-wrap">
                  <Badge bg="primary-subtle" className="text-primary border border-primary-subtle font-monospace">
                    Recruiter ID: #{selectedRecruiter.id} &bull; {selectedRecruiter.firstName} {selectedRecruiter.lastName}
                  </Badge>
                  <Badge bg="success-subtle" className="text-success border border-success-subtle font-monospace">
                    Job ID: #{selectedJob.id}
                  </Badge>
                </div>
                <h3 className="fw-bold mb-1 text-dark">{selectedJob.title}</h3>
                <p className="text-muted mb-0 small">
                  Required: {selectedJob.experienceRequired || 0}+ yrs exp &bull; {selectedJob.educationLevel || "Bachelor's"} &bull; Skills: {selectedJob.skillsRequired || "N/A"}
                </p>
              </div>
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={() => setSelectedJob(null)}
              >
                Choose Another Job
              </Button>
            </div>
          </Card>

          <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
            <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                <Users size={20} className="text-primary" />
                Candidate Pool for this Opening ({candidates.length})
              </h5>
              <div className="text-muted small">
                Ranked by Multi-Dimensional ATS AI Fit Score
              </div>
            </Card.Header>
            <div className="table-responsive">
              <Table hover align="middle" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="py-3 px-3">Candidate ID</th>
                    <th className="py-3">Candidate Name</th>
                    <th className="py-3">Email Address</th>
                    <th className="py-3">Source Type</th>
                    <th className="py-3">AI Fit Score</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Key Skills</th>
                    <th className="py-3 text-end px-3">Applied Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingCandidates ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                      </td>
                    </tr>
                  ) : candidates.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5 text-muted">
                        No candidates have applied or been batch-screened for this job opening.
                      </td>
                    </tr>
                  ) : (
                    candidates.map((c) => (
                      <tr key={c.applicationId}>
                        <td className="px-3">
                          {c.candidateId ? (
                            <Badge bg="success-subtle" className="text-success border border-success-subtle font-monospace px-2 py-1">
                              Candidate ID: #{c.candidateId}
                            </Badge>
                          ) : (
                            <Badge bg="secondary-subtle" className="text-secondary border border-secondary-subtle font-monospace px-2 py-1">
                              App ID: #{c.applicationId}
                            </Badge>
                          )}
                        </td>
                        <td>
                          <div className="fw-bold text-dark">{c.name}</div>
                          <div className="text-muted small font-monospace">Application #{c.applicationId}</div>
                        </td>
                        <td>{c.email}</td>
                        <td>
                          {c.applicationSource === 'BATCH_UPLOAD' ? (
                            <Badge bg="warning-subtle" className="text-warning-emphasis border border-warning-subtle">
                              Batch Screening {c.batchId ? `(${c.batchId.substring(0, 14)})` : ''}
                            </Badge>
                          ) : (
                            <Badge bg="info-subtle" className="text-info-emphasis border border-info-subtle">
                              Direct Applicant (Individual Apply)
                            </Badge>
                          )}
                        </td>
                        <td>
                          <Badge 
                            bg={(c.matchScore || 0) >= 75 ? 'success' : (c.matchScore || 0) >= 50 ? 'primary' : 'secondary'} 
                            className="fs-6 px-2 py-1"
                          >
                            {Math.round(c.matchScore || 0)}%
                          </Badge>
                        </td>
                        <td>{getStatusBadge(c.status)}</td>
                        <td>
                          <div className="d-flex flex-wrap gap-1" style={{ maxWidth: '240px' }}>
                            {(c.matchedSkills || []).slice(0, 3).map((s, idx) => (
                              <Badge key={idx} bg="light" className="text-dark border small">
                                {s}
                              </Badge>
                            ))}
                            {(c.matchedSkills || []).length > 3 && (
                              <Badge bg="light" className="text-muted border small">
                                +{(c.matchedSkills || []).length - 3}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="text-end px-3 text-muted small">
                          {c.appliedAt ? new Date(c.appliedAt).toLocaleDateString() : 'Recent'}
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
