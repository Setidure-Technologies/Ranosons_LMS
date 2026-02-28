"use client";

import React, { useState, useEffect } from 'react';
import { User, LogOut, X, Phone, Briefcase } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface UserProfileProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function UserProfile({ isOpen, onClose }: UserProfileProps) {
    const { user, logout } = useAuth();

    // Close on escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    useEffect(() => {
        // No local user fetching needed; AuthContext handles it
    }, [isOpen, user]);

    const handleLogout = () => {
        logout();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 dark:bg-black/60 backdrop-blur-md animate-fade-in-up">
            {/* Click outside to close */}
            <div className="absolute inset-0" onClick={onClose}></div>

            <div className="glass-panel w-full max-w-sm mx-4 rounded-3xl p-6 relative shadow-2xl border border-white/10 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

                <div className="flex justify-between items-start mb-6 relative z-10">
                    <h2 className="text-xl font-bold text-foreground tracking-tight">Profile</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-foreground p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-col items-center mb-8 relative z-10">
                    <div className="w-24 h-24 rounded-full p-[2px] bg-gradient-to-br from-primary to-highlight mb-4 shadow-[0_0_20px_var(--primary)]">
                        <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden relative">
                            {/* Dynamic Initials */}
                            <span className="text-2xl font-bold text-primary">
                                {user?.employee_code ? user.employee_code.substring(0, 2).toUpperCase() : '??'}
                            </span>
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground text-glow">{user?.employee_code || 'Guest'}</h2>
                    <div className="flex items-center gap-2 mt-2 bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                        <Briefcase size={12} className="text-primary" />
                        <p className="text-primary text-xs font-medium tracking-wide">
                            {user?.role_id === 1 ? 'Admin' : 'CNC Operator'}
                        </p>
                    </div>
                </div>

                <div className="space-y-4 relative z-10">
                    {/* HIDDEN CONTACT INFO BOX
                    <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 p-4 rounded-xl backdrop-blur-sm">
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2 block">Contact Info</label>
                        ...
                    </div>
                    */}

                    <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent my-6" />

                    <button
                        onClick={handleLogout}
                        className="w-full group bg-transparent hover:bg-red-500/10 text-slate-500 hover:text-red-500 font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-200 dark:border-slate-800 hover:border-red-500/20"
                    >
                        <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
                        Log Out
                    </button>
                </div>
            </div>
        </div>
    );
}
