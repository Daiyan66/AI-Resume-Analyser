import React, { useState } from 'react';
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../auth/AuthProvider';
import { ThreeBackground } from '../components/ThreeBackground';
import { Sparkles, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';

const schema = yup.object().shape({
  username: yup.string().required('Username or email is required'),
  password: yup.string().required('Password is required')
});

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: yupResolver(schema)
  });

  const onSubmit = async (data) => {
    setErrorMsg('');
    setSubmitting(true);
    try {
      await login(data.username, data.password);
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Invalid username or password');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoAccount = (u, p) => {
    setValue('username', u, { shouldValidate: true });
    setValue('password', p, { shouldValidate: true });
  };

  return (
    <div className="login-wrapper min-vh-100 d-flex align-items-center justify-content-center p-3 position-relative overflow-hidden">
      <ThreeBackground />

      <Card className="glass-card shadow-2-strong border-0 rounded-4 p-4 p-md-5 position-relative" style={{ maxWidth: '460px', width: '100%', zIndex: 10 }}>
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center p-3 rounded-circle bg-primary-subtle text-primary mb-3">
            <Sparkles size={32} />
          </div>
          <h3 className="fw-extrabold text-dark mb-1">Welcome Back</h3>
          <p className="text-muted small">Access your AI-Powered ATS workspace</p>
        </div>

        {errorMsg && (
          <Alert variant="danger" className="small py-2 mb-4 d-flex align-items-center gap-2">
            <ShieldCheck size={18} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </Alert>
        )}

        <Form onSubmit={handleSubmit(onSubmit)}>
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold text-secondary">Username or Email</Form.Label>
            <div className="position-relative">
              <Form.Control
                type="text"
                placeholder="e.g. recruiter or candidate"
                {...register('username')}
                isInvalid={!!errors.username}
                className="py-2 ps-3"
              />
              <Form.Control.Feedback type="invalid">
                {errors.username?.message}
              </Form.Control.Feedback>
            </div>
          </Form.Group>

          <Form.Group className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <Form.Label className="small fw-semibold text-secondary mb-0">Password</Form.Label>
            </div>
            <Form.Control
              type="password"
              placeholder="••••••••"
              {...register('password')}
              isInvalid={!!errors.password}
              className="py-2 ps-3"
            />
            <Form.Control.Feedback type="invalid">
              {errors.password?.message}
            </Form.Control.Feedback>
          </Form.Group>

          <Button variant="primary" type="submit" disabled={submitting} className="w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 mb-3">
            {submitting ? (
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

          {/* Quick Demo Login Preset Buttons */}
          <div className="mt-4 pt-3 border-top text-center">
            <span className="small text-muted d-block mb-2">⚡ Quick Demo One-Click Fill:</span>
            <div className="d-flex justify-content-center gap-2 flex-wrap">
              <Button
                variant="outline-secondary"
                size="sm"
                className="small px-2 py-1"
                onClick={() => fillDemoAccount('admin', 'admin123')}
              >
                Admin
              </Button>
              <Button
                variant="outline-primary"
                size="sm"
                className="small px-2 py-1"
                onClick={() => fillDemoAccount('recruiter', 'recruiter123')}
              >
                Recruiter
              </Button>
              <Button
                variant="outline-success"
                size="sm"
                className="small px-2 py-1"
                onClick={() => fillDemoAccount('candidate', 'candidate123')}
              >
                Candidate
              </Button>
            </div>
          </div>
        </Form>

        <div className="text-center mt-4">
          <span className="small text-muted">Don't have an account yet? </span>
          <Link to="/register" className="small fw-bold text-primary text-decoration-none">
            Create Candidate Account
          </Link>
        </div>
      </Card>
    </div>
  );
};
