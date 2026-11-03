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
  Info,
  GraduationCap,
  MapPin,
  Mail,
  Phone,
  FileText
} from 'lucide-react';

export const AdminCandidatesOverview = () => {
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // 1. Fetch All Candidates
  const { data: candidates = [], isLoading: loadingCandidates } = useQuery({
    queryKey: ['adminAllCandidates'],
    queryFn: async () => {
      const res = await api.get('/admin/candidates');
      return res.data || [];
    }
  });

  // 2. Fetch Applications for Selected Candidate
  const { data: applications = [], isLoading: loadingApps } = useQuery({
    queryKey: ['adminCandidateApplications', selectedCandidate?.id],
    queryFn: async () => {
      const res = await api.get(`/admin/candidates/${selectedCandidate.id}/applications`);
      return res.data || [];
    },
    enabled: !!selectedCandidate
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
            active={!selectedCandidate}
            onClick={() => setSelectedCandidate(null)}
            style={{ cursor: selectedCandidate ? 'pointer' : 'default' }}
          >
            All Candidates
          </Breadcrumb.Item>
          {selectedCandidate && (
            <Breadcrumb.Item active>
              {selectedCandidate.firstName} {selectedCandidate.lastName} (ID #CAN-{selectedCandidate.id})
            </Breadcrumb.Item>
          )}
        </Breadcrumb>

        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h2 className="fw-extrabold text-dark mb-1 d-flex align-items-center gap-2">
              <Users className="text-success" size={26} />
              Candidate Directory & Application History
            </h2>
            <p className="text-muted mb-0">
              {selectedCandidate ? (
                <>All job applications submitted by <strong>{selectedCandidate.firstName} {selectedCandidate.lastName}</strong> (Candidate ID #CAN-{selectedCandidate.id})</>
              ) : (
                'Select a candidate to view their complete profile and all jobs they have applied to'
              )}
            </p>
          </div>

          {selectedCandidate && (
            <Button 
              variant="outline-secondary" 
              size="sm" 
              className="d-flex align-items-center gap-1 rounded-3"
              onClick={() => setSelectedCandidate(null)}
            >
              <ArrowLeft size={16} /> Back to Candidates
            </Button>
          )}
        </div>
      </div>

      {/* Admin Privacy Alert Notice */}
      <Alert variant="info" className="py-2 px-3 small border-0 shadow-sm rounded-3 mb-4 d-flex align-items-center gap-2">
        <Info size={18} className="text-info flex-shrink-0" />
        <span>
          <strong>Administrator Audit Mode:</strong> Viewing candidate profiles and cross-recruiter job applications. Direct resume document downloads are restricted for admin compliance.
        </span>
      </Alert>

      {/* ----------------- STEP 1: ALL CANDIDATES LIST ----------------- */}
      {!selectedCandidate && (
        <Card className="glass-card border-0 shadow-sm rounded-4 overflow-hidden">
          <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
            <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
              <Users size={20} className="text-success" />
              Registered Candidates ({candidates.length})
            </h5>
            <Badge bg="success-subtle" className="text-success">Candidate Roster</Badge>
          </Card.Header>
          <div className="table-responsive">
            <Table hover align="middle" className="mb-0">
              <thead className="table-light">
                <tr>
                  <th className="py-3 px-3">Candidate ID</th>
                  <th className="py-3">Candidate Name</th>
                  <th className="py-3">Headline & Degree</th>
                  <th className="py-3">Experience</th>
                  <th className="py-3 text-center">Applications</th>
                  <th className="py-3">Registered Date</th>
                  <th className="py-3 text-end px-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingCandidates ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <Spinner animation="border" variant="success" />
                      <div className="small text-muted mt-2">Loading candidates...</div>
                    </td>
                  </tr>
                ) : candidates.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      No candidates registered on the platform yet.
                    </td>
                  </tr>
                ) : (
                  candidates.map((c) => (
                    <tr 
                      key={c.id} 
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedCandidate(c)}
                    >
                      <td className="px-3">
                        <Badge bg="light" className="text-success border font-monospace px-2 py-1">
                          #CAN-{c.id}
                        </Badge>
                      </td>
                      <td>
                        <div className="fw-bold text-dark">
                          {c.firstName} {c.lastName}
                        </div>
                        <small className="text-muted">{c.email}</small>
                      </td>
                      <td>
                        <div className="small fw-semibold text-dark">
                          {c.headline || `${c.educationLevel || 'Graduate'} in ${c.fieldOfStudy || 'Tech'}`}
                        </div>
                        <small className="text-muted">{c.university || 'Higher Education'}</small>
                      </td>
                      <td>
                        <Badge bg="light" className="text-dark border">
                          {c.yearsExperience || '0-1'} yrs exp
                        </Badge>
                      </td>
                      <td className="text-center">
                        <Badge bg={c.applicationsCount > 0 ? "success" : "secondary"} pill className="px-2 py-1">
                          {c.applicationsCount || 0} {c.applicationsCount === 1 ? 'Job' : 'Jobs'}
                        </Badge>
                      </td>
                      <td className="text-muted small">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="text-end px-3">
                        <Button 
                          variant="outline-success" 
                          size="sm" 
                          className="d-inline-flex align-items-center gap-1 rounded-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCandidate(c);
                          }}
                        >
                          <span>View Applications</span>
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
      )}

      {/* ----------------- STEP 2: JOBS APPLIED BY SELECTED CANDIDATE ----------------- */}
      {selectedCandidate && (
        <div>
          {/* Candidate Profile Details Card */}
          <Card className="glass-card border-0 rounded-4 p-4 mb-4 shadow-sm bg-success-gradient text-white">
            <Row className="align-items-center">
              <Col md={8}>
                <div className="small text-white-50 text-uppercase fw-bold">Candidate Profile</div>
                <h3 className="fw-bold mb-1">
                  {selectedCandidate.firstName} {selectedCandidate.lastName}
                </h3>
                <div className="mb-2 text-white-70 small">
                  {selectedCandidate.headline || `${selectedCandidate.educationLevel || 'Graduate'} in ${selectedCandidate.fieldOfStudy || 'General'}`}
                </div>
                <div className="d-flex gap-3 text-white-50 small flex-wrap">
                  <span>Candidate ID: <strong>#CAN-{selectedCandidate.id}</strong></span>
                  <span>•</span>
                  <span>Email: <strong>{selectedCandidate.email}</strong></span>
                  {selectedCandidate.location && (
                    <>
                      <span>•</span>
                      <span>Location: <strong>{selectedCandidate.location}</strong></span>
                    </>
                  )}
                  <span>•</span>
                  <span>Total Jobs Applied: <strong>{applications.length}</strong></span>
                </div>

                {selectedCandidate.skillsSummary && (
                  <div className="mt-2 pt-2 border-top border-white-50">
                    <span className="small text-white-50 me-1">Declared Skills:</span>
                    <span className="small text-white fw-semibold">{selectedCandidate.skillsSummary}</span>
                  </div>
                )}
              </Col>
              <Col md={4} className="text-md-end mt-3 mt-md-0">
                <Button 
                  variant="light" 
                  size="sm"
                  className="text-success fw-bold rounded-pill shadow-sm"
                  onClick={() => setSelectedCandidate(null)}
                >
                  Switch Candidate
                </Button>
              </Col>
            </Row>
          </Card>

          {/* Table of Applied Jobs */}
          <Card className="glass-card border-0 shadow-sm rounded-4 overflow-hidden">
            <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                <Briefcase size={20} className="text-success" />
                Jobs Applied by {selectedCandidate.firstName} ({applications.length})
              </h5>
              <Badge bg="success-subtle" className="text-success">Application History</Badge>
            </Card.Header>
            <div className="table-responsive">
              <Table hover align="middle" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="py-3 px-3">App ID</th>
                    <th className="py-3">Job Title & ID</th>
                    <th className="py-3">Hiring Company & Recruiter</th>
                    <th className="py-3">Applied Date</th>
                    <th className="py-3 text-center">AI Match Score</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Recruiter Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingApps ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5">
                        <Spinner animation="border" variant="success" />
                        <div className="small text-muted mt-2">Loading applications...</div>
                      </td>
                    </tr>
                  ) : applications.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">
                        This candidate has not applied to any job postings yet.
                      </td>
                    </tr>
                  ) : (
                    applications.map((app) => (
                      <tr key={app.id}>
                        <td className="px-3">
                          <Badge bg="light" className="text-dark border font-monospace px-2 py-1">
                            #APP-{app.id}
                          </Badge>
                        </td>
                        <td>
                          <div className="fw-bold text-dark">{app.jobTitle}</div>
                          <small className="text-muted font-monospace">#JOB-{app.jobId}</small>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark">{app.companyName || 'Enterprise Partner'}</div>
                          <small className="text-muted">Recruiter: {app.recruiterName || 'Talent Team'}</small>
                        </td>
                        <td className="text-muted small">
                          {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'Recent'}
                        </td>
                        <td className="text-center">
                          <div className="d-flex flex-column align-items-center">
                            <h5 className={`fw-extrabold mb-0 ${
                              app.matchScore >= 80 ? 'text-success' : app.matchScore >= 60 ? 'text-warning' : 'text-danger'
                            }`}>
                              {Math.round(app.matchScore || 0)}%
                            </h5>
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                              Skills: {Math.round(app.skillMatchScore || 0)}% | Exp: {Math.round(app.experienceScore || 0)}%
                            </small>
                          </div>
                        </td>
                        <td>
                          {getStatusBadge(app.status)}
                        </td>
                        <td>
                          {app.recruiterFeedback ? (
                            <div className="p-2 rounded bg-light border small text-dark" style={{ maxWidth: '280px' }}>
                              <em>"{app.recruiterFeedback}"</em>
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

export default AdminCandidatesOverview;
