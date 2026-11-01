import React, { useState } from 'react';
import { Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { recruiterService } from '../services/recruiterService';
import { CheckCircle, ArrowRight } from 'lucide-react';

const schema = yup.object().shape({
  title: yup.string().required('Job title is required'),
  description: yup.string().min(20, 'Description must be at least 20 characters').required('Description is required'),
  skillsRequired: yup.string().required('Core skills are required (comma separated)'),
  educationLevel: yup.string().required('Education requirement is required'),
  experienceRequired: yup.number().typeError('Must be a number').min(0, 'Experience cannot be negative').required('Required experience is required')
});

export const UploadJobForm = ({ onJobCreated }) => {
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      experienceRequired: 2,
      educationLevel: "Bachelor's Degree in Computer Science or related"
    }
  });

  const onSubmit = async (data) => {
    setErrorMsg('');
    setSubmitting(true);
    try {
      const job = await recruiterService.createJob(data);
      setSuccess(true);
      if (onJobCreated) onJobCreated(job);
      reset();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to publish job opening');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-2">
      {success && (
        <Alert variant="success" className="d-flex align-items-center gap-2 mb-4">
          <CheckCircle size={20} className="flex-shrink-0" />
          <span>Job posting published successfully!</span>
        </Alert>
      )}

      {errorMsg && <Alert variant="danger" className="mb-4">{errorMsg}</Alert>}

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold small">Job Title</Form.Label>
          <Form.Control
            type="text"
            placeholder="e.g. Lead Full-Stack Engineer"
            {...register('title')}
            isInvalid={!!errors.title}
          />
          <Form.Control.Feedback type="invalid">{errors.title?.message}</Form.Control.Feedback>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold small">Core Required Skills (Comma Separated)</Form.Label>
          <Form.Control
            type="text"
            placeholder="e.g. Java, Spring Boot, React, TypeScript, Docker, Kubernetes, MySQL"
            {...register('skillsRequired')}
            isInvalid={!!errors.skillsRequired}
          />
          <Form.Control.Feedback type="invalid">{errors.skillsRequired?.message}</Form.Control.Feedback>
          <Form.Text className="text-muted">These skills will form the 35% Hard Skill Alignment benchmark.</Form.Text>
        </Form.Group>

        <Row className="mb-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label className="fw-semibold small">Required Education Level</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. Bachelor's or Master's in Computer Science"
                {...register('educationLevel')}
                isInvalid={!!errors.educationLevel}
              />
              <Form.Control.Feedback type="invalid">{errors.educationLevel?.message}</Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label className="fw-semibold small">Minimum Years of Experience</Form.Label>
              <Form.Control
                type="number"
                min="0"
                {...register('experienceRequired')}
                isInvalid={!!errors.experienceRequired}
              />
              <Form.Control.Feedback type="invalid">{errors.experienceRequired?.message}</Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>

        <Form.Group className="mb-4">
          <Form.Label className="fw-semibold small">Detailed Job Description & Responsibilities</Form.Label>
          <Form.Control
            as="textarea"
            rows={6}
            placeholder="Outline role responsibilities, team dynamics, business objectives, and project scope..."
            {...register('description')}
            isInvalid={!!errors.description}
          />
          <Form.Control.Feedback type="invalid">{errors.description?.message}</Form.Control.Feedback>
        </Form.Group>

        <div className="text-end">
          <Button variant="primary" size="lg" type="submit" disabled={submitting} className="d-inline-flex align-items-center gap-2 px-4">
            {submitting ? (
              <>
                <Spinner size="sm" animation="border" />
                <span>Publishing Job...</span>
              </>
            ) : (
              <>
                <span>Publish Opening</span>
                <ArrowRight size={18} />
              </>
            )}
          </Button>
        </div>
      </Form>
    </div>
  );
};
