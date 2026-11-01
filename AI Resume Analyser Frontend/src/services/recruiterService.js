import api from '../api/axios';

export const recruiterService = {
  getStats: async () => {
    const res = await api.get('/recruiter/stats');
    return res.data;
  },

  getJobs: async () => {
    const res = await api.get('/recruiter/jobs');
    return res.data;
  },

  createJob: async (jobData) => {
    const res = await api.post('/recruiter/jobs', jobData);
    return res.data;
  },

  uploadJobDocument: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/recruiter/jobs/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  uploadResumes: async (jobId, files) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    const res = await api.post(`/recruiter/jobs/${jobId}/upload-resumes`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  getCandidates: async (jobId) => {
    const res = await api.get(`/recruiter/jobs/${jobId}/candidates`);
    return res.data;
  },

  getUploadResults: async (jobId) => {
    const res = await api.get(`/recruiter/jobs/${jobId}/upload-results`);
    return res.data;
  },

  acceptCandidate: async (applicationId) => {
    const res = await api.post(`/recruiter/applications/${applicationId}/accept`);
    return res.data;
  },

  rejectCandidate: async (applicationId, feedback) => {
    const res = await api.post(`/recruiter/applications/${applicationId}/reject`, { feedback });
    return res.data;
  },

  askChatbot: async (query) => {
    const res = await api.post('/chatbot/ask', { query });
    return res.data.response;
  }
};
