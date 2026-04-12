import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  Briefcase,
  BrainCircuit,
  ChevronRight,
  GraduationCap,
  MessageCircle,
  Search,
  Sparkles,
  Target,
  Users,
  X,
} from 'lucide-react';
import DataStatePanel from '../components/DataStatePanel';
import { generateMentorBrief, loadMentors } from '../lib/mentorSystem';
import { getStoredUser } from '../lib/session';

const getInitials = (name = '') =>
  name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const MentorsWorkspace = () => {
  const navigate = useNavigate();
  const currentUser = useMemo(() => getStoredUser(), []);
  const role = String(currentUser?.role || '').toLowerCase();
  const [filters, setFilters] = useState({
    search: '',
    subject: '',
    skill: '',
    minExperience: '',
  });
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefData, setBriefData] = useState(null);
  const mentorMix = useMemo(() => ({
    total: mentors.length,
    faculty: mentors.filter((mentor) => mentor.role === 'faculty').length,
    graduate: mentors.filter((mentor) => mentor.role === 'graduate').length,
  }), [mentors]);

  const loadDirectory = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const items = await loadMentors(filters);
      setMentors(items);
    } catch (err) {
      setError(err.message || 'Failed to load mentors');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  const openMentorDrawer = async (mentor) => {
    setSelectedMentor(mentor);
    setBriefData(null);
  };

  const fetchBrief = async (mentorId) => {
    setBriefLoading(true);
    try {
      const response = await generateMentorBrief(mentorId);
      setBriefData(response);
    } catch (err) {
      setError(err.message || 'Failed to generate AI mentor brief');
    } finally {
      setBriefLoading(false);
    }
  };

  if (role !== 'student') {
    return (
      <div className="premium-grid-base">
        <section className="premium-card flex-column gap-16" style={{ gridColumn: 'span 12' }}>
          <div className="flex-row gap-8" style={{ color: 'var(--warm-accent)' }}>
            <Users size={16} />
            <span className="premium-text-meta" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Mentor Directory
            </span>
          </div>
          <h1 className="premium-text-hero">Your public mentor profile is what students see here.</h1>
          <p className="premium-text-body subdued">
            Open the chat center to answer students, save session notes, and manage follow-up tasks from active mentorship threads.
          </p>
          <div className="flex-row gap-12">
            <button className="premium-button" onClick={() => navigate('/messages')}>Open Mentor Chats</button>
            <button className="premium-button-secondary" onClick={() => navigate('/complete-profile')}>Update Mentor Profile</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="premium-grid-base mw-container">
      <div className="flex-row items-center gap-12 mw-header">
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(46, 230, 166, 0.1)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
          <Users size={20} />
        </div>
        <h1 className="premium-text-h1" style={{ margin: 0, fontSize: '32px', fontWeight: 800 }}>Mentors</h1>
      </div>

        <div className="flex-column gap-24 mw-filters-section">
          <div className="flex-row gap-16 items-center" style={{ background: 'var(--surface-elevated)', padding: '16px 24px', borderRadius: '20px', border: '1px solid var(--border-subtle)' }}>
            <Search size={20} color="var(--accent)" />
            <input
              type="text"
              placeholder="Search by name, bio, subject, skill, company..."
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: '16px' }}
            />
          </div>
          <div className="premium-grid-base mw-filter-grid" style={{ padding: 0, gap: '24px' }}>
            <div className="flex-column gap-10" style={{ gridColumn: 'span 4' }}>
              <label className="premium-text-meta" style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Subject</label>
              <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '14px 18px' }}>
                <input
                  type="text"
                  value={filters.subject}
                  onChange={(event) => setFilters((prev) => ({ ...prev, subject: event.target.value }))}
                  placeholder="DBMS, AI, Networks"
                  style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: '15px' }}
                />
              </div>
            </div>
            <div className="flex-column gap-10" style={{ gridColumn: 'span 4' }}>
              <label className="premium-text-meta" style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Skill / Goal</label>
              <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '14px 18px' }}>
                <input
                  type="text"
                  value={filters.skill}
                  onChange={(event) => setFilters((prev) => ({ ...prev, skill: event.target.value }))}
                  placeholder="Placements, React, research"
                  style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: '15px' }}
                />
              </div>
            </div>
            <div className="flex-column gap-10" style={{ gridColumn: 'span 4' }}>
              <label className="premium-text-meta" style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Min. Experience (Yrs)</label>
              <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '14px 18px' }}>
                <input
                  type="number"
                  min="0"
                  value={filters.minExperience}
                  onChange={(event) => setFilters((prev) => ({ ...prev, minExperience: event.target.value }))}
                  placeholder="0"
                  style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: '15px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {(loading || error) && (
          <div style={{ gridColumn: 'span 12' }}>
            <DataStatePanel
              loading={loading}
              error={error}
              empty={false}
              onRetry={loadDirectory}
              loadingLabel="Calculating mentor matches..."
            />
          </div>
        )}

        {!loading && !error && mentors.length === 0 && (
          <div style={{ gridColumn: 'span 12' }}>
            <DataStatePanel
              loading={false}
              error=""
              empty
              onRetry={loadDirectory}
              emptyTitle="No mentors match the current filters."
              emptyBody="Try broadening the subject, skill, or experience filters."
            />
          </div>
        )}

        {!loading && !error && mentors.map((mentor) => (
            className="premium-card flex-column gap-20 mw-mentor-card"
            style={{
              gridColumn: 'span 4',
              minHeight: '100%',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(16, 185, 129, 0.1)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
              padding: '24px',
              borderRadius: '24px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div className="flex-row justify-between items-start">
              <div className="flex-row gap-16 items-center">
               <div style={{ width: 56, height: 56, borderRadius: '16px', overflow: 'hidden', background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', display: 'grid', placeItems: 'center', fontWeight: 800 }}>
                  {mentor.profilePic ? (
                    <img src={mentor.profilePic} alt={mentor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '18px', color: 'var(--accent)' }}>{getInitials(mentor.name)}</span>
                  )}
                </div>
                <div className="flex-column gap-2">
                  <h3 
                    className="premium-text-h3" 
                    style={{ margin: 0, fontSize: '16px', cursor: 'pointer', transition: 'color 0.2s ease' }} 
                    onClick={() => setSelectedMentor(mentor)}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-main)'}
                  >
                    {mentor.name}
                  </h3>
                  <span className="premium-text-meta" style={{ textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em', color: 'var(--primary)' }}>{mentor.role}</span>
                </div>
              </div>
              <div className="flex-row items-center gap-6">
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />
                <span className="premium-text-meta" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Verified</span>
              </div>
            </div>

            <div className="flex-column gap-12" style={{ background: 'rgba(16, 185, 129, 0.03)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.08)' }}>
              <div className="flex-row justify-between items-center">
                <div className="flex-column gap-1">
                  <span className="premium-text-meta" style={{ fontSize: '10px', opacity: 0.6 }}>Mentor Match Score</span>
                  <strong style={{ fontSize: '20px', color: 'var(--primary)' }}>{mentor.matchScore || 72}%</strong>
                </div>
                <Target size={16} color="var(--primary)" />
              </div>
              <div className="flex-column gap-4">
                {(mentor.matchReasons || []).slice(0, 2).map((reason) => (
                  <div key={reason} className="flex-row gap-8 items-center">
                    <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--primary)', opacity: 0.5 }} />
                    <span className="premium-text-meta" style={{ fontSize: '11px', opacity: 0.7 }}>{reason}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="premium-text-body" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5, minHeight: '40px' }}>
              {mentor.bio || 'Available for student mentorship and long-form guidance.'}
            </p>

            <div className="flex-row flex-wrap gap-8">
              {(mentor.subjects || mentor.skills || []).slice(0, 3).map((item) => (
                <span key={item} className="premium-chip-outline" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>{item}</span>
              ))}
              {mentor.experience ? <span className="premium-chip-outline" style={{ fontSize: '10px', color: 'var(--primary)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>{mentor.experience}Y Exp</span> : null}
            </div>

            <div className="flex-column gap-10 mt-auto pt-16" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex-row gap-8">
              <div className="flex-row gap-8">
                <button className="premium-button-secondary" style={{ flex: 1, height: '42px', padding: '0 12px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => openMentorDrawer(mentor)}>
                  <BrainCircuit size={16} />
                  <span>AI Fit Check</span>
                </button>
                <button className="premium-button" style={{ flex: 1, height: '42px', padding: '0 12px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => navigate(`/messages?user=${mentor.id}&compose=request`)}>
                  <span>Request</span>
                </button>
              </div>
              </div>
            </div>
          </article>
        ))}

      {selectedMentor ? (
        <>
          <div className="profile-panel-backdrop" style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', zIndex: 1000 }} onClick={() => setSelectedMentor(null)} />
          <aside className="profile-panel mw-mentor-drawer" style={{             position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(860px, 94vw)', 
            maxWidth: '860px', 
            maxHeight: '90vh',
            overflowY: 'auto', 
            background: 'var(--surface)', 
            border: '1px solid var(--border-strong)',
            borderRadius: '32px',
            zIndex: 1001,
            boxShadow: '0 30px 90px rgba(0,0,0,0.6)',
            display: 'block'
          }}>
            <div className="flex-column mw-drawer-content">
              <div className="flex-row mw-drawer-header">
                <div className="flex-row mw-drawer-mentor-info">
                    <div style={{ width: 80, height: 80, borderRadius: '24px', overflow: 'hidden', background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '24px' }}>
                    {selectedMentor.profilePic ? (
                      <img src={selectedMentor.profilePic} alt={selectedMentor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: 'var(--accent)' }}>{getInitials(selectedMentor.name)}</span>
                    )}
                  </div>
                  <div className="flex-column gap-4">
                    <div className="flex-row gap-8 items-center" style={{ color: 'var(--accent)' }}>
                      <Sparkles size={16} />
                      <span className="premium-text-meta" style={{ letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '11px', fontWeight: 800 }}>Mentor Intelligence</span>
                    </div>
                    <h2 className="premium-text-h2" style={{ margin: 0, fontSize: '28px' }}>{selectedMentor.name}</h2>
                    <p className="premium-text-meta" style={{ fontSize: '14px', opacity: 0.6 }}>{selectedMentor.bio || 'Mentor profile ready for guided support.'}</p>
                  </div>
                </div>
                <button className="premium-button-secondary" style={{ background: 'var(--surface-elevated)', width: '40px', height: '40px', padding: 0, display: 'grid', placeItems: 'center', borderRadius: '12px' }} onClick={() => setSelectedMentor(null)}>
                  <X size={20} color="var(--muted)" />
                </button>
              </div>

              <div className="premium-grid-base mw-drawer-stats-grid" style={{ padding: 0, gap: '24px' }}>
                <section className="premium-card flex-column gap-16" style={{ gridColumn: 'span 4', background: 'rgba(46, 230, 166, 0.03)', border: '1px solid rgba(46, 230, 166, 0.15)', padding: '24px' }}>
                  <div className="flex-row justify-between items-center">
                    <span className="premium-text-meta" style={{ fontSize: '12px', opacity: 0.7 }}>Match Score</span>
                    <Target size={18} color="var(--accent)" />
                  </div>
                  <h3 style={{ fontSize: '42px', margin: 0, color: 'var(--accent)', fontWeight: 800 }}>{selectedMentor.matchScore || 72}%</h3>
                  <div className="flex-column gap-8 mt-4">
                    {(selectedMentor.matchReasons || []).map((reason) => (
                      <div key={reason} className="flex-row gap-8 items-center">
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)' }} />
                        <span className="premium-text-meta" style={{ fontSize: '12px', opacity: 0.8 }}>{reason}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="premium-card flex-column gap-20" style={{ gridColumn: 'span 8', background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', padding: '24px' }}>
                   <div className="flex-row gap-8 items-center" style={{ color: 'var(--accent)' }}>
                    <BrainCircuit size={18} />
                    <strong style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Fitting Strategy</strong>
                  </div>
                  
                  {briefData?.brief ? (
                    <div className="flex-column gap-16">
                      <p className="premium-text-body" style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgba(255,255,255,0.8)', margin: 0 }}>{briefData.brief.fitSummary}</p>
                      <div className="flex-row gap-12 flex-wrap">
                        {(briefData.brief.talkingPoints || []).map((point, idx) => (
                          <div key={idx} className="premium-chip" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {point}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-column gap-12">
                      <p className="premium-text-meta" style={{ fontSize: '13px', opacity: 0.5 }}>Generate a tailored brief explaining why this mentor fits you and how to start the conversation well.</p>
                      <button 
                        className="premium-button-secondary" 
                        style={{ alignSelf: 'flex-start', height: '36px', padding: '0 16px', fontSize: '13px', background: 'rgba(46, 230, 166, 0.1)', color: 'var(--accent)', border: 'none' }} 
                        onClick={() => fetchBrief(selectedMentor.id)} 
                        disabled={briefLoading}
                      >
                        {briefLoading ? 'Analyzing Profile...' : 'Generate AI Brief'}
                      </button>
                    </div>
                  )}
                </section>

                <section className="premium-card flex-column gap-24" style={{ gridColumn: 'span 12', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-subtle)', padding: '32px' }}>
                  <div className="premium-grid-base mw-drawer-details-grid" style={{ padding: 0, gap: '32px' }}>
                    <div className="flex-column gap-20" style={{ gridColumn: 'span 6' }}>
                      <div className="flex-column gap-8">
                        <div className="flex-row gap-8 items-center" style={{ color: 'var(--primary)' }}>
                          <GraduationCap size={18} />
                          <h4 style={{ margin: 0, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Education & Background</h4>
                        </div>
                        <div className="flex-column gap-12" style={{ padding: '4px 0 0 26px' }}>
                          {selectedMentor.college && (
                            <div className="flex-column gap-2">
                              <span className="premium-text-meta" style={{ fontSize: '11px', opacity: 0.5 }}>Institution</span>
                              <span className="premium-text-body" style={{ fontSize: '15px', color: 'var(--text-main)' }}>{selectedMentor.college}</span>
                            </div>
                          )}
                          {selectedMentor.graduationYear && (
                            <div className="flex-column gap-2">
                              <span className="premium-text-meta" style={{ fontSize: '11px', opacity: 0.5 }}>Graduation Year</span>
                              <span className="premium-text-body" style={{ fontSize: '15px', color: 'var(--text-main)' }}>{selectedMentor.graduationYear}</span>
                            </div>
                          )}
                          {selectedMentor.experience > 0 && (
                            <div className="flex-column gap-2">
                              <span className="premium-text-meta" style={{ fontSize: '11px', opacity: 0.5 }}>Experience</span>
                              <span className="premium-text-body" style={{ fontSize: '15px', color: 'var(--text-main)' }}>{selectedMentor.experience} Years in specialized field</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedMentor.role === 'graduate' && (selectedMentor.currentJob || selectedMentor.company) && (
                        <div className="flex-column gap-8">
                          <div className="flex-row gap-8 items-center" style={{ color: 'var(--primary)' }}>
                            <Briefcase size={18} />
                            <h4 style={{ margin: 0, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Current Experience</h4>
                          </div>
                          <div className="flex-column gap-12" style={{ padding: '4px 0 0 26px' }}>
                            <div className="flex-column gap-2">
                              <span className="premium-text-body" style={{ fontSize: '15px', color: 'var(--text-main)', fontWeight: 600 }}>
                                {selectedMentor.currentJob || 'Industry Professional'}
                              </span>
                              <span className="premium-text-meta" style={{ fontSize: '13px' }}>
                                at {selectedMentor.company || 'Private Corporation'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedMentor.researchAreas && selectedMentor.researchAreas.length > 0 && (
                        <div className="flex-column gap-8">
                          <div className="flex-row gap-8 items-center" style={{ color: 'var(--primary)' }}>
                            <Sparkles size={18} />
                            <h4 style={{ margin: 0, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Research Focus</h4>
                          </div>
                          <div className="flex-row flex-wrap gap-8" style={{ padding: '4px 0 0 26px' }}>
                            {selectedMentor.researchAreas.map(area => (
                              <span key={area} className="premium-chip-outline" style={{ fontSize: '11px', borderColor: 'rgba(46, 230, 166, 0.2)', color: 'var(--accent)' }}>{area}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex-column gap-20" style={{ gridColumn: 'span 6' }}>
                      <div className="flex-column gap-8">
                        <div className="flex-row gap-8 items-center" style={{ color: 'var(--primary)' }}>
                          <Users size={18} />
                          <h4 style={{ margin: 0, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Expertise & Skills</h4>
                        </div>
                        <div className="flex-column gap-16" style={{ padding: '4px 0 0 26px' }}>
                          <div className="flex-column gap-8">
                            <span className="premium-text-meta" style={{ fontSize: '11px', opacity: 0.5 }}>Core Subjects</span>
                            <div className="flex-row flex-wrap gap-8">
                              {(selectedMentor.subjects || []).map(subject => (
                                <span key={subject} className="premium-chip" style={{ fontSize: '11px' }}>{subject}</span>
                              ))}
                            </div>
                          </div>
                          <div className="flex-column gap-8">
                            <span className="premium-text-meta" style={{ fontSize: '11px', opacity: 0.5 }}>Technical Skills</span>
                            <div className="flex-row flex-wrap gap-8">
                              {(selectedMentor.skills || []).map(skill => (
                                <span key={skill} className="premium-chip-outline" style={{ fontSize: '11px' }}>{skill}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {selectedMentor.goals && (
                        <div className="flex-column gap-8">
                          <div className="flex-row gap-8 items-center" style={{ color: 'var(--primary)' }}>
                            <Target size={18} />
                            <h4 style={{ margin: 0, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mentorship Approach</h4>
                          </div>
                          <div style={{ padding: '4px 0 0 26px' }}>
                            <p className="premium-text-body" style={{ fontSize: '14px', fontStyle: 'italic', opacity: 0.8, margin: 0, lineHeight: 1.5 }}>
                              "{selectedMentor.goals}"
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedMentor.cvUrl && (
                    <div className="flex-row justify-between items-center mt-8" style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                      <div className="flex-row gap-12">
                         <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'grid', placeItems: 'center' }}>
                            <BadgeCheck size={20} color="var(--primary)" />
                         </div>
                         <div className="flex-column gap-1">
                            <span className="premium-text-body" style={{ fontSize: '14px', fontWeight: 600 }}>Professional Portfolio Attached</span>
                            <span className="premium-text-meta" style={{ fontSize: '12px' }}>Resume / CV is available for review</span>
                         </div>
                      </div>
                      <a href={selectedMentor.cvUrl} target="_blank" rel="noopener noreferrer" className="premium-button-secondary" style={{ height: '40px', padding: '0 20px' }}>
                        View CV
                      </a>
                    </div>
                  )}
                </section>
              </div>

              <section className="premium-card flex-column gap-16" style={{ background: 'linear-gradient(135deg, rgba(46, 230, 166, 0.08) 0%, rgba(0,0,0,0) 100%)', border: '1px solid rgba(46, 230, 166, 0.2)', padding: '24px' }}>
                <div className="flex-row gap-10 items-center">
                  <MessageCircle size={18} color="var(--accent)" />
                  <strong style={{ fontSize: '15px' }}>Start your mentorship journey</strong>
                </div>
                <p className="premium-text-meta" style={{ fontSize: '13px', lineHeight: 1.5, opacity: 0.7 }}>
                  Ready to connect with {selectedMentor.name.split(' ')[0]}? Click below to send a structured mentorship request.
                </p>
                <button 
                   className="premium-button" 
                   style={{ height: '52px', borderRadius: '16px', fontSize: '15px', fontWeight: 700 }} 
                   onClick={() => navigate(`/messages?user=${selectedMentor.id}&compose=request`)}
                >
                  Send Mentorship Request
                </button>
              </section>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
};

export default MentorsWorkspace;
