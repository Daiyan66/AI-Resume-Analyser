import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Container, Row, Col, Card, Button, Form, Alert, ProgressBar, Badge, Spinner 
} from 'react-bootstrap';
import {
  Building2, ShieldCheck, Mail, Lock, Phone, Globe, Briefcase,
  FileCheck, Upload, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft,
  Sparkles, KeyRound, Building
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../auth/AuthProvider';

export const RecruiterOnboardPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  const tokenParam = searchParams.get('token') || '';

  const [verifyingToken, setVerifyingToken] = useState(true);
  const [tokenError, setTokenError] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-filled from token
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [verifiedName, setVerifiedName] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    otp: '',
    companyName: '',
    companyWebsite: '',
    designation: '',
    hiringDomains: '',
    username: '',
    phone: '',
    password: '',
    confirmPassword: '',
    termsAgreed: false
  });

  const [verificationDoc, setVerificationDoc] = useState(null);

  // Validate token on mount
  useEffect(() => {
    if (!tokenParam) {
      setTokenError('Missing invitation token. Please use the verification link sent to your corporate email.');
      setVerifyingToken(false);
      return;
    }

    const checkToken = async () => {
      try {
        const res = await axios.get(`http://localhost:8080/api/auth/verify-recruiter-token?token=${encodeURIComponent(tokenParam)}`);
        setVerifiedEmail(res.data.email || '');
        setVerifiedName(res.data.name || '');
        setFormData((prev) => ({
          ...prev,
          username: res.data.email ? res.data.email.split('@')[0] : ''
        }));
      } catch (err) {
        setTokenError(err.response?.data?.message || 'Invalid or expired recruiter invitation link. Please request a new link from the landing page.');
      } finally {
        setVerifyingToken(false);
      }
    };

    checkToken();
  }, [tokenParam]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    setError('');
  };

  const handleDocChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVerificationDoc(file);
      setError('');
    }
  };

  const validateStep = (current) => {
    if (current === 1) {
      if (!formData.otp || formData.otp.trim().length !== 6) {
        setError('Please enter the 6-digit OTP code sent to your email.');
        return false;
      }
      if (!verificationDoc) {
        setError('Please upload a formal corporate verification document (Company ID or authorization letter).');
        return false;
      }
      return true;
    }
    if (current === 2) {
      if (!formData.companyName.trim()) {
        setError('Company name is required.');
        return false;
      }
      if (!formData.designation.trim()) {
        setError('Your recruiter designation is required.');
        return false;
      }
      return true;
    }
    if (current === 3) {
      if (!formData.password || formData.password.length < 6) {
        setError('Password must be at least 6 characters.');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match.');
        return false;
      }
      if (!formData.termsAgreed) {
        setError('You must agree to the Ethical AI Hiring & Candidate Privacy terms.');
        return false;
      }
      return true;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setError('');
      setStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    setError('');
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    setLoading(true);
    setError('');

    try {
      const payload = new FormData();
      if (verificationDoc) {
        payload.append('verificationDoc', verificationDoc);
      }

      const recruiterData = {
        token: tokenParam,
        otp: formData.otp.trim(),
        name: verifiedName || formData.username,
        username: formData.username || verifiedEmail.split('@')[0],
        email: verifiedEmail,
        password: formData.password,
        phone: formData.phone,
        companyName: formData.companyName,
        companyWebsite: formData.companyWebsite,
        designation: formData.designation,
        hiringDomains: formData.hiringDomains
      };

      payload.append('data', JSON.stringify(recruiterData));

      const res = await axios.post('http://localhost:8080/api/auth/register-recruiter', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.token) {
        loginWithToken(res.data.user, res.data.token);
        navigate('/dashboard');
      } else {
        navigate('/', { state: { message: 'Recruiter onboarded successfully! Please sign in.' } });
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Recruiter onboarding failed. Please verify your OTP code and document format.');
    } finally {
      setLoading(false);
    }
  };

  if (verifyingToken) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="mb-2" />
          <div className="text-muted small">Verifying corporate invitation token...</div>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center p-3">
        <Card className="glass-card border-0 rounded-4 p-4 text-center shadow-lg" style={{ maxWidth: '460px', width: '100%' }}>
          <div className="avatar-circle bg-danger-subtle text-danger mx-auto mb-3">
            <AlertCircle size={24} />
          </div>
          <h4 className="fw-bold text-dark mb-2">Invalid Invitation Link</h4>
          <p className="text-muted small mb-4">{tokenError}</p>
          <div className="d-grid gap-2">
            <Link to="/" className="btn btn-primary rounded-3 fw-bold">
              Return to Platform Overview
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-vh-100 py-4 py-md-5 d-flex flex-column justify-content-center">
      <Container style={{ maxWidth: '780px' }}>
        {/* Header */}
        <div className="text-center mb-4">
          <div className="d-flex justify-content-center mb-2">
            <Badge bg="success-subtle" className="text-success px-3 py-1 rounded-pill small fw-bold d-flex align-items-center gap-1">
              <ShieldCheck size={14} /> Corporate Management Verification
            </Badge>
          </div>
          <h2 className="fw-extrabold text-dark mb-1">Enterprise Recruiter Onboarding</h2>
          <p className="text-muted small max-w-lg mx-auto">
            Welcome, <strong className="text-dark">{verifiedName || verifiedEmail}</strong>. Complete OTP verification and upload your formal corporate proof to activate your screening suite.
          </p>
        </div>

        {/* Stepper Progress */}
        <Card className="glass-card border-0 rounded-4 p-3 mb-4 shadow-sm">
          <Row className="text-center g-2 align-items-center">
            {[
              { id: 1, title: 'OTP & ID Document', desc: 'Identity verification' },
              { id: 2, title: 'Company Details', desc: 'Organization profile' },
              { id: 3, title: 'Security & Access', desc: 'Login password' }
            ].map((s) => {
              const isPassed = step > s.id;
              const isCurrent = step === s.id;
              return (
                <Col key={s.id} className="d-flex flex-column align-items-center">
                  <div
                    className={`step-circle ${
                      isPassed ? 'completed' : isCurrent ? 'active' : 'pending'
                    }`}
                  >
                    {isPassed ? <CheckCircle2 size={18} /> : s.id}
                  </div>
                  <span className={`small mt-1 ${isCurrent ? 'fw-bold text-primary' : isPassed ? 'text-dark' : 'text-muted'}`} style={{ fontSize: '0.75rem' }}>
                    {s.title}
                  </span>
                </Col>
              );
            })}
          </Row>
          <ProgressBar 
            now={((step - 1) / 2) * 100} 
            variant="primary" 
            style={{ height: '5px' }} 
            className="mt-3 rounded-pill" 
          />
        </Card>

        {/* Form Container */}
        <Card className="glass-card border-0 rounded-4 p-4 p-md-5 shadow-lg">
          {error && (
            <Alert variant="danger" className="small py-2 mb-4 d-flex align-items-center gap-2">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            {/* STEP 1: OTP & ID Document */}
            {step === 1 && (
              <div className="step-content">
                <div className="border-bottom pb-2 mb-3">
                  <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                    <KeyRound size={20} className="text-primary" /> Step 1: OTP Code & Formal Verification Document
                  </h5>
                  <p className="small text-muted mb-0">
                    A 6-digit one-time code was sent to <strong className="text-dark">{verifiedEmail}</strong> via Gmail.
                  </p>
                </div>

                <div className="mb-4">
                  <Form.Label className="small fw-bold text-secondary">6-Digit Verification Code (OTP) *</Form.Label>
                  <Form.Control
                    type="text"
                    maxLength={6}
                    required
                    placeholder="123456"
                    value={formData.otp}
                    onChange={handleChange}
                    name="otp"
                    className="form-control-sleek text-center font-monospace fw-bold fs-4 py-2"
                    style={{ letterSpacing: '0.4em' }}
                  />
                  <Form.Text className="text-muted small">
                    Check your inbox or spam. In local sandbox environments, the OTP is also available in the backend terminal log.
                  </Form.Text>
                </div>

                <div className="mb-3">
                  <Form.Label className="small fw-bold text-secondary">
                    Formal Corporate Verification Document (Company ID / Employment Verification Letter) *
                  </Form.Label>
                  <div className="border rounded-4 p-4 text-center bg-light-subtle dropzone-box" style={{ borderStyle: 'dashed' }}>
                    <FileCheck size={36} className="text-success mx-auto mb-2" />
                    {verificationDoc ? (
                      <div>
                        <div className="fw-bold text-success d-flex align-items-center justify-content-center gap-1">
                          <CheckCircle2 size={18} /> {verificationDoc.name}
                        </div>
                        <div className="small text-muted mb-2">{(verificationDoc.size / 1024 / 1024).toFixed(2)} MB</div>
                        <Button variant="outline-danger" size="sm" onClick={() => setVerificationDoc(null)}>
                          Change Document
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <div className="fw-semibold text-dark mb-1">Upload Company ID or Work Verification Document</div>
                        <div className="small text-muted mb-3">Accepts PDF, PNG, JPG (Max 15MB)</div>
                        <Form.Control
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={handleDocChange}
                          className="w-auto mx-auto small"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Company Profile */}
            {step === 2 && (
              <div className="step-content">
                <div className="border-bottom pb-2 mb-3">
                  <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                    <Building2 size={20} className="text-primary" /> Step 2: Enterprise & Hiring Profile
                  </h5>
                  <p className="small text-muted mb-0">
                    Appears on candidate job listings and the automated ATS recommendation banner.
                  </p>
                </div>

                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Company Name *</Form.Label>
                      <Form.Control
                        type="text"
                        required
                        name="companyName"
                        placeholder="Google, Acme Corp, etc."
                        value={formData.companyName}
                        onChange={handleChange}
                        className="form-control-sleek"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Company Website URL</Form.Label>
                      <Form.Control
                        type="url"
                        name="companyWebsite"
                        placeholder="https://company.com"
                        value={formData.companyWebsite}
                        onChange={handleChange}
                        className="form-control-sleek"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Your Designation / Title *</Form.Label>
                      <Form.Control
                        type="text"
                        required
                        name="designation"
                        placeholder="Senior Technical Recruiter / Talent Lead"
                        value={formData.designation}
                        onChange={handleChange}
                        className="form-control-sleek"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Target Hiring Disciplines</Form.Label>
                      <Form.Control
                        type="text"
                        name="hiringDomains"
                        placeholder="Backend, AI/ML, DevOps, Frontend"
                        value={formData.hiringDomains}
                        onChange={handleChange}
                        className="form-control-sleek"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            )}

            {/* STEP 3: Security & Access */}
            {step === 3 && (
              <div className="step-content">
                <div className="border-bottom pb-2 mb-3">
                  <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                    <Lock size={20} className="text-primary" /> Step 3: Account Security & Unified Login
                  </h5>
                  <p className="small text-muted mb-0">
                    Set up your secure password. You will use <strong className="text-dark">{verifiedEmail}</strong> on the unified sign-in portal.
                  </p>
                </div>

                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Verified Email</Form.Label>
                      <Form.Control
                        type="text"
                        disabled
                        value={verifiedEmail}
                        className="form-control-sleek bg-light-subtle"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Contact Phone</Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        placeholder="+1 (555) 000-0000"
                        value={formData.phone}
                        onChange={handleChange}
                        className="form-control-sleek"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Password *</Form.Label>
                      <Form.Control
                        type="password"
                        required
                        name="password"
                        placeholder="Min 6 characters"
                        value={formData.password}
                        onChange={handleChange}
                        className="form-control-sleek"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Confirm Password *</Form.Label>
                      <Form.Control
                        type="password"
                        required
                        name="confirmPassword"
                        placeholder="Re-enter password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="form-control-sleek"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={12}>
                    <Form.Check
                      type="checkbox"
                      id="termsAgreed"
                      name="termsAgreed"
                      checked={formData.termsAgreed}
                      onChange={handleChange}
                      label={
                        <span className="small text-muted">
                          I certify that I am an authorized corporate hiring representative and agree to uphold ethical AI hiring practices, non-discriminatory candidate evaluations, and data privacy guidelines.
                        </span>
                      }
                      className="mt-2"
                    />
                  </Col>
                </Row>
              </div>
            )}

            {/* Stepper Buttons */}
            <div className="d-flex justify-content-between align-items-center pt-4 mt-4 border-top">
              {step > 1 ? (
                <Button
                  variant="outline-secondary"
                  onClick={prevStep}
                  className="rounded-3 px-3 d-flex align-items-center gap-1"
                >
                  <ArrowLeft size={16} /> Previous
                </Button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <Button
                  variant="primary"
                  onClick={nextStep}
                  className="rounded-3 px-4 fw-semibold d-flex align-items-center gap-1 shadow-sm"
                >
                  <span>Continue</span>
                  <ArrowRight size={16} />
                </Button>
              ) : (
                <Button
                  variant="success"
                  type="submit"
                  disabled={loading}
                  className="rounded-3 px-4 fw-bold d-flex align-items-center gap-1 shadow-sm"
                >
                  {loading && <Spinner size="sm" animation="border" className="me-1" />}
                  <span>{loading ? 'Activating Suite...' : 'Complete Recruiter Onboarding'}</span>
                  <Sparkles size={16} />
                </Button>
              )}
            </div>
          </Form>
        </Card>
      </Container>
    </div>
  );
};

export default RecruiterOnboardPage;
