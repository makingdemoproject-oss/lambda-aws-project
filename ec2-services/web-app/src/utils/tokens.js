const A = 'platform.access', R = 'platform.refresh';
export const tokens = {
  access:  () => localStorage.getItem(A),
  refresh: () => localStorage.getItem(R),
  set: (a, r) => { if (a) localStorage.setItem(A, a); if (r) localStorage.setItem(R, r); },
  clear: () => { localStorage.removeItem(A); localStorage.removeItem(R); },
};
