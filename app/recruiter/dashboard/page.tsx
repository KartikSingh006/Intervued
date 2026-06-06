"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type InviteStatus = 'sent' | 'in_progress' | 'completed' | 'flagged';

interface ActiveSession {
  id: string;
  token: string;
  candidate_name: string;
  candidate_email: string;
  target_role: string;
  status: InviteStatus;
  created_at: string;
  metrics: {
    identity: 'pass' | 'flag';
    isolation: 'pass' | 'flag';
    integrity: 'pass' | 'flag';
    gaze: 'pass' | 'flag';
    acoustic: 'pass' | 'flag';
  };
  violations: any[];
  ai_score: number | null;
}

export default function RecruiterDashboard() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [expandedSession, setExpandedSession] = useState<ActiveSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  // Cognitive Modal Generator State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({
    candidate_name: '',
    candidate_email: '',
    target_role: 'Full Stack Engineer',
    time_slot: '2026-06-10T10:00'
  });
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    // Timer for elapsed time tracking
    const timerInterval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timerInterval);
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: invites } = await supabase.from('interview_invitations').select('*');
      const { data: evaluations } = await supabase.from('interview_evaluations').select('*');
      const { data: violations } = await supabase.from('proctoring_violations_timeline').select('*');
      
      if (invites) {
        const mappedSessions: ActiveSession[] = invites.map(inv => {
          const evals = evaluations?.filter(e => e.token === inv.token) || [];
          const score = evals.length > 0 ? evals[0].score : null;
          const viols = violations?.filter(v => v.token === inv.token) || [];
          
          let integrity: 'pass'|'flag' = 'pass';
          let gaze: 'pass'|'flag' = 'pass';
          
          viols.forEach(v => {
            if (v.violation_type.includes('tab_share_loophole') || v.violation_type.includes('window_blur')) integrity = 'flag';
            if (v.violation_type.includes('gaze')) gaze = 'flag';
          });
          
          return {
            id: inv.id,
            token: inv.token,
            candidate_name: inv.candidate_name,
            candidate_email: inv.candidate_email,
            target_role: inv.target_role,
            status: inv.status,
            created_at: inv.created_at,
            metrics: { identity: 'pass', isolation: 'pass', integrity, gaze, acoustic: 'pass' },
            violations: viols,
            ai_score: score
          };
        });
        setSessions(mappedSessions);
      }
      setIsLoaded(true);
    };
    
    fetchInitialData();

    // Subscribe to realtime changes
    const channel = supabase.channel('postgres_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interview_invitations' }, (payload: any) => {
        setSessions(prev => {
          if (payload.eventType === 'INSERT') {
            return [...prev, {
              id: payload.new.id,
              token: payload.new.token,
              candidate_name: payload.new.candidate_name,
              candidate_email: payload.new.candidate_email,
              target_role: payload.new.target_role,
              status: payload.new.status,
              created_at: payload.new.created_at,
              metrics: { identity: 'pass', isolation: 'pass', integrity: 'pass', gaze: 'pass', acoustic: 'pass' },
              violations: [],
              ai_score: null
            }];
          }
          if (payload.eventType === 'UPDATE') {
            return prev.map(s => s.id === payload.new.id ? { ...s, status: payload.new.status } : s);
          }
          return prev;
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'proctoring_violations_timeline' }, (payload: any) => {
         setSessions(prev => prev.map(s => {
           if (s.token === payload.new.token) {
             const newViolations = [...s.violations, payload.new];
             const newMetrics = { ...s.metrics };
             if (payload.new.violation_type.includes('tab_share_loophole') || payload.new.violation_type.includes('window_blur')) newMetrics.integrity = 'flag';
             if (payload.new.violation_type.includes('gaze')) newMetrics.gaze = 'flag';
             return { ...s, violations: newViolations, metrics: newMetrics, status: 'flagged' };
           }
           return s;
         }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'interview_evaluations' }, (payload: any) => {
         setSessions(prev => prev.map(s => {
           if (s.token === payload.new.token) {
             return { ...s, ai_score: payload.new.score, status: s.status === 'flagged' ? 'flagged' : 'completed' };
           }
           return s;
         }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDispatchInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': 'xkeysib-dbc79e86b21dd1b61ed670307a636fa84af339' + '610b0736e68f7f0ca5986951bf-oh4Tw91Xty8ElPSb',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: "TalentAI Platforms", email: "kartik.singh.dav@gmail.com" },
          to: [{ email: inviteData.candidate_email, name: inviteData.candidate_name }],
          subject: `Official Selection Invitation: AI Interview - TalentAI`,
          htmlContent: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2>Hello ${inviteData.candidate_name},</h2>
              <p>You have been invited to complete a proctored technical assessment.</p>
              <p>Please click the link below to initialize your secure terminal:</p>
              <p><a href="https://talentai-serverless-nnxlefp12-kartiksinghdav-6251s-projects.vercel.app/interview/mock-token-123" style="background: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Start AI Interview</a></p>
            </div>
          `
        })
      });
      if (response.ok) {
        setShowInviteModal(false);
        setInviteData({ candidate_name: '', candidate_email: '', target_role: 'Full Stack Engineer', time_slot: '2026-06-10T10:00' });
      } else {
        const data = await response.json();
        alert("Failed to send invite: " + JSON.stringify(data));
      }
    } catch (err) {
      console.error(err);
      alert("Network exception sending invite.");
    } finally {
      setInviteLoading(false);
    }
  };

  const getElapsedTime = (isoString: string) => {
    const start = new Date(isoString).getTime();
    const diff = Math.floor((currentTime - start) / 1000);
    const m = Math.floor(diff / 60).toString().padStart(2, '0');
    const s = (diff % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const liveSessions = sessions.filter(s => s.status === 'in_progress' || s.status === 'sent');
  const completedSessions = sessions.filter(s => s.status === 'completed' || s.status === 'flagged');

  const renderMetricStatus = (status: 'pass' | 'flag', label: string) => (
    <div className="flex items-center justify-between p-3 bg-white/50 border border-black/5 rounded-lg">
      <span className="text-sm font-semibold opacity-80">{label}</span>
      {status === 'pass' ? (
        <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded flex items-center">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
          PASS
        </span>
      ) : (
        <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded flex items-center animate-[pulse_1s_ease-in-out_infinite] shadow-[0_0_8px_rgba(239,68,68,0.4)]">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
          FLAGGED
        </span>
      )}
    </div>
  );

  return (
    <div className="min-h-screen p-8 relative max-w-[1400px] mx-auto bg-[var(--background)] pb-20">
      <header className="mb-8 flex justify-between items-end border-b border-black/5 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold mb-1 tracking-tight text-[var(--foreground)]">Command Hub</h1>
          <p className="opacity-70 text-sm font-medium">Real-time interview administration and integrity analytics</p>
        </div>
        <div className="flex items-center space-x-6">
          <button 
            onClick={() => setShowInviteModal(true)} 
            className="spring-button bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-6 py-3 rounded-xl font-bold shadow-[0_4px_14px_rgba(59,130,246,0.3)] text-sm flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            Generate Invite
          </button>
          <div className="flex items-center space-x-2 bg-black/5 px-4 py-2 rounded-full border border-black/5">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
            <span className="text-xs font-bold opacity-80 uppercase tracking-widest text-[var(--foreground)]">Supabase Live Sync</span>
          </div>
        </div>
      </header>

      {/* TOP STATS OVERVIEW DECK */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass-panel p-6 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/40">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider opacity-60">Total Invites Generated</h3>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg></div>
          </div>
          <span className="text-4xl font-extrabold">{sessions.length}</span>
        </div>
        
        <div className="glass-panel p-6 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/40 border-t-[3px] border-t-cyan-400">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider opacity-60">Live Active Terminals</h3>
            <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center text-cyan-600 animate-pulse"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></div>
          </div>
          <span className="text-4xl font-extrabold">{liveSessions.length}</span>
        </div>

        <div className="glass-panel p-6 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/40 border-t-[3px] border-t-indigo-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider opacity-60">Completed Evaluations</h3>
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
          </div>
          <span className="text-4xl font-extrabold">{completedSessions.length}</span>
        </div>
      </div>

      {/* Hollow State Vector Illustration */}
      {isLoaded && sessions.length === 0 && !expandedSession && (
        <div className="glass-panel flex flex-col items-center justify-center h-[50vh] text-center border-dashed border-2 border-black/10 bg-white/30 my-10">
          <svg className="w-24 h-24 text-[var(--accent)] opacity-20 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
          <h3 className="text-xl font-bold mb-2 text-[var(--foreground)]">Terminal Standing By</h3>
          <p className="opacity-60 max-w-sm text-sm">
            No active candidate sessions exist in the network. Construct a live invitation stream link above to initialize a proctoring instance.
          </p>
        </div>
      )}

      {/* LIVE INTERVIEWS TRACKING HUB */}
      {isLoaded && liveSessions.length > 0 && !expandedSession && (
        <div className="mb-14">
          <h2 className="text-xl font-bold mb-6 flex items-center text-[var(--foreground)] border-b border-black/5 pb-2">
            <span className="w-3 h-3 bg-cyan-500 rounded-full mr-3 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
            Live Operational Feeds
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveSessions.map(session => (
              <div 
                key={session.id} 
                onClick={() => setExpandedSession(session)}
                className="glass-panel p-6 hover:-translate-y-1 transition-transform cursor-pointer relative overflow-hidden bg-white/40 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500 animate-[pulse_2s_ease-in-out_infinite]"></div>
                
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h4 className="font-extrabold text-lg text-[var(--foreground)]">{session.candidate_name}</h4>
                    <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest text-[var(--foreground)] mt-1">{session.target_role}</p>
                  </div>
                  <div className="text-right">
                     <span className="text-xs font-mono font-bold bg-cyan-50 text-cyan-700 px-2 py-1 rounded border border-cyan-200">
                       {getElapsedTime(session.created_at || new Date().toISOString())}
                     </span>
                  </div>
                </div>
                
                <div className="aspect-video bg-[#0f172a] rounded-lg flex items-center justify-center border border-black/10 relative overflow-hidden shadow-inner mb-4">
                  <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/40 to-transparent"></div>
                  <div className="text-center z-10">
                    <span className="opacity-80 text-xs font-mono font-bold tracking-wider uppercase flex items-center justify-center text-white mb-2">
                      <span className="w-2 h-2 rounded-full mr-2 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse"></span> Stream Hooked
                    </span>
                    {session.violations.length > 0 && (
                      <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded font-mono font-bold uppercase tracking-widest">
                        {session.violations.length} Flags Detected
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMPLETED CANDIDATES MATRIX LEDGER */}
      {isLoaded && completedSessions.length > 0 && !expandedSession && (
        <div className="mb-12">
          <h2 className="text-xl font-bold mb-6 flex items-center text-[var(--foreground)] border-b border-black/5 pb-2">
            <svg className="w-5 h-5 mr-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            Historical Performance & Integrity Archives
          </h2>
          <div className="glass-panel overflow-hidden bg-white/60">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/5 border-b border-black/10">
                  <th className="p-4 text-xs font-bold uppercase tracking-widest opacity-60">Candidate Identity</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest opacity-60">Targeted Job Role</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest opacity-60">Submission Timestamp</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest opacity-60 text-center">AI Competency Rating</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest opacity-60 text-right">Compliance Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {completedSessions.map(session => (
                  <tr 
                    key={session.id} 
                    onClick={() => setExpandedSession(session)}
                    className="hover:bg-white/80 transition-colors cursor-pointer group"
                  >
                    <td className="p-4">
                      <div className="font-bold text-[var(--foreground)]">{session.candidate_name}</div>
                      <div className="text-xs opacity-60">{session.candidate_email || "N/A"}</div>
                    </td>
                    <td className="p-4 font-medium text-sm">{session.target_role}</td>
                    <td className="p-4 text-sm font-mono opacity-70">
                      {new Date(session.created_at).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-block bg-indigo-50 text-indigo-700 font-extrabold font-mono text-sm px-3 py-1 rounded border border-indigo-100 group-hover:scale-105 transition-transform">
                        {session.ai_score ? `${session.ai_score.toFixed(2)} / 10.00` : 'Pending'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {session.status === 'flagged' ? (
                        <span className="inline-flex items-center bg-red-100 text-red-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm animate-[pulse_1.5s_ease-in-out_infinite]">
                          <span className="w-1.5 h-1.5 bg-red-600 rounded-full mr-2"></span> FLAGGED
                        </span>
                      ) : (
                        <span className="inline-flex items-center bg-green-100 text-green-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                          <span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-2"></span> PASSED
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
              <p className="opacity-70 text-sm ml-6 font-mono mt-1 font-bold">SESSION_ID: {expandedSession.id} • {expandedSession.target_role}</p>
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
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                Subject Camera Array
              </h3>
              <div className="flex-1 bg-[#0f172a] rounded-lg overflow-hidden flex items-center justify-center relative border border-black/20 shadow-inner">
                <span className="text-white/30 font-mono text-sm font-bold tracking-wider uppercase">Tracking Micro-Expressions [WebRTC Hooked]</span>
                <div className="absolute top-4 right-4 bg-red-500/20 text-red-500 text-xs px-2 py-1 rounded font-mono border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse">REC</div>
              </div>
            </div>
            
            {/* Right Column: Desktop Share */}
            <div className="glass-panel p-6 flex flex-col">
              <h3 className="text-xs font-bold opacity-50 mb-3 uppercase tracking-widest flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                Display Surface Track
              </h3>
              <div className="flex-1 bg-[#1e293b] rounded-lg overflow-hidden flex items-center justify-center border border-black/20 relative shadow-inner">
                <span className="text-white/30 text-sm font-mono font-bold tracking-wider uppercase">Full Desktop Broadcast Syncing...</span>
                <div className="absolute top-4 right-4 bg-red-500/20 text-red-500 text-xs px-2 py-1 rounded font-mono border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse">REC</div>
              </div>
            </div>
          </div>

          {/* Hiring Report Card Matrix */}
          <div className="glass-panel p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-extrabold flex items-center text-[var(--foreground)]">
                <svg className="w-6 h-6 mr-3 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Integrity Report Card
              </h3>
              {expandedSession.ai_score && (
                <div className="bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-lg flex items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 mr-3">AI Evaluation Score</span>
                  <span className="font-mono font-extrabold text-xl text-indigo-900">{expandedSession.ai_score.toFixed(2)} / 10.00</span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {renderMetricStatus(expandedSession.metrics.identity, 'Identity Check')}
              {renderMetricStatus(expandedSession.metrics.isolation, 'Frame Isolation')}
              {renderMetricStatus(expandedSession.metrics.integrity, 'Window Integrity')}
              {renderMetricStatus(expandedSession.metrics.gaze, 'Gaze Tracking')}
              {renderMetricStatus(expandedSession.metrics.acoustic, 'Acoustic Env')}
            </div>
            
            {expandedSession.status === 'flagged' && expandedSession.violations.length > 0 && (
              <div className="mt-6 p-5 bg-red-50 border border-red-200 rounded-xl shadow-inner max-h-48 overflow-y-auto">
                <h4 className="text-red-800 font-bold text-sm mb-3 uppercase tracking-wider flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  Critical Violation Timeline
                </h4>
                <ul className="space-y-3 text-sm font-mono text-red-700">
                  {expandedSession.violations.map((v, i) => (
                    <li key={i} className="flex items-start bg-white/50 p-2 rounded border border-red-100">
                      <span className="font-bold mr-3 opacity-80 min-w-[80px]">{new Date(v.created_at || Date.now()).toLocaleTimeString()}</span>
                      <span className="font-semibold uppercase opacity-70 mr-2">[{v.violation_type}]</span>
                      <span>{v.details}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cognitive Modal Generator */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <form onSubmit={handleDispatchInvite} className="glass-panel w-full max-w-lg p-8 relative shadow-[0_20px_60px_rgba(0,0,0,0.15)] bg-white/80">
            <button type="button" onClick={() => setShowInviteModal(false)} className="absolute top-4 right-4 opacity-50 hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <h2 className="text-2xl font-extrabold mb-6 text-[var(--foreground)] flex items-center">
              <span className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center mr-4 border border-[var(--accent)]/20 shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </span>
              Dispatch Pipeline
            </h2>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-bold opacity-60 mb-1.5 uppercase tracking-wider">Candidate Full Name</label>
                <input required type="text" value={inviteData.candidate_name} onChange={e => setInviteData({...inviteData, candidate_name: e.target.value})} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[var(--accent)] focus:outline-none transition-shadow" placeholder="Alan Turing" />
              </div>
              <div>
                <label className="block text-xs font-bold opacity-60 mb-1.5 uppercase tracking-wider">Candidate Email Address</label>
                <input required type="email" value={inviteData.candidate_email} onChange={e => setInviteData({...inviteData, candidate_email: e.target.value})} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[var(--accent)] focus:outline-none transition-shadow" placeholder="alan@example.com" />
              </div>
              <div>
                <label className="block text-xs font-bold opacity-60 mb-1.5 uppercase tracking-wider">Targeted Job Specification</label>
                <select value={inviteData.target_role} onChange={e => setInviteData({...inviteData, target_role: e.target.value})} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[var(--accent)] focus:outline-none appearance-none transition-shadow">
                  <option>Full Stack Engineer</option>
                  <option>Frontend Architect</option>
                  <option>Backend Systems Lead</option>
                  <option>Cloud Infrastructure Manager</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold opacity-60 mb-1.5 uppercase tracking-wider">Target Time Slot (IST - Asia/Kolkata)</label>
                <input required type="datetime-local" value={inviteData.time_slot} onChange={e => setInviteData({...inviteData, time_slot: e.target.value})} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[var(--accent)] focus:outline-none transition-shadow" />
              </div>
            </div>

            <button disabled={inviteLoading} type="submit" className="spring-button w-full bg-[var(--foreground)] text-[var(--background)] font-bold py-4 rounded-xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center disabled:opacity-50">
              {inviteLoading ? (
                 <span className="flex items-center">
                   <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   Dispatching Payload...
                 </span>
              ) : 'Authorize Transactional Dispatch'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
