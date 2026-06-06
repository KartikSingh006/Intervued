"use client";

import { useEffect, useState } from 'react';

type InviteStatus = 'sent' | 'in_progress' | 'completed' | 'flagged';

interface ActiveSession {
  id: string;
  candidate_name: string;
  target_role: string;
  status: InviteStatus;
}

export default function RecruiterDashboard() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [expandedSession, setExpandedSession] = useState<ActiveSession | null>(null);

  useEffect(() => {
    // Mock Supabase Real-Time WebSocket listener ('postgres_changes')
    // const channel = supabase.channel('postgres_changes').on(...)
    const timer = setTimeout(() => {
      setSessions([
        { id: '1', candidate_name: 'Alice Turing', target_role: 'Senior Backend Engineer', status: 'in_progress' },
        { id: '2', candidate_name: 'Bob Lovelace', target_role: 'Frontend Architect', status: 'flagged' }
      ]);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleGenerateInvite = async () => {
    try {
      const res = await fetch('/api/invitations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_name: "New Candidate",
          candidate_email: "test@example.com",
          target_role: "Full Stack Developer",
          assessment_mode: "SPEECH_VIDEO"
        })
      });
      const data = await res.json();
      alert(`Invitation generated! Token: ${data.token}`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen p-8 relative max-w-7xl mx-auto">
      <header className="mb-10 flex justify-between items-end border-b border-black/5 pb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1 tracking-tight">Recruiter Command Console</h1>
          <p className="opacity-70 text-sm">Real-time interview tracking and proctor anomaly detection</p>
        </div>
        <div className="flex items-center space-x-6">
          <button 
            onClick={handleGenerateInvite} 
            className="spring-button bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-5 py-2.5 rounded-lg font-semibold shadow-[0_4px_14px_rgba(59,130,246,0.3)] text-sm"
          >
            + Generate Invite
          </button>
          <div className="flex items-center space-x-2 bg-black/5 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
            <span className="text-xs font-semibold opacity-80 uppercase tracking-wider">Listening</span>
          </div>
        </div>
      </header>

      {/* Empty-Slate View */}
      {sessions.length === 0 && !expandedSession && (
        <div className="glass-panel flex flex-col items-center justify-center h-[50vh] text-center border-dashed border-2 border-black/10">
          <div className="w-16 h-16 bg-black/5 rounded-full mb-4 animate-pulse flex items-center justify-center">
             <span className="w-6 h-6 border-4 border-t-[var(--accent)] border-black/10 rounded-full animate-spin"></span>
          </div>
          <h3 className="text-xl font-semibold mb-2">Terminal Standing By</h3>
          <p className="opacity-60 max-w-md text-sm">
            No active candidate sessions. The WebSockets listener channel is open and waiting for real-time Postgres traffic streams.
          </p>
        </div>
      )}

      {/* Matrix Grid */}
      {sessions.length > 0 && !expandedSession && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map(session => (
            <div 
              key={session.id} 
              onClick={() => setExpandedSession(session)}
              className={`glass-panel p-6 hover:-translate-y-1 transition-transform cursor-pointer relative overflow-hidden ${
                session.status === 'flagged' ? 'bg-red-500/5 border-red-500/40 shadow-[0_4px_30px_rgba(239,68,68,0.15)] animate-[pulse_2s_ease-in-out_infinite]' : ''
              }`}
            >
              {session.status === 'flagged' && (
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
              )}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-lg">{session.candidate_name}</h4>
                  <p className="text-xs font-medium opacity-70 uppercase tracking-wider">{session.target_role}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-wider ${
                  session.status === 'flagged' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-green-100 text-green-800 border-green-200'
                }`}>
                  {session.status}
                </span>
              </div>
              
              <div className="aspect-video bg-black/5 rounded-lg flex items-center justify-center border border-black/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                <span className="opacity-40 text-xs font-mono font-semibold tracking-wider uppercase flex items-center">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></span> Live Stream Active
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dynamic Stream Shifting Modal */}
      {expandedSession && (
        <div className="fixed inset-0 z-50 bg-[var(--background)] p-8 flex flex-col">
          <header className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold flex items-center">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-3 shadow-[0_0_12px_rgba(239,68,68,0.8)]"></span>
                {expandedSession.candidate_name}
              </h2>
              <p className="opacity-70 text-sm ml-6">{expandedSession.target_role} • High Definition Media Hooked</p>
            </div>
            <button 
              onClick={() => setExpandedSession(null)} 
              className="spring-button bg-white border border-red-200 text-red-600 px-5 py-2 rounded-lg hover:bg-red-50 text-sm font-semibold"
            >
              Teardown Connection
            </button>
          </header>
          
          <div className="flex-1 grid grid-cols-3 gap-6 min-h-0">
            {/* Desktop Recording */}
            <div className="col-span-2 glass-panel p-5 flex flex-col">
              <h3 className="text-xs font-bold opacity-50 mb-3 uppercase tracking-widest">Primary Display Surface</h3>
              <div className="flex-1 bg-[#0f172a] rounded-lg overflow-hidden flex items-center justify-center relative border border-black/20">
                <span className="text-white/20 font-mono text-sm">Real-Time HD Screen Capture Syncing...</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-6 min-h-0">
              {/* Webcam Feed */}
              <div className="glass-panel p-5 flex-shrink-0">
                <h3 className="text-xs font-bold opacity-50 mb-3 uppercase tracking-widest">Subject Camera</h3>
                <div className="aspect-video bg-[#1e293b] rounded-lg flex items-center justify-center border border-black/20 relative">
                  <span className="text-white/20 text-xs font-mono">1080p WebRTC Feed</span>
                </div>
              </div>
              
              {/* Transcript & Logs */}
              <div className="glass-panel p-5 flex-1 flex flex-col min-h-0">
                <h3 className="text-xs font-bold opacity-50 mb-4 uppercase tracking-widest flex justify-between">
                  <span>Live Transcript Feed</span>
                  <span className="bg-black/5 px-2 py-0.5 rounded text-[10px]">Auto-Scroll</span>
                </h3>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  <div className="text-sm border-l-2 border-[var(--accent)] pl-3">
                    <span className="opacity-40 text-[10px] block mb-1 font-mono">10:45:01</span>
                    "Regarding the architecture question, I prefer Next.js App Router for..."
                  </div>
                  {expandedSession.status === 'flagged' && (
                     <div className="text-sm border-l-2 border-red-500 pl-3 text-red-600 bg-red-500/5 py-2 rounded-r pr-2">
                       <span className="opacity-60 text-[10px] block mb-1 font-mono font-bold">10:45:30 [ANOMALY DETECTED]</span>
                       Proctoring Violation: Window blur or visibility change detected. Visual mask deployed automatically.
                     </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
