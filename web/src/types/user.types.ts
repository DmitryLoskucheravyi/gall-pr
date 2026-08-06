export type AdminUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
};
