import React, { useState } from 'react';
import { LogIn, UserCheck, ShieldCheck, Mail, Lock, UserPlus, Phone, MapPin, Eye, EyeOff } from 'lucide-react';
export default function Login({ onLoginSuccess }) {
    const [isSignUp, setIsSignUp] = useState(false);
    const [role, setRole] = useState('client');
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(false);
    const handleRoleSelect = (selectedRole) => {
        setRole(selectedRole);
        setError(null);
    };
    const handleAuth = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);
        const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/login';
        const payload = isSignUp
            ? { email, name, password, role, phone, location }
            : { email, password, role };
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed');
            }
            if (isSignUp) {
                setSuccess('Account created successfully! Auto-logging you in...');
                setTimeout(() => {
                    onLoginSuccess(data.token, data.user);
                }, 1200);
            }
            else {
                onLoginSuccess(data.token, data.user);
            }
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const autofillDemoAccount = (roleFill) => {
        setRole(roleFill);
        if (roleFill === 'manager') {
            setEmail('manager@gmail.com');
            setPassword('password');
        }
        else {
            setEmail('client@gmail.com');
            setPassword('password');
        }
        setIsSignUp(false);
        setError(null);
    };
    return (<div className="min-h-screen bg-[#E6E6FA] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center animate-fade-in">
        {/* Company Header */}
        <span className="inline-flex items-center justify-center p-2 rounded-xl bg-purple-50 mb-3 border border-purple-100">
          <span className="text-xl font-bold text-purple-700 tracking-wider">GS</span>
        </span>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans">
          Glory Simon Interiors
        </h2>
        <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">
          Milestone Billings, Invoicing, Snag Clearances & Retention Fund Tracker
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl">
          
          {/* Role selection tab */}
          <div className="grid grid-cols-2 gap-3 mb-6 p-1 bg-slate-100 rounded-xl" id="role-selector">
            <button onClick={() => handleRoleSelect('client')} className={`flex items-center justify-center py-2.5 px-3 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${role === 'client'
            ? 'bg-white text-blue-700 shadow-sm'
            : 'text-slate-500 hover:text-slate-900 hover:bg-white/40'}`}>
              <UserCheck className="w-4 h-4 mr-2"/>
              Client Portal
            </button>
            <button onClick={() => handleRoleSelect('manager')} className={`flex items-center justify-center py-2.5 px-3 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${role === 'manager'
            ? 'bg-white text-blue-700 shadow-sm'
            : 'text-slate-500 hover:text-slate-900 hover:bg-white/40'}`}>
              <ShieldCheck className="w-4 h-4 mr-2"/>
              Manager Hub
            </button>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleAuth}>
            {error && (<div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 flex items-start">
                <span>{error}</span>
              </div>)}
            
            {success && (<div className="p-3 bg-green-50 text-green-700 text-xs rounded-lg border border-green-100">
                {success}
              </div>)}

            {isSignUp && (<div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <LogIn className="w-4 h-4"/>
                  </span>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sarah Connor" className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl bg-slate-50/50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"/>
                </div>
              </div>)}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Mail className="w-4 h-4"/>
                </span>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. client@gmail.com" className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl bg-slate-50/50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"/>
              </div>
            </div>

            {isSignUp && (<div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Phone className="w-4.5 h-4.5"/>
                    </span>
                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl bg-slate-50/50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Property Location
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <MapPin className="w-4.5 h-4.5"/>
                    </span>
                    <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Sunset Blvd" className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl bg-slate-50/50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"/>
                  </div>
                </div>
              </div>)}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Lock className="w-4 text-slate-400 h-4"/>
                </span>
                <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="block w-full pl-10 pr-10 py-2 border border-slate-300 rounded-xl bg-slate-50/50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"/>
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-xs text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors cursor-pointer">
              {loading ? (<span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Processing...
                </span>) : isSignUp ? (<span className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4"/> Register & Open Portal
                </span>) : (<span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4"/> Sign In securely
                </span>)}
            </button>
          </form>

          {/* Toggle login vs signup */}
          <div className="mt-6 text-center text-xs">
            <button onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null);
            setSuccess(null);
        }} className="text-blue-600 hover:text-blue-700 hover:underline font-bold cursor-pointer">
              {isSignUp
            ? "Already have an interior account? Sign In"
            : "New client with Glory Simon? Create Client Portal"}
            </button>
          </div>

          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"/>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">Demo Access</span>
            </div>
          </div>

          {/* Quick links to demo accounts */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={() => autofillDemoAccount('client')} type="button" className="flex flex-col items-center p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-left transition">
              <span className="text-[10px] uppercase font-bold text-slate-400">Client Demo</span>
              <span className="text-[11px] text-slate-700 font-semibold truncate hover:text-slate-900">client@gmail.com</span>
            </button>
            <button onClick={() => autofillDemoAccount('manager')} type="button" className="flex flex-col items-center p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-left transition">
              <span className="text-[10px] uppercase font-bold text-slate-400">Manager Demo</span>
              <span className="text-[11px] text-slate-700 font-semibold truncate hover:text-slate-900">manager@gmail.com</span>
            </button>
          </div>

        </div>
      </div>
    </div>);
}
