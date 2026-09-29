import { User } from './types';

// Mock auth for frontend development without a real backend
export const mockLogin = async (email: string): Promise<User> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let role: User['role'] = 'team_leader';
      if (email.includes('manager')) role = 'manager';
      if (email.includes('md') || email.includes('director')) role = 'managing_director';
      if (email.includes('account')) role = 'accounts';

      resolve({
        id: `usr_${Math.random().toString(36).substr(2, 9)}`,
        name: email.split('@')[0].replace('.', ' ').toUpperCase(),
        email,
        employeeCode: `EMP${Math.floor(Math.random() * 1000)}`,
        role,
        department: 'Operations',
      });
    }, 1000);
  });
};
