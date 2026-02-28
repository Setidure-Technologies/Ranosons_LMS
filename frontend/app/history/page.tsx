"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Clock, CheckCircle, XCircle, ArrowRight, Loader } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface QuizAttempt {
    id: number;
    module_id: number;
    module: {
        title: string;
    } | null;
    score: number;
    max_score: number;
    passed: boolean;
    created_at: string;
}

export default function HistoryPage() {
    const { token, user } = useAuth();
    const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!token) return;
            try {
                const res = await fetch('http://localhost:8000/api/v1/quiz/history', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setAttempts(data);
                }
            } catch (err) {
                console.error("Failed to load history:", err);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchHistory();
        }
    }, [token, user]);

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <Loader className="animate-spin text-blue-500" size={48} />
        </div>
    );

    return (
        <main className="min-h-screen pb-32 pt-8 px-5 lg:max-w-4xl mx-auto transition-colors duration-300">
            <header className="mb-10 animate-fade-in-up">
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-slate-400 text-glow tracking-tight mb-2">
                    Quiz History
                </h1>
                <p className="text-slate-500">Review your past assessments and track your progress.</p>
            </header>

            <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                {attempts.length === 0 ? (
                    <div className="text-center py-12 glass-panel rounded-3xl">
                        <Clock size={48} className="mx-auto text-slate-600 mb-4" />
                        <h3 className="text-xl font-semibold text-slate-400">No attempts yet</h3>
                        <p className="text-slate-500 mt-2">Complete a module quiz to see it here.</p>
                        <Link href="/learning" className="inline-block mt-6 px-6 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors">
                            Start Learning
                        </Link>
                    </div>
                ) : (
                    attempts.map((attempt) => (
                        <Link href={`/history/${attempt.id}`} key={attempt.id} className="block group">
                            <div className="glass-card p-6 rounded-3xl flex items-center justify-between hover:bg-white/5 transition-all border border-transparent hover:border-white/10">
                                <div className="flex items-center gap-4">
                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${attempt.passed ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                                        {attempt.passed ? <CheckCircle size={24} /> : <XCircle size={24} />}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                                            {attempt.module?.title || "Unknown Module"}
                                        </h3>
                                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Clock size={14} />
                                                {format(parseISO(attempt.created_at), 'MMM d, yyyy h:mm a')}
                                            </span>
                                            <span className="h-1 w-1 bg-slate-600 rounded-full"></span>
                                            <span className={attempt.passed ? "text-emerald-400" : "text-red-400"}>
                                                {attempt.passed ? "Passed" : "Failed"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-foreground">
                                            {((attempt.score / (attempt.max_score || 1)) * 100).toFixed(0)}%
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {attempt.score.toFixed(1)} / {attempt.max_score}
                                        </div>
                                    </div>
                                    <ArrowRight className="text-slate-600 group-hover:text-primary transition-colors" />
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </main>
    );
}
