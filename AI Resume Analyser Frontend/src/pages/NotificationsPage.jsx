import React, { useState } from 'react';
import { Card, Button, Badge, Spinner, Row, Col, Alert, Form, InputGroup } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../auth/AuthProvider';
import api from '../api/axios';
import { 
  Bell, 
  Check, 
  CheckCircle, 
  ExternalLink, 
  Search, 
  Filter, 
  MessageSquare, 
  Briefcase, 
  Building2, 
  Users, 
  AlertCircle,
  Clock,
  Sparkles,
  Mail
} from 'lucide-react';

export const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'UNREAD' | 'READ'
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const userRole = (user?.role || '').toUpperCase();
  const isAdmin = userRole === 'ROLE_ADMIN';
  const isRecruiter = userRole === 'ROLE_RECRUITER';
  const isCandidate = userRole === 'ROLE_CANDIDATE' || (!isAdmin && !isRecruiter);

  // 1. Fetch Notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data || [];
    },
    refetchInterval: 15000
  });

  // 2. Mark Single as Read
  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      await api.put(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  // 3. Mark All as Read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.put('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  const handleNotificationClick = (n) => {
    if (!n.isRead) {
      markReadMutation.mutate(n.id);
    }
    if (n.link) {
      navigate(n.link);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'FEEDBACK':
        return <MessageSquare size={18} className="text-danger" />;
      case 'NEW_APPLICATION':
        return <Users size={18} className="text-primary" />;
      case 'BATCH_SCREENING':
        return <Briefcase size={18} className="text-info" />;
      case 'RECRUITER_REQUEST':
      case 'RECRUITER_ONBOARDED':
        return <Building2 size={18} className="text-warning" />;
      case 'CANDIDATE_REGISTRATION':
        return <Users size={18} className="text-success" />;
      case 'NEW_JOB':
        return <Sparkles size={18} className="text-primary" />;
      default:
        return <Bell size={18} className="text-primary" />;
    }
  };

  // Role-specific type filters
  const getTypeOptions = () => {
    if (isAdmin) {
      return [
        { label: 'All Categories', value: 'ALL' },
        { label: 'Recruiter Requests', value: 'RECRUITER_REQUEST' },
        { label: 'Recruiter Onboarded', value: 'RECRUITER_ONBOARDED' },
        { label: 'Candidate Signups', value: 'CANDIDATE_REGISTRATION' }
      ];
    }
    if (isRecruiter) {
      return [
        { label: 'All Categories', value: 'ALL' },
        { label: 'Candidate Applications', value: 'NEW_APPLICATION' },
        { label: 'Batch Screening', value: 'BATCH_SCREENING' }
      ];
    }
    return [
      { label: 'All Categories', value: 'ALL' },
      { label: 'Recruiter Feedback', value: 'FEEDBACK' },
      { label: 'New Job Matches', value: 'NEW_JOB' }
    ];
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    // Status filter
    if (statusFilter === 'UNREAD' && n.isRead) return false;
    if (statusFilter === 'READ' && !n.isRead) return false;

    // Type filter
    if (typeFilter !== 'ALL' && n.type !== typeFilter) return false;

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = n.title?.toLowerCase().includes(q);
      const matchMsg = n.message?.toLowerCase().includes(q);
      if (!matchTitle && !matchMsg) return false;
    }

    return true;
  });

  return (
    <Layout>
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <div>
            <h2 className="fw-extrabold text-dark mb-1 d-flex align-items-center gap-2">
              <Bell className="text-primary" size={26} />
              Notifications & Activity Center
            </h2>
            <p className="text-muted mb-0">
              Live updates, alerts, and feedback tailored for your {userRole.replace('ROLE_', '').toLowerCase()} workspace.
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            {unreadCount > 0 && (
              <Badge bg="danger" className="px-3 py-2 rounded-pill fs-6">
                {unreadCount} Unread
              </Badge>
            )}
            <Button
              variant="outline-primary"
              size="sm"
              className="rounded-3 d-flex align-items-center gap-1"
              disabled={unreadCount === 0 || markAllReadMutation.isPending}
              onClick={() => markAllReadMutation.mutate()}
            >
              <Check size={16} />
              <span>Mark All as Read</span>
            </Button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <Card className="glass-card border-0 shadow-sm rounded-4 p-3 mb-4">
          <Row className="g-3 align-items-center">
            {/* Search */}
            <Col md={5}>
              <InputGroup size="sm">
                <InputGroup.Text className="bg-light border-0">
                  <Search size={16} className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-0 bg-light"
                />
              </InputGroup>
            </Col>

            {/* Status Pills */}
            <Col md={3}>
              <div className="d-flex gap-1">
                <Button
                  size="sm"
                  variant={statusFilter === 'ALL' ? 'primary' : 'outline-secondary'}
                  className="rounded-pill px-3"
                  onClick={() => setStatusFilter('ALL')}
                >
                  All ({notifications.length})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'UNREAD' ? 'danger' : 'outline-secondary'}
                  className="rounded-pill px-3"
                  onClick={() => setStatusFilter('UNREAD')}
                >
                  Unread ({unreadCount})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'READ' ? 'secondary' : 'outline-secondary'}
                  className="rounded-pill px-3"
                  onClick={() => setStatusFilter('READ')}
                >
                  Read
                </Button>
              </div>
            </Col>

            {/* Type Dropdown Filter */}
            <Col md={4} className="text-md-end">
              <Form.Select
                size="sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-auto d-inline-block rounded-3"
              >
                {getTypeOptions().map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Form.Select>
            </Col>
          </Row>
        </Card>
      </div>

      {/* Notifications Cards List */}
      <div className="space-y-3">
        {isLoading ? (
          <Card className="glass-card border-0 shadow-sm rounded-4 p-5 text-center">
            <Spinner animation="border" variant="primary" className="mx-auto mb-2" />
            <div className="small text-muted">Loading your notifications...</div>
          </Card>
        ) : filteredNotifications.length === 0 ? (
          <Card className="glass-card border-0 shadow-sm rounded-4 p-5 text-center">
            <div className="avatar-circle bg-light text-muted mx-auto mb-3" style={{ width: '56px', height: '56px' }}>
              <Bell size={28} />
            </div>
            <h5 className="fw-bold text-dark mb-1">No Notifications Found</h5>
            <p className="text-muted small mb-0">
              {searchTerm || statusFilter !== 'ALL' || typeFilter !== 'ALL'
                ? 'No notifications match your current search and filter criteria.'
                : 'You have no notifications at this time.'}
            </p>
          </Card>
        ) : (
          filteredNotifications.map((n) => (
            <Card
              key={n.id}
              className={`glass-card border-0 shadow-sm rounded-4 p-3 mb-3 hover-card transition-all ${
                !n.isRead ? 'border-start border-4 border-primary bg-primary-subtle' : ''
              }`}
              style={{ cursor: n.link ? 'pointer' : 'default' }}
              onClick={() => handleNotificationClick(n)}
            >
              <div className="d-flex align-items-start gap-3">
                <div className="p-2 rounded-3 bg-white shadow-sm mt-1 flex-shrink-0">
                  {getNotificationIcon(n.type)}
                </div>

                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between align-items-start mb-1 flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <h6 className="fw-bold text-dark mb-0">{n.title}</h6>
                      {!n.isRead && (
                        <Badge bg="danger" pill className="p-1">
                          New
                        </Badge>
                      )}
                      {n.type && (
                        <Badge bg="light" className="text-secondary border small">
                          {n.type.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>

                    <div className="d-flex align-items-center gap-2 small text-muted">
                      <Clock size={13} />
                      <span>{new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <p className="text-secondary mb-2 small" style={{ fontSize: '0.88rem', lineHeight: '1.5' }}>
                    {n.message}
                  </p>

                  <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                    <div className="d-flex align-items-center gap-2">
                      {n.link ? (
                        <span className="small text-primary fw-bold d-flex align-items-center gap-1">
                          View Details <ExternalLink size={12} />
                        </span>
                      ) : (
                        <span className="small text-muted">Information Alert</span>
                      )}

                      {isAdmin && (n.type === 'RECRUITER_REQUEST' || n.message?.includes('@')) && (
                        <a
                          href={`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(n.message.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0] || 'recruiter')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="badge bg-danger text-white text-decoration-none px-2 py-1 d-inline-flex align-items-center gap-1 shadow-sm"
                          onClick={(e) => e.stopPropagation()}
                          title="Open applicant in Gmail in new tab"
                        >
                          <Mail size={12} />
                          <span>Open in Gmail</span>
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>

                    {!n.isRead && (
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 small text-decoration-none text-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          markReadMutation.mutate(n.id);
                        }}
                      >
                        Mark as read
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </Layout>
  );
};

export default NotificationsPage;
