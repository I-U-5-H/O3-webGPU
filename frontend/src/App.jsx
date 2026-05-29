import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import BlurText from './components/bits/BlurText';
import Orb from './components/bits/Orb';
import Aurora from './components/bits/Aurora';
import ShinyText from './components/bits/ShinyText';

// Helper icons
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const MessageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;
const SparkleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path></svg>;
const ShieldIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>;

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stage, setStage] = useState('intro');
  const [inputValue, setInputValue] = useState('');
  
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userText = inputValue;
    setInputValue('');
    
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);

    if (stage === 'intro') setStage('thinking');
    else setIsTyping(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      });

      if (!response.ok) throw new Error('Network error');
      const data = await response.json();

      if (stage === 'intro') setStage('result');

      // We now save the response AND the privacy map!
      setMessages((prev) => [...prev, { 
        role: 'ai', 
        content: data.final_output,
        piiMap: data.privacy_map 
      }]);

    } catch (error) {
      console.error(error);
      if (stage === 'intro') setStage('result');
      setMessages((prev) => [...prev, { role: 'ai', content: "Error: Could not reach Project O3 backend." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleNewChat = () => {
    setStage('intro');
    setInputValue('');
    setMessages([]);
  };

  return (
    <div className="flex h-screen w-full bg-[#131314] text-white overflow-hidden font-sans select-none">
      
      {/* LEFT SIDEBAR */}
      <div className={`flex flex-col bg-[#1e1f20] transition-all duration-300 ease-in-out border-r border-white/5 ${isSidebarOpen ? 'w-64 md:w-72 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}>
        <div className="p-4 flex flex-col gap-6">
          <button onClick={() => setIsSidebarOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition text-gray-300">
            <MenuIcon />
          </button>
          <button onClick={handleNewChat} className="flex items-center gap-3 bg-[#131314] hover:bg-white/10 text-gray-300 rounded-full px-4 py-3 transition font-medium text-sm w-max border border-white/5">
            <PlusIcon /> New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 mt-2">
          <p className="text-xs font-semibold text-gray-500 mb-4 px-2">Recent</p>
          <div className="space-y-1">
            <button className="w-full flex items-center gap-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white px-3 py-2.5 rounded-full transition">
              <MessageIcon /> <span className="truncate">Database setup script</span>
            </button>
          </div>
        </div>

        <div className="p-4 space-y-1">
          <button className="w-full flex items-center gap-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white px-3 py-2.5 rounded-full transition"><SettingsIcon /> Settings</button>
          <button className="w-full flex items-center gap-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white px-3 py-2.5 rounded-full transition"><LogoutIcon /> Logout</button>
        </div>
      </div>

      {/* RIGHT WORKSPACE */}
      <div className="flex-1 relative flex flex-col h-full overflow-hidden bg-[#131314]">
        
        <div className="absolute top-0 left-0 w-full p-4 flex items-center justify-between z-50 pointer-events-auto">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition text-gray-300">
                <MenuIcon />
              </button>
            )}
            {stage !== 'intro' && <h1 className="font-bold tracking-widest text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] uppercase text-xl animate-fade-in whitespace-nowrap">Project O3</h1>}
          </div>
        </div>
        
        {stage === 'intro' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] pointer-events-none z-0 opacity-85 transition-opacity duration-1000">
            <Orb hoverIntensity={0.5} forceHoverState={true} backgroundColor="#131314" />
          </div>
        )}

        {stage === 'thinking' && (
          <div className="absolute inset-0 w-full h-full z-0 opacity-100 transition-opacity duration-1000">
            <Aurora speed={1.2} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#131314] via-transparent to-[#131314] opacity-80" />
          </div>
        )}
        
        {stage === 'intro' && (
          <div className="relative z-10 flex flex-col items-center justify-center h-full pt-10">
            <BlurText text="Project O3" delay={120} animateBy="letters" direction="top" className="font-bold tracking-widest text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.4)] uppercase text-6xl md:text-7xl mb-4" />
            <p className="text-gray-400 text-xs md:text-sm font-mono tracking-[0.35em] uppercase opacity-75 animate-fade-in text-center mb-12">Can't come up with a tagline 🫤</p>
            <form onSubmit={handleSubmit} className="w-full max-w-2xl px-4 pointer-events-auto">
              <div className="flex items-center bg-[#1e1f20] border border-white/10 rounded-full px-6 py-4 focus-within:border-white/30 focus-within:bg-[#252628] transition-all duration-300 shadow-xl">
                <input type="text" placeholder="Ask Project O3 anything..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="w-full bg-transparent text-white outline-none placeholder-gray-500 text-base font-light pr-4" />
                <button type="submit" className="text-gray-400 hover:text-white transition text-lg">➔</button>
              </div>
            </form>
          </div>
        )}

        {stage === 'thinking' && (
          <div className="relative z-10 flex flex-col items-center justify-center h-full text-center">
            <ShinyText text="Thinking..." speed={2} className="text-4xl md:text-5xl font-semibold tracking-widest uppercase font-mono" />
          </div>
        )}

        {stage === 'result' && (
          <div className="relative z-10 flex flex-col items-center w-full h-full pt-20 pb-6 pointer-events-auto">
            <div className="flex-1 w-full max-w-3xl px-4 md:px-8 overflow-y-auto mb-6 scrollbar-hide pt-4">
              <div className="flex flex-col gap-8">
                
                {messages.map((msg, idx) => (
                  msg.role === 'user' ? (
                    <div key={idx} className="flex justify-end w-full animate-fade-in">
                      <div className="bg-[#1e1f20] text-gray-200 px-5 py-3.5 rounded-3xl rounded-tr-sm max-w-[85%] md:max-w-[75%] text-[15px] leading-relaxed font-light tracking-wide shadow-sm">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div key={idx} className="flex flex-col gap-3 w-full animate-fade-in">
                      <div className="flex items-center gap-3">
                        <SparkleIcon />
                      </div>
                      
                      {/* NEW MARKDOWN RENDERER */}
                      <div className="text-gray-100 text-[15.5px] leading-7 font-light tracking-wide w-full overflow-x-auto">
                        <ReactMarkdown 
                          components={{
                            // Custom styles for code blocks
                            code({node, inline, className, children, ...props}) {
                              return !inline ? (
                                <div className="bg-[#1e1f20] rounded-xl p-4 my-4 overflow-x-auto border border-white/5 shadow-inner">
                                  <code className="font-mono text-sm text-[#9bd2f2]" {...props}>{children}</code>
                                </div>
                              ) : (
                                <code className="bg-white/10 px-1.5 py-0.5 rounded text-cyan-300 text-sm font-mono" {...props}>{children}</code>
                              )
                            },
                            // Add spacing for normal paragraphs
                            p: ({children}) => <p className="mb-4 last:mb-0">{children}</p>
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>

                        {/* NEW DLP TRANSPARENCY SHIELD REPORT */}
                        {msg.piiMap && Object.keys(msg.piiMap).length > 0 && (
                          <div className="mt-6 bg-[#162024] border border-cyan-500/20 rounded-xl p-4 animate-fade-in shadow-lg">
                            <div className="flex items-center gap-2 text-white-400 text-xs font-bold uppercase tracking-wider mb-3">
                              <ShieldIcon /> don't worry IU5H got your back and changed these secrets for you 😉 
                            </div>
                            <ul className="space-y-2">
                              {Object.entries(msg.piiMap).map(([placeholder, secret]) => (
                                <li key={placeholder} className="text-sm text-gray-400 flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                                  <span>Protected <span className="text-gray-200 font-mono bg-white/5 px-1.5 py-0.5 rounded">{secret}</span></span>
                                  <span className="hidden md:inline">→</span>
                                  <span>Masked as <span className="text-purple-400 font-mono bg-purple-400/10 px-1.5 py-0.5 rounded">{placeholder}</span></span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                ))}

                {isTyping && (
                  <div className="flex flex-col gap-3 w-full animate-fade-in">
                    <div className="flex items-center gap-3">
                      <SparkleIcon />
                    </div>
                    <ShinyText text="Thinking..." speed={2} className="text-sm font-semibold tracking-widest uppercase font-mono" />
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>
            </div>

            <div className="w-full max-w-3xl px-4 relative">
              <form onSubmit={handleSubmit}>
                <div className="flex items-center bg-[#1e1f20] border border-white/10 rounded-full px-6 py-3.5 focus-within:border-white/30 focus-within:bg-[#252628] transition-all duration-300 shadow-lg">
                  <input type="text" placeholder="Ask a follow-up..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="w-full bg-transparent text-white outline-none placeholder-gray-500 text-base font-light pr-4" disabled={isTyping} />
                  <button type="submit" className="text-gray-400 hover:text-white transition text-lg" disabled={isTyping}>➔</button>
                </div>
              </form>
              <p className="text-center text-xs text-gray-500 mt-3 tracking-wide">
                Project O3 can make mistakes. Verify critical privacy protocols.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;