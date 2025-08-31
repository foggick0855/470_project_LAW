import axios from 'axios';

// Directly use backend routes through CRA proxy (http://localhost:5000)
const api = axios.create({
  baseURL: '/api/agreements',
});

// Attach JWT before every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ----------------------------- FR-9 (Drafts) ----------------------------- */
export const createVersion = async ({ caseId, content }) => {
  const { data } = await api.post('/version', { caseId, content });
  return data; // { success, version }
};

export const listVersions = async (caseId) => {
  const { data } = await api.get('/version/list', { params: { caseId } });
  return data; // { success, finalized, versions: [] }
};

export const getVersion = async (versionId) => {
  const { data } = await api.get(`/version/${versionId}`);
  return data; // { success, version }
};

/* ------------------------ FR-10 (Finalize & View) ------------------------ */
export const finalizeAgreement = async ({ caseId, versionId = null }) => {
  const payload = { caseId };
  if (versionId) payload.versionId = versionId;
  const { data } = await api.post('/finalize', payload);
  return data; // { success, final, message }
};

export const getFinalAgreement = async (caseId) => {
  const { data } = await api.get('/final', { params: { caseId } });
  return data; // { success, final }
};
