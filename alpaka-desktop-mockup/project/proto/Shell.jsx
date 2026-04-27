
// Shell.jsx — App shell: icon strip + collapsible sidebar + main area

const NAV = [
  { id: 'chat',     label: 'New Chat',  icon: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
    </svg>
  )},
  { id: 'launch',   label: 'Launch',    icon: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
  )},
  { id: 'settings', label: 'Settings',  icon: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )},
];

const SAMPLE_CONVOS = [
  { id: 1, title: 'test message', group: 'Today' },
  { id: 2, title: 'Explain quantum computing', group: 'Today' },
  { id: 3, title: 'Write a Python script', group: 'Yesterday' },
  { id: 4, title: 'Debug my Rust code', group: 'Yesterday' },
];

function SidebarToggleIcon() {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
      <rect x="0" y="0" width="5" height="14" rx="1.5" fill="currentColor" opacity="0.4"/>
      <rect x="7" y="0" width="9" height="2" rx="1" fill="currentColor"/>
      <rect x="7" y="6" width="9" height="2" rx="1" fill="currentColor"/>
      <rect x="7" y="12" width="9" height="2" rx="1" fill="currentColor"/>
    </svg>
  );
}

function Shell({ children, activeView, setActiveView, conversations, activeConvId, setActiveConvId }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const grouped = React.useMemo(() => {
    const map = {};
    (conversations || SAMPLE_CONVOS).forEach(c => {
      if (!map[c.group]) map[c.group] = [];
      map[c.group].push(c);
    });
    return map;
  }, [conversations]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#1a1a1a', color: '#e8e8e8', fontFamily: "'Segoe UI', system-ui, sans-serif", overflow: 'hidden' }}>
      {/* Icon strip */}
      <div style={{ width: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8, gap: 2, flexShrink: 0, borderRight: '1px solid #242424' }}>
        <IconBtn onClick={() => setSidebarOpen(o => !o)} title="Toggle sidebar" active={sidebarOpen}>
          <SidebarToggleIcon />
        </IconBtn>
        <IconBtn onClick={() => { setActiveView('chat'); setActiveConvId && setActiveConvId(null); }} title="New Chat">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
          </svg>
        </IconBtn>
      </div>

      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? 220 : 0,
        overflow: 'hidden',
        transition: 'width 0.18s ease',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: sidebarOpen ? '1px solid #242424' : 'none',
        background: '#1a1a1a',
      }}>
        <div style={{ width: 220, display: 'flex', flexDirection: 'column', height: '100%', paddingTop: 4 }}>
          {/* Nav items */}
          {NAV.map(item => (
            <NavItem
              key={item.id}
              icon={item.icon()}
              label={item.label}
              active={activeView === item.id}
              onClick={() => setActiveView(item.id)}
            />
          ))}

          {/* Conversation history */}
          {activeView === 'chat' && (
            <div style={{ flex: 1, overflowY: 'auto', marginTop: 8, paddingBottom: 16 }}>
              {Object.entries(grouped).map(([group, convos]) => (
                <div key={group}>
                  <div style={{ padding: '6px 12px 3px', fontSize: 11, color: '#555', fontWeight: 500 }}>{group}</div>
                  {convos.map(c => (
                    <div
                      key={c.id}
                      onClick={() => setActiveConvId && setActiveConvId(c.id)}
                      style={{
                        padding: '5px 12px',
                        fontSize: 13,
                        color: (activeConvId === c.id) ? '#e8e8e8' : '#888',
                        background: (activeConvId === c.id) ? '#2a2a2a' : 'transparent',
                        borderRadius: 6,
                        margin: '1px 6px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        transition: 'background 0.1s',
                      }}
                    >{c.title}</div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 12px',
        margin: '1px 6px',
        borderRadius: 6,
        cursor: 'pointer',
        background: active ? '#2a2a2a' : 'transparent',
        color: active ? '#e8e8e8' : '#888',
        fontSize: 13,
        fontWeight: active ? 500 : 400,
        transition: 'background 0.1s, color 0.1s',
        userSelect: 'none',
      }}
    >
      <span style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}>{icon}</span>
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    </div>
  );
}

function IconBtn({ children, onClick, title, active }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 32, height: 32, borderRadius: 6, border: 'none',
        background: (hov || active) ? '#2a2a2a' : 'transparent',
        color: (hov || active) ? '#e8e8e8' : '#666',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0, transition: 'background 0.1s, color 0.1s',
      }}
    >{children}</button>
  );
}

Object.assign(window, { Shell, NavItem, IconBtn });
