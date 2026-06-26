import axios from 'axios';
import { tokens } from '../utils/tokens.js';

/**
 * Single axios instance for all three backends — they all live behind the
 * same hostname (the ALB / nginx routes by path).
 */
const baseURL = import.meta.env.VITE_API_BASE || '/api/v1';
export const http = axios.create({ baseURL });

http.interceptors.request.use((c) => {
  const a = tokens.access();
  if (a) c.headers.Authorization = `Bearer ${a}`;
  return c;
});

let refreshing = null;
http.interceptors.response.use(
  (r) => r,
  async (err) => {
    const { response, config } = err;
    if (!response || response.status !== 401 || config._retry) throw err;
    const r = tokens.refresh();
    if (!r) throw err;
    config._retry = true;

    if (!refreshing) {
      refreshing = axios.post(`${baseURL}/auth/refresh`, { refreshToken: r })
        .then((res) => { const { accessToken, refreshToken } = res.data.data; tokens.set(accessToken, refreshToken); return accessToken; })
        .catch((e) => { tokens.clear(); throw e; })
        .finally(() => { refreshing = null; });
    }
    const fresh = await refreshing;
    config.headers.Authorization = `Bearer ${fresh}`;
    return http(config);
  },
);
