"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    
    // Simulate network delay for UX
    setTimeout(() => {
      if (email === 'kartik.singh.dav@gmail.com' && password === 'Intervued') {
        router.push('/recruiter/dashboard');
      } else {
        setError(true);
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[var(--background)]">
      {/* Floating Background Blur Spheres */}
      <div className="absolute top-[10%] left-[20%] w-[35vw] h-[35vw] bg-indigo-500/20 rounded-full blur-[100px] sphere-a pointer-events-none"></div>
      <div className="absolute top-[5%] right-[15%] w-[25vw] h-[25vw] bg-teal-400/20 rounded-full blur-[80px] sphere-b pointer-events-none"></div>
      <div className="absolute bottom-[10%] left-[10%] w-[30vw] h-[30vw] bg-violet-500/15 rounded-full blur-[90px] sphere-c pointer-events-none"></div>

      <div className="max-w-md w-full z-10 px-6">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold mb-3 tracking-tight text-[var(--foreground)] drop-shadow-sm">
            TalentAI Platform
          </h1>
          <p className="text-sm opacity-60 font-medium">
            Secure Recruiter Authentication
          </p>
        </header>

        {/* Centralized Recruiter Hub Login Panel */}
        <form onSubmit={handleLogin} className="glass-panel p-8 flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-teal-400"></div>
          
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-6 shadow-sm border border-black/5 mx-auto">
             <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          
          <div className="mb-5">
            <label className="block text-xs font-bold text-[var(--foreground)] opacity-70 mb-2 uppercase tracking-wider">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/80 border border-black/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="kartik.singh.dav@gmail.com"
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-[var(--foreground)] opacity-70 mb-2 uppercase tracking-wider">Master Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/80 border border-black/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="•••••••••"
            />
          </div>

          {error && (
            <div className="mb-6 bg-red-50 text-red-600 text-xs font-semibold px-4 py-3 rounded-lg border border-red-100 flex items-center animate-[pulse-scale_0.3s_ease-out]">
              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Unauthorized access. Invalid credentials provided.
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="spring-button bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white w-full py-3.5 rounded-xl font-bold shadow-[0_4px_14px_rgba(79,70,229,0.3)] disabled:opacity-70 disabled:cursor-not-allowed transition-all relative overflow-hidden"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Authenticating...
              </span>
            ) : "Access Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
