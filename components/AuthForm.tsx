import React, { useState } from 'react';

interface AuthFormProps {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onSignup: (email: string, password: string, trainerName?: string) => Promise<{ success: boolean; error?: string }>;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onLogin, onSignup }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [trainerName, setTrainerName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    if (isSignup) {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
    }

    setLoading(true);
    const result = isSignup
      ? await onSignup(email, password, trainerName || undefined)
      : await onLogin(email, password);
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Authentication failed');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="font-pixel text-2xl text-amber-400 drop-shadow-[2px_2px_0_#000]">
          {isSignup ? 'CREATE TRAINER' : 'TRAINER LOGIN'}
        </h2>
        <p className="font-mono text-xs text-amber-300">
          {isSignup ? 'Begin your journey' : 'Welcome back, trainer'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignup && (
          <div>
            <label className="block font-pixel text-[10px] text-amber-400 mb-2">TRAINER NAME</label>
            <input
              type="text"
              value={trainerName}
              onChange={(e) => setTrainerName(e.target.value)}
              className="w-full px-4 py-3 bg-[#2a1d12] border-2 border-amber-700 rounded text-amber-100 font-mono text-sm focus:outline-none focus:border-amber-500 transition-colors"
              placeholder="Optional"
            />
          </div>
        )}

        <div>
          <label className="block font-pixel text-[10px] text-amber-400 mb-2">EMAIL</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-[#2a1d12] border-2 border-amber-700 rounded text-amber-100 font-mono text-sm focus:outline-none focus:border-amber-500 transition-colors"
            placeholder="trainer@pokepals.com"
            required
          />
        </div>

        <div>
          <label className="block font-pixel text-[10px] text-amber-400 mb-2">PASSWORD</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-[#2a1d12] border-2 border-amber-700 rounded text-amber-100 font-mono text-sm focus:outline-none focus:border-amber-500 transition-colors"
            placeholder="••••••••"
            required
          />
        </div>

        {isSignup && (
          <div>
            <label className="block font-pixel text-[10px] text-amber-400 mb-2">CONFIRM PASSWORD</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#2a1d12] border-2 border-amber-700 rounded text-amber-100 font-mono text-sm focus:outline-none focus:border-amber-500 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border-2 border-red-600 rounded p-3">
            <p className="font-mono text-xs text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-gradient-to-b from-amber-500 to-amber-700 text-black font-pixel text-xs rounded border-b-4 border-amber-900 active:border-b-0 active:translate-y-1 transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <span>LOADING...</span>
          ) : (
            <>
              <span className="animate-blink">▶</span>
              <span>{isSignup ? 'START ADVENTURE' : 'CONTINUE'}</span>
            </>
          )}
        </button>
      </form>

      <div className="text-center">
        <button
          onClick={() => {
            setIsSignup(!isSignup);
            setError('');
          }}
          className="font-mono text-xs text-amber-500 hover:text-amber-400 transition-colors"
        >
          {isSignup ? 'Already have an account? Log in' : 'New trainer? Create account'}
        </button>
      </div>
    </div>
  );
};
