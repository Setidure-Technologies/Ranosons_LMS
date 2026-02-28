"use client";

import React, { useState, useRef } from 'react';

interface Hotspot {
    x: number;
    y: number;
    radius: number;
    label: string;
}

interface HotspotQuizProps {
    imageSrc: string;
    targets: Hotspot[]; // The correct zones to tap
    onComplete: () => void;
}

const HotspotQuiz: React.FC<HotspotQuizProps> = ({ imageSrc, targets, onComplete }) => {
    const imageRef = useRef<HTMLImageElement>(null);
    const [feedback, setFeedback] = useState<{ x: number; y: number; status: 'correct' | 'wrong' } | null>(null);

    const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!imageRef.current) return;

        const rect = imageRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100; // Percentage
        const y = ((e.clientY - rect.top) / rect.height) * 100; // Percentage

        // Check collision with any target
        let hit = false;
        for (const target of targets) {
            const distance = Math.sqrt(Math.pow(x - target.x, 2) + Math.pow(y - target.y, 2));
            if (distance <= target.radius) {
                hit = true;
                break;
            }
        }

        setFeedback({ x, y, status: hit ? 'correct' : 'wrong' });

        if (hit) {
            setTimeout(() => {
                onComplete();
            }, 1000);
        }
    };

    return (
        <div className="relative w-full aspect-video bg-slate-800 rounded-lg overflow-hidden select-none" onClick={handleTap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imageRef} src={imageSrc} alt="Quiz Context" className="w-full h-full object-cover" />

            {feedback && (
                <div
                    className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 
            ${feedback.status === 'correct' ? 'border-green-500 bg-green-500/50' : 'border-red-500 bg-red-500/50'}
            animate-ping`}
                    style={{ left: `${feedback.x}%`, top: `${feedback.y}%` }}
                />
            )}

            {feedback && (
                <div
                    className={`absolute px-3 py-1 rounded text-white text-xs font-bold transform -translate-x-1/2 -translate-y-full mt-[-10px]
           ${feedback.status === 'correct' ? 'bg-green-600' : 'bg-red-600'}`}
                    style={{ left: `${feedback.x}%`, top: `${feedback.y}%` }}
                >
                    {feedback.status === 'correct' ? 'Correct!' : 'Try Again'}
                </div>
            )}
        </div>
    );
};

export default HotspotQuiz;
