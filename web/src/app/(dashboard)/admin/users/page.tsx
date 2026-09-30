'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ROLE_LABELS } from '@/lib/constants';
import { Plus, UserCog, Edit, Trash, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

const mockUsers = [
  { id: '1', name: 'Rahul Sharma', email: 'rahul.s@company.com', code: 'EMP101', role: 'team_leader', dept: 'Sales', status: 'active' },
  { id: '2', name: 'Priya Patel', email: 'priya.p@company.com', code: 'EMP842', role: 'manager', dept: 'Sales', status: 'active' },
  { id: '3', name: 'Amit Kumar', email: 'amit.k@company.com', code: 'EMP205', role: 'accounts', dept: 'Finance', status: 'active' },
  { id: '4', name: 'Vikram Singh', email: 'vikram.s@company.com', code: 'EMP001', role: 'managing_director', dept: 'Executive', status: 'active' },
  { id: '5', name: 'Neha Gupta', email: 'neha.g@company.com', code: 'EMP412', role: 'team_leader', dept: 'Operations', status: 'inactive' },
];

export default function UsersPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  
  const [users, setUsers] = useState(mockUsers);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserCode, setNewUserCode] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('field_agent');
  const [newUserDept, setNewUserDept] = useState('Sales');

  // STRICT ADMIN CHECK
  if (user?.role !== 'managing_director') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <AlertTriangle className="h-16 w-16 text-red-500" />
        <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-gray-500 max-w-md">Only the Master Admin is authorized to add, update, or delete users.</p>
        <Button onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
      </div>
    );
  }

  const handleDeleteUser = (id: string, name: string) => {
    if (confirm(`Are you absolutely sure you want to completely delete ${name}? This action cannot be undone.`)) {
      setUsers(users.filter(u => u.id !== id));
      toast.success(`${name} has been deleted.`);
    }
  };

  const handleOpenEdit = (targetUser: any) => {
    setEditingId(targetUser.id);
    setNewUserName(targetUser.name);
    setNewUserEmail(targetUser.email);
    setNewUserCode(targetUser.code);
    setNewUserPassword(''); // blank for security unless they want to change it
    setNewUserRole(targetUser.role);
    setNewUserDept(targetUser.dept);
    setShowAddModal(true);
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserCode('');
    setNewUserPassword('');
    setNewUserRole('field_agent');
    setNewUserDept('Sales');
    setShowAddModal(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if(!newUserName || !newUserEmail) {
        toast.error("Please fill all required fields");
        return;
    }
    
    if (editingId) {
      // UPDATE EXISTING
      setUsers(users.map(u => u.id === editingId ? {
        ...u,
        name: newUserName,
        email: newUserEmail,
        code: newUserCode,
        role: newUserRole,
        dept: newUserDept
      } : u));
      toast.success(`${newUserName} updated successfully!`);
    } else {
      // ADD NEW
      if (!newUserPassword) {
        toast.error("Password is required for new users");
        return;
      }
      const newUser = {
          id: Math.random().toString(),
          name: newUserName,
          email: newUserEmail,
          code: newUserCode || `EMP${Math.floor(Math.random() * 900) + 100}`,
          role: newUserRole,
          dept: newUserDept,
          status: 'active'
      };
      setUsers([newUser, ...users]);
      toast.success(`${newUserName} added successfully! They can now log in.`);
    }
    
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">User Management</h2>
          <p className="text-gray-500">Manage employee access, roles, and reporting structures.</p>
        </div>
        <Button onClick={handleOpenAdd}>
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
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.code}</td>
                  <td className="px-4 py-3 text-gray-600">{u.dept}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                      <UserCog className="h-3 w-3" />
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.status === 'active' ? 'approved' : 'draft'}>
                      {u.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleOpenEdit(u)} title="Edit User">
                        <Edit className="h-4 w-4 text-gray-500" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600" 
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        title="Delete User"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">{editingId ? 'Edit User' : 'Add New User'}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
                        <input type="text" required value={newUserName} onChange={e => setNewUserName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="e.g. Rahul Sharma" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Employee Code</label>
                        <input type="text" value={newUserCode} onChange={e => setNewUserCode(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="e.g. FLD005" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address *</label>
                    <input type="email" required value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="name@company.com" />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{editingId ? 'Change Password (Leave blank to keep current)' : 'Set Password *'}</label>
                    <input type="text" required={!editingId} value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Type a secure password" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Role / Access Level *</label>
                        <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                            <option value="field_agent">Field Agent</option>
                            <option value="team_leader">Team Leader</option>
                            <option value="manager">Manager</option>
                            <option value="accounts">Accounts / Finance</option>
                            <option value="managing_director">Master Admin</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Department</label>
                        <select value={newUserDept} onChange={e => setNewUserDept(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                            <option value="Sales">Sales</option>
                            <option value="Operations">Operations</option>
                            <option value="Service">Service</option>
                            <option value="Finance">Finance</option>
                            <option value="Executive">Executive</option>
                        </select>
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t mt-6">
                    <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                    <Button type="submit">{editingId ? 'Save Changes' : 'Create User'}</Button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
