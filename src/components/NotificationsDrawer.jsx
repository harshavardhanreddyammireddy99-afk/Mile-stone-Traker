import { Bell, Check, X, Info, Sparkles, FileText, Landmark } from 'lucide-react';
export default function NotificationsDrawer({ notifications, onMarkRead, onClose }) {
    const unreadCount = notifications.filter(n => !n.read).length;
    return (<div className="fixed inset-y-0 right-0 max-w-sm w-full bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="relative p-1.5 bg-blue-50 text-blue-600 rounded-lg">
            <Bell className="w-4 h-4"/>
            {unreadCount > 0 && (<span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white animate-pulse"/>)}
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-850">Notifications</h3>
            <p className="text-[10px] text-slate-500">{unreadCount} unread update alerts</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 px-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-xs cursor-pointer">
          <X className="w-4 h-4"/>
        </button>
      </div>

      {/* Notifications list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notifications.length === 0 ? (<div className="text-center py-10">
            <p className="text-xs text-slate-400">No notifications active yet.</p>
          </div>) : (notifications.map((notif) => {
            const isUnread = !notif.read;
            // Icon helper
            const getIcon = (type) => {
                switch (type) {
                    case 'milestone':
                        return <FileText className="w-3.5 h-3.5 text-blue-500"/>;
                    case 'retention':
                        return <Landmark className="w-3.5 h-3.5 text-blue-600"/>;
                    case 'alert':
                        return <Info className="w-3.5 h-3.5 text-red-500"/>;
                    default:
                        return <Sparkles className="w-3.5 h-3.5 text-violet-500"/>;
                }
            };
            const getBg = (type) => {
                switch (type) {
                    case 'milestone':
                        return 'bg-blue-50/50 border-blue-100';
                    case 'retention':
                        return 'bg-slate-50 border-slate-200';
                    case 'alert':
                        return 'bg-red-50/50 border-red-100';
                    default:
                        return 'bg-slate-50 border-slate-100';
                }
            };
            return (<div key={notif.id} className={`p-3 rounded-xl border transition-all duration-150 ${getBg(notif.type)} ${isUnread ? 'ring-1 ring-blue-500/10 shadow-sm' : 'opacity-70'}`}>
                <div className="flex items-start gap-2.5">
                  <span className="p-1.5 rounded-lg bg-white shadow-xs mt-0.5 border border-slate-100">
                    {getIcon(notif.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{notif.projectName}</p>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{notif.message}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[9px] text-slate-400 font-medium">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isUnread && (<button onClick={() => onMarkRead(notif.id)} className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-600 hover:text-blue-700 bg-white px-2 py-0.5 rounded-lg shadow-xs border border-blue-100 hover:border-blue-200 cursor-pointer">
                          <Check className="w-2.5 h-2.5"/> Close Alert
                        </button>)}
                    </div>
                  </div>
                </div>
              </div>);
        }))}
      </div>
    </div>);
}
