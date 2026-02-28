'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Save, Loader, Trash2, Plus, AlertCircle } from 'lucide-react';

interface Module {
    id: number;
    title: string;
    description: string;
    video_url: string;
    objectives: string;
    applications: string;
    quiz_data: string;
    is_processing: boolean;
    steps: ModuleStep[];
}

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
}

export default function EditCoursePage({ params }: { params: { id: string } }) {
    const { token } = useAuth();
    const router = useRouter();
    const [module, setModule] = useState<Module | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [objectives, setObjectives] = useState('');
    const [applications, setApplications] = useState('');
    const [steps, setSteps] = useState<ModuleStep[]>([]);
    const [quiz, setQuiz] = useState<QuizQuestion[]>([]);

    useEffect(() => {
        fetchModule();
    }, [params.id]);

    const fetchModule = async () => {
        try {
            const res = await fetch(`http://localhost:8000/api/v1/modules/${params.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setModule(data);
                setTitle(data.title);
                setDescription(data.description || '');
                setObjectives(data.objectives || '');
                setApplications(data.applications || '');
                setSteps(data.steps || []);

                if (data.quiz_data) {
                    try {
                        const quizParsed = JSON.parse(data.quiz_data);
                        setQuiz(Array.isArray(quizParsed) ? quizParsed : quizParsed.questions || []);
                    } catch {
                        setQuiz([]);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching module:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                title,
                description,
                video_url: module?.video_url || '',
                objectives,
                applications,
                quiz_data: JSON.stringify(quiz),
                steps: steps.map((s, idx) => ({
                    title: s.title,
                    content: s.content,
                    media_url: s.media_url,
                    step_type: 'instruction',
                    order_index: idx + 1
                }))
            };

            const res = await fetch(`http://localhost:8000/api/v1/modules/${params.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('Course saved successfully!');
                router.push('/admin');
            } else {
                alert('Failed to save course.');
            }
        } catch (error) {
            console.error('Error saving course:', error);
            alert('Error saving course.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
            return;
        }

        try {
            const res = await fetch(`http://localhost:8000/api/v1/modules/${params.id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (res.ok) {
                alert('Course deleted successfully!');
                router.push('/admin');
            } else {
                alert('Failed to delete course.');
            }
        } catch (error) {
            console.error('Error deleting course:', error);
            alert('Error deleting course.');
        }
    };

    const handleAddQuestion = () => {
        const newQuestion: QuizQuestion = {
            question: 'New question',
            type: 'fill',
            options: [],
            correct_answer: '',
            explanation: 'Explanation here'
        };
        setQuiz([...quiz, newQuestion]);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader className="animate-spin text-blue-500" size={48} />
            </div>
        );
    }

    if (module?.is_processing) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
                    <Loader className="animate-spin text-blue-500 mx-auto mb-4" size={48} />
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Processing Course...</h2>
                    <p className="text-slate-600">AI is analyzing the video and generating modules. This may take a few minutes.</p>
                    <button
                        onClick={fetchModule}
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        Refresh Status
                    </button>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-5xl mx-auto">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Edit Course</h1>
                        <p className="text-slate-500">Review and refine AI-generated content</p>
                    </div>
                    <button
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors"
                    >
                        <Trash2 size={18} />
                        Delete Course
                    </button>
                </header>

                <div className="space-y-6">
                    {/* Basic Info */}
                    <section className="bg-white rounded-2xl shadow p-6">
                        <h2 className="text-xl font-bold mb-4 text-slate-900">Course Details</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700">Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg p-3 text-slate-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg p-3 h-24 text-slate-900"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Objectives */}
                    <section className="bg-white rounded-2xl shadow p-6">
                        <h2 className="text-xl font-bold mb-2 text-slate-900">Learning Objectives</h2>
                        <p className="text-sm text-slate-500 mb-4">AI-generated objectives (Markdown format)</p>
                        <textarea
                            value={objectives}
                            onChange={(e) => setObjectives(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-3 h-32 font-mono text-sm text-slate-900"
                            placeholder="## Objectives&#10;- Objective 1&#10;- Objective 2"
                        />
                    </section>

                    {/* Applications */}
                    <section className="bg-white rounded-2xl shadow p-6">
                        <h2 className="text-xl font-bold mb-2 text-slate-900">Practical Applications</h2>
                        <p className="text-sm text-slate-500 mb-4">AI-generated applications (Markdown format)</p>
                        <textarea
                            value={applications}
                            onChange={(e) => setApplications(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-3 h-32 font-mono text-sm text-slate-900"
                            placeholder="## Applications&#10;- Application 1&#10;- Application 2"
                        />
                    </section>

                    {/* Modules/Steps */}
                    <section className="bg-white rounded-2xl shadow p-6">
                        <h2 className="text-xl font-bold mb-2 text-slate-900">Course Modules</h2>
                        <p className="text-sm text-slate-500 mb-4">{steps.length} AI-generated modules</p>
                        {steps.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                No modules generated yet. The AI is still processing the video.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {steps.map((step, idx) => (
                                    <div key={idx} className="border border-slate-300 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-semibold text-slate-900">Module {idx + 1}</span>
                                            <button
                                                onClick={() => setSteps(steps.filter((_, i) => i !== idx))}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={step.title}
                                            onChange={(e) => {
                                                const newSteps = [...steps];
                                                newSteps[idx].title = e.target.value;
                                                setSteps(newSteps);
                                            }}
                                            className="w-full border border-slate-300 rounded p-2 mb-2 text-slate-900"
                                            placeholder="Module Title"
                                        />
                                        <textarea
                                            value={step.content}
                                            onChange={(e) => {
                                                const newSteps = [...steps];
                                                newSteps[idx].content = e.target.value;
                                                setSteps(newSteps);
                                            }}
                                            className="w-full border border-slate-300 rounded p-2 h-24 font-mono text-sm text-slate-900"
                                            placeholder="Module content (Markdown)"
                                        />
                                        {step.media_url && (
                                            <p className="text-xs text-slate-500 mt-2">Video: {step.media_url}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Quiz */}
                    <section className="bg-white rounded-2xl shadow p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold text-slate-900">Final Assessment Quiz</h2>
                            <button
                                onClick={handleAddQuestion}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                            >
                                <Plus size={18} />
                                Add Question
                            </button>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">{quiz.length} questions</p>
                        {quiz.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                No quiz questions generated yet.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {quiz.map((q, idx) => (
                                    <div key={idx} className="border border-slate-300 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-semibold text-slate-900">Question {idx + 1}</span>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={q.type || 'mcq'}
                                                    onChange={(e) => {
                                                        const newQuiz = [...quiz];
                                                        newQuiz[idx].type = e.target.value as 'mcq' | 'fill' | 'numerical';
                                                        // Reset question structure based on type
                                                        if (e.target.value === 'fill') {
                                                            newQuiz[idx].options = [];
                                                        } else if (e.target.value === 'numerical') {
                                                            newQuiz[idx].options = [];
                                                            newQuiz[idx].tolerance = 0;
                                                        } else {
                                                            newQuiz[idx].options = (q.options?.length || 0) > 0 ? q.options : ['A) Option 1', 'B) Option 2', 'C) Option 3', 'D) Option 4'];
                                                        }
                                                        setQuiz(newQuiz);
                                                    }}
                                                    className="text-xs border border-slate-300 rounded px-2 py-1 text-slate-700"
                                                >
                                                    <option value="mcq">MCQ</option>
                                                    <option value="fill">Fill in Blank</option>
                                                    <option value="numerical">Numerical</option>
                                                </select>
                                                <button
                                                    onClick={() => setQuiz(quiz.filter((_, i) => i !== idx))}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Question Text */}
                                        <input
                                            type="text"
                                            value={q.question}
                                            onChange={(e) => {
                                                const newQuiz = [...quiz];
                                                newQuiz[idx].question = e.target.value;
                                                setQuiz(newQuiz);
                                            }}
                                            className="w-full border border-slate-300 rounded p-2 mb-2 text-slate-900"
                                            placeholder="Question"
                                        />

                                        {/* MCQ Options */}
                                        {(!q.type || q.type === 'mcq') && (
                                            <div className="space-y-2 mb-2">
                                                <label className="text-xs font-medium text-slate-600">Options:</label>
                                                {(q.options || []).map((opt, optIdx) => (
                                                    <div key={optIdx} className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={opt}
                                                            onChange={(e) => {
                                                                const newQuiz = [...quiz];
                                                                const currentOptions = newQuiz[idx].options || [];
                                                                currentOptions[optIdx] = e.target.value;
                                                                newQuiz[idx].options = currentOptions;
                                                                setQuiz(newQuiz);
                                                            }}
                                                            className="flex-1 border border-slate-300 rounded p-2 text-sm text-slate-900"
                                                            placeholder={`Option ${optIdx + 1}`}
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const newQuiz = [...quiz];
                                                                const currentOptions = newQuiz[idx].options || [];
                                                                newQuiz[idx].options = currentOptions.filter((_, i) => i !== optIdx);
                                                                setQuiz(newQuiz);
                                                            }}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => {
                                                        const newQuiz = [...quiz];
                                                        if (!newQuiz[idx].options) newQuiz[idx].options = [];
                                                        newQuiz[idx].options.push(`${String.fromCharCode(65 + newQuiz[idx].options.length)}) New option`);
                                                        setQuiz(newQuiz);
                                                    }}
                                                    className="text-blue-600 text-sm hover:text-blue-700"
                                                >
                                                    + Add Option
                                                </button>
                                            </div>
                                        )}

                                        {/* Correct Answer */}
                                        <div className="mb-2">
                                            <label className="text-xs font-medium text-slate-600">Correct Answer:</label>
                                            {(!q.type || q.type === 'mcq') ? (
                                                <select
                                                    value={q.correct_answer}
                                                    onChange={(e) => {
                                                        const newQuiz = [...quiz];
                                                        newQuiz[idx].correct_answer = e.target.value;
                                                        setQuiz(newQuiz);
                                                    }}
                                                    className="w-full border border-slate-300 rounded p-2 text-slate-900"
                                                >
                                                    {(q.options || []).map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={q.correct_answer}
                                                    onChange={(e) => {
                                                        const newQuiz = [...quiz];
                                                        newQuiz[idx].correct_answer = e.target.value;
                                                        setQuiz(newQuiz);
                                                    }}
                                                    className="w-full border border-slate-300 rounded p-2 text-slate-900"
                                                    placeholder={q.type === 'numerical' ? "Numerical answer" : "Correct answer"}
                                                />
                                            )}
                                        </div>

                                        {/* Tolerance for Numerical Questions */}
                                        {q.type === 'numerical' && (
                                            <div className="mb-2">
                                                <label className="text-xs font-medium text-slate-600">Acceptable Range (±):</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={q.tolerance || 0}
                                                    onChange={(e) => {
                                                        const newQuiz = [...quiz];
                                                        newQuiz[idx].tolerance = parseFloat(e.target.value);
                                                        setQuiz(newQuiz);
                                                    }}
                                                    className="w-full border border-slate-300 rounded p-2 text-slate-900"
                                                    placeholder="e.g., 0.5 for ±0.5"
                                                />
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Acceptable range: {parseFloat(q.correct_answer) - (q.tolerance || 0)} to {parseFloat(q.correct_answer) + (q.tolerance || 0)}
                                                </p>
                                            </div>
                                        )}

                                        {/* Explanation */}
                                        <div>
                                            <label className="text-xs font-medium text-slate-600">Explanation:</label>
                                            <textarea
                                                value={q.explanation}
                                                onChange={(e) => {
                                                    const newQuiz = [...quiz];
                                                    newQuiz[idx].explanation = e.target.value;
                                                    setQuiz(newQuiz);
                                                }}
                                                className="w-full border border-slate-300 rounded p-2 text-slate-900 h-20"
                                                placeholder="Explanation for this answer"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Save Button */}
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => router.push('/admin')}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-8 py-3 rounded-xl font-bold"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
                            {saving ? 'Saving...' : 'Save Course'}
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}