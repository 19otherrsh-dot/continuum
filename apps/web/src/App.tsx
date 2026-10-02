import { useCallback, useEffect, useState } from 'react';
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';
import {
  Bot,
  Building2,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Search,
  Settings as SettingsIcon,
  Users,
  Workflow,
  Zap,
} from 'lucide-react';
import { api } from './lib/api';
import { useHotkey } from './lib/hooks';
import { SessionProvider, useSession } from './lib/session';
import { GlobalSearch } from './components/GlobalSearch';
import { Notifications } from './components/Notifications';
import { Spinner } from './components/ui';
import { AgentLog } from './pages/AgentLog';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Onboarding, OnboardingConnected } from './pages/Onboarding';
import { Pipeline } from './pages/Pipeline';
import { Projects } from './pages/Projects';
import { Companies, Contacts } from './pages/Records';
import { Settings } from './pages/Settings';

function Shell() {
  const { user, workspace, logout } = useSession();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useHotkey('k', () => setSearchOpen(true));

  const loadPending = useCallback(async () => {
    try {
      const response = await api.get<{ total: number }>('/agent-actions?status=PENDING&pageSize=1');
      setPendingCount(response.total);
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    void loadPending();
    const timer = setInterval(loadPending, 30_000);
    return () => clearInterval(timer);
  }, [loadPending]);

  return (
    <div className="app">
      {/* Keyboard users should not have to tab the whole nav to reach content. */}
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <nav className="sidebar" aria-label="Main">
        <div className="brand">
          <Zap size={17} color="var(--accent)" />
          Continuum
        </div>

        <NavLink to="/dashboard" className="nav-link">
          <LayoutDashboard size={16} /> Overview
        </NavLink>
        <NavLink to="/pipeline" className="nav-link">
          <KanbanSquare size={16} /> Pipeline
        </NavLink>

        {/*
          The Project object is hidden entirely for sales-only workspaces —
          not disabled, not empty: absent (FR-PROJ-05).
        */}
        {workspace?.showProjectsUi && (
          <NavLink to="/projects" className="nav-link">
            <Workflow size={16} /> Delivery
          </NavLink>
        )}

        <NavLink to="/contacts" className="nav-link">
          <Users size={16} /> Contacts
        </NavLink>
        <NavLink to="/companies" className="nav-link">
          <Building2 size={16} /> Companies
        </NavLink>
        <NavLink to="/agent" className="nav-link">
          <Bot size={16} /> Agent
          {pendingCount > 0 && (
            <span className="nav-badge">
              {pendingCount}
              <span className="visually-hidden"> suggestions waiting for review</span>
            </span>
          )}
        </NavLink>

        <div style={{ flex: 1 }} />

        <NavLink to="/settings" className="nav-link">
          <SettingsIcon size={16} /> Settings
        </NavLink>

        <div style={{ padding: '10px 9px 2px', borderTop: '1px solid var(--border)', marginTop: 8 }}>
          <div className="small" style={{ fontWeight: 500 }}>
            {user?.name}
          </div>
          <div className="small subtle truncate">{workspace?.name}</div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 6, paddingLeft: 0 }}
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </nav>

      <div className="main">
        <header className="topbar">
          <button
            className="btn btn-sm grow"
            style={{ justifyContent: 'flex-start', maxWidth: 340, color: 'var(--text-muted)' }}
            onClick={() => setSearchOpen(true)}
          >
            <Search size={14} /> Search…
            <span className="mono subtle" style={{ marginLeft: 'auto' }}>
              ⌘K
            </span>
          </button>
          <div style={{ flex: 1 }} />
          <Notifications />
        </header>

        <main className="content" id="main-content" tabIndex={-1}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/agent" element={<AgentLog />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/pipeline" replace />} />
          </Routes>
        </main>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

function Root() {
  const { workspace, loading } = useSession();

  if (loading) {
    return (
      <div className="auth-shell">
        <Spinner label="Loading Continuum" />
      </div>
    );
  }

  const authenticated = Boolean(workspace);

  return (
    <Routes>
      <Route
        path="/login"
        element={authenticated ? <Navigate to="/pipeline" replace /> : <Login />}
      />
      <Route
        path="/onboarding"
        element={authenticated ? <Onboarding /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/onboarding/connected"
        element={authenticated ? <OnboardingConnected /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/*"
        element={authenticated ? <Shell /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Root />
      </SessionProvider>
    </BrowserRouter>
  );
}
