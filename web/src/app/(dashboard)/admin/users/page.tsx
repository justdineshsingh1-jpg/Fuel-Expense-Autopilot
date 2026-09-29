'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ROLE_LABELS } from '@/lib/constants';
import { Plus, UserCog, MoreVertical, Edit, Trash, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const mockUsers = [
  { id: '1', name: 'Rahul Sharma', email: 'rahul.s@company.com', code: 'EMP101', role: 'team_leader', dept: 'Sales', status: 'active' },
  { id: '2', name: 'Priya Patel', email: 'priya.p@company.com', code: 'EMP842', role: 'manager', dept: 'Sales', status: 'active' },
  { id: '3', name: 'Amit Kumar', email: 'amit.k@company.com', code: 'EMP205', role: 'accounts', dept: 'Finance', status: 'active' },
  { id: '4', name: 'Vikram Singh', email: 'vikram.s@company.com', code: 'EMP001', role: 'managing_director', dept: 'Executive', status: 'active' },
  { id: '5', name: 'Neha Gupta', email: 'neha.g@company.com', code: 'EMP412', role: 'team_leader', dept: 'Operations', status: 'inactive' },
];

export default function UsersPage() {
  const [users, setUsers] = useState(mockUsers);

  const handleAddUser = () => {
    toast.success('Add user modal would open here.');
  };

  const handleToggleStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    setUsers(users.map(u => u.id === id ? { ...u, status: newStatus } : u));
    toast.success(`User status updated to ${newStatus}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">User Management</h2>
          <p className="text-gray-500">Manage employee access, roles, and reporting structures.</p>
        </div>
        <Button onClick={handleAddUser}>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.code}</td>
                  <td className="px-4 py-3 text-gray-600">{user.dept}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                      <UserCog className="h-3 w-3" />
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.status === 'active' ? 'approved' : 'draft'}>
                      {user.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit User">
                        <Edit className="h-4 w-4 text-gray-500" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0" 
                        onClick={() => handleToggleStatus(user.id, user.status)}
                        title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {user.status === 'active' ? (
                          <Trash className="h-4 w-4 text-red-500" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}


