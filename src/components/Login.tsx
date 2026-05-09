import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Eye, EyeOff, Check, Chrome, ShieldCheck, Mail, Lock, 
  User, RefreshCw, ArrowRight, Shield, CheckCircle2, Zap 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { authApi } from '../lib/api';

interface LoginProps {
  onLogin: (name: string, isGuest?: boolean) => void;
}

type ViewMode = 'auth' | 'forgot' | 'verify';

// --- Sub-components for Desktop ---

const LoadingOverlay = ({ status }: { status: string }) => (
  <motion.div 
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-bg/80 backdrop-blur-xl"
  >
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <div className="w-24 h-24 border-4 border-brand-primary/10 rounded-full" />
        <motion.div 
          animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 border-4 border-t-brand-primary rounded-full"
        />
        <img src="/logo_hitam.png" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 object-contain" alt="Summbix" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-xl font-black text-brand-text uppercase tracking-widest">{status}</h3>
        <p className="text-brand-text-light font-bold text-xs uppercase tracking-widest animate-pulse">Establishing Secure Node...</p>
      </div>
    </div>
  </motion.div>
);

const ErrorDisplay = ({ message }: { message: string }) => (
  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-3">
    <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center shrink-0 p-1">
      <img src="/logo_hitam.png" className="w-full h-full object-contain grayscale" alt="Error" />
    </div>
    <p className="text-[10px] font-black uppercase tracking-widest text-red-500 leading-tight">{message}</p>
  </motion.div>
);

const SuccessDisplay = ({ message }: { message: string }) => (
  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center gap-3">
    <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
      <CheckCircle2 className="w-3 h-3 text-green-500" />
    </div>
    <p className="text-[10px] font-black uppercase tracking-widest text-green-500 leading-tight">{message}</p>
  </motion.div>
);

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
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle OTP resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (view === 'forgot') {
        setTimeout(() => {
          setIsSubmitted(true);
          setIsLoading(false);
        }, 1500);
        return;
      }

      if (view === 'verify') {
        const data = await authApi.verifyOtp(email, otp);
        onLogin(data.user.name);
        return;
      }

      if (isLogin) {
        await authApi.login(email, password);
        onLogin('Summbix User');
      } else {
        await authApi.register(email, password, name);
        setView('verify');
        setSuccess('Verification code sent to your email.');
      }
    } catch (err: any) {
      let friendlyError = err.message || 'An error occurred';
      if (err.message?.includes('403')) {
        setView('verify');
        friendlyError = 'Please verify your identity.';
      }
      setError(friendlyError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await authApi.resendOtp(email);
      setSuccess('Code resent successfully.');
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
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

  if (isMobile) {
    // --- MOBILE VIEW (Premium Light Brand Theme) ---
    return (
      <div className="min-h-screen w-full bg-brand-bg flex items-center justify-center font-sans overflow-hidden p-6 relative">
        {/* Soft Atmospheric Background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute -top-1/4 -right-1/4 w-[80%] h-[80%] bg-brand-primary/20 blur-[120px] rounded-full" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-1/4 -left-1/4 w-[70%] h-[70%] bg-brand-orange/20 blur-[100px] rounded-full" 
          />
        </div>

        <div className="relative z-10 w-full max-w-sm flex flex-col min-h-[95vh]">
          {/* Top Brand Header */}
          <div className="flex items-center justify-between mb-10">
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center"
            >
              <img src="/logo_hitam.png" alt="Summbix Logo" className="h-8 w-auto object-contain" />
            </motion.div>
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (view !== 'auth') setView('auth');
                else if (!isLogin) setIsLogin(true);
              }}
              className="w-10 h-10 bg-white/60 border border-white rounded-xl flex items-center justify-center text-brand-text/60 shadow-sm backdrop-blur-md"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          </div>

          <AnimatePresence mode="wait">
            {view === 'auth' ? (
              <motion.div
                key="auth"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col"
              >
                {/* Visual Card */}
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="relative w-full aspect-video mb-10 rounded-[2.5rem] overflow-hidden border border-white bg-white/40 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl"
                >
                  <img
                    src="https://i.pinimg.com/originals/0b/9d/d1/0b9dd1013d1a1e8e1a5c91f0967dcac9.gif"
                    alt="Art"
                    className="w-full h-full object-cover rounded-[2rem]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-bg/60 via-transparent to-transparent" />
                  
                  <div className="absolute bottom-6 left-6 right-6">
                    <h2 className="text-xl font-black text-brand-text uppercase tracking-tight leading-none">
                      {isLogin ? "Welcome Back" : "Start Journey"}
                    </h2>
                    <p className="text-brand-text-light text-[10px] font-black uppercase tracking-[0.2em] mt-2 opacity-60">System Version 2.4.0</p>
                  </div>
                </motion.div>

                {/* Form Section */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-1">
                      <div className="relative group">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-light/30 group-focus-within:text-brand-primary transition-colors" />
                        <input
                          type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="FULL NAME"
                          className="w-full bg-white/70 backdrop-blur-md border border-white rounded-2xl py-5 pl-14 pr-6 text-sm font-bold text-brand-text placeholder:text-brand-text-light/30 focus:outline-none focus:border-brand-primary/20 transition-all shadow-sm"
                          required={!isLogin}
                        />
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-1">
                    <div className="relative group">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-light/30 group-focus-within:text-brand-primary transition-colors" />
                      <input
                        type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="EMAIL ADDRESS"
                        className="w-full bg-white/70 backdrop-blur-md border border-white rounded-2xl py-5 pl-14 pr-6 text-sm font-bold text-brand-text placeholder:text-brand-text-light/30 focus:outline-none focus:border-brand-primary/20 transition-all shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="relative group">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-light/30 group-focus-within:text-brand-primary transition-colors" />
                      <input
                        type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="PASSWORD"
                        className="w-full bg-white/70 backdrop-blur-md border border-white rounded-2xl py-5 pl-14 pr-14 text-sm font-bold text-brand-text placeholder:text-brand-text-light/30 focus:outline-none focus:border-brand-primary/20 transition-all shadow-sm"
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-brand-text-light/30 hover:text-brand-primary">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-2 pt-2">
                    <button type="button" onClick={() => setView('forgot')} className="text-[10px] font-black text-brand-text-light uppercase tracking-widest hover:text-brand-primary transition-colors">Forgot Key?</button>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <span className="text-[10px] font-black text-brand-text-light uppercase tracking-widest group-hover:text-brand-primary transition-colors">Keep Session</span>
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-8 h-4 bg-black/5 rounded-full relative peer-checked:bg-brand-primary transition-colors shadow-inner">
                        <div className="absolute top-1 left-1 w-2 h-2 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm" />
                      </div>
                    </label>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-3">
                        <img src="/logo_hitam.png" className="w-3 h-3 grayscale opacity-50" alt="Error" />
                        <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="pt-4 space-y-4">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      type="submit" disabled={isLoading}
                      className="w-full h-16 bg-gradient-to-r from-brand-primary to-[#222222] text-white rounded-2xl font-black text-xs uppercase tracking-[0.4em] relative overflow-hidden group shadow-[0_20px_40px_rgba(0,0,0,0.15)]"
                    >
                      <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white/20 opacity-0 group-hover:opacity-40 group-hover:animate-shimmer" />
                      <span className="relative z-10 flex items-center justify-center gap-3">
                        {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : (
                          <>
                            {isLogin ? "Sign In" : "Sign Up"}
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </span>
                    </motion.button>

                    <div className="grid grid-cols-3 gap-3">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        type="button" onClick={() => onLogin("Guest User", true)}
                        className="bg-white/60 backdrop-blur-md border border-white text-brand-text/60 py-4 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-sm hover:bg-white transition-all"
                      >
                        Guest
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        className="bg-white/60 backdrop-blur-md border border-white text-brand-text/60 py-4 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-sm hover:bg-white transition-all"
                      >
                        Google
                      </motion.button>
                      {isLocalHost && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button" onClick={handleDevLogin}
                          className="bg-brand-primary/10 backdrop-blur-md border border-brand-primary/20 text-brand-primary py-4 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-sm hover:bg-brand-primary/20 transition-all flex items-center justify-center gap-1"
                        >
                          <Zap className="w-3 h-3" /> Dev
                        </motion.button>
                      )}
                    </div>
                  </div>

                  <div className="pt-10 text-center">
                    <button
                      type="button"
                      onClick={() => { setIsLogin(!isLogin); setError(null); }}
                      className="text-[11px] font-black text-brand-text-light uppercase tracking-[0.2em] hover:text-brand-primary transition-colors"
                    >
                      {isLogin ? (
                        <>No Account? <span className="text-brand-text">Join Now</span></>
                      ) : (
                        <>Have Account? <span className="text-brand-text">Sign In</span></>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : view === 'verify' ? (
              <motion.div
                key="verify"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col"
              >
                <div className="mb-10">
                  <h1 className="text-3xl font-black text-brand-text mb-2 uppercase tracking-tight">Verify Identity</h1>
                  <p className="text-brand-text-light font-bold text-[11px] uppercase tracking-widest">A code has been sent to <span className="text-brand-primary">{email}</span></p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="flex justify-center gap-4">
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full bg-white/70 backdrop-blur-md border border-white rounded-3xl py-8 text-center text-5xl font-black tracking-[0.3em] text-brand-primary focus:outline-none focus:ring-8 focus:ring-brand-primary/5 focus:border-brand-primary/20 transition-all shadow-sm"
                    />
                  </div>

                  <AnimatePresence>
                    {error && <p className="text-center text-[11px] font-black text-red-500 uppercase tracking-widest">{error}</p>}
                    {success && <p className="text-center text-[11px] font-black text-green-500 uppercase tracking-widest">{success}</p>}
                  </AnimatePresence>

                  <div className="space-y-4">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isLoading || otp.length < 6}
                      className="w-full bg-gradient-to-r from-brand-primary to-brand-orange text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      Verify Now
                    </motion.button>

                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendCooldown > 0}
                      className="w-full text-[11px] font-black text-brand-text-light hover:text-brand-primary uppercase tracking-widest transition-colors py-2"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Security Code"}
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex-1 flex flex-col"
              >
                <div className="mb-10">
                  <h1 className="text-3xl font-black text-brand-text mb-2 uppercase tracking-tight">Recover Node</h1>
                  <p className="text-brand-text-light font-bold uppercase tracking-widest text-[10px]">Reset your secure password node</p>
                </div>

                {isSubmitted ? (
                  <div className="bg-white/60 backdrop-blur-md rounded-[2.5rem] p-8 text-center space-y-6 border border-white shadow-sm">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <Check className="w-8 h-8 text-green-500" />
                    </div>
                    <p className="font-black text-brand-text uppercase tracking-widest text-[11px]">Recovery link sent to <span className="text-brand-primary">{email}</span></p>
                    <button
                      onClick={() => { setView('auth'); setIsSubmitted(false); }}
                      className="w-full bg-brand-primary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em]"
                    >
                      Back to Login
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-brand-text-light uppercase tracking-widest ml-1">Registered Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="EMAIL@ADDRESS.COM"
                        className="w-full bg-white/70 backdrop-blur-md border border-white rounded-2xl py-5 px-6 text-brand-text font-bold focus:outline-none focus:ring-4 focus:ring-brand-primary/5 shadow-sm"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-brand-primary text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-[0.98]"
                    >
                      {isLoading ? <RefreshCw className="w-6 h-6 animate-spin mx-auto" /> : "Initiate Recovery"}
                    </button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer info */}
          <div className="mt-auto md:mt-12 pt-8 flex items-center justify-center gap-6 opacity-40 select-none pointer-events-none">
            <div className="flex items-center gap-2">
              <img src="/logo_hitam.png" className="w-4 h-4 object-contain opacity-60" alt="Secure" />
              <span className="text-[9px] font-black uppercase tracking-widest text-brand-text">End-to-End Secure</span>
            </div>
            <div className="w-1 h-1 bg-brand-text-light rounded-full" />
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-brand-primary" />
              <span className="text-[9px] font-black uppercase tracking-widest text-brand-text">v2.4.0</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- DESKTOP VIEW (Original Design) ---
  return (
    <div className="min-h-screen w-full bg-brand-bg flex items-center justify-center p-4 sm:p-6 md:p-12 overflow-hidden font-sans relative">
      <AnimatePresence>
        {isLoading && <LoadingOverlay status={isLogin ? "Verifying Credentials" : "Creating Node"} />}
      </AnimatePresence>

      {/* Atmospheric Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-brand-primary/5 blur-[120px] rounded-full translate-x-1/4 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-brand-orange/5 blur-[100px] rounded-full -translate-x-1/4 translate-y-1/4" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-6xl aspect-[16/9] flex rounded-[3rem] overflow-hidden bg-white/40 backdrop-blur-2xl border border-white shadow-[0_40px_100px_rgba(0,0,0,0.05)]"
      >
        {/* Sliding Overlay Container */}
        <motion.div 
          animate={{ x: isLogin ? '0%' : '100%' }}
          transition={{ type: "spring", damping: 25, stiffness: 120 }}
          className="absolute top-0 left-0 w-1/2 h-full z-20 pointer-events-none"
        >
          <div className="w-full h-full p-8 md:p-12">
            <div className="w-full h-full bg-black rounded-[2.5rem] relative overflow-hidden shadow-2xl">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
              <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-[#222222] mix-blend-multiply" />
              
              <div className="relative z-10 h-full flex flex-col items-center justify-center text-white p-12 text-center space-y-8">
                <motion.div 
                  initial={false}
                  animate={{ rotate: isLogin ? 0 : 180 }}
                  className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center p-5"
                >
                  <img src="/logo_putih.png" className="w-full h-full object-contain" alt="Summbix" />
                </motion.div>
                
                <div className="space-y-4">
                  <h2 className="text-4xl font-black uppercase tracking-tight leading-none">
                    {isLogin ? "Welcome Back" : "Start Journey"}
                  </h2>
                  <p className="text-white/80 font-bold uppercase tracking-widest text-xs">
                    {isLogin ? "The path to discipline continues" : "Establish your productivity node"}
                  </p>
                </div>

                <div className="pt-8">
                  <button 
                    onClick={() => { setIsLogin(!isLogin); setError(null); setSuccess(null); }}
                    className="pointer-events-auto px-10 py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                  >
                    {isLogin ? "Create Account" : "Access Node"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Form Sections */}
        <div className="w-full h-full flex">
          {/* Sign Up Side */}
          <div className="w-1/2 h-full p-12 flex flex-col justify-center items-center">
            <div className={cn("w-full max-w-sm space-y-8 transition-all duration-500", isLogin ? "opacity-20 blur-sm grayscale pointer-events-none" : "opacity-100")}>
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-brand-text uppercase tracking-tight">Create Node</h3>
                <p className="text-brand-text-light font-bold uppercase tracking-widest text-[10px]">Initialize your system credentials</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-text-light uppercase tracking-widest ml-1">Identity</label>
                    <div className="relative">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-light/30" />
                      <input 
                        type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name"
                        className="w-full bg-white/50 border border-brand-primary/10 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/5 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-text-light uppercase tracking-widest ml-1">Email Access</label>
                    <div className="relative">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-light/30" />
                      <input 
                        type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@address.com"
                        className="w-full bg-white/50 border border-brand-primary/10 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/5 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-text-light uppercase tracking-widest ml-1">Secure Key</label>
                    <div className="relative">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-light/30" />
                      <input 
                        type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                        className="w-full bg-white/50 border border-brand-primary/10 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/5 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {error && !isLogin && <ErrorDisplay message={error} />}
                  {success && !isLogin && <SuccessDisplay message={success} />}
                </AnimatePresence>

                <button type="submit" className="w-full bg-brand-text text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Initialize Node
                </button>
              </form>
            </div>
          </div>

          {/* Login Side */}
          <div className="w-1/2 h-full p-12 flex flex-col justify-center items-center">
             <div className={cn("w-full max-w-sm space-y-8 transition-all duration-500", !isLogin ? "opacity-20 blur-sm grayscale pointer-events-none" : "opacity-100")}>
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-brand-text uppercase tracking-tight">Access Node</h3>
                <p className="text-brand-text-light font-bold uppercase tracking-widest text-[10px]">Transmission sequence authorized</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-text-light uppercase tracking-widest ml-1">Email Access</label>
                    <div className="relative">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-light/30" />
                      <input 
                        type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@address.com"
                        className="w-full bg-white/50 border border-brand-primary/10 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/5 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-brand-text-light uppercase tracking-widest">Secure Key</label>
                      <button type="button" onClick={() => setView('forgot')} className="text-[10px] font-bold text-brand-text-light/40 hover:text-brand-primary transition-colors">Forgot Key?</button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-light/30" />
                      <input 
                        type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                        className="w-full bg-white/50 border border-brand-primary/10 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/5 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {error && isLogin && <ErrorDisplay message={error} />}
                  {success && isLogin && <SuccessDisplay message={success} />}
                </AnimatePresence>

                <div className="space-y-4">
                  <button type="submit" className="w-full bg-brand-primary text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                    Authorize Access
                  </button>
                  
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-brand-primary/10" />
                    <span className="text-[9px] font-black text-brand-text-light/30 uppercase tracking-widest">Or</span>
                    <div className="h-px flex-1 bg-brand-primary/10" />
                  </div>

                  <div className="space-y-3">
                    <button 
                      type="button" 
                      onClick={() => onLogin("Guest User", true)}
                      className="w-full bg-white border border-brand-primary/10 text-brand-text py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-bg transition-all flex items-center justify-center gap-2"
                    >
                      <User className="w-3 h-3" /> Explore as Guest
                    </button>

                    {isLocalHost && (
                      <button 
                        type="button" 
                        onClick={handleDevLogin}
                        className="w-full bg-brand-primary/5 border border-brand-primary/20 text-brand-primary py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-primary/10 transition-all flex items-center justify-center gap-2"
                      >
                        <Zap className="w-3 h-3" /> Bypass Authentication (Dev Mode)
                      </button>
                    )}

                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Forgot/Verify View Overlays (Desktop) */}
      <AnimatePresence>
        {view !== 'auth' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-brand-bg/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-white rounded-[3rem] p-12 shadow-2xl border border-white relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 blur-3xl rounded-full" />
              
              <div className="relative z-10 space-y-8">
                <button onClick={() => setView('auth')} className="p-3 bg-brand-bg rounded-2xl text-brand-text-light hover:text-brand-primary transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {view === 'verify' ? (
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <h2 className="text-4xl font-black text-brand-text uppercase tracking-tight">Verify Identity</h2>
                      <p className="text-brand-text-light font-bold text-xs uppercase tracking-widest">Code sent to <span className="text-brand-primary">{email}</span></p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                      <input 
                        type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="000 000"
                        className="w-full bg-brand-bg/50 border-2 border-brand-primary/10 rounded-[2rem] py-8 text-center text-5xl font-black tracking-[0.4em] text-brand-primary focus:outline-none focus:border-brand-primary/30 transition-all"
                      />
                      <button type="submit" disabled={otp.length < 6} className="w-full bg-brand-primary text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl disabled:opacity-50">
                        Confirm Identity
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <h2 className="text-4xl font-black text-brand-text uppercase tracking-tight">Recover Key</h2>
                      <p className="text-brand-text-light font-bold text-xs uppercase tracking-widest">Enter registered email node</p>
                    </div>

                    {isSubmitted ? (
                      <div className="bg-green-50 rounded-3xl p-8 text-center space-y-4">
                        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                        <p className="font-black text-brand-text uppercase tracking-widest text-[10px]">Recovery established in your inbox</p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="relative">
                          <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-light/30" />
                          <input 
                            type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Node"
                            className="w-full bg-brand-bg/50 border-2 border-brand-primary/10 rounded-2xl py-5 pl-16 pr-6 text-sm font-bold text-brand-text focus:outline-none focus:border-brand-primary/30 transition-all"
                          />
                        </div>
                        <button type="submit" className="w-full bg-brand-primary text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">
                          Initiate Recovery
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
