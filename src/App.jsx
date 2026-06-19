import React, { useState, useEffect } from 'react';
import Login from './components/Login.jsx';
import ClientDashboard from './components/ClientDashboard.jsx';
import ManagerDashboard from './components/ManagerDashboard.jsx';
import NotificationsDrawer from './components/NotificationsDrawer.jsx';
export default function App() {
    const [token, setToken] = useState(() => localStorage.getItem('gs_session_token'));
    const [user, setUser] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [appReady, setAppReady] = useState(false);
    const [language, setLanguage] = useState(() => localStorage.getItem('gs_lang') || 'en');
    const handleLanguageChange = (lang) => {
        localStorage.setItem('gs_lang', lang);
        setLanguage(lang);
    };
    // Initialize profile lookup
    const validateSessionOnLoad = async () => {
        const cachedToken = localStorage.getItem('gs_session_token');
        if (!cachedToken) {
            setAppReady(true);
            return;
        }
        try {
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${cachedToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
                setToken(cachedToken);
            }
            else {
                // Clear bad session
                localStorage.removeItem('gs_session_token');
                setToken(null);
                setUser(null);
            }
        }
        catch (err) {
            console.error("Session profile validate failed:", err);
        }
        finally {
            setAppReady(true);
        }
    };
    useEffect(() => {
        validateSessionOnLoad();
    }, []);
    // Fetch notifications center matching role
    const loadNotifications = async () => {
        if (!token)
            return;
        try {
            const res = await fetch('/api/notifications', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        }
        catch (err) {
            console.error("Failed to sync client notifications center:", err);
        }
    };
    // Poll notifications recursively every 10 seconds for real-time alerting
    useEffect(() => {
        if (token) {
            loadNotifications();
            const interval = setInterval(loadNotifications, 10000);
            return () => clearInterval(interval);
        }
        else {
            setNotifications([]);
        }
    }, [token]);
    // Authenticated login callback
    const handleLoginSuccess = (sessionToken, loggedInUser) => {
        localStorage.setItem('gs_session_token', sessionToken);
        setToken(sessionToken);
        setUser(loggedInUser);
    };
    // Safe manual logout
    const handleLogout = async () => {
        if (token) {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
            catch (e) {
                console.error("Logout notification request error:", e);
            }
        }
        localStorage.removeItem('gs_session_token');
        setToken(null);
        setUser(null);
        setShowNotifications(false);
    };
    // Clear single alert notice
    const handleMarkNotifRead = async (id) => {
        if (!token)
            return;
        try {
            const res = await fetch(`/api/notifications/${id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                // Instant visual match update
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            }
        }
        catch (err) {
            console.error(err);
        }
    };
    if (!appReady) {
        return (<div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-500 font-sans">
        <svg className="animate-spin h-7 w-7 text-slate-900 mb-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span className="text-xs font-semibold">Tuning design assets...</span>
      </div>);
    }
    // Calculate unread alerts count
    const unreadNotifCount = notifications.filter(n => !n.read).length;
    return (<div className="font-sans antialiased text-slate-900">
      {!token || !user ? (<Login onLoginSuccess={handleLoginSuccess}/>) : user.role === 'manager' ? (<ManagerDashboard user={user} token={token} onLogout={handleLogout} openNotifications={() => setShowNotifications(true)} unreadCount={unreadNotifCount} language={language} onChangeLanguage={handleLanguageChange}/>) : (<ClientDashboard user={user} token={token} onLogout={handleLogout} openNotifications={() => setShowNotifications(true)} unreadCount={unreadNotifCount} language={language} onChangeLanguage={handleLanguageChange}/>)}

      {/* Slide-out alert notification panel */}
      {showNotifications && token && (<NotificationsDrawer notifications={notifications} onMarkRead={handleMarkNotifRead} onClose={() => setShowNotifications(false)}/>)}
    </div>);
}
