'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ROLE_LABELS } from '@/lib/constants';
import { Plus, UserCog, Edit, Trash, X, AlertTriangle, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

export default function UsersPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  
  const [users, setUsers] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserCode, setNewUserCode] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('field_agent');
  const [newUserDept, setNewUserDept] = useState('Sales');

  useEffect(() => {
    fetchUsers();
  }, []);

  
  const handleResetPassword = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to reset the password for ${userName}? It will be reset to: password123`)) return;
    
    const promise = fetch('/api/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, new_password: 'password123' })
    }).then(async (res) => {
      if (!res.ok) throw new Error('Failed to reset');
      return res.json();
    });

    toast.promise(promise, {
      loading: 'Resetting password...',
      success: 'Password reset to: password123',
      error: 'Failed to reset password'
    });
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch(e) {}
  };

  if (user?.role !== 'managing_director') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <AlertTriangle className="h-16 w-16 text-yellow-500" />
        <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
        <p className="text-gray-500">Only the Managing Director can access the Master Control Panel.</p>
        <Button onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
      </div>
    );
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    toast.loading("Creating user...");
    
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newUserName,
          email: newUserEmail,
          employee_code: newUserCode,
          password: newUserPassword,
          role: newUserRole,
          department: newUserDept
        })
      });

      if (!res.ok) throw new Error("Failed to create user");
      
      await fetchUsers();
      toast.dismiss();
      toast.success('Agent created successfully!');
      setShowAddModal(false);
      setNewUserName(''); setNewUserEmail(''); setNewUserCode(''); setNewUserPassword('');
    } catch (err) {
      toast.dismiss();
      toast.error('Error creating user');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (u: any) => {
    setEditingUser(u);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsLoading(true);
    toast.loading("Updating agent...");
    
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser)
      });

      if (!res.ok) throw new Error("Failed to update user");
      
      await fetchUsers();
      toast.dismiss();
      toast.success('Agent updated successfully!');
      setShowEditModal(false);
      setEditingUser(null);
    } catch (err) {
      toast.dismiss();
      toast.error('Error updating user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    toast.error('Delete disabled in this demo');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserCog className="h-7 w-7 text-primary" /> Master Agent Control
          </h1>
          <p className="text-gray-500">Manage all field agents, managers, and access permissions.</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
          <Plus className="h-5 w-5" /> Add New Agent
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Role / Dept</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-500">No agents found in database. Add one to start testing!</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{u.full_name}</div>
                    <div className="text-xs text-gray-500">{u.employee_code}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <Badge variant={
                      u.role === 'managing_director' ? 'rejected' :
                      u.role === 'team_leader' ? 'pending' :
                      u.role === 'accounts' ? 'approved' : 'default'
                    }>
                      {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role}
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1">{u.department}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={u.is_active ? 'approved' : 'draft'}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    
                      <button onClick={() => handleResetPassword(u.id, u.full_name)} className="text-orange-500 hover:text-orange-700 p-2 inline-flex items-center gap-1 font-bold text-xs bg-orange-50 rounded-md border border-orange-200 mr-2" title="Reset Password to password123">
                        <Key className="h-4 w-4" /> Reset Pwd
                      </button>
                      <button onClick={() => openEditModal(u)} className="text-blue-600 hover:text-blue-800 p-2"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:text-red-700 p-2"><Trash className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Onboard New Agent</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white"><X className="h-6 w-6" /></button>
            </div>
            
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                  <input type="text" required value={newUserName} onChange={e => setNewUserName(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="Rahul Sharma" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Employee Code</label>
                  <input type="text" required value={newUserCode} onChange={e => setNewUserCode(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="EMP123" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                <input type="email" required value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="agent@company.com" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Initial Password</label>
                <input type="text" required value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="Assign a secure password" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">System Role</label>
                  <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                    <option value="field_agent">Field Agent</option>
                    <option value="team_leader">Team Leader</option>
                    <option value="accounts">Accounts</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Department</label>
                  <select value={newUserDept} onChange={e => setNewUserDept(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                    <option value="Sales">Sales</option>
                    <option value="Operations">Operations</option>
                    <option value="Service">Service</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Create Agent Account'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Edit Agent Profile</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white"><X className="h-6 w-6" /></button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                  <input type="text" required value={editingUser.full_name || ''} onChange={e => setEditingUser({...editingUser, full_name: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Employee Code</label>
                  <input type="text" required value={editingUser.employee_code || ''} onChange={e => setEditingUser({...editingUser, employee_code: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                <input type="email" required value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                  <select value={editingUser.role || ''} onChange={e => setEditingUser({...editingUser, role: e.target.value})} className="w-full border rounded-lg px-3 py-2 bg-white">
                    <option value="field_agent">Field Agent</option>
                    <option value="team_leader">Team Leader</option>
                    <option value="manager">Manager</option>
                    <option value="managing_director">Managing Director</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Department</label>
                  <select value={editingUser.department || ''} onChange={e => setEditingUser({...editingUser, department: e.target.value})} className="w-full border rounded-lg px-3 py-2 bg-white">
                    <option value="Sales">Sales</option>
                    <option value="Operations">Operations</option>
                    <option value="Service">Service</option>
                    <option value="Executive">Executive</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Update Agent'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
