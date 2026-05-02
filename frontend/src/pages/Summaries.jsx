import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  BrainCircuit, Download, LoaderCircle, Sparkles, WandSparkles,
  Timer, Trophy, Bot, Send, FileBox, FileUp, ChevronDown, MonitorStop, FileStack, BookOpenCheck, User, X, Zap, Target, BarChart, ChevronRight, Eye, EyeOff
} from 'lucide-react';
import api from '../lib/api';

const processingSteps = [
  'Extracting PDF layers',
  'Analyzing academic context',
  'Mapping key conceptual nodes',
  'Syncing with Study Genie'
];

const StudyGenie = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [activeFeature, setActiveFeature] = useState('Summariser'); 
  const [uploadMode, setUploadMode] = useState('saved'); 
  const [savedResources, setSavedResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [selectedSavedId, setSelectedSavedId] = useState(searchParams.get('resourceId') || '');
  const [computerFile, setComputerFile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [processingIndex, setProcessingIndex] = useState(0);
  const [quiz, setQuiz] = useState(null);
  const [quizStatus, setQuizStatus] = useState('idle'); 
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(300);
  const [showReview, setShowReview] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showPdf, setShowPdf] = useState(true);
  const [isWorkspaceActive, setIsWorkspaceActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const fetchSaved = async () => {
      try {
        const res = await api.get('/resources/saved');
        setSavedResources(res.data.resources || []);
      } catch { setError("Couldn't load your saved PDFs."); }
      finally { setLoadingResources(false); }
    };
    fetchSaved();
  }, []);

  useEffect(() => {
    let interval = null;
    if (quizStatus === 'active' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && quizStatus === 'active') {
      setQuizStatus('completed');
    }
    return () => clearInterval(interval);
  }, [quizStatus, timeLeft]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const activePdfUrl = useMemo(() => {
    if (uploadMode === 'saved' && selectedSavedId) {
      return savedResources.find(r => r.id === selectedSavedId)?.fileUrl || '';
    }
    return computerFile ? URL.createObjectURL(computerFile) : '';
  }, [uploadMode, selectedSavedId, savedResources, computerFile]);

  const handleGenerateSummary = async (type = 'standard') => {
    setGeneratingSummary(true); setError('');
    const interval = setInterval(() => {
      setProcessingIndex(i => (i < processingSteps.length - 1 ? i + 1 : i));
    }, 1000);
    try {
      const formData = new FormData();
      if (uploadMode === 'saved') formData.append('resourceId', selectedSavedId);
      else formData.append('pdf', computerFile);
      const res = await api.post('/ai/summarize', formData);
      setSummary(res.data.summary);
    } catch (err) { setError('Genie failed to process PDF'); }
    finally { clearInterval(interval); setGeneratingSummary(false); }
  };

  const handleGenerateQuiz = async () => {
    setQuizStatus('loading');
    setError('');
    const interval = setInterval(() => {
      setProcessingIndex(i => (i < processingSteps.length - 1 ? i + 1 : i));
    }, 1000);
    try {
      const formData = new FormData();
      if (uploadMode === 'saved') formData.append('resourceId', selectedSavedId);
      else formData.append('pdf', computerFile);
      const res = await api.post('/ai/generate-quiz', formData);
      setQuiz(res.data.quiz || []);
      setQuizStatus('active');
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setTimeLeft(300);
      setShowReview(false);
    } catch (err) { 
      setError('Genie failed to generate quiz'); 
      setQuizStatus('idle');
    }
    finally { clearInterval(interval); }
  };

  const handleAnswerSelect = (option) => {
    setUserAnswers(prev => ({ ...prev, [currentQuestionIndex]: option }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < quiz.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setQuizStatus('completed');
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: msg }]);
    setChatLoading(true);
    try {
      const formData = new FormData();
      if (uploadMode === 'saved') formData.append('resourceId', selectedSavedId);
      else formData.append('pdf', computerFile);
      formData.append('question', msg);
      formData.append('chatHistory', JSON.stringify(chatHistory));
      const res = await api.post('/ai/solve-doubt', formData);
      setChatHistory(prev => [...prev, { role: 'model', text: res.data.answer }]);
    } catch (err) { 
        setChatHistory(prev => [...prev, { role: 'model', text: 'Genie encountered a glitch. Try again.' }]); 
    } finally { 
        setChatLoading(false); 
    }
  };

  const calculateScore = () => {
    if (!quiz) return 0;
    return quiz.reduce((score, q, idx) => {
      return score + (userAnswers[idx] === q.correctAnswer ? 1 : 0);
    }, 0);
  };

  return (
    <div className="premium-grid-base sg-app-container">
      {!isWorkspaceActive ? (
        <main className="flex-column fade-in sg-pre-workspace" style={{ gridColumn: 'span 12', height: '100%', justifyContent: 'center' }}>
          
          {/* Header Section */}
          <header className="flex-row justify-between items-center sg-main-header" style={{ width: '100%', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
            <div className="flex-column gap-8" style={{ alignItems: 'flex-start' }}>
              <div className="flex-row gap-8" style={{ color: 'var(--accent)' }}>
                <BrainCircuit size={20} />
                <span className="premium-text-meta" style={{ letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: '700' }}>
                  AI Intelligence Layer
                </span>
              </div>
              <h1 className="premium-text-hero" style={{ margin: 0, fontSize: '42px' }}>Study Genie</h1>
              <p className="premium-text-meta" style={{ fontStyle: 'italic', opacity: 0.8, fontSize: '16px', color: 'var(--accent)' }}>
                "Unlocking intelligence, one page at a time."
              </p>
            </div>

            {/* Stats Row */}
            <div className="flex-row gap-32 items-center sg-stats-row" style={{ padding: '20px 32px', background: 'var(--surface-elevated)', borderRadius: '24px', border: '1px solid var(--border-subtle)' }}>
               <div className="flex-column gap-4" style={{ alignItems: 'flex-end', borderRight: '1px solid var(--border-subtle)', paddingRight: '32px' }}>
                  <span className="premium-text-meta" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Library Size</span>
                  <span className="premium-text-h3" style={{ color: 'var(--accent)', margin: 0, fontSize: '20px' }}>{savedResources.length} PDFs</span>
               </div>
               <div className="flex-column gap-4" style={{ alignItems: 'flex-end', borderRight: '1px solid var(--border-subtle)', paddingRight: '32px' }}>
                  <span className="premium-text-meta" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Analysis Mastery</span>
                  <span className="premium-text-h3" style={{ color: 'var(--gold)', margin: 0, fontSize: '20px' }}>Level 84</span>
               </div>
               <div className="flex-column gap-4" style={{ alignItems: 'flex-end' }}>
                  <span className="premium-text-meta" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Topics Mapped</span>
                  <span className="premium-text-h3" style={{ color: 'var(--text-main)', margin: 0, fontSize: '20px' }}>128 Modules</span>
               </div>
            </div>
          </header>

          {/* Centered Selection Area */}
             <div className="flex-column sg-selection-container" style={{ alignItems: 'center', width: '100%', marginBottom: '12px' }}>
                <div className="flex-row justify-center sg-mode-toggles" style={{ marginBottom: '16px', background: 'var(--surface-elevated)', padding: '6px', borderRadius: '16px' }}>
                   <button 
                    onClick={() => setUploadMode('saved')}
                    style={{ 
                      padding: '10px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                      background: uploadMode === 'saved' ? 'var(--accent)' : 'transparent',
                      color: uploadMode === 'saved' ? '#000' : 'var(--text)',
                      fontWeight: '700', fontSize: '15px', transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
                      boxShadow: uploadMode === 'saved' ? '0 4px 12px rgba(46, 230, 166, 0.3)' : 'none'
                    }}
                   >
                    Saved Materials
                   </button>
                   <button 
                    onClick={() => setUploadMode('computer')}
                    style={{ 
                      padding: '10px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                      background: uploadMode === 'computer' ? 'var(--accent)' : 'transparent',
                      color: uploadMode === 'computer' ? '#000' : 'var(--text)',
                      fontWeight: '700', fontSize: '15px', transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
                      boxShadow: uploadMode === 'computer' ? '0 4px 12px rgba(46, 230, 166, 0.3)' : 'none'
                    }}
                   >
                    Local File
                   </button>
                </div>

                 <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                   {uploadMode === 'saved' ? (
                     <select 
                       style={{ 
                         width: '100%', maxWidth: '500px', padding: '18px 24px', borderRadius: '16px', 
                         background: 'var(--surface-elevated)', 
                         border: '1px solid rgba(46, 230, 166, 0.2)', color: '#fff', fontSize: '18px', cursor: 'pointer', outline: 'none',
                         color: 'var(--text-main)',
                         textAlign: 'center', appearance: 'none', transition: 'all 0.3s ease'
                       }}
                       value={selectedSavedId}
                       onChange={e => setSelectedSavedId(e.target.value)}
                     >
                       <option value="" style={{ background: 'var(--surface)', color: 'var(--text-main)' }}>Select a library material...</option>
                       {savedResources.map(r => <option key={r.id} value={r.id} style={{ background: 'var(--surface)', color: 'var(--text-main)' }}>{r.title}</option>)}
                     </select>
                   ) : (
                     <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const file = e.dataTransfer.files[0];
                            if (file && file.type === 'application/pdf') {
                                setComputerFile(file);
                            } else {
                                setError('Please upload a PDF file');
                            }
                        }}
                        style={{ 
                            width: '100%', maxWidth: '500px', padding: '40px 24px', borderRadius: '20px', 
                            background: isDragging ? 'var(--surface-elevated-strong)' : 'var(--surface-elevated)', 
                            border: `2px dashed ${isDragging ? 'var(--accent)' : 'rgba(46, 230, 166, 0.3)'}`, 
                            color: 'var(--text-main)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                        }}
                        onClick={() => document.getElementById('local-pdf-upload').click()}
                     >
                        <input 
                            id="local-pdf-upload"
                            type="file" 
                            accept=".pdf"
                            hidden
                            onChange={e => setComputerFile(e.target.files[0])} 
                        />
                        <div className="flex-column items-center justify-center gap-12" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(46, 230, 166, 0.1)', display: 'grid', placeItems: 'center', marginBottom: '8px' }}>
                                <FileUp size={24} color="var(--accent)" />
                            </div>
                            <span style={{ fontSize: '15px', opacity: 0.9, fontWeight: '500' }}>
                                {computerFile ? computerFile.name : 'Drop PDF here or click to browse'}
                            </span>
                            <span style={{ fontSize: '12px', opacity: 0.8, color: 'var(--muted)' }}>Supports high-resolution PDF layers</span>
                        </div>
                     </div>
                   )}
                 </div>
             </div>

             {/* Error Message Display */}
             {error && (
                <div style={{ color: 'var(--danger)', fontSize: '14px', fontWeight: '600', background: 'rgba(255, 90, 95, 0.1)', padding: '10px 24px', borderRadius: '99px', border: '1px solid rgba(255,100,100,0.2)' }}>
                   {error}
                </div>
             )}

             {/* Bottom Feature Capabilities Grid - Interactive Palettes */}
             <div className="flex-row sg-feature-palettes" style={{ justifyContent: 'center', width: '100%', maxWidth: '900px', gap: '24px', marginTop: '16px', flexWrap: 'wrap' }}>
                {[
                  { id: 'Summariser', label: 'AI Summarizer', icon: <Sparkles size={28}/>, desc: 'Generate conceptual maps' },
                  { id: 'Quiz', label: 'Quiz Generator', icon: <Target size={28}/>, desc: 'Test retention live' },
                  { id: 'DoubtSolver', label: 'AI Doubt Solver', icon: <Bot size={28}/>, desc: 'Clarify any complexity' }
                ].map(f => (
                  <button 
                    key={f.id}
                    onClick={() => {
                        if (!selectedSavedId && !computerFile) {
                            setError('Please select a study material first');
                            return;
                        }
                        setActiveFeature(f.id);
                        setIsWorkspaceActive(true);
                    }}
                    className="premium-card hover-lift sg-feature-palette"
                    style={{ 
                      flex: '1 1 250px', padding: '32px 24px', background: 'var(--interactive-card-bg)', 
                      borderRadius: '24px', border: '1px solid var(--border-subtle)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
                      cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'var(--interactive-hover-bg)';
                        e.currentTarget.style.borderColor = 'var(--interactive-hover-border)';
                        e.currentTarget.style.boxShadow = '0 10px 30px rgba(46, 230, 166, 0.15)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'var(--interactive-card-bg)';
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        e.currentTarget.style.boxShadow = 'var(--card-shadow)';
                    }}
                  >
                     <div style={{ 
                        color: 'var(--accent)', background: 'var(--surface-elevated-strong)', 
                        padding: '16px', borderRadius: '18px', display: 'grid', placeItems: 'center',
                        boxShadow: '0 4px 12px rgba(46, 230, 166, 0.1)'
                     }}>
                        {f.icon}
                     </div>
                     <div className="flex-column" style={{ gap: '6px', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-main)', fontSize: '16px', fontWeight: '800', letterSpacing: '0.02em' }}>{f.label}</span>
                        <span style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: '500' }}>{f.desc}</span>
                     </div>
                  </button>
                ))}
             </div>
        </main>
      ) : (
        <>
          {/* Main AI Interaction Panel */}
          <main className="col-left flex-column sg-workspace-main" style={{ 
            gridColumn: showPdf ? 'span 6' : 'span 12'
          }}>
            <header className="flex-row justify-between items-start mb-32">
               <div className="flex-column gap-4">
                  <div className="flex-row gap-8" style={{ color: 'var(--accent)' }}>
                     <Sparkles size={16} />
                     <span className="premium-text-meta" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>AI Workspace</span>
                  </div>
                  <h2 className="premium-text-h2" style={{ margin: 0 }}>Study Genie</h2>
               </div>
               <div className="flex-row gap-12 items-center">
                  <button onClick={() => setShowPdf(!showPdf)} className="premium-button-secondary" style={{ padding: '8px', borderRadius: '10px' }}>
                    {showPdf ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <button onClick={() => setIsWorkspaceActive(false)} className="premium-button-secondary" style={{ padding: '8px', borderRadius: '10px', color: 'var(--danger)' }}>
                    <X size={18} />
                  </button>
               </div>
            </header>

            <nav className="flex-row gap-24 mb-32" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
               {['Summariser', 'Quiz', 'DoubtSolver'].map(f => (
                 <button 
                   key={f} onClick={() => setActiveFeature(f)} 
                   className="premium-text-meta"
                   style={{ 
                     padding: '8px 0', border: 'none', background: 'transparent', cursor: 'pointer',
                     borderBottom: activeFeature === f ? '2px solid var(--accent)' : '2px solid transparent',
                     color: activeFeature === f ? 'var(--accent)' : 'var(--muted)',
                     fontWeight: activeFeature === f ? 'bold' : 'normal',
                     fontSize: '14px', transition: 'all 0.3s'
                   }}
                 >
                    {f === 'Summariser' ? 'Summary' : f === 'Quiz' ? 'Generate Quiz' : 'AI Solve'}
                 </button>
               ))}
            </nav>

            <section className="flex-column gap-24" style={{ flex: 1 }}>
               {activeFeature === 'Summariser' ? (
                 <div className="flex-column gap-24">
                    {!summary && !generatingSummary ? (
                        <div className="flex-column gap-24 items-center text-center py-48">
                           <Sparkles size={48} color="var(--accent)" />
                           <h2 className="premium-text-h2">Generate Smart Summary</h2>
                           <p className="premium-text-body subdued">Synthesize key concepts and academic layers from your PDF into a structured knowledge map.</p>
                           <button className="premium-button" style={{ padding: '16px 48px' }} onClick={() => handleGenerateSummary('deep')}>Generate AI Summary</button>
                        </div>
                    ) : generatingSummary ? (
                       <div className="flex-column gap-24 p-32 items-center text-center">
                          <div className="loader-ring" />
                          <div className="flex-column gap-12 mt-24">
                             <h3 className="premium-text-h3">{processingSteps[processingIndex]}</h3>
                             <p className="premium-text-meta">Synthesizing personalized study paths...</p>
                          </div>
                       </div>
                    ) : (
                       <div className="flex-column gap-24 fade-in">
                          <div className="flex-row justify-between items-center">
                             <h3 className="premium-text-h3" style={{ margin: 0 }}>Knowledge Map</h3>
                             <button className="premium-button-secondary" style={{ padding: '8px' }} onClick={() => setSummary(null)}><X/></button>
                          </div>
                          <article style={{ padding: '0 0 24px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                             <ul className="flex-column gap-16 premium-text-body" style={{ listStyle: 'none', padding: 0 }}>
                                {summary.summary.map((s, i) => <li key={i} className="flex-row gap-12"><ChevronRight size={16} color="var(--accent)"/> {s}</li>)}
                             </ul>
                          </article>
                          <div className="premium-grid-base" style={{ padding: 0 }}>
                             <div className="flex-column gap-12" style={{ gridColumn: 'span 6', padding: '16px 0' }}>
                                <span className="premium-text-meta" style={{ color: 'var(--gold)', letterSpacing: '0.1em' }}>VIVA QUESTIONS</span>
                                <p className="premium-text-body" style={{ fontSize: '13px' }}>{summary.questions[0]}</p>
                             </div>
                             <div className="flex-column gap-12" style={{ gridColumn: 'span 6', padding: '16px 0' }}>
                                <span className="premium-text-meta" style={{ color: 'var(--accent)', letterSpacing: '0.1em' }}>CORE CONCEPT</span>
                                <p className="premium-text-body" style={{ fontSize: '13px' }}>{summary.keyConcepts.terms[0]}</p>
                             </div>
                          </div>
                          <button className="premium-button" style={{ width: '100%' }} onClick={() => setActiveFeature('Quiz')}><Zap size={16}/> Practice with Knowledge Hunt</button>
                       </div>
                    )}
                 </div>
               ) : activeFeature === 'DoubtSolver' ? (
                  <div className="flex-column gap-16" style={{ height: '100%' }}>
                     <div className="flex-column gap-16 p-4" style={{ flex: 1, overflowY: 'auto' }}>
                        {chatHistory.length === 0 && <div className="p-32 text-center opacity-50 mt-48"><Bot size={48}/><p className="premium-text-body mt-16">Genie is ready. What can I clarify?</p></div>}
                        {chatHistory.map((m, i) => (
                          <div key={i} className={`${m.role === 'user' ? 'align-self-end' : ''}`} style={{ maxWidth: '85%', background: m.role === 'user' ? 'rgba(46, 230, 166, 0.1)' : 'var(--surface-elevated)', padding: '12px 16px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                             <p className="premium-text-body" style={{ fontSize: '14px', margin: 0, color: m.role === 'user' ? 'var(--accent)' : 'var(--text-main)' }}>{m.text}</p>
                          </div>
                        ))}
                        {chatLoading && <div style={{ maxWidth: '85%', background: 'var(--surface-elevated)', padding: '12px 16px', borderRadius: '12px', alignSelf: 'flex-start' }}><LoaderCircle size={16} className="spin-icon" /></div>}
                        <div ref={chatEndRef} />
                     </div>
                      <div 
                        className="flex-row gap-12" 
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--interactive-hover-border)';
                          e.currentTarget.style.background = 'var(--interactive-hover-bg)';
                          e.currentTarget.style.boxShadow = '0 0 20px rgba(46, 230, 166, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-subtle)';
                          e.currentTarget.style.background = 'var(--interactive-card-bg)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        style={{ 
                          padding: '8px 16px', 
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '16px',
                          background: 'var(--interactive-card-bg)',
                          transition: 'all 0.3s ease',
                          margin: '0 12px 12px'
                        }}
                      >
                         <input className="premium-text-body" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', padding: '8px 0', fontSize: '14px' }} placeholder="Ask about the document..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendChat()} />
                         <button className="premium-button" style={{ borderRadius: '10px', padding: '8px 12px' }} onClick={handleSendChat}><Send size={16}/></button>
                      </div>
                  </div>
               ) : (
                  <div className="flex-column gap-24" style={{ height: '100%' }}>
                     {quizStatus === 'idle' ? (
                        <div className="flex-column gap-24 items-center text-center py-48">
                           <BrainCircuit size={48} color="var(--accent)" />
                           <h2 className="premium-text-h2">Generate Adaptive Quiz</h2>
                           <p className="premium-text-body subdued">Test your retention of the material through AI-generated questions based on the PDF.</p>
                           <button className="premium-button" style={{ padding: '16px 48px' }} onClick={handleGenerateQuiz}>Start AI Assessment</button>
                        </div>
                     ) : quizStatus === 'loading' ? (
                        <div className="flex-column gap-24 p-32 items-center text-center">
                           <div className="loader-ring" />
                           <div className="flex-column gap-12 mt-24">
                              <h3 className="premium-text-h3">{processingSteps[processingIndex]}</h3>
                              <p className="premium-text-meta">Synthesizing personalized assessment...</p>
                           </div>
                        </div>
                     ) : quizStatus === 'active' && quiz?.[currentQuestionIndex] ? (
                        <div className="flex-column gap-32 fade-in">
                           <div className="flex-row justify-between items-end">
                              <div className="flex-column gap-4">
                                    <div className="flex-row gap-12 items-center">
                                    <span className="premium-text-meta" style={{ color: 'var(--accent)' }}>QUESTION {currentQuestionIndex + 1} OF {quiz.length}</span>
                                    <div className="flex-row gap-6 items-center premium-text-meta" style={{ padding: '4px 0', color: timeLeft < 60 ? '#ff6b6b' : 'var(--muted)' }}>
                                       <Timer size={12}/> {formatTime(timeLeft)}
                                    </div>
                                 </div>
                                 <h3 className="premium-text-h3" style={{ margin: 0 }}>{quiz[currentQuestionIndex].question}</h3>
                              </div>
                              <div className="premium-text-meta" style={{ opacity: 0.5 }}>{Math.round(((currentQuestionIndex + 1) / quiz.length) * 100)}% Complete</div>
                           </div>
                           <div className="premium-progress-bar" style={{ height: '4px', background: 'var(--border-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${((currentQuestionIndex + 1) / quiz.length) * 100}%`, background: 'var(--accent)', transition: 'width 0.3s ease' }} />
                           </div>
                           <div className="flex-column gap-12">
                              {quiz[currentQuestionIndex].options.map((option, idx) => (
                                 <button 
                                    key={idx} onClick={() => handleAnswerSelect(option)}
                                    className={`flex-row items-center gap-16 hover-lift ${userAnswers[currentQuestionIndex] === option ? 'is-selected' : ''}`}
                                    style={{ 
                                      padding: '16px 24px', textAlign: 'left', border: '1px solid var(--border-subtle)', borderRadius: '12px',
                                      background: userAnswers[currentQuestionIndex] === option ? 'rgba(46, 230, 166, 0.1)' : 'transparent',
                                      borderColor: userAnswers[currentQuestionIndex] === option ? 'var(--accent)' : 'var(--border-subtle)',
                                      cursor: 'pointer'
                                    }}
                                 >
                                    <div style={{ 
                                      width: '24px', height: '24px', borderRadius: '50%', border: '2px solid', 
                                      borderColor: userAnswers[currentQuestionIndex] === option ? 'var(--accent)' : 'var(--border-strong)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold',
                                      background: userAnswers[currentQuestionIndex] === option ? 'var(--accent)' : 'transparent',
                                      color: userAnswers[currentQuestionIndex] === option ? 'var(--bg)' : 'inherit'
                                    }}>
                                       {String.fromCharCode(65 + idx)}
                                    </div>
                                    <span className="premium-text-body" style={{ flex: 1 }}>{option}</span>
                                 </button>
                              ))}
                           </div>
                           <div className="flex-row justify-between mt-12">
                              <button className="premium-button-secondary" disabled={currentQuestionIndex === 0} onClick={prevQuestion}>Previous</button>
                              <button className="premium-button" disabled={!userAnswers[currentQuestionIndex]} onClick={nextQuestion}>
                                 {currentQuestionIndex === quiz.length - 1 ? 'Finish Quiz' : 'Next Question'} <ChevronRight size={16} />
                              </button>
                           </div>
                        </div>
                     ) : quizStatus === 'completed' ? (
                        <div className="flex-column gap-24 items-center text-center py-24 fade-in">
                           {!showReview ? (
                              <>
                                 <div className="relative">
                                    <Trophy size={80} color="var(--gold)" style={{ opacity: 0.2 }} />
                                    <div className="absolute-center flex-column">
                                       <span className="premium-text-h1" style={{ color: 'var(--gold)', fontSize: '48px', margin: 0 }}>{calculateScore()}</span>
                                       <span className="premium-text-meta">OUT OF {quiz.length}</span>
                                    </div>
                                 </div>
                                 <div className="flex-column gap-12">
                                    <h2 className="premium-text-h2">Assessment Complete</h2>
                                    <p className="premium-text-body subdued">
                                       {calculateScore() === quiz.length ? 'Perfect retention! You have mastered this material.' : 
                                        calculateScore() >= quiz.length / 2 ? 'Great job! You have a solid grasp of core concepts.' : 
                                        'Keep studying. Review concepts and try again.'}
                                    </p>
                                 </div>
                                 <div className="flex-column gap-12 w-100">
                                    <button className="premium-button" style={{ width: '100%' }} onClick={() => setShowReview(true)}>Review Answers</button>
                                    <button className="premium-button-secondary" onClick={() => { setQuizStatus('idle'); setUserAnswers({}); setCurrentQuestionIndex(0); setTimeLeft(300); }}>Retry Quiz</button>
                                 </div>
                              </>
                           ) : (
                              <div className="flex-column gap-24 w-100 text-left">
                                 <div className="flex-row justify-between items-center">
                                    <h3 className="premium-text-h3" style={{ margin: 0 }}>Answer Review</h3>
                                    <button className="premium-button-secondary" style={{ padding: '8px' }} onClick={() => setShowReview(false)}><X/></button>
                                 </div>
                                 <div className="flex-column gap-16" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    {quiz.map((q, idx) => (
                                       <article key={idx} style={{ padding: '24px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                                          <p className="premium-text-body" style={{ fontWeight: '600' }}>{q.question}</p>
                                          <div style={{ padding: '12px 0', marginTop: '12px' }}>
                                             <div className="flex-row justify-between"><span className="premium-text-meta">YOURS:</span><span style={{ color: userAnswers[idx] === q.correctAnswer ? 'var(--accent)' : '#ff6b6b' }}>{userAnswers[idx] || 'SKIPPED'}</span></div>
                                             {userAnswers[idx] !== q.correctAnswer && <div className="flex-row justify-between mt-8"><span className="premium-text-meta">CORRECT:</span><span style={{ color: 'var(--accent)' }}>{q.correctAnswer}</span></div>}
                                          </div>
                                       </article>
                                    ))}
                                 </div>
                                 <button className="premium-button" style={{ width: '100%' }} onClick={() => setShowReview(false)}>Back to Summary</button>
                              </div>
                           )}
                        </div>
                     ) : null}
                  </div>
               )}
            </section>
          </main>

          {/* PDF Viewer Sidebar */}
          {showPdf && (
            <aside className="col-right fade-in sg-workspace-pdf" style={{ gridColumn: 'span 6' }}>
              {activePdfUrl ? (
                <iframe src={activePdfUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Material Viewer" />
              ) : (
                <div className="flex-column items-center justify-center gap-24" style={{ height: '100%', opacity: 0.3 }}>
                   <FileStack size={64} />
                   <p className="premium-text-body">Load source material to begin</p>
                </div>
              )}
              <div style={{ position: 'absolute', top: '24px', left: '24px' }}>
                 <div className="premium-chip" style={{ background: 'var(--hero-panel)', backdropFilter: 'blur(10px)', border: '1px solid var(--border-strong)' }}>
                    Source Explorer
                 </div>
              </div>
            </aside>
          )}
        </>
      )}
    </div>
  );
};

export default StudyGenie;
