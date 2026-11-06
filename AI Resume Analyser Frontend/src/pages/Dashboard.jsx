import React from 'react';
import { Row, Col, Card, Button, Badge, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthProvider';
import { Layout } from '../components/Layout';
import api from '../api/axios';
import { 
  Users, 
  Briefcase, 
  FileText, 
  UploadCloud, 
  Clock, 
  TrendingUp, 
  Sparkles, 
  PieChart as PieIcon 
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

export const Dashboard = () => {
  const { user } = useAuth();
  const userRole = (user?.role || '').toUpperCase();
  const isAdmin = userRole === 'ROLE_ADMIN';
  const isRecruiter = userRole === 'ROLE_RECRUITER';
  // Candidate if ROLE_CANDIDATE or if role not specified (or non-admin/recruiter)
  const isCandidate = userRole === 'ROLE_CANDIDATE' || (!isAdmin && !isRecruiter);

  // Admin Stats Query
  const { data: adminStats, isLoading: loadingAdmin } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data;
    },
    enabled: isAdmin
  });

  // Recruiter Stats Query
  const { data: recruiterStats, isLoading: loadingRecruiter } = useQuery({
    queryKey: ['recruiterStats'],
    queryFn: async () => {
      const res = await api.get('/recruiter/stats');
      return res.data;
    },
    enabled: isRecruiter
  });

  // Candidate Data Query
  const { data: candidateApps = [], isLoading: loadingCandidateApps } = useQuery({
    queryKey: ['candidateApps'],
    queryFn: async () => {
      const res = await api.get('/candidate/applications');
      return res.data || [];
    },
    enabled: isCandidate
  });

  const { data: recommendations = [], isLoading: loadingRecs } = useQuery({
    queryKey: ['candidateRecs'],
    queryFn: async () => {
      const res = await api.get('/candidate/recommendations');
      return res.data || [];
    },
    enabled: isCandidate
  });

  const safeApps = Array.isArray(candidateApps) ? candidateApps : [];
  const safeRecs = Array.isArray(recommendations) ? recommendations : [];

  return (
    <Layout>
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h2 className="fw-extrabold text-dark mb-1">
            Welcome, {user?.firstName || user?.username || 'User'}! 👋
          </h2>
          <p className="text-muted mb-0">
            {isAdmin && 'Enterprise System Administration & AI Performance Analytics'}
            {isRecruiter && 'Recruiter Pipeline, Screening Hub & Talent Insights'}
            {isCandidate && 'Your Career Opportunities & AI Resume Fit Hub'}
          </p>
        </div>

        {isRecruiter && (
          <div className="d-flex gap-2">
            <Button as={Link} to="/recruiter/upload-resumes" variant="primary" className="d-flex align-items-center gap-2">
              <UploadCloud size={18} />
              <span>Batch Screen Resumes</span>
            </Button>
            <Button as={Link} to="/recruiter/upload-job" variant="outline-primary" className="d-flex align-items-center gap-2">
              <Briefcase size={18} />
              <span>Post New Opening</span>
            </Button>
          </div>
        )}
      </div>

      {/* -------------------- ADMIN DASHBOARD -------------------- */}
      {isAdmin && (
        <>
          {loadingAdmin ? (
            <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
          ) : (
            <>
              {/* Stat Cards */}
              <Row className="g-3 mb-4">
                <Col md={3} sm={6}>
                  <Card className="border-0 shadow-sm rounded-4 p-3 stat-card bg-primary-gradient text-white">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="small text-white-50">Total Registered Users</span>
                      <Users size={20} className="text-white-50" />
                    </div>
                    <h3 className="fw-bold mb-0">{adminStats?.totalUsers || 0}</h3>
                    <div className="small text-white-50 mt-1">Platform Accounts</div>
                  </Card>
                </Col>
                <Col md={3} sm={6}>
                  <Card className="border-0 shadow-sm rounded-4 p-3 stat-card bg-success-gradient text-white">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="small text-white-50">Registered Candidates</span>
                      <Users size={20} className="text-white-50" />
                    </div>
                    <h3 className="fw-bold mb-0">{adminStats?.totalCandidates || 0}</h3>
                    <div className="small text-white-50 mt-1">Active Job Seekers</div>
                  </Card>
                </Col>
                <Col md={3} sm={6}>
                  <Card className="border-0 shadow-sm rounded-4 p-3 stat-card bg-indigo-gradient text-white">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="small text-white-50">Provisioned Recruiters</span>
                      <Users size={20} className="text-white-50" />
                    </div>
                    <h3 className="fw-bold mb-0">{adminStats?.totalRecruiters || 0}</h3>
                    <div className="small text-white-50 mt-1">Hiring Managers</div>
                  </Card>
                </Col>
                <Col md={3} sm={6}>
                  <Card className="border-0 shadow-sm rounded-4 p-3 stat-card bg-warning-gradient text-white">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="small text-white-50">Active Job Postings</span>
                      <Briefcase size={20} className="text-white-50" />
                    </div>
                    <h3 className="fw-bold mb-0">{adminStats?.totalJobs || 0}</h3>
                    <div className="small text-white-50 mt-1">Open Positions Listed</div>
                  </Card>
                </Col>
              </Row>

              {/* Charts Section */}
              <Row className="g-4 mb-4">
                <Col lg={8}>
                  <Card className="border-0 shadow-sm rounded-4 p-4 h-100 bg-white">
                    <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                      <TrendingUp size={20} className="text-primary" />
                      7-Day Activity Trends
                    </h5>
                    <div style={{ height: '320px', width: '100%' }}>
                      <ResponsiveContainer>
                        <LineChart data={adminStats?.applicationTrend || []}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" allowDecimals={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff' }} />
                          <Legend />
                          <Line type="monotone" dataKey="count" name="Applications" stroke="#4f46e5" strokeWidth={3} dot={{ r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </Col>
                <Col lg={4}>
                  <Card className="border-0 shadow-sm rounded-4 p-4 h-100 bg-white">
                    <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                      <PieIcon size={20} className="text-primary" />
                      User Role Distribution
                    </h5>
                    <div style={{ height: '320px', width: '100%' }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={adminStats?.userRoleDistribution || []}
                            dataKey="count"
                            nameKey="role"
                            cx="50%"
                            cy="50%"
                            outerRadius={95}
                            label
                          >
                            {(adminStats?.userRoleDistribution || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </>
      )}

      {/* -------------------- RECRUITER DASHBOARD -------------------- */}
      {isRecruiter && (
        <>
          {loadingRecruiter ? (
            <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
          ) : (
            <>
              <Row className="g-3 mb-4">
                <Col md={3} sm={6}>
                  <Card className="border-0 shadow-sm rounded-4 p-3 stat-card bg-primary text-white">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="small text-white-50">Active Openings</span>
                      <Briefcase size={20} className="text-white-50" />
                    </div>
                    <h3 className="fw-bold mb-0">{recruiterStats?.activeJobs || 0}</h3>
                    <div className="small text-white-50 mt-1">Currently sourcing</div>
                  </Card>
                </Col>
                <Col md={3} sm={6}>
                  <Card className="border-0 shadow-sm rounded-4 p-3 stat-card bg-warning text-white">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="small text-white-50">Pending Review</span>
                      <Clock size={20} className="text-white-50" />
                    </div>
                    <h3 className="fw-bold mb-0">{recruiterStats?.pendingApplications || 0}</h3>
                    <div className="small text-white-50 mt-1">Awaiting decision</div>
                  </Card>
                </Col>
                <Col md={3} sm={6}>
                  <Card className="border-0 shadow-sm rounded-4 p-3 stat-card bg-success text-white">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="small text-white-50">Total Candidates</span>
                      <Users size={20} className="text-white-50" />
                    </div>
                    <h3 className="fw-bold mb-0">{recruiterStats?.totalCandidates || 0}</h3>
                    <div className="small text-white-50 mt-1">Screened across jobs</div>
                  </Card>
                </Col>
                <Col md={3} sm={6}>
                  <Card className="border-0 shadow-sm rounded-4 p-3 stat-card bg-info text-white">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="small text-white-50">New Resumes Today</span>
                      <UploadCloud size={20} className="text-white-50" />
                    </div>
                    <h3 className="fw-bold mb-0">{recruiterStats?.newResumesToday || 0}</h3>
                    <div className="small text-white-50 mt-1">Uploaded in last 24h</div>
                  </Card>
                </Col>
              </Row>

              <Row className="g-4 mb-4">
                <Col lg={8}>
                  <Card className="border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                    <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                      <TrendingUp size={20} className="text-primary" />
                      Applications Volume Trend (7 Days)
                    </h5>
                    <div style={{ height: '280px', width: '100%' }}>
                      <ResponsiveContainer>
                        <BarChart data={recruiterStats?.applicationTrend || []}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" allowDecimals={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff' }} />
                          <Bar dataKey="count" name="Applications" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </Col>
                <Col lg={4}>
                  <Card className="border-0 shadow-sm rounded-4 p-4 bg-white h-100 d-flex flex-column justify-content-between">
                    <div>
                      <h5 className="fw-bold mb-3">Recruiter Quick Actions</h5>
                      <p className="text-muted small">
                        Automate your candidate pipeline using Multimodal LLM ingestion and real-time SSE progress streaming.
                      </p>
                      <div className="d-grid gap-2">
                        <Button as={Link} to="/recruiter/upload-resumes" variant="outline-primary" className="text-start py-2">
                          <UploadCloud size={18} className="me-2" />
                          Batch Screen Resumes (20+)
                        </Button>
                        <Button as={Link} to="/recruiter/upload-job" variant="outline-secondary" className="text-start py-2">
                          <Briefcase size={18} className="me-2" />
                          Post Job / Upload Spec Document
                        </Button>
                        <Button as={Link} to="/recruiter/candidates" variant="outline-dark" className="text-start py-2">
                          <Users size={18} className="me-2" />
                          Review Ranked Candidates
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-light rounded-3 small text-muted">
                      💡 Tip: Use the floating <strong>Recruiter AI Copilot</strong> widget in the bottom-right corner to instantly generate interview questions or candidate pool summaries.
                    </div>
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </>
      )}

      {/* -------------------- CANDIDATE DASHBOARD -------------------- */}
      {isCandidate && (
        <>
          <Row className="g-4 mb-4">
            <Col lg={7}>
              <Card className="border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold mb-0">My Applications Status</h5>
                  <Button as={Link} to="/candidate/status" variant="link" className="p-0 text-decoration-none small">
                    View All ({safeApps.length})
                  </Button>
                </div>

                {loadingCandidateApps ? (
                  <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>
                ) : safeApps.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <p className="mb-3">You haven't applied to any positions yet.</p>
                    <Button as={Link} to="/candidate/jobs" variant="primary" size="sm">
                      Explore Open Positions
                    </Button>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {safeApps.slice(0, 4).map((app) => (
                      <div key={app.id} className="p-3 border rounded-3 d-flex justify-content-between align-items-center bg-light-subtle">
                        <div>
                          <div className="fw-bold text-dark">{app.jobTitle}</div>
                          <span className="text-muted small">Applied on {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'Recently'}</span>
                        </div>
                        <div className="d-flex align-items-center gap-3">
                          <Badge bg={(app.matchScore || 0) >= 75 ? 'success' : 'primary'} className="fs-6 px-2 py-1">
                            {Math.round(app.matchScore || 0)}% Match
                          </Badge>
                          <Badge bg={app.status === 'ACCEPTED' ? 'success' : app.status === 'REJECTED' ? 'danger' : 'secondary'}>
                            {app.status || 'PENDING'}
                          </Badge>
                          <Button as={Link} to={`/candidate/skill-gap/${app.id}`} variant="outline-primary" size="sm">
                            Coaching Report
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </Col>

            <Col lg={5}>
              <Card className="border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <Sparkles size={20} className="text-primary" />
                  <h5 className="fw-bold mb-0">AI Recommended Positions</h5>
                </div>
                <p className="text-muted small mb-3">
                  Proactively matched to your parsed resume skills and experience depth.
                </p>

                {loadingRecs ? (
                  <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>
                ) : safeRecs.length === 0 ? (
                  <div className="text-muted small text-center py-4">
                    Submit your first application to seed your AI candidate profile for personalized recommendations!
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {safeRecs.slice(0, 3).map((job) => (
                      <div key={job.id} className="p-3 border rounded-3 bg-light-subtle">
                        <div className="fw-bold text-dark mb-1">{job.title}</div>
                        <div className="text-muted small mb-2 text-truncate">{job.skillsRequired}</div>
                        <Button as={Link} to={`/candidate/jobs`} variant="primary" size="sm" className="w-100">
                          1-Click Apply
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Layout>
  );
};
