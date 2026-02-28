"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { PlayCircle, Award, Clock, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import UserProfile from '@/components/UserProfile';
import clsx from 'clsx';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

// Dynamically import the 3D component with no SSR to avoid hydration issues
const MachineExplorer = dynamic(() => import('@/components/MachineExplorer'), { ssr: false });

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  // State
  const [role, setRole] = useState("CNC Operator");
  const [modules, setModules] = useState<any[]>([]);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    // If real user exists, use their role info if available
    // Mock logic for demo purposes if backend isn't full role-based yet
    if (user?.role_id === 1) setRole("Admin");

    // Map real user progress to modules
    if (user?.progress && user.progress.length > 0) {
      const realModules = user.progress
        .filter((p: any) => p.module != null) // Filter out deleted modules
        .map((p: any) => ({
          id: p.module.id,
          title: p.module.title,
          status: p.status,
          progress: p.status === "Completed" ? 100 : (p.status === "In Progress" ? (p.current_step_index * 10) : 0),
          duration: p.module.duration ? `${Math.round(p.module.duration / 60)} min` : "0 min"
        }));
      setModules(realModules);
    } else {
      setModules([]);
    }
  }, [user]);

  return (
    <main className="min-h-screen pb-32 pt-8 px-5 lg:max-w-4xl mx-auto transition-colors duration-300">
      <UserProfile isOpen={showProfile} onClose={() => setShowProfile(false)} />

      {/* Header */}
      <header className="flex justify-between items-end mb-10 animate-fade-in-up">
        <div>
          <p className="text-slate-500 text-lg font-medium tracking-wide mb-1 opacity-90">Welcome back</p>
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-slate-400 text-glow tracking-tight">
            {user?.employee_code || "Guest"}
          </h1>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-accent shadow-[0_0_10px_var(--accent)] animate-pulse"></div>
            <span className="glass-panel px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide text-primary border-white/10 shadow-sm">
              {role}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowProfile(true)}
            className="h-14 w-14 glass-panel rounded-full flex items-center justify-center hover:bg-white/10 transition-all border-white/10 active:scale-95 group shadow-xl"
            aria-label="Open Profile"
          >
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-highlight flex items-center justify-center text-white text-base font-bold shadow-inner">
              {user?.employee_code ? user.employee_code.substring(0, 2).toUpperCase() : "AS"}
            </div>
          </button>
        </div>
      </header>

      {/* Interactive Setup (Disabled temporarily) */}
      {/* <section className="mb-14 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <h2 className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] mb-5 ml-2">Interactive Setup</h2>
        <div className="glass-panel rounded-3xl p-1.5 h-80 relative overflow-hidden group shadow-2xl border-white/10">
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full pointer-events-none"></div>

          <div className="w-full h-full rounded-[20px] overflow-hidden bg-slate-900/40 backdrop-blur-md relative z-10">
            <MachineExplorer />

            <div className="absolute bottom-4 right-4 pointer-events-none hidden md:block">
              <span className="text-[10px] text-slate-400 font-mono bg-black/40 px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/5 font-medium">v2.4.0 Online</span>
            </div>
          </div>
        </div>
      </section> */}

      {/* Assigned Training */}
      <section className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <h2 className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-5 ml-2">Assigned Training</h2>
        <div className="space-y-5">
          {modules.map((mod, idx) => {
            const isInProgress = mod.status === 'In Progress';
            return (
              <Link href={`/modules/${mod.id}`} key={mod.id} className="block">
                <div
                  className={clsx(
                    "glass-card p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center gap-5 cursor-pointer group relative overflow-hidden transition-all duration-300 border border-transparent",
                    isInProgress ? "bg-gradient-to-r from-slate-100/60 to-slate-200/60 dark:from-slate-900/60 dark:to-slate-800/60 border-l-4 border-l-accent" : "hover:bg-slate-100/40 dark:hover:bg-slate-800/40"
                  )}
                >
                  {/* Icon Container */}
                  <div className={clsx(
                    "h-16 w-16 rounded-2xl flex items-center justify-center transition-colors shadow-lg shrink-0",
                    isInProgress ? "bg-accent/20 text-accent shadow-accent/10" : "bg-secondary text-slate-500 dark:text-slate-400"
                  )}>
                    {isInProgress ? <PlayCircle size={32} /> : <Clock size={32} />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 w-full min-w-0">
                    <div className="flex justify-between items-start mb-2 gap-4">
                      <h3 className="font-bold text-xl text-foreground group-hover:text-primary transition-colors leading-tight">
                        {mod.title}
                      </h3>
                      {isInProgress && (
                        <span className="text-[10px] font-bold bg-accent/15 text-accent px-3 py-1 rounded-md border border-accent/20 whitespace-nowrap tracking-wider shadow-sm">
                          RESUME
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-500 mb-2">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock size={14} className="text-slate-400" />
                        {mod.duration}
                      </span>
                      {mod.status !== "Not Started" && (
                        <>
                          <span className="h-1.5 w-1.5 bg-slate-600 rounded-full"></span>
                          <span className={clsx(
                            "font-bold uppercase tracking-wide text-xs",
                            isInProgress ? "text-accent" : "text-slate-500"
                          )}>
                            {mod.status}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Progress Bar for In Progress */}
                    {isInProgress && (
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-accent rounded-full shadow-[0_0_10px_var(--accent)] relative" style={{ width: `${mod.progress}%` }}>
                          <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-[2px]" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hover Glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
