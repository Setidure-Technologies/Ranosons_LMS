"use client";

import React, { useState, useEffect } from 'react';
import { MessageSquare, Send } from 'lucide-react';

interface Comment {
    id: number;
    text: string;
    user_id: number; // In real app, we'd fetch user name
    created_at: string;
}

interface CommentSectionProps {
    moduleId: number;
    comments: Comment[];
    onAddComment: (text: string) => Promise<void>;
}

export default function CommentSection({ moduleId, comments, onAddComment }: CommentSectionProps) {
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setIsSubmitting(true);
        await onAddComment(newComment);
        setNewComment("");
        setIsSubmitting(false);
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mt-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <MessageSquare size={20} />
                Discussion
            </h3>

            <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto">
                {comments.length === 0 ? (
                    <p className="text-slate-500 text-sm italic">No comments yet. Be the first to start the discussion.</p>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-blue-400 font-medium text-xs">User #{comment.user_id}</span>
                                <span className="text-slate-500 text-[10px]">{new Date(comment.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-slate-300 text-sm">{comment.text}</p>
                        </div>
                    ))
                )}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Ask a question or share a tip..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                />
                <button
                    type="submit"
                    disabled={isSubmitting || !newComment.trim()}
                    className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
}
