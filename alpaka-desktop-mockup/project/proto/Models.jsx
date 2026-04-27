
// Models.jsx — Models page: installed list, pull with progress, hardware analysis, library search

const OLLAMA_LIBRARY = [
  { name: 'llama3.2', params: '3B', size: '2.0 GB', tags: ['fast', 'chat'], desc: 'Meta\'s latest compact Llama model' },
  { name: 'llama3.2', params: '1B', size: '1.3 GB', tags: ['fastest', 'edge'], desc: 'Ultra-compact Llama for edge devices' },
  { name: 'llama3.1', params: '8B', size: '4.7 GB', tags: ['balanced', 'chat'], desc: 'Balanced performance and quality' },
  { name: 'llama3.1', params: '70B', size: '40 GB', tags: ['powerful', 'requires 48GB+ VRAM'], desc: 'High-capability large model' },
  { name: 'mistral', params: '7B', size: '4.1 GB', tags: ['fast', 'coding'], desc: 'Mistral 7B — fast and capable' },
  { name: 'phi4', params: '14B', size: '8.9 GB', tags: ['reasoning', 'coding'], desc: 'Microsoft\'s Phi-4 — strong at reasoning' },
  { name: 'phi4-mini', params: '3.8B', size: '2.5 GB', tags: ['fast', 'reasoning'], desc: 'Compact Phi-4 variant' },
  { name: 'gemma3', params: '4B', size: '3.3 GB', tags: ['balanced', 'multilingual'], desc: 'Google Gemma 3 — multilingual' },
  { name: 'gemma3', params: '27B', size: '17 GB', tags: ['powerful'], desc: 'Larger Gemma 3' },
  { name: 'qwen3', params: '8B', size: '5.2 GB', tags: ['reasoning', 'coding'], desc: 'Alibaba Qwen3 — strong reasoning' },
  { name: 'qwen3', params: '30B', size: '19 GB', tags: ['powerful', 'reasoning'], desc: 'Qwen3 30B parameter model' },
  { name: 'deepseek-r1', params: '7B', size: '4.7 GB', tags: ['reasoning', 'thinking'], desc: 'DeepSeek R1 — chain-of-thought reasoning' },
  { name: 'deepseek-r1', params: '32B', size: '20 GB', tags: ['reasoning', 'thinking'], desc: 'DeepSeek R1 32B' },
  { name: 'codegemma', params: '7B', size: '5.0 GB', tags: ['coding'], desc: 'Google\'s code-focused model' },
  { name: 'codellama', params: '13B', size: '7.4 GB', tags: ['coding'], desc: 'Meta CodeLlama for programming' },
  { name: 'nomic-embed-text', params: '137M', size: '274 MB', tags: ['embedding'], desc: 'Fast text embedding model' },
];

const INSTALLED_MODELS = [
  { name: 'llama3.2:3b', size: 2100000000, paramSize: '3B', quant: 'Q4_0', modified: '2025-04-15' },
  { name: 'kimi-k2.5:cloud', size: 0, paramSize: 'cloud', quant: null, modified: '2025-04-18' },
  { name: 'deepseek-r1:7b', size: 4700000000, paramSize: '7B', quant: 'Q4_K_M', modified: '2025-04-10' },
];

// Hardware profiles for demo
const HW_PROFILES = [
  { label: '4 GB VRAM (e.g. GTX 1650)', vram: 4, ram: 16, maxModelGB: 3.5 },
  { label: '8 GB VRAM (e.g. RTX 3070)', vram: 8, ram: 32, maxModelGB: 7 },
  { label: '12 GB VRAM (e.g. RTX 3080)', vram: 12, ram: 32, maxModelGB: 11 },
  { label: '24 GB VRAM (e.g. RTX 3090)', vram: 24, ram: 64, maxModelGB: 22 },
  { label: 'CPU only (16 GB RAM)', vram: 0, ram: 16, maxModelGB: 8 },
];

function formatBytes(b) {
  if (!b || b === 0) return 'cloud';
  if (b > 1e9) return (b / 1e9).toFixed(1) + ' GB';
  if (b > 1e6) return (b / 1e6).toFixed(0) + ' MB';
  return b + ' B';
}

function sizeGB(sizeStr) {
  if (!sizeStr) return 0;
  const n = parseFloat(sizeStr);
  if (sizeStr.includes('GB')) return n;
  if (sizeStr.includes('MB')) return n / 1024;
  return 0;
}

function HardwareAnalysis() {
  const [hwIdx, setHwIdx] = React.useState(1);
  const hw = HW_PROFILES[hwIdx];
  const recommended = OLLAMA_LIBRARY.filter(m => sizeGB(m.size) <= hw.maxModelGB && sizeGB(m.size) > 0);

  return (
    <div style={{ background: '#212121', border: '1px solid #2e2e2e', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#e8e8e8' }}>Hardware Analysis</span>
        <span style={{ fontSize: 11, color: '#555', marginLeft: 4 }}>— models that fit your machine</span>
      </div>

      {/* HW selector */}
      <div style={{ marginBottom: 12 }}>
        <select
          value={hwIdx}
          onChange={e => setHwIdx(Number(e.target.value))}
          style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 7, padding: '5px 10px', fontSize: 12.5, color: '#e8e8e8', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
        >
          {HW_PROFILES.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
        </select>
        <span style={{ marginLeft: 10, fontSize: 11.5, color: '#666' }}>Max model size: ~{hw.maxModelGB} GB</span>
      </div>

      {/* Recommended grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
        {recommended.slice(0, 8).map((m, i) => (
          <RecommendedModelCard key={i} model={m} />
        ))}
      </div>
      {recommended.length === 0 && (
        <div style={{ fontSize: 12.5, color: '#555', textAlign: 'center', padding: '20px 0' }}>No local models fit this profile</div>
      )}
    </div>
  );
}

function RecommendedModelCard({ model, onPull }) {
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#e8e8e8' }}>{model.name}</span>
        <span style={{ fontSize: 11, color: '#555', background: '#252525', padding: '1px 6px', borderRadius: 4 }}>{model.params}</span>
      </div>
      <div style={{ fontSize: 11, color: '#666', lineHeight: 1.4 }}>{model.desc}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: 11, color: '#555' }}>{model.size}</span>
        <button
          onClick={() => onPull && onPull(`${model.name}:${model.params.toLowerCase()}`)}
          style={{ fontSize: 11, background: '#2a2a2a', border: '1px solid #3a3a3a', borderRadius: 5, color: '#aaa', padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}
        >Pull ↓</button>
      </div>
    </div>
  );
}

function LibrarySearch({ onPull }) {
  const [query, setQuery] = React.useState('');
  const [focused, setFocused] = React.useState(false);

  const results = query.length > 0
    ? OLLAMA_LIBRARY.filter(m =>
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.tags.some(t => t.toLowerCase().includes(query.toLowerCase())) ||
        m.desc.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div style={{ background: '#212121', border: '1px solid #2e2e2e', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#e8e8e8', marginBottom: 10 }}>Pull a Library Model</div>
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              placeholder="e.g. llama3, mistral, phi4, deepseek-r1..."
              style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#e8e8e8', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.15s', borderColor: focused ? '#555' : '#333' }}
            />
            {/* Suggestions dropdown */}
            {focused && results.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#242424', border: '1px solid #333', borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 50, maxHeight: 280, overflowY: 'auto' }}>
                {results.map((m, i) => (
                  <div
                    key={i}
                    onMouseDown={() => { setQuery(`${m.name}:${m.params.toLowerCase()}`); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid #2a2a2a' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#2a2a2a'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <span style={{ fontSize: 13, color: '#e8e8e8', fontWeight: 500 }}>{m.name}</span>
                      <span style={{ fontSize: 11, color: '#555', marginLeft: 6, background: '#252525', padding: '1px 5px', borderRadius: 3 }}>{m.params}</span>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{m.desc}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, marginLeft: 12, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: '#555' }}>{m.size}</span>
                      <div style={{ display: 'flex', gap: 3 }}>
                        {m.tags.slice(0,2).map(t => (
                          <span key={t} style={{ fontSize: 10, background: '#2a2a2a', border: '1px solid #333', borderRadius: 3, padding: '1px 4px', color: '#666' }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => { if (query.trim()) { onPull(query.trim()); setQuery(''); } }}
            disabled={!query.trim()}
            style={{ padding: '8px 20px', background: query.trim() ? '#e8e8e8' : '#2a2a2a', border: 'none', borderRadius: 8, color: query.trim() ? '#1a1a1a' : '#555', fontSize: 13, fontWeight: 600, cursor: query.trim() ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'background 0.15s, color 0.15s', flexShrink: 0 }}
          >Pull</button>
        </div>
      </div>
    </div>
  );
}

function PullProgress({ name, percent, status }) {
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#e8e8e8' }}>{name}</span>
        <span style={{ fontSize: 11.5, color: '#888', fontFamily: 'monospace' }}>{status} {percent > 0 ? `${Math.round(percent)}%` : ''}</span>
      </div>
      <div style={{ height: 4, background: '#2a2a2a', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#e8e8e8', borderRadius: 2, width: `${percent}%`, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
}

function ModelsView() {
  const [pulling, setPulling] = React.useState({});
  const [models, setModels] = React.useState(INSTALLED_MODELS);
  const intervals = React.useRef({});

  const handlePull = (name) => {
    if (pulling[name]) return;
    setPulling(p => ({ ...p, [name]: { status: 'pulling manifest', percent: 0 } }));

    let pct = 0;
    intervals.current[name] = setInterval(() => {
      pct += Math.random() * 8 + 2;
      if (pct >= 100) {
        pct = 100;
        clearInterval(intervals.current[name]);
        delete intervals.current[name];
        setPulling(p => { const n = { ...p }; delete n[name]; return n; });
        setModels(m => [...m, { name, size: 4700000000, paramSize: '?', quant: 'Q4_K_M', modified: new Date().toISOString().slice(0,10) }]);
      } else {
        setPulling(p => ({ ...p, [name]: { status: 'downloading', percent: pct } }));
      }
    }, 300);
  };

  React.useEffect(() => () => Object.values(intervals.current).forEach(clearInterval), []);

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px', background: '#1a1a1a' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        {/* Pull section */}
        <LibrarySearch onPull={handlePull} />

        {/* Pull progress */}
        {Object.keys(pulling).length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(pulling).map(([name, p]) => (
              <PullProgress key={name} name={name} percent={p.percent} status={p.status} />
            ))}
          </div>
        )}

        {/* Hardware analysis */}
        <HardwareAnalysis />

        {/* Installed models */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>Installed</div>
          {models.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#555', fontSize: 13 }}>
              <LlamaCircle size={36} />
              <div style={{ marginTop: 12 }}>No models installed. Pull one above.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {models.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#212121', border: '1px solid #2a2a2a', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13.5, color: '#e8e8e8', fontWeight: 500 }}>{m.name}</span>
                    {m.paramSize && <span style={{ fontSize: 11, background: '#2a2a2a', color: '#666', padding: '1px 6px', borderRadius: 4 }}>{m.paramSize}</span>}
                    {m.quant && <span style={{ fontSize: 11, background: '#2a2a2a', color: '#666', padding: '1px 6px', borderRadius: 4 }}>{m.quant}</span>}
                    <span style={{ fontSize: 11, color: '#555' }}>{formatBytes(m.size)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#444' }}>{m.modified}</span>
                    <button
                      onClick={() => setModels(ms => ms.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '2px 4px', borderRadius: 4, display: 'flex', alignItems: 'center' }}
                      title="Delete"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ModelsView });
