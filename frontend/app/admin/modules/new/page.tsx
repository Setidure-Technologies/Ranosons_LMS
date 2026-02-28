"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Plus, Trash2, Save, Video, List, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CreateCourse() {
    const { token } = useAuth();
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [uploading, setUploading] = useState(false);
    const [steps, setSteps] = useState<any[]>([]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('http://localhost:8000/api/v1/upload/video', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setVideoUrl(data.url);
            } else {
                alert("Upload failed");
            }
        } catch (error) {
            console.error("Error uploading video", error);
            alert("Error uploading video");
        } finally {
            setUploading(false);
        }
    };

    const addStep = () => {
        setSteps([...steps, {
            title: "",
            content: "",
            step_type: "instruction",
            order_index: steps.length + 1,
            assignment: null
        }]);
    };

    const updateStep = (index: number, field: string, value: any) => {
        const newSteps = [...steps];
        newSteps[index][field] = value;
        setSteps(newSteps);
    };

    const removeStep = (index: number) => {
        const newSteps = steps.filter((_, i) => i !== index);
        // Reorder
        newSteps.forEach((step, i) => step.order_index = i + 1);
        setSteps(newSteps);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Submitting with token:", token);
        try {
            const payload = {
                title,
                description,
                video_url: videoUrl,
                steps: steps
            };

            const res = await fetch('http://localhost:8000/api/v1/modules', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                router.push('/admin');
            } else if (res.status === 401) {
                alert("Session expired. Please log in again.");
                router.push('/login');
            } else {
                alert("Failed to create course");
            }
        } catch (error) {
            console.error("Error creating course", error);
        }
    };

    return (
        <main className="min-h-screen bg-slate-50 p-6 pb-24">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Create New Course</h1>
                <p className="text-slate-500">Design a training course with video and interactive steps.</p>
            </header>

            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
                {/* Basic Info */}
                <section className="bg-white p-6 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Video className="text-blue-500" /> Course Details
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Course Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors text-black"
                                placeholder="e.g. Spring Manufacturing Basics"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors h-24 resize-none text-black"
                                placeholder="Brief overview of the course..."
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Video Source</label>
                            <div className="space-y-3">
                                <div className="flex gap-4 items-center">
                                    <label className={`flex-1 cursor-pointer bg-slate-50 border border-slate-200 border-dashed rounded-xl p-4 text-center hover:bg-slate-100 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <input
                                            type="file"
                                            accept="video/mp4,video/webm"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                            disabled={uploading}
                                        />
                                        <div className="flex flex-col items-center gap-2 text-slate-500">
                                            {uploading ? (
                                                <span className="text-sm font-medium animate-pulse">Uploading Video...</span>
                                            ) : (
                                                <>
                                                    <Video size={24} className="text-blue-500" />
                                                    <span className="text-sm">Click to upload video (MP4)</span>
                                                </>
                                            )}
                                        </div>
                                    </label>
                                    <div className="text-slate-400 text-sm font-medium">OR</div>
                                    <input
                                        type="url"
                                        value={videoUrl}
                                        onChange={(e) => setVideoUrl(e.target.value)}
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors text-black"
                                        placeholder="Paste direct URL..."
                                    />
                                </div>
                                {videoUrl && (
                                    <div className="text-xs text-green-600 font-medium flex items-center gap-1 bg-green-50 p-2 rounded-lg border border-green-100">
                                        <CheckCircle size={14} />
                                        <span className="truncate">Selected: {videoUrl}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Steps Builder */}
                <section className="bg-white p-6 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <List className="text-purple-500" /> Interactive Steps
                        </h2>
                        <button
                            type="button"
                            onClick={addStep}
                            className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                        >
                            + Add Step
                        </button>
                    </div>

                    <div className="space-y-6">
                        {steps.map((step, index) => (
                            <div key={index} className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative group">
                                <button
                                    type="button"
                                    onClick={() => removeStep(index)}
                                    className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Step Title</label>
                                        <input
                                            type="text"
                                            value={step.title}
                                            onChange={(e) => updateStep(index, 'title', e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500 text-black"
                                            placeholder="Step Title"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                                        <select
                                            value={step.step_type}
                                            onChange={(e) => updateStep(index, 'step_type', e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500 text-black"
                                        >
                                            <option value="instruction">Instruction</option>
                                            <option value="action">Action</option>
                                            <option value="question">Question</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Content (Markdown)</label>
                                    <textarea
                                        value={step.content}
                                        onChange={(e) => updateStep(index, 'content', e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500 h-20 resize-none text-black"
                                        placeholder="Step instructions..."
                                    />
                                </div>

                                {/* Assignment Assignment Fields */}
                                {step.step_type === 'question' && (
                                    <div className="mt-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                                        <h4 className="text-xs font-bold text-blue-600 uppercase mb-3 flex items-center gap-1">
                                            <CheckCircle size={14} /> Question Configuration
                                        </h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">Question Text</label>
                                                <input
                                                    type="text"
                                                    value={step.assignment?.question_text || ""}
                                                    onChange={(e) => {
                                                        const newAssign = { ...step.assignment, question_text: e.target.value };
                                                        updateStep(index, 'assignment', newAssign);
                                                    }}
                                                    className="w-full bg-white border border-blue-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500 text-black"
                                                    placeholder="e.g. Enter the measured length:"
                                                />
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 mb-1">Correct Value</label>
                                                    <input
                                                        type="text"
                                                        value={step.assignment?.correct_value || ""}
                                                        onChange={(e) => {
                                                            const newAssign = { ...step.assignment, correct_value: e.target.value };
                                                            updateStep(index, 'assignment', newAssign);
                                                        }}
                                                        className="w-full bg-white border border-blue-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500 text-black"
                                                        placeholder="e.g. 15.0"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 mb-1">Tolerance (+/-)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={step.assignment?.tolerance || ""}
                                                        onChange={(e) => {
                                                            const newAssign = { ...step.assignment, tolerance: parseFloat(e.target.value) };
                                                            updateStep(index, 'assignment', newAssign);
                                                        }}
                                                        className="w-full bg-white border border-blue-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500 text-black"
                                                        placeholder="Optional"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
                                                    <input
                                                        type="text"
                                                        value={step.assignment?.unit || ""}
                                                        onChange={(e) => {
                                                            const newAssign = { ...step.assignment, unit: e.target.value };
                                                            updateStep(index, 'assignment', newAssign);
                                                        }}
                                                        className="w-full bg-white border border-blue-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500 text-black"
                                                        placeholder="e.g. mm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {steps.length === 0 && (
                            <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                                No steps added yet. Click "Add Step" to begin.
                            </div>
                        )}
                    </div>
                </section>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center gap-2 transition-all transform active:scale-[0.98]"
                    >
                        <Save size={20} /> Save Course
                    </button>
                </div>
            </form>
        </main>
    );
}