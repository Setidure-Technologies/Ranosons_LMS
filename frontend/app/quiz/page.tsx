"use client";

import React from 'react';
import HotspotQuiz from '@/components/HotspotQuiz';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function QuizPage() {
    const router = useRouter();

    const handleComplete = () => {
        alert("Assessment Passed! Redirecting to Dashboard...");
        router.push('/');
    };

    const targets = [
        { x: 50, y: 50, radius: 10, label: 'Emergency Stop' } // Center of image
    ];

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 p-4">
            <header className="mb-6 flex items-center gap-4">
                <Link href="/" className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-xl font-bold">Safety Assessment: Emergency Stop</h1>
            </header>

            <div className="max-w-4xl mx-auto">
                <p className="mb-4 text-slate-400">
                    Identify the <span className="text-orange-500 font-bold">Emergency Stop Button</span> on the panel below.
                </p>

                <div className="border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
                    {/* Using a placeholder image that looks industrial */}
                    <HotspotQuiz
                        imageSrc="https://placehold.co/800x450/2d3748/a0aec0?text=Machine+Panel+(Tap+Center)"
                        targets={targets}
                        onComplete={handleComplete}
                    />
                </div>
            </div>
        </main>
    );
}
