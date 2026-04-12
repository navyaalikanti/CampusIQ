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
    icon: BrainCircuit,
  },
  {
    title: 'Verified Trust',
    text: 'No anonymous noise. Every resource and discussion is backed by verified campus identities.',
    icon: ShieldCheck,
  },
  {
    title: 'Absolute Momentum',
    text: 'Reduce the friction between needing information and mastering it with AI-powered workflows.',
    icon: Target,
  },
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

      setDynamicText((prev) => {
        if (shouldDelete) {
          return currentWord.substring(0, prev.length - 1);
        }
        return currentWord.substring(0, prev.length + 1);
      });

      if (!shouldDelete && dynamicText === currentWord) {
        setTypingSpeed(1200);
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
    <div className="landing-page fade-in">
      <Navbar />

      {/* ── Hero ── */}
      <section className="landing-hero" id="home">
        <div className="landing-shell landing-hero-inner">

          {/* Copy block */}
          <div className="lp-hero-copy">
            <div className="landing-kicker">Premium EdTech Intelligence</div>
            <h1 className="lp-hero-h1">
              <span className="lp-hero-top-row">Turn campus <br className="lp-mobile-br" /> <span className="lp-accent">{dynamicText}<span className="lp-cursor"></span></span></span> <br /> <span className="lp-hero-bottom-row">into smart learning</span>
            </h1>
            <p className="lp-hero-sub premium-text-body">
              AI-powered learning, trusted collaboration, and exam-ready intelligence for the modern campus.
            </p>
            <div className="lp-hero-actions">
              <Link className="premium-button lp-btn-lg" to="/register">
                Get Started <ArrowRight size={18} />
              </Link>
              <Link className="premium-button-secondary lp-btn-lg" to="/login">
                Explore Platform
              </Link>
            </div>
          </div>

          {/* Visual collage */}
          <div className="landing-hero-visual lp-hero-visual">
            <div className="landing-resource-collage">
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

        {/* Scroll indicator */}
        <a href="#features" className="lp-scroll-indicator" aria-label="Scroll to features">
          <span className="lp-scroll-label">Explore</span>
          <div className="lp-scroll-mouse">
            <div className="lp-scroll-dot" />
          </div>
        </a>

        <div className="landing-curve landing-curve-bottom" />

        <style>{`
          @keyframes scrollPulse {
            0%   { transform: translateY(0);   opacity: 1; }
            50%  { transform: translateY(10px); opacity: 0; }
            100% { transform: translateY(0);   opacity: 1; }
          }
          .lp-scroll-dot { animation: scrollPulse 2s infinite; }
          .lp-cursor {
            display: inline-block;
            width: 3px;
            background: var(--accent);
            animation: cursorBlink 0.9s step-end infinite;
            margin-left: 2px;
            vertical-align: middle;
          }
          @keyframes cursorBlink {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0; }
          }
        `}</style>
      </section>

      {/* ── Key Features ── */}
      <section className="landing-section lp-features-section" id="features">
        <div className="landing-shell">
          <div className="lp-section-header">
            <div className="landing-kicker lp-kicker-sm">Core Capabilities</div>
            <h2 className="lp-section-h2">Key Features</h2>
            <p className="lp-section-sub">
              Experience the same high-signal tools found in your student dashboard, now optimized for collaborative intelligence.
            </p>
          </div>

          <div className="lp-feature-grid">
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  className="lp-feature-card"
                  key={feature.title}
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
                  <div className="lp-feature-icon-wrap">
                    <Icon size={26} />
                  </div>
                  <strong className="lp-feature-title">{feature.title}</strong>
                  <p className="lp-feature-text">{feature.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Why CampusIQ ── */}
      <section className="landing-section lp-why-section" id="why">
        <div className="landing-shell">
          <div className="lp-section-header">
            <div className="landing-kicker lp-kicker-sm">The Value Proposition</div>
            <h2 className="lp-section-h2">Why CampusIQ</h2>
            <p className="lp-section-sub">
              We are building the future of academic collaboration by focusing on three non-negotiable pillars.
            </p>
          </div>

          <div className="lp-pillars-grid">
            {valuePillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div key={pillar.title} className="lp-pillar-card">
                  <div className="lp-feature-icon-wrap">
                    <Icon size={26} strokeWidth={2} />
                  </div>
                  <h3 className="lp-pillar-title">{pillar.title}</h3>
                  <p className="lp-pillar-text">{pillar.text}</p>
                </div>
              );
            })}
          </div>

          {/* CTA strip */}
          <div className="lp-cta-strip">
            <div className="lp-cta-copy">
              <h2 className="lp-cta-h2">Ready to reach your potential?</h2>
              <p className="lp-cta-sub">Join the next generation of intelligent campus learners today.</p>
            </div>
            <Link className="premium-button lp-btn-lg lp-cta-btn" to="/register">
              Create Account <ArrowRight size={18} style={{ marginLeft: '6px' }} />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
