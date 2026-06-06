"use client";

import { useEffect, useState } from 'react';

type InviteStatus = 'sent' | 'in_progress' | 'completed' | 'flagged';

interface ActiveSession {
  id: string;
  candidate_name: string;
  target_role: string;
  status: InviteStatus;
  metrics: {
    identity: 'pass' | 'flag';
    isolation: 'pass' | 'flag';
    integrity: 'pass' | 'flag';
    gaze: 'pass' | 'flag';
    acoustic: 'pass' | 'flag';
  };
}

export default function RecruiterDashboard() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [expandedSession, setExpandedSession] = useState<ActiveSession | null>(null);

  useEffect(() => {
    // Mock WebSocket connection to 'interview_invitations' & 'proctoring_violations_timeline'
    const timer = setTimeout(() => {
      setSessions([
        { 
          id: '1', 
          candidate_name: 'Alice Turing', 
          target_role: 'Senior Backend Engineer', 
          status: 'in_progress',
          metrics: { identity: 'pass', isolation: 'pass', integrity: 'pass', gaze: 'pass', acoustic: 'pass' }
        },
        { 
          id: '2', 
          candidate_name: 'Bob Lovelace', 
          target_role: 'Frontend Architect', 
          status: 'flagged',
          metrics: { identity: 'pass', isolation: 'flag', integrity: 'flag', gaze: 'pass', acoustic: 'pass' }
        }
      ]);
    }, 1500);
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

  const renderMetricStatus = (status: 'pass' | 'flag', label: string) => (
    <div className="flex items-center justify-between p-3 bg-white/50 border border-black/5 rounded-lg">
      <span className="text-sm font-semibold opacity-80">{label}</span>
      {status === 'pass' ? (
        <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded flex items-center">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
          PASS
        </span>
      ) : (
        <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded flex items-center animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.4)]">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
          FLAGGED
        </span>
      )}
    </div>
  );

  return (
    <div className="min-h-screen p-8 relative max-w-7xl mx-auto">
      <header className="mb-10 flex justify-between items-end border-b border-black/5 pb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1 tracking-tight">Integrity Report Matrix</h1>
          <p className="opacity-70 text-sm">Real-time candidate tracking and proctor anomaly detection</p>
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
            <span className="text-xs font-semibold opacity-80 uppercase tracking-wider">WebSocket Sync Active</span>
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
                session.status === 'flagged' ? 'bg-red-500/5 border-red-500/40 shadow-[0_4px_30px_rgba(239,68,68,0.15)]' : ''
              }`}
            >
              {session.status === 'flagged' && (
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500 animate-pulse"></div>
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
                  <span className={`w-1.5 h-1.5 rounded-full mr-2 ${session.status === 'flagged' ? 'bg-red-500 animate-pulse' : 'bg-green-400'}`}></span> Live Stream Hooked
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Synchronized Dual-Stream Modal */}
      {expandedSession && (
        <div className="fixed inset-0 z-50 bg-[var(--background)] p-8 flex flex-col overflow-y-auto">
          <header className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold flex items-center">
                <span className={`w-3 h-3 rounded-full mr-3 ${expandedSession.status === 'flagged' ? 'bg-red-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.8)]' : 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)]'}`}></span>
                {expandedSession.candidate_name}
              </h2>
              <p className="opacity-70 text-sm ml-6 font-mono mt-1">SESSION_ID: {expandedSession.id} • {expandedSession.target_role}</p>
            </div>
            <button 
              onClick={() => setExpandedSession(null)} 
              className="spring-button bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 text-sm font-bold shadow-sm"
            >
              Close Review Dashboard
            </button>
          </header>
          
          <div className="flex-1 grid grid-cols-2 gap-8 min-h-[50vh] mb-8">
            {/* Left Column: Webcam Frame */}
            <div className="glass-panel p-6 flex flex-col">
              <h3 className="text-xs font-bold opacity-50 mb-3 uppercase tracking-widest flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                Subject Camera Array
              </h3>
              <div className="flex-1 bg-[#0f172a] rounded-lg overflow-hidden flex items-center justify-center relative border border-black/20 shadow-inner">
                <span className="text-white/20 font-mono text-sm">Tracking Micro-Expressions [WebRTC Hooked]</span>
                <div className="absolute top-4 right-4 bg-red-500/20 text-red-500 text-xs px-2 py-1 rounded font-mono border border-red-500/30">REC</div>
              </div>
            </div>
            
            {/* Right Column: Desktop Share */}
            <div className="glass-panel p-6 flex flex-col">
              <h3 className="text-xs font-bold opacity-50 mb-3 uppercase tracking-widest flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                Display Surface Track
              </h3>
              <div className="flex-1 bg-[#1e293b] rounded-lg overflow-hidden flex items-center justify-center border border-black/20 relative shadow-inner">
                <span className="text-white/20 text-sm font-mono">Full Desktop Broadcast Syncing...</span>
                <div className="absolute top-4 right-4 bg-red-500/20 text-red-500 text-xs px-2 py-1 rounded font-mono border border-red-500/30">REC</div>
              </div>
            </div>
          </div>

          {/* Hiring Report Card Matrix */}
          <div className="glass-panel p-8">
            <h3 className="text-lg font-bold mb-6 flex items-center">
              <svg className="w-5 h-5 mr-2 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              Integrity Report Card
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {renderMetricStatus(expandedSession.metrics.identity, 'Identity Check')}
              {renderMetricStatus(expandedSession.metrics.isolation, 'Frame Isolation')}
              {renderMetricStatus(expandedSession.metrics.integrity, 'Window Integrity')}
              {renderMetricStatus(expandedSession.metrics.gaze, 'Gaze Tracking')}
              {renderMetricStatus(expandedSession.metrics.acoustic, 'Acoustic Env')}
            </div>
            
            {expandedSession.status === 'flagged' && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="text-red-800 font-bold text-sm mb-2 uppercase tracking-wider">Critical Violation Timeline</h4>
                <ul className="space-y-2 text-sm font-mono text-red-700">
                  <li className="flex items-start">
                    <span className="font-bold mr-3 opacity-60">14:02:12</span>
                    <span>Window Integrity: displaySurface tracking lost. Focus departed container bounds.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-3 opacity-60">14:05:44</span>
                    <span>Frame Isolation: Multiple background subjects detected in video analysis pipeline.</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
