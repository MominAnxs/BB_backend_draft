"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, Mail, Lock } from 'lucide-react';

export function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!email.endsWith('@bregobusiness.com')) { setError('Please use your @bregobusiness.com email.'); return; }
    if (!password.trim()) { setError('Please enter your password.'); return; }

    setIsLoading(true);
    // Simulate SSO auth
    setTimeout(() => {
      setIsLoading(false);
      router.push('/dashboard');
    }, 1200);
  }

  function handleGoogleSSO() {
    setError('');
    setIsLoading(true);
    // Simulate Google SSO redirect
    setTimeout(() => {
      setIsLoading(false);
      router.push('/dashboard');
    }, 1500);
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — Branding Panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] bg-[#204CC7] relative overflow-hidden flex-col justify-between p-10">
        {/* Decorative gradient circles */}
        <div className="absolute -top-32 -left-32 w-[400px] h-[400px] rounded-full bg-white/[0.06]" />
        <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] rounded-full bg-white/[0.04]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-white/[0.03]" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M24 48C37.2548 48 48 37.2548 48 24C48 10.7452 37.2548 0 24 0C10.7452 0 0 10.7452 0 24C0 37.2548 10.7452 48 24 48Z" fill="white" fillOpacity="0.15"/>
              <path d="M37.6972 24.2007C34.3441 28.9545 29.8697 32.7561 24.5088 35.8299L26.1129 39.1278H27.7481C32.4777 35.9955 36.7209 32.0282 40.564 27.3297C39.6187 26.2947 38.6701 25.2322 37.6972 24.1973V24.2007Z" fill="white"/>
              <path d="M22.3569 31.4432L23.9335 34.6584C28.9805 31.6122 33.3099 27.8658 36.808 23.3087C35.949 22.4152 35.059 21.5182 34.2 20.6523C31.1607 24.93 27.1452 28.4799 22.3604 31.4432H22.3569Z" fill="white"/>
              <path d="M22.4106 29.7628C24.0458 23.7533 24.5909 17.9922 22.697 11.9551C26.9988 12.5967 30.2934 15.4773 33.0773 19.586C30.9557 22.9978 27.7716 26.4061 22.4106 29.7628Z" fill="white"/>
              <path d="M22.6407 20.0894C22.6407 20.0894 20.5191 16.0636 17.9111 14.694C15.6756 13.4935 14.8443 10.8372 15.0719 8.90875C15.0719 8.90875 23.2134 7.67718 22.6407 20.0929V20.0894Z" fill="white"/>
              <path d="M16.3059 15.7598L14.0394 18.2746L13.8394 22.3281L22.412 29.7658C23.6746 21.8555 20.4629 17.6054 16.3059 15.7598Z" fill="white"/>
              <path d="M21.5005 30.5417L10.375 27.6335L13.0417 23.5801L21.5005 30.5417Z" fill="white"/>
              <path d="M14.5 30.3477L15.8178 33.0592L19.3159 31.5792L14.5 30.3477Z" fill="white"/>
              <path d="M7.44629 32.0813L10.2854 36.2176L13.5834 35.3517L14.301 33.6751L12.4381 29.8183L9.42645 29.0352L7.44974 32.0813H7.44629Z" fill="white"/>
            </svg>
            <span className="text-white/90 text-h2 font-bold tracking-tight">Brego Business</span>
          </div>
        </div>

        {/* Tagline */}
        <div className="relative z-10">
          <h2 className="text-white text-[28px] font-bold leading-tight mb-3">
            Your team&apos;s command center.
          </h2>
          <p className="text-white/60 text-body leading-relaxed max-w-[360px]">
            Reports, tasks, communication, and data — all in one place. Built for the Brego team.
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-white/30 text-caption">&copy; 2026 Brego Business Pvt. Ltd.</p>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 flex items-center justify-center bg-[#F8F9FC] px-6">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M24 48C37.2548 48 48 37.2548 48 24C48 10.7452 37.2548 0 24 0C10.7452 0 0 10.7452 0 24C0 37.2548 10.7452 48 24 48Z" fill="#204CC7"/>
              <path d="M37.6972 24.2007C34.3441 28.9545 29.8697 32.7561 24.5088 35.8299L26.1129 39.1278H27.7481C32.4777 35.9955 36.7209 32.0282 40.564 27.3297C39.6187 26.2947 38.6701 25.2322 37.6972 24.1973V24.2007Z" fill="white"/>
              <path d="M22.3569 31.4432L23.9335 34.6584C28.9805 31.6122 33.3099 27.8658 36.808 23.3087C35.949 22.4152 35.059 21.5182 34.2 20.6523C31.1607 24.93 27.1452 28.4799 22.3604 31.4432H22.3569Z" fill="white"/>
              <path d="M22.4106 29.7628C24.0458 23.7533 24.5909 17.9922 22.697 11.9551C26.9988 12.5967 30.2934 15.4773 33.0773 19.586C30.9557 22.9978 27.7716 26.4061 22.4106 29.7628Z" fill="white"/>
              <path d="M22.6407 20.0894C22.6407 20.0894 20.5191 16.0636 17.9111 14.694C15.6756 13.4935 14.8443 10.8372 15.0719 8.90875C15.0719 8.90875 23.2134 7.67718 22.6407 20.0929V20.0894Z" fill="white"/>
              <path d="M16.3059 15.7598L14.0394 18.2746L13.8394 22.3281L22.412 29.7658C23.6746 21.8555 20.4629 17.6054 16.3059 15.7598Z" fill="white"/>
              <path d="M21.5005 30.5417L10.375 27.6335L13.0417 23.5801L21.5005 30.5417Z" fill="white"/>
              <path d="M14.5 30.3477L15.8178 33.0592L19.3159 31.5792L14.5 30.3477Z" fill="white"/>
              <path d="M7.44629 32.0813L10.2854 36.2176L13.5834 35.3517L14.301 33.6751L12.4381 29.8183L9.42645 29.0352L7.44974 32.0813H7.44629Z" fill="white"/>
            </svg>
            <span className="text-black/85 text-h2 font-bold tracking-tight">Brego Business</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-[26px] font-bold text-black/85 leading-tight">Welcome back</h1>
            <p className="text-body text-black/50 mt-1.5">Sign in with your Brego Business email to continue.</p>
          </div>

          {/* Google SSO Button */}
          <button
            onClick={handleGoogleSSO}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-black/[0.08] rounded-xl text-body font-medium text-black/75 hover:bg-black/[0.02] hover:border-black/12 active:scale-[0.99] transition-all shadow-sm disabled:opacity-60 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
          >
            {/* Google icon */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-black/[0.08]" />
            <span className="text-caption text-black/35 font-medium">or sign in with email</span>
            <div className="flex-1 h-px bg-black/[0.08]" />
          </div>

          {/* Email + Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-caption font-medium text-black/65 mb-1.5">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@bregobusiness.com"
                  autoComplete="email"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-black/[0.08] rounded-xl text-body text-black/80 placeholder:text-black/30 hover:border-black/15 focus:outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/15 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="text-caption font-medium text-black/65">Password</label>
                <button type="button" className="text-caption font-medium text-[#204CC7]/70 hover:text-[#204CC7] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 rounded">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full pl-11 pr-12 py-3 bg-white border border-black/[0.08] rounded-xl text-body text-black/80 placeholder:text-black/30 hover:border-black/15 focus:outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/30 hover:text-black/55 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="px-3.5 py-2.5 rounded-xl bg-[#FFF0F1] border border-[#E2445C]/15 text-caption text-[#E2445C] font-medium" role="alert">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#204CC7] text-white text-body font-semibold rounded-xl hover:bg-[#1a3da6] active:scale-[0.99] transition-all shadow-sm disabled:opacity-60 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/50 focus-visible:ring-offset-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="text-caption text-black/35 text-center mt-8">
            Only @bregobusiness.com accounts are allowed.
          </p>
        </div>
      </div>
    </div>
  );
}
