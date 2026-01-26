
import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, Sparkles, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (authError) throw authError;
        alert('Conta criada com sucesso! Você pode acessar agora.');
        setIsSignUp(false);
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          if (authError.message === 'Invalid login credentials') {
            setError('E-mail ou senha incorretos');
          } else {
            setError(authError.message);
          }
        } else {
          onLogin();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao tentar acessar a plataforma');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4 font-sans transition-colors duration-300">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        {/* New Refined Logo Section */}
        <div className="text-center mb-12">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group transition-transform duration-500 hover:scale-105">
              <div className="absolute inset-0 bg-indigo-500/20 dark:bg-indigo-400/10 blur-3xl rounded-full scale-150" />
              <img
                src="/logo.png"
                alt="Aminna Logo"
                className="h-24 md:h-28 relative z-10 dark:invert dark:brightness-200"
              />
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] pt-1">Gestão Inteligente</p>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-slate-200 dark:border-zinc-800 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)] dark:shadow-none relative overflow-hidden">
          {/* Accent decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 rounded-full" />

          <div className="mb-8 relative z-10">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {isSignUp ? 'Criar Nova Conta' : 'Acesse a Plataforma'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1">
              {isSignUp ? 'Preencha os dados para se registrar' : 'Informe suas credenciais para continuar'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {error && (
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900 p-4 rounded-2xl flex items-center gap-3 animate-shake">
                <AlertCircle className="text-rose-600 dark:text-rose-400 shrink-0" size={20} />
                <p className="text-xs font-black text-rose-800 dark:text-rose-300 uppercase tracking-tight">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">E-mail de Acesso</label>
              <div className="relative group">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  type="email"
                  autoFocus
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-slate-50 dark:bg-zinc-800/50 border-2 border-slate-100 dark:border-zinc-700 rounded-2xl py-4 pl-12 pr-4 text-sm font-black text-slate-950 dark:text-white outline-none focus:border-indigo-600 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Chave de Acesso</label>
              <div className="relative group">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={isSignUp ? "Mínimo 6 caracteres" : "Sua senha"}
                  className="w-full bg-slate-50 dark:bg-zinc-800/50 border-2 border-slate-100 dark:border-zinc-700 rounded-2xl py-4 pl-12 pr-12 text-sm font-black text-slate-950 dark:text-white outline-none focus:border-indigo-600 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-slate-950 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:bg-black dark:hover:bg-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                isSignUp ? 'Criar Minha Conta' : 'Acessar Plataforma'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-50 dark:border-zinc-800 text-center space-y-4">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline"
            >
              {isSignUp ? 'Já tenho uma conta. Fazer Login' : 'Ainda não tem acesso? Criar conta'}
            </button>
            <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center justify-center gap-1">
              <Sparkles size={10} className="text-indigo-400" /> Versão Profissional v2.5
            </p>
          </div>
        </div>

        <p className="text-center mt-12 text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] opacity-60">
          &copy; {new Date().getFullYear()} Home Nail Gel System
        </p>
      </div>
    </div>
  );
};
