import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Container, Row, Col, Card, Button, Form, Alert, ProgressBar, Badge, Spinner 
} from 'react-bootstrap';
import {
  Building2, ShieldCheck, Mail, Phone, Globe, Briefcase,
  FileCheck, Upload, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft,
  Sparkles, KeyRound, Check, ExternalLink, Send
} from 'lucide-react';
import axios from 'axios';

export const RecruiterOnboardPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tokenParam = searchParams.get('token') || '';

  const [verifyingToken, setVerifyingToken] = useState(true);
  const [tokenError, setTokenError] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Pre-filled from token
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [verifiedName, setVerifiedName] = useState('');

  // Immediate OTP Verification State
  const [otpVerified, setOtpVerified] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState('');
  const [otpError, setOtpError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    otp: '',
    companyName: '',
    companyWebsite: '',
    designation: '',
    hiringDomains: '',
    phone: '',
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
        if (res.data.companyName) {
          setFormData((prev) => ({
            ...prev,
            companyName: res.data.companyName || '',
            companyWebsite: res.data.companyWebsite || '',
            designation: res.data.designation || '',
            phone: res.data.phone || ''
          }));
        }
        if (res.data.otpVerified) {
          setOtpVerified(true);
          setOtpSuccessMsg('OTP Code Previously Verified ✓');
        }
      } catch (err) {
        setTokenError(err.response?.data?.message || 'Invalid or expired recruiter invitation link. Please request a new link from the landing page.');
      } finally {
        setVerifyingToken(false);
      }
    };

    checkToken();
  }, [tokenParam]);

  // Immediate OTP verification when 6 digits are reached or changed
  const handleOtpChange = (e) => {
    const val = e.target.value.trim();
    setFormData((prev) => ({ ...prev, otp: val }));
    setOtpError('');
    setError('');

    if (val.length === 6 && !otpVerified) {
      verifyOtpCode(val);
    }
  };

  const verifyOtpCode = async (codeToVerify) => {
    const code = codeToVerify || formData.otp.trim();
    if (code.length !== 6) {
      setOtpError('Please enter the full 6-digit code received via email.');
      return;
    }

    setVerifyingOtp(true);
    setOtpError('');
    setOtpSuccessMsg('');

    try {
      const res = await axios.post('http://localhost:8080/api/auth/verify-recruiter-otp', {
        token: tokenParam,
        otp: code
      });

      if (res.data.valid) {
        setOtpVerified(true);
        setOtpSuccessMsg('6-Digit OTP Verified Successfully ✓');
        setError('');
      }
    } catch (err) {
      setOtpVerified(false);
      setOtpError(err.response?.data?.message || 'Invalid OTP code. Please enter the exact 6-digit code sent to your email.');
    } finally {
      setVerifyingOtp(false);
    }
  };

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

  // Strict Validation Helpers
  const isValidUrl = (url) => {
    if (!url || !url.trim()) return false;
    const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/.*)?$/;
    return urlPattern.test(url.trim());
  };

  const isValidPhone = (phone) => {
    if (!phone || !phone.trim()) return false;
    const digits = phone.replace(/[^0-9]/g, '');
    return digits.length >= 10 && digits.length <= 15;
  };

  const validateStep = (current) => {
    if (current === 1) {
      if (!otpVerified) {
        setError('Please enter and verify your 6-digit email OTP before proceeding.');
        return false;
      }
      if (!verificationDoc) {
        setError('Please upload a formal corporate verification document (Company ID or authorization proof).');
        return false;
      }
      return true;
    }

    if (current === 2) {
      if (!formData.companyName.trim()) {
        setError('Company name is required.');
        return false;
      }
      if (!isValidUrl(formData.companyWebsite)) {
        setError('Please enter a valid company website address (e.g. https://company.com or company.com).');
        return false;
      }
      if (!formData.designation.trim()) {
        setError('Your corporate recruiter title / designation is required.');
        return false;
      }
      if (!isValidPhone(formData.phone)) {
        setError('Please enter a valid contact phone number with at least 10 digits (e.g. +1 555-0199 or 9876543210).');
        return false;
      }
      return true;
    }

    if (current === 3) {
      if (!formData.termsAgreed) {
        setError('You must agree to the Ethical AI Hiring & Candidate Privacy certification.');
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

  // Submit Application for Admin Review (NO PASSWORD)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    setLoading(true);
    setError('');

    try {
      const payload = new FormData();
      if (verificationDoc) {
        payload.append('file', verificationDoc);
        payload.append('verificationDoc', verificationDoc);
      }

      payload.append('token', tokenParam);
      payload.append('otp', formData.otp.trim());
      payload.append('name', verifiedName);
      payload.append('companyName', formData.companyName.trim());
      payload.append('companyWebsite', formData.companyWebsite.trim());
      payload.append('designation', formData.designation.trim());
      payload.append('phone', formData.phone.trim());
      payload.append('hiringDomains', formData.hiringDomains || '');

      await axios.post('http://localhost:8080/api/auth/submit-recruiter-application', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to submit recruiter application for review. Please check all fields.');
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
        <Card className="glass-card border-0 rounded-4 p-4 p-md-5 text-center shadow-lg" style={{ maxWidth: '520px' }}>
          <div className="avatar-circle bg-danger-subtle text-danger mx-auto mb-3" style={{ width: '64px', height: '64px' }}>
            <AlertCircle size={32} />
          </div>
          <h4 className="fw-bold text-dark mb-2">Invalid or Expired Link</h4>
          <p className="text-muted small mb-4">{tokenError}</p>
          <div className="d-flex gap-2 justify-content-center">
            <Button as={Link} to="/" variant="primary" className="fw-bold px-4 rounded-3">
              Go to Landing Page
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Application Submitted View
  if (isSubmitted) {
    return (
      <div className="min-vh-100 py-5 d-flex align-items-center justify-content-center">
        <Container style={{ maxWidth: '640px' }}>
          <Card className="glass-card border-0 rounded-4 p-4 p-md-5 text-center shadow-lg">
            <div className="avatar-circle bg-success-subtle text-success mx-auto mb-3" style={{ width: '72px', height: '72px' }}>
              <ShieldCheck size={38} />
            </div>
            <span className="badge bg-success-subtle text-success px-3 py-1 rounded-pill small fw-bold mb-2 mx-auto">
              ✓ CREDENTIALS & PROOF SUBMITTED
            </span>
            <h3 className="fw-extrabold text-dark mb-2">Application Under Review</h3>
            <p className="text-muted small mb-4" style={{ lineHeight: '1.6' }}>
              Thank you, <strong className="text-dark">{verifiedName || verifiedEmail}</strong>! Your corporate profile for <strong className="text-dark">{formData.companyName}</strong> and uploaded verification proof have been submitted to Management.
            </p>

            <div className="bg-light border rounded-3 p-3 text-start small mb-4 text-secondary">
              <strong className="text-dark d-block mb-1">📋 What happens next:</strong>
              <ol className="mb-0 ps-3">
                <li>Our administration team will examine your corporate credentials and uploaded proof.</li>
                <li>Once approved, you will receive an official activation email sent to <strong className="text-dark">{verifiedEmail}</strong>.</li>
                <li>The email will contain a secure link to choose your master password and activate your recruiter dashboard.</li>
              </ol>
            </div>

            <Button as={Link} to="/" variant="primary" className="fw-bold px-4 py-2 rounded-3">
              Return to Landing Portal
            </Button>
          </Card>
        </Container>
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
            Welcome, <strong className="text-dark">{verifiedName || verifiedEmail}</strong>. Verify your 6-digit OTP and provide your organizational proof to submit your corporate profile for administrative approval.
          </p>
        </div>

        {/* Stepper Progress */}
        <Card className="glass-card border-0 rounded-4 p-3 mb-4 shadow-sm">
          <Row className="text-center g-2 align-items-center">
            {[
              { id: 1, title: 'OTP & ID Document', desc: 'Identity verification' },
              { id: 2, title: 'Company Details', desc: 'Organization profile' },
              { id: 3, title: 'Review & Submit', desc: 'Admin verification' }
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
                    <KeyRound size={20} className="text-primary" /> Step 1: Immediate OTP Verification & Corporate Proof
                  </h5>
                  <p className="small text-muted mb-0">
                    A 6-digit one-time code was dispatched to <strong className="text-dark">{verifiedEmail}</strong>.
                  </p>
                </div>

                {/* OTP Input with Immediate Real-Time Verification */}
                <div className="mb-4">
                  <Form.Label className="small fw-bold text-secondary d-flex justify-content-between align-items-center">
                    <span>6-Digit Verification Code (OTP) *</span>
                    {otpVerified && (
                      <span className="badge bg-success-subtle text-success fw-bold d-flex align-items-center gap-1">
                        <Check size={12} /> Verified
                      </span>
                    )}
                  </Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control
                      type="text"
                      maxLength={6}
                      required
                      placeholder="123456"
                      value={formData.otp}
                      onChange={handleOtpChange}
                      disabled={otpVerified}
                      name="otp"
                      className={`form-control-sleek text-center font-monospace fw-bold fs-4 py-2 ${
                        otpVerified ? 'border-success bg-success-subtle' : ''
                      }`}
                      style={{ letterSpacing: '0.4em' }}
                    />
                    {!otpVerified && (
                      <Button
                        variant="primary"
                        className="fw-bold px-3 d-flex align-items-center gap-1"
                        disabled={formData.otp.trim().length !== 6 || verifyingOtp}
                        onClick={() => verifyOtpCode()}
                      >
                        {verifyingOtp ? <Spinner size="sm" animation="border" /> : <ShieldCheck size={16} />}
                        <span>Verify</span>
                      </Button>
                    )}
                  </div>

                  {otpSuccessMsg && (
                    <div className="small text-success fw-semibold mt-2 d-flex align-items-center gap-1">
                      <CheckCircle2 size={14} /> {otpSuccessMsg}
                    </div>
                  )}

                  {otpError && (
                    <div className="small text-danger fw-semibold mt-2 d-flex align-items-center gap-1">
                      <AlertCircle size={14} /> {otpError}
                    </div>
                  )}

                  {!otpVerified && !otpError && (
                    <Form.Text className="text-muted small">
                      The OTP is checked immediately upon entering the 6th digit.
                    </Form.Text>
                  )}
                </div>

                {/* Corporate Proof Upload */}
                <div className="mb-3">
                  <Form.Label className="small fw-bold text-secondary">
                    Formal Corporate Verification Document (Company ID, Offer Letter, or Corporate Registration) *
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

                <div className="d-flex justify-content-end mt-4">
                  <Button 
                    variant="primary" 
                    className="fw-bold px-4 rounded-3 d-flex align-items-center gap-2"
                    disabled={!otpVerified || !verificationDoc}
                    onClick={nextStep}
                  >
                    <span>Next: Company Details</span>
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Company Profile with Strict Validations */}
            {step === 2 && (
              <div className="step-content">
                <div className="border-bottom pb-2 mb-3">
                  <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                    <Building2 size={20} className="text-primary" /> Step 2: Enterprise & Hiring Profile
                  </h5>
                  <p className="small text-muted mb-0">
                    Provide verified corporate details. URLs and phone numbers are strictly validated.
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
                        placeholder="Google, Microsoft, Infosys, etc."
                        value={formData.companyName}
                        onChange={handleChange}
                        className="form-control-sleek"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary d-flex justify-content-between">
                        <span>Company Website URL *</span>
                        {formData.companyWebsite && isValidUrl(formData.companyWebsite) && (
                          <span className="text-success small fw-bold">✓ Valid URL</span>
                        )}
                      </Form.Label>
                      <Form.Control
                        type="text"
                        required
                        name="companyWebsite"
                        placeholder="https://company.com or company.com"
                        value={formData.companyWebsite}
                        onChange={handleChange}
                        className={`form-control-sleek ${
                          formData.companyWebsite && !isValidUrl(formData.companyWebsite) ? 'border-danger' : ''
                        }`}
                      />
                      {formData.companyWebsite && !isValidUrl(formData.companyWebsite) && (
                        <div className="small text-danger mt-1">Please enter a valid web address (e.g. https://company.com)</div>
                      )}
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Recruiter Designation / Title *</Form.Label>
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
                      <Form.Label className="small fw-bold text-secondary d-flex justify-content-between">
                        <span>Contact Phone Number *</span>
                        {formData.phone && isValidPhone(formData.phone) && (
                          <span className="text-success small fw-bold">✓ Valid Phone</span>
                        )}
                      </Form.Label>
                      <Form.Control
                        type="tel"
                        required
                        name="phone"
                        placeholder="+1 (555) 000-0000 or 9876543210"
                        value={formData.phone}
                        onChange={handleChange}
                        className={`form-control-sleek ${
                          formData.phone && !isValidPhone(formData.phone) ? 'border-danger' : ''
                        }`}
                      />
                      {formData.phone && !isValidPhone(formData.phone) && (
                        <div className="small text-danger mt-1">Must contain at least 10 digits</div>
                      )}
                    </Form.Group>
                  </Col>

                  <Col md={12}>
                    <Form.Group>
                      <Form.Label className="small fw-bold text-secondary">Target Hiring Disciplines / Tech Stack</Form.Label>
                      <Form.Control
                        type="text"
                        name="hiringDomains"
                        placeholder="Java, React, Cloud, AI/ML, DevOps"
                        value={formData.hiringDomains}
                        onChange={handleChange}
                        className="form-control-sleek"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-flex justify-content-between mt-4">
                  <Button variant="outline-secondary" className="rounded-3" onClick={prevStep}>
                    <ArrowLeft size={16} className="me-1" /> Previous
                  </Button>
                  <Button variant="primary" className="fw-bold px-4 rounded-3 d-flex align-items-center gap-2" onClick={nextStep}>
                    <span>Next: Review & Submit</span>
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Review & Submit for Administrative Approval (NO PASSWORD AT THIS STAGE) */}
            {step === 3 && (
              <div className="step-content">
                <div className="border-bottom pb-2 mb-3">
                  <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                    <ShieldCheck size={20} className="text-primary" /> Step 3: Review & Submit for Management Approval
                  </h5>
                  <p className="small text-muted mb-0">
                    Examine your application details below before dispatching to Management for examination.
                  </p>
                </div>

                {/* Summary Table / Card */}
                <Card className="border rounded-3 p-3 mb-4 bg-light-subtle">
                  <Row className="g-3 small">
                    <Col sm={6}>
                      <span className="text-muted d-block">Recruiter Name</span>
                      <strong className="text-dark fs-6">{verifiedName || 'N/A'}</strong>
                    </Col>
                    <Col sm={6}>
                      <span className="text-muted d-block">Corporate Email</span>
                      <strong className="text-dark fs-6">{verifiedEmail}</strong>
                    </Col>
                    <Col sm={6}>
                      <span className="text-muted d-block">Company Name</span>
                      <strong className="text-dark">{formData.companyName}</strong>
                    </Col>
                    <Col sm={6}>
                      <span className="text-muted d-block">Company Website</span>
                      <a href={formData.companyWebsite.startsWith('http') ? formData.companyWebsite : `https://${formData.companyWebsite}`} target="_blank" rel="noreferrer" className="text-primary fw-semibold d-inline-flex align-items-center gap-1">
                        <span>{formData.companyWebsite}</span>
                        <ExternalLink size={12} />
                      </a>
                    </Col>
                    <Col sm={6}>
                      <span className="text-muted d-block">Designation</span>
                      <strong className="text-dark">{formData.designation}</strong>
                    </Col>
                    <Col sm={6}>
                      <span className="text-muted d-block">Contact Phone</span>
                      <strong className="text-dark">{formData.phone}</strong>
                    </Col>
                    <Col sm={6}>
                      <span className="text-muted d-block">Verification Document</span>
                      <Badge bg="success-subtle" className="text-success px-2 py-1">
                        ✓ {verificationDoc ? verificationDoc.name : 'Attached'}
                      </Badge>
                    </Col>
                    <Col sm={6}>
                      <span className="text-muted d-block">Email 2FA OTP</span>
                      <Badge bg="primary-subtle" className="text-primary px-2 py-1">
                        ✓ OTP Verified
                      </Badge>
                    </Col>
                  </Row>
                </Card>

                {/* Information Callout */}
                <Alert variant="info" className="small py-2 mb-4 d-flex align-items-center gap-2">
                  <ShieldCheck size={20} className="flex-shrink-0 text-info" />
                  <span>
                    <strong>Administrative Review Step:</strong> To safeguard candidate data, management will review your formal corporate document and credentials. Once satisfied, the admin will approve your request and email you a secure link to set your master password.
                  </span>
                </Alert>

                <div className="mb-4">
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
                  />
                </div>

                <div className="d-flex justify-content-between mt-4">
                  <Button variant="outline-secondary" className="rounded-3" onClick={prevStep}>
                    <ArrowLeft size={16} className="me-1" /> Previous
                  </Button>
                  <Button 
                    type="submit"
                    variant="success" 
                    className="fw-bold px-4 py-2 rounded-3 d-flex align-items-center gap-2 shadow-sm"
                    disabled={loading || !formData.termsAgreed}
                  >
                    {loading ? <Spinner size="sm" animation="border" /> : <Send size={16} />}
                    <span>Submit Application for Approval</span>
                  </Button>
                </div>
              </div>
            )}
          </Form>
        </Card>
      </Container>
    </div>
  );
};
