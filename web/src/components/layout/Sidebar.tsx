'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore, useUIStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Flag, 
  PieChart, 
  Briefcase, 
  DownloadCloud,
  Users,
  Settings,
  ChevronLeft
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  if (!user) return null;

  const roleMenus = {
    field_agent: [
      { name: 'My Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
    team_leader: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Pending Approvals', href: '/approvals', icon: CheckSquare },
      { name: 'Flag Review', href: '/flags', icon: Flag },
    ],
    manager: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Pending Approvals', href: '/approvals', icon: CheckSquare },
      { name: 'Flag Review', href: '/flags', icon: Flag },
    ],
    managing_director: [
      { name: 'Executive Summary', href: '/executive-summary', icon: PieChart },
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Flag Review', href: '/flags', icon: Flag },
    ],
    accounts: [
      { name: 'Reconciliation Queue', href: '/accounts', icon: Briefcase },
      { name: 'Export Center', href: '/accounts/export', icon: DownloadCloud },
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ]
  };

  const baseItems = roleMenus[user.role] || [];
  const menuItems = [...baseItems];
  
  if (user.role === 'managing_director') {
    menuItems.push({ name: 'User Management', href: '/admin/users', icon: Users });
  }

  return (
    <div className={cn(
      "fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 flex flex-col",
      sidebarOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="flex h-16 shrink-0 items-center justify-between px-6 bg-slate-950">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center font-bold text-white">
            FA
          </div>
          <span className="font-semibold text-white tracking-tight">Fuel Autopilot</span>
        </div>
        <button className="lg:hidden text-slate-400 hover:text-white" onClick={toggleSidebar}>
          <ChevronLeft className="h-6 w-6" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-white" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className={cn("mr-3 h-5 w-5 shrink-0", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 bg-slate-950/50 mt-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white uppercase">
            {user.name.charAt(0)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-white truncate">{user.name}</span>
            <span className="text-xs text-slate-400 truncate">{user.email}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

