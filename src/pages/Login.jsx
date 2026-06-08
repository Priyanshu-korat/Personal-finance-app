import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (!navigator.onLine) {
      setErrorMsg('No internet connection. Please check your network and try again.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });
        if (error) throw error;
        
        // If successful, tell them to verify their email
        if (data.session) {
          onLoginSuccess(data.session);
        } else {
          setSuccessMsg('Success! Please check your email inbox for the verification link.');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });
        if (error) throw error;
        if (data.session) {
          onLoginSuccess(data.session);
        }
      }
    } catch (err) {
      if (err.message && err.message.includes('fetch')) {
        setErrorMsg('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        setErrorMsg(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell flex items-center justify-center" style={{ minHeight: '100dvh', padding: 'var(--s4)' }}>
      <div className="lg lg-p-xl lg-r-2xl w-full anim-fade-up" style={{ position: 'relative', overflow: 'hidden' }}>
        
        {/* Soft internal gradient for the card */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '120px', background: 'linear-gradient(180deg, var(--lg-specular-top) 0%, transparent 100%)', opacity: 0.5, pointerEvents: 'none' }} />

        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-6 mt-4 relative z-10" style={{ marginBottom: '60px' }}>
          <div className="m-icon flex items-center justify-center" style={{ background: 'var(--c-indigo)', color: 'white', width: 48, height: 48, fontSize: 24, margin: 0, borderRadius: 'var(--r-md)' }}>
            ₹
          </div>
          <div className="flex flex-col">
            <span className="caption fw-bold" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Wealth Management</span>
            <span className="title" style={{ fontSize: '24px', lineHeight: 1 }}>My Personal Finance</span>
          </div>
        </div>

        {/* Auth Box */}
        <div className="relative z-10">
          <h2 className="title mb-1">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
          <p className="t-secondary mb-6">{isSignUp ? 'Sign up with your email address.' : 'Sign in to access your dashboard.'}</p>

          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            <div>
              <label className="caption t-secondary mb-1 block">Email Address</label>
              <input 
                type="email" 
                className="form-control w-full" 
                placeholder="you@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="caption t-secondary mb-1 block">Password</label>
              <input 
                type="password" 
                className="form-control w-full" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {errorMsg && (
              <div className="p-3 lg-r-md caption" style={{ background: 'rgba(255, 69, 58, 0.1)', color: 'var(--c-red)', border: '1px solid rgba(255, 69, 58, 0.2)' }}>
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 lg-r-md caption flex items-start gap-2" style={{ background: 'rgba(48, 209, 88, 0.1)', color: '#30d158', border: '1px solid rgba(48, 209, 88, 0.2)' }}>
                <span style={{ fontSize: '16px' }}>✨</span>
                <span>{successMsg}</span>
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary w-full mt-2 lg-r-full py-3 fw-bold"
              disabled={loading}
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              className="btn btn-ghost t-secondary caption" 
              onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(''); setSuccessMsg(''); }}
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
