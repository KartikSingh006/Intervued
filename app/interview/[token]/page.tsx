"use client";

import { useEffect, useState, useRef, use } from 'react';

type InterviewMode = 'SPEECH_VIDEO' | 'CODE_BASED' | 'TEXT_BASED';

export default function CandidateSecurityTerminal({ params }: { params: Promise<{ token: string }> }) {
  // Use React.use to unwrap the Promise
  const resolvedParams = use(params);
  const token = resolvedParams.token;
  
  const [unlocked, setUnlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isBlurred, setIsBlurred] = useState(false);
  const [mode, setMode] = useState<InterviewMode>('TEXT_BASED'); // Default simulated mode
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answer, setAnswer] = useState('');
  const [proctorFlags, setProctorFlags] = useState<string[]>([]);

  const verifyHardware = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const videoTrack = displayStream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      
      if (settings.displaySurface !== 'monitor') {
        throw new Error("Security Policy: You must share your entire screen (monitor), not just a window or tab.");
      }
      
      setUnlocked(true);
      setErrorMsg('');
      fetchQuestions();
    } catch (err: any) {
      setErrorMsg(err.message || "Hardware access denied. Camera, microphone, and monitor share are strictly required.");
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await fetch('/api/questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'Software Engineer' })
      });
      const data = await res.json();
      if (data.questions) setQuestions(data.questions);
    } catch (err) {
      console.error("Failed to fetch questions:", err);
    }
  };

  useEffect(() => {
    if (!unlocked) return;

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 's', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    
    const flagProctoringAlert = (reason: string) => {
      console.warn(`PROCTOR ALERT: ${reason}`);
      setProctorFlags(prev => [...prev, `${new Date().toISOString()} - ${reason}`]);
      // Immediately notify backend
      fetch('/api/evaluations/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, question: "N/A", answer: "N/A", proctor_flags: [reason] })
      }).catch(console.error);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlurred(true);
        flagProctoringAlert("Tab unfocused or minimized");
      } else {
        setIsBlurred(false);
      }
    };

    const handleWindowBlur = () => {
      setIsBlurred(true);
      flagProctoringAlert("Window lost focus");
    };

    const handleWindowFocus = () => {
      setIsBlurred(false);
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [unlocked, mode]);

  if (!unlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="glass-panel p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4">Security Validation</h2>
          <p className="text-sm opacity-80 mb-6">
            Token: <span className="font-mono bg-black/5 px-2 py-1 rounded">{token}</span>
            <br/><br/>
            Grant Camera, Mic, and Full-Screen access to proceed to the terminal.
          </p>
          {errorMsg && (
            <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-lg mb-4 text-sm text-left">
              <strong>Error:</strong> {errorMsg}
            </div>
          )}
          <button 
            onClick={verifyHardware} 
            className="spring-button bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-6 py-3 rounded-lg font-semibold w-full shadow-[0_4px_14px_rgba(59,130,246,0.3)]"
          >
            Authenticate Hardware
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-8 transition-all ${isBlurred ? 'security-blur' : ''}`}>
      <div className="watermark-overlay">
        CANDIDATE: {token} • CONFIDENTIAL
      </div>

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 h-[85vh]">
        <div className="glass-panel p-8 flex-1 flex flex-col relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-[var(--accent)]"></div>
           <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-bold">Question {currentQ + 1} of {questions.length || 5}</h2>
             <span className="bg-black/5 border border-black/10 px-3 py-1 rounded-full text-xs font-mono font-semibold tracking-wider">
               {mode}
             </span>
           </div>
           
           <p className="text-lg mb-8 flex-1 leading-relaxed">
             {questions[currentQ] || "Loading AI-generated analytical scenario..."}
           </p>
           
           <div className="flex justify-between items-center mt-auto border-t border-black/5 pt-4">
             <span className="text-sm opacity-60 flex items-center">
               <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></span>
               Recording Active
             </span>
           </div>
        </div>

        <div className="glass-panel p-6 flex-1 flex flex-col">
          {mode === 'TEXT_BASED' && (
            <textarea 
              className="w-full flex-1 bg-white/50 border border-black/10 rounded-lg p-4 resize-none outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="Type your response here. Copy-pasting is disabled by the security wrapper."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
            />
          )}

          {mode === 'CODE_BASED' && (
            <div className="flex-1 bg-[#1e1e1e] rounded-lg border border-black/20 flex flex-col">
               <div className="bg-black/20 text-white/50 px-4 py-2 text-xs font-mono border-b border-white/10 flex justify-between">
                 <span>Monaco Editor</span>
                 <span>JavaScript</span>
               </div>
               <div className="flex-1 p-4 text-white/30 font-mono text-sm">
                 // Code editor mounted here<br/>
                 // Copy/Paste strictly disabled
               </div>
            </div>
          )}

          {mode === 'SPEECH_VIDEO' && (
            <div className="flex-1 flex items-center justify-center bg-black/5 rounded-lg border border-black/10">
               <div className="text-center">
                 <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                   <span className="w-6 h-6 bg-red-500 rounded-full animate-pulse"></span>
                 </div>
                 <span className="font-mono text-sm opacity-70">MediaRecorder active. Monitoring pitch levels...</span>
               </div>
            </div>
          )}

          <div className="mt-6 flex justify-between items-center">
            <div className="text-xs text-red-500 font-mono">
              {proctorFlags.length > 0 && `Flags: ${proctorFlags.length}`}
            </div>
            <button 
              onClick={() => {
                setAnswer('');
                setCurrentQ(prev => Math.min(prev + 1, questions.length - 1));
              }}
              className="spring-button bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-6 py-3 rounded-lg font-semibold shadow-[0_4px_14px_rgba(59,130,246,0.3)]"
            >
              Submit & Proceed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
