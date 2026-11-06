import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { Building2, ShieldCheck, Mail, User, Building, ArrowRight, CheckCircle2, ArrowLeft, Sparkles, KeyRound } from 'lucide-react';
import axios from 'axios';

export const RecruiterRequestPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:8080/api/auth/recruiter-request-access', {
        name: name.trim(),
        email: email.trim(),
        companyName: companyName.trim()
      });

      setSuccessData(res.data);
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Failed to submit recruiter request. Please ensure you enter a valid corporate email or contact support.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 py-5 d-flex align-items-center justify-content-center bg-light-subtle">
      <Container style={{ maxWidth: '580px' }}>
        <div className="text-center mb-4">
          <Link to="/" className="text-decoration-none d-inline-flex align-items-center gap-2 mb-3">
            <div className="p-2 rounded-3 bg-primary text-white shadow-sm d-flex align-items-center justify-content-center">
              <Sparkles size={20} />
            </div>
            <span className="fw-extrabold fs-4 text-dark">
              Next-Gen <span className="text-primary">AI ATS</span>
            </span>
          </Link>
          <h2 className="fw-extrabold text-dark mb-1">Corporate Recruiter Access</h2>
          <p className="text-muted small">
            Request official corporate screening suite access. Our automated daemon will dispatch an invitation link and 6-digit OTP code to your corporate email.
          </p>
        </div>

        <Card className="glass-card border-0 rounded-4 p-4 p-md-5 shadow-lg bg-white">
          {successData ? (
            <div className="text-center py-2">
              <div className="avatar-circle bg-success-subtle text-success mx-auto mb-3" style={{ width: '64px', height: '64px' }}>
                <CheckCircle2 size={34} />
              </div>
              <h4 className="fw-bold text-dark mb-2">Invitation Dispatched!</h4>
              <p className="text-muted small mb-4">
                We've sent an activation link and a <strong>6-digit OTP code</strong> to <strong className="text-dark">{email}</strong>.
              </p>

              <div className="bg-light-subtle border rounded-3 p-3 text-start small mb-4">
                <div className="d-flex align-items-center gap-2 mb-2 text-primary fw-bold">
                  <KeyRound size={16} /> Next Steps:
                </div>
                <ol className="mb-0 ps-3 text-secondary">
                  <li className="mb-1">Open your corporate Gmail / inbox.</li>
                  <li className="mb-1">Click the verification link in the invitation email.</li>
                  <li>Verify your 6-digit OTP and upload proof to activate screening suite.</li>
                </ol>
              </div>

              {successData.onboardingLink && (
                <div className="d-grid mb-3">
                  <Button 
                    variant="primary" 
                    size="lg"
                    className="fw-bold rounded-3 shadow-sm d-flex align-items-center justify-content-center gap-2"
                    onClick={() => {
                      // Navigate directly to the onboarding route with token
                      const url = new URL(successData.onboardingLink, window.location.origin);
                      navigate(url.pathname + url.search);
                    }}
                  >
                    <span>Proceed to Onboarding Form</span>
                    <ArrowRight size={18} />
                  </Button>
                </div>
              )}

              <div className="text-center">
                <Link to="/" className="text-decoration-none small text-secondary">
                  ← Return to Landing Page
                </Link>
              </div>
            </div>
          ) : (
            <Form onSubmit={handleSubmit}>
              <div className="d-flex align-items-center gap-2 text-warning mb-3 fw-bold small">
                <ShieldCheck size={18} /> Verified Employer Protocol
              </div>

              {error && (
                <Alert variant="danger" className="small py-2 mb-3">
                  {error}
                </Alert>
              )}

              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold text-secondary mb-1">Full Name</Form.Label>
                <div className="position-relative">
                  <Form.Control
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-control-sleek ps-3"
                    disabled={loading}
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold text-secondary mb-1">Corporate Email Address</Form.Label>
                <Form.Control
                  type="email"
                  required
                  placeholder="e.g. s.jenkins@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-control-sleek ps-3"
                  disabled={loading}
                />
                <Form.Text className="text-muted" style={{ fontSize: '0.75rem' }}>
                  A 6-digit OTP code and activation token will be dispatched to this address.
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="small fw-bold text-secondary mb-1">Company / Organization Name</Form.Label>
                <Form.Control
                  type="text"
                  required
                  placeholder="e.g. Acme Technologies Inc."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="form-control-sleek ps-3"
                  disabled={loading}
                />
              </Form.Group>

              <div className="d-grid mb-3">
                <Button 
                  variant="primary" 
                  size="lg" 
                  type="submit" 
                  disabled={loading || !name.trim() || !email.trim() || !companyName.trim()}
                  className="fw-bold rounded-3 shadow-sm d-flex align-items-center justify-content-center gap-2"
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" />
                      <span>Dispatching Invitation...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Verification Link & OTP</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </Button>
              </div>

              <div className="text-center pt-2 border-top">
                <div className="small text-muted mb-2">
                  Already have an invitation link or token?
                </div>
                <Link to="/recruiter/onboard" className="small fw-bold text-primary text-decoration-none">
                  Enter Token to Continue Onboarding →
                </Link>
              </div>
            </Form>
          )}
        </Card>
      </Container>
    </div>
  );
};
