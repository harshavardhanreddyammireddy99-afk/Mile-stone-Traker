import React, { useState, useEffect } from 'react';
import { Users, Landmark, FolderPlus, CheckCircle2, Clock, Sparkles, FileText, UploadCloud, ChevronRight, AlertCircle, FileSpreadsheet, ShieldCheck, Mail, Download } from 'lucide-react';
import { translations } from '../translations.js';
export default function ManagerDashboard({ user, token, onLogout, openNotifications, unreadCount, language, onChangeLanguage }) {
    // Collection storage
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [milestones, setMilestones] = useState([]);
    const [snags, setSnags] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    // Translation helper
    const t = translations[language] || translations.en;
    // Form inputs: New project
    const [newProjectName, setNewProjectName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [location, setLocation] = useState('');
    const [totalPrice, setTotalPrice] = useState('');
    const [retentionPercent, setRetentionPercent] = useState('5');
    const [releaseMonths, setReleaseMonths] = useState('12');
    const [projectFormMsg, setProjectFormMsg] = useState(null);
    // Form inputs: New snag
    const [snagRoom, setSnagRoom] = useState('Main Living Room');
    const [snagDesc, setSnagDesc] = useState('');
    // Form inputs: Share document uploader
    const [docName, setDocName] = useState('');
    const [docType, setDocType] = useState('Layout Plan');
    const [docFile, setDocFile] = useState(null);
    const [docUploadMsg, setDocUploadMsg] = useState(null);
    const [docUploading, setDocUploading] = useState(false);
    // Gemini generator
    const [aiType, setAiType] = useState('invoice');
    const [selectedMsIdForAi, setSelectedMsIdForAi] = useState('');
    const [aiResponse, setAiResponse] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    // General state
    const [loading, setLoading] = useState(true);
    const [errorHeader, setErrorHeader] = useState(null);
    // Load baseline datasets
    const loadManagerData = async () => {
        try {
            setErrorHeader(null);
            // Fetch all projects
            const projRes = await fetch('/api/projects', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!projRes.ok)
                throw new Error("Could not retrieve manager projects list");
            const projData = await projRes.json();
            setProjects(projData);
            // Default select first project if none is active
            if (projData.length > 0 && !selectedProject) {
                setSelectedProject(projData[0]);
            }
            else if (selectedProject) {
                // Refresh currently selected project object
                const updatedSelected = projData.find((p) => p.id === selectedProject.id);
                if (updatedSelected)
                    setSelectedProject(updatedSelected);
            }
            // Fetch global logs
            const auditRes = await fetch('/api/audit-logs', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (auditRes.ok) {
                const auditData = await auditRes.json();
                setAuditLogs(auditData);
            }
        }
        catch (err) {
            setErrorHeader(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    // Select a different project focus
    const loadProjectDetails = async (proj) => {
        try {
            setSelectedProject(proj);
            // Load milestones
            const msRes = await fetch(`/api/projects/${proj.id}/milestones`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const msData = await msRes.json();
            setMilestones(msData);
            if (msData.length > 0) {
                setSelectedMsIdForAi(msData[0].id);
            }
            // Load snags
            const snagsRes = await fetch(`/api/projects/${proj.id}/snags`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const snagsData = await snagsRes.json();
            setSnags(snagsData);
            // Load documents
            const docsRes = await fetch(`/api/projects/${proj.id}/documents`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const docsData = await docsRes.json();
            setDocuments(docsData);
        }
        catch (err) {
            alert(`Could not fetch detail tables for project: ${err.message}`);
        }
    };
    useEffect(() => {
        loadManagerData();
    }, [token]);
    useEffect(() => {
        if (selectedProject) {
            loadProjectDetails(selectedProject);
        }
    }, [selectedProject]);
    // Submit project creator
    const handleCreateProject = async (e) => {
        e.preventDefault();
        setProjectFormMsg(null);
        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newProjectName,
                    clientEmail,
                    location,
                    totalAmount: totalPrice,
                    retentionPercentage: retentionPercent,
                    retentionReleaseMonths: releaseMonths
                })
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error || "Project creation failed");
            setProjectFormMsg({ type: 'success', text: `Project "${newProjectName}" successfully established with 6 standard billing milestones.` });
            setNewProjectName('');
            setClientEmail('');
            setLocation('');
            setTotalPrice('');
            await loadManagerData();
        }
        catch (err) {
            setProjectFormMsg({ type: 'err', text: err.message });
        }
    };
    // Update Project Status
    const handleUpdateStatus = async (status) => {
        if (!selectedProject)
            return;
        try {
            const res = await fetch(`/api/projects/${selectedProject.id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });
            if (!res.ok)
                throw new Error("Status update failed");
            await loadManagerData();
        }
        catch (err) {
            alert(err.message);
        }
    };
    // Milestone triggers (Invoiced, Paid)
    const handleMilestoneAction = async (msId, action) => {
        try {
            const payload = { status: action };
            if (action === 'Invoiced') {
                payload.invoiceNumber = `INV-2026-${Math.floor(100 + Math.random() * 900)}`;
            }
            else {
                payload.paidDate = new Date().toISOString();
            }
            const res = await fetch(`/api/milestones/${msId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (!res.ok)
                throw new Error("Milestone update failed");
            if (selectedProject)
                await loadProjectDetails(selectedProject);
            await loadManagerData();
        }
        catch (err) {
            alert(err.message);
        }
    };
    // Retention Release Fund claim triggers
    const handleReleaseRetention = async () => {
        if (!selectedProject)
            return;
        if (!window.confirm(`Issue claim for direct release of ₹${selectedProject.retentionAmount.toLocaleString()}? This confirms snag clearances.`))
            return;
        try {
            const res = await fetch(`/api/projects/${selectedProject.id}/retention-release`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ release: true })
            });
            if (!res.ok)
                throw new Error("Retention release request rejected");
            if (selectedProject)
                await loadProjectDetails(selectedProject);
            await loadManagerData();
        }
        catch (err) {
            alert(err.message);
        }
    };
    const handleDownloadProjectReport = async () => {
        if (!selectedProject)
            return;
        try {
            const res = await fetch(`/api/projects/${selectedProject.id}/export`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok)
                throw new Error("Project export failed");
            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = downloadUrl;
            anchor.download = `${selectedProject.name.replace(/[^a-zA-Z0-9-_]/g, '_')}_report.csv`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.URL.revokeObjectURL(downloadUrl);
        }
        catch (err) {
            alert(err.message);
        }
    };
    // Add a snag item directly (Manager)
    const handleAddSnag = async (e) => {
        e.preventDefault();
        if (!snagDesc.trim() || !selectedProject)
            return;
        try {
            const res = await fetch(`/api/projects/${selectedProject.id}/snags`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ description: snagDesc, roomLocation: snagRoom })
            });
            if (!res.ok)
                throw new Error("Failed to log snag");
            setSnagDesc('');
            if (selectedProject)
                await loadProjectDetails(selectedProject);
        }
        catch (err) {
            alert(err.message);
        }
    };
    // Resolve / Change snag status
    const handleResolveSnag = async (snagId, nextStatus) => {
        try {
            const res = await fetch(`/api/snags/${snagId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: nextStatus })
            });
            if (!res.ok)
                throw new Error("Snag status adjustment failed");
            if (selectedProject)
                await loadProjectDetails(selectedProject);
        }
        catch (err) {
            alert(err.message);
        }
    };
    // Shared file upload
    const handleDocUpload = async (e) => {
        e.preventDefault();
        if (!docFile || !docName || !selectedProject) {
            setDocUploadMsg({ type: 'err', text: 'Document label and file are required' });
            return;
        }
        setDocUploading(true);
        setDocUploadMsg(null);
        const reader = new FileReader();
        reader.readAsDataURL(docFile);
        reader.onload = async () => {
            const base64Content = reader.result;
            try {
                const response = await fetch(`/api/projects/${selectedProject.id}/documents`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name: docName,
                        type: docType,
                        base64Data: base64Content,
                        fileName: docFile.name,
                        fileSize: `${(docFile.size / (1024 * 1024)).toFixed(2)} MB`
                    })
                });
                if (!response.ok)
                    throw new Error("Document upload failed");
                setDocUploadMsg({ type: 'success', text: 'Document successfully logged in secure cabinet and shared with client.' });
                setDocName('');
                setDocFile(null);
                // Reset file element
                const fileInput = document.getElementById('manager-file-input');
                if (fileInput)
                    fileInput.value = '';
                if (selectedProject)
                    await loadProjectDetails(selectedProject);
            }
            catch (err) {
                setDocUploadMsg({ type: 'err', text: err.message });
            }
            finally {
                setDocUploading(false);
            }
        };
    };
    // Dynamic AI Template generator
    const handleGenerateAiMessage = async (e) => {
        e.preventDefault();
        if (!selectedProject)
            return;
        setAiLoading(true);
        setAiResponse(null);
        const targetMs = milestones.find(m => m.id === selectedMsIdForAi);
        try {
            const res = await fetch('/api/ai/reminder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    project: selectedProject,
                    milestone: targetMs,
                    type: aiType
                })
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error || "Gemini compiler error");
            setAiResponse(data);
        }
        catch (err) {
            alert(err.message);
        }
        finally {
            setAiLoading(false);
        }
    };
    // Pipeline metrics math
    const totalValPortfolio = selectedProject ? selectedProject.totalAmount : projects.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const totalHeldRetention = selectedProject ? selectedProject.retentionAmount : projects.reduce((acc, curr) => acc + curr.retentionAmount, 0);
    if (loading) {
        return (<div className="flex flex-col items-center justify-center min-h-screen bg-[#E6E6FA] text-slate-600 animate-fade-in">
        <svg className="animate-spin h-8 w-8 text-indigo-600 mb-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <p className="text-sm font-bold">Consulting Glory Simon Interiors records...</p>
      </div>);
    }
    return (<div className="min-h-screen bg-[#E6E6FA]">
      {/* Client Header bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-purple-100 shadow-xs px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-purple-50 border border-purple-150 text-purple-700 rounded-xl font-bold text-base tracking-wider">
            GS
          </div>
          <div>
            <h1 className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">Project Manager & Invoicing Hub</h1>
            <p className="text-[10px] text-slate-400 font-medium">Glory Simon Interiors • Admin Area</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:block text-right">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg mb-0.5">
              <ShieldCheck className="w-3 h-3 text-purple-650"/> Admin Access
            </span>
            <p className="text-xs font-semibold text-slate-600">{user.name}</p>
          </div>

          {/* Language select dropdown box */}
          <div className="flex items-center gap-1">
            <select value={language} onChange={(e) => onChangeLanguage(e.target.value)} className="bg-purple-150 hover:bg-purple-200 border border-purple-300 text-purple-950 font-bold text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-400 cursor-pointer">
              <option value="en">English (EN)</option>
              <option value="hi">हिन्दी (HI)</option>
              <option value="te">తెలుగు (TE)</option>
              <option value="ta">தமிழ் (TA)</option>
            </select>
          </div>

          <button onClick={openNotifications} className="p-2 text-slate-500 hover:text-slate-850 hover:bg-slate-100 rounded-xl transition relative border border-slate-100 cursor-pointer">
            <Clock className="w-4 h-4 text-slate-605"/>
            {unreadCount > 0 && (<span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white animate-pulse animate-pulse"/>)}
          </button>

          <button onClick={onLogout} className="flex items-center gap-1 p-2 text-xs font-semibold text-slate-600 hover:text-red-700 bg-slate-50 hover:bg-red-50 rounded-xl border border-slate-200 transition cursor-pointer">
            <Mail className="w-3.5 h-3.5"/>
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {errorHeader && (<div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-start gap-2 text-xs font-medium animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5"/>
            <span>{errorHeader}</span>
          </div>)}

        {/* Global stats bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              {selectedProject ? "Selected Project Price" : "Total Active Portfolio"}
            </span>
            <span className="text-2xl font-black text-slate-950 mt-1 block">₹{totalValPortfolio.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400 font-medium">
              {selectedProject ? `Contract Value for ${selectedProject.name}` : "Design & Execution contracts"}
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                {selectedProject ? "Selected Project Retention" : "DLP Joint Retention Asset"}
              </span>
              <span className="p-1 px-1.5 bg-purple-50 border border-purple-100 text-purple-700 font-bold text-[9px] rounded-md">Safety fund</span>
            </div>
            <span className="text-2xl font-black text-purple-800 mt-1 block flex items-center gap-1.5">
              <Landmark className="w-5 h-5 text-purple-600"/>
              ₹{totalHeldRetention.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {selectedProject ? `Deducted fund from ${selectedProject.clientName}` : "Held by clients across projects"}
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              {selectedProject ? "Selected Client" : "Active Client Contracts"}
            </span>
            <span className="text-2xl font-black text-slate-950 mt-1 block flex items-center gap-1.5">
              <Users className="w-5 h-5 text-blue-600"/>
              {selectedProject ? selectedProject.clientName : `${projects.length} Assigned properties`}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              {selectedProject ? `Location: ${selectedProject.location}` : "Sarah Connor & Robert Chen active"}
            </span>
          </div>
        </div>

        {/* Layout split: Left for pipelines, Right for active details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: Project creators forms and selector */}
          <div className="space-y-6">
            
            {/* Active projects list */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="font-extrabold text-slate-900 text-sm mb-3">Project Directory</h3>
              <div className="space-y-2 max-h-[190px] overflow-y-auto">
                {projects.map((proj) => {
            const isActive = selectedProject?.id === proj.id;
            return (<button key={proj.id} onClick={() => loadProjectDetails(proj)} className={`w-full text-left p-3 rounded-xl border text-xs flex items-center justify-between transition ${isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                      <div className="min-w-0 pr-2">
                        <p className="font-bold truncate">{proj.name}</p>
                        <p className={`text-[10px] mt-0.5 ${isActive ? 'text-blue-200' : 'text-slate-400'}`}>Client: {proj.clientName}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 shrink-0"/>
                    </button>);
        })}
              </div>
            </div>

            {/* Create project form */}
            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <FolderPlus className="w-4 h-4 text-blue-600"/>
                <h3 className="font-extrabold text-slate-900 text-sm">Register Client Contract</h3>
              </div>

              {projectFormMsg && (<div className={`p-2.5 text-xs rounded-xl mb-3 border ${projectFormMsg.type === 'success'
                ? 'bg-green-50 border-green-100 text-green-700'
                : 'bg-red-50 border-red-100 text-red-700'}`}>
                  {projectFormMsg.text}
                </div>)}

              <form onSubmit={handleCreateProject} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Design Property Name
                  </label>
                  <input type="text" required placeholder="e.g. Skyline Penthouse kitchen" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="block w-full text-xs p-2 border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white"/>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Assigned Client Email
                    </label>
                    <input type="email" required placeholder="client@gmail.com" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="block w-full text-xs p-2 border border-slate-300 rounded-xl bg-slate-50/50"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Site Physical Location
                    </label>
                    <input type="text" required placeholder="e.g. Apartment Heights" value={location} onChange={(e) => setLocation(e.target.value)} className="block w-full text-xs p-2 border border-slate-300 rounded-xl bg-slate-50/50"/>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Price (₹)
                    </label>
                    <input type="number" required placeholder="120000" value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} className="block w-full text-xs p-2 border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Retention %
                    </label>
                    <select value={retentionPercent} onChange={(e) => setRetentionPercent(e.target.value)} className="block w-full text-xs p-2 border border-slate-300 rounded-xl bg-slate-50/50">
                      <option value="5">5% (DLP)</option>
                      <option value="10">10% (DLP)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Wait DLP (m)
                    </label>
                    <select value={releaseMonths} onChange={(e) => setReleaseMonths(e.target.value)} className="block w-full text-xs p-2 border border-slate-300 rounded-xl bg-slate-50/50">
                      <option value="6">6 Months</option>
                      <option value="12">12 Months</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="w-full flex justify-center py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer">
                  Create & Seed Milestones
                </button>
              </form>
            </div>

          </div>

          {/* RIGHT: Selected project details & milestones stages actions */}
          <div className="lg:col-span-2 space-y-6">
            
            {selectedProject ? (<div className="space-y-6">
                
                {/* Active Project Card Control Center */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold tracking-wider uppercase bg-blue-600 text-white px-2 py-0.5 rounded-md">
                        Selected Focus
                      </span>
                      <h4 className="text-xl font-bold font-sans mt-1">{selectedProject.name}</h4>
                      <p className="text-[10px] text-slate-300 mt-0.5">Assigned Client: {selectedProject.clientName} ({selectedProject.clientName.toLowerCase() === 'sarah connor' ? 'client@gmail.com' : 'client2@gmail.com'})</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select value={selectedProject.status} onChange={(e) => handleUpdateStatus(e.target.value)} className="p-1 px-2 text-xs bg-slate-800 text-white border border-slate-700 rounded-lg focus:outline-none">
                        <option value="Initiated">Initiated</option>
                        <option value="Design Stage">Design Stage</option>
                        <option value="Procurement & Execution">Procurement & Execution</option>
                        <option value="Snag List Clearance">Snag List Clearance</option>
                        <option value="Defect Liability / Retention">Defect Liability / Retention</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  {/* Retention Release Action bar */}
                  <div className="p-4 bg-amber-50/40 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1 bg-amber-100 text-amber-800 rounded-lg">
                        <Landmark className="w-4 h-4"/>
                      </div>
                      <div>
                        <p className="font-bold text-amber-900">Retention Release Alert System</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Amount: <strong className="text-amber-800">₹{selectedProject.retentionAmount.toLocaleString()}</strong> ({selectedProject.retentionPercentage}% holdback) • Due On Date: <strong className="text-slate-700">{new Date(selectedProject.retentionReleaseDate).toLocaleDateString()}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      {selectedProject.retentionReleased ? (<span className="p-1.5 px-3 bg-green-100 text-green-800 font-bold rounded-xl text-[10px]">
                          ✓ Retention Collected Successfully
                        </span>) : (<div className="space-y-1">
                          <button onClick={handleReleaseRetention} disabled={!selectedProject.punchListCleared && selectedProject.status !== 'Defect Liability / Retention'} className="p-1.5 px-3 bg-amber-600 hover:bg-amber-700 font-bold text-white rounded-xl text-[11px] transition shadow-xs disabled:opacity-50">
                            Claim Retention Release
                          </button>
                          {!selectedProject.punchListCleared && (<p className="text-[9px] text-red-500 font-medium">* Must resolve all punch list snags first</p>)}
                        </div>)}
                      <button onClick={handleDownloadProjectReport} className="p-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[11px] transition shadow-xs flex items-center gap-2">
                        <Download className="w-3.5 h-3.5" />
                        Export Report
                      </button>
                    </div>
                  </div>

                  {/* Milestones billing table */}
                  <div className="p-5">
                    <h5 className="font-bold text-slate-800 text-xs mb-3">Invoice & Milestone Stage Checklist</h5>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                            <th className="pb-2">Order</th>
                            <th className="pb-2">Phase Title</th>
                            <th className="pb-2 text-right">Payout Amt (Net)</th>
                            <th className="pb-2 text-center">Retention Deducted</th>
                            <th className="pb-2 text-center">Status</th>
                            <th className="pb-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {milestones.map((ms) => (<tr key={ms.id} className="hover:bg-slate-50">
                              <td className="py-2.5 font-bold text-slate-400">{ms.stageOrder}</td>
                              <td className="py-2.5">
                                <p className="font-semibold text-slate-800">{ms.name}</p>
                                {ms.invoiceNumber && <span className="text-[9px] font-mono p-0.5 bg-slate-100 rounded text-slate-500">No: {ms.invoiceNumber}</span>}
                              </td>
                              <td className="py-2.5 text-right font-bold text-slate-900">₹{(ms.invoiceAmount - ms.retentionHeld).toLocaleString()}</td>
                              <td className="py-2.5 text-center text-slate-500 font-mono">₹{ms.retentionHeld.toLocaleString()}</td>
                              <td className="py-2.5 text-center">
                                {ms.status === 'Paid' ? (<span className="p-1 px-2 bg-green-50 text-green-700 rounded-lg text-[9px] font-bold">Paid / Settled</span>) : ms.status === 'Invoiced' ? (<span className="p-1 px-2 bg-amber-50 text-amber-700 rounded-lg text-[9px] font-bold animate-pulse">Invoiced</span>) : (<span className="p-1 px-2 bg-slate-50 text-slate-400 rounded-lg text-[9px]">Scheduled</span>)}
                              </td>
                              <td className="py-2.5 text-right">
                                {ms.status === 'Pending' && (<button onClick={() => handleMilestoneAction(ms.id, 'Invoiced')} className="p-1 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] shadow-xs cursor-pointer">
                                    Issue Invoice
                                  </button>)}
                                {ms.status === 'Invoiced' && (<button onClick={() => handleMilestoneAction(ms.id, 'Paid')} className="p-1 px-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] shadow-xs cursor-pointer">
                                    Record Payment
                                  </button>)}
                              </td>
                            </tr>))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Split: Snags clearing layout and File shared center */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Snags inspection checklist */}
                  <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
                    <h5 className="font-bold text-slate-800 text-xs mb-3 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-slate-600"/> Site defect Snags Clearing list
                    </h5>

                    <div className="space-y-3 max-h-[190px] overflow-y-auto mb-4">
                      {snags.length === 0 ? (<div className="text-center py-10 text-slate-400 text-xs font-semibold bg-slate-50 rounded-xl">
                          No pending defects logged by client Sarah.
                        </div>) : (snags.map((snag) => (<div key={snag.id} className="p-2.5 border rounded-xl text-xs bg-slate-50">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-bold text-slate-500">{snag.roomLocation}</span>
                              <span>
                                {snag.status === 'Cleared' ? (<span className="text-green-700 font-bold">Cleared</span>) : snag.status === 'In Progress' ? (<span className="text-blue-600 font-bold">Fixing...</span>) : (<span className="text-amber-700 font-bold">Logged</span>)}
                              </span>
                            </div>
                            <p className="font-semibold text-slate-800 mt-1">{snag.description}</p>
                            
                            {/* Actions transition */}
                            {snag.status !== 'Cleared' && (<div className="mt-2.5 flex items-center gap-2">
                                {snag.status === 'Pending' && (<button onClick={() => handleResolveSnag(snag.id, 'In Progress')} className="p-1 px-2 bg-slate-900 text-white font-semibold rounded text-[9px]">
                                    Set in progress
                                  </button>)}
                                <button onClick={() => handleResolveSnag(snag.id, 'Cleared')} className="p-1 px-2 bg-green-600 text-white font-semibold rounded text-[9px]">
                                  Mark Cleared
                                </button>
                              </div>)}
                          </div>)))}
                    </div>

                    {/* Direct snag logging */}
                    <form onSubmit={handleAddSnag} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 gap-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <select value={snagRoom} onChange={(e) => setSnagRoom(e.target.value)} className="p-1 border rounded bg-white">
                          <option value="Main Living Room">Main Living Room</option>
                          <option value="Modular Kitchen Area">Modular Kitchen Area</option>
                          <option value="Master Bedroom">Master Bedroom</option>
                        </select>
                        <input type="text" required placeholder="Short defect description..." value={snagDesc} onChange={(e) => setSnagDesc(e.target.value)} className="p-1 border rounded bg-white"/>
                      </div>
                      <button type="submit" className="w-full py-1 bg-slate-900 text-white font-bold text-[10px] rounded">
                        Log Snag Item
                      </button>
                    </form>
                  </div>

                  {/* Document uploads cabinet */}
                  <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
                    <h5 className="font-bold text-slate-800 text-xs mb-3 flex items-center gap-1.5 animate-pulse">
                      <FileText className="w-4 h-4 text-slate-600 animate-bounce"/> Blueprint & Invoice Share Desk
                    </h5>

                    <div className="space-y-2 mb-4 max-h-[140px] overflow-y-auto">
                      {documents.map((doc) => (<div key={doc.id} className="p-2 bg-slate-50 rounded-xl border text-xs flex justify-between items-center">
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold text-slate-800 truncate">{doc.name}</p>
                            <p className="text-[9px] text-slate-400 font-medium">Shared By: {doc.uploadedBy.split(":")[1]}</p>
                          </div>
                          <a href={doc.fileUrl} download={doc.fileName} target="_blank" referrerPolicy="no-referrer" className="p-1 text-slate-500 hover:text-slate-800 bg-white border rounded">
                            <Download className="w-3.5 h-3.5"/>
                          </a>
                        </div>))}
                    </div>

                    <form onSubmit={handleDocUpload} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                      {docUploadMsg && <div className={`p-1.5 text-[10px] rounded ${docUploadMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{docUploadMsg.text}</div>}
                      <input type="text" placeholder="Document Display Name..." required value={docName} onChange={(e) => setDocName(e.target.value)} className="block w-full text-xs p-1 border rounded bg-white"/>
                      <div className="grid grid-cols-2 gap-2">
                        <select value={docType} onChange={(e) => setDocType(e.target.value)} className="block w-full p-1 border rounded bg-white text-[10px]">
                          <option value="Layout Plan">Layout Plan</option>
                          <option value="Quotation">Quotation</option>
                          <option value="Milestone Invoice">Milestone Invoice</option>
                        </select>
                        <input type="file" id="manager-file-input" required onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                    setDocFile(e.target.files[0]);
                }
            }} className="block w-full text-[10px] overflow-hidden"/>
                      </div>
                      <button type="submit" disabled={docUploading} className="w-full flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 text-[11px] rounded transition cursor-pointer">
                        <UploadCloud className="w-3.5 h-3.5"/>
                        {docUploading ? "Sharing PDF..." : "Share securing with Client"}
                      </button>
                    </form>
                  </div>

                </div>

                {/* Gemini Dynamic reminder generator */}
                <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-3.5 h-3.5 text-violet-500"/>
                    <h5 className="font-extrabold text-slate-900 text-xs sm:text-sm">Gemini Dynamic Invoice & Retention claims Compiler</h5>
                  </div>

                  <form onSubmit={handleGenerateAiMessage} className="bg-slate-50 p-4 border rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Notice Template Category</label>
                      <select value={aiType} onChange={(e) => setAiType(e.target.value)} className="block w-full p-2 border rounded-xl bg-white">
                        <option value="invoice">Outstanding Milestone billing (Invoicing Alert)</option>
                        <option value="retention">Defect Liability End / Claims Release Notice</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Target Billing Milestone</label>
                      <select value={selectedMsIdForAi} onChange={(e) => setSelectedMsIdForAi(e.target.value)} className="block w-full p-2 border rounded-xl bg-white">
                        {milestones.map((m) => (<option key={m.id} value={m.id}>Stage #{m.stageOrder} - {m.name} (₹{m.invoiceAmount.toLocaleString()})</option>))}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button type="submit" disabled={aiLoading} className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 cursor-pointer disabled:opacity-50 transition">
                        <Sparkles className="w-4 h-4 text-white"/> Compile Smart Draft
                      </button>
                    </div>
                  </form>

                  {aiLoading && (<div className="flex items-center gap-2 justify-center py-6 text-slate-400 text-xs">
                      <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      <span>Gemini AI is parsing contract terms and drafting professional template claims...</span>
                    </div>)}

                  {aiResponse && (<div className="mt-4 p-5 bg-violet-50/40 border border-violet-100 rounded-2xl text-xs space-y-3">
                      <div className="flex items-center gap-2 border-b border-violet-100 pb-2">
                        <div className="p-1.5 bg-violet-100 text-violet-700 rounded-lg">
                          <Mail className="w-4 h-4"/>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-violet-600">Dynamic AI Generated Subject</p>
                          <p className="font-extrabold text-slate-900">{aiResponse.subject}</p>
                        </div>
                      </div>
                      <div className="whitespace-pre-line text-slate-700 leading-relaxed font-sans max-h-[220px] overflow-y-auto pr-2 bg-white p-3.5 border rounded-xl">
                        {aiResponse.text}
                      </div>
                    </div>)}
                </div>

                {/* System-wide Audit Log Trail */}
                <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
                  <h5 className="font-bold text-slate-850 text-xs mb-3 flex items-center gap-1 text-slate-650">
                    <FileSpreadsheet className="w-4 h-4 text-slate-550"/> Comprehensive System Audit Logs
                  </h5>

                  <div className="overflow-x-auto">
                    <div className="max-h-[160px] overflow-y-auto">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 text-[9px] uppercase font-bold sticky top-0 bg-white">
                            <th className="pb-1.5">Timestamp</th>
                            <th className="pb-1.5">Action Code</th>
                            <th className="pb-1.5">Authorized Operator</th>
                            <th className="pb-1.5">Assigned Location</th>
                            <th className="pb-1.5">Activity Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[#334155]">
                          {auditLogs.map((log) => (<tr key={log.id} className="hover:bg-slate-50/50 transition">
                              <td className="py-2 text-[10px] text-slate-400 white-space-nowrap">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </td>
                              <td className="py-2 font-bold text-slate-800">{log.action}</td>
                              <td className="py-2">
                                <span className={`p-0.5 px-1.5 rounded-md font-bold text-[9px] ${log.userRole === 'manager' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                                  {log.userName}
                                </span>
                              </td>
                              <td className="py-2 font-medium truncate max-w-[100px]">{log.projectName}</td>
                              <td className="py-2 text-slate-500 font-sans">{log.details}</td>
                            </tr>))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              </div>) : (<div className="text-center py-20 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3"/>
                <h4 className="text-sm font-bold text-slate-800">No project focus chosen</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Please create a registration or select an ongoing property from the directory map to inspect stages.</p>
              </div>)}

          </div>

        </div>

      </main>
    </div>);
}
