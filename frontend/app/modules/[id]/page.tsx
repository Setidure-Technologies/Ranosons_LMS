"use client";

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle, Play, Loader } from 'lucide-react';

// ... interfaces ...

interface ModuleStep {
    id: number;
    title: string;
    content: string;
    media_url: string;
    order_index: number;
}

interface QuizQuestion {
    question: string;
    type?: 'mcq' | 'fill' | 'numerical';
    options?: string[];
    correct_answer: string;
    tolerance?: number;
    explanation: string;
    module_index?: number;
}


export default function ModulePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const { token } = useAuth();
    const [module, setModule] = useState<any>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const [showQuiz, setShowQuiz] = useState(false);
    const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: string }>({});
    const [quizResults, setQuizResults] = useState<{ [key: number]: boolean }>({});
    const [quizScores, setQuizScores] = useState<{ [key: number]: number }>({});
    const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [timerActive, setTimerActive] = useState(false);

    useEffect(() => {
        const stepParam = searchParams.get('step');
        if (stepParam) {
            const stepIndex = parseInt(stepParam, 10);
            if (!isNaN(stepIndex)) {
                setCurrentStepIndex(stepIndex);
            }
        }
    }, [searchParams]);

    useEffect(() => {
        const fetchModuleData = async () => {
            if (!params.id || !token) return;
            try {
                const res = await fetch(`http://localhost:8000/api/v1/modules/${params.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setModule(data);

                    // Utility function to shuffle array
                    const shuffleArray = <T,>(array: T[]): T[] => {
                        const shuffled = [...array];
                        for (let i = shuffled.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                        }
                        return shuffled;
                    };

                    // Parse quiz
                    if (data.quiz_data) {
                        try {
                            const parsed = JSON.parse(data.quiz_data);
                            let questions = Array.isArray(parsed) ? parsed : [];

                            // Randomize questions
                            questions = shuffleArray(questions);

                            // Randomize MCQ options, preserving module_index from backend
                            questions = questions.map((q) => {
                                // Keep the module_index from the backend (which module this question came from)
                                if (q.type === 'mcq' && q.options) {
                                    const shuffledOptions = shuffleArray(q.options);
                                    return { ...q, options: shuffledOptions };
                                }
                                return q;
                            });

                            setQuiz(questions);

                            // Calculate quiz time: 1 min per MCQ, 5 min per other
                            const mcqCount = questions.filter((q: QuizQuestion) => !q.type || q.type === 'mcq').length;
                            const otherCount = questions.length - mcqCount;
                            const totalSeconds = (mcqCount * 60) + (otherCount * 300);
                            setTimeRemaining(totalSeconds);
                        } catch {
                            setQuiz([]);
                        }
                    }
                } else {
                    console.error("Failed to load module");
                }
            } catch (err) {
                console.error("Error loading module:", err);
            }
        };
        fetchModuleData();
    }, [params.id, token]);

    const handleStepComplete = () => {
        if (!completedSteps.includes(currentStepIndex)) {
            setCompletedSteps([...completedSteps, currentStepIndex]);
        }

        if (currentStepIndex < (module?.steps?.length || 0) - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        } else {
            // All steps completed, show quiz
            if (quiz.length > 0) {
                setShowQuiz(true);
                setTimerActive(true); // Start timer when quiz begins
            }
        }
    };

    // Timer countdown effect
    useEffect(() => {
        if (timerActive && timeRemaining > 0 && Object.keys(quizResults).length === 0) {
            const timer = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        handleQuizSubmit(); // Auto-submit when time runs out
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [timerActive, timeRemaining, quizResults]);

    const handleQuizSubmit = async () => {
        const results: { [key: number]: boolean } = {};
        const scores: { [key: number]: number } = {};
        const attemptData: any[] = [];

        quiz.forEach((q, idx) => {
            const userAnswer = quizAnswers[idx];
            const correctAnswer = q.correct_answer;
            let isCorrect = false;
            let score = 0;

            if (q.type === 'numerical' && q.tolerance !== undefined) {
                // Numerical question with tolerance
                const userNum = parseFloat(userAnswer);
                const correctNum = parseFloat(correctAnswer);
                const tolerance = q.tolerance || 0;

                if (isNaN(userNum)) {
                    isCorrect = false;
                    score = 0;
                } else {
                    const difference = Math.abs(userNum - correctNum);
                    if (difference > tolerance) {
                        // Outside acceptable range
                        isCorrect = false;
                        score = 0;
                    } else if (difference === 0) {
                        // Exact answer
                        isCorrect = true;
                        score = 1;
                    } else {
                        // Partial credit based on how close
                        isCorrect = true; // Technically correct (within tolerance)
                        const partialScore = 1 - (difference / tolerance) * 0.5; // 50-100% based on distance
                        score = Math.max(0.5, partialScore);
                    }
                }
            } else if (q.type === 'mcq') {
                // MCQ - exact match
                isCorrect = userAnswer === correctAnswer;
                score = isCorrect ? 1 : 0;
            } else {
                // Fill-in-the-blank - case-insensitive match
                isCorrect = userAnswer?.trim().toLowerCase() === correctAnswer?.trim().toLowerCase();
                score = isCorrect ? 1 : 0;
            }

            results[idx] = isCorrect;
            scores[idx] = score;

            // Prepare question data for history
            attemptData.push({
                question_text: q.question,
                user_answer: userAnswer || "",
                correct_answer: correctAnswer,
                is_correct: isCorrect,
                module_link: (q.module_index !== undefined && module.steps && module.steps[q.module_index]) ? `/modules/${params.id}?step=${q.module_index}` : null,
                explanation: q.explanation
            });
        });

        setQuizResults(results);
        setQuizScores(scores);

        // Save to backend
        const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
        const maxScore = quiz.length;
        const passed = maxScore > 0 ? (totalScore / maxScore) >= 0.7 : false; // 70% pass rate

        try {
            await fetch('http://localhost:8000/api/v1/quiz/attempts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    module_id: Number(params.id),
                    score: totalScore,
                    max_score: maxScore,
                    passed: passed,
                    attempt_data: JSON.stringify(attemptData)
                })
            });
            console.log("Quiz attempt saved");
        } catch (err) {
            console.error("Failed to save quiz attempt:", err);
        }
    };

    if (!module) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <Loader className="animate-spin text-blue-500" size={48} />
        </div>
    );

    const currentStep = module.steps?.[currentStepIndex];

    if (showQuiz) {
        const totalScore = Object.values(quizScores).reduce((sum, score) => sum + score, 0);
        const maxScore = quiz.length;
        const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
        const submitted = Object.keys(quizResults).length > 0;

        // Format time remaining
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        const timeWarning = timeRemaining < 120; // Less than 2 minutes

        return (
            <main className="min-h-screen pb-32 pt-8 px-5 lg:max-w-4xl mx-auto transition-colors duration-300">
                <div className="max-w-3xl mx-auto">
                    <header className="mb-8 text-center">
                        <h1 className="text-3xl font-bold text-foreground mb-2">Final Assessment</h1>
                        {!submitted && (
                            <div className={`text-2xl font-bold mb-2 ${timeWarning ? 'text-red-500 animate-pulse' : 'text-primary'}`}>
                                ⏱️ Time Remaining: {timeString}
                            </div>
                        )}
                        {submitted && (
                            <p className="text-xl text-primary">
                                Score: {totalScore.toFixed(1)}/{maxScore} ({percentage}%)
                            </p>
                        )}
                    </header>

                    <div className="space-y-6">
                        {quiz.map((q, idx) => (
                            <div key={idx} className="glass-card p-6 rounded-3xl border border-transparent shadow-sm">
                                <h3 className="text-lg font-semibold text-foreground mb-4">
                                    {idx + 1}. {q.question}
                                </h3>

                                {/* MCQ */}
                                {(!q.type || q.type === 'mcq') && (
                                    <div className="space-y-2">
                                        {(q.options || []).map((opt) => (
                                            <label
                                                key={opt}
                                                className={`block p-3 rounded-lg border cursor-pointer transition-colors ${quizAnswers[idx] === opt
                                                    ? submitted
                                                        ? quizResults[idx]
                                                            ? 'bg-emerald-500/10 border-emerald-500'
                                                            : 'bg-red-500/10 border-red-500'
                                                        : 'bg-primary/10 border-primary'
                                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                                                    } ${submitted ? 'cursor-not-allowed' : ''}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`q-${idx}`}
                                                    value={opt}
                                                    checked={quizAnswers[idx] === opt}
                                                    onChange={(e) => setQuizAnswers({ ...quizAnswers, [idx]: e.target.value })}
                                                    disabled={submitted}
                                                    className="mr-3 accent-primary"
                                                />
                                                <span className="text-foreground">{opt.replace(/^[A-Z]\)\s*/, '')}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {/* Fill-in-blank or Numerical */}
                                {(q.type === 'fill' || q.type === 'numerical') && (
                                    <input
                                        type="text"
                                        value={quizAnswers[idx] || ''}
                                        onChange={(e) => setQuizAnswers({ ...quizAnswers, [idx]: e.target.value })}
                                        disabled={submitted}
                                        placeholder={q.type === 'numerical' ? "Enter numerical answer" : "Type your answer here"}
                                        className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-lg p-3 text-foreground dark:text-white ${submitted
                                            ? quizResults[idx]
                                                ? 'border-emerald-500'
                                                : 'border-red-500'
                                            : 'border-slate-200 dark:border-slate-700'
                                            } ${submitted ? 'cursor-not-allowed' : ''}`}
                                    />
                                )}


                                {/* Feedback section - NO correct answers shown */}
                                {submitted && !quizResults[idx] && (
                                    <div className="mt-4 space-y-3">
                                        <p className="text-sm font-semibold text-red-400">❌ Incorrect</p>
                                        {/* Video link for review - PROMINENT */}
                                        {q.module_index !== undefined && module.steps && module.steps[q.module_index] && (
                                            <button
                                                onClick={() => {
                                                    setShowQuiz(false);
                                                    setCurrentStepIndex(q.module_index || 0);
                                                }}
                                                className="w-full bg-primary/10 hover:bg-primary/20 border-2 border-primary text-primary px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                                            >
                                                📺 Review Module: {module.steps[q.module_index].title}
                                            </button>
                                        )}
                                    </div>
                                )}
                                {submitted && quizResults[idx] && (
                                    <p className="mt-3 text-sm font-semibold text-green-400">✓ Correct!</p>
                                )}
                                {submitted && q.type === 'numerical' && quizScores[idx] > 0 && quizScores[idx] < 1 && (
                                    <p className="mt-3 text-sm text-yellow-400">
                                        Partial credit: {(quizScores[idx] * 100).toFixed(0)}% (within acceptable range)
                                    </p>
                                )}
                                {/* Explanation HIDDEN - not shown to maintain quiz integrity */}
                            </div>
                        ))}
                    </div>

                    {!submitted && (
                        <button
                            onClick={handleQuizSubmit}
                            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold"
                        >
                            Submit Quiz
                        </button>
                    )}
                </div>
            </main >
        );
    }

    return (
        <main className="min-h-screen pb-32 pt-8 px-5 lg:max-w-4xl mx-auto transition-colors duration-300">
            <div className="max-w-7xl mx-auto">
                <header className="mb-6">
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-foreground mb-2">{module.title}</h1>
                            <p className="text-slate-500">{module.description}</p>
                        </div>
                        <button
                            onClick={handleStepComplete}
                            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/30 ml-4"
                        >
                            {currentStepIndex < (module.steps?.length || 0) - 1 ? (
                                <>
                                    <Play size={20} /> Next Module
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={20} />
                                    {quiz.length > 0 ? 'Start Quiz' : 'Complete Course'}
                                </>
                            )}
                        </button>
                    </div>

                    {module.objectives && (
                        <div className="mt-4 bg-red-500/10 dark:bg-red-900/20 rounded-xl p-4 border border-red-500/20">
                            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-3">Objectives</h3>
                            <div className="prose prose-sm max-w-none text-foreground dark:text-slate-300">
                                <ReactMarkdown>{module.objectives}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                </header>

                {/* Progress */}
                <div className="mb-6 flex gap-2">
                    {module.steps?.map((step: ModuleStep, idx: number) => (
                        <div
                            key={idx}
                            className={`flex-1 h-2 rounded-full ${completedSteps.includes(idx) ? 'bg-emerald-500' :
                                idx === currentStepIndex ? 'bg-primary' :
                                    'bg-slate-200 dark:bg-slate-700'
                                }`}
                        />
                    ))}
                </div>

                {currentStep && (
                    <div className="space-y-6">
                        {/* Video Player */}
                        <div className="bg-black rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl">
                            {currentStep.media_url ? (
                                <video
                                    key={currentStep.media_url}
                                    controls
                                    className="w-full"
                                    src={currentStep.media_url}
                                />
                            ) : (
                                <div className="aspect-video flex items-center justify-center text-slate-500">
                                    No video available
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        {/* Content */}
                        <div className="bg-[#80ed99]/20 dark:bg-[#80ed99]/10 p-6 rounded-3xl border border-[#80ed99]/30 backdrop-blur-sm">
                            <h2 className="text-2xl font-bold text-foreground mb-4">{currentStep.title}</h2>
                            <div className="prose prose-sm max-w-none mb-6 text-foreground dark:text-slate-300">
                                <ReactMarkdown>{currentStep.content}</ReactMarkdown>
                            </div>

                            <button
                                onClick={handleStepComplete}
                                className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-all"
                            >
                                {currentStepIndex < (module.steps?.length || 0) - 1 ? (
                                    <>
                                        <Play size={20} /> Next Module
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={20} />
                                        {quiz.length > 0 ? 'Start Quiz' : 'Complete Course'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
