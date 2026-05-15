import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react'; // Correctly importing from motion/react as instructed in environment file
import { Play, Pause, Square, RefreshCcw, Bell, Target, ChevronLeft, CheckCircle2, Music, Volume2, VolumeX, Plus, Trash2, Upload, Infinity, Settings2 } from 'lucide-react';
import { Goal, FocusSession, Soundscape, Task, Habit } from '../types';
import { cn, formatDuration } from '../lib/utils';
import { sessionsApi, tasksApi, habitsApi } from '../lib/api';
import { saveAudioBlob, getAudioBlob, deleteAudioBlob } from '../lib/idb';
import { DEFAULT_SOUNDSCAPES } from '../lib/music';

interface FocusViewProps {
  onExit: () => void;
  goals: Goal[];
  sessions: FocusSession[];
  setSessions: (s: FocusSession[]) => void;
  focusTarget: { id: string, type: 'goal' | 'task' | 'habit', title: string, goalId?: string } | null;
  tasks: Task[];
  setTasks: (t: Task[]) => void;
  habits: Habit[];
  setHabits: (h: Habit[]) => void;
}

export default function FocusView({ onExit, goals, sessions, setSessions, focusTarget, tasks, setTasks, habits, setHabits }: FocusViewProps) {
  const [duration, setDuration] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState(goals.length > 0 ? goals[0].id : '');
  const [isFinished, setIsFinished] = useState(false);
  const [showResumePopup, setShowResumePopup] = useState(false);
  const [finalElapsedSeconds, setFinalElapsedSeconds] = useState(0);
  const [isUnlimitedMode, setIsUnlimitedMode] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('25');

  useEffect(() => {
    const savedTime = localStorage.getItem('summbix_focus_timeLeft');
    // We only need timeLeft to know there's a session. Duration can fallback to 25 mins.
    if (savedTime && parseInt(savedTime) > 0 && parseInt(savedTime) < (25 * 60 * 10)) { // sanity check
      setShowResumePopup(true);
    }
  }, []);

  const handleResume = () => {
    const savedTime = localStorage.getItem('summbix_focus_timeLeft');
    const savedDuration = localStorage.getItem('summbix_focus_duration');
    if (savedTime && savedDuration) {
      setDuration(parseInt(savedDuration));
      setTimeLeft(parseInt(savedTime));
      setHasStarted(true);
    }
    setShowResumePopup(false);
  };

  const handleStartNew = () => {
    localStorage.removeItem('summbix_focus_timeLeft');
    localStorage.removeItem('summbix_focus_duration');
    setDuration(25 * 60);
    setTimeLeft(25 * 60);
    setHasStarted(false);
    setShowResumePopup(false);
  };

  // Soundscape State
  const [customSoundscapes, setCustomSoundscapes] = useState<Soundscape[]>(() => {
    const saved = localStorage.getItem('summbix_custom_soundscapes');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedSoundscape, setSelectedSoundscape] = useState<Soundscape | null>(null);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [showSoundMenu, setShowSoundMenu] = useState(false);
  
  // Real-time Music Tracking
  const [trackTime, setTrackTime] = useState(0);
  const [trackDuration, setTrackDuration] = useState(0);
  const [vinylRotation, setVinylRotation] = useState(0);

  // Smooth Vinyl Rotation Engine with Inertia
  useEffect(() => {
    let frame: number;
    const rotate = () => {
      if (selectedSoundscape && !isMuted) {
        setVinylRotation(prev => prev + 0.5); // Slow, steady analog rotation
      }
      frame = requestAnimationFrame(rotate);
    };
    frame = requestAnimationFrame(rotate);
    return () => cancelAnimationFrame(frame);
  }, [selectedSoundscape, isMuted]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);

  const allSoundscapes = [...DEFAULT_SOUNDSCAPES, ...customSoundscapes];

  const toggleTimer = () => {
    setIsActive(!isActive);
    if (!isActive) {
      setHasStarted(true);
      if (!isUnlimitedMode) {
        localStorage.setItem('summbix_focus_duration', duration.toString());
        localStorage.setItem('summbix_focus_timeLeft', timeLeft.toString());
      }
      if (focusTarget) {
        localStorage.setItem('summbix_focus_target', JSON.stringify(focusTarget));
      }
    }
  };
  
  const resetTimer = () => {
    setIsActive(false);
    setHasStarted(false);
    setTimeLeft(duration);
    setElapsedTime(0);
    setIsFinished(false);
    localStorage.removeItem('summbix_focus_timeLeft');
    localStorage.removeItem('summbix_focus_duration');
    localStorage.removeItem('summbix_focus_target');
  };

  const handleComplete = async (elapsed?: number) => {
    setIsActive(false);
    setIsFinished(true);
    setHasStarted(false);
    localStorage.removeItem('summbix_focus_timeLeft');
    localStorage.removeItem('summbix_focus_duration');
    localStorage.removeItem('summbix_focus_target');
    
    const finalDuration = elapsed !== undefined ? elapsed : (isUnlimitedMode ? elapsedTime : duration);
    setFinalElapsedSeconds(finalDuration);

    // Mark task as completed (tasks auto-complete, habits do NOT)
    if (focusTarget) {
      if (focusTarget.type === 'task') {
        setTasks(tasks.map(t => t.id === focusTarget.id ? { ...t, completed: true } : t));
        try { await tasksApi.update(focusTarget.id, { completed: true }); } catch {}
      }
      // Habits: do NOT auto-complete. The user checks them off manually.
      // Focus sessions accumulate throughout the day.
    }

    const newSession: FocusSession = {
      id: `s${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      duration: finalDuration,
      goalId: focusTarget?.goalId || selectedGoalId,
      taskId: focusTarget?.type === 'task' ? focusTarget.id : undefined,
      habitId: focusTarget?.type === 'habit' ? focusTarget.id : undefined,
      title: focusTarget?.title || (goals.find(g => g.id === selectedGoalId)?.title) || 'General Focus'
    };
    setSessions([...sessions, newSession]);

    // Sync session to backend
    try {
      const created = await sessionsApi.create({
        date: newSession.date,
        duration: newSession.duration,
        title: newSession.title,
        goalId: newSession.goalId || undefined,
        taskId: newSession.taskId || undefined,
        habitId: newSession.habitId || undefined,
      });
      // Replace local ID with server ID
      setSessions(sessions.map(s => s.id === newSession.id ? { ...s, id: created.id } : s));
    } catch {}
  };

  const setPreset = (mins: number) => {
    const secs = mins * 60;
    setDuration(secs);
    setTimeLeft(secs);
    setElapsedTime(0);
    setIsUnlimitedMode(false);
    setIsActive(false);
    setHasStarted(false);
    localStorage.setItem('summbix_focus_duration', secs.toString());
    localStorage.setItem('summbix_focus_timeLeft', secs.toString());
  };

  const toggleUnlimited = () => {
    setIsUnlimitedMode(!isUnlimitedMode);
    setElapsedTime(0);
    setIsActive(false);
    setHasStarted(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(customValue);
    if (!isNaN(mins) && mins > 0) {
      setPreset(mins);
      setShowCustomInput(false);
    }
  };

  const saveCustomSounds = (sounds: Soundscape[]) => {
    setCustomSoundscapes(sounds);
    localStorage.setItem('summbix_custom_soundscapes', JSON.stringify(sounds));
  };



  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const soundId = `custom-local-${Date.now()}`;
      await saveAudioBlob(soundId, file);
      
      const newSound: Soundscape = {
        id: soundId,
        name: file.name.replace(/\.[^/.]+$/, "").substring(0, 30),
        url: 'local',
        type: 'Local File'
      };
      saveCustomSounds([...customSoundscapes, newSound]);
      setSelectedSoundscape(newSound); // Auto play
    }
  };

  const handleDeleteSound = async (id: string) => {
    if (id.includes('custom-')) {
      await deleteAudioBlob(id);
    }
    saveCustomSounds(customSoundscapes.filter(s => s.id !== id));
    if (selectedSoundscape?.id === id) setSelectedSoundscape(null);
  };

  // ==========================================
  // Effects
  // ==========================================

  // Separated audio play logic to support async IDB blobs
  useEffect(() => {
    const loadAndPlay = async () => {
      if (selectedSoundscape && !isFinished) {
        let playUrl = selectedSoundscape.url;
        
        // Load from IDB if it's a custom saved track
        if (selectedSoundscape.id.includes('custom-')) {
          const blob = await getAudioBlob(selectedSoundscape.id);
          if (blob) {
            playUrl = URL.createObjectURL(blob);
            if (activeBlobUrlRef.current) URL.revokeObjectURL(activeBlobUrlRef.current);
            activeBlobUrlRef.current = playUrl;
          }
        }

        if (!audioRef.current) {
          audioRef.current = new Audio();
          audioRef.current.loop = true;
        }

        // Listeners for progress
        const onTimeUpdate = () => setTrackTime(audioRef.current?.currentTime || 0);
        const onLoadedMetadata = () => setTrackDuration(audioRef.current?.duration || 0);
        const onEnded = () => handleNext();
        
        audioRef.current.addEventListener('timeupdate', onTimeUpdate);
        audioRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
        audioRef.current.addEventListener('ended', onEnded);

        // Only update source and reload if the track ID actually changed
        if (audioRef.current.getAttribute('data-current-track') !== selectedSoundscape.id) {
          console.log("Switching audio source to:", selectedSoundscape.name);
          audioRef.current.src = playUrl;
          audioRef.current.setAttribute('data-current-track', selectedSoundscape.id);
          audioRef.current.load();
        }
        
        audioRef.current.volume = isMuted ? 0 : volume;
        
        // Attempt to play
        try {
          await audioRef.current.play();
        } catch (e) {
          console.error("Playback failed.", e);
        }

        return () => {
          if (audioRef.current) {
            audioRef.current.removeEventListener('timeupdate', onTimeUpdate);
            audioRef.current.removeEventListener('loadedmetadata', onLoadedMetadata);
            audioRef.current.removeEventListener('ended', onEnded);
          }
        };
      } else {
        if (audioRef.current) {
          audioRef.current.pause();
        }
      }
    };
    
    const cleanup = loadAndPlay();
    return () => {
      cleanup.then(fn => fn && fn());
    };
  }, [selectedSoundscape, isFinished]);

  const handleNext = () => {
    const currentIndex = allSoundscapes.findIndex(s => s.id === selectedSoundscape?.id);
    const nextIndex = (currentIndex + 1) % allSoundscapes.length;
    setSelectedSoundscape(allSoundscapes[nextIndex]);
    setIsMuted(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement> | number) => {
    const newTime = typeof e === 'number' ? e : parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setTrackTime(newTime);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      }
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        if (isUnlimitedMode) {
          setElapsedTime(prev => prev + 1);
        } else {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              handleComplete(duration);
              return 0;
            }
            const next = prev - 1;
            localStorage.setItem('summbix_focus_timeLeft', next.toString());
            return next;
          });
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isActive, isUnlimitedMode, duration]);

  const progress = ((duration - timeLeft) / duration) * 100;

  const dustEffectEnabled = false;
  const DustEffect = () => null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 w-screen h-screen z-[99999] bg-brand-bg text-brand-text flex flex-col items-center justify-center overflow-hidden font-sans bg-grain"
    >
      {/* Deep Immersive Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Ambient Summbix */ dustEffectEnabled && <DustEffect />}
        <div 
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[150px] transition-colors duration-1000",
            isActive ? "bg-brand-primary/60" : "bg-brand-primary/10"
          )} 
        />
        <div 
          className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-brand-blue/10 blur-[120px] rounded-full" 
        />
      </div>

      {/* Top Header - Minimalist */}
      <header className="absolute top-0 left-0 right-0 p-4 md:p-10 flex items-start justify-between z-40">
        <motion.button 
          whileHover={{ x: -5 }}
          onClick={onExit}
          className="flex items-center gap-3 text-brand-text-light hover:text-brand-primary transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-white/95 border border-brand-primary/10 flex items-center justify-center group-hover:bg-white transition-all shadow-sm">
            <ChevronLeft className="w-5 h-5" />
          </div>
          <span className="font-bold text-xs uppercase tracking-widest hidden md:inline">Exit Sanctuary</span>
        </motion.button>

        <div className="text-right flex flex-col items-end">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_10px_rgba(142,94,78,0.3)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-primary">
              {focusTarget?.type === 'task' ? 'Mission Active' : focusTarget?.type === 'habit' ? 'Ritual Flow' : 'Deep Focus'}
            </span>
          </div>
          <p className="text-base md:text-xl font-medium text-brand-text tracking-wide max-w-[200px] md:max-w-[300px] truncate">
            {focusTarget?.title || goals.find(g => g.id === selectedGoalId)?.title || 'Undefined Flow'}
          </p>
        </div>
      </header>

      {/* Main Focus Area */}
      <AnimatePresence mode="wait">
        {!isFinished ? (
          <motion.div 
            key="timer"
            initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-20 flex flex-col items-center justify-center w-full flex-1"
          >
            {/* Massive Typography Timer */}
            <div className="relative cursor-default select-none">
              <motion.h1 
                layoutId="timer-text"
                className="text-[15vw] md:text-[22vw] font-black tracking-tighter leading-none tabular-nums text-transparent bg-clip-text bg-gradient-to-b from-brand-text via-brand-text to-brand-text/10 drop-shadow-2xl pb-4 lg:pb-8 px-4 md:px-8"
              >
                {isUnlimitedMode ? formatDuration(elapsedTime) : formatDuration(timeLeft)}
              </motion.h1>
              
              {/* Progress Bar under timer */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-brand-primary/10 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-brand-primary shadow-[0_0_15px_rgba(227,133,105,0.4)]"
                  animate={isUnlimitedMode && isActive ? { 
                    x: ["-100%", "100%"],
                    width: ["20%", "20%"]
                  } : { 
                    width: `${progress}%`,
                    x: 0
                  }}
                  transition={isUnlimitedMode && isActive ? { 
                    duration: 2, 
                    repeat: Infinity, 
                    ease: "linear" 
                  } : { 
                    duration: 1, 
                    ease: "linear" 
                  }}
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="completion"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 100 }}
            className="flex flex-col items-center justify-center text-center z-20"
          >
            <div className="w-32 h-32 rounded-[3rem] bg-brand-green/10 border border-brand-green/20 flex items-center justify-center mb-10 shadow-[0_0_50px_rgba(152,182,132,0.2)] transform rotate-6">
              <CheckCircle2 className="w-16 h-16 text-brand-green" />
            </div>
            <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tight text-brand-text">Flow Conquered.</h2>
            <p className="text-xl text-brand-text-light max-w-lg mb-12 leading-relaxed font-medium">
              You channeled <span className="text-brand-primary font-black">{(finalElapsedSeconds / 60).toFixed(1)} minutes</span> into absolute focus. 
              The discipline shapes your summbix.
            </p>
            <div className="flex items-center gap-6">
              <button onClick={resetTimer} className="px-10 py-5 rounded-[2rem] bg-white border border-brand-primary/10 hover:border-brand-primary/30 text-brand-text-light hover:text-brand-primary font-black uppercase tracking-[0.2em] text-xs transition-all shadow-sm">
                Another Session
              </button>
              <button onClick={onExit} className="px-10 py-5 rounded-[2rem] bg-brand-primary text-white font-black uppercase tracking-[0.2em] text-xs hover:opacity-90 shadow-lg shadow-brand-primary/30 transition-all">
                Exit Sanctuary
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Control Dock */}
      {!isFinished && (
        <div className="absolute bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center w-full px-4 md:w-auto md:px-0">
          


          {/* Existing Floating Dock (Condensed) */}
          <div className="bg-white/95 border border-brand-primary/10 rounded-full px-3 md:px-4 py-2 md:py-3 flex items-center gap-1.5 md:gap-2 shadow-[0_20px_50px_rgba(227,133,105,0.15)] max-w-[95vw] md:max-w-full flex-wrap md:flex-nowrap justify-center">
            
            {/* Presets */}
            <div className="flex items-center bg-brand-bg/50 rounded-full p-1 mr-4 border border-brand-primary/5">
              {[25, 45, 60].map(mins => (
                <button
                  key={mins}
                  onClick={() => setPreset(mins)}
                  disabled={isActive}
                  className={cn(
                    "w-10 h-10 rounded-full text-xs font-black transition-all flex items-center justify-center",
                    !isUnlimitedMode && duration === mins * 60 ? "bg-white text-brand-primary shadow-sm border border-brand-primary/10" : "text-brand-text-light hover:text-brand-primary disabled:opacity-30"
                  )}
                >
                  {mins}
                </button>
              ))}
              
              {/* Unlimited Toggle */}
              <button
                onClick={toggleUnlimited}
                disabled={isActive}
                className={cn(
                  "w-10 h-10 rounded-full transition-all flex items-center justify-center",
                  isUnlimitedMode ? "bg-white text-brand-primary shadow-sm border border-brand-primary/10" : "text-brand-text-light hover:text-brand-primary disabled:opacity-30"
                )}
                title="Unlimited Mode"
              >
                <Infinity className="w-4 h-4" />
              </button>

              {/* Custom Input Toggle */}
              <div className="relative">
                <button
                  onClick={() => setShowCustomInput(!showCustomInput)}
                  disabled={isActive}
                  className={cn(
                    "w-10 h-10 rounded-full transition-all flex items-center justify-center",
                    showCustomInput ? "bg-brand-primary/10 text-brand-primary" : "text-brand-text-light hover:text-brand-primary disabled:opacity-30"
                  )}
                >
                  <Settings2 className="w-4 h-4" />
                </button>

                <AnimatePresence>
                  {showCustomInput && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-white border border-brand-primary/10 rounded-2xl p-3 shadow-xl z-[60] flex items-center gap-2"
                    >
                      <form onSubmit={handleCustomSubmit} className="flex items-center gap-2">
                        <input 
                          type="number" 
                          value={customValue}
                          onChange={(e) => setCustomValue(e.target.value)}
                          className="w-16 h-10 bg-brand-bg rounded-xl px-3 text-sm font-black text-brand-text outline-none focus:ring-2 ring-brand-primary/20"
                          min="1"
                          max="999"
                          autoFocus
                        />
                        <span className="text-[10px] font-black text-brand-text-light uppercase tracking-widest mr-1">Min</span>
                        <button 
                          type="submit"
                          className="h-10 px-4 bg-brand-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                        >
                          Set
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Controls */}
            <button 
              onClick={resetTimer}
              className="w-12 h-12 rounded-full flex items-center justify-center text-brand-text-light hover:bg-white hover:text-brand-primary hover:shadow-sm transition-all"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>

            <button 
              onClick={toggleTimer}
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg mx-2",
                isActive ? "bg-white text-brand-text border border-brand-primary/10 hover:bg-brand-bg" : "bg-brand-primary text-white shadow-brand-primary/30 hover:scale-105"
              )}
            >
              {isActive ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current translate-x-0.5" />}
            </button>

            {hasStarted && (
              <button 
                onClick={() => handleComplete(isUnlimitedMode ? elapsedTime : (duration - timeLeft))}
                className="px-6 h-12 rounded-full bg-brand-green text-white font-black uppercase tracking-[0.1em] text-[10px] hover:opacity-90 shadow-lg shadow-brand-green/20 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Done
              </button>
            )}

            <button 
              onClick={() => setShowSoundMenu(!showSoundMenu)}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                selectedSoundscape || showSoundMenu ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/10" : "text-brand-text-light hover:bg-white hover:text-brand-primary hover:shadow-sm"
              )}
            >
              <Music className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      {/* Resume Session Popup */}
      <AnimatePresence>
        {showResumePopup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] flex items-center justify-center p-6 bg-brand-text/80"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white border border-brand-primary/10 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-20 h-20 rounded-3xl bg-brand-primary/10 flex items-center justify-center mx-auto mb-6">
                <RefreshCcw className="w-10 h-10 text-brand-primary animate-spin-slow" />
              </div>
              <h3 className="text-2xl font-black text-brand-text mb-4 uppercase tracking-tight">Resume Session?</h3>
              <p className="text-sm text-brand-text-light mb-8 font-medium">
                We found a previous session in progress. Would you like to continue from where you left off?
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleResume}
                  className="w-full py-4 bg-brand-primary text-white font-black rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-brand-primary/30 uppercase tracking-widest text-xs"
                >
                  Continue Flow
                </button>
                <button 
                  onClick={handleStartNew}
                  className="w-full py-4 bg-brand-bg text-brand-text-light font-black rounded-2xl hover:bg-white border border-brand-primary/5 transition-all uppercase tracking-widest text-xs"
                >
                  Start Fresh
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Vinyl Music Sanctuary */}
      <AnimatePresence>
        {showSoundMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-brand-text/80 flex items-center justify-center p-4 md:p-8 font-sans select-none"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full h-[90vh] max-w-7xl bg-white rounded-[2rem] md:rounded-[3.5rem] shadow-[0_30px_100px_rgba(255,142,158,0.15)] flex flex-col p-6 md:p-12 overflow-hidden border border-brand-primary/10"
            >
              {/* Header */}
              <header className="flex justify-end items-start mb-8 z-10">
                <div className="flex gap-6 md:gap-12 text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] text-black/60">
                  <button onClick={() => setShowSoundMenu(false)} className="hover:text-brand-primary transition-colors">Exit</button>
                </div>
              </header>

              <div className="flex-1 flex flex-col md:flex-row items-center gap-8 md:gap-0 relative h-full overflow-y-auto md:overflow-hidden py-4 md:py-0 custom-scrollbar">
                
                {/* Vinyl Record Section */}
                <div className="relative md:absolute md:-left-[40%] lg:-left-[35%] md:top-1/2 md:-translate-y-1/2 w-[260px] h-[260px] md:w-[650px] md:h-[650px] lg:w-[850px] lg:h-[850px] flex-shrink-0 z-10">
                  
                  {/* The Vinyl Disk (Inertia-driven Rotation) */}
                  <motion.div 
                    animate={{ rotate: vinylRotation }}
                    transition={{ 
                      type: "spring", 
                      damping: 20, 
                      stiffness: 40,
                      mass: 1 
                    }}
                    className="relative w-full h-full rounded-full bg-[#1a1a1a] shadow-[0_20px_100px_rgba(0,0,0,0.4)] flex items-center justify-center border-[12px] border-black/5 overflow-hidden"
                  >
                    {/* Dynamic Center Image Label */}
                    <div className="w-[32%] h-[32%] rounded-full bg-white overflow-hidden relative z-10 shadow-2xl border-4 border-black/10">
                      <AnimatePresence mode="wait">
                        {selectedSoundscape ? (
                          <motion.img 
                            key={selectedSoundscape.id}
                            initial={{ 
                              opacity: 0, 
                              filter: 'blur(8px)',
                              rotate: -45,
                              clipPath: 'circle(0% at 50% 50%)'
                            }}
                            animate={{ 
                              opacity: 1, 
                              filter: 'blur(0px)',
                              rotate: 0,
                              clipPath: 'circle(100% at 50% 50%)'
                            }}
                            exit={{ 
                              opacity: 0, 
                              filter: 'blur(8px)',
                              rotate: 45,
                              clipPath: 'circle(0% at 50% 50%)'
                            }}
                            transition={{ 
                              duration: 0.85, 
                              ease: [0.16, 1, 0.3, 1] // Custom snappy spring-like ease
                            }}
                            src={selectedSoundscape.coverUrl || `https://picsum.photos/seed/${selectedSoundscape.id}/400`} 
                            alt="Album Art"
                            className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0"
                          />
                        ) : (
                          <motion.div 
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="w-full h-full bg-gray-100 flex items-center justify-center"
                          >
                            <Music className="w-12 h-12 text-black/10" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      {/* Inner Hole */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-brand-bg shadow-inner border border-black/5" />
                    </div>

                    {/* Grooves / Shine */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/5 via-transparent to-white/10 pointer-events-none opacity-40" />
                  </motion.div>
                </div>

                {/* Typography and Tracklist Section */}
                <div className="flex-1 w-full flex justify-center items-center h-full md:ml-[45%] lg:ml-[38%] z-20">
                  <div className="w-full max-w-xl px-4 md:pr-12 text-center md:text-left">
                    <div className="mb-6 md:mb-10 flex items-end justify-between gap-8">
                      <div>
                        <motion.h2 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-[12vw] md:text-[7vw] lg:text-[7.5vw] font-black leading-[0.8] tracking-[-0.06em] uppercase text-brand-text mb-6 flex flex-col"
                        >
                           <span>SELECT</span>
                           <span>SOUND</span>
                        </motion.h2>
                        <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.4em] text-brand-text/40">
                           {selectedSoundscape?.type || 'AMBIENT, FOCUS, ATMOSPHERIC'}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 md:gap-6 mb-2">
                        {/* Small Minimal Sanctuary Play/Pause (Stationary) */}
                        <button 
                          onClick={() => {
                            if (!selectedSoundscape) {
                              if (allSoundscapes.length > 0) {
                                setSelectedSoundscape(allSoundscapes[0]);
                                setIsMuted(false);
                              }
                            } else {
                              setIsMuted(!isMuted);
                            }
                          }}
                          className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-brand-primary/10 flex items-center justify-center hover:bg-brand-primary hover:text-white transition-all group shrink-0 shadow-sm"
                        >
                          {(selectedSoundscape && !isMuted) ? <Pause className="w-4 h-4 md:w-5 md:h-5 fill-current" /> : <Play className="w-4 h-4 md:w-5 md:h-5 fill-current translate-x-0.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="w-full">
                      <div className="flex justify-between items-end border-b border-brand-primary/10 pb-3 mb-6">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary">Popular</span>
                      </div>

                      <div className="space-y-1 max-h-[35vh] overflow-y-auto custom-scrollbar pr-4">
                        {allSoundscapes.map((s, idx) => {
                          const isCurrentTrack = selectedSoundscape?.id === s.id;
                          const isPlaying = isCurrentTrack && !isMuted;

                          return (
                            <div
                              key={s.id}
                              onClick={() => {
                                if (isCurrentTrack) {
                                  setIsMuted(!isMuted);
                                } else {
                                  setSelectedSoundscape(s);
                                  setIsMuted(false);
                                }
                              }}
                              className="group flex items-center gap-6 py-3 cursor-pointer border-b border-transparent hover:border-brand-primary/10 transition-all"
                            >
                              <span className="text-[9px] font-mono font-bold text-brand-text/30 w-5 flex-shrink-0">
                                {(idx + 1).toString().padStart(2, '0')}
                              </span>
                              
                              <div className="w-10 h-10 bg-brand-primary/5 rounded-sm overflow-hidden flex-shrink-0 group-hover:bg-brand-primary/10 transition-colors">
                                <div className="w-full h-full flex items-center justify-center">
                                  <Music className={cn("w-4 h-4", isPlaying ? "text-brand-primary" : "text-brand-text/20")} />
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className={cn("text-xs font-black uppercase tracking-wider truncate transition-colors", isPlaying ? "text-brand-primary" : "text-brand-text/80 group-hover:text-brand-text")}>
                                  {s.name}
                                </p>
                                <p className="text-[8px] font-bold text-brand-text/30 uppercase tracking-[0.1em] mt-0.5 truncate">
                                  {s.album || s.artist || 'Summbix Archive'}
                                </p>
                              </div>

                              <div className="flex items-center gap-4 flex-shrink-0">
                                <div className="text-[9px] font-mono font-bold text-brand-text/30">
                                  {isPlaying ? 'PLAYING' : isCurrentTrack ? 'PAUSED' : '3:45'}
                                </div>
                                {s.id.startsWith('custom-') && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteSound(s.id); }}
                                    className="p-2 text-brand-text/20 hover:text-brand-primary transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Music Progress Footer - SYNCED WITH TRACK */}
                      <div className="flex justify-between items-center mt-10">
                        <div className="flex items-center gap-6">
                          <div className="text-[11px] font-mono font-bold tracking-[0.1em] text-brand-text/30">
                            {formatDuration(trackTime)} / {formatDuration(trackDuration)}
                          </div>

                          {/* Volume Control (Relocated to Footer) */}
                          <div className="relative flex items-center group/vol">
                            <button 
                              onClick={() => setVolume(volume === 0 ? 0.5 : 0)} 
                              className="text-brand-text/50 hover:text-brand-primary transition-colors shrink-0"
                            >
                              {volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                            </button>
                            <div className="w-0 opacity-0 overflow-hidden group-hover/vol:w-20 md:group-hover/vol:w-24 group-hover/vol:opacity-100 transition-all duration-300 ease-out flex items-center ml-2">
                              <input 
                                type="range" 
                                min="0" max="1" step="0.01" 
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="w-full h-1 bg-brand-text/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-brand-primary [&::-webkit-slider-thumb]:rounded-full"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-6">
                          <label className="text-[9px] font-black uppercase tracking-[0.2em] border-b border-brand-text/20 pb-1 cursor-pointer hover:border-brand-primary transition-all">
                             Upload
                             <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
                          </label>
                          <button 
                            onClick={() => setShowSoundMenu(false)}
                            className="text-[9px] font-black uppercase tracking-[0.2em] border-b border-brand-text/20 pb-1 hover:border-brand-primary transition-all"
                          >
                             Close
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
