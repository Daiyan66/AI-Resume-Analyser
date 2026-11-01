import React from 'react';
import { Card, Table, Badge, Button, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { candidateService } from '../services/candidateService';
import { FileText, Award, ArrowRight, Compass, MessageSquare } from 'lucide-react';

export const CandidateStatus = () => {
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['candidateApps'],
    queryFn: candidateService.getApplications
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACCEPTED':
        return <Badge bg="success" className="px-2 py-1">Shortlisted / Accepted</Badge>;
      case 'REJECTED':
        return <Badge bg="danger" className="px-2 py-1">Under Consideration / Archived</Badge>;
      default:
        return <Badge bg="secondary" className="px-2 py-1">In Review (Pending)</Badge>;
    }
  };

  return (
    <Layout>
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 className="fw-extrabold text-dark mb-1">My Applications</h2>
          <p className="text-muted mb-0">Track application statuses, match evaluations, and access AI coaching insights</p>
        </div>
        <Button as={Link} to="/candidate/jobs" variant="outline-primary" className="d-flex align-items-center gap-2">
          <Compass size={18} />
          <span>Browse More Openings</span>
        </Button>
      </div>

      <Card className="border-0 shadow-sm rounded-4 overflow-hidden bg-white">
        <div className="table-responsive">
          <Table hover align="middle" className="mb-0">
            <thead className="table-light">
              <tr>
                <th className="py-3 px-3">Position</th>
                <th className="py-3">Resume Document</th>
                <th className="py-3">AI Fit Score</th>
                <th className="py-3">Application Status</th>
                <th className="py-3">Applied Date</th>
                <th className="py-3 text-end px-3">Coaching Report</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    <p className="mb-2">You haven't submitted any applications yet.</p>
                    <Button as={Link} to="/candidate/jobs" variant="primary" size="sm">
                      Explore Open Positions
                    </Button>
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id}>
                    <td className="px-3">
                      <div className="fw-bold text-dark">{app.jobTitle}</div>
                      <div className="text-muted small">Application #{app.id}</div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-1 text-muted small">
                        <FileText size={15} className="text-primary" />
                        <span>{app.fileName}</span>
                      </div>
                    </td>
                    <td>
                      <Badge bg={app.matchScore >= 75 ? 'success' : 'primary'} className="fs-6 px-2 py-1">
                        {Math.round(app.matchScore)}%
                      </Badge>
                    </td>
                    <td>
                      <div>{getStatusBadge(app.status)}</div>
                      {app.recruiterFeedback && (
                        <div className="mt-2 p-2 bg-light rounded small border">
                          <strong className="text-primary d-flex align-items-center gap-1 mb-1" style={{ fontSize: '0.75rem' }}>
                            <MessageSquare size={12} /> Recruiter Feedback:
                          </strong>
                          <span className="text-secondary" style={{ fontSize: '0.78rem' }}>"{app.recruiterFeedback}"</span>
                        </div>
                      )}
                    </td>
                    <td className="text-muted small">
                      {new Date(app.appliedAt).toLocaleDateString()}
                    </td>
                    <td className="text-end px-3">
                      <Button
                        as={Link}
                        to={`/candidate/skill-gap/${app.id}`}
                        variant="outline-primary"
                        size="sm"
                        className="d-inline-flex align-items-center gap-1"
                      >
                        <Award size={15} />
                        <span>View Coaching Report</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Card>
    </Layout>
  );
};
