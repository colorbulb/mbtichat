/**
 * AuthScreen Component
 * 
 * Dual-mode authentication component handling both Login and Sign-Up.
 * 
 * Key Features:
 * - Single form component manages both login and signup modes via `isLogin` state
 * - Login flexibility: accepts either email or username (detected by presence of '@')
 * - Dark mode aesthetic with gradient text and modern UI
 * 
 * Login Logic:
 * - Uses `formData.email || formData.username` to handle dual-purpose input
 * - Falls back to username lookup if input doesn't contain '@'
 * 
 * Signup Notes:
 * - Email is optional in UI but Firebase Auth requires it
 * - Store.signup should handle fallback (e.g., username@temp.com) if email not provided
 * 
 * TODO:
 * - Add client-side validation (password length, age 18+, valid date)
 * - Improve logo fallback (SVG or text placeholder)
 */
import React, { useState } from 'react';
import { User, Gender } from '../types';
import { MBTI_PROFILES } from '../constants';
import { store } from '../services/store';

export const AuthScreen: React.FC<{ onLogin: (u: User) => void }> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', birthDate: '2000-01-01', gender: 'Male' as Gender, mbti: 'INTJ'
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handles form submission for both login and signup
   * 
   * Login: Uses email or username (auto-detected)
   * Signup: Creates new user with provided data
   * 
   * Note: Email fallback logic should be handled in store.signup
   * if email is not provided (Firebase Auth requires email)
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      if (isLogin) {
        // Login mode: accepts email or username
        const loginIdentifier = formData.email || formData.username;
        console.log('🔍 [AuthScreen] Attempting login with:', loginIdentifier);
        const user = await store.login(loginIdentifier, formData.password);
        console.log('🔍 [AuthScreen] Login result:', user);
        console.log('🔍 [AuthScreen] User isAdmin:', user?.isAdmin);
        console.log('🔍 [AuthScreen] User role:', user?.role);
        if (user) onLogin(user);
        else setError('Invalid credentials. Try email "lc@ne.ai" with password "123123" or your username/password');
      } else {
        // Signup mode: creates new user
        // Email is optional in form but should be handled by store.signup if missing
        const user = await store.signup({
          username: formData.username,
          email: formData.email || undefined,
          password: formData.password,
          birthDate: formData.birthDate,
          age: 0, // Calculated in store
          gender: formData.gender,
          mbti: formData.mbti,
          bio: 'New user ready to connect!',
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.username}`
        });
        onLogin(user);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img 
            src="/logo.png" 
            alt="PersonaDate Logo" 
            className="h-24 w-24 object-contain"
            onError={(e) => {
              // Fallback if logo doesn't exist - hides broken image
              // TODO: Consider using SVG or text placeholder for more reliable fallback
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          NE Dating
        </h1>
        <p className="text-center text-gray-400 mb-6">Connect Types, Find Love</p>

        {error && <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white" 
            placeholder={isLogin ? "Email or Username" : "Username"} 
            value={isLogin ? (formData.email || formData.username) : formData.username}
            onChange={e => {
              if (isLogin) {
                // For login, use the input as email or username
                const value = e.target.value;
                if (value.includes('@')) {
                  setFormData({...formData, email: value, username: ''});
                } else {
                  setFormData({...formData, username: value, email: ''});
                }
              } else {
                setFormData({...formData, username: e.target.value});
              }
            }}
            required
            disabled={isLoading}
          />
          {!isLogin && (
            <input 
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white" 
              type="email" 
              placeholder="Email (optional, will use username@temp.com if not provided)" 
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              disabled={isLoading}
            />
          )}
          <input 
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white" 
            type="password" 
            placeholder="Password" 
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
            required
            disabled={isLoading}
          />
          
          {!isLogin && (
            <>
              <div className="flex gap-4">
                <input 
                  type="date" 
                  className="w-1/2 bg-gray-900 border border-gray-700 rounded-lg p-3 text-white" 
                  value={formData.birthDate}
                  onChange={e => setFormData({...formData, birthDate: e.target.value})}
                  required
                />
                <select 
                  className="w-1/2 bg-gray-900 border border-gray-700 rounded-lg p-3 text-white"
                  value={formData.gender}
                  onChange={e => setFormData({...formData, gender: e.target.value as Gender})}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <select 
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white"
                value={formData.mbti}
                onChange={e => setFormData({...formData, mbti: e.target.value})}
              >
                {MBTI_PROFILES.map(p => (
                  <option key={p.code} value={p.code}>{p.code} - {p.name}</option>
                ))}
              </select>
            </>
          )}

          <button 
            disabled={isLoading}
            className="w-full bg-pink-600 hover:bg-pink-500 disabled:bg-gray-600 text-white font-bold py-3 rounded-lg transition-colors"
          >
            {isLoading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-gray-500">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-pink-400 hover:underline">
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
};