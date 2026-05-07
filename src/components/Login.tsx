import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Mail, Lock, ChevronRight, Github, Chrome, Apple, Facebook, User, ArrowRight, ArrowLeft, RefreshCw, CheckCircle2, ShieldCheck, AlertCircle, Shield, Eye, EyeOff } from 'lucide-react';

import { cn } from '../lib/utils';
import { authApi } from '../lib/api';

interface LoginProps {
  onLogin: (name: string, isGuest?: boolean) => void;
}

type ViewMode = 'auth' | 'forgot' | 'verify';

export default function Login({ onLogin }: LoginProps) {
  const [view, setView] = useState<ViewMode>('auth');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);


  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await authApi.resendOtp(email);
      setSuccess('New code sent! Check your email.');
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    if (view === 'forgot') {
      setTimeout(() => {
        setIsSubmitted(true);
        setIsLoading(false);
      }, 2000);
      return;
    }

    if (view === 'verify') {
      try {
        const data = await authApi.verifyOtp(email, otp);
        onLogin(data.user.name);
      } catch (err: any) {
        setError(err.message || 'Verification failed');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      if (isLogin) {
        await authApi.login(email, password);
        onLogin('Summbix User');
      } else {
        await authApi.register(email, password, name);
        // Registration success: Move to OTP verification
        setView('verify');
        setSuccess("Transmission successful. Enter the 6-digit verification sequence sent to your node.");
      }
    } catch (err: any) {
      // Map common error messages for better UX
      let friendlyError = err.message;
      if (err.message.includes('403')) {
        friendlyError = "Identity not verified. Redirecting to verification terminal...";
        setError(friendlyError);
        setTimeout(() => setView('verify'), 2000);
      } else if (err.message.includes('409') || err.message.toLowerCase().includes('already registered')) {
        friendlyError = "Identity already exists. Try signing in instead.";
      } else if (err.message.includes('401') || err.message.toLowerCase().includes('invalid')) {
        friendlyError = "Security credentials mismatch. Please verify and retry.";
      } else if (err.message.toLowerCase().includes('at least 8 characters')) {
        friendlyError = "Encryption too weak. Password must be at least 8 characters.";
      }
      setError(friendlyError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authApi.devLogin();
      onLogin(data.user.name);
    } catch (err: any) {
      setError(err.message || 'Dev login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const SuccessDisplay = ({ message }: { message: string }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 flex items-center gap-3 shadow-sm"
    >
      <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
        <CheckCircle2 className="w-5 h-5 text-green-500" />
      </div>
      <p className="text-[11px] font-black uppercase tracking-wider text-green-600 leading-tight">
        {message}
      </p>
    </motion.div>
  );

  const ErrorDisplay = ({ message }: { message: string }) => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: [0, -10, 10, -10, 10, 0] }}
      className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 flex items-center gap-3 shadow-sm"
    >
      <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
        <AlertCircle className="w-5 h-5 text-red-500" />
      </div>
      <p className="text-[11px] font-black uppercase tracking-wider text-red-600 leading-tight">
        {message}
      </p>
    </motion.div>
  );

  const LoadingOverlay = () => {
    const [statusIndex, setStatusIndex] = useState(0);
    const statuses = [
      "Accessing Core Node...",
      "Verifying Security Credentials...",
      "Establishing Neural Link...",
      "Decrypting Identity Fragment...",
      "Authorizing System Access..."
    ];

    useEffect(() => {
      const interval = setInterval(() => {
        setStatusIndex((prev) => (prev + 1) % statuses.length);
      }, 800);
      return () => clearInterval(interval);
    }, []);

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-text/90 backdrop-blur-xl"
      >
        <div className="relative flex flex-col items-center">
          {/* Central Scanning Animation */}
          <div className="relative w-40 h-40 mb-10">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-4 border-dashed border-brand-primary/30 rounded-full"
            />
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-4 border-2 border-brand-orange/40 rounded-full"
            />
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-12 bg-gradient-to-br from-brand-primary to-brand-orange rounded-3xl shadow-[0_0_50px_rgba(227,133,105,0.5)] flex items-center justify-center"
            >
              <ShieldCheck className="w-8 h-8 text-white" />
            </motion.div>
            
            {/* Pulsing Rings */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}
                className="absolute inset-0 border border-brand-primary rounded-full"
              />
            ))}
          </div>

          <div className="text-center space-y-3">
            <motion.div 
              key={statusIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-white text-xs font-black uppercase tracking-[0.4em]"
            >
              {statuses[statusIndex]}
            </motion.div>
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mx-auto">
              <motion.div 
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-1/2 h-full bg-gradient-to-r from-transparent via-brand-primary to-transparent"
              />
            </div>
          </div>
        </div>
        
        {/* Background Decorative Tech lines */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ x: "-100%", y: Math.random() * 100 + "%" }}
              animate={{ x: "200%" }}
              transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: i * 0.5 }}
              className="absolute h-px w-64 bg-gradient-to-r from-transparent via-brand-primary to-transparent"
            />
          ))}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-[#fdf8f4] flex items-center justify-center p-4 md:p-12 relative overflow-hidden font-sans bg-grain [perspective:2000px]">
      <AnimatePresence>
        {isLoading && <LoadingOverlay />}
      </AnimatePresence>

      {/* 🌌 Ultra-Dense Atmospheric Background */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        <div className="absolute inset-0 opacity-[0.4] mix-blend-soft-light bg-[url('https://www.transparenttextures.com/patterns/p6-dark.png')]" />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#e38569 1.5px, transparent 1.5px), linear-gradient(90deg, #e38569 1.5px, transparent 1.5px)', backgroundSize: '40px 40px' }} />
        
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[10%] -left-10 text-[18vw] font-black text-brand-primary/[0.04] leading-none select-none italic">SUMMBIX</div>
          <div className="absolute bottom-[5%] -right-10 text-[15vw] font-black text-brand-primary/[0.04] leading-none select-none">DISCIPLINE</div>
        </div>

        {/* Animated Scanning Lines */}
        <motion.div 
          animate={{ y: ["-100%", "200%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 left-0 w-full h-[40vh] bg-gradient-to-b from-transparent via-brand-primary/[0.08] to-transparent z-10"
        />

        {/* Floating Data Nodes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0.5, 1.2, 0.5],
                x: Math.random() * 100 + "%",
                y: Math.random() * 100 + "%"
              }}
              transition={{ duration: 5 + Math.random() * 5, repeat: Infinity, delay: i * 2 }}
              className="absolute w-1 h-1 bg-brand-primary rounded-full shadow-[0_0_10px_#e38569]"
            />
          ))}
        </div>

        <motion.div
          animate={{
            x: [0, 150, -100, 0],
            y: [0, -120, 150, 0],
            scale: [1, 1.4, 0.9, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-brand-primary/15 blur-[150px] rounded-full"
        />
      </div>

      {/* 3D FLIP CONTAINER */}
      <motion.div
        animate={{
          rotateY: view === 'auth' ? 0 : 180,
        }}
        transition={{ type: "spring", stiffness: 60, damping: 15 }}
        style={{ transformStyle: 'preserve-3d' }}
        className="w-full max-w-5xl min-h-[600px] md:h-[750px] relative z-10"
      >
        {/* FRONT SIDE (Login / Sign-up) */}
        <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] z-20">
          <div className="w-full h-full bg-white rounded-[2.5rem] md:rounded-[3.5rem] shadow-[0_40px_100px_rgba(227,133,105,0.12)] md:shadow-[0_60px_150px_rgba(227,133,105,0.15)] overflow-hidden relative border border-white group">
            {/* Corner Brackets Decorations */}
            <div className="absolute top-6 left-6 md:top-8 md:left-8 w-8 h-8 md:w-12 md:h-12 border-t-2 border-l-2 border-brand-primary/10 rounded-tl-xl md:rounded-tl-2xl z-30 group-hover:border-brand-primary/30 transition-colors" />
            <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 w-8 h-8 md:w-12 md:h-12 border-b-2 border-r-2 border-brand-primary/10 rounded-br-xl md:rounded-br-2xl z-30 group-hover:border-brand-primary/30 transition-colors" />

            {/* SLIDING OVERLAY (The Picture Side) */}
            <motion.div
              initial={false}
              animate={{ x: isLogin ? '0%' : '100%' }}
              transition={{ type: "spring", stiffness: 100, damping: 22 }}
              className="absolute top-0 left-0 w-1/2 h-full z-20 overflow-hidden hidden md:block"
            >
              <div className="w-full h-full bg-brand-primary relative">
                <div className="absolute inset-0">
                  <img
                    src="https://i.pinimg.com/originals/af/87/99/af87995811f6dfbc58b2be249669df32.gif"
                    className="w-full h-full object-cover"
                    alt="Background"
                  />
                  {/* Overlay gelap agar teks tetap mudah dibaca */}
                  <div className="absolute inset-0 bg-brand-primary/40" />
                </div>

                <div className="relative h-full w-full p-16 flex flex-col items-center justify-center text-white text-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isLogin ? 'overlay-login' : 'overlay-signup'}
                      initial={{ opacity: 0, x: isLogin ? 50 : -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: isLogin ? -50 : 50 }}
                      transition={{ duration: 0.4 }}
                      className="space-y-8"
                    >
                      <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-[3.5rem] flex items-center justify-center mx-auto shadow-2xl border border-white/30 overflow-hidden p-4">
                        <img src="/logo_putih.png" alt="Summbix Logo" className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h2 className="text-4xl font-black mb-4 tracking-tighter leading-tight uppercase">
                          {isLogin ? "READY TO FOCUS?" : "START YOUR LEGACY"}
                        </h2>
                        <p className="text-white/80 font-medium max-w-xs mx-auto leading-relaxed">
                          {isLogin
                            ? "Enter your personal node to continue your path to absolute discipline."
                            : "Join the elite circle of strategic masters and conquer your goals."}
                        </p>
                      </div>
                      <button
                        onClick={() => { setIsLogin(!isLogin); setError(null); setSuccess(null); }}
                        className="group relative px-10 py-4 bg-white text-brand-primary font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all overflow-hidden"
                      >
                        <span className="relative z-10 flex items-center gap-2 font-black">
                          {isLogin ? "Join Summbix" : "Sign In instead"}
                          {isLogin ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                        </span>
                      </button>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            {/* FORMS CONTAINER */}
            <div className="relative w-full h-full flex flex-col md:flex-row overflow-hidden bg-white">
              {/* SIGN UP FORM */}
              <motion.div
                animate={{ x: isLogin ? '-100%' : '0%', opacity: isLogin ? 0 : 1 }}
                transition={{ type: "spring", stiffness: 100, damping: 22 }}
                className="w-full md:w-1/2 h-full flex flex-col justify-center p-6 sm:p-10 md:p-20"
              >
                <div className="max-w-md mx-auto w-full">
                  <div className="mb-10">
                    <h3 className="text-2xl md:text-4xl font-black text-brand-text mb-2 tracking-tight">Create Node</h3>
                    <p className="text-brand-text-light font-medium">Initialize your strategic discipline interface.</p>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-brand-text-light/50 uppercase tracking-widest ml-1">Full Name</label>
                      <div className="relative group">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-light/30 group-focus-within:text-brand-primary transition-colors" />
                        <input 
                          type="text" 
                          value={name} 
                          onChange={(e) => setName(e.target.value)} 
                          placeholder="Summbix Agent" 
                          className="w-full bg-brand-bg/30 border border-brand-primary/10 rounded-2xl py-4 pl-12 pr-5 text-sm font-bold text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/5 focus:bg-white focus:border-brand-primary/20 transition-all" 
                          required={!isLogin} 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-brand-text-light/50 uppercase tracking-widest ml-1">Email</label>
                      <div className="relative group">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-light/30 group-focus-within:text-brand-primary transition-colors" />
                        <input 
                          type="email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          placeholder="agent@summbix.com" 
                          className="w-full bg-brand-bg/30 border border-brand-primary/10 rounded-2xl py-4 pl-12 pr-5 text-sm font-bold text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/5 focus:bg-white focus:border-brand-primary/20 transition-all" 
                          required 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-brand-text-light/50 uppercase tracking-widest ml-1">Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-light/30 group-focus-within:text-brand-primary transition-colors" />
                        <input
                          type={showSignupPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min. 8 characters"
                          className="w-full bg-brand-bg/30 border border-brand-primary/10 rounded-2xl py-4 pl-12 pr-12 text-sm font-bold text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/5 focus:bg-white focus:border-brand-primary/20 transition-all"
                          required={!isLogin}
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-text-light/30 hover:text-brand-primary transition-colors"
                        >
                          {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {error && !isLogin && <ErrorDisplay message={error} />}
                    </AnimatePresence>
                    <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-brand-primary to-brand-orange text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                      {isLoading ? "Initializing..." : "Initialize Node"}
                    </button>
                  </form>
                  {/* Mobile toggle for signup */}
                  <div className="mt-6 text-center md:hidden">
                    <p className="text-[10px] font-bold text-brand-text-light/50 uppercase tracking-widest mb-2">Already have an account?</p>
                    <button
                      onClick={() => { setIsLogin(true); setError(null); setSuccess(null); }}
                      className="text-brand-primary font-black text-xs uppercase tracking-widest hover:underline"
                    >
                      Sign In Instead →
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* LOGIN FORM */}
              <motion.div
                animate={{ x: isLogin ? '0%' : '100%', opacity: isLogin ? 1 : 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 22 }}
                className="w-full md:w-1/2 h-full flex flex-col justify-center p-6 sm:p-10 md:p-20"
              >
                <div className="max-w-md mx-auto w-full">
                  <div className="mb-10 text-right md:text-left">
                    <h3 className="text-2xl md:text-4xl font-black text-brand-primary mb-2 tracking-tight">Access Node</h3>
                    <p className="text-brand-text-light font-medium">Connect to your discipline sequence.</p>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-brand-text-light/50 uppercase tracking-widest ml-1">Email</label>
                      <div className="relative group">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-light/30 group-focus-within:text-brand-primary transition-colors" />
                        <input 
                          type="email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          placeholder="agent@summbix.com" 
                          className="w-full bg-brand-bg/30 border border-brand-primary/10 rounded-2xl py-4 pl-12 pr-5 text-sm font-bold text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/5 focus:bg-white focus:border-brand-primary/20 transition-all" 
                          required 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-black text-brand-text-light/50 uppercase tracking-widest">Password</label>
                        <button type="button" onClick={() => setView('forgot')} className="text-[10px] font-bold text-brand-text-light/40 hover:text-brand-primary transition-colors">forgot password?</button>
                      </div>
                      <div className="relative group">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-light/30 group-focus-within:text-brand-primary transition-colors" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-brand-bg/30 border border-brand-primary/10 rounded-2xl py-4 pl-12 pr-12 text-sm font-bold text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/5 focus:bg-white focus:border-brand-primary/20 transition-all"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-text-light/30 hover:text-brand-primary transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {success && isLogin && <SuccessDisplay message={success} />}
                      {error && isLogin && <ErrorDisplay message={error} />}
                    </AnimatePresence>
                    <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-brand-primary to-brand-orange text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                      {isLoading ? "Authenticating..." : "Sign In"}
                    </button>
                    <div className="relative pt-4 flex flex-col gap-4">
                      {/* Developer Login Button - Only visible on localhost */}
                      {window.location.hostname === 'localhost' && (
                        <button
                          type="button"
                          onClick={handleDevLogin}
                          disabled={isLoading}
                          className="w-full bg-brand-orange/10 border-2 border-brand-orange/20 text-brand-orange py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-brand-orange/20 transition-all flex items-center justify-center gap-3 mb-2 shadow-lg shadow-brand-orange/5"
                        >
                          <ShieldCheck className="w-4 h-4" /> Login as Admin (Dev)
                        </button>
                      )}

                      <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-brand-primary/10" />
                        <span className="text-[10px] font-black text-brand-text-light/30 uppercase tracking-widest">Or Explore</span>
                        <div className="h-px flex-1 bg-brand-primary/10" />
                      </div>
                      <button
                        type="button"
                        onClick={() => onLogin("Guest User", true)}
                        className="w-full bg-white border-2 border-brand-primary/20 text-brand-primary py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-brand-bg transition-all flex items-center justify-center gap-3"
                      >
                        <User className="w-4 h-4" /> Try Guest Mode
                      </button>
                      {/* Mobile toggle for login */}
                      <div className="mt-4 text-center md:hidden">
                        <p className="text-[10px] font-bold text-brand-text-light/50 uppercase tracking-widest mb-2">Don't have an account?</p>
                        <button
                          onClick={() => { setIsLogin(false); setError(null); setSuccess(null); }}
                          className="text-brand-primary font-black text-xs uppercase tracking-widest hover:underline"
                        >
                          Create Account →
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* BACK SIDE (OTP Verification & Forgot Password) */}
        <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] z-10">
          <div className="w-full h-full bg-brand-bg rounded-[2.5rem] md:rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.08)] md:shadow-[0_60px_150px_rgba(0,0,0,0.1)] overflow-hidden relative border border-white flex flex-col items-center justify-center p-6 sm:p-8 md:p-12 text-center">
            {/* Security Grid Background */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#e38569 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

            <div className="relative z-10 max-w-lg w-full space-y-10">
              {view === 'verify' ? (
                <>
                  <div className="relative inline-block">
                    <div className="w-32 h-32 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center mx-auto border border-brand-primary/5 relative z-10">
                      <Shield className={cn("w-16 h-16 text-brand-primary", isLoading && "animate-pulse")} />
                    </div>
                    <motion.div animate={{ rotate: -360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute -inset-4 border-2 border-dashed border-brand-primary/20 rounded-[3rem] pointer-events-none" />
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-3xl md:text-5xl font-black text-brand-text tracking-tighter uppercase italic italic-gradient bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-orange">
                      Verify Identity
                    </h2>
                    <p className="text-brand-text-light font-medium leading-relaxed text-lg">
                      Enter the 6-digit code sent to your email <span className="text-brand-primary font-black">{email}</span>. Check your inbox or spam folder.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-8 max-w-md mx-auto pt-6">
                    <AnimatePresence>
                      {success && <SuccessDisplay message={success} />}
                      {error && <ErrorDisplay message={error} />}
                    </AnimatePresence>

                    <div className="relative">
                      <input
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="w-full bg-white border-2 border-brand-primary/10 rounded-[2rem] py-8 text-center text-4xl font-black tracking-[0.5em] text-brand-primary placeholder:text-brand-primary/10 focus:outline-none focus:ring-8 focus:ring-brand-primary/5 focus:border-brand-primary/30 transition-all shadow-inner"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-4">
                      <button type="submit" disabled={isLoading || otp.length < 6} className="w-full py-6 bg-brand-primary text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-2xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-30">
                        {isLoading ? "Decrypting..." : "Authorize Access"}
                      </button>
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendCooldown > 0}
                        className="w-full py-4 border-2 border-brand-primary/20 text-brand-primary font-black text-[11px] uppercase tracking-widest rounded-2xl hover:bg-brand-primary/5 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-3 h-3" />
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code to Email'}
                      </button>
                      <button type="button" onClick={() => { setView('auth'); setError(null); setSuccess(null); }} className="text-brand-text-light/60 hover:text-brand-primary font-black text-[11px] uppercase tracking-widest transition-colors py-2 flex items-center justify-center gap-2">
                        <ArrowLeft className="w-3 h-3" /> return to authentication
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <div className="relative inline-block">
                    <div className="w-32 h-32 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center mx-auto border border-brand-primary/5 relative z-10">
                      {isSubmitted ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><CheckCircle2 className="w-16 h-16 text-green-500" /></motion.div>
                      ) : (
                        <RefreshCw className={cn("w-16 h-16 text-brand-primary", isLoading && "animate-spin")} />
                      )}
                    </div>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute -inset-4 border-2 border-dashed border-brand-primary/20 rounded-[3rem] pointer-events-none" />
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-3xl md:text-5xl font-black text-brand-text tracking-tighter uppercase italic italic-gradient bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-orange">
                      {isSubmitted ? "Link Transmitted" : "Security Breach?"}
                    </h2>
                    <p className="text-brand-text-light font-medium leading-relaxed text-lg">
                      {isSubmitted
                        ? "A high-security recovery node has been established in your inbox."
                        : "Initialize a secure password reset sequence to regain dashboard access."}
                    </p>
                  </div>

                  <AnimatePresence mode="wait">
                    {isSubmitted ? (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pt-6">
                        <button
                          onClick={() => { setView('auth'); setIsSubmitted(false); }}
                          className="px-12 py-5 bg-brand-primary text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 mx-auto"
                        >
                          <ArrowLeft className="w-4 h-4" /> Return to Terminal
                        </button>
                        <p className="text-[10px] font-black text-brand-text-light/40 uppercase tracking-[0.2em]">Expires in 15:00 minutes</p>
                      </motion.div>
                    ) : (
                      <motion.form
                        key="forgot-form"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        onSubmit={handleSubmit}
                        className="space-y-6 w-full max-w-md mx-auto pt-6"
                      >
                        <div className="relative group">
                          <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-light/30 group-focus-within:text-brand-primary transition-colors" />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="agent@summbix.com"
                            className="w-full bg-white border border-brand-primary/10 rounded-2xl py-6 pl-14 pr-6 text-brand-text placeholder:text-brand-text-light/30 focus:outline-none focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary/30 transition-all text-sm font-bold shadow-sm"
                          />
                        </div>
                        <div className="flex flex-col gap-4">
                          <button type="submit" disabled={isLoading} className="w-full py-6 bg-brand-primary text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-2xl hover:opacity-90 active:scale-[0.98] transition-all">
                            {isLoading ? "Synchronizing..." : "Initiate Recovery"}
                          </button>
                          <button type="button" onClick={() => setView('auth')} className="text-brand-text-light/60 hover:text-brand-primary font-black text-[11px] uppercase tracking-widest transition-colors py-2 flex items-center justify-center gap-2">
                            <ArrowLeft className="w-3 h-3" /> cancel sequence
                          </button>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </>
              )}

              {/* Bottom Security Info */}
              <div className="pt-10 flex items-center justify-center gap-8 opacity-40">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-text" />
                  <span className="text-[10px] font-black uppercase tracking-widest">End-to-End Encryption</span>
                </div>
                <div className="w-1 h-1 bg-brand-text rounded-full" />
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-brand-text" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Summbix Core v2.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
