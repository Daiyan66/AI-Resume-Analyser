import React, { useState } from 'react';
import { Card, Table, Button, Badge, Modal, Form, Spinner, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import api from '../api/axios';
import { Users, UserPlus, Trash2, Edit3, Shield, Check } from 'lucide-react';

export const Admin = () => {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [msg, setMsg] = useState('');

  // Fetch all users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data;
    }
  });

  // Delete User Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminUsers']);
      setMsg('User deleted successfully.');
      setTimeout(() => setMsg(''), 3000);
    }
  });

  // Update User Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await api.put(`/admin/users/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminUsers']);
      setEditingUser(null);
      setMsg('User updated successfully.');
      setTimeout(() => setMsg(''), 3000);
    }
  });

  const handleEditClick = (user) => {
    setEditingUser(user);
    setSelectedRole(user.roles ? Array.from(user.roles)[0] : 'ROLE_CANDIDATE');
  };

  const handleSaveUpdate = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      id: editingUser.id,
      data: {
        ...editingUser,
        roles: [selectedRole]
      }
    });
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to permanently delete this user?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Layout>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-extrabold text-dark mb-1">User Management</h2>
          <p className="text-muted mb-0">Control platform access, promote recruiters, and manage user accounts</p>
        </div>
        <Button as={Link} to="/admin/add-recruiter" variant="primary" className="d-flex align-items-center gap-2">
          <UserPlus size={18} />
          <span>Provision Recruiter Account</span>
        </Button>
      </div>

      {msg && <Alert variant="success" className="py-2 small mb-4">{msg}</Alert>}

      <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="table-responsive">
          <Table hover align="middle" className="mb-0">
            <thead className="table-light">
              <tr>
                <th className="py-3 px-3">User</th>
                <th className="py-3">Email Address</th>
                <th className="py-3">Role</th>
                <th className="py-3">Recommendations</th>
                <th className="py-3">Created</th>
                <th className="py-3 text-end px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-3">
                      <div className="fw-semibold text-dark">{u.firstName} {u.lastName}</div>
                      <div className="text-muted small">@{u.username}</div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      {u.roles?.includes('ROLE_ADMIN') && <Badge bg="danger" className="me-1">Admin</Badge>}
                      {u.roles?.includes('ROLE_RECRUITER') && <Badge bg="primary" className="me-1">Recruiter</Badge>}
                      {u.roles?.includes('ROLE_CANDIDATE') && <Badge bg="success" className="me-1">Candidate</Badge>}
                    </td>
                    <td>
                      {u.optInForRecommendations ? (
                        <Badge bg="success-subtle" className="text-success border border-success-subtle">Opted In</Badge>
                      ) : (
                        <Badge bg="secondary-subtle" className="text-secondary border border-secondary-subtle">Disabled</Badge>
                      )}
                    </td>
                    <td className="text-muted small">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="text-end px-3">
                      <div className="d-flex justify-content-end gap-1">
                        <Button variant="outline-secondary" size="sm" onClick={() => handleEditClick(u)}>
                          <Edit3 size={15} />
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(u.id)}
                          disabled={u.username === 'admin'}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Card>

      {/* Edit User Modal */}
      {editingUser && (
        <Modal show={true} onHide={() => setEditingUser(null)} centered>
          <Form onSubmit={handleSaveUpdate}>
            <Modal.Header closeButton>
              <Modal.Title className="fs-5">Edit User: {editingUser.username}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">First Name</Form.Label>
                <Form.Control
                  type="text"
                  value={editingUser.firstName || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Last Name</Form.Label>
                <Form.Control
                  type="text"
                  value={editingUser.lastName || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Platform Role</Form.Label>
                <Form.Select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="ROLE_CANDIDATE">Candidate (Job Applicant)</option>
                  <option value="ROLE_RECRUITER">Recruiter (Hiring Manager)</option>
                  <option value="ROLE_ADMIN">Administrator (Full Access)</option>
                </Form.Select>
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      )}
    </Layout>
  );
};
