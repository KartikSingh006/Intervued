"use client";

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[var(--accent)] rounded-full blur-[120px] opacity-10"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-blue-400 rounded-full blur-[100px] opacity-10"></div>

      <div className="max-w-5xl w-full z-10">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-extrabold mb-4 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-500">
            TalentAI Platform
          </h1>
          <p className="text-lg opacity-70 max-w-2xl mx-auto font-medium">
            Mission-critical recruitment and automated anti-cheat environment.
          </p>
        </header>

        <div className="flex flex-col md:flex-row gap-8 items-stretch justify-center">
          
          {/* Recruiter Command Hub */}
          <div className="glass-panel p-10 flex-1 flex flex-col hover:border-black/10 transition-colors shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 shadow-inner">
               <span className="w-5 h-5 bg-[var(--accent)] rounded-md"></span>
            </div>
            <h2 className="text-2xl font-bold mb-3">Recruiter Command Hub</h2>
            <p className="opacity-70 mb-8 flex-1 leading-relaxed">
              Access the master dashboard. Generate secure tokens, monitor real-time candidate active sessions, and review high-definition stream tracks.
            </p>
            <button 
              onClick={() => router.push('/recruiter/dashboard')}
              className="spring-button bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white w-full py-4 rounded-xl font-semibold shadow-[0_4px_14px_rgba(59,130,246,0.3)] flex justify-center items-center gap-2"
            >
              Enter Command Hub
              <span className="opacity-70">→</span>
            </button>
          </div>

          {/* Candidate Access Portal */}
          <div className="glass-panel p-10 flex-1 flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/30">
            <div className="w-12 h-12 bg-gray-200/50 rounded-xl flex items-center justify-center mb-6">
               <span className="w-5 h-5 border-2 border-[var(--foreground)] rounded-full opacity-50"></span>
            </div>
            <h2 className="text-2xl font-bold mb-3">Candidate Access Portal</h2>
            <p className="opacity-70 mb-8 flex-1 leading-relaxed">
              Assessment terminal entry is fully automated. Secure environments are provisioned on-the-fly via individualized token links distributed through invitation emails.
            </p>
            <div className="mt-auto bg-black/5 rounded-xl p-4 flex items-center justify-between border border-black/5">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1">Entry Status</span>
                <span className="font-mono text-sm font-semibold">Awaiting Token</span>
              </div>
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.6)]"></span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
