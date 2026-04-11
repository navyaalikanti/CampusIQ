import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  BrainCircuit,
  ChartNoAxesCombined,
  CheckCircle2,
  Download,
  FileText,
  Handshake,
  Hash,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const featureCards = [
  {
    icon: BookOpen,
    title: 'Resource Hub',
    text: 'Access premium curated notes, PYQs, and academic materials in our high-security vault.',
  },
  {
    icon: BrainCircuit,
    title: 'Study Genie',
    text: 'Level up with AI-powered PDF intelligence, instant summaries, and smart revision tools.',
  },
  {
    icon: Users,
    title: 'Mentors',
    text: 'Connect with campus leaders and subject matter experts for personalized guidance.',
  },
  {
    icon: MessageSquareText,
    title: 'Social',
    text: 'Engage in real-time academic discussions and doubt solving on our community feed.',
  },
  {
    icon: Hash,
    title: 'Learn Together',
    text: 'Join collaborative group study sessions in dedicated virtual study rooms.',
  },
  {
    icon: Handshake,
    title: 'Collaborate',
    text: 'Find your perfect project partners and research teammates through Team Finder.',
  },
];

const valuePillars = [
  {
    title: 'Intelligence First',
    text: 'We move beyond simple data storage. CampusIQ turns your raw resources into active academic intelligence.',
    icon: BrainCircuit
  },
  {
    title: 'Verified Trust',
    text: 'No anonymous noise. Every resource and discussion is backed by verified campus identities.',
    icon: ShieldCheck
  },
  {
    title: 'Absolute Momentum',
    text: 'Reduce the friction between needing information and mastering it with AI-powered workflows.',
    icon: Target
  }
];

const Landing = () => {
  const [dynamicText, setDynamicText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const words = ['knowledge', 'insights', 'information'];
  const [typingSpeed, setTypingSpeed] = useState(150);

  useEffect(() => {
    const handleTyping = () => {
      const currentWord = words[wordIndex];
      const shouldDelete = isDeleting;

      setDynamicText(prev => {
        if (shouldDelete) {
          return currentWord.substring(0, prev.length - 1);
        }
        return currentWord.substring(0, prev.length + 1);
      });

      if (!shouldDelete && dynamicText === currentWord) {
        setTypingSpeed(1200); // Reduced pause at end of word
        setIsDeleting(true);
      } else if (shouldDelete && dynamicText === '') {
        setIsDeleting(false);
        setWordIndex((prev) => (prev + 1) % words.length);
        setTypingSpeed(400);
      } else {
        setTypingSpeed(shouldDelete ? 70 : 120);
      }
    };

    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [dynamicText, isDeleting, wordIndex, typingSpeed]);

  return (
    <div className="landing-page fade-in" style={{ scrollBehavior: 'smooth' }}>
      <Navbar />
      <section className="landing-hero" style={{ height: '100vh', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        <div className="landing-shell pill-shell" style={{ width: '100%', maxWidth: '1380px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' }}>
          
          <div className="landing-hero-copy" style={{ flex: '1 1 700px', textAlign: 'left' }}>
            <div className="landing-kicker">Premium EdTech Intelligence</div>
            <h1 style={{ fontSize: '72px', color: 'var(--text-main)', lineHeight: '1.05', fontWeight: 800, marginBottom: '24px', letterSpacing: '-0.025em' }}>
              <span style={{ display: 'block', whiteSpace: 'nowrap' }}>
                Turn campus <span style={{ color: 'var(--accent)' }}>{dynamicText}</span> 
              </span>
              <span style={{ display: 'block', whiteSpace: 'nowrap' }}>
                into smart learning
              </span>
            </h1>
            <p className="premium-text-body" style={{ maxWidth: '520px', opacity: 0.6, marginBottom: '44px', fontSize: '19px', lineHeight: '1.7' }}>
              AI-powered learning, trusted collaboration, and exam-ready intelligence for the modern campus.
            </p>
            <div className="landing-hero-actions" style={{ display: 'flex', gap: '16px' }}>
              <Link className="premium-button" to="/register" style={{ padding: '20px 40px', fontSize: '18px' }}>
                Get Started <ArrowRight size={20} />
              </Link>
              <Link className="premium-button-secondary" to="/login" style={{ padding: '20px 40px', fontSize: '18px' }}>
                Explore Platform
              </Link>
            </div>
          </div>

          <div className="landing-hero-visual" style={{ flex: '0 0 320px', display: 'flex', justifyContent: 'flex-end', position: 'relative' }}>
            <div className="landing-resource-collage" style={{ transform: 'scale(1)', transformOrigin: 'right center', marginRight: '-20px' }}>
              <article className="landing-resource-card resource-back">
                <div className="landing-resource-header">
                  <div className="landing-resource-file">
                    <FileText size={16} />
                    <span>Academic Resource</span>
                  </div>
                  <div className="landing-resource-status">Curated</div>
                </div>
                <strong>Data Structures PYQ Bank</strong>
                <div className="landing-resource-meta">
                  <span>CSE</span>
                  <span>2024</span>
                  <span>PYQ</span>
                </div>
                <div className="landing-chip-row">
                  <div className="landing-chip">PYQ</div>
                  <div className="landing-chip">Top Rated</div>
                </div>
              </article>

              <article className="landing-resource-card resource-front">
                <div className="landing-resource-header">
                  <div className="landing-resource-file">
                    <FileText size={16} />
                    <span>Resource Preview</span>
                  </div>
                  <div className="landing-resource-status accent">AI Ready</div>
                </div>
                <strong>Operating Systems Final Revision Notes</strong>
                <div className="landing-resource-meta">
                  <span>CSE</span>
                  <span>3rd Year</span>
                  <span>Notes</span>
                </div>
                <div className="landing-chip-row">
                  <div className="landing-chip">Notes</div>
                  <div className="landing-chip">AI Summary</div>
                  <div className="landing-chip">Top Rated</div>
                </div>
                <div className="landing-resource-preview">
                  <div className="preview-line strong" />
                  <div className="preview-line" />
                  <div className="preview-line short" />
                </div>
              </article>

              <div className="landing-stat-chip stat-bookmark">
                <Bookmark size={15} />
                <span>2.3k saved</span>
              </div>

              <div className="landing-stat-chip stat-download">
                <Download size={15} />
                <span>18k downloads</span>
              </div>

              <article className="landing-match-card">
                <span>Study Match</span>
                <strong>Ananya R</strong>
                <p>OS + DBMS sprint partner</p>
              </article>

              <div className="landing-insight-chip">
                Recommended: AI Summary for Unit 4 likely questions
              </div>
            </div>
          </div>

        </div>

        {/* Scroll Down Indicator */}
        <a 
          href="#features" 
          className="scroll-indicator"
          style={{
            position: 'absolute',
            bottom: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            color: 'var(--accent)',
            opacity: 0.6,
            transition: 'opacity 0.3s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
        >
          <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 600 }}>Explore</span>
          <div style={{
            width: '24px',
            height: '40px',
            border: '2px solid var(--accent)',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '8px'
          }}>
            <div style={{
              width: '4px',
              height: '8px',
              background: 'var(--accent)',
              borderRadius: '2px',
              animation: 'scrollPulse 2s infinite'
            }} />
          </div>
        </a>

        <div className="landing-curve landing-curve-bottom" />
        <style>
          {`
            @keyframes scrollPulse {
              0% { transform: translateY(0); opacity: 1; }
              50% { transform: translateY(12px); opacity: 0; }
              100% { transform: translateY(0); opacity: 1; }
            }
          `}
        </style>
      </section>

      {/* Key Features Section - 2x3 Grid */}
      <section className="landing-section" id="features" style={{ background: 'var(--bg)', padding: '100px 0' }}>
        <div className="landing-shell" style={{ maxWidth: '1200px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '48px' }}>
             <div className="landing-kicker" style={{ marginBottom: '16px', fontSize: '11px', letterSpacing: '0.2em' }}>Core Capabilities</div>
             <h2 style={{ fontSize: '52px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '16px', letterSpacing: '-0.02em', lineHeight: '1.1' }}>Key Features</h2>
             <p style={{ maxWidth: '600px', opacity: 0.8, fontSize: '17px', lineHeight: '1.6', margin: '0 auto', color: 'var(--muted)' }}>
               Experience the same high-signal tools found in your student dashboard, now optimized for collaborative intelligence.
             </p>
          </div>

          <div className="landing-feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px' }}>
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  className="landing-feature-card"
                  key={feature.title}
                  style={{
                    background: 'var(--interactive-card-bg)',
                    border: '1px solid var(--border-subtle)',
                    padding: '32px 24px',
                    borderRadius: '24px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.borderColor = 'var(--interactive-hover-border)';
                    e.currentTarget.style.background = 'var(--interactive-hover-bg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.background = 'var(--interactive-card-bg)';
                  }}
                >
                  <div className="landing-feature-icon" style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'var(--surface-elevated-strong)', color: 'var(--accent)', display: 'grid', placeItems: 'center', marginBottom: '20px' }}>
                    <Icon size={28} />
                  </div>
                  <strong style={{ fontSize: '20px', display: 'block', marginBottom: '10px', color: 'var(--text-main)', fontWeight: 700 }}>{feature.title}</strong>
                  <p style={{ opacity: 0.85, lineHeight: '1.6', margin: 0, fontSize: '14px', color: 'var(--muted)' }}>{feature.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why CampusIQ Section - Value Pillars */}
      <section className="landing-section" id="why" style={{ background: '#020408', padding: '100px 0', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="landing-shell" style={{ maxWidth: '1200px' }}>
           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '48px' }}>
              <div className="landing-kicker" style={{ marginBottom: '16px', fontSize: '11px', letterSpacing: '0.2em' }}>The Value Proposition</div>
              <h2 style={{ fontSize: '52px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '16px', letterSpacing: '-0.02em', lineHeight: '1.1' }}>Why CampusIQ</h2>
              <p style={{ maxWidth: '600px', opacity: 0.8, fontSize: '17px', lineHeight: '1.6', margin: '0 auto', color: 'var(--muted)' }}>
                We are building the future of academic collaboration by focusing on three non-negotiable pillars.
              </p>
           </div>

           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px' }}>
             {valuePillars.map((pillar) => {
               const Icon = pillar.icon;
               return (
                 <div 
                   key={pillar.title} 
                   className="flex-column items-center text-center"
                   style={{ 
                     background: 'var(--interactive-card-bg)', 
                     borderRadius: '24px', 
                     border: '1px solid var(--border-subtle)',
                     padding: '32px 24px'
                   }}
                 >
                    <div style={{ color: 'var(--accent)', marginBottom: '20px', width: '56px', height: '56px', borderRadius: '14px', background: 'var(--surface-elevated-strong)', display: 'grid', placeItems: 'center' }}>
                       <Icon size={28} strokeWidth={2} />
                    </div>
                    <div>
                       <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 10px 0', color: 'var(--text-main)' }}>{pillar.title}</h3>
                       <p style={{ opacity: 0.85, margin: 0, lineHeight: '1.6', fontSize: '14px', color: 'var(--muted)' }}>{pillar.text}</p>
                    </div>
                 </div>
               );
             })}
           </div>

           <div className="landing-cta-strip mt-80" style={{ background: 'var(--hero-gradient)', border: '1px solid var(--border-subtle)', borderRadius: '32px', padding: '64px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="flex-column gap-12">
                 <h2 style={{ color: 'var(--text-main)', fontSize: '40px', margin: '0', fontWeight: 800, letterSpacing: '-0.03em' }}>Ready to reach your potential?</h2>
                 <p style={{ color: 'var(--muted)', opacity: 0.9, margin: 0, fontSize: '18px', fontWeight: 500 }}>Join the next generation of intelligent campus learners today.</p>
              </div>
              <Link className="premium-button" to="/register" style={{ padding: '16px 32px', border: 'none', fontWeight: 800 }}>
                Create Account <ArrowRight size={20} style={{ marginLeft: '8px' }} />
              </Link>
           </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
