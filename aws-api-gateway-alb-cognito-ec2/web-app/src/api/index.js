import { http } from './http.js';

// 🟢 rbac-service
export const rbac = {
  // auth
  register: (p) => http.post('/auth/register', p).then((r) => r.data.data),
  login:    (p) => http.post('/auth/login',    p).then((r) => r.data.data),
  me:       ()  => http.get ('/auth/me').then((r) => r.data.data),
  logout:   ()  => http.post('/auth/logout'),
  myMenu:   ()  => http.get('/users/me/menu').then((r) => r.data.data),

  // password lifecycle
  forgotPassword: (p) => http.post('/auth/forgot-password', p).then((r) => r.data),
  resetPassword:  (p) => http.post('/auth/reset-password',  p).then((r) => r.data),
  changePassword: (p) => http.post('/auth/change-password', p).then((r) => r.data),
  // email verification
  verifyEmail:        (p) => http.post('/auth/verify-email',        p).then((r) => r.data.data),
  resendVerification: (p) => http.post('/auth/resend-verification', p).then((r) => r.data),

  // users
  users: {
    list:        (params) => http.get('/users', { params }).then((r) => r.data.data),
    get:         (id) => http.get(`/users/${id}`).then((r) => r.data.data),
    setActive:   (id, isActive) => http.patch(`/users/${id}/active`, { isActive }).then((r) => r.data.data),
    updateRoles: (id, roleIds) => http.put(`/users/${id}/roles`, { roleIds }).then((r) => r.data.data),
  },

  // roles
  roles: {
    list:        () => http.get('/roles').then((r) => r.data.data),
    get:         (id) => http.get(`/roles/${id}`).then((r) => r.data.data),
    create:      (p) => http.post('/roles', p).then((r) => r.data.data),
    update:      (id, p) => http.patch(`/roles/${id}`, p).then((r) => r.data.data),
    remove:      (id) => http.delete(`/roles/${id}`),
    permissions: () => http.get('/roles/permissions').then((r) => r.data.data),
  },

  // menus
  menus: {
    list:    () => http.get('/menus').then((r) => r.data.data),
    get:     (id) => http.get(`/menus/${id}`).then((r) => r.data.data),
    create:  (p) => http.post('/menus', p).then((r) => r.data.data),
    update:  (id, p) => http.patch(`/menus/${id}`, p).then((r) => r.data.data),
    remove:  (id) => http.delete(`/menus/${id}`),
  },
};

// 🟢 ecommerce-service
export const ecom = {
  products: {
    list:   (params) => http.get('/products', { params }).then((r) => r.data.data),
    bySlug: (slug)   => http.get(`/products/slug/${slug}`).then((r) => r.data.data),
    create: (p)      => http.post('/products', p).then((r) => r.data.data),
  },
  categories: { tree: () => http.get('/categories').then((r) => r.data.data) },
  cart: {
    view:   () => http.get('/cart').then((r) => r.data.data),
    add:    (p) => http.post('/cart/items', p).then((r) => r.data.data),
    update: (id, p) => http.patch(`/cart/items/${id}`, p).then((r) => r.data.data),
    remove: (id) => http.delete(`/cart/items/${id}`),
  },
  orders: {
    place:    (p) => http.post('/orders', p).then((r) => r.data.data),
    listMine: ()  => http.get('/orders/mine').then((r) => r.data.data),
  },
  addresses: {
    list:   () => http.get('/addresses').then((r) => r.data.data),
    create: (p) => http.post('/addresses', p).then((r) => r.data.data),
  },
};

// 🟢 ecommerce — variants
export const variants = {
  forProduct: (productId) => http.get(`/products/${productId}/variants`).then((r) => r.data.data),
  create:     (productId, p) => http.post(`/products/${productId}/variants`, p).then((r) => r.data.data),
  update:     (id, p) => http.patch(`/variants/${id}`, p).then((r) => r.data.data),
  remove:     (id) => http.delete(`/variants/${id}`),
};

// 🟢 ecommerce — Cashfree payments + invoice
export const payments = {
  createCashfreeOrder: (orderUuid) => http.post(`/payments/orders/${orderUuid}/cashfree`).then((r) => r.data.data),
  status:              (orderNumber) => http.get(`/payments/orders/${orderNumber}/status`).then((r) => r.data.data),
  invoice:             (orderNumber) => http.get(`/payments/orders/${orderNumber}/invoice`).then((r) => r.data.data),
  refund:              (orderNumber, p) => http.post(`/payments/orders/${orderNumber}/refund`, p).then((r) => r.data.data),
};

// 🟢 ecommerce — reports
export const reports = {
  bookings:        (params) => http.get('/reports/bookings', { params }).then((r) => r.data.data),
  cancellations:   (params) => http.get('/reports/cancellations', { params }).then((r) => r.data.data),
  customerLoss:    (params) => http.get('/reports/customer-loss', { params }).then((r) => r.data.data),
};

// 🟢 ride-service (mounted at /api/v1/ride)
export const ride = {
  estimate:   (p) => http.post('/ride/rides/estimate', p).then((r) => r.data.data),
  request:    (p) => http.post('/ride/rides', p).then((r) => r.data.data),
  get:        (id) => http.get(`/ride/rides/${id}`).then((r) => r.data.data),
  listMine:   () => http.get('/ride/rides/mine').then((r) => r.data.data),
  cancel:     (id, reason) => http.post(`/ride/rides/${id}/cancel`, { reason }).then((r) => r.data.data),

  // driver actions
  driver: {
    me:        () => http.get('/ride/drivers/me').then((r) => r.data.data),
    upsert:    (p) => http.put('/ride/drivers/me', p).then((r) => r.data.data),
    online:    (p) => http.post('/ride/drivers/me/online', p).then((r) => r.data.data),
    location:  (p) => http.post('/ride/drivers/me/location', p).then((r) => r.data.data),
    nearby:    (params) => http.get('/ride/drivers/nearby', { params }).then((r) => r.data.data),
    listMine:  (params) => http.get('/ride/rides/driver/mine', { params }).then((r) => r.data.data),
    accept:    (id) => http.post(`/ride/rides/${id}/accept`).then((r) => r.data.data),
    arrived:   (id) => http.post(`/ride/rides/${id}/arrived`).then((r) => r.data.data),
    start:     (id) => http.post(`/ride/rides/${id}/start`).then((r) => r.data.data),
    complete:  (id, p) => http.post(`/ride/rides/${id}/complete`, p).then((r) => r.data.data),
  },

  // ride payment
  pay:        (rideId) => http.post(`/ride/payments/rides/${rideId}/cashfree`).then((r) => r.data.data),
  payStatus:  (rideId) => http.get(`/ride/payments/rides/${rideId}/status`).then((r) => r.data.data),
};

// Geocoding (free, with attribution) — OpenStreetMap Nominatim
export const geocode = {
  search: async (q) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { 'accept-language': 'en' } });
    return res.json();
  },
  reverse: async (lat, lng) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { headers: { 'accept-language': 'en' } });
    return res.json();
  },
};

// 🟢 hotel-service (mounted at /api/v1/hotel)
export const hotel = {
  list:        (params) => http.get('/hotel/hotels',         { params }).then((r) => r.data.data),
  bySlug:      (slug)   => http.get(`/hotel/hotels/slug/${slug}`).then((r) => r.data.data),
  byId:        (id)     => http.get(`/hotel/hotels/${id}`).then((r) => r.data.data),
  create:      (p)      => http.post('/hotel/hotels', p).then((r) => r.data.data),
  update:      (id, p)  => http.patch(`/hotel/hotels/${id}`, p).then((r) => r.data.data),
  remove:      (id)     => http.delete(`/hotel/hotels/${id}`),

  rooms: {
    list:    (hotelId, params) => http.get(`/hotel/hotels/${hotelId}/rooms`, { params }).then((r) => r.data.data),
    create:  (hotelId, p)      => http.post(`/hotel/hotels/${hotelId}/rooms`, p).then((r) => r.data.data),
    update:  (roomId, p)       => http.patch(`/hotel/rooms/${roomId}`, p).then((r) => r.data.data),
    remove:  (roomId)          => http.delete(`/hotel/rooms/${roomId}`),
  },

  availability: (params) => http.get('/hotel/bookings/availability', { params }).then((r) => r.data.data),

  bookings: {
    create:    (p) => http.post('/hotel/bookings', p).then((r) => r.data.data),
    listMine:  (params) => http.get('/hotel/bookings/mine', { params }).then((r) => r.data.data),
    get:       (id) => http.get(`/hotel/bookings/${id}`).then((r) => r.data.data),
    cancel:    (id, reason) => http.post(`/hotel/bookings/${id}/cancel`, { reason }).then((r) => r.data.data),
  },

  pay:       (bookingId) => http.post(`/hotel/payments/bookings/${bookingId}/cashfree`).then((r) => r.data.data),
  payStatus: (bookingId) => http.get(`/hotel/payments/bookings/${bookingId}/cashfree/status`).then((r) => r.data.data),
};

// 🟢 learn-service (mounted at /api/v1/learn) — NestJS + TypeORM
export const learn = {
  // courses
  courses: {
    list:    (params) => http.get('/learn/courses', { params }).then((r) => r.data.data),
    bySlug:  (slug)   => http.get(`/learn/courses/slug/${slug}`).then((r) => r.data.data),
    byId:    (id)     => http.get(`/learn/courses/${id}`).then((r) => r.data.data),
    create:  (p)      => http.post('/learn/courses', p).then((r) => r.data.data),
    update:  (id, p)  => http.patch(`/learn/courses/${id}`, p).then((r) => r.data.data),
    publish: (id)     => http.post(`/learn/courses/${id}/publish`).then((r) => r.data.data),
    archive: (id)     => http.post(`/learn/courses/${id}/archive`).then((r) => r.data.data),
  },

  packages: {
    list:    (params) => http.get('/learn/packages', { params }).then((r) => r.data.data),
    bySlug:  (slug)   => http.get(`/learn/packages/${slug}`).then((r) => r.data.data),
  },

  students: {
    me:      ()       => http.get('/learn/students/me').then((r) => r.data.data),
    byCode:  (code)   => http.get(`/learn/students/${code}`).then((r) => r.data.data),
  },

  lessons: {
    forCourse: (courseId) => http.get(`/learn/courses/${courseId}/lessons`).then((r) => r.data.data),
    bySlug:    (courseId, slug) => http.get(`/learn/courses/${courseId}/lessons/${slug}`).then((r) => r.data.data),
    create:    (courseId, p)    => http.post(`/learn/courses/${courseId}/lessons`, p).then((r) => r.data.data),
  },

  exercises: {
    forLesson: (lessonId) => http.get(`/learn/lessons/${lessonId}/exercises`).then((r) => r.data.data),
  },

  submissions: {
    submit:    (p)        => http.post('/learn/submissions', p).then((r) => r.data.data),
    listMine:  (exerciseId, params) => http.get(`/learn/submissions/exercises/${exerciseId}/mine`, { params }).then((r) => r.data),
  },

  enrollments: {
    enrollCourse:  (courseId) => http.post('/learn/enrollments/courses', { courseId }).then((r) => r.data.data),
    enrollPackage: (slug)     => http.post(`/learn/enrollments/packages/${slug}`).then((r) => r.data.data),
    mine:          ()         => http.get('/learn/enrollments/mine').then((r) => r.data.data),
    completeLesson:(courseId) => http.post(`/learn/enrollments/mine/courses/${courseId}/lessons/complete`).then((r) => r.data.data),
  },

  schedules: {
    upcoming:  (courseId, params) => http.get(`/learn/schedules/upcoming/${courseId}`, { params }).then((r) => r.data.data),
    forInstructor: (params)       => http.get('/learn/schedules/instructor', { params }).then((r) => r.data.data),
    create:    (p)                => http.post('/learn/schedules', p).then((r) => r.data.data),
  },

  bookings: {
    create:    (p)        => http.post('/learn/bookings', p).then((r) => r.data.data),
    mine:      (params)   => http.get('/learn/bookings/mine', { params }).then((r) => r.data),
    cancel:    (id, reason) => http.post(`/learn/bookings/${id}/cancel`, { reason }).then((r) => r.data.data),
  },

  payments: {
    createForBooking: (bookingId) => http.post(`/learn/payments/bookings/${bookingId}/cashfree`).then((r) => r.data.data),
    status:    (orderId)         => http.get(`/learn/payments/orders/${orderId}/status`).then((r) => r.data.data),
  },

  reviews: {
    forCourse: (courseId, params) => http.get(`/learn/reviews/courses/${courseId}`, { params }).then((r) => r.data),
    upsert:    (courseId, p)      => http.post(`/learn/reviews/courses/${courseId}`, p).then((r) => r.data.data),
  },

  dashboards: {
    student: () => http.get('/learn/dashboards/student').then((r) => r.data.data),
    admin:   () => http.get('/learn/dashboards/admin').then((r) => r.data.data),
  },
};

// 🟢 chat-service (mounted at /api/v1/chat)
export const chat = {
  list:        () => http.get('/chat/chats').then((r) => r.data.data),
  create1to1:  (userId) => http.post('/chat/chats/one-to-one', { userId }).then((r) => r.data.data),
  createGroup: (p) => http.post('/chat/chats/group', p).then((r) => r.data.data),
  messages:    (chatId) => http.get(`/chat/chats/${chatId}/messages`).then((r) => r.data.data),
  send:        (chatId, p) => http.post(`/chat/chats/${chatId}/messages`, p).then((r) => r.data.data),
  markRead:    (chatId, ids) => http.post(`/chat/chats/${chatId}/read`, { messageIds: ids }).then((r) => r.data.data),
};
