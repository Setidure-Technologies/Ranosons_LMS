"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { CheckCircle, XCircle, ArrowRight, Play } from 'lucide-react';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;

interface Assignment {
  question_text: string;
  unit?: string;
}

interface Step {
  id: number;
  title: string;
  content: string;
  step_type: string;
  media_url?: string;
  assignment?: Assignment;
}

interface ModulePlayerProps {
  steps: Step[];
  videoUrl?: string;
  onStepSubmit: (stepId: number, value: string) => Promise<{ passed: boolean; message: string }>;
}

export default function ModulePlayer({ steps, videoUrl, onStepSubmit }: ModulePlayerProps) {
  // console.log("ModulePlayer videoUrl:", videoUrl); // DEBUG LOG
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState<{ passed: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleSubmit = async () => {
    if (!currentStep.assignment) {
      handleNext();
      return;
    }

    setLoading(true);
    try {
      const result = await onStepSubmit(currentStep.id, inputValue);
      setFeedback(result);
      if (result.passed) {
        // Optional: Auto-advance after delay
      }
    } catch (error) {
      console.error("Error submitting step:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (isLastStep) return;
    setCurrentStepIndex(prev => prev + 1);
    setInputValue("");
    setFeedback(null);
  };

  return (
    <div className="flex h-[600px] bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
      {/* Left: Media/Context */}
      <div className="w-1/2 bg-black relative flex items-center justify-center">
        {isMounted && videoUrl ? (
          <ReactPlayer
            url={videoUrl}
            width="100%"
            height="100%"
            controls={true}
            playing={false}
          />
        ) : currentStep.media_url ? (
          <img src={currentStep.media_url} alt={currentStep.title} className="max-w-full max-h-full object-contain" />
        ) : (
          <div className="text-slate-500 flex flex-col items-center">
            <Play size={48} className="mb-2 opacity-50" />
            <p>No media for this step</p>
          </div>
        )}
        {!videoUrl && (
          <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded text-white text-sm">
            Step {currentStepIndex + 1} of {steps.length}
          </div>
        )}
      </div>

      {/* Right: Instructions & Interaction */}
      <div className="w-1/2 p-8 flex flex-col">
        <h2 className="text-2xl font-bold text-white mb-4">{currentStep.title}</h2>
        <div className="prose prose-invert mb-8 text-slate-300">
          <p>{currentStep.content}</p>
        </div>

        <div className="mt-auto">
          {currentStep.assignment ? (
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
              <label className="block text-sm font-medium text-slate-400 mb-2">
                {currentStep.assignment.question_text}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter your answer..."
                  disabled={feedback?.passed}
                />
                {currentStep.assignment.unit && (
                  <span className="flex items-center text-slate-400 font-medium">{currentStep.assignment.unit}</span>
                )}
              </div>

              {feedback && (
                <div className={`mt-3 flex items-center gap-2 text-sm ${feedback.passed ? 'text-green-400' : 'text-red-400'}`}>
                  {feedback.passed ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  <span>{feedback.message}</span>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || feedback?.passed}
                className={`mt-4 w-full py-2 rounded font-semibold transition-colors ${feedback?.passed
                  ? 'bg-green-600/20 text-green-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
              >
                {loading ? "Checking..." : feedback?.passed ? "Completed" : "Submit Answer"}
              </button>
            </div>
          ) : (
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
              <p className="text-slate-300 mb-4">Read the instructions above and proceed.</p>
              <button
                onClick={handleNext}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded font-semibold"
              >
                Mark as Done
              </button>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex justify-between mt-6 pt-6 border-t border-slate-800">
            <button
              onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
              disabled={currentStepIndex === 0}
              className="text-slate-400 hover:text-white disabled:opacity-30"
            >
              Previous
            </button>

            {feedback?.passed && !isLastStep && (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium animate-pulse"
              >
                Next Step <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
