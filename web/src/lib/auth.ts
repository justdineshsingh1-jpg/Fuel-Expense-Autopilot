import { User, Role } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://fuel-expense-autopilot-1.onrender.com/api';

export const loginWithBackend = async (email: string, password: string):Promise<User> => {
  try {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!res.ok) {
      throw new Error('Invalid credentials');
    }

    const data = await res.json();
    
    return {
      id: data.user.id,
      name: data.user.full_name,
      email: data.user.email,
      employeeCode: data.user.employee_code,
      role: data.user.role as Role,
      department: data.user.department || 'Operations',
    };
  } catch (err) {
    console.error(err);
    console.log("Falling back to mock login");
    return mockLogin(email);
  }
}

export const mockLogin = async (email: string): Promise<User> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let role: Role = 'field_agent';
      if (email.includes('manager')) role = 'manager';
      if (email.includes('md') || email.includes('director') || email.includes('admin')) role = 'manager';
      if (email.includes('account')) role = 'accounts';
      if (email.includes('team') || email.includes('tl')) role = 'team_leader';

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

