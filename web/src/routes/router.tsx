import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import Layout from '../components/layout/Layout';
import LocaleLayout from './LocaleLayout';

import ProtectedRoute from './ProtectedRoute';

const HomePage = lazy(() => import('../pages/HomePage'));
const CatalogPage = lazy(() => import('../pages/CatalogPage'));
const GalleryPage = lazy(() => import('../pages/GalleryPage'));
const GiveawayDetailPage = lazy(() => import('../pages/GiveawayDetailPage'));
const PaintingPage = lazy(() => import('../pages/PaintingPage'));
const AuthPage = lazy(() => import('../pages/AuthPage'));
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
const AdminSeriesPage = lazy(() => import('../pages/admin/AdminSeriesPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

export const router = createBrowserRouter([
  // The bare root has no language of its own — send it to the default.
  { path: '/', element: <Navigate to="/ua" replace /> },
  {
    path: '/:locale',
    element: <LocaleLayout />,
    children: [
      {
        // Pathless — Layout wraps every page in the site's chrome without
        // consuming a URL segment of its own; the locale already did.
        element: <Layout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'catalog', element: <CatalogPage /> },
          { path: 'gallery', element: <GalleryPage /> },
          { path: 'giveaways/:id', element: <GiveawayDetailPage /> },
          { path: 'painting/:id', element: <PaintingPage /> },
          // Both render the same split-screen page — see AuthPage — the
          // route just says which side leads.
          { path: 'login', element: <AuthPage /> },
          { path: 'register', element: <AuthPage /> },
          // Recovery shares the same scene — see AuthPage. Open to anyone:
          // somebody who can't sign in is exactly who needs these.
          { path: 'forgot-password', element: <AuthPage /> },
          { path: 'reset-password', element: <AuthPage /> },
          { path: 'cart', element: <CartPage /> },
          { path: 'orders', element: <OrdersPage /> },
          { path: 'support', element: <FaqPage /> },
          // Open to guests: someone with a question usually doesn't have an
          // account yet, and making them register first is making them leave.
          { path: 'support/chat', element: <SupportChatPage /> },
          {
            element: <ProtectedRoute />,
            children: [
              { path: 'profile', element: <ProfilePage /> },
              { path: 'favorites', element: <FavoritesPage /> },
            ],
          },
          {
            element: <ProtectedRoute adminOnly />,
            children: [
              { path: 'admin/dictionaries', element: <DictionariesPage /> },
              { path: 'admin/series', element: <AdminSeriesPage /> },
              { path: 'admin/users', element: <AdminUsersPage /> },
              { path: 'admin/orders', element: <AdminOrdersPage /> },
              { path: 'admin/settings', element: <AdminSettingsPage /> },
              { path: 'admin/support', element: <AdminSupportPage /> },
              { path: 'admin/giveaways', element: <AdminGiveawaysPage /> },
              { path: 'admin/mail', element: <AdminMailPage /> },
            ],
          },
          // A page that says so, rather than a silent bounce to the home
          // page — see NotFoundPage.
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
