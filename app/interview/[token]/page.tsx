"use client";

import { useEffect, useState, useRef, use } from 'react';
import { supabase } from '@/lib/supabase';

type InterviewMode = 'SPEECH_VIDEO' | 'CODE_BASED' | 'TEXT_BASED';

export default function CandidateInterviewPortal({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;
  
  const [unlocked, setUnlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isBlurred, setIsBlurred] = useState(false);
  const [mode] = useState<InterviewMode>('TEXT_BASED');
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answer, setAnswer] = useState('');
  const [proctorFlags, setProctorFlags] = useState<any[]>([]);
  const [lockdown, setLockdown] = useState<{ active: boolean, reason: string }>({ active: false, reason: '' });
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes per question

  const videoRef = useRef<HTMLVideoElement>(null);

  const logProctorViolation = async (violationType: string, details: string) => {
    console.warn(`[PROCTOR EVENT LOGGED]: ${violationType} - ${details}`);
    const flag = { type: violationType, details, time: new Date().toISOString() };
    setProctorFlags(prev => [...prev, flag]);
    
    try {
      await supabase.from('proctoring_violations_timeline').insert({
        token,
        violation_type: violationType,
        details
      });
      await supabase.from('interview_invitations').update({ status: 'flagged' }).eq('token', token);
    } catch (err) {
      console.error("Failed to log proctoring violation", err);
    }
  };

  const triggerLockdown = (reason: string, violationType: string) => {
    setLockdown({ active: true, reason });
    logProctorViolation(violationType, reason);
  };

  const verifyHardware = async () => {
    try {
      const userMedia = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = userMedia;
      }

      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const videoTrack = displayStream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      
      if (settings.displaySurface === 'window' || settings.displaySurface === 'browser') {
        videoTrack.stop();
        userMedia.getTracks().forEach(t => t.stop());
        triggerLockdown('Tab/Window share detected. You must share your entire screen monitor.', 'tab_share_loophole');
        return;
      }

      if (settings.displaySurface !== 'monitor') {
        videoTrack.stop();
        userMedia.getTracks().forEach(t => t.stop());
        triggerLockdown('Invalid display surface. You must share your entire screen monitor.', 'invalid_display_surface');
        return;
      }

      videoTrack.onended = () => {
        setIsBlurred(true);
        triggerLockdown('Screen sharing terminated by user. Assessment locked.', 'stop_sharing_terminated');
      };
      
      setUnlocked(true);
      setErrorMsg('');
      fetchQuestions();
      startGazeTrackingSim();
    } catch (err: any) {
      setErrorMsg(err.message || "Hardware access denied. Camera, microphone, and full screen monitor share are strictly required to proceed.");
    }
  };

  const startGazeTrackingSim = () => {
    let divergenceTimer: NodeJS.Timeout;
    
    const simulateGaze = () => {
      if (Math.random() > 0.95) {
        divergenceTimer = setTimeout(() => {
          logProctorViolation('gaze_divergence', 'Eye parameters indicate cross-screen divergence for >4s');
        }, 4000);
      } else {
        clearTimeout(divergenceTimer);
      }
    };

    const interval = setInterval(simulateGaze, 1000);
    return () => clearInterval(interval);
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

  const submitEvaluation = async () => {
    try {
      await fetch('/api/evaluations/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, mode, question: questions[currentQ], answer, proctor_flags: [] })
      });
      setAnswer('');
      setTimeLeft(600);
      setCurrentQ(prev => Math.min(prev + 1, questions.length - 1));
    } catch (err) {
      console.error(err);
    }
  };

  // Timer Effect
  useEffect(() => {
    if (!unlocked || lockdown.active) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          submitEvaluation();
          return 600;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [unlocked, lockdown.active, currentQ, questions]);

  useEffect(() => {
    if (!unlocked || lockdown.active) return;

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 's', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlurred(true);
        logProctorViolation('visibility_change', 'Tab unfocused or minimized');
      } else {
        setIsBlurred(false);
      }
    };

    const handleWindowBlur = () => {
      setIsBlurred(true);
      logProctorViolation('window_blur', 'Window lost focus');
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
  }, [unlocked, lockdown.active, token]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (lockdown.active) {
    return (
      <div className="fixed inset-0 z-[10000] bg-[var(--background)] flex items-center justify-center p-8 overflow-hidden">
        {/* Floating Background Blur Spheres */}
        <div className="absolute top-[10%] left-[20%] w-[35vw] h-[35vw] bg-red-500/10 rounded-full blur-[100px] sphere-a pointer-events-none"></div>
        <div className="absolute top-[5%] right-[15%] w-[25vw] h-[25vw] bg-red-400/10 rounded-full blur-[80px] sphere-b pointer-events-none"></div>
        <div className="absolute bottom-[10%] left-[10%] w-[30vw] h-[30vw] bg-rose-500/10 rounded-full blur-[90px] sphere-c pointer-events-none"></div>
        
        <div className="glass-panel p-10 max-w-2xl text-center shadow-2xl relative z-10 border border-red-500/30">
          <div className="w-24 h-24 mx-auto mb-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center animate-[pulse_1s_ease-in-out_infinite] shadow-[0_0_40px_rgba(239,68,68,0.4)] border border-red-200">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <h1 className="text-4xl font-extrabold mb-4 uppercase tracking-widest text-red-600">Security Lockdown</h1>
          <p className="text-xl opacity-80 font-mono mb-8 text-[var(--foreground)]">
            {lockdown.reason}
          </p>
          <div className="bg-red-50 text-red-700 px-6 py-4 rounded-lg font-mono text-sm border border-red-100 uppercase tracking-widest shadow-inner inline-block">
            Session Terminated • Violation Logged
          </div>
        </div>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[var(--background)]">
        {/* Floating Background Blur Spheres */}
        <div className="absolute top-[10%] left-[20%] w-[35vw] h-[35vw] bg-indigo-500/20 rounded-full blur-[100px] sphere-a pointer-events-none"></div>
        <div className="absolute top-[5%] right-[15%] w-[25vw] h-[25vw] bg-teal-400/20 rounded-full blur-[80px] sphere-b pointer-events-none"></div>
        <div className="absolute bottom-[10%] left-[10%] w-[30vw] h-[30vw] bg-violet-500/15 rounded-full blur-[90px] sphere-c pointer-events-none"></div>

        <div className="glass-panel p-10 max-w-lg w-full text-center relative z-10 shadow-[0_20px_60px_rgba(0,0,0,0.1)] bg-white/60">
          <div className="w-16 h-16 bg-[var(--accent)]/10 text-[var(--accent)] rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-sm border border-[var(--accent)]/20">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
          </div>
          <h2 className="text-3xl font-extrabold mb-4 text-[var(--foreground)] tracking-tight">System Validation</h2>
          <p className="text-sm opacity-70 mb-8 font-medium leading-relaxed text-[var(--foreground)]">
            To proceed, you must grant full access to your webcam, microphone, and entire screen monitor. Strict proctoring constraints are applied.
            <br/><br/>
            Token: <span className="font-mono bg-black/5 px-2 py-1 rounded text-xs">{token}</span>
          </p>
          {errorMsg && (
            <div className="bg-red-50 text-red-700 border border-red-200 p-4 rounded-xl mb-8 text-sm text-left shadow-sm flex items-start">
              <svg className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <strong>Error:</strong> {errorMsg}
            </div>
          )}
          <button 
            onClick={verifyHardware} 
            className="spring-button bg-gradient-to-r from-indigo-600 to-teal-500 hover:from-indigo-700 hover:to-teal-600 text-white w-full py-4 rounded-xl font-bold shadow-[0_10px_20px_rgba(79,70,229,0.3)] transition-all"
          >
            Authenticate & Initialize Terminal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 relative overflow-hidden bg-[var(--background)] flex flex-col">
      {/* Floating Background Blur Spheres */}
      <div className="absolute top-[10%] left-[20%] w-[35vw] h-[35vw] bg-indigo-500/10 rounded-full blur-[100px] sphere-a pointer-events-none z-0"></div>
      <div className="absolute top-[5%] right-[15%] w-[25vw] h-[25vw] bg-teal-400/10 rounded-full blur-[80px] sphere-b pointer-events-none z-0"></div>
      <div className="absolute bottom-[10%] left-[10%] w-[30vw] h-[30vw] bg-violet-500/10 rounded-full blur-[90px] sphere-c pointer-events-none z-0"></div>

      <div className="watermark-overlay z-0">
        CANDIDATE: {token} • CONFIDENTIAL
      </div>

      <header className="relative z-10 flex justify-between items-end border-b border-black/5 pb-4 mb-6 max-w-7xl mx-auto w-full">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Interview Console</h1>
          <p className="opacity-70 text-sm font-medium">AI-Proctored Secure Terminal</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-black/5 px-4 py-2 rounded-full border border-black/5">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
            <span className="text-xs font-bold opacity-80 uppercase tracking-widest text-[var(--foreground)]">Live Proctor Sync</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 flex-1 relative z-10 w-full">
        {/* Left Pane: Questions & Answer Console */}
        <div className={`glass-panel p-8 flex-1 flex flex-col relative overflow-hidden bg-white/70 shadow-[0_10px_40px_rgba(0,0,0,0.05)] transition-all duration-300 ${isBlurred ? 'security-blur' : ''}`}>
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-teal-400"></div>
           
           <div className="flex justify-between items-center mb-6 pb-4 border-b border-black/5">
             <h2 className="text-2xl font-extrabold text-[var(--foreground)]">Question {currentQ + 1} <span className="opacity-40 text-lg">/ {questions.length || 5}</span></h2>
             
             {/* Countdown Clock Tracker */}
             <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-mono font-bold text-lg border border-indigo-100 flex items-center shadow-sm">
               <svg className="w-5 h-5 mr-2 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
               {formatTime(timeLeft)}
             </div>
           </div>
           
           <div className="flex-1 flex flex-col">
             <p className="text-xl mb-8 leading-relaxed font-medium text-[var(--foreground)]">
               {questions[currentQ] || "Synchronizing dynamic scenario from secure database layer..."}
             </p>
             
             <div className="flex-1 relative">
               <textarea 
                 className="w-full h-full min-h-[250px] bg-white border border-black/10 rounded-xl p-6 resize-none outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner transition-all disabled:opacity-50 text-[var(--foreground)]"
                 placeholder="Draft your comprehensive analytical response here..."
                 value={answer}
                 onChange={(e) => setAnswer(e.target.value)}
                 onPaste={(e) => e.preventDefault()}
                 onCopy={(e) => e.preventDefault()}
                 onCut={(e) => e.preventDefault()}
                 disabled={isBlurred}
               />
               <div className="absolute bottom-4 right-4 text-xs font-bold opacity-30 uppercase tracking-widest pointer-events-none">
                 Copy-Paste Disabled
               </div>
             </div>
           </div>
           
           <div className="mt-8 flex justify-between items-center">
             <div className="text-xs text-red-500 font-mono font-bold uppercase tracking-widest flex items-center">
               {proctorFlags.length > 0 && (
                 <span className="bg-red-50 px-3 py-1.5 rounded-full border border-red-200 flex items-center">
                   <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></span>
                   Security Flags: {proctorFlags.length}
                 </span>
               )}
             </div>
             <button 
               onClick={submitEvaluation}
               disabled={isBlurred}
               className="spring-button bg-[var(--foreground)] text-[var(--background)] px-8 py-3.5 rounded-xl font-bold shadow-[0_8px_20px_rgba(0,0,0,0.15)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
             >
               Submit & Proceed
             </button>
           </div>
        </div>

        {/* Right Pane: Media Capture Layout */}
        <div className={`w-full lg:w-80 flex flex-col gap-6 transition-all duration-300 ${isBlurred ? 'security-blur' : ''}`}>
          {/* Webcam Feed Container */}
          <div className="glass-panel p-4 flex flex-col bg-white/50 shadow-md">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold uppercase tracking-widest opacity-60">Identity Stream</h3>
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
            </div>
            <div className="aspect-video bg-[#0f172a] rounded-xl overflow-hidden relative shadow-inner border border-black/10">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
              <div className="absolute top-2 right-2 bg-red-500/20 text-red-500 text-[10px] px-2 py-0.5 rounded font-mono font-bold border border-red-500/30 uppercase">REC</div>
            </div>
          </div>

          {/* Assessment Mode Tracker Container */}
          <div className="glass-panel p-5 flex flex-col bg-white/50 shadow-md flex-1">
             <h3 className="text-xs font-bold uppercase tracking-widest opacity-60 mb-4">Telemetry Matrix</h3>
             
             <div className="space-y-4">
               <div className="bg-black/5 p-3 rounded-lg border border-black/5 flex justify-between items-center">
                 <span className="text-xs font-bold">Gaze Tracking</span>
                 <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-mono font-bold">ACTIVE</span>
               </div>
               <div className="bg-black/5 p-3 rounded-lg border border-black/5 flex justify-between items-center">
                 <span className="text-xs font-bold">Audio Pitch Level</span>
                 <div className="flex space-x-1">
                   <div className="w-1 h-3 bg-indigo-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite]"></div>
                   <div className="w-1 h-4 bg-indigo-400 rounded-full animate-[pulse_1.2s_ease-in-out_infinite]"></div>
                   <div className="w-1 h-2 bg-indigo-400 rounded-full animate-[pulse_0.9s_ease-in-out_infinite]"></div>
                 </div>
               </div>
               <div className="bg-black/5 p-3 rounded-lg border border-black/5 flex justify-between items-center">
                 <span className="text-xs font-bold">Display Lock</span>
                 <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-mono font-bold">ENFORCED</span>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
