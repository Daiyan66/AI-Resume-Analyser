import React, { useState } from 'react';
import { 
  Container, Row, Col, Card, Button, Form, Alert, Spinner, Badge, Modal, Tab, Nav 
} from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import axios from 'axios';
import { 
  Sparkles, 
  ShieldCheck, 
  FileCheck2, 
  Search, 
  Layers, 
  Mail, 
  Lock, 
  Target, 
  BarChart2, 
  Check, 
  ChevronRight,
  ExternalLink,
  Building,
  KeyRound,
  User,
  ArrowRight,
  Zap,
  CheckCircle,
  AlertTriangle,
  Award,
  BookOpen,
  Briefcase,
  Cpu,
  LogIn,
  LogOut
} from 'lucide-react';

export const LandingPage = () => {
  const { user, login, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Recruiter Access Request Modal State
  const [showRecruiterModal, setShowRecruiterModal] = useState(false);
  const [reqEmail, setReqEmail] = useState('');
  const [reqName, setReqName] = useState('');
  const [reqCompany, setReqCompany] = useState('');
  const [requestStatus, setRequestStatus] = useState(null); // 'submitting' | 'success' | 'error'
  const [responseMsg, setResponseMsg] = useState('');
  const [onboardLink, setOnboardLink] = useState('');
  const [receivedOtp, setReceivedOtp] = useState('');

  // Handle Login submission directly on Landing Page
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!username.trim() || !password.trim()) {
      setLoginError('Please enter both username and password.');
      return;
    }

    setLoginLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setLoginError(err.response?.data?.message || 'Invalid username or password. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const fillDemoAccount = (u, p) => {
    setUsername(u);
    setPassword(p);
    setLoginError('');
  };

  // Handle Recruiter Access Request
  const handleRecruiterRequest = async (e) => {
    e.preventDefault();
    setRequestStatus('submitting');
    setResponseMsg('');

    try {
      const res = await axios.post('http://localhost:8080/api/auth/recruiter-request-access', {
        email: reqEmail,
        name: reqName,
        companyName: reqCompany
      });

      setRequestStatus('success');
      setResponseMsg(res.data.message || 'Invitation sent successfully!');
      setOnboardLink(res.data.onboardingLink || '');
      setReceivedOtp(res.data.otp || '');
    } catch (err) {
      setRequestStatus('error');
      setResponseMsg(err.response?.data?.message || 'Failed to dispatch invitation. Please contact formusic7766@gmail.com directly.');
    }
  };

  return (
    <div className="landing-container min-vh-100 d-flex flex-column m-0 p-0">
      {/* Semi-Transparent Glass Sticky Navbar */}
      <nav className="navbar navbar-expand-lg navbar-glass sticky-top py-2 px-3 px-md-4 border-bottom">
        <Container fluid="xl" className="d-flex align-items-center justify-content-between p-0">
          <Link to="/" className="d-flex align-items-center text-decoration-none fw-bold fs-5 text-primary">
            <div className="p-2 rounded-3 bg-primary-subtle text-primary me-2 d-flex align-items-center justify-content-center">
              <Sparkles size={20} />
            </div>
            <span>Next-Gen <span className="text-gradient">AI ATS</span></span>
          </Link>

          <div className="d-flex align-items-center gap-2">
            <a href="#features" className="btn btn-link text-decoration-none text-secondary d-none d-md-inline-block small fw-semibold">
              Platform Capabilities
            </a>
            <a href="#recruiter-info" className="btn btn-link text-decoration-none text-secondary d-none d-md-inline-block small fw-semibold">
              Recruiter Access
            </a>

            {isAuthenticated && (
              <div className="d-flex align-items-center gap-2">
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="d-flex align-items-center gap-1 rounded-pill px-3 shadow-sm"
                  onClick={() => navigate('/dashboard')}
                >
                  <span>Go to Workspace</span>
                  <ArrowRight size={15} />
                </Button>
                <Button 
                  variant="outline-danger" 
                  size="sm" 
                  className="rounded-pill px-2"
                  onClick={logout}
                  title="Sign Out"
                >
                  <LogOut size={14} />
                </Button>
              </div>
            )}
          </div>
        </Container>
      </nav>

      {/* Hero Section with Embedded Login Card */}
      <section className="hero-section py-4 py-md-5 position-relative flex-grow-1 flush-nav-content">
        <Container fluid="xl" className="px-3 px-md-4">
          <Row className="align-items-center g-4">
            {/* Left Hero Column: Dual-Persona Value Proposition */}
            <Col lg={7} className="pe-lg-4">
              <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-primary-subtle text-primary border border-primary-subtle mb-3 small fw-bold">
                <Sparkles size={14} />
                <span>Next-Gen Multimodal AI Recruitment Architecture</span>
              </div>

              <h1 className="display-5 fw-extrabold text-dark tracking-tight mb-3" style={{ lineHeight: 1.15 }}>
                Where Elite Talent Meets <span className="text-gradient">Verified Opportunity</span>
              </h1>

              <p className="lead text-secondary mb-4" style={{ fontSize: '1.05rem', lineHeight: '1.6' }}>
                A unified, bias-free AI screening ecosystem that transforms hiring. Candidates enjoy 
                transparent scoring, personalized learning roadmaps, and zero black-hole applications. 
                Enterprise recruiters screen 20+ bulk resumes in seconds with defensible rubrics and anti-cheat defense.
              </p>

              {/* Dual Value Cards */}
              <Row className="g-3 mb-4">
                <Col sm={6}>
                  <Card className="glass-card-subtle border-0 rounded-4 p-3 h-100 hover-card">
                    <div className="d-flex align-items-center gap-2 mb-2 text-primary fw-bold small">
                      <Target size={18} /> For Ambitious Candidates
                    </div>
                    <p className="small text-muted mb-0">
                      Understand exactly why you match or miss a role. Get instant Google Search skill-gap roadmaps and transparent feedback notifications.
                    </p>
                  </Card>
                </Col>

                <Col sm={6}>
                  <Card className="glass-card-subtle border-0 rounded-4 p-3 h-100 hover-card">
                    <div className="d-flex align-items-center gap-2 mb-2 text-success fw-bold small">
                      <ShieldCheck size={18} /> For Verified Recruiters
                    </div>
                    <p className="small text-muted mb-0">
                      Batch-process 20+ resumes with multi-pillar evaluation (Skills, Experience, Education, Semantics) and automated white-font anti-cheat detection.
                    </p>
                  </Card>
                </Col>
              </Row>

              {/* Key Platform Metrics */}
              <div className="d-flex align-items-center flex-wrap gap-4 pt-2 border-top">
                <div>
                  <h4 className="fw-extrabold text-dark mb-0">98.4%</h4>
                  <small className="text-muted">Semantic Precision</small>
                </div>
                <div className="border-start ps-4">
                  <h4 className="fw-extrabold text-dark mb-0">&lt; 15s</h4>
                  <small className="text-muted">20+ Batch Parsing</small>
                </div>
                <div className="border-start ps-4">
                  <h4 className="fw-extrabold text-dark mb-0">100%</h4>
                  <small className="text-muted">Anti-Cheat Defense</small>
                </div>
                <div className="border-start ps-4">
                  <h4 className="fw-extrabold text-dark mb-0">0</h4>
                  <small className="text-muted">Black-Hole Apps</small>
                </div>
              </div>
            </Col>

            {/* Right Column: Embedded Interactive Login Card */}
            <Col lg={5} id="login-card-section">
              <Card className="glass-card shadow-lg border-0 rounded-4 p-4 p-md-4 position-relative">
                <div className="mb-3 border-bottom pb-2">
                  <h5 className="fw-extrabold text-dark mb-0 d-flex align-items-center gap-2">
                    <LogIn size={20} className="text-primary" /> Workspace Sign In
                  </h5>
                </div>

                {isAuthenticated ? (
                  /* Logged-In User Quick Access Widget */
                  <div className="text-center py-3">
                    <div className="d-inline-flex p-3 rounded-circle bg-success-subtle text-success mb-2">
                      <CheckCircle size={32} />
                    </div>
                    <h5 className="fw-bold text-dark mb-1">
                      Welcome, {user?.firstName || user?.username}!
                    </h5>
                    <p className="small text-muted mb-3">
                      You are signed in as <Badge bg="primary">{user?.role?.replace('ROLE_', '') || 'User'}</Badge>
                    </p>
                    <div className="d-grid gap-2 mb-2">
                      <Button 
                        variant="primary" 
                        size="lg" 
                        className="fw-bold rounded-3 shadow-sm d-flex align-items-center justify-content-center gap-2"
                        onClick={() => navigate('/dashboard')}
                      >
                        <span>Enter Workspace Dashboard</span>
                        <ArrowRight size={18} />
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        size="sm" 
                        className="rounded-3"
                        onClick={logout}
                      >
                        Sign Out
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Standard Login Form */
                  <Form onSubmit={handleLoginSubmit}>
                    {loginError && (
                      <Alert variant="danger" className="small py-2 mb-3 d-flex align-items-center gap-2">
                        <AlertTriangle size={16} className="flex-shrink-0" />
                        <span>{loginError}</span>
                      </Alert>
                    )}

                    <Form.Group className="mb-3">
                      <Form.Label className="small fw-bold text-secondary mb-1">Username or Email</Form.Label>
                      <div className="position-relative">
                        <Form.Control
                          type="text"
                          required
                          placeholder="e.g. candidate, recruiter, or email"
                          value={username}
                          onChange={(e) => {
                            setUsername(e.target.value);
                            setLoginError('');
                          }}
                          className="form-control-sleek ps-3"
                        />
                      </div>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label className="small fw-bold text-secondary mb-1">Password</Form.Label>
                      <Form.Control
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setLoginError('');
                        }}
                        className="form-control-sleek ps-3"
                      />
                    </Form.Group>

                    <Button
                      variant="primary"
                      type="submit"
                      disabled={loginLoading}
                      className="w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-3 shadow-sm mb-3"
                    >
                      {loginLoading ? (
                        <>
                          <Spinner size="sm" animation="border" />
                          <span>Authenticating...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In to Platform</span>
                          <ArrowRight size={18} />
                        </>
                      )}
                    </Button>

                    {/* Quick Demo One-Click Sign-In Helpers */}
                    <div className="pt-2 border-top text-center mb-3">
                      <div className="small text-muted mb-2">⚡ Quick Demo One-Click Fill:</div>
                      <div className="d-flex justify-content-center gap-1 flex-wrap">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="px-2 py-1 small"
                          onClick={() => fillDemoAccount('admin', 'admin123')}
                        >
                          Admin
                        </Button>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="px-2 py-1 small"
                          onClick={() => fillDemoAccount('recruiter', 'recruiter123')}
                        >
                          Recruiter
                        </Button>
                        <Button
                          variant="outline-success"
                          size="sm"
                          className="px-2 py-1 small"
                          onClick={() => fillDemoAccount('candidate', 'candidate123')}
                        >
                          Candidate
                        </Button>
                      </div>
                    </div>

                    {/* Pathway for New Candidates */}
                    <div className="bg-light-subtle rounded-3 p-2 text-center small border">
                      <div>
                        <span className="text-muted">Looking for a job? </span>
                        <Link to="/register" className="fw-bold text-primary text-decoration-none">
                          Candidate Tunnel Sign Up →
                        </Link>
                      </div>
                    </div>
                  </Form>
                )}
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Feature Showcase Section */}
      <section id="features" className="py-5 bg-white border-top border-bottom">
        <Container fluid="xl" className="px-3 px-md-4">
          <div className="text-center max-w-2xl mx-auto mb-5">
            <Badge bg="primary-subtle" className="text-primary px-3 py-1 rounded-pill mb-2">
              Defensible AI Architecture
            </Badge>
            <h2 className="fw-extrabold text-dark">Engineered for Transparency & Scale</h2>
            <p className="text-muted small">
              Our 4-pillar neural matching model scores candidates with complete mathematical clarity.
            </p>
          </div>

          <Row className="g-4">
            <Col md={3} sm={6}>
              <Card className="border-0 shadow-sm rounded-4 p-4 h-100 bg-light-subtle text-center hover-card">
                <div className="avatar-circle bg-primary-subtle text-primary mx-auto mb-3">
                  <Award size={22} />
                </div>
                <h6 className="fw-bold text-dark">40% Technical Skills</h6>
                <p className="small text-muted mb-0">
                  Exact and semantic synonym matching against required frameworks, libraries, and languages.
                </p>
              </Card>
            </Col>

            <Col md={3} sm={6}>
              <Card className="border-0 shadow-sm rounded-4 p-4 h-100 bg-light-subtle text-center hover-card">
                <div className="avatar-circle bg-success-subtle text-success mx-auto mb-3">
                  <Briefcase size={22} />
                </div>
                <h6 className="fw-bold text-dark">25% Experience Depth</h6>
                <p className="small text-muted mb-0">
                  Seniority calibration, tenure alignment, and industry-specific project responsibility evaluation.
                </p>
              </Card>
            </Col>

            <Col md={3} sm={6}>
              <Card className="border-0 shadow-sm rounded-4 p-4 h-100 bg-light-subtle text-center hover-card">
                <div className="avatar-circle bg-indigo-subtle text-primary mx-auto mb-3">
                  <BookOpen size={22} />
                </div>
                <h6 className="fw-bold text-dark">20% Academic Baseline</h6>
                <p className="small text-muted mb-0">
                  Degree qualification, relevant fields of study, and institutional accreditation weighting.
                </p>
              </Card>
            </Col>

            <Col md={3} sm={6}>
              <Card className="border-0 shadow-sm rounded-4 p-4 h-100 bg-light-subtle text-center hover-card">
                <div className="avatar-circle bg-warning-subtle text-warning mx-auto mb-3">
                  <Cpu size={22} />
                </div>
                <h6 className="fw-bold text-dark">15% Semantic Context</h6>
                <p className="small text-muted mb-0">
                  Cosine similarity vector embeddings capturing holistic career trajectory and role synergy.
                </p>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Recruiter Management Onboarding Instruction Card */}
      <section id="recruiter-info" className="py-5 bg-light-subtle">
        <Container fluid="xl" className="px-3 px-md-4">
          <Card className="glass-card border-0 rounded-4 p-4 p-md-5 shadow-sm">
            <Row className="align-items-center g-4">
              <Col lg={8}>
                <div className="d-flex align-items-center gap-2 text-warning mb-2 fw-bold small">
                  <ShieldCheck size={20} /> Corporate Recruiter Protocol
                </div>
                <h3 className="fw-extrabold text-dark mb-2">
                  Want to Post Jobs & Screen Resumes?
                </h3>
                <p className="text-secondary small mb-3">
                  To protect candidates from unverified postings, recruiters cannot register directly through the public candidate form.
                  Corporate accounts must be verified by Management via <strong className="text-dark">formusic7766@gmail.com</strong>.
                </p>
                <div className="bg-white rounded-3 p-3 border mb-3">
                  <h6 className="fw-bold text-dark small mb-2 d-flex align-items-center gap-1">
                    <KeyRound size={16} className="text-primary" /> Automated Verification Flow:
                  </h6>
                  <ol className="small text-muted mb-0 ps-3">
                    <li className="mb-1">Click "Request Recruiter Access" or email Management directly.</li>
                    <li className="mb-1">Our automated daemon sends an invitation link with a 6-digit OTP code to your Gmail.</li>
                    <li>Open the link, input your OTP, and upload your Company ID / Employment verification to activate your suite.</li>
                  </ol>
                </div>
              </Col>
              <Col lg={4} className="text-lg-end text-center">
                <Button
                  variant="primary"
                  size="lg"
                  className="rounded-pill px-4 py-3 fw-bold shadow-sm d-inline-flex align-items-center gap-2"
                  onClick={() => setShowRecruiterModal(true)}
                >
                  <span>Request Recruiter Access</span>
                  <ArrowRight size={18} />
                </Button>
                <div className="small text-muted mt-2">
                  Management Desk: <span className="text-primary">formusic7766@gmail.com</span>
                </div>
              </Col>
            </Row>
          </Card>
        </Container>
      </section>

      {/* Recruiter Access Request Modal */}
      <Modal show={showRecruiterModal} onHide={() => setShowRecruiterModal(false)} centered backdrop="static">
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fw-bold fs-6 d-flex align-items-center gap-2">
            <Building size={18} className="text-primary" /> Request Recruiter Verification Link
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleRecruiterRequest}>
          <Modal.Body className="py-3">
            <p className="small text-muted mb-3">
              Submit your corporate hiring details. Our Management automated daemon (<strong className="text-dark">formusic7766@gmail.com</strong>) 
              will dispatch a secure invitation link and a 6-digit OTP to your corporate inbox.
            </p>

            {requestStatus === 'error' && (
              <Alert variant="danger" className="small py-2 mb-3">
                {responseMsg}
              </Alert>
            )}

            {requestStatus === 'success' ? (
              <Alert variant="success" className="small py-3 mb-0">
                <div className="fw-bold mb-1 d-flex align-items-center gap-1">
                  <CheckCircle size={16} /> Invitation Dispatched!
                </div>
                <p className="mb-2">{responseMsg}</p>
                {onboardLink && (
                  <div className="mt-2 pt-2 border-top">
                    <div className="text-muted mb-1">Instant Sandbox Link:</div>
                    <a href={onboardLink} className="fw-bold text-success text-break">
                      {onboardLink}
                    </a>
                    {receivedOtp && (
                      <div className="mt-1">
                        Sandbox OTP Code: <strong className="font-monospace text-dark fs-6">{receivedOtp}</strong>
                      </div>
                    )}
                  </div>
                )}
              </Alert>
            ) : (
              <>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold text-secondary">Full Name *</Form.Label>
                  <Form.Control
                    type="text"
                    required
                    placeholder="Jane Smith"
                    value={reqName}
                    onChange={(e) => setReqName(e.target.value)}
                    className="form-control-sleek"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold text-secondary">Corporate / Work Email *</Form.Label>
                  <Form.Control
                    type="email"
                    required
                    placeholder="jane.smith@company.com"
                    value={reqEmail}
                    onChange={(e) => setReqEmail(e.target.value)}
                    className="form-control-sleek"
                  />
                  <Form.Text className="text-muted small">
                    The 6-digit OTP code and unique invitation link will be sent here.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold text-secondary">Company Name *</Form.Label>
                  <Form.Control
                    type="text"
                    required
                    placeholder="Acme Corporation"
                    value={reqCompany}
                    onChange={(e) => setReqCompany(e.target.value)}
                    className="form-control-sleek"
                  />
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer className="border-top py-2">
            <Button variant="secondary" size="sm" onClick={() => setShowRecruiterModal(false)}>
              Close
            </Button>
            {requestStatus !== 'success' && (
              <Button variant="primary" size="sm" type="submit" disabled={requestStatus === 'submitting'} className="d-flex align-items-center gap-1">
                {requestStatus === 'submitting' && <Spinner size="sm" animation="border" />}
                <span>Send Automated Invite & OTP</span>
              </Button>
            )}
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modern Footer */}
      <footer className="py-3 border-top bg-white text-center text-muted small mt-auto">
        <Container>
          <span>Next-Gen AI ATS Platform &copy; 2026. All Rights Reserved. Verified Recruiter Management: formusic7766@gmail.com</span>
        </Container>
      </footer>
    </div>
  );
};

export default LandingPage;
