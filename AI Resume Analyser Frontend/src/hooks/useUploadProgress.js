import { useState, useCallback } from 'react';
import { API_BASE_URL } from '../utils/constants';

export const useUploadProgress = (jobId) => {
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    percentage: 0,
    message: '',
    completed: false,
    evaluations: []
  });

  const [isListening, setIsListening] = useState(false);

  const startListening = useCallback(() => {
    if (!jobId) return;

    const token = localStorage.getItem('ats_token');
    // Ensure absolute URL resolution if running across hosts
    const baseUrl = API_BASE_URL.startsWith('http')
      ? API_BASE_URL
      : `${window.location.origin}${API_BASE_URL}`;

    const sseUrl = `${baseUrl}/recruiter/progress/${jobId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    console.log('Connecting to SSE endpoint:', sseUrl);
    const eventSource = new EventSource(sseUrl);
    setIsListening(true);

    eventSource.addEventListener('CONNECTED', (event) => {
      console.log('SSE Stream established:', event.data);
    });

    eventSource.addEventListener('PROGRESS', (event) => {
      try {
        const data = JSON.parse(event.data);
        setProgress((prev) => {
          const newEvals = data.candidate && data.candidate.name
            ? [data.candidate, ...prev.evaluations]
            : prev.evaluations;

          return {
            ...prev,
            current: data.current,
            total: data.total,
            percentage: data.percentage,
            message: data.message,
            evaluations: newEvals
          };
        });
      } catch (err) {
        console.error('Failed to parse SSE progress data:', err);
      }
    });

    eventSource.addEventListener('COMPLETED', (event) => {
      try {
        const data = JSON.parse(event.data);
        setProgress((prev) => ({
          ...prev,
          percentage: 100,
          completed: true,
          message: data.message || 'Batch evaluation complete!'
        }));
      } catch (err) {
        setProgress((prev) => ({ ...prev, percentage: 100, completed: true }));
      }
      setIsListening(false);
      eventSource.close();
    });

    eventSource.onerror = (err) => {
      console.warn('SSE stream status update or closed by server', err);
      setIsListening(false);
      eventSource.close();
    };

    return () => {
      setIsListening(false);
      eventSource.close();
    };
  }, [jobId]);

  const resetProgress = useCallback(() => {
    setProgress({
      current: 0,
      total: 0,
      percentage: 0,
      message: '',
      completed: false,
      evaluations: []
    });
  }, []);

  return { progress, isListening, startListening, resetProgress };
};
