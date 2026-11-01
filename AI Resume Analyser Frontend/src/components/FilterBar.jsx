import React from 'react';
import { Row, Col, Form, InputGroup } from 'react-bootstrap';
import { Search, Filter } from 'lucide-react';

export const FilterBar = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  minScore,
  setMinScore,
  placeholder = "Search candidates by name, skill, or email..."
}) => {
  return (
    <div className="card shadow-sm border-0 rounded-4 p-3 mb-4 bg-white">
      <Row className="g-3 align-items-center">
        <Col md={6}>
          <InputGroup>
            <InputGroup.Text className="bg-light border-end-0">
              <Search size={18} className="text-muted" />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-light border-start-0 ps-0"
            />
          </InputGroup>
        </Col>

        {statusFilter !== undefined && (
          <Col md={3}>
            <Form.Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-light"
            >
              <option value="ALL">All Application Statuses</option>
              <option value="PENDING">Under Review (Pending)</option>
              <option value="ACCEPTED">Shortlisted (Accepted)</option>
              <option value="REJECTED">Archived (Rejected)</option>
            </Form.Select>
          </Col>
        )}

        {minScore !== undefined && (
          <Col md={3}>
            <Form.Select
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="bg-light"
            >
              <option value="0">All Match Scores (0%+)</option>
              <option value="60">Good Fit (60%+)</option>
              <option value="75">High Fit (75%+)</option>
              <option value="85">Exceptional Fit (85%+)</option>
            </Form.Select>
          </Col>
        )}
      </Row>
    </div>
  );
};
