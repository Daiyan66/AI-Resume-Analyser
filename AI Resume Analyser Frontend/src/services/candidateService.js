import api from '../api/axios';

export const candidateService = {
  getJobs: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.query) params.append('query', filters.query);
    if (filters.education) params.append('education', filters.education);
    if (filters.maxExp) params.append('maxExp', filters.maxExp);
    const res = await api.get(`/candidate/jobs?${params.toString()}`);
    return res.data;
  },

  getRecommendations: async () => {
    const res = await api.get('/candidate/recommendations');
    return res.data;
  },

  apply: async (jobId, file) => {
    const formData = new FormData();
    formData.append('jobId', jobId);
    formData.append('file', file);
    const res = await api.post('/candidate/apply', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  getApplications: async () => {
    const res = await api.get('/candidate/applications');
    return res.data;
  },

  getLatestApplicationId: async () => {
    const res = await api.get('/candidate/analysis/latest');
    return res.data;
  },

  getSkillGapAnalysis: async (applicationId) => {
    const res = await api.get(`/candidate/analysis/${applicationId}`);
    return res.data;
  }
};
