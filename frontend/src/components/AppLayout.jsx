import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import SettingsModal from './SettingsModal';
import * as api from '../api';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getAlerts()
      .then((a) => { if (!cancelled) setAlertCount(a.length); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} alertCount={alertCount} />
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 1025 }}
        ></div>
      )}
      <div className="main-area">
        <Topbar setOpen={setSidebarOpen} alertCount={alertCount} onOpenSettings={() => setSettingsOpen(true)} />
        <div className="page-wrap">
          <Outlet />
        </div>
      </div>

      <SettingsModal show={settingsOpen} onHide={() => setSettingsOpen(false)} />
    </div>
  );
}
