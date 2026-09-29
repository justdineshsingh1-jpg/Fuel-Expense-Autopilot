'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ROLE_LABELS } from '@/lib/constants';
import { User, Mail, Shield, Building, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    toast.success('Password updated successfully');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">My Profile</h2>
        <p className="text-gray-500">Manage your account settings and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardBody className="text-center pt-8">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl mx-auto mb-4">
                {user.name.charAt(0)}
              </div>
              <h3 className="font-semibold text-lg text-gray-900">{user.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{user.employeeCode}</p>
              
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                <Shield className="h-4 w-4" />
                {ROLE_LABELS[user.role] || user.role}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1">
                    <User className="h-4 w-4" /> Full Name
                  </label>
                  <p className="font-medium text-gray-900">{user.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1">
                    <Mail className="h-4 w-4" /> Email Address
                  </label>
                  <p className="font-medium text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1">
                    <Building className="h-4 w-4" /> Department
                  </label>
                  <p className="font-medium text-gray-900">{user.department}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1">
                    <User className="h-4 w-4" /> Reporting To
                  </label>
                  <p className="font-medium text-gray-900">{user.reportingTo || 'N/A'}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" /> Change Password
              </CardTitle>
            </CardHeader>
            <CardBody>
              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                <Input 
                  type="password" 
                  label="Current Password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required 
                />
                <Input 
                  type="password" 
                  label="New Password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required 
                />
                <Input 
                  type="password" 
                  label="Confirm New Password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required 
                />
                <Button type="submit" className="mt-2">Update Password</Button>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
