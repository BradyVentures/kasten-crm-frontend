'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch {
      setError('Ungueltige Anmeldedaten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bd-bg-secondary">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold text-bd-accent">Bauelemente Kasten</h1>
          <p className="text-bd-text-muted mt-2">CRM System</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-bd p-8 space-y-5 border border-bd-border shadow-sm">
          <div>
            <label className="block text-sm text-bd-text-muted mb-1.5">E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@bauelemente-kasten.de"
              required
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-bd-text-muted mb-1.5">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-bd-accent text-white font-semibold py-2.5 rounded-full
              hover:bg-[#d64f3e] disabled:opacity-50 transition-all"
          >
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
}
