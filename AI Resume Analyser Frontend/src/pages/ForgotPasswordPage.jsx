import React, { useState } from 'react';
import { Card, Form, Button, Alert, Spinner, Container } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { KeyRound, Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessData(null);

    try {
      const res = await axios.post('http://localhost:8080/api/auth/forgot-password', { email: email.trim() });
      setSuccessData(res.data);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to dispatch reset link. Please check your email address.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (link) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-3">
      <Container style={{ maxWidth: '480px' }}>
        <div className="text-center mb-4">
          <Link to="/" className="d-inline-flex align-items-center gap-1 text-primary text-decoration-none fw-semibold small mb-2">
            <ArrowLeft size={16} /> Back to Sign In
          </Link>
          <div className="d-inline-flex p-3 rounded-circle bg-primary-subtle text-primary mb-2">
            <KeyRound size={28} />
          </div>
          <h3 className="fw-extrabold text-dark mb-1">Forgot Password?</h3>
          <p className="text-muted small">
            Enter your registered corporate or personal email to receive a password reset link.
          </p>
        </div>

        <Card className="glass-card border-0 rounded-4 p-4 shadow-lg">
          {errorMsg && (
            <Alert variant="danger" className="small py-2 mb-3 d-flex align-items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </Alert>
          )}

          {successData ? (
            <div className="text-center py-2">
              <div className="avatar-circle bg-success-subtle text-success mx-auto mb-3">
                <CheckCircle2 size={24} />
              </div>
              <h5 className="fw-bold text-dark mb-2">Password Reset Link Sent!</h5>
              <p className="small text-muted mb-3">
                {successData.message || 'A secure password reset link has been dispatched to your email.'}
              </p>

              {successData.resetLink && (
                <div className="p-3 rounded-3 bg-light border text-start mb-3">
                  <div className="small fw-semibold text-secondary mb-1">Direct Sandbox Reset Link:</div>
                  <div className="d-flex align-items-center gap-2">
                    <Form.Control
                      type="text"
                      readOnly
                      value={successData.resetLink}
                      className="form-control-sm font-monospace bg-white"
                    />
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleCopy(successData.resetLink)}
                      className="d-flex align-items-center gap-1"
                    >
                      {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    </Button>
                  </div>
                  <div className="mt-2 text-center">
                    <a href={successData.resetLink} className="btn btn-primary btn-sm rounded-pill px-3">
                      Proceed to Reset Password →
                    </a>
                  </div>
                </div>
              )}

              <div className="pt-2 border-top">
                <Link to="/" className="small fw-bold text-primary text-decoration-none">
                  Return to Home / Sign In
                </Link>
              </div>
            </div>
          ) : (
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold text-secondary mb-1">Your Registered Email</Form.Label>
                <div className="position-relative">
                  <Form.Control
                    type="email"
                    required
                    placeholder="candidate@example.com or recruiter@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrorMsg('');
                    }}
                    className="form-control-sleek ps-3"
                  />
                </div>
              </Form.Group>

              <Button
                variant="primary"
                type="submit"
                disabled={loading}
                className="w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-3 shadow-sm mb-3"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" animation="border" />
                    <span>Dispatching Link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Password Reset Link</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </Button>

              <div className="text-center border-top pt-3 small text-muted">
                Remembered your password?{' '}
                <Link to="/" className="fw-bold text-primary text-decoration-none">
                  Sign In on Landing Page
                </Link>
              </div>
            </Form>
          )}
        </Card>
      </Container>
    </div>
  );
};

export default ForgotPasswordPage;
