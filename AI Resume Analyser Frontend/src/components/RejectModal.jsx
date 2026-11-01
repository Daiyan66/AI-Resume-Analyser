import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { AlertCircle, Send } from 'lucide-react';

export const RejectModal = ({ show, onHide, candidate, onConfirmReject, loading }) => {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirmReject(candidate?.applicationId, feedback);
    setFeedback('');
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 d-flex align-items-center gap-2 text-danger">
            <AlertCircle size={22} />
            Reject Application: <strong>{candidate?.name}</strong>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <p className="text-muted small">
            Rejecting this applicant will immediately update their application status and dispatch an automated, constructive <strong>AI Skill Gap Coaching Report</strong> to help them strengthen their skills for future openings.
          </p>

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold small">Custom Recruiter Feedback / Notes:</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              placeholder="e.g. While your background in frontend development is impressive, this role requires deeper hands-on expertise with Spring Boot microservices and Kubernetes infrastructure..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              required
            />
          </Form.Group>

          <Alert variant="info" className="small mb-0">
            The candidate will also receive actionable recommendations for relevant certifications and portfolio projects based on their resume skill gap analysis.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" type="submit" disabled={loading} className="d-flex align-items-center gap-2">
            <Send size={16} />
            {loading ? 'Sending Feedback...' : 'Send Feedback & Reject'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};
