import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Spinner, Container } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Lock, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, KeyRound } from 'lucide-react';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [verifying, setVerifying] = useState(true);
  const [tokenError, setTokenError] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenError('Missing password reset token. Please use the reset link sent to your email.');
      setVerifying(false);
      return;
    }

    const checkToken = async () => {
      try {
        const res = await axios.get(`http://localhost:8080/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
        setUserEmail(res.data.email || '');
      } catch (err) {
        setTokenError(err.response?.data?.message || 'Invalid or expired password reset link. Please request a new one.');
      } finally {
        setVerifying(false);
      }
    };

    checkToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await axios.post('http://localhost:8080/api/auth/reset-password', {
        token: token.trim(),
        newPassword
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/', { state: { message: 'Password updated successfully! You can now sign in.' } });
      }, 2500);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to reset password. Please try again or request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center p-3">
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="mb-2" />
          <div className="text-muted small">Verifying reset token...</div>
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
          <h4 className="fw-bold text-dark mb-2">Invalid Reset Link</h4>
          <p className="text-muted small mb-4">{tokenError}</p>
          <div className="d-grid gap-2">
            <Link to="/forgot-password" className="btn btn-primary rounded-3 fw-bold">
              Request New Reset Link
            </Link>
            <Link to="/" className="btn btn-link text-muted small">
              Return to Sign In
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-3">
      <Container style={{ maxWidth: '480px' }}>
        <div className="text-center mb-4">
          <div className="d-inline-flex p-3 rounded-circle bg-primary-subtle text-primary mb-2">
            <Lock size={28} />
          </div>
          <h3 className="fw-extrabold text-dark mb-1">Create New Password</h3>
          <p className="text-muted small">
            Choose a new secure password for <strong className="text-dark">{userEmail}</strong>.
          </p>
        </div>

        <Card className="glass-card border-0 rounded-4 p-4 shadow-lg">
          {errorMsg && (
            <Alert variant="danger" className="small py-2 mb-3 d-flex align-items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </Alert>
          )}

          {success ? (
            <Alert variant="success" className="small py-3 text-center mb-0">
              <CheckCircle2 size={28} className="text-success mx-auto mb-2" />
              <div className="fw-bold fs-6 mb-1">Password Updated Successfully!</div>
              <p className="mb-0 text-muted">Redirecting you to the sign-in portal...</p>
            </Alert>
          ) : (
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold text-secondary mb-1">New Password *</Form.Label>
                <Form.Control
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  className="form-control-sleek ps-3"
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="small fw-bold text-secondary mb-1">Confirm New Password *</Form.Label>
                <Form.Control
                  type="password"
                  required
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  className="form-control-sleek ps-3"
                />
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
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Reset & Save Password</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </Button>

              <div className="text-center border-top pt-3 small text-muted">
                <Link to="/" className="text-muted text-decoration-none">
                  Cancel and Return to Sign In
                </Link>
              </div>
            </Form>
          )}
        </Card>
      </Container>
    </div>
  );
};

export default ResetPasswordPage;
