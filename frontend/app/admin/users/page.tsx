'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useRouter } from 'next/navigation';
import { AppShell } from '../../../components/AppShell';
import { apiClient } from '../../../lib/api';

interface DeveloperProfile {
  id: number;
  experience_years: number;
  availability_status: string;
  skills?: { id: number; skill_name: string; proficiency_level: number }[];
}

interface UserData {
  id: number;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'DEVELOPER';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  developer_profile?: DeveloperProfile | null;
}

interface UserSummaryResponse {
  total_users: number;
  active_users: number;
  inactive_users: number;
  admin_count: number;
  manager_count: number;
  developer_count: number;
  users: UserData[];
}

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'MANAGER' | 'DEVELOPER'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [copiedEmailId, setCopiedEmailId] = useState<number | null>(null);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'DEVELOPER' as 'ADMIN' | 'MANAGER' | 'DEVELOPER',
    experience_years: 3,
    availability_status: 'AVAILABLE',
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'DEVELOPER' as 'ADMIN' | 'MANAGER' | 'DEVELOPER',
    is_active: true,
  });
  const [editLoading, setEditLoading] = useState(false);

  // Reset Password Modal State
  const [resetUser, setResetUser] = useState<UserData | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Fetch Users
  const fetchUsers = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const data = await apiClient.get<UserSummaryResponse | UserData[]>('/users');
      if (Array.isArray(data)) {
        setUsers(data);
      } else if (data && Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        setUsers([]);
      }

      if (isManualRefresh) {
        showToast('User directory refreshed successfully.', 'info');
      }
    } catch (err: any) {
      const errMsg = err.message || 'Error loading users from server';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    fetchUsers();
  }, [currentUser]);

  // Generate strong random password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Copy email to clipboard
  const handleCopyEmail = (userItem: UserData) => {
    navigator.clipboard.writeText(userItem.email);
    setCopiedEmailId(userItem.id);
    showToast(`Copied ${userItem.email} to clipboard!`, 'info');
    setTimeout(() => setCopiedEmailId(null), 2000);
  };

  // Toggle user active status
  const handleToggleStatus = async (targetUser: UserData) => {
    if (currentUser && String(currentUser.id) === String(targetUser.id)) {
      showToast('Safety lock: You cannot deactivate your own active session account.', 'warning');
      return;
    }

    try {
      const newStatus = !targetUser.is_active;
      await apiClient.patch(`/users/${targetUser.id}/status`, { is_active: newStatus });

      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: newStatus } : u))
      );
      showToast(
        `User ${targetUser.name} is now ${newStatus ? 'ACTIVE' : 'DEACTIVATED'}.`,
        newStatus ? 'success' : 'warning'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle status', 'error');
    }
  };

  // Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreateLoading(true);
      const payload: any = {
        name: createForm.name.trim(),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        role: createForm.role,
        is_active: true,
      };

      if (createForm.role === 'DEVELOPER') {
        payload.experience_years = Number(createForm.experience_years) || 1;
        payload.availability_status = createForm.availability_status;
      }

      const res = await apiClient.post<UserData>('/users', payload);
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        role: 'DEVELOPER',
        experience_years: 3,
        availability_status: 'AVAILABLE',
      });
      showToast(`User ${res.name} successfully provisioned as ${res.role}!`, 'success');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to create user', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  // Edit User
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setEditLoading(true);
      const res = await apiClient.put<UserData>(`/users/${editingUser.id}`, editForm);
      setEditingUser(null);
      showToast(`User ${res.name} updated successfully.`, 'success');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to update user', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  // Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    try {
      setResetLoading(true);
      await apiClient.post(`/users/${resetUser.id}/reset-password`, {
        new_password: newPassword,
      });
      setResetUser(null);
      setNewPassword('');
      showToast(`Password for ${resetUser.name} has been reset successfully.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  // Filtered list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && u.is_active) ||
        (statusFilter === 'INACTIVE' && !u.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Metrics
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.is_active).length;
  const inactiveCount = users.filter((u) => !u.is_active).length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const managerCount = users.filter((u) => u.role === 'MANAGER').length;
  const devCount = users.filter((u) => u.role === 'DEVELOPER').length;
  const activePercentage = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 100;

  const hasActiveFilters = searchQuery !== '' || roleFilter !== 'ALL' || statusFilter !== 'ALL';

  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Modern Clean Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold tracking-wider uppercase bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                ADMIN CONSOLE
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {totalCount} Total Registered
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              User Management & Access Control
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Provision enterprise accounts, govern platform roles, and manage developer profiles.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchUsers(true)}
              disabled={refreshing}
              title="Refresh directory"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300 transition cursor-pointer disabled:opacity-50"
            >
              <svg
                className={`w-4 h-4 ${refreshing ? 'animate-spin text-purple-600' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

            <button
              onClick={() => {
                setCreateForm({
                  name: '',
                  email: '',
                  password: generateRandomPassword(),
                  role: 'DEVELOPER',
                  experience_years: 3,
                  availability_status: 'AVAILABLE',
                });
                setShowCreatePassword(true);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>Provision User</span>
            </button>
          </div>
        </div>

        {/* Global Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchUsers()}
              className="text-xs font-semibold px-3 py-1 bg-rose-200/60 dark:bg-rose-900/50 hover:bg-rose-300/60 rounded-lg transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* 4 Clean Balanced KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Accounts */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition hover:border-slate-300 dark:hover:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Accounts</span>
              <span className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-bold">
                👥
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white mt-2">
              {totalCount}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Registered platform users
            </p>
          </div>

          {/* Active Accounts */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition hover:border-slate-300 dark:hover:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Active Access</span>
              <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-bold">
                ⚡
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {activeCount}
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                {activePercentage}% Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {inactiveCount} deactivated {inactiveCount === 1 ? 'account' : 'accounts'}
            </p>
          </div>

          {/* Developers */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition hover:border-slate-300 dark:hover:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Developers</span>
              <span className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-bold">
                💻
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white mt-2">
              {devCount}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Engineers & capacity profiles
            </p>
          </div>

          {/* Admins & Managers */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition hover:border-slate-300 dark:hover:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">Governance & Leads</span>
              <span className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center text-sm font-bold">
                🛡️
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white mt-2">
              {adminCount + managerCount}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {adminCount} {adminCount === 1 ? 'Admin' : 'Admins'} · {managerCount} {managerCount === 1 ? 'Manager' : 'Managers'}
            </p>
          </div>
        </div>

        {/* Clean Filter & Search Toolbar */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <svg
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e: any) => setRoleFilter(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="DEVELOPER">Developers</option>
              <option value="MANAGER">Managers</option>
              <option value="ADMIN">Admins</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Deactivated</option>
            </select>

            {/* Clear Button */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl transition cursor-pointer whitespace-nowrap"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Results Count Line */}
        <div className="flex items-center justify-between text-xs px-1 text-slate-500 dark:text-slate-400">
          <div>
            Showing <span className="font-semibold text-slate-900 dark:text-white">{filteredUsers.length}</span> of{' '}
            <span className="font-semibold text-slate-900 dark:text-white">{totalCount}</span> accounts
          </div>
          {hasActiveFilters && (
            <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400">
              Active filters applied
            </span>
          )}
        </div>

        {/* Clean Users Table */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-purple-600/30 border-t-purple-600 rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Loading user directory...
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center space-y-3 px-4">
              <div className="text-3xl">🔍</div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No accounts found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                No users match your active search query or filter criteria.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50/75 dark:bg-slate-950/50 text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">User</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Capacity / Profile</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredUsers.map((u) => {
                    const isSelf = currentUser ? String(currentUser.id) === String(u.id) : false;

                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* User Identity & Email */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0 ${
                                u.role === 'ADMIN'
                                  ? 'bg-purple-600'
                                  : u.role === 'MANAGER'
                                  ? 'bg-sky-600'
                                  : 'bg-indigo-600'
                              }`}
                            >
                              {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-900 dark:text-white truncate">
                                  {u.name}
                                </span>
                                {isSelf && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                                  {u.email}
                                </span>
                                <button
                                  onClick={() => handleCopyEmail(u)}
                                  title="Copy email address"
                                  className="text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 text-xs transition cursor-pointer"
                                >
                                  {copiedEmailId === u.id ? (
                                    <span className="text-emerald-600 font-bold">✓</span>
                                  ) : (
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role & Badge */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                              u.role === 'ADMIN'
                                ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
                                : u.role === 'MANAGER'
                                ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60'
                                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60'
                            }`}
                          >
                            <span>{u.role === 'ADMIN' ? '🛡️' : u.role === 'MANAGER' ? '📊' : '💻'}</span>
                            <span>{u.role}</span>
                          </span>
                        </td>

                        {/* Capacity / Developer Profile */}
                        <td className="px-5 py-3.5">
                          {u.role === 'DEVELOPER' && u.developer_profile ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                  {u.developer_profile.experience_years} yrs exp
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.2 rounded-full border ${
                                    u.developer_profile.availability_status === 'AVAILABLE'
                                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                                      : u.developer_profile.availability_status === 'ASSIGNED'
                                      ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50'
                                      : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      u.developer_profile.availability_status === 'AVAILABLE'
                                        ? 'bg-emerald-500'
                                        : u.developer_profile.availability_status === 'ASSIGNED'
                                        ? 'bg-blue-500'
                                        : 'bg-amber-500'
                                    }`}
                                  />
                                  <span>{u.developer_profile.availability_status}</span>
                                </span>
                              </div>
                              {u.developer_profile.skills && u.developer_profile.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {u.developer_profile.skills.slice(0, 3).map((sk) => (
                                    <span
                                      key={sk.id}
                                      className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono"
                                    >
                                      {sk.skill_name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : u.role === 'DEVELOPER' ? (
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                              Pending Profile Setup
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Standard Access</span>
                          )}
                        </td>

                        {/* Status Toggle */}
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isSelf}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer border ${
                              u.is_active
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800/50'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
                            } ${isSelf ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={
                              isSelf
                                ? 'You cannot deactivate your own active session'
                                : u.is_active
                                ? 'Click to deactivate account'
                                : 'Click to activate account'
                            }
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            <span>{u.is_active ? 'Active' : 'Inactive'}</span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setEditForm({ name: u.name, role: u.role, is_active: u.is_active });
                              }}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-purple-600 dark:hover:text-purple-400 transition cursor-pointer flex items-center gap-1"
                              title="Edit user details"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => {
                                setResetUser(u);
                                setNewPassword(generateRandomPassword());
                                setShowResetPassword(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-amber-600 dark:hover:text-amber-400 transition cursor-pointer flex items-center gap-1"
                              title="Reset account password"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                              </svg>
                              <span>Reset Key</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PROVISION USER MODAL (Clean, Decluttered, Polished) */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Provision New User
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Create credentials and assign system roles with automated profile mapping.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                {/* Full Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name <span className="text-purple-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Morgan"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Work Email Address <span className="text-purple-600">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. alex@devalign.local"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition"
                    />
                  </div>
                </div>

                {/* Password & Generator */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Initial Password <span className="text-purple-600">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const generated = generateRandomPassword();
                        setCreateForm({ ...createForm, password: generated });
                        setShowCreatePassword(true);
                      }}
                      className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>🎲</span> Generate Random Key
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showCreatePassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Enter minimum 6 characters"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      className="w-full pl-3.5 pr-10 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                      title={showCreatePassword ? 'Hide password' : 'Show password'}
                    >
                      {showCreatePassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {/* Role Selection (Compact 3-Card Grid) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select System Role <span className="text-purple-600">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      {
                        role: 'DEVELOPER',
                        icon: '💻',
                        title: 'Developer',
                        desc: 'Tasks & Timer',
                      },
                      {
                        role: 'MANAGER',
                        icon: '📊',
                        title: 'Manager',
                        desc: 'Projects & Workload',
                      },
                      {
                        role: 'ADMIN',
                        icon: '🛡️',
                        title: 'Admin',
                        desc: 'Full Governance',
                      },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.role}
                        onClick={() => setCreateForm({ ...createForm, role: item.role as any })}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          createForm.role === item.role
                            ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/40'
                            : 'bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="text-base">{item.icon}</div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                          {item.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional Developer Profile Specs */}
                {createForm.role === 'DEVELOPER' && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                        <span>⚙️</span> Developer Profile Specs
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Experience: <span className="font-bold text-slate-900 dark:text-white">{createForm.experience_years} Years</span>
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={20}
                          value={createForm.experience_years}
                          onChange={(e) =>
                            setCreateForm({
                              ...createForm,
                              experience_years: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full accent-purple-600 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Availability Status
                        </label>
                        <select
                          value={createForm.availability_status}
                          onChange={(e) =>
                            setCreateForm({ ...createForm, availability_status: e.target.value })
                          }
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer"
                        >
                          <option value="AVAILABLE">AVAILABLE (Full capacity)</option>
                          <option value="ASSIGNED">ASSIGNED (In progress)</option>
                          <option value="BUSY">BUSY (High workload)</option>
                          <option value="UNAVAILABLE">UNAVAILABLE (Leave / Off)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-sm disabled:opacity-50 transition cursor-pointer"
                  >
                    {createLoading ? 'Provisioning...' : 'Provision User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT USER MODAL */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Edit User Profile
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {editingUser.email}
                  </p>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    System Role
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e: any) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer"
                  >
                    <option value="DEVELOPER">DEVELOPER (Workspace & Tasks)</option>
                    <option value="MANAGER">MANAGER (Projects & Assignments)</option>
                    <option value="ADMIN">ADMIN (Full Governance)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Access Status
                  </label>
                  <select
                    value={editForm.is_active ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) =>
                      setEditForm({ ...editForm, is_active: e.target.value === 'ACTIVE' })
                    }
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE (Authorized Login)</option>
                    <option value="INACTIVE">DEACTIVATED (Access Suspended)</option>
                  </select>
                </div>

                {currentUser && String(currentUser.id) === String(editingUser.id) && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300 font-medium">
                    ⚠️ You are editing your active account session. Maintain ACTIVE status to retain access.
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-sm disabled:opacity-50 transition cursor-pointer"
                  >
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* RESET PASSWORD MODAL */}
        {resetUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Reset User Password
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    For <span className="font-semibold text-slate-900 dark:text-white">{resetUser.name}</span> ({resetUser.email})
                  </p>
                </div>
                <button
                  onClick={() => setResetUser(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      New Secure Password <span className="text-purple-600">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setNewPassword(generateRandomPassword());
                        setShowResetPassword(true);
                      }}
                      className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>🎲</span> Generate Random Key
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Enter new password (min 6 chars)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                    >
                      {showResetPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300">
                  <span className="font-semibold">Security Note:</span> Password will be bcrypt hashed. The user will be required to authenticate with this new key on their next login.
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setResetUser(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-sm disabled:opacity-50 transition cursor-pointer"
                  >
                    {resetLoading ? 'Resetting...' : 'Confirm Reset'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
