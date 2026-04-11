import { useState, useMemo } from 'react';
import { Target, Timer, Flame, TrendingUp, ChevronLeft, Star, FileText, Zap, PlayCircle, ExternalLink } from 'lucide-react';

const OneDayBatsmanMode = ({ resources, onClose, onResourceClick }) => {
  const [activePlan, setActivePlan] = useState(null);
  const [subject, setSubject] = useState('');
  const [hours, setHours] = useState(3);

  const availableSubjects = useMemo(() => {
    const courses = resources.map((r) => String(r.course || '').trim()).filter(Boolean);
    return Array.from(new Set(courses)).sort();
  }, [resources]);

  const handleGenerate = () => {
    if (!subject) return;

    const filtered = resources.filter((r) => r.course === subject);

    // Filter and prioritize
    const pyqs = filtered
      .filter((r) => r.type === 'PYQ' || r.title.toLowerCase().includes('pyq'))
      .sort((a, b) => (b.downloads || 0) - (a.downloads || 0));

    const notes = filtered
      .filter((r) => r.type === 'Notes' || r.type === 'PDF' || r.type === 'Handwritten Notes')
      .sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0));

    const quickRevs = filtered
      .filter((r) => (r.tags || []).includes('summary') || r.type === 'PPT' || r.type === 'Cheat Sheet')
      .sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0));

    // Inject static high-quality demo resources to ensure a rich UI experience
    const demoResources = [
      {
        id: `demo-pyq-${Date.now()}`,
        title: `${subject} - Premium 10-Year PYQ Solutions`,
        course: subject,
        type: 'PYQ',
        ratingAverage: 4.9,
        downloads: 3420,
        fileUrl: subject.toLowerCase().includes('operating') || subject.toLowerCase().includes('os') ? '/os-premium-pyq.html' : 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
      },
      {
        id: `demo-rev-${Date.now()}`,
        title: `${subject} - Last Minute Cheat Sheet (AI Generated)`,
        course: subject,
        type: 'Cheat Sheet',
        ratingAverage: 4.8,
        fileUrl: subject.toLowerCase().includes('operating') || subject.toLowerCase().includes('os') ? '/os-cheat-sheet.html' : 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
      }
    ];

    const finalPyqs = [...pyqs, demoResources[0]];
    const finalNotes = [...notes];
    const finalQuickRevs = [...quickRevs, demoResources[1]];

    const fillEmpty = [demoResources[0], demoResources[1]];

    const demoStaticQuestions = subject.toLowerCase().includes('operating') || subject.toLowerCase().includes('os') ? [
      "What is a deadlock? Explain the necessary conditions for deadlock occurrence. (10M)",
      "Explain the concept of paging hardware with the help of a neat diagram. (10M)",
      "Define Semaphores. How can semaphores be used to solve the Producer-Consumer problem? (5M)",
      "Calculate the average waiting time and turnaround time using Round Robin (Time Quantum = 2ms). (5M)"
    ] : [
      `What are the core fundamentals and primary objectives of ${subject}?`,
      `Explain the most repeated previous year derivation/algorithm for ${subject}.`,
      `Differentiate between the two most commonly confused concepts in Unit 2.`,
      `Short notes on the most high-probability expected topic.`
    ];

    const demoVideoPlaylists = subject.toLowerCase().includes('operating') || subject.toLowerCase().includes('os') ? [
      {
        title: "Operating System Complete Playlist",
        channel: "Gate Smashers",
        url: "https://www.youtube.com/playlist?list=PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p",
        label: "Best for Numericals",
        thumbnail: "https://images.unsplash.com/photo-1610484826967-09c5720778c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
        count: "94 Videos"
      },
      {
        title: "Operating Systems Playlist",
        channel: "Jenny's Lectures",
        url: "https://www.youtube.com/playlist?list=PLdo5W4Nhv31a5ucW_S1K3-x6ztBRD-PNa",
        label: "Best for Theory",
        thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
        count: "68 Videos"
      },
      {
        title: "Operating System Playlist",
        channel: "Neso Academy",
        url: "https://www.youtube.com/playlist?list=PLBlnK6fEyqRiVhbXDGLXDk_OQAeuVcp2O",
        label: "Best for Quick Revision",
        thumbnail: "https://images.unsplash.com/photo-1516116216624-53e6973b54e1?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
        count: "105 Videos"
      }
    ] : null;

    const blocks = [];
    if (hours === 1) {
      blocks.push({
        id: 'hs1',
        title: 'High-Impact Turbo Hour: PYQs & Core Concepts',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        color: '#EF4444',
        items: [...finalPyqs.slice(0, 2), ...finalQuickRevs.slice(0, 2)].filter(Boolean).concat(finalPyqs.length === 0 ? fillEmpty : []),
        videoPlaylists: demoVideoPlaylists,
        staticQuestions: demoStaticQuestions
      });
    } else if (hours === 3) {
      blocks.push({
        id: 'h1',
        title: 'Hour 1: Foundation & High Weightage Theory',
        bgColor: 'rgba(59, 130, 246, 0.1)',
        color: '#3B82F6',
        items: (finalNotes.length > 0 ? finalNotes : fillEmpty).slice(0, 3),
      });
      blocks.push({
        id: 'h2',
        title: 'Hour 2: Repeated PYQs & Problem Solving',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        color: '#EF4444',
        items: (finalPyqs.length > 0 ? finalPyqs : finalNotes).slice(0, 4),
        videoPlaylists: demoVideoPlaylists,
        staticQuestions: demoStaticQuestions
      });
      blocks.push({
        id: 'h3',
        title: 'Hour 3: Final Scan & Quick Summaries',
        bgColor: 'rgba(16, 185, 129, 0.1)',
        color: '#10B981',
        items: (finalQuickRevs.length > 0 ? finalQuickRevs : fillEmpty).slice(0, 3),
      });
    } else {
      blocks.push({
        id: 'f1',
        title: 'Hour 1-2: Deep Dive into Core Modules',
        bgColor: 'rgba(59, 130, 246, 0.1)',
        color: '#3B82F6',
        items: finalNotes.slice(0, 4),
      });
      blocks.push({
        id: 'f2',
        title: 'Hour 3-4: 5-Year PYQ Marathon',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        color: '#EF4444',
        items: finalPyqs.slice(0, 5),
        videoPlaylists: demoVideoPlaylists,
        staticQuestions: demoStaticQuestions
      });
      blocks.push({
        id: 'f3',
        title: 'Hour 5: Quick Notes & Expected Questions',
        bgColor: 'rgba(217, 119, 6, 0.1)',
        color: '#F59E0B',
        items: finalQuickRevs.slice(0, 4),
      });
    }

    setActivePlan({ subject, hours, blocks });
  };

  const ResourceItem = ({ item }) => (
    <div
      className="premium-card flex-row items-center gap-16"
      style={{
        padding: '16px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onClick={() => onResourceClick?.(item)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = 'var(--accent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: 'rgba(46, 230, 166, 0.1)',
          color: 'var(--accent)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <FileText size={18} />
      </div>
      <div className="flex-column gap-4" style={{ flex: 1 }}>
        <h4 className="premium-text-meta" style={{ margin: 0, fontWeight: 700, color: 'var(--text)' }}>
          {item.title}
        </h4>
        <div className="flex-row gap-8 items-center">
          <span className="premium-chip" style={{ fontSize: '9px', padding: '2px 6px' }}>{item.type}</span>
          {item.ratingAverage > 0 && (
            <div className="flex-row gap-4 items-center">
              <Star size={10} fill="var(--gold)" color="var(--gold)" />
              <span style={{ fontSize: '11px', color: 'var(--text)' }}>{Number(item.ratingAverage).toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const VideoPlaylistCard = ({ playlist }) => (
    <div
      className="premium-card flex-row items-stretch gap-16"
      style={{
        padding: '12px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex'
      }}
      onClick={() => window.open(playlist.url, '_blank')}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 10px 25px rgba(239, 68, 68, 0.15)';
        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
      }}
    >
      <div style={{ position: 'relative', width: '120px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#000' }}>
        <img src={playlist.thumbnail} alt={playlist.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#EF4444', background: '#fff', borderRadius: '50%', padding: '2px', display: 'grid', placeItems: 'center' }}>
          <PlayCircle size={24} strokeWidth={2} />
        </div>
      </div>
      <div className="flex-column justify-center gap-6" style={{ flex: 1 }}>
        <div className="flex-row justify-between items-start">
          <h4 className="premium-text-h3" style={{ margin: 0, fontSize: '15px' }}>{playlist.title}</h4>
          <ExternalLink size={14} color="var(--muted)" style={{ marginTop: '2px' }} />
        </div>
        <span className="premium-text-meta" style={{ color: 'var(--muted)' }}>{playlist.channel} • {playlist.count}</span>
        <div style={{ marginTop: '4px' }}>
          <span className="premium-chip" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', fontSize: '10px', padding: '4px 8px' }}>
            {playlist.label}
          </span>
        </div>
      </div>
    </div>
  );

  if (!activePlan) {
    return (
      <div className="premium-card fade-in" style={{ padding: '60px', maxWidth: '720px', margin: '0 auto', textAlign: 'center', background: 'linear-gradient(180deg, rgba(14,22,36,0.95) 0%, rgba(10,17,29,0.98) 100%)', border: '1px solid rgba(46,230,166,0.2)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 20, left: 20, background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ChevronLeft size={16} /> Back
        </button>

        <div style={{ width: 80, height: 80, background: 'rgba(239, 68, 68, 0.1)', borderRadius: '24px', display: 'grid', placeItems: 'center', margin: '0 auto 24px', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
          <Flame size={40} />
        </div>
        
        <h1 className="premium-text-hero" style={{ fontSize: '32px', marginBottom: '12px' }}>One Day Batsman Mode <span style={{ fontSize: '28px' }}>🏏</span></h1>
        <p className="premium-text-body subdued" style={{ marginBottom: '48px', fontSize: '18px' }}>
          Exam tomorrow? Don't panic. Configure your parameters below and let our engine generate a hyper-optimized crash course from the best available materials.
        </p>

        <div className="flex-column gap-24 items-start text-left" style={{ background: 'rgba(255,255,255,0.02)', padding: '32px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex-column gap-8" style={{ width: '100%' }}>
            <label className="premium-text-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={14} color="var(--accent)" /> Target Subject
            </label>
            <select className="premium-select" style={{ fontSize: '16px', padding: '16px' }} value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="" disabled>Select the subject you are preparing for...</option>
              {availableSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex-column gap-8" style={{ width: '100%' }}>
            <label className="premium-text-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Timer size={14} color="var(--accent)" /> Available Prep Time
            </label>
            <div className="flex-row gap-12 flex-wrap">
              {[1, 3, 5].map((h) => (
                <button
                  key={h}
                  onClick={() => setHours(h)}
                  style={{
                    flex: 1, padding: '16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '16px',
                    background: hours === h ? 'rgba(46, 230, 166, 0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${hours === h ? 'var(--accent)' : 'rgba(255,255,255,0.08)'}`,
                    color: hours === h ? 'var(--accent)' : 'var(--muted)',
                    transition: 'all 0.2s',
                  }}
                >
                  {h} Hour{h > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>

          <button 
            className="premium-button" 
            style={{ width: '100%', padding: '20px', fontSize: '18px', marginTop: '16px', justifyContent: 'center' }}
            disabled={!subject}
            onClick={handleGenerate}
          >
            <Zap size={20} /> Generate Winning Plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in flex-column gap-32" style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      <header className="flex-row justify-between items-end">
        <div className="flex-column gap-8">
          <button onClick={() => setActivePlan(null)} className="premium-button-secondary" style={{ padding: '6px 14px', fontSize: '12px', width: 'fit-content' }}>
            <ChevronLeft size={14} /> Reconfigure
          </button>
          <div className="flex-row gap-12 items-center mt-4">
            <h1 className="premium-text-h2" style={{ margin: 0 }}>{activePlan.subject} Action Plan</h1>
            <span className="premium-chip" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              🏏 Batsman Mode Active
            </span>
          </div>
          <span className="premium-text-meta">{activePlan.hours} Hours Remaining • High Yield Focus</span>
        </div>
        <button onClick={onClose} className="premium-button-secondary" style={{ padding: 12 }}>
          Exit Mode
        </button>
      </header>

      {/* Progress tracking indicator */}
      <div className="premium-card flex-row gap-4" style={{ padding: '24px', background: 'var(--surface-dark)' }}>
        {activePlan.blocks.map((block, idx) => (
          <div key={block.id} style={{ flex: 1, height: 6, borderRadius: 3, background: idx === 0 ? 'var(--accent)' : 'rgba(255,255,255,0.1)' }} />
        ))}
      </div>

      {activePlan.blocks.map((block) => (
        <section key={block.id} className="premium-card" style={{ padding: '32px', borderLeft: `4px solid ${block.color}`, background: 'rgba(255,255,255,0.01)' }}>
          <div className="flex-row items-center gap-12 mb-20">
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: block.bgColor, color: block.color, display: 'grid', placeItems: 'center' }}>
              <TrendingUp size={18} />
            </div>
            <h3 className="premium-text-h3" style={{ margin: 0, color: 'var(--text)' }}>
              {block.title}
            </h3>
          </div>
          {block.items.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {block.items.map((item, i) => (
                <ResourceItem key={i} item={item} />
              ))}
            </div>
          ) : (
            <div className="premium-text-meta" style={{ padding: '20px', textAlign: 'center', opacity: 0.5, marginBottom: '24px' }}>
              No critical resources found for this segment.
            </div>
          )}

          {block.videoPlaylists && (
            <div className="flex-column gap-16 mb-24" style={{ marginBottom: '24px' }}>
              <div className="flex-row gap-8 items-center">
                <PlayCircle size={16} color="#EF4444" />
                <span className="premium-text-meta" style={{ fontWeight: 700, color: '#f8fafc', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Top 3 Trusted Video Playlists
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                {block.videoPlaylists.map((pl, idx) => (
                  <VideoPlaylistCard key={idx} playlist={pl} />
                ))}
              </div>
            </div>
          )}
          
          {block.staticQuestions && (
            <div className="flex-column gap-12" style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.03)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)', marginBottom: '8px' }}>
              <div className="flex-row gap-8 items-center" style={{ color: '#EF4444' }}>
                <Target size={16} />
                <span className="premium-text-meta" style={{ fontWeight: 700, fontSize: '13px' }}>Most Expected Questions (AI Predicted)</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {block.staticQuestions.map((q, idx) => (
                  <li key={idx} className="premium-text-body" style={{ fontSize: '14px', lineHeight: 1.5, opacity: 0.9 }}>{q}</li>
                ))}
              </ul>
            </div>
          )}

        </section>
      ))}

      <div className="premium-card text-center" style={{ padding: '40px', borderColor: 'rgba(46,230,166,0.2)', background: 'linear-gradient(0deg, rgba(46,230,166,0.05) 0%, transparent 100%)' }}>
        <h4 className="premium-text-h3">Ready to deploy?</h4>
        <p className="premium-text-meta" style={{ marginBottom: '24px' }}>Stick to the timeline and prioritize understanding core concepts.</p>
        <button onClick={onClose} className="premium-button" style={{ margin: '0 auto', fontSize: '15px', padding: '14px 32px' }}>Acknowledge & Begin</button>
      </div>

    </div>
  );
};

export default OneDayBatsmanMode;
