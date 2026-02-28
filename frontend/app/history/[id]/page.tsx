"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle, XCircle, ArrowLeft, Loader, Play } from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';

interface QuizQuestionResult {
    question_text: string;
    user_answer: string;
    correct_answer: string;
    is_correct: boolean;
    module_link: string | null;
    explanation: string | null;
}

interface QuizAttempt {
    id: number;
    module_id: number;
    module: {
        title: string;
    } | null;
    score: number;
    max_score: number;
    passed: boolean;
    attempt_data: string; // JSON string
    created_at: string;
}

export default function HistoryDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { token, user } = useAuth();
    const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
    const [questions, setQuestions] = useState<QuizQuestionResult[]>([]);
    const [moduleDetails, setModuleDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAttemptAndModule = async () => {
            if (!params.id || !token) return;
            try {
                // Fetch Attempt
                const res = await fetch(`http://localhost:8000/api/v1/quiz/history/${params.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setAttempt(data);
                    try {
                        const parsedData = JSON.parse(data.attempt_data);
                        setQuestions(parsedData);
                    } catch (e) {
                        console.error("Failed to parse attempt data", e);
                    }

                    // Fetch Module details to get step titles
                    if (data.module?.id) {
                        try {
                            const modRes = await fetch(`http://localhost:8000/api/v1/modules/${data.module.id}`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            if (modRes.ok) {
                                const modData = await modRes.json();
                                setModuleDetails(modData);
                            }
                        } catch (err) {
                            console.error("Failed to fetch module details", err);
                        }
                    }
                } else {
                    console.error("Failed to load attempt");
                }
            } catch (err) {
                console.error("Error loading attempt:", err);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchAttemptAndModule();
        }
    }, [params.id, token, user]);

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <Loader className="animate-spin text-blue-500" size={48} />
        </div>
    );

    if (!attempt) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <h1 className="text-2xl font-bold text-white mb-4">Attempt not found</h1>
            <Link href="/history" className="text-primary hover:underline">
                Back to History
            </Link>
        </div>
    );

    return (
        <main className="min-h-screen pb-32 pt-8 px-5 lg:max-w-4xl mx-auto transition-colors duration-300">
            <div className="mb-6">
                <Link href="/history" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-6 group">
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    Back to History
                </Link>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">
                            {attempt.module?.title || "Unknown Module"}
                        </h1>
                        <p className="text-slate-500 flex items-center gap-2">
                            Attempted on {format(parseISO(attempt.created_at), 'MMMM d, yyyy h:mm a')}
                        </p>
                    </div>
                </div>

                {/* Enhanced Result Card */}
                <div className="glass-panel p-8 rounded-3xl mb-8 relative overflow-hidden group">
                    {/* Background Animation */}
                    <div className={`absolute -inset-1 opacity-20 blur-3xl rounded-full ${attempt.passed ? 'bg-gradient-to-r from-emerald-400 to-cyan-300' : 'bg-gradient-to-r from-red-400 to-orange-300'} animate-pulse`} />

                    <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 z-10">
                        {/* Score & Icon */}
                        <div className="flex items-center gap-6">
                            <div className={`h-24 w-24 rounded-full flex items-center justify-center text-5xl shadow-2xl animate-bounce border-4 ${attempt.passed ? 'bg-emerald-100 border-emerald-500' : 'bg-red-100 border-red-500'}`}>
                                {(() => {
                                    const percentage = (attempt.score / (attempt.max_score || 1)) * 100;
                                    if (percentage >= 90) return "🌟"; // Star
                                    if (percentage >= 80) return "🤩"; // Star-struck
                                    if (percentage >= 70) return "😎"; // Cool/Happy
                                    if (percentage >= 50) return "🙂"; // Slight smile
                                    if (percentage >= 30) return "🤔"; // Thinking
                                    return "🥺"; // Pleading face
                                })()}
                            </div>
                            <div>
                                <div className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-1">
                                    Total Score
                                </div>
                                <div className={`text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r ${attempt.passed ? 'from-emerald-500 to-teal-400' : 'from-red-500 to-pink-500'}`}>
                                    {((attempt.score / (attempt.max_score || 1)) * 100).toFixed(0)}%
                                </div>
                                <div className="text-slate-400 text-sm font-medium mt-1">
                                    {attempt.score.toFixed(1)} / {attempt.max_score} Correct
                                </div>
                            </div>
                        </div>

                        {/* Motivational Quote */}
                        <div className="text-center md:text-right max-w-sm">
                            <div className={`text-2xl font-bold mb-2 ${attempt.passed ? 'text-emerald-500' : 'text-red-500'}`}>
                                {(() => {
                                    const percentage = (attempt.score / (attempt.max_score || 1)) * 100;
                                    if (percentage >= 90) return "Outstanding!";
                                    if (percentage >= 80) return "Excellent Work!";
                                    if (percentage >= 70) return "Good Job!";
                                    if (percentage >= 50) return "Nice Effort!";
                                    return "Don't Give Up!";
                                })()}
                            </div>
                            <p className="text-slate-500 italic text-lg">
                                "{(() => {
                                    const percentage = (attempt.score / (attempt.max_score || 1)) * 100;
                                    if (percentage >= 90) return "Shaabash! Keep it up! 🚀";
                                    if (percentage >= 80) return "Bahut badhiya! You are a star! ⭐";
                                    if (percentage >= 70) return "Keep learning, keep growing! 🌱";
                                    if (percentage >= 50) return "Koshish karne walon ki kabhi haar nahi hoti! 💪";
                                    if (percentage >= 30) return "Girti hai shehsawar hi maidan-e-jang mein! Try again! 🐎";
                                    return "Haar mat maano! You can do better! 🔥";
                                })()}"
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {questions.map((q, idx) => (
                    <div key={idx} className={`glass-card p-6 rounded-3xl border ${q.is_correct ? 'border-transparent' : 'border-red-500/30 bg-red-500/5'}`}>
                        <div className="flex items-start gap-4 mb-4">
                            <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${q.is_correct ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                                {q.is_correct ? <CheckCircle size={18} /> : <XCircle size={18} />}
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">
                                {idx + 1}. {q.question_text}
                            </h3>
                        </div>

                        <div className="ml-12 space-y-4">
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-slate-800 border border-slate-700"> {/* Dark Box */}
                                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Your Answer</div>
                                    <div className={`font-medium ${q.is_correct ? 'text-emerald-400' : 'text-red-300'}`}>
                                        {q.user_answer ? q.user_answer.replace(/^[A-Z]\)\s*/, '') : <span className="italic opacity-50">No answer</span>}
                                    </div>
                                </div>
                                {/* Correct answer hidden as per request */}
                            </div>

                            {q.explanation && (
                                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm"> {/* Light Box */}
                                    <span className="font-bold text-blue-900 block mb-1">Explanation:</span>
                                    <span className="text-slate-900">{q.explanation}</span>
                                </div>
                            )}

                            {!q.is_correct && q.module_link && (
                                <Link href={q.module_link} className="w-full bg-primary/10 hover:bg-primary/20 border-2 border-primary text-primary px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 mt-4">
                                    <Play size={16} />
                                    {(() => {
                                        // Try to extract step index from link
                                        const match = q.module_link?.match(/step=(\d+)/);
                                        if (match && moduleDetails && moduleDetails.steps) {
                                            const stepIndex = parseInt(match[1], 10);
                                            const stepTitle = moduleDetails.steps[stepIndex]?.title;
                                            if (stepTitle) return `Review Module: ${stepTitle}`;
                                        }
                                        return "Review Related Module Step";
                                    })()}
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}
