import { createBrowserRouter } from 'react-router-dom';

import Layout from '../components/layout/Layout';
import ProtectedRoute from './ProtectedRoute';
import HomePage from '../pages/HomePage';
import CatalogPage from '../pages/CatalogPage';
import GalleryPage from '../pages/GalleryPage';
import GiveawaysPage from '../pages/GiveawaysPage';
import GiveawayDetailPage from '../pages/GiveawayDetailPage';
import PaintingPage from '../pages/PaintingPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import CartPage from '../pages/CartPage';
import OrdersPage from '../pages/OrdersPage';
import ProfilePage from '../pages/ProfilePage';
import FavoritesPage from '../pages/FavoritesPage';
import SupportChatPage from '../pages/SupportChatPage';
import DictionariesPage from '../pages/admin/DictionariesPage';
import AdminOrdersPage from '../pages/admin/AdminOrdersPage';
import AdminSettingsPage from '../pages/admin/AdminSettingsPage';
import AdminSupportPage from '../pages/admin/AdminSupportPage';
import AdminGiveawaysPage from '../pages/admin/AdminGiveawaysPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'catalog', element: <CatalogPage /> },
      { path: 'gallery', element: <GalleryPage /> },
      { path: 'giveaways', element: <GiveawaysPage /> },
      { path: 'giveaways/:id', element: <GiveawayDetailPage /> },
      { path: 'painting/:id', element: <PaintingPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'cart', element: <CartPage /> },
          { path: 'orders', element: <OrdersPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'favorites', element: <FavoritesPage /> },
          { path: 'support', element: <SupportChatPage /> },
        ],
      },
      {
        element: <ProtectedRoute adminOnly />,
        children: [
          { path: 'admin/dictionaries', element: <DictionariesPage /> },
          { path: 'admin/orders', element: <AdminOrdersPage /> },
          { path: 'admin/settings', element: <AdminSettingsPage /> },
          { path: 'admin/support', element: <AdminSupportPage /> },
          { path: 'admin/giveaways', element: <AdminGiveawaysPage /> },
        ],
      },
    ],
  },
]);
