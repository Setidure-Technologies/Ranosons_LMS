"use client";

import React, { useEffect, useState } from 'react';
import ResourceCard from '@/components/ResourceCard';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// Helper to get YouTube thumbnail
const getYouTubeThumbnail = (url: string) => {
    if (!url) return undefined;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11)
        ? `https://img.youtube.com/vi/${match[2]}/0.jpg`
        : undefined;
};

export default function LearningPage() {
    const [resources, setResources] = useState<any[]>([]);
    const [selectedResource, setSelectedResource] = useState<any>(null);
    const { token } = useAuth();
    const router = useRouter();

    useEffect(() => {
        const fetchContent = async () => {
            if (!token) return;

            try {
                // Fetch Modules (real training modules)
                const modulesRes = await fetch('http://localhost:8000/api/v1/modules', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                // Fetch other resources (articles, links) if endpoint exists
                // For now, we'll just show modules, or you can keep the mock resources as well if needed.
                // Let's mix them or focus on modules as requested.

                let combinedResources: any[] = [];

                if (modulesRes.ok) {
                    const modules = await modulesRes.json();
                    const moduleResources = modules.map((m: any) => ({
                        id: m.id,
                        title: m.title,
                        description: m.description,
                        resource_type: 'video', // Modules are primarily video/interactive
                        content: m.video_url, // For linking
                        image_url: getYouTubeThumbnail(m.video_url) || "https://placehold.co/600x400/2563eb/FFF?text=Module",
                        isModule: true
                    }));
                    combinedResources = [...combinedResources, ...moduleResources];
                }

                // Append static resources (or fetch from /api/v1/resources if implemented)
                const staticResources = [
                    {
                        id: 101,
                        title: "Ranoson Official Website",
                        description: "Visit our official website for more product details.",
                        resource_type: "link",
                        content: "https://ranoson.in",
                        image_url: "https://placehold.co/600x400/ea580c/FFF?text=Ranoson+Website",
                        isModule: false
                    }
                ];

                setResources([...combinedResources, ...staticResources]);

            } catch (error) {
                console.error("Failed to fetch learning content", error);
            }
        };

        fetchContent();
    }, [token]);

    const handleResourceClick = (resource: any) => {
        if (resource.isModule) {
            router.push(`/modules/${resource.id}`);
        } else if (resource.resource_type === 'link') {
            window.open(resource.content, '_blank');
        } else {
            setSelectedResource(resource);
        }
    };

    return (
        <main className="min-h-screen bg-slate-50 p-6 pb-24">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Learning Center</h1>
                <p className="text-slate-500">Explore training modules, guides, and resources.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resources.map((res) => (
                    <ResourceCard key={res.id} resource={res} onClick={handleResourceClick} />
                ))}
            </div>

            {/* Article Modal */}
            {selectedResource && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-2xl border border-slate-200 flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-900">{selectedResource.title}</h2>
                            <button
                                onClick={() => setSelectedResource(null)}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto prose prose-slate max-w-none">
                            <div className="whitespace-pre-wrap font-sans text-slate-600">
                                {selectedResource.content}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
