import React, { useState, useEffect } from 'react';
import { Building, CheckCircle, Clock, AlertCircle, FileText, UploadCloud, HelpCircle, Download, Landmark, LogOut, ListTodo, X, Camera } from 'lucide-react';
import { translations } from '../translations.js';
export default function ClientDashboard({ user, token, onLogout, openNotifications, unreadCount, language, onChangeLanguage }) {
    const [project, setProject] = useState(null);
    const [milestones, setMilestones] = useState([]);
    const [snags, setSnags] = useState([]);
    const [documents, setDocuments] = useState([]);
    // Translation dictionary helper
    const t = translations[language] || translations.en;
    // States of interactive sections
    const [activeInvoice, setActiveInvoice] = useState(null);
    const [newSnagDesc, setNewSnagDesc] = useState('');
    const [newSnagRoom, setNewSnagRoom] = useState('Main Living Room');
    // Progress photos view state
    const [selectedStep, setSelectedStep] = useState(1);
    const [viewCompleted, setViewCompleted] = useState(true);
    // Upload states
    const [uploadName, setUploadName] = useState('');
    const [uploadType, setUploadType] = useState('Site Photo');
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadMsg, setUploadMsg] = useState(null);
    const [uploading, setUploading] = useState(false);
    // General Loading & Feedback
    const [loading, setLoading] = useState(true);
    const [errorNotice, setErrorNotice] = useState(null);
    // Load project datasets
    const loadDashboardData = async () => {
        try {
            setErrorNotice(null);
            // Get assigned project
            const projRes = await fetch('/api/projects', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!projRes.ok)
                throw new Error("Could not retrieve client project");
            const clientProjects = await projRes.json();
            if (clientProjects.length === 0) {
                setProject(null);
                setLoading(false);
                return;
            }
            const activeProj = clientProjects[0];
            setProject(activeProj);
            // Fetch milestones
            const msRes = await fetch(`/api/projects/${activeProj.id}/milestones`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const msData = await msRes.json();
            setMilestones(msData);
            // Fetch snags
            const snagsRes = await fetch(`/api/projects/${activeProj.id}/snags`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const snagsData = await snagsRes.json();
            setSnags(snagsData);
            // Fetch documents
            const docsRes = await fetch(`/api/projects/${activeProj.id}/documents`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const docsData = await docsRes.json();
            setDocuments(docsData);
        }
        catch (err) {
            console.error(err);
            setErrorNotice(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadDashboardData();
    }, [user, token]);
    // Handle invoice simulation check out
    const handlePayInvoice = async (msId) => {
        try {
            const res = await fetch(`/api/milestones/${msId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'Paid', paidDate: new Date().toISOString() })
            });
            if (!res.ok)
                throw new Error("Payment transaction simulation failed");
            setActiveInvoice(null);
            await loadDashboardData();
        }
        catch (err) {
            alert(err.message);
        }
    };
    // Submit new defect reported by client
    const handleSubmitSnag = async (e) => {
        e.preventDefault();
        if (!newSnagDesc.trim() || !project)
            return;
        try {
            const res = await fetch(`/api/projects/${project.id}/snags`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ description: newSnagDesc, roomLocation: newSnagRoom })
            });
            if (!res.ok)
                throw new Error("Punch List defect submit failed");
            setNewSnagDesc('');
            await loadDashboardData();
        }
        catch (err) {
            alert(err.message);
        }
    };
    // Secure File Upload Base64 handler
    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!uploadFile || !uploadName || !project) {
            setUploadMsg({ type: 'err', text: 'Please fill name and drop a secure file' });
            return;
        }
        setUploading(true);
        setUploadMsg(null);
        // Convert file to base64
        const reader = new FileReader();
        reader.readAsDataURL(uploadFile);
        reader.onload = async () => {
            const base64Content = reader.result;
            try {
                const response = await fetch(`/api/projects/${project.id}/documents`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name: uploadName,
                        type: uploadType,
                        base64Data: base64Content,
                        fileName: uploadFile.name,
                        fileSize: `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB`
                    })
                });
                if (!response.ok)
                    throw new Error("File share upload rejected");
                setUploadMsg({ type: 'success', text: 'Document uploaded and shared securely with manager!' });
                setUploadName('');
                setUploadFile(null);
                // Reset file input element
                const fileInput = document.getElementById('client-file-input');
                if (fileInput)
                    fileInput.value = '';
                await loadDashboardData();
            }
            catch (err) {
                setUploadMsg({ type: 'err', text: err.message });
            }
            finally {
                setUploading(false);
            }
        };
    };
    // Main render loading state check
    if (loading) {
        return (<div className="flex flex-col items-center justify-center min-h-screen bg-[#E6E6FA] text-slate-600 animate-fade-in">
        <svg className="animate-spin h-8 w-8 text-indigo-600 mb-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <p className="text-sm font-bold">Consulting Glory Simon databases...</p>
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
            <h1 className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">{t.clientDesignPortal}</h1>
            <p className="text-[10px] text-slate-400 font-medium">{t.glorySimonInteriors}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Welcome User Label */}
          <div className="hidden md:block text-right">
            <p className="text-xs font-bold text-slate-900">{user.name}</p>
            <p className="text-[10px] text-slate-400">{user.email}</p>
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

          {/* Quick Realtime Notifications drawer trigger */}
          <button onClick={openNotifications} className="p-2 text-slate-500 hover:text-slate-850 hover:bg-slate-100 rounded-xl transition relative border border-slate-100 cursor-pointer">
            <Clock className="w-4 h-4 text-slate-650"/>
            {unreadCount > 0 && (<span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-650 rounded-full border-2 border-white animate-pulse"/>)}
          </button>

          {/* Secure Logout action */}
          <button onClick={onLogout} className="flex items-center gap-1 p-2 text-xs font-semibold text-slate-600 hover:text-red-700 bg-slate-50 hover:bg-red-50 rounded-xl border border-slate-200 transition cursor-pointer">
            <LogOut className="w-3.5 h-3.5"/>
            <span className="hidden sm:inline">{t.logout}</span>
          </button>
        </div>
      </header>

      {/* Main Core View Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {errorNotice && (<div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-start gap-2 text-xs font-medium animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5"/>
            <span>{errorNotice}</span>
          </div>)}

        {!project ? (<div className="text-center py-16 bg-white border border-slate-200 rounded-2xl max-w-xl mx-auto shadow-xs">
            <Building className="w-12 h-12 text-slate-300 mx-auto mb-3"/>
            <h3 className="text-lg font-bold text-slate-850">Assigning Project...</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Welcome to the Glory Simon Interiors digital space. Our designers are presently preparing your milestone schedule. It will appear here shortly!
            </p>
            <div className="mt-4 p-3 bg-slate-50 rounded-xl text-[11px] text-slate-400">
              Logged in successfully as <strong className="text-slate-600">{user.name}</strong> ({user.email}).
            </div>
          </div>) : (<div className="space-y-6">
            
            {/* Primary Project Headline Info Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-6 bg-slate-900 border-b border-slate-800 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-blue-600 text-white rounded-lg">
                      {t.activeRenovation}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">{project.location}</span>
                  </div>
                  <h2 className="text-2xl font-black text-white mt-1.5 font-sans leading-tight">
                    {project.name}
                  </h2>
                </div>
                
                {/* Visual Overall Stage Progress tracker */}
                <div className="flex flex-col md:items-end">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    {t.status}
                  </span>
                  <span className="text-sm font-semibold text-blue-400 mt-1">
                    {project.status}
                  </span>
                </div>
              </div>

              {/* Financial & General Tracking Breakdown */}
              <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-slate-100 bg-white">
                <div className="p-4 border-r border-b lg:border-b-0 border-slate-100">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    {t.totalContractPrice}
                  </span>
                  <span className="text-xl font-extrabold text-slate-900 mt-1 block">
                    ₹{project.totalAmount.toLocaleString()}
                  </span>
                </div>

                <div className="p-4 border-r border-b lg:border-b-0 border-slate-100 bg-blue-50/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 block">
                      {t.defectRetentionHeld}
                    </span>
                    <div className="p-1 px-1.5 bg-blue-50 rounded-md border border-blue-100 text-[9px] font-bold text-blue-700">
                      {project.retentionPercentage}% DLP Fund
                    </div>
                  </div>
                  <span className="text-xl font-extrabold text-blue-800 mt-0.5 block flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-blue-600"/>
                    ₹{project.retentionAmount.toLocaleString()}
                  </span>
                </div>

                <div className="p-4 border-r border-slate-100">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Defect Liability Claim Date
                  </span>
                  <span className="text-xs font-semibold text-slate-800 mt-1 block">
                    {new Date(project.retentionReleaseDate).toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric'
            })}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    (Claims retention fund on time)
                  </span>
                </div>

                <div className="p-4 bg-slate-50/30">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    {t.snagList}
                  </span>
                  <span className="mt-1 block">
                    {project.punchListCleared ? (<span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-lg">
                        <CheckCircle className="w-3.5 h-3.5"/> All Snags Resolved
                      </span>) : (<span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5 animate-pulse"/> Pending Snags
                      </span>)}
                  </span>
                </div>
              </div>
            </div>

            {/* Middle Section: Milestone & Billings Progress Table (Left 3rd, Gemini Side Panel Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Billing Milestones Table */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs py-5 px-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-100 rounded-lg text-slate-700">
                        <CheckCircle className="w-4 h-4"/>
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                          Milestone Payments & Invoices
                        </h3>
                        <p className="text-[11px] text-slate-400">Track stage-wise payouts and defect liability retentions</p>
                      </div>
                    </div>
                  </div>

                  {/* List */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          <th className="pb-3 font-semibold">{t.stage}</th>
                          <th className="pb-3 font-semibold">{t.milestoneName}</th>
                          <th className="pb-3 font-semibold text-right">{t.amountNet}</th>
                          <th className="pb-3 font-semibold text-center">{t.defectRetentionHeld}</th>
                          <th className="pb-3 font-semibold text-center">{t.status}</th>
                          <th className="pb-3 font-semibold"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {milestones.map((ms) => {
                const getStatusBadge = (status) => {
                    switch (status) {
                        case 'Paid':
                            return <span className="p-1 px-2.5 bg-green-50 border border-green-200 text-green-700 font-bold text-[10px] rounded-full inline-block">Handover Approved</span>;
                        case 'Invoiced':
                            return <span className="p-1 px-2.5 bg-amber-50 border border-amber-200 text-amber-700 font-bold text-[10px] rounded-full inline-block animate-pulse">Payment Pending</span>;
                        default:
                            return <span className="p-1 px-2.5 bg-slate-50 border border-slate-100 text-slate-400 font-medium text-[10px] rounded-full inline-block">Scheduled</span>;
                    }
                };
                return (<tr key={ms.id} className="hover:bg-slate-50/50 transition">
                              <td className="py-3.5 font-bold text-slate-400 text-center w-8">
                                #{ms.stageOrder}
                              </td>
                              <td className="py-3.5 font-semibold text-slate-800 max-w-xs truncate">
                                <div>
                                  <p className="font-semibold">{ms.name}</p>
                                  {ms.invoiceNumber && (<p className="text-[9px] text-slate-400 font-mono font-medium mt-0.5">Invoice: {ms.invoiceNumber}</p>)}
                                </div>
                              </td>
                              <td className="py-3.5 font-bold text-slate-900 text-right">
                                ₹{(ms.invoiceAmount - ms.retentionHeld).toLocaleString()}
                              </td>
                              <td className="py-3.5 text-center text-slate-500 font-mono text-[11px]">
                                ₹{ms.retentionHeld.toLocaleString()} ({project.retentionPercentage}%)
                              </td>
                              <td className="py-3.5 text-center">
                                {getStatusBadge(ms.status)}
                              </td>
                              <td className="py-3.5 text-right">
                                {ms.status === 'Invoiced' && (<button onClick={() => setActiveInvoice(ms)} className="p-1 px-2.5 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition cursor-pointer">
                                    Review Invoice
                                  </button>)}
                              </td>
                            </tr>);
            })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Punch List Clearance & Defect Snags (Client-Reported defects) */}
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs py-5 px-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Reported snags list */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ListTodo className="w-4 h-4 text-slate-600"/>
                      <h4 className="font-extrabold text-slate-900 text-sm">Site Snags & Defect Clearance</h4>
                    </div>

                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-2">
                      {snags.length === 0 ? (<div className="text-center py-6 bg-slate-50 rounded-xl text-slate-400 text-xs">
                          No pending defects/snags observed.
                        </div>) : (snags.map((snag) => (<div key={snag.id} className={`p-2.5 rounded-xl border text-xs ${snag.status === 'Cleared'
                    ? 'bg-green-50/50 border-green-100 text-slate-600'
                    : snag.status === 'In Progress'
                        ? 'bg-blue-50/50 border-blue-100 text-slate-800'
                        : 'bg-amber-50/50 border-amber-100 text-slate-900'}`}>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[9px] uppercase tracking-wider text-slate-400">
                                {snag.roomLocation}
                              </span>
                              <span className="font-bold text-[9px]">
                                {snag.status === 'Cleared' ? (<span className="text-green-700">✓ Resolved</span>) : snag.status === 'In Progress' ? (<span className="text-blue-600 animate-pulse">⚙ Fixing...</span>) : (<span className="text-amber-700">● Logged</span>)}
                              </span>
                            </div>
                            <p className="mt-1 font-medium">{snag.description}</p>
                            <p className="text-[8px] text-slate-400 mt-1">Reported by: {snag.reportedBy}</p>
                          </div>)))}
                    </div>
                  </div>

                   {/* Submit defect log */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h5 className="font-bold text-slate-800 text-xs mb-2">{t.reportSnagIssue}</h5>
                    <form onSubmit={handleSubmitSnag} className="space-y-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                          {t.roomLocation}
                        </label>
                        <select value={newSnagRoom} onChange={(e) => setNewSnagRoom(e.target.value)} className="block w-full text-xs p-1.5 border border-slate-300 rounded-lg bg-white">
                          <option value="Main Living Room">Main Living Room</option>
                          <option value="Modular Kitchen Area">Modular Kitchen Area</option>
                          <option value="Master Bedroom">Master Bedroom</option>
                          <option value="Double Height Lounge">Double Height Lounge</option>
                          <option value="Guest Sanitary Suite">Guest Sanitary Suite</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                          Defect Description
                        </label>
                        <textarea placeholder={t.describeSnag} required value={newSnagDesc} onChange={(e) => setNewSnagDesc(e.target.value)} rows={2} className="block w-full text-xs p-1.5 border border-slate-300 rounded-lg bg-white resize-none"/>
                      </div>

                      <button type="submit" className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition cursor-pointer">
                        {t.submitSnag}
                      </button>
                    </form>
                  </div>

                </div>

              </div>

              {/* Side Column: Interactive Progress photos gallery and Document vault */}
              <div className="space-y-6">
                
                {/* Milestone Step Photos Viewer */}
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs py-5 px-6 flex flex-col">
                  <div className="flex items-center gap-2 mb-3 border-b border-purple-50 pb-3">
                    <div className="p-1 px-1.5 bg-purple-50 text-purple-600 rounded-lg">
                      <Camera className="w-3.5 h-3.5"/>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        {t.projectProgressPhotos}
                      </h4>
                      <p className="text-[9px] text-slate-400 font-medium">
                        {t.progressPhotosDesc}
                      </p>
                    </div>
                  </div>

                  {/* 1 to 6 Stage Selector Buttons */}
                  <div className="grid grid-cols-6 gap-1 mb-4">
                    {[1, 2, 3, 4, 5, 6].map((stepNo) => {
                // Lookup matching milestone status
                const msMatch = milestones.find(m => m.stageOrder === stepNo);
                let borderClr = "border-slate-200 text-slate-500 bg-white";
                if (msMatch) {
                    if (msMatch.status === 'Paid') {
                        borderClr = "border-green-300 text-green-700 bg-green-50";
                    }
                    else if (msMatch.status === 'Invoiced') {
                        borderClr = "border-amber-300 text-amber-700 bg-amber-50";
                    }
                    else if (selectedStep === stepNo) {
                        borderClr = "border-purple-400 text-purple-700 bg-purple-50";
                    }
                }
                const isCurrentlySelected = selectedStep === stepNo;
                return (<button key={stepNo} onClick={() => setSelectedStep(stepNo)} className={`py-1.5 px-1 text-center font-extrabold text-xs rounded-xl border transition-all cursor-pointer ${borderClr} ${isCurrentlySelected ? 'ring-2 ring-purple-600 font-black' : 'hover:bg-slate-50'}`} title={msMatch?.name || `Stage ${stepNo}`}>
                          S{stepNo}
                        </button>);
            })}
                  </div>

                  {/* Selected Step Showcase */}
                  {(() => {
                const stepDetails = {
                    1: {
                        name: "Inception, Theme & Space Planning",
                        underConstructionUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=600&q=80",
                        completedUrl: "https://images.unsplash.com/photo-1545464693-f1798a373343?auto=format&fit=crop&w=600&q=80",
                        description: "Layout freeze, moodboards, custom 3D interior design renderings, and structural layout approvals finalized."
                    },
                    2: {
                        name: "Plumbing, Civil Alterations & Demolition",
                        underConstructionUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80",
                        completedUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80",
                        description: "Wall demising, layout extensions, premium concealed plumbing piping, and wet-area floor sealing finished."
                    },
                    3: {
                        name: "False Ceiling & Electrical Concealment",
                        underConstructionUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80",
                        completedUrl: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=600&q=80",
                        description: "Concealed heavy-duty conduit wiring, automation control runs, electrical switches, and designer false ceiling framing."
                    },
                    4: {
                        name: "Premium Woodwork, Cabinetry & Veneers",
                        underConstructionUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80",
                        completedUrl: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80",
                        description: "Boiling water-proof plywood assembly, soft-close hinges, premium cabinetry shutters, customized closets, and high-gloss gloss cabinetry laminates."
                    },
                    5: {
                        name: "Finishing, Wall Treatment & Lighting Trim",
                        underConstructionUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80",
                        completedUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80",
                        description: "Beautiful premium paint coats, luxury texture coatings, accent wallpapers, integrated warm lighting trims, and custom moldings."
                    },
                    6: {
                        name: "Handover Inspection, Punch List & Defect liability",
                        underConstructionUrl: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=600&q=80",
                        completedUrl: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80",
                        description: "Comprehensive punch-list rectification, detailed snag-rectification walk, designer styling, and formal hand-over certificate issuance."
                    }
                }[selectedStep] || {
                    name: "Phase Progress details",
                    underConstructionUrl: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=600&q=80",
                    completedUrl: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80",
                    description: "Track complete stages visually as the structural and interior elements progress chronologically."
                };
                const msMatch = milestones.find(m => m.stageOrder === selectedStep);
                const isPaid = msMatch?.status === 'Paid';
                const isInvoiced = msMatch?.status === 'Invoiced';
                return (<div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-extrabold text-slate-800">
                            Stage {selectedStep}: {stepDetails.name}
                          </p>
                          <span>
                            {isPaid ? (<span className="p-1 px-1.5 text-[9px] font-bold bg-green-50 text-green-700 border border-green-200 rounded-md">
                                {t.paidSettled}
                              </span>) : isInvoiced ? (<span className="p-1 px-1.5 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
                                {t.milestoneInvoiced}
                              </span>) : (<span className="p-1 px-1.5 text-[9px] font-bold bg-slate-50 text-slate-500 border border-slate-200 rounded-md">
                                Planned
                              </span>)}
                          </span>
                        </div>

                        {/* Interactive Pill View Switcher */}
                        <div className="flex rounded-lg p-0.5 bg-slate-100 text-[10px] font-bold">
                          <button type="button" onClick={() => setViewCompleted(false)} className={`flex-1 py-1 rounded-md text-center transition ${!viewCompleted ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}>
                            {t.beforePhoto}
                          </button>
                          <button type="button" onClick={() => setViewCompleted(true)} className={`flex-1 py-1 rounded-md text-center transition ${viewCompleted ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}>
                            {t.afterPhoto}
                          </button>
                        </div>

                        {/* Slide Photo Display */}
                        <div className="relative h-[220px] rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group">
                          <img src={viewCompleted ? stepDetails.completedUrl : stepDetails.underConstructionUrl} alt={stepDetails.name} referrerPolicy="no-referrer" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/>
                          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-slate-950/80 via-slate-950/40 to-transparent p-3 pt-8 pb-3.5">
                            <span className="text-[9px] font-bold text-white/90 bg-purple-650/80 backdrop-blur-xs px-2 py-0.5 rounded-md uppercase tracking-wider">
                              {viewCompleted ? t.afterPhoto : t.beforePhoto}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-500 leading-relaxed italic bg-purple-50/30 p-2.5 rounded-xl border border-purple-50/60">
                          {stepDetails.description}
                        </p>
                      </div>);
            })()}
                </div>

                {/* Secure documents shared list */}
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs py-5 px-6">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-600"/>
                      <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        {t.documentVault}
                      </h4>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 font-medium mb-2.5">
                    {t.secureFilesDesc}
                  </p>

                  <div className="space-y-2.5 max-h-[160px] overflow-y-auto mb-3">
                    {documents.length === 0 ? (<div className="text-center py-6 text-slate-400 text-xs font-semibold">
                        {t.noLayoutsUploaded}
                      </div>) : (documents.map((doc) => (<div key={doc.id} className="flex items-start justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition border border-slate-200">
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-semibold text-slate-800 truncate">{doc.name}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">{doc.type} • {doc.fileSize}</p>
                          </div>
                          <a href={doc.fileUrl} download={doc.fileName} target="_blank" referrerPolicy="no-referrer" className="p-1.5 text-slate-500 hover:text-slate-850 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shrink-0">
                            <Download className="w-3.5 h-3.5"/>
                          </a>
                        </div>)))}
                  </div>

                  {/* Drag-and-drop secure file uploader */}
                  <form onSubmit={handleFileUpload} className="space-y-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    {uploadMsg && (<div className={`p-1.5 text-[10px] rounded-md ${uploadMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {uploadMsg.text}
                      </div>)}
                    <div>
                      <input type="text" placeholder={t.nameOfDocument} required value={uploadName} onChange={(e) => setUploadName(e.target.value)} className="block w-full text-xs p-1.5 border border-slate-300 rounded-lg bg-white"/>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select value={uploadType} onChange={(e) => setUploadType(e.target.value)} className="block w-full text-[11px] p-1 border border-slate-300 rounded-lg bg-white">
                        <option value="Site Photo">Site Photo</option>
                        <option value="Quotation">Quotation</option>
                        <option value="Layout Plan">Layout Plan</option>
                      </select>
                      
                      <input type="file" id="client-file-input" required onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                    setUploadFile(e.target.files[0]);
                }
            }} className="block w-full text-[10px] text-slate-500 overflow-hidden"/>
                    </div>

                    <button type="submit" disabled={uploading} className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer">
                      <UploadCloud className="w-3.5 h-3.5"/>
                      {uploading ? "Sharing file..." : t.uploadNewDoc}
                    </button>
                  </form>
                </div>

              </div>

            </div>

          </div>)}
      </main>

      {/* Invoice Detail simulated Checkout Modal */}
      {activeInvoice && (<div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-1 px-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <FileText className="w-4 h-4"/>
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900">Stage Invoice Clearance</h3>
                  <p className="text-[10px] text-slate-500">Invoice: {activeInvoice.invoiceNumber}</p>
                </div>
              </div>
              <button onClick={() => setActiveInvoice(null)} className="p-1 bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                <X className="w-4.5 h-4.5"/>
              </button>
            </div>

            {/* Invoice Breakdown body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-blue-50/20 border border-blue-100 rounded-xl space-y-2">
                <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                  Project: {project?.name}
                </span>
                <h4 className="font-extrabold text-slate-900 text-sm">
                  Milestone #{activeInvoice.stageOrder}: {activeInvoice.name}
                </h4>
              </div>

              {/* Pricing Math */}
              <div className="space-y-2">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Milestone Portion Total</span>
                  <span className="font-bold text-slate-800">₹{activeInvoice.invoiceAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2 text-blue-755 text-blue-700">
                  <div className="flex items-center gap-1">
                    <span>Defect retention Deducted ({project?.retentionPercentage || 5}%)</span>
                    <span title="Retention held until delivery period" aria-label="Retention held until delivery period">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-350 shrink-0 cursor-pointer"/>
                    </span>
                  </div>
                  <span className="font-bold">-₹{activeInvoice.retentionHeld.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 text-sm">
                  <span className="font-bold text-slate-900">Invoiced Dues Payable Now</span>
                  <span className="font-black text-slate-950">₹{(activeInvoice.invoiceAmount - activeInvoice.retentionHeld).toLocaleString()}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-slate-500 text-[10px] leading-relaxed">
                Note: Standard contractual rules of Glory Simon Interiors dictate that {project?.retentionPercentage}% of each milestone serves as temporary retention trust, deposited into a separate escrow account and claimed solely upon Defect Liability handovers to guarantee pristine site completion.
              </div>

              {/* Pay actions */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button onClick={() => setActiveInvoice(null)} className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition cursor-pointer">
                  Return to portal
                </button>
                <button onClick={() => handlePayInvoice(activeInvoice.id)} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-md cursor-pointer">
                  Pay Invoice
                </button>
              </div>
            </div>
          </div>
        </div>)}
    </div>);
}
