"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Users, BookOpen, Activity, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalModules: 0,
        activeUsers: 0
    });

    useEffect(() => {
        // Mock stats for now, replace with API call later
        setStats({
            totalUsers: 12,
            totalModules: 5,
            activeUsers: 8
        });
    }, []);

    if (user?.role_id !== 1) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
                    <p className="text-slate-500">You do not have permission to view this page.</p>
                    <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">Return Home</Link>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen pb-32 pt-8 px-5 lg:max-w-4xl mx-auto transition-colors duration-300">
            {/* Header */}
            <header className="flex justify-between items-end mb-10 animate-fade-in-up">
                <div>
                    <p className="text-slate-400 text-lg font-medium tracking-wide mb-1 opacity-90">Welcome back</p>
                    <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-slate-400 text-glow tracking-tight">Admin</h1>
                    <p className="text-slate-400 mt-2">Manage users, courses, and system settings.</p>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <div className="glass-card p-6 rounded-3xl flex flex-col items-start gap-3 hover:bg-slate-800/60 transition-colors border border-transparent">
                    <div className="flex items-center justify-between w-full mb-2">
                        <div className="h-12 w-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/10">
                            <Users size={24} />
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 shadow-sm">+12%</span>
                    </div>
                    <h3 className="text-slate-400 text-sm font-medium tracking-wide">Total Users</h3>
                    <p className="text-4xl font-bold text-primary tracking-tight">{stats.totalUsers}</p>
                </div>

                <div className="glass-card p-6 rounded-3xl flex flex-col items-start gap-3 hover:bg-slate-800/60 transition-colors border border-transparent">
                    <div className="flex items-center justify-between w-full mb-2">
                        <div className="h-12 w-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shadow-lg shadow-purple-500/10">
                            <BookOpen size={24} />
                        </div>
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 shadow-sm">New</span>
                    </div>
                    <h3 className="text-slate-400 text-sm font-medium tracking-wide">Total Courses</h3>
                    <p className="text-4xl font-bold text-primary tracking-tight">{stats.totalModules}</p>
                </div>

                <div className="glass-card p-6 rounded-3xl flex flex-col items-start gap-3 hover:bg-slate-800/60 transition-colors border border-transparent">
                    <div className="flex items-center justify-between w-full mb-2">
                        <div className="h-12 w-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
                            <Activity size={24} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-300 bg-slate-700/50 px-2.5 py-1 rounded-lg border border-slate-600/50 shadow-sm">Now</span>
                    </div>
                    <h3 className="text-slate-400 text-sm font-medium tracking-wide">Active Users</h3>
                    <p className="text-4xl font-bold text-primary tracking-tight">{stats.activeUsers}</p>
                </div>
            </div>

            {/* Quick Actions */}
            <h2 className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-5 ml-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                <Link href="/admin/modules/new" className="group glass-card p-6 rounded-3xl flex items-center justify-between hover:bg-slate-800/60 transition-all duration-300 border border-transparent hover:border-slate-700/50 hover:shadow-xl hover:-translate-y-1">
                    <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-highlight text-white flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                            <Plus size={28} />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl text-primary group-hover:text-highlight transition-colors">Create Course</h3>
                            <p className="text-sm text-slate-400">Add video content & steps</p>
                        </div>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-500/20 group-hover:text-blue-300 transition-all">
                        <ArrowRight size={20} />
                    </div>
                </Link>

                <Link href="/admin/users" className="group glass-card p-6 rounded-3xl flex items-center justify-between hover:bg-slate-800/60 transition-all duration-300 border border-transparent hover:border-slate-700/50 hover:shadow-xl hover:-translate-y-1">
                    <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 text-slate-300 flex items-center justify-center shadow-lg shadow-black/20 group-hover:scale-110 transition-transform duration-300 border border-slate-600">
                            <Users size={28} />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl text-primary group-hover:text-highlight transition-colors">Manage Users</h3>
                            <p className="text-sm text-slate-400">Add users & assign roles</p>
                        </div>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-white/10 group-hover:text-white transition-all">
                        <ArrowRight size={20} />
                    </div>
                </Link>
            </div>

            {/* Courses List */}
            <h2 className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-5 ml-2 mt-12 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>Manage Courses</h2>
            <CoursesList />
        </main>
    );
}

function CoursesList() {
    const { token } = useAuth();
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const res = await fetch('http://localhost:8000/api/v1/modules', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setCourses(data);
                }
            } catch (error) {
                console.error('Error fetching courses:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, [token]);

    if (loading) {
        return <div className="text-slate-400">Loading courses...</div>;
    }

    if (courses.length === 0) {
        return (
            <div className="glass-card p-8 rounded-3xl text-center">
                <p className="text-slate-400">No courses created yet. Create your first course!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            {courses.map((course) => (
                <div key={course.id} className="glass-card p-6 rounded-3xl hover:bg-slate-800/60 transition-all border border-transparent hover:border-slate-700/50">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-primary mb-2">{course.title}</h3>
                            <p className="text-slate-400 text-sm mb-3">{course.description}</p>
                            <div className="flex items-center gap-4 text-xs">
                                {course.is_processing && (
                                    <span className="text-yellow-400 bg-yellow-500/10 px-3 py-1 rounded-lg border border-yellow-500/20">
                                        ⏳ Processing...
                                    </span>
                                )}
                                <span className="text-slate-500">{course.steps?.length || 0} modules</span>
                            </div>
                        </div>
                        <Link
                            href={`/admin/courses/${course.id}/edit`}
                            className="px-4 py-2 bg-primary hover:bg-highlight text-white rounded-xl font-medium transition-colors"
                        >
                            Edit Course
                        </Link>
                    </div>
                </div>
            ))}
        </div>
    );
}
