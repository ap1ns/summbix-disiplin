import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Shield, LogOut, Key, Mail, Camera, Save, AlertCircle, CheckCircle2, Trash2, RefreshCw } from 'lucide-react';

import { cn } from '../lib/utils';
import { profileApi } from '../lib/api';
import { UserProfile } from '../types';

interface ProfileViewProps {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  isGuest: boolean;
  onLogout: () => void;
}

export function ProfileView({ profile, setProfile, isGuest, onLogout }: ProfileViewProps) {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [email, setEmail] = useState(profile.email || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);


  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) return;
    
    setIsUpdating(true);
    setStatus(null);
    
    try {
      const updated = await profileApi.update({
        name,
        bio,
        avatar,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
    

      
      setProfile({
        name: updated.name,
        avatar: updated.avatar,
        bio: updated.bio,
        email: updated.email,
        joinDate: updated.createdAt,
      });
      
      setStatus({ type: 'success', message: 'Profile updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Failed to update profile' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (isGuest) return;
    setIsUpdating(true);
    try {
      await profileApi.deleteAccount();
      onLogout();
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Failed to delete account' });
      setIsUpdating(false);
      setShowDeleteModal(false);
    }
  };

  const getAvatarUrl = (seed: string) => {
    if (seed.startsWith('data:image')) return seed;
    return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`;
  };

  const handleRandomizeAvatar = () => {
    const newSeed = Math.random().toString(36).substring(7);
    setAvatar(newSeed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setStatus({ type: 'error', message: 'Image too large (Max 2MB)' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  return (

    <div className="max-w-4xl mx-auto py-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] shadow-xl overflow-hidden"
      >
        {/* Header/Cover Area */}
        <div className="h-32 bg-gradient-to-r from-brand-primary/20 via-brand-orange/20 to-brand-primary/10 relative">
          <div className="absolute -bottom-12 left-10">
            <div className="relative group">
              <div className="w-24 h-24 rounded-3xl bg-white shadow-2xl flex items-center justify-center border-4 border-white overflow-hidden">
                <img 
                  src={getAvatarUrl(avatar)} 
                  alt="Avatar" 
                  className="w-full h-full object-cover" 
                />
              </div>
              {!isGuest && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity rounded-3xl text-white">
                  <div className="flex gap-2 mb-2">
                    <button 
                      type="button"
                      onClick={handleRandomizeAvatar}
                      className="p-2 bg-white/20 hover:bg-white/40 rounded-xl transition-all"
                      title="Random Pixel Art"
                    >
                      <RefreshCw className="w-5 h-5 animate-spin-slow" />
                    </button>
                    <label 
                      className="p-2 bg-white/20 hover:bg-white/40 rounded-xl transition-all cursor-pointer"
                      title="Upload Local Photo"
                    >
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                      <Camera className="w-5 h-5" />
                    </label>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest">Change Photo</span>
                </div>
              )}

            </div>
          </div>

        </div>

        <div className="pt-16 px-10 pb-10">
          <div className="flex items-start justify-between mb-10">
            <div>
              <h1 className="text-3xl font-black text-brand-text tracking-tight uppercase italic">{profile.name}</h1>
              <p className="text-brand-text-light font-medium">{profile.bio}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-[10px] font-black uppercase tracking-widest rounded-full">
                  {isGuest ? 'Guest Agent' : 'Authorized Agent'}
                </span>
                <span className="text-brand-text-light/40 text-[10px] font-bold uppercase tracking-widest">
                  Active since {new Date(profile.joinDate).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            <button 
              onClick={onLogout}
              className="px-6 py-3 bg-red-50 text-red-500 border border-red-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Terminate Session
            </button>
          </div>

          {isGuest ? (
            <div className="bg-brand-primary/5 rounded-3xl p-8 border border-brand-primary/10 text-center">
              <Shield className="w-12 h-12 text-brand-primary/40 mx-auto mb-4" />
              <h3 className="text-lg font-black text-brand-text mb-2 uppercase tracking-tight">Guest Mode Active</h3>
              <p className="text-brand-text-light text-sm max-w-sm mx-auto mb-6">
                You are currently in guest mode. Data is stored locally in your browser. 
                Register an account to sync your discipline across all devices.
              </p>
            </div>
          ) : (
            <form onSubmit={handleUpdateProfile} className="space-y-8">
              <AnimatePresence>
                {status && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={cn(
                      "p-4 rounded-2xl border flex items-center gap-3",
                      status.type === 'success' ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
                    )}
                  >
                    {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="text-xs font-black uppercase tracking-widest">{status.message}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Basic Info */}
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-brand-text-light/40 uppercase tracking-[0.2em] flex items-center gap-2">
                    <User className="w-4 h-4" /> Identity Core
                  </h3>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-text-light/50 uppercase tracking-widest ml-1">Full Name</label>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-brand-bg/50 border border-brand-primary/5 rounded-2xl py-4 px-5 text-sm font-bold text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/5 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-text-light/50 uppercase tracking-widest ml-1">Bio / Designation</label>
                    <textarea 
                      value={bio} 
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full bg-brand-bg/50 border border-brand-primary/5 rounded-2xl py-4 px-5 text-sm font-bold text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/5 focus:bg-white transition-all min-h-[100px] resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-text-light/50 uppercase tracking-widest ml-1">Registered Email (Locked)</label>
                    <div className="relative group/email">
                      <Shield className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary/40" />
                      <input 
                        type="email" 
                        value={email} 
                        readOnly
                        className="w-full bg-brand-primary/[0.03] border border-brand-primary/5 rounded-2xl py-4 pl-12 pr-5 text-sm font-bold text-brand-text-light/60 cursor-not-allowed italic"
                      />
                    </div>
                  </div>

                </div>

                {/* Security Section */}
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-brand-text-light/40 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Key className="w-4 h-4" /> Encryption Keys
                  </h3>

                  <div className="bg-brand-bg/30 p-6 rounded-[2rem] border border-brand-primary/5 space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-brand-text-light/50 uppercase tracking-widest ml-1">Current Password</label>
                      <input 
                        type="password" 
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Required for password change"
                        className="w-full bg-white/50 border border-brand-primary/5 rounded-2xl py-4 px-5 text-sm font-bold text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/5 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-brand-text-light/50 uppercase tracking-widest ml-1">New Password</label>
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Leave empty to keep current"
                        className="w-full bg-white/50 border border-brand-primary/5 rounded-2xl py-4 px-5 text-sm font-bold text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/5 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="p-6 bg-red-50/30 rounded-[2rem] border border-red-100/50">
                    <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <AlertCircle className="w-3 h-3" /> Danger Zone
                    </h4>
                    <p className="text-[10px] text-brand-text-light/60 mb-4 font-medium italic">
                      Deleting your account will permanently wipe all missions, history, and focus logs.
                    </p>
                    <button 
                      type="button"
                      onClick={() => setShowDeleteModal(true)}
                      disabled={isUpdating}
                      className="text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:underline disabled:opacity-30"
                    >
                      <Trash2 className="w-3 h-3" /> Request Account Termination
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-brand-primary/5">
                <button 
                  type="submit"
                  disabled={isUpdating}
                  className="w-full md:w-auto px-12 py-5 bg-brand-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                >
                  <Save className="w-5 h-5" /> 
                  {isUpdating ? 'Synchronizing...' : 'Save All Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>

      {/* CUSTOM DELETE MODAL */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-brand-text/60 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.3)] overflow-hidden border border-white/20"
            >
              <div className="h-2 bg-red-500 w-full" />
              
              <div className="p-12 text-center">
                <div className="w-24 h-24 bg-red-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <AlertCircle className="w-12 h-12 text-red-500" />
                </div>
                
                <h2 className="text-3xl font-black text-brand-text mb-4 uppercase italic tracking-tight">TERMINATE NODE?</h2>
                
                <p className="text-brand-text-light font-medium leading-relaxed mb-10">
                  This action is <span className="text-red-500 font-black italic">IRREVERSIBLE</span>. All your strategic goals, habit patterns, and focus logs will be purged from the Aura network forever.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setShowDeleteModal(false)}
                    className="py-5 bg-brand-bg text-brand-text-light rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-brand-bg/80 transition-all active:scale-95"
                  >
                    Abort Mission
                  </button>
                  <button 
                    onClick={handleDeleteAccount}
                    disabled={isUpdating}
                    className="py-5 bg-red-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isUpdating ? 'Purging...' : 'Terminate Now'}
                  </button>
                </div>
                
                <p className="mt-8 text-[9px] font-black text-brand-text-light/30 uppercase tracking-[0.3em]">Protocol: Aura-Zero-Cascade</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
