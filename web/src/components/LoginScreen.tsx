import React, { useState } from 'react';
import { Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { Settings } from '../types';
import { translations } from '../utils/i18n';
import { Card, Input, Button, Badge } from './ui';

interface LoginScreenProps {
  settings: Settings;
  onLogin: (user: string, pass: string) => Promise<void>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ settings, onLogin }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const t = translations[settings.language] || translations.ru;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onLogin(username, password);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-base p-4 select-none">
      <Card className="w-full max-w-md bg-base-surface border border-base-border rounded-3xl shadow-2xl p-6 sm:p-8">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          {settings.hasCustomIcon ? (
            <img
              src={`/api/branding/icon?t=${Date.now()}`}
              alt="Logo"
              className="w-16 h-16 rounded-2xl object-contain bg-black/20 p-2 mb-4 border border-base-border shadow-lg"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-xl text-slate-900 mb-4"
              style={{ backgroundColor: settings.accentColor }}
            >
              {(settings.appTitle || 'CS').substring(0, 2).toUpperCase()}
            </div>
          )}
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            {settings.appTitle}
          </h1>
          <div className="mt-2">
            <Badge variant="accent" size="sm" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
              {t.authSubtitle || 'Защищенный шлюз конфигуратора'}
            </Badge>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 dark:text-red-300 text-center font-medium">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t.username}
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            icon={<User className="w-4 h-4 text-gray-400" />}
            placeholder="admin"
          />

          <Input
            label={t.password}
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4 text-gray-400" />}
            placeholder="••••••••"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
            loading={loading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full mt-2 font-semibold shadow-md active:scale-95"
            style={{ backgroundColor: settings.accentColor }}
          >
            {loading ? '...' : t.signIn}
          </Button>
        </form>

        <p className="text-[11px] text-gray-400 text-center mt-6">
          Config Studio • Cloud Config Editor
        </p>
      </Card>
    </div>
  );
};
