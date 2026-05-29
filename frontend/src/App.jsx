import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { pipeline, env } from '@huggingface/transformers';
import BlurText from './components/bits/BlurText';
import Orb from './components/bits/Orb';
import Aurora from './components/bits/Aurora';
import ShinyText from './components/bits/ShinyText';

// Tell Transformers.js to load models from the Hugging Face CDN
env.allowLocalModels = false;

// Helper icons
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const MessageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
const SparkleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path></svg>;
const ShieldIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>;

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stage, setStage] = useState('intro');
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  
  // --- NEW MEMORY STATES ---
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(Date.now().toString());

  // Local Machine learning model pipeline states
  const [piiPipeline, setPiiPipeline] = useState(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState("Warming up secure local guardrails...");

  const chatEndRef = useRef(null);

  // Initialize the local tiny PII extraction model completely in the browser
  useEffect(() => {
    async function loadLocalDlpModel() {
      try {
        const pipe = await pipeline('token-classification', 'onnx-community/bert-small-pii-detection-ONNX', {
          progress_callback: (data) => {
            if (data.status === 'initiate') {
              setLoadingProgress('Initiating one-time privacy engine setup...');
            } else if (data.status === 'progress') {
              setLoadingProgress(`Downloading local privacy engine (${Math.round(data.progress)}%)...`);
            } else if (data.status === 'done') {
              setLoadingProgress('Finalizing local setup...');
            }
          }
        });
        setPiiPipeline(() => pipe);
        setIsModelLoaded(true);
      } catch (error) {
        console.error("Local WebGPU/WASM PII Model failed to load:", error);
        setLoadingProgress("Failed to load privacy engine.");
      }
    }
    loadLocalDlpModel();
  }, []);

  // 1. Load saved chats when the app starts
  useEffect(() => {
    const savedChats = JSON.parse(localStorage.getItem('o3_chat_history')) || [];
    setChatSessions(savedChats);
  }, []);

  // 2. Auto-save whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      setChatSessions(prevSessions => {
        // Automatically make a title from the first message (max 25 characters)
        const firstMessage = messages.find(m => m.role === 'user')?.content || "New Chat";
        const title = firstMessage.length > 25 ? firstMessage.substring(0, 25) + "..." : firstMessage;

        let updatedSessions = [...prevSessions];
        const existingSessionIndex = updatedSessions.findIndex(s => s.id === currentSessionId);

        if (existingSessionIndex >= 0) {
          // Update existing chat
          updatedSessions[existingSessionIndex] = { id: currentSessionId, title, messages };
        } else {
          // Add brand new chat to the top of the list
          updatedSessions.unshift({ id: currentSessionId, title, messages });
        }

        // Save to browser storage
        localStorage.setItem('o3_chat_history', JSON.stringify(updatedSessions));
        return updatedSessions;
      });
    }
  }, [messages, currentSessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Client-Side Regex Extraction Engine
  const localRegexDetector = (text) => {
    const pii = {};
    
    // Emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    for (const match of text.matchAll(emailRegex)) pii[match[0]] = "EMAIL";
    
    // Passwords
    const pwdRegex = /(?:password|pwd|pass)\s*[:=]\s*([^\s]+)/gi;
    for (const match of text.matchAll(pwdRegex)) pii[match[1]] = "PASSWORD";
    
    // GitHub Tokens
    const ghRegex = /ghp_[A-Za-z0-9]{36}/g;
    for (const match of text.matchAll(ghRegex)) pii[match[0]] = "GITHUB_TOKEN";
    const ghPatRegex = /(?:github_pat|github_oauth)_[a-zA-Z0-9_]{30,100}/gi;
    for (const match of text.matchAll(ghPatRegex)) pii[match[0]] = "GITHUB_TOKEN";
    
    // AWS Keys
    const awsRegex = /(?<![A-Z0-9])[A-Z0-9]{20}(?![A-Z0-9])/g;
    for (const match of text.matchAll(awsRegex)) {
      if (match[0].startsWith("AKIA")) pii[match[0]] = "AWS_ACCESS_KEY";
    }
    
    // Credit Cards
    const ccRegex = /(?:\d[ -]*?){13,16}/g;
    for (const match of text.matchAll(ccRegex)) {
      const cleanCc = match[0].replace(/[- ]/g, '');
      if (cleanCc.length >= 13 && cleanCc.length <= 16) pii[match[0].trim()] = "CREDIT_CARD";
    }
    
    // High Entropy Secrets (>= 15 chars)
    const secretRegex = /\b(?=.*[A-Za-z])(?=.*[0-9])[A-Za-z0-9@#$%^&+=_!]{15,}\b/g;
    for (const match of text.matchAll(secretRegex)) {
      if (!pii[match[0]]) pii[match[0]] = "SECRET";
    }
    
    return pii;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userText = inputValue;
    setInputValue('');
    
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);

    if (stage === 'intro') setStage('thinking');
    else setIsTyping(true);

    try {
      // 1. RUN DETECTORS COMPLETELY ON THE CLIENT SIDE
      const regexPii = localRegexDetector(userText);
      let aiPii = {};

      if (piiPipeline) {
        try {
          const aiResults = await piiPipeline(userText);
          aiResults.forEach(entity => {
            let word = entity.word.replace(/##/g, '').trim();
            if (word.length > 1) {
              let label = entity.entity || entity.entity_group || "PII";
              label = label.replace(/^[BI]-/, '').toUpperCase();
              aiPii[word] = label;
            }
          });
        } catch (err) {
          console.error("Browser AI PII processing error:", err);
        }
      }

      // Merge results
      const combinedPii = { ...regexPii, ...aiPii };

      // 2. MASK LOCALLY BEFORE SENDING
      let maskedText = userText;
      const localPrivacyMap = {};
      const counters = {};

      // Sort by length longest first to avoid nested partial strings being mismatched
      const sortedPii = Object.entries(combinedPii).sort((a, b) => b[0].length - a[0].length);

      for (const [secret, category] of sortedPii) {
        // Skip tiny noisy subwords or fragments
        if (secret.length < 3 || /^\d+$/.test(secret)) continue; 

        if (!counters[category]) counters[category] = 1;
        const placeholder = `<<${category}_${counters[category]}>>`;
        
        // Escape the secret for regex
        const escapedSecret = secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // THE FIX: "Negative Lookbehinds/Lookaheads"
        // This ensures the secret is NOT immediately preceded or followed by other letters/numbers.
        const safeRegex = new RegExp(`(?<![a-zA-Z0-9])${escapedSecret}(?![a-zA-Z0-9])`, 'g');
        
        if (safeRegex.test(maskedText)) {
          maskedText = maskedText.replace(safeRegex, placeholder);
          localPrivacyMap[placeholder] = secret;
          counters[category]++;
        }
      }

// 3. SEND THE SECURE MASKED PAYLOAD TO THE BACKEND ROUTER
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masked_message: maskedText }),
      });

      if (!response.ok) throw new Error('Network error');
      const data = await response.json();

      if (stage === 'intro') setStage('result');

      // 4. UNMASK RESPONSE LOCALLY ON THE MACHINE
      let finalOutput = data.cloud_response || "";
      for (const [placeholder, secret] of Object.entries(localPrivacyMap)) {
        finalOutput = finalOutput.split(placeholder).join(secret);
      }

      setMessages((prev) => [...prev, { 
        role: 'ai', 
        content: finalOutput,
        piiMap: localPrivacyMap 
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
    setCurrentSessionId(Date.now().toString()); // Create a fresh ID
    if (window.innerWidth < 768) setIsSidebarOpen(false); // Close sidebar on mobile
  };

  const loadChat = (session) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setStage('result');
    if (window.innerWidth < 768) setIsSidebarOpen(false); // Close sidebar on mobile
  };

  return (
    <div className="flex h-screen w-full bg-[#131314] text-white overflow-hidden font-sans">
      
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
            {chatSessions.length === 0 ? (
              <p className="text-sm text-gray-500 px-3 italic">No recent chats</p>
            ) : (
              chatSessions.map(session => (
                <button 
                  key={session.id}
                  onClick={() => loadChat(session)}
                  className={`w-full flex items-center gap-3 text-sm px-3 py-2.5 rounded-full transition text-left ${currentSessionId === session.id ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                >
                  <MessageIcon /> 
                  <span className="truncate">{session.title}</span>
                </button>
              ))
            )}
          </div>
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
            <BlurText text="Project O3" delay={120} animateBy="letters" direction="top" className="font-bold tracking-widest text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.4)] uppercase text-5xl sm:text-6xl md:text-7xl mb-4 whitespace-nowrap" />
            <p className="text-gray-400 text-xs md:text-sm font-mono tracking-[0.35em] uppercase opacity-75 animate-fade-in text-center mb-12">Can't come up with a tagline 🫤</p>
            <form onSubmit={handleSubmit} className="w-full max-w-2xl px-4 pointer-events-auto">
              <div className={`flex items-center bg-[#1e1f20] border rounded-full px-6 py-4 transition-all duration-300 shadow-xl ${isModelLoaded ? 'border-white/10 focus-within:border-white/30 focus-within:bg-[#252628]' : 'border-cyan-500/30'}`}>
                <input 
                  type="text" 
                  placeholder={isModelLoaded ? "Ask Project O3 anything..." : loadingProgress} 
                  value={inputValue} 
                  onChange={(e) => setInputValue(e.target.value)} 
                  className="w-full bg-transparent text-white outline-none placeholder-gray-400 text-base font-light pr-4 disabled:opacity-75" 
                  disabled={!isModelLoaded}
                />
                <button 
                  type="submit" 
                  className={`transition text-lg ${isModelLoaded ? 'text-gray-400 hover:text-white' : 'text-gray-600 cursor-not-allowed'}`} 
                  disabled={!isModelLoaded}
                >
                  ➔
                </button>
              </div>
              
              {/* Sleek one-time download indicator */}
              {!isModelLoaded && (
                <p className="text-center text-xs text-cyan-500/80 mt-4 tracking-wide animate-pulse font-mono">
                  {loadingProgress} (One-time download ~30MB)
                </p>
              )}
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
                      
                      <div className="text-gray-100 text-[15.5px] leading-7 font-light tracking-wide w-full overflow-x-auto">
                        <ReactMarkdown 
                          components={{
                            code({node, inline, className, children, ...props}) {
                              return !inline ? (
                                <div className="bg-[#1e1f20] rounded-xl p-4 my-4 overflow-x-auto border border-white/5 shadow-inner">
                                  <code className="font-mono text-sm text-[#9bd2f2]" {...props}>{children}</code>
                                </div>
                              ) : (
                                <code className="bg-white/10 px-1.5 py-0.5 rounded text-cyan-300 text-sm font-mono" {...props}>{children}</code>
                              )
                            },
                            p: ({children}) => <p className="mb-4 last:mb-0">{children}</p>
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>

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
                  <input 
                    type="text" 
                    placeholder={isModelLoaded ? "Ask a follow-up..." : loadingProgress} 
                    value={inputValue} 
                    onChange={(e) => setInputValue(e.target.value)} 
                    className="w-full bg-transparent text-white outline-none placeholder-gray-500 text-base font-light pr-4" 
                    disabled={isTyping || !isModelLoaded} 
                  />
                  <button 
                    type="submit" 
                    className={`transition text-lg ${isTyping || !isModelLoaded ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white'}`} 
                    disabled={isTyping || !isModelLoaded}
                  >
                    ➔
                  </button>
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