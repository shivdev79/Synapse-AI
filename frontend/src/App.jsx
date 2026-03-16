import { useRef, useState, useEffect } from 'react';
import { useLiveAgent } from './hooks/useLiveAgent';
import './App.css';

function App() {
  const videoRef = useRef(null);
  const {
    isConnected,
    connect,
    disconnect,
    transcript,
    generatedImages,
    sendTextMessage,
    error: wsError,
    sessionId,
  } = useLiveAgent(videoRef);

  const [isMuted, setIsMuted] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [history, setHistory] = useState([]);

  const transcriptEndRef = useRef(null);
  const historyEndRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Fetch history when sessionId is established
  useEffect(() => {
    if (sessionId) {
      fetch(`http://localhost:8080/history/${sessionId}`)
        .then(res => res.json())
        .then(data => setHistory(data.history || []))
        .catch(err => console.error("Failed to fetch history", err));
    }
  }, [sessionId]);

  // Refresh history periodically if sidebar is open
  useEffect(() => {
    if (isSidebarOpen && sessionId) {
      const itv = setInterval(() => {
        fetch(`http://localhost:8080/history/${sessionId}`)
          .then(res => res.json())
          .then(data => setHistory(data.history || []))
          .catch(err => console.error("Failed to fetch history", err));
      }, 3000);
      return () => clearInterval(itv);
    }
  }, [isSidebarOpen, sessionId]);

  const handleToggle = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  const handleSendText = (e) => {
    e.preventDefault();
    if (!textInput.trim() || !isConnected) return;
    sendTextMessage(textInput.trim());
    setTextInput('');
  };

  return (
    <div className="app-shell">
      {/* ── Header ───────────────────────────────────── */}
      <header className="header">
        <div className="logo-group">
          <span className="logo-icon">✨</span>
          <span className="logo-text">Synapse <span className="logo-ai">AI</span></span>
          <div className="dev-badge">PRO</div>
        </div>
        <div className="header-right">
          <button 
            className="icon-btn" 
            style={{ marginRight: '12px' }}
            onClick={() => setIsSidebarOpen(true)}
            title="History"
          >
            📜
          </button>
          <span className={`status-badge ${isConnected ? 'live' : 'idle'}`}>
            <span className="status-dot" />
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────── */}
      <main className="main">
        {/* Left — Video Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className={`video-card ${isConnected ? 'connected' : ''}`}>
            <video
              ref={videoRef}
              autoPlay
              muted={isMuted}
              playsInline
              className="video-feed"
            />
            {!isConnected && (
              <div className="video-placeholder">
                <div className="placeholder-icon">📷</div>
                <p>Camera will appear once connected</p>
              </div>
            )}
            {/* Overlay controls */}
            {isConnected && (
              <div className="video-overlay">
                <button
                  className={`icon-btn ${isMuted ? 'muted' : ''}`}
                  onClick={() => setIsMuted(m => !m)}
                  title={isMuted ? 'Unmute' : 'Mute'}
                  id="mute-btn"
                >
                  {isMuted ? '🔇' : '🔊'}
                </button>
              </div>
            )}
            {isConnected && <div className="scan-line" />}
          </div>

          {/* Generated Images */}
          {generatedImages.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">
                  <span className="panel-title-icon">🎨</span>Generated Output
                </span>
              </div>
              <div className="panel-body image-gallery">
                {generatedImages.map((img, i) => (
                  <div key={i} className="generated-img-wrapper">
                    <img src={img.url} alt={img.label} className="generated-img" />
                    <div className="generated-img-label">{img.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — Panels */}
        <div className="right-column">
          {/* Transcript Panel */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">
                <span className="panel-title-icon">🧠</span>AI Transcript
              </span>
              {isConnected && <span className="pulse-label">● Listening</span>}
            </div>
            <div className="panel-body">
              {transcript
                ? <p className="transcript-text">{transcript}</p>
                : <p className="transcript-empty">
                    {isConnected
                      ? 'Speak or type to VisionMate…'
                      : 'Start a session to see the AI transcript here.'}
                  </p>
              }
              <div ref={transcriptEndRef} />
            </div>

            {/* Text chat input */}
            {isConnected && (
              <form className="chat-input-row" onSubmit={handleSendText}>
                <input
                  id="chat-input"
                  className="chat-input"
                  type="text"
                  placeholder="Type a message…"
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  autoComplete="off"
                />
                <button
                  id="chat-send-btn"
                  type="submit"
                  className="chat-send-btn"
                  disabled={!textInput.trim()}
                >
                  Send
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* ── CTA Button ───────────────────────────────── */}
      <div className="cta-row">
        <button
          id="connect-btn"
          className={`connect-btn ${isConnected ? 'disconnect' : 'connect'}`}
          onClick={handleToggle}
        >
          {isConnected ? '⏹  End Session' : '▶  Start Session'}
        </button>
        {!isConnected && (
          <div className="feature-chips">
            <span className="chip">🎤 Voice</span>
            <span className="chip">📷 Vision</span>
            <span className="chip">🎨 Image Gen</span>
            <span className="chip">🧠 Memory</span>
            <span className="chip">🌐 Translate</span>
          </div>
        )}
        {isConnected && (
          <p className="hint-text">VisionMate can see your camera, hear you in real-time, and generate images on demand.</p>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="footer">
        <span>Powered by <strong>Gemini 2.0 Flash</strong> · Google Solution Challenge 2026</span>
      </footer>

      {/* ── Error Toast ──────────────────────────────── */}
      {wsError && (
        <div className="error-toast" role="alert">
          ⚠️ {wsError}
        </div>
      )}

      {/* ── Sidebar ───────────────────────────────────── */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">Conversation History</span>
          <button className="close-btn" onClick={() => setIsSidebarOpen(false)}>×</button>
        </div>
        <div className="sidebar-body">
          {history.length === 0 ? (
            <p className="transcript-empty">No history yet for this session.</p>
          ) : (
            history.map((item, i) => (
              <div key={i} className={`history-item ${item.role}`}>
                <span className="history-role">{item.role === 'user' ? 'You' : 'VisionMate'}</span>
                <p className="history-text">{item.text}</p>
                <span className="history-ts">{new Date(item.ts).toLocaleTimeString()}</span>
              </div>
            ))
          )}
          <div ref={historyEndRef} />
        </div>
      </aside>
      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />}
    </div>
  );
}

export default App;
