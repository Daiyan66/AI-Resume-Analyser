import React, { useState } from 'react';
import { Card, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../auth/AuthProvider';
import { ThreeBackground } from '../components/ThreeBackground';
import { Sparkles, ArrowRight, UserCheck } from 'lucide-react';

const registerSchema = yup.object().shape({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  username: yup.string().min(3, 'At least 3 characters').required('Username is required'),
  email: yup.string().email('Invalid email address').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm password')
});

export const RegisterPage = () => {
  const { register: registerAuth } = useAuth();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(registerSchema)
  });

  const onSubmit = async (data) => {
    setErrorMsg('');
    setSubmitting(true);
    try {
      await registerAuth({
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        email: data.email,
        password: data.password
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-wrapper min-vh-100 d-flex align-items-center justify-content-center p-3 position-relative overflow-hidden">
      <ThreeBackground />

      <Card className="glass-card shadow-2-strong border-0 rounded-4 p-4 p-md-5 position-relative" style={{ maxWidth: '520px', width: '100%', zIndex: 10 }}>
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center p-3 rounded-circle bg-primary-subtle text-primary mb-3">
            <Sparkles size={32} />
          </div>
          <h3 className="fw-extrabold text-dark mb-1">Create Candidate Profile</h3>
          <p className="text-muted small">Unlock AI resume analysis and proactive job recommendations</p>
        </div>

        {errorMsg && (
          <Alert variant="danger" className="small py-2 mb-4">
            {errorMsg}
          </Alert>
        )}

        <Form onSubmit={handleSubmit(onSubmit)}>
          <Row>
            <Col sm={6}>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold text-secondary">First Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. Alex"
                  {...register('firstName')}
                  isInvalid={!!errors.firstName}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.firstName?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col sm={6}>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold text-secondary">Last Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. Rivera"
                  {...register('lastName')}
                  isInvalid={!!errors.lastName}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.lastName?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold text-secondary">Username</Form.Label>
            <Form.Control
              type="text"
              placeholder="Choose a unique username"
              {...register('username')}
              isInvalid={!!errors.username}
            />
            <Form.Control.Feedback type="invalid">
              {errors.username?.message}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold text-secondary">Email Address</Form.Label>
            <Form.Control
              type="email"
              placeholder="alex@example.com"
              {...register('email')}
              isInvalid={!!errors.email}
            />
            <Form.Control.Feedback type="invalid">
              {errors.email?.message}
            </Form.Control.Feedback>
          </Form.Group>

          <Row>
            <Col sm={6}>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold text-secondary">Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  isInvalid={!!errors.password}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.password?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col sm={6}>
              <Form.Group className="mb-4">
                <Form.Label className="small fw-semibold text-secondary">Confirm</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="••••••••"
                  {...register('confirmPassword')}
                  isInvalid={!!errors.confirmPassword}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.confirmPassword?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Button variant="primary" type="submit" disabled={submitting} className="w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 mb-3">
            {submitting ? (
              <>
                <Spinner size="sm" animation="border" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight size={18} />
              </>
            )}
          </Button>
        </Form>

        <div className="text-center mt-3">
          <span className="small text-muted">Already registered? </span>
          <Link to="/login" className="small fw-bold text-primary text-decoration-none">
            Sign In here
          </Link>
        </div>
      </Card>
    </div>
  );
};
