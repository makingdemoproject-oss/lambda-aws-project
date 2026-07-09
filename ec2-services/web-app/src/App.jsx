import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import ChangePasswordPage from './pages/ChangePasswordPage.jsx';
import VerifyEmailPage from './pages/VerifyEmailPage.jsx';
import ShopPage from './pages/ShopPage.jsx';
import CartPage from './pages/CartPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import RidePage   from './pages/ride/RidePage.jsx';
import DriverPage from './pages/ride/DriverPage.jsx';
import BotPage    from './pages/bot/BotPage.jsx';
import AgenticPage from './pages/agentic/AgenticPage.jsx';
import HotelsPage           from './pages/hotel/HotelsPage.jsx';
import HotelDetailPage      from './pages/hotel/HotelDetailPage.jsx';
import MyHotelBookingsPage  from './pages/hotel/MyHotelBookingsPage.jsx';
import CoursesPage          from './pages/learn/CoursesPage.jsx';
import CourseDetailPage     from './pages/learn/CourseDetailPage.jsx';
import LearnDashboardPage   from './pages/learn/LearnDashboardPage.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import AdminDashboard from './pages/admin/Dashboard.jsx';
import AdminProducts from './pages/admin/Products.jsx';
import AdminUsers from './pages/admin/Users.jsx';
import AdminRoles from './pages/admin/Roles.jsx';
import AdminMenus from './pages/admin/Menus.jsx';
import AdminPermissions from './pages/admin/Permissions.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import RequirePerm from './components/RequirePerm.jsx';
import useBootstrap from './hooks/useBootstrap.js';
import AwsDemoPage from './pages/AwsDemoPage.jsx';
import S3DemoPage from './pages/S3DemoPage.jsx';

export default function App() {
  const { ready } = useBootstrap();
  const { t } = useTranslation();
  if (!ready) return <div className="center">{t('common.loading')}</div>;

  return (
    <Routes>
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password"  element={<ResetPasswordPage />} />
      <Route path="/verify-email"    element={<VerifyEmailPage />} />
      <Route path="/account/password" element={<RequireAuth><ChangePasswordPage /></RequireAuth>} />

      <Route path="/"       element={<ShopPage />} />
      <Route path="/cart"   element={<RequireAuth><CartPage /></RequireAuth>} />
      <Route path="/orders" element={<RequireAuth><OrdersPage /></RequireAuth>} />
      <Route path="/chat"   element={<RequireAuth><RequirePerm need="chat:use"><ChatPage /></RequirePerm></RequireAuth>} />
      <Route path="/rides"  element={<RequireAuth><RequirePerm need="ride:use"><RidePage /></RequirePerm></RequireAuth>} />
      <Route path="/driver" element={<RequireAuth><RequirePerm need="ride:drive"><DriverPage /></RequirePerm></RequireAuth>} />
      <Route path="/bot"    element={<RequireAuth><RequirePerm need="bot:use"><BotPage /></RequirePerm></RequireAuth>} />
      <Route path="/agentic" element={<RequireAuth><RequirePerm need="agentic:read"><AgenticPage /></RequirePerm></RequireAuth>} />

      {/* Hotels — catalog + search are public; bookings need auth */}
      <Route path="/hotels"            element={<HotelsPage />} />
      <Route path="/hotels/mine"       element={<RequireAuth><MyHotelBookingsPage /></RequireAuth>} />
      <Route path="/hotels/:idOrSlug"  element={<HotelDetailPage />} />

      {/* Coding-school — catalog/course pages are public; dashboard needs auth */}
      <Route path="/learn"                 element={<CoursesPage />} />
      <Route path="/learn/courses/:slug"   element={<CourseDetailPage />} />
      <Route path="/learn/dashboard"       element={<RequireAuth><RequirePerm need="learn:enroll"><LearnDashboardPage /></RequirePerm></RequireAuth>} />

      <Route path="/admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
        <Route index element={<AdminDashboard />} />
        <Route path="products"    element={<RequirePerm need="product:read">  <AdminProducts /></RequirePerm>} />
        <Route path="users"       element={<RequirePerm need="user:read">     <AdminUsers /></RequirePerm>} />
        <Route path="roles"       element={<RequirePerm need="role:manage">   <AdminRoles /></RequirePerm>} />
        <Route path="menus"       element={<RequirePerm need="menu:manage">   <AdminMenus /></RequirePerm>} />
        <Route path="permissions" element={<RequirePerm need="role:manage">   <AdminPermissions /></RequirePerm>} />
      </Route>

      <Route path="/aws-demo" element={<AwsDemoPage />} />
      <Route path="/s3-demo" element={<S3DemoPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
