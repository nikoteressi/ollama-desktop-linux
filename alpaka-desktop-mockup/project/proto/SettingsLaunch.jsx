
// Settings.jsx & Launch.jsx

const LAUNCH_TOOLS = [
  {
    name: 'Claude',
    desc: "Anthropic's coding tool with subagents",
    cmd: 'ollama launch claude',
    color: '#d97b5a',
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L9 9H2L7.5 13.5L5.5 21L12 16.5L18.5 21L16.5 13.5L22 9H15L12 2Z" fill="#d97b5a"/>
      </svg>
    ),
  },
  {
    name: 'Codex',
    desc: "OpenAI's open-source coding agent",
    cmd: 'ollama launch codex',
    color: '#74c07a',
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#74c07a" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M15 9l-6 6M9 9l6 6"/>
      </svg>
    ),
  },
  {
    name: 'OpenCode',
    desc: "Anomaly's open-source coding agent",
    cmd: 'ollama launch opencode',
    color: '#888',
    icon: () => (
      <div style={{ width: 20, height: 20, background: '#333', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
      </div>
    ),
  },
  {
    name: 'Droid',
    desc: "Factory's coding agent across terminal and IDEs",
    cmd: 'ollama launch droid',
    color: '#8ab4f8',
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8ab4f8" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
      </svg>
    ),
  },
  {
    name: 'Pi',
    desc: 'Minimal AI agent toolkit with plugin support',
    cmd: 'ollama launch pi',
    color: '#b88af8',
    icon: () => (
      <div style={{ width: 20, height: 20, background: '#2a2a2a', border: '1px solid #444', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#b88af8', fontFamily: 'monospace' }}>π</span>
      </div>
    ),
  },
];

function CopyCommandBtn({ cmd }) {
  const [copied, setCopied] = React.useState(false);
  const doCopy = () => {
    navigator.clipboard?.writeText(cmd).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={doCopy}
      style={{ background: 'none', border: 'none', color: copied ? '#5bc97a' : '#555', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'color 0.15s' }}
      title="Copy command"
    >
      {copied
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      }
    </button>
  );
}

function LaunchView() {
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px', background: '#1a1a1a' }}>
      <div style={{ maxWidth: 660, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {LAUNCH_TOOLS.map((tool, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {/* Icon */}
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#222', border: '1px solid #2e2e2e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {tool.icon()}
            </div>
            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e8e8e8', marginBottom: 2 }}>{tool.name}</div>
              <div style={{ fontSize: 12.5, color: '#777', marginBottom: 8, lineHeight: 1.4 }}>{tool.desc}</div>
              <div style={{ display: 'flex', alignItems: 'center', background: '#222', border: '1px solid #2a2a2a', borderRadius: 7, padding: '6px 12px', gap: 8 }}>
                <span style={{ flex: 1, fontSize: 12.5, color: '#888', fontFamily: 'Consolas, monospace' }}>{tool.cmd}</span>
                <CopyCommandBtn cmd={tool.cmd} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Settings ──────────────────────────────────────────────────

function Toggle({ on, onChange }) {
  return (
    <div
      onClick={() => onChange(!on)}
      style={{ width: 40, height: 22, borderRadius: 11, background: on ? '#4a7fd4' : '#333', border: `1px solid ${on ? '#4a7fd4' : '#444'}`, position: 'relative', cursor: 'pointer', transition: 'background 0.15s', flexShrink: 0 }}
    >
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#e8e8e8', position: 'absolute', top: 2, left: on ? 20 : 2, transition: 'left 0.15s' }} />
    </div>
  );
}

function SettingRow({ icon, label, sub, toggle, value, onChange, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#212121', border: '1px solid #2a2a2a', borderRadius: 8, gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
        {icon && <span style={{ color: '#888', marginTop: 1, flexShrink: 0 }}>{icon}</span>}
        <div>
          <div style={{ fontSize: 13.5, color: '#e8e8e8', fontWeight: 500 }}>{label}</div>
          {sub && <div style={{ fontSize: 12, color: '#4a80d0', marginTop: 2, lineHeight: 1.4 }}>{sub}</div>}
          {children}
        </div>
      </div>
      {toggle && <Toggle on={value} onChange={onChange} />}
    </div>
  );
}

function ContextSlider({ value, onChange }) {
  const stops = [4096, 8192, 16384, 32768, 65536, 131072, 262144];
  const labels = ['4k','8k','16k','32k','64k','128k','256k'];
  const idx = stops.findIndex(s => s >= value) === -1 ? stops.length - 1 : stops.findIndex(s => s >= value);

  return (
    <div style={{ padding: '12px 16px', background: '#212121', border: '1px solid #2a2a2a', borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span style={{ fontSize: 13.5, color: '#e8e8e8', fontWeight: 500 }}>Context length</span>
      </div>
      <div style={{ fontSize: 12, color: '#4a80d0', marginBottom: 10, lineHeight: 1.4 }}>
        Context length determines how much of your conversation local LLMs can remember and use to generate responses.
      </div>
      <input
        type="range" min={0} max={stops.length - 1}
        value={idx}
        onChange={e => onChange(stops[Number(e.target.value)])}
        style={{ width: '100%', accentColor: '#e8e8e8', cursor: 'pointer' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {labels.map((l, i) => <span key={i} style={{ fontSize: 10.5, color: '#555' }}>{l}</span>)}
      </div>
    </div>
  );
}

function SettingsView({ setActiveView }) {
  const [settings, setSettings] = React.useState({
    cloud: true,
    autoUpdate: true,
    exposeNetwork: false,
    modelPath: '~/.ollama/models',
    contextLen: 4096,
    signedIn: false,
  });

  const set = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px', background: '#1a1a1a' }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => setActiveView('chat')}
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: 5 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <span style={{ fontSize: 17, fontWeight: 600, color: '#e8e8e8' }}>Settings</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Account card */}
          <div style={{ background: '#212121', border: '1px solid #2a2a2a', borderRadius: 8, padding: '14px 16px' }}>
            {settings.signedIn ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#2a2a2a', border: '2px solid #444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🦙</div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#e8e8e8' }}>nikoteressi</div>
                    <div style={{ fontSize: 12, color: '#4a80d0' }}>nikoteressi@gmail.com</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['Upgrade','Manage','Sign out'].map(l => (
                    <button key={l} onClick={() => l === 'Sign out' && set('signedIn', false)} style={{ padding: '5px 12px', background: '#2a2a2a', border: '1px solid #383838', borderRadius: 6, color: '#e8e8e8', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>{l}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: '#e8e8e8' }}>Ollama account</div>
                  <div style={{ fontSize: 12, color: '#4a80d0', marginTop: 2 }}>Not connected</div>
                </div>
                <button onClick={() => set('signedIn', true)} style={{ padding: '6px 16px', background: '#2a2a2a', border: '1px solid #444', borderRadius: 7, color: '#e8e8e8', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>Sign In</button>
              </div>
            )}
          </div>

          {/* Toggles */}
          <SettingRow
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/></svg>}
            label="Cloud"
            sub="Enable cloud models and web search."
            toggle value={settings.cloud} onChange={v => set('cloud', v)}
          />
          <SettingRow
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg>}
            label="Auto-download updates"
            sub="Automatically download updates when available."
            toggle value={settings.autoUpdate} onChange={v => set('autoUpdate', v)}
          />
          <SettingRow
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>}
            label="Expose Ollama to the network"
            sub="Allow other devices or services to access Ollama."
            toggle value={settings.exposeNetwork} onChange={v => set('exposeNetwork', v)}
          />

          {/* Model location */}
          <SettingRow
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>}
            label="Model location"
            sub="Location where models are stored."
          >
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                value={settings.modelPath}
                onChange={e => set('modelPath', e.target.value)}
                style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '5px 10px', fontSize: 12, color: '#e8e8e8', outline: 'none', fontFamily: 'monospace' }}
              />
              <button style={{ padding: '5px 12px', background: '#2a2a2a', border: '1px solid #383838', borderRadius: 6, color: '#e8e8e8', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                Browse
              </button>
            </div>
          </SettingRow>

          {/* Context length */}
          <ContextSlider value={settings.contextLen} onChange={v => set('contextLen', v)} />

          {/* Ollama server URL (Linux extra) */}
          <SettingRow
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
            label="Ollama server URL"
            sub="Host address for the local Ollama API."
          >
            <input
              defaultValue="http://localhost:11434"
              style={{ marginTop: 8, width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '5px 10px', fontSize: 12, color: '#e8e8e8', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }}
            />
          </SettingRow>

          {/* Reset */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
            <button style={{ padding: '7px 18px', background: '#212121', border: '1px solid #2e2e2e', borderRadius: 8, color: '#e8e8e8', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              Reset to defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LaunchView, SettingsView });
