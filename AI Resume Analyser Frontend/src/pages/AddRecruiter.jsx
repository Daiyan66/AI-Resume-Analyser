import React, { useState } from 'react';
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Layout } from '../components/Layout';
import api from '../api/axios';
import { UserPlus, ArrowLeft, Mail, CheckCircle } from 'lucide-react';

const schema = yup.object().shape({
  name: yup.string().required('Full name is required'),
  email: yup.string().email('Invalid email address').required('Email is required'),
  company: yup.string().nullable()
});

export const AddRecruiter = () => {
  const navigate = useNavigate();
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema)
  });

  const onSubmit = async (data) => {
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);
    try {
      const res = await api.post('/admin/add-recruiter', data);
      setSuccessMsg(`Recruiter account successfully provisioned for ${res.data.email}. An invite email with temporary login credentials has been dispatched.`);
      reset();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to create recruiter account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="mb-4">
        <Button as={Link} to="/admin" variant="link" className="p-0 text-decoration-none d-flex align-items-center gap-1 text-muted mb-2">
          <ArrowLeft size={16} /> Back to User Management
        </Button>
        <h2 className="fw-extrabold text-dark mb-1">Invite New Recruiter</h2>
        <p className="text-muted mb-0">Create an authorized recruiter seat and dispatch automated onboarding credentials</p>
      </div>

      <div className="row justify-content-center">
        <div className="col-lg-6">
          <Card className="border-0 shadow-sm rounded-4 p-4 p-md-5 bg-white">
            {successMsg && (
              <Alert variant="success" className="d-flex align-items-center gap-2 mb-4">
                <CheckCircle size={20} className="flex-shrink-0" />
                <span>{successMsg}</span>
              </Alert>
            )}

            {errorMsg && (
              <Alert variant="danger" className="mb-4">
                {errorMsg}
              </Alert>
            )}

            <Form onSubmit={handleSubmit(onSubmit)}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold small">Full Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. Jessica Taylor"
                  {...register('name')}
                  isInvalid={!!errors.name}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.name?.message}
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold small">Work Email Address</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="jessica@company.com"
                  {...register('email')}
                  isInvalid={!!errors.email}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.email?.message}
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold small">Company / Division (Optional)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. Cloud Platform Engineering"
                  {...register('company')}
                />
              </Form.Group>

              <Button variant="primary" type="submit" disabled={submitting} className="w-100 py-2 d-flex align-items-center justify-content-center gap-2">
                {submitting ? (
                  <>
                    <Spinner size="sm" animation="border" />
                    <span>Provisioning & Dispatching Email...</span>
                  </>
                ) : (
                  <>
                    <Mail size={18} />
                    <span>Send Invite & Provision Account</span>
                  </>
                )}
              </Button>
            </Form>
          </Card>
        </div>
      </div>
    </Layout>
  );
};
