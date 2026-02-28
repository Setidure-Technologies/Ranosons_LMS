"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { User, Plus, Search, Shield, Trash2, BookOpen, X, Check } from 'lucide-react';

interface UserData {
    id: number;
    employee_code: string;
    role_id: number;
    is_active: boolean;
}

export default function UserManagement() {
    const { token } = useAuth();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form State
    const [newEmployeeCode, setNewEmployeeCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newRoleId, setNewRoleId] = useState(3); // Default to Operator (ID 3)

    // Assignment State
    const [modules, setModules] = useState<any[]>([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);

    // Role State
    const [roles, setRoles] = useState<any[]>([]);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [newRoleName, setNewRoleName] = useState("");

    useEffect(() => {
        fetchUsers();
        fetchModules();
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
            const res = await fetch(`${apiUrl}/roles`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRoles(data);
                // Set default role if not set
                if (data.length > 0 && !newRoleId) {
                    setNewRoleId(data[data.length - 1].id);
                }
            }
        } catch (error) {
            console.error("Failed to fetch roles", error);
        }
    };

    const fetchUsers = async () => {
        try {
            // In a real app, this would be a dedicated endpoint
            // For MVP, we might need to add this endpoint or mock it if not available
            // Let's assume GET /api/v1/users exists for admins
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
            const res = await fetch(`${apiUrl}/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchModules = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
            const res = await fetch(`${apiUrl}/modules`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setModules(data);
            }
        } catch (error) {
            console.error("Failed to fetch modules", error);
        }
    };

    const handleAssignModule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId || !selectedModuleId) return;

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
            const res = await fetch(`${apiUrl}/assignments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_id: selectedUserId,
                    module_id: selectedModuleId
                })
            });

            if (res.ok) {
                setShowAssignModal(false);
                setSelectedUserId(null);
                setSelectedModuleId(null);
                alert("Module Assigned Successfully!");
            } else {
                alert("Failed to assign module.");
            }
        } catch (error) {
            console.error("Assignment error", error);
        }
    };

    const openAssignModal = (userId: number) => {
        setSelectedUserId(userId);
        setShowAssignModal(true);
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
            const res = await fetch(`${apiUrl}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    employee_code: newEmployeeCode,
                    password: newPassword,
                    role_id: newRoleId
                })
            });

            if (res.ok) {
                setShowAddModal(false);
                setNewEmployeeCode("");
                setNewPassword("");
                fetchUsers();
                alert("User created successfully!");
            } else {
                const errorData = await res.json();
                alert(errorData.detail || "Failed to create user");
            }
        } catch (error) {
            console.error("Error creating user", error);
            alert("An error occurred while creating user.");
        }
    };

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
            const res = await fetch(`${apiUrl}/roles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newRoleName,
                    permissions: ""
                })
            });

            if (res.ok) {
                setShowRoleModal(false);
                setNewRoleName("");
                fetchRoles();
                alert("Role created successfully!");
            } else {
                const errorData = await res.json();
                alert(errorData.detail || "Failed to create role");
            }
        } catch (error) {
            console.error("Error creating role", error);
            alert("An error occurred while creating role.");
        }
    };

    return (
        <main className="min-h-screen pb-32 pt-8 px-5 lg:max-w-4xl mx-auto transition-colors duration-300">
            <header className="mb-8 flex justify-between items-end animate-fade-in-up">
                <div>
                    <Link href="/admin" className="text-slate-500 hover:text-primary mb-2 inline-flex items-center gap-1 text-sm transition-colors">
                        &larr; Back to Dashboard
                    </Link>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-slate-400 text-glow tracking-tight">User Management</h1>
                    <p className="text-slate-500 mt-1">Add and manage system users.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowRoleModal(true)}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg border border-white/5"
                    >
                        <Shield size={20} /> Add Role
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 active:scale-95 border border-blue-500/50"
                    >
                        <Plus size={20} /> Add User
                    </button>
                </div>
            </header>

            {/* Search Bar */}
            <div className="glass-panel p-4 rounded-2xl mb-6 flex items-center gap-3 border border-white/10 shadow-lg animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <Search className="text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Search users..."
                    className="flex-1 bg-transparent outline-none text-foreground placeholder:text-slate-400"
                />
            </div>

            {/* Users List */}
            <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5">
                        <tr>
                            <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                            <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                            <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-5">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-inner border border-slate-300 dark:border-slate-600">
                                            <User size={20} />
                                        </div>
                                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">{user.employee_code}</span>
                                    </div>
                                </td>
                                <td className="p-5">
                                    <div className="flex items-center gap-2">
                                        <Shield size={16} className={user.role_id === 1 ? "text-amber-500" : "text-primary"} />
                                        <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                                            {user.role_id === 1 ? 'Admin' : user.role_id === 2 ? 'Quality Check' : 'Operator'}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-5">
                                    <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${user.is_active
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                        {user.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="p-5 text-right">
                                    <button
                                        onClick={() => openAssignModal(user.id)}
                                        className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all mr-2"
                                        title="Assign Module"
                                    >
                                        <BookOpen size={18} />
                                    </button>
                                    <button className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {users.length === 0 && !loading && (
                    <div className="p-12 text-center text-slate-500 italic">No users found.</div>
                )}
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Add New User</h2>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Employee Code</label>
                                <input
                                    type="text"
                                    value={newEmployeeCode}
                                    onChange={(e) => setNewEmployeeCode(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors text-slate-900"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors text-slate-900"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                <select
                                    value={newRoleId}
                                    onChange={(e) => setNewRoleId(Number(e.target.value))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors text-slate-900"
                                >
                                    {roles.map(role => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 bg-slate-100 text-slate-600 font-medium py-3 rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 text-white font-medium py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                                >
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Module Modal */}
            {
                showAssignModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-slate-900">Assign Training Module</h2>
                                <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleAssignModule} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Module</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors text-slate-900"
                                        onChange={(e) => setSelectedModuleId(Number(e.target.value))}
                                        value={selectedModuleId || ""}
                                        required
                                    >
                                        <option value="" disabled>Select a module...</option>
                                        {modules.map(m => (
                                            <option key={m.id} value={m.id}>{m.title}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowAssignModal(false)}
                                        className="flex-1 bg-slate-100 text-slate-600 font-medium py-3 rounded-xl hover:bg-slate-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-blue-600 text-white font-medium py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex justify-center items-center gap-2"
                                    >
                                        <Check size={18} /> Assign
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Add Role Modal */}
            {showRoleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-900">Add New Role</h2>
                            <button onClick={() => setShowRoleModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateRole} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Role Name</label>
                                <input
                                    type="text"
                                    value={newRoleName}
                                    onChange={(e) => setNewRoleName(e.target.value)}
                                    placeholder="e.g. Supervisor, Auditor"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors text-slate-900"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowRoleModal(false)}
                                    className="flex-1 bg-slate-100 text-slate-600 font-medium py-3 rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-slate-900 text-white font-medium py-3 rounded-xl hover:bg-slate-800 transition-colors shadow-lg"
                                >
                                    Create Role
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main >
    );
}
