
// Chat.jsx — Chat view with Windows-style input, think block, system prompt

const MODELS = [
  'kimi-k2.5:cloud','glm-5:cloud','minimax-m2.7:cloud',
  'gemma4:31b-cloud','qwen3.5:397b-cloud','gpt-oss:120b-cloud',
  'llama3.2:3b','llama3.1:8b','mistral:7b','phi4:14b','deepseek-r1:7b',
];

const DEMO_MESSAGES = [
  { role: 'user', content: 'test message' },
  {
    role: 'assistant',
    thinking: `The user has sent a test message. This is likely just to check if the system is working or to initiate a conversation.\nI should respond in a friendly, helpful manner acknowledging the test message and offering assistance.\n\nKey points:\n• Acknowledge the test message\n• Confirm I'm operational/ready to help\n• Offer assistance or ask what they'd like to know\n• Keep it concise and friendly`,
    thinkTime: 6.9,
    content: `Hello! I'm here and working properly. This is a test response to confirm that you can send and receive messages successfully.\n\nHow can I help you today?`,
  },
];

function LlamaCircle({ size = 44 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', border: '2px solid #e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a' }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 40 44" fill="none" stroke="#e8e8e8" strokeWidth="1.6" strokeLinecap="round">
        <ellipse cx="20" cy="16" rx="9" ry="10"/>
        <path d="M11 25 Q8 36 12 38 Q15 40 15 34"/>
        <path d="M29 25 Q32 36 28 38 Q25 40 25 34"/>
        <circle cx="16.5" cy="14" r="1.5" fill="#e8e8e8" stroke="none"/>
        <circle cx="23.5" cy="14" r="1.5" fill="#e8e8e8" stroke="none"/>
        <path d="M17 19 Q20 22 23 19" strokeWidth="1.4"/>
        <path d="M15 8 Q20 4 25 8" strokeWidth="1.2"/>
      </svg>
    </div>
  );
}

function ThinkBlock({ content, thinkTime, defaultOpen }) {
  const [open, setOpen] = React.useState(defaultOpen !== false);
  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#888', fontSize: 13, cursor: 'pointer', padding: '2px 0', fontFamily: 'inherit' }}
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>
          <path d="M4 2l4 4-4 4"/>
        </svg>
        <span>Thought for {thinkTime} seconds</span>
      </button>
      {open && (
        <div style={{ marginTop: 8, padding: '10px 14px', background: '#222', borderRadius: 8, fontSize: 13, color: '#888', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 260, overflowY: 'auto' }}>
          {content}
        </div>
      )}
    </div>
  );
}

function CopyBtn() {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '4px 6px', borderRadius: 5, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.1s' }}
      title="Copy"
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5bc97a" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      )}
    </button>
  );
}

function Message({ msg }) {
  if (msg.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 24px' }}>
        <div style={{ background: '#2d2d2d', borderRadius: 18, borderTopRightRadius: 4, padding: '8px 14px', fontSize: 14, color: '#e8e8e8', maxWidth: '70%', lineHeight: 1.5 }}>
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding: '4px 24px 12px' }}>
      {msg.thinking && <ThinkBlock content={msg.thinking} thinkTime={msg.thinkTime} defaultOpen={false} />}
      <div style={{ fontSize: 14, color: '#e8e8e8', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
      <div style={{ marginTop: 8 }}><CopyBtn /></div>
    </div>
  );
}

function ModelDropdown({ model, setModel, onClose }) {
  const [query, setQuery] = React.useState('');
  const filtered = MODELS.filter(m => m.toLowerCase().includes(query.toLowerCase()));
  const ref = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: 6, width: 260, background: '#242424', border: '1px solid #333', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 100 }}>
      <div style={{ padding: '8px 10px', borderBottom: '1px solid #2a2a2a' }}>
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Find model..."
          style={{ width: '100%', background: '#1e1e1e', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12.5, color: '#e8e8e8', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
        {filtered.map(m => (
          <div
            key={m}
            onClick={() => { setModel(m); onClose(); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '7px 14px', fontSize: 12.5, color: m === model ? '#e8e8e8' : '#aaa',
              background: m === model ? '#2a2a2a' : 'transparent',
              cursor: 'pointer',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#2a2a2a'}
            onMouseLeave={e => e.currentTarget.style.background = m === model ? '#2a2a2a' : 'transparent'}
          >
            <span>{m}</span>
            {m.includes(':cloud') && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/></svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatInput({ onSend, isStreaming, model, setModel }) {
  const [text, setText] = React.useState('');
  const [showModel, setShowModel] = React.useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = React.useState(false);
  const [systemPrompt, setSystemPrompt] = React.useState('');
  const textareaRef = React.useRef(null);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) { onSend(text); setText(''); }
    }
  };

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [text]);

  return (
    <div style={{ padding: '0 0 16px', position: 'relative' }}>
      {/* System prompt panel */}
      {showSystemPrompt && (
        <div style={{ margin: '0 0 6px', padding: '10px 14px', background: '#222', borderRadius: 10, border: '1px solid #333' }}>
          <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontWeight: 600 }}>System Prompt</div>
          <textarea
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            placeholder="You are a helpful assistant..."
            rows={3}
            style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: 7, padding: '7px 10px', fontSize: 12.5, color: '#e8e8e8', resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button onClick={() => setShowSystemPrompt(false)} style={{ padding: '4px 12px', background: '#2d2d2d', border: '1px solid #3a3a3a', borderRadius: 6, color: '#e8e8e8', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
            <button onClick={() => setShowSystemPrompt(false)} style={{ padding: '4px 12px', background: 'none', border: 'none', color: '#666', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ background: '#2d2d2d', border: '1px solid #383838', borderRadius: 20, padding: '10px 14px', position: 'relative' }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Send a message"
          rows={1}
          style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: '#e8e8e8', fontSize: 13.5, resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, minHeight: 22, maxHeight: 160, boxSizing: 'border-box', display: 'block' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginTop: 8 }}>
          {/* System prompt btn */}
          <CircleButton onClick={() => setShowSystemPrompt(s => !s)} title="System prompt" active={showSystemPrompt || !!systemPrompt}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
          </CircleButton>
          {/* Attach btn */}
          <CircleButton title="Attach file">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </CircleButton>
          {/* Web search */}
          <CircleButton title="Web search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </CircleButton>
          {/* Model selector */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowModel(s => !s)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: showModel ? '#383838' : '#2a2a2a', border: '1px solid #444', borderRadius: 14, padding: '4px 10px', fontSize: 12, color: '#e8e8e8', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'background 0.1s' }}
            >
              {model || 'Select a model'}
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 4l3 3 3-3"/></svg>
            </button>
            {showModel && <ModelDropdown model={model} setModel={setModel} onClose={() => setShowModel(false)} />}
          </div>
          {/* Send */}
          <button
            onClick={() => { if (text.trim()) { onSend(text); setText(''); } }}
            disabled={!text.trim() && !isStreaming}
            style={{ width: 28, height: 28, borderRadius: '50%', background: text.trim() ? '#e8e8e8' : '#333', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: text.trim() ? 'pointer' : 'default', flexShrink: 0, transition: 'background 0.15s' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={text.trim() ? '#1a1a1a' : '#555'} strokeWidth="2.5" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function CircleButton({ children, onClick, title, active }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ width: 28, height: 28, borderRadius: '50%', background: (hov || active) ? '#383838' : '#262626', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? '#e8e8e8' : '#888', cursor: 'pointer', flexShrink: 0, transition: 'background 0.1s' }}
    >{children}</button>
  );
}

function ChatView({ convId }) {
  const [messages, setMessages] = React.useState(convId ? DEMO_MESSAGES : []);
  const [model, setModel] = React.useState('kimi-k2.5:cloud');
  const [isStreaming, setIsStreaming] = React.useState(false);
  const bottomRef = React.useRef(null);

  React.useEffect(() => {
    setMessages(convId ? DEMO_MESSAGES : []);
  }, [convId]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const handleSend = (text) => {
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setIsStreaming(true);
    // Simulate response
    setTimeout(() => {
      setMessages(m => [...m, {
        role: 'assistant',
        thinking: 'Let me think about this carefully...',
        thinkTime: 2.1,
        content: 'I received your message: "' + text + '"\n\nI\'m a demo prototype — in the real app I\'d be powered by the model you selected. How can I help further?',
      }]);
      setIsStreaming(false);
    }, 1800);
  };

  const isEmpty = messages.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1a1a1a' }}>
      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {isEmpty ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LlamaCircle size={52} />
          </div>
        ) : (
          <div style={{ maxWidth: 760, width: '100%', margin: '0 auto', paddingTop: 24, paddingBottom: 8 }}>
            {messages.map((m, i) => <Message key={i} msg={m} />)}
            {isStreaming && (
              <div style={{ padding: '4px 24px' }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 24 }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#555', animation: `bounce 1.2s ${i*0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ maxWidth: 760, width: '100%', margin: '0 auto', padding: '0 24px', boxSizing: 'border-box' }}>
        <ChatInput onSend={handleSend} isStreaming={isStreaming} model={model} setModel={setModel} />
      </div>
    </div>
  );
}

Object.assign(window, { ChatView, LlamaCircle });
