import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, X, Send, Sparkles } from 'lucide-react';

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, isBot: true, text: "Hey! Need help finding something? Just type what you're looking for (e.g., 'where are notes' or 'find mentors')." }
  ]);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const processQuery = (query) => {
    const q = query.toLowerCase();
    
    // Keyword Matching
    if (q.match(/note|resource|pyq|pdf|material/i)) {
      navigate('/resources');
      return "Sure thing! Taking you to the Resource Hub right away. 📚";
    }
    if (q.match(/live|class|video|lecture|session/i)) {
      navigate('/live-classes');
      return "Got it! Heading over to Live Classes. 🎥";
    }
    if (q.match(/summary|ai|genie|summarize/i)) {
      navigate('/summaries');
      return "Opening the AI Study Genie for you! 🧠";
    }
    if (q.match(/roadmap|career|path|momentum/i)) {
      navigate('/roadmap');
      return "Let's check out your personalized Career Roadmap! 🧭";
    }
    if (q.match(/mentor|guide|expert|faculty/i)) {
      navigate('/mentors');
      return "Navigating you to the Mentors directory! 🤝";
    }
    if (q.match(/study room|room|collab|team/i)) {
      navigate('/study-rooms');
      return "Taking you to Study Rooms so you can collaborate! 👥";
    }
    if (q.match(/leaderboard|score|rank/i)) {
      navigate('/collab-score');
      return "Curious about your rank? Let's go to your Collab Score! 🏆";
    }
    if (q.match(/community|discussion|ask|doubt|question/i)) {
      navigate('/community');
      return "Bringing you to the Community Discussions so you can ask away! 💬";
    }
    if (q.match(/notification|alert/i)) {
      navigate('/notifications');
      return "Checking your notifications! 🔔";
    }
    if (q.match(/message|chat|inbox/i)) {
      navigate('/messages');
      return "Opening your private messages. ✉️";
    }
    if (q.match(/profile|setting|account/i)) {
      navigate('/profile');
      return "Taking you to your Profile page. 👤";
    }

    return "I couldn't quite catch where you want to go. Try asking for 'notes', 'mentors', 'study rooms', or 'discussions'!";
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = { id: Date.now(), isBot: false, text: inputValue };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    // Simulate AI processing delay
    setTimeout(() => {
      const responseText = processQuery(userMessage.text);
      const botResponse = { id: Date.now() + 1, isBot: true, text: responseText };
      setMessages((prev) => [...prev, botResponse]);
    }, 600);
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
      {isOpen && (
        <div 
          className="fade-in"
          style={{
            position: 'absolute',
            bottom: '76px',
            right: '0',
            width: '340px',
            height: '480px',
            background: 'var(--surface-glass)',
            backdropFilter: 'var(--card-blur)',
            WebkitBackdropFilter: 'var(--card-blur)',
            border: '1px solid rgba(46, 230, 166, 0.3)',
            borderTop: '1px solid rgba(46, 230, 166, 0.6)',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4), 0 0 40px rgba(46, 230, 166, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
            overflow: 'hidden',
            transformOrigin: 'bottom right'
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
            padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(46, 230, 166, 0.1)', 
                color: 'var(--accent)', display: 'grid', placeItems: 'center' 
              }}>
                <Bot size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text)', fontWeight: 600 }}>CampusIQ Assistant</h3>
                <div style={{ fontSize: '10px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={10} /> Smart Navigator
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Chat History */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                style={{
                  alignSelf: msg.isBot ? 'flex-start' : 'flex-end',
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  lineHeight: 1.4,
                  backgroundColor: msg.isBot ? 'rgba(255,255,255,0.05)' : 'rgba(46, 230, 166, 0.15)',
                  color: msg.isBot ? 'var(--text)' : 'var(--accent)',
                  border: msg.isBot ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(46, 230, 166, 0.3)',
                  borderBottomLeftRadius: msg.isBot ? '4px' : '12px',
                  borderBottomRightRadius: msg.isBot ? '12px' : '4px',
                }}
              >
                {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form 
            onSubmit={handleSend}
            style={{ 
              padding: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '8px', 
              backgroundColor: 'rgba(0,0,0,0.1)' 
            }}
          >
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="e.g. Where are my notes?"
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                padding: '8px 12px', borderRadius: '8px', color: 'var(--text)', fontSize: '13px', outline: 'none'
              }}
            />
            <button 
              type="submit"
              disabled={!inputValue.trim()}
              style={{
                background: inputValue.trim() ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                color: inputValue.trim() ? '#000' : 'var(--muted)',
                border: 'none', borderRadius: '8px', width: '36px', display: 'grid', placeItems: 'center', cursor: inputValue.trim() ? 'pointer' : 'default',
                transition: 'all 0.2s'
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = 'rgba(46, 230, 166, 0.15)';
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(46, 230, 166, 0.3), 0 0 20px rgba(46, 230, 166, 0.4)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = 'rgba(46, 230, 166, 0.05)';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 0 15px rgba(46, 230, 166, 0.15)';
          }
        }}
        style={{
          width: '60px', height: '60px', borderRadius: '50%',
          background: isOpen ? 'var(--accent)' : 'rgba(46, 230, 166, 0.05)',
          color: isOpen ? '#000' : 'var(--accent)',
          border: isOpen ? 'none' : '2px solid var(--accent)',
          boxShadow: isOpen ? '0 10px 25px rgba(46, 230, 166, 0.4)' : '0 0 15px rgba(46, 230, 166, 0.15)',
          display: 'grid', placeItems: 'center', cursor: 'pointer',
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          transform: isOpen ? 'scale(0.9) rotate(90deg)' : 'scale(1) rotate(0deg)'
        }}
      >
        {isOpen ? <X size={28} /> : <Bot size={28} />}
      </button>
    </div>
  );
};

export default AIAssistant;
