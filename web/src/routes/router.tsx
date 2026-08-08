import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import Layout from '../components/layout/Layout';
import ProtectedRoute from './ProtectedRoute';

const HomePage = lazy(() => import('../pages/HomePage'));
const CatalogPage = lazy(() => import('../pages/CatalogPage'));
const GalleryPage = lazy(() => import('../pages/GalleryPage'));
const GiveawayDetailPage = lazy(() => import('../pages/GiveawayDetailPage'));
const PaintingPage = lazy(() => import('../pages/PaintingPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const RegisterPage = lazy(() => import('../pages/RegisterPage'));
const CartPage = lazy(() => import('../pages/CartPage'));
const OrdersPage = lazy(() => import('../pages/OrdersPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const FavoritesPage = lazy(() => import('../pages/FavoritesPage'));
const FaqPage = lazy(() => import('../pages/FaqPage'));
const SupportChatPage = lazy(() => import('../pages/SupportChatPage'));
const DictionariesPage = lazy(() => import('../pages/admin/DictionariesPage'));
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage'));
const AdminOrdersPage = lazy(() => import('../pages/admin/AdminOrdersPage'));
const AdminSettingsPage = lazy(() => import('../pages/admin/AdminSettingsPage'));
const AdminSupportPage = lazy(() => import('../pages/admin/AdminSupportPage'));
const AdminGiveawaysPage = lazy(() => import('../pages/admin/AdminGiveawaysPage'));
const AdminMailPage = lazy(() => import('../pages/admin/AdminMailPage'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'catalog', element: <CatalogPage /> },
      { path: 'gallery', element: <GalleryPage /> },
      { path: 'giveaways/:id', element: <GiveawayDetailPage /> },
      { path: 'painting/:id', element: <PaintingPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'support', element: <FaqPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'profile', element: <ProfilePage /> },
          { path: 'favorites', element: <FavoritesPage /> },
          { path: 'support/chat', element: <SupportChatPage /> },
        ],
      },
      {
        element: <ProtectedRoute adminOnly />,
        children: [
          { path: 'admin/dictionaries', element: <DictionariesPage /> },
          { path: 'admin/users', element: <AdminUsersPage /> },
          { path: 'admin/orders', element: <AdminOrdersPage /> },
          { path: 'admin/settings', element: <AdminSettingsPage /> },
          { path: 'admin/support', element: <AdminSupportPage /> },
          { path: 'admin/giveaways', element: <AdminGiveawaysPage /> },
          { path: 'admin/mail', element: <AdminMailPage /> },
        ],
      },
    ],
  },
]);
