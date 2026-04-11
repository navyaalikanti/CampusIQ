import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award, BookOpen, Brain, FileText, Flame, FolderOpen,
  MessageSquareText, MessageCircle, Save, Star, Trophy, Upload, Users, Zap, TrendingUp, ChevronRight, Activity, Target, ShieldCheck, Bot,
  GraduationCap, Briefcase, UserRoundCheck
} from 'lucide-react';
import api from '../lib/api';
import { getStoredUser } from '../lib/session';
import { getMentorProfile, normalizeTags, saveMentorProfile } from '../lib/mentorSystem';

export const SkillHexagon = ({ skills }) => {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const r = 90;
  const sides = skills.length || 6;
  
  const points = skills.map((s, i) => {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    const factor = (s.pct / 100) * r;
    return {
      x: cx + factor * Math.cos(angle),
      y: cy + factor * Math.sin(angle)
    };
  });

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ filter: 'drop-shadow(0 0 10px var(--accent))', overflow: 'visible' }}>
      <defs>
        <linearGradient id="hexGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      {[0.2, 0.4, 0.6, 0.8, 1].map(scale => (
        <polygon
          key={scale}
          points={Array.from({ length: sides }).map((_, i) => {
            const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
            return `${cx + scale * r * Math.cos(angle)},${cy + scale * r * Math.sin(angle)}`;
          }).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1"
        />
      ))}
      <path d={path} fill="url(#hexGrad)" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
      {skills.map((s, i) => {
        const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
        const tx = cx + (r + 20) * Math.cos(angle);
        const ty = cy + (r + 20) * Math.sin(angle);
        return (
          <text key={i} x={tx} y={ty} textAnchor="middle" fill="var(--muted)" fontSize="10" fontWeight="bold" style={{ textTransform: 'uppercase' }}>
            {s.label}
          </text>
        );
      })}
    </svg>
  );
};

export const Heatmap = ({ activityDates }) => {
  const weeks = 24;
  const days = 7;
  const cells = [];
  const now = new Date();
  
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < days; d++) {
      const date = new Date(now);
      date.setDate(now.getDate() - ((weeks - 1 - w) * 7 + (6 - d)));
      const iso = date.toISOString().slice(0, 10);
      const level = activityDates[iso] ? Math.min(activityDates[iso], 4) : 0;
      cells.push({ iso, level });
    }
  }

  return (
    <div className="flex-column gap-12">
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${weeks}, 1fr)`, gap: '4px' }}>
        {cells.map((c, i) => (
          <div key={i} title={c.iso} style={{ 
            width: '100%', aspectRatio: '1/1', borderRadius: '2px',
            background: c.level === 0 ? 'rgba(255,255,255,0.03)' : `rgba(46, 230, 166, ${0.2 * c.level + 0.2})`,
            border: c.level > 0 ? '1px solid rgba(46, 230, 166, 0.2)' : 'none'
          }} />
        ))}
      </div>
      <div className="flex-row justify-end gap-8 items-center">
        <span className="premium-text-meta" style={{ fontSize: '10px' }}>Less</span>
        {[0, 1, 2, 3, 4].map(l => <div key={l} style={{ width: 10, height: 10, borderRadius: '2px', background: l === 0 ? 'rgba(255,255,255,0.03)' : `rgba(46, 230, 166, ${0.2 * l + 0.2})` }} />)}
        <span className="premium-text-meta" style={{ fontSize: '10px' }}>More</span>
      </div>
    </div>
  );
};

export const ActivityBarChart = ({ data }) => {
  const max = Math.max(...data.map(d => d.value), 5);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '140px', width: '100%', padding: '16px 0 0' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%' }}>
          <div style={{ width: '100%', flex: 1, display: 'flex', alignItems: 'flex-end', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ 
              width: '100%', 
              height: `${(d.value / max) * 100}%`, 
              background: 'linear-gradient(to top, var(--accent-2), var(--accent))', 
              borderRadius: '4px',
              transition: 'height 1s ease-out'
            }} />
          </div>
          <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
};

export const SubjectDonutChart = ({ data }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 60;
  const circumference = 2 * Math.PI * r;
  let strokeOffset = 0;
  
  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}>
        {data.map((d, i) => {
          const dash = (d.value / total) * circumference;
          const strokeDasharray = `${dash} ${circumference}`;
          const currentOffset = strokeOffset;
          strokeOffset -= dash;
          return (
            <circle 
              key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth="16" 
              strokeDasharray={strokeDasharray} strokeDashoffset={currentOffset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray 1s ease, stroke-dashoffset 1s ease' }}
            />
          );
        })}
        <text x={cx} y={cy - 2} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="24" fontWeight="bold">
          {data.reduce((sum, d) => sum + d.value, 0)}
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle" dominantBaseline="middle" fill="var(--muted)" fontSize="10" letterSpacing="1px">
          TOTAL
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '120px' }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color }} />
            <span style={{ fontSize: '12px', color: 'var(--text)' }}>{d.label}</span>
            <strong style={{ fontSize: '13px', marginLeft: 'auto' }}>{Math.round((d.value/total)*100)}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const storedUser = useMemo(() => getStoredUser(), []);
  const [dashboard, setDashboard] = useState(null);
  const [myUploads, setMyUploads] = useState([]);
  const [savedResources, setSavedResources] = useState([]);
  const [aiSummaries, setAiSummaries] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mentor Edit State
  const [mentorForm, setMentorForm] = useState({
    college: '', experience: '', subjects: '', researchAreas: '',
    bio: '', graduationYear: '', skills: '', currentJob: '',
    company: '', goals: '', cvUrl: '', profilePicUrl: '',
  });
  const [cvFile, setCvFile] = useState(null);
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mentorError, setMentorError] = useState('');

  const isMentor = ['faculty', 'graduate'].includes(String(storedUser?.role || '').toLowerCase());
  const isFaculty = storedUser?.role === 'faculty';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dash, uploads, saved, summaries, disc] = await Promise.all([
          api.get('/dashboard/overview'),
          api.get('/resources/my-uploads'),
          api.get('/resources/saved'),
          api.get('/ai/summaries'),
          api.get('/discussions/overview'),
        ]);

        if (dash.status === 200) setDashboard(dash.data);
        if (uploads.status === 200) setMyUploads(uploads.data.resources || []);
        if (saved.status === 200) setSavedResources(saved.data.resources || []);
        if (summaries.status === 200) setAiSummaries(summaries.data.summaries || []);
        if (disc.status === 200) setDiscussions(disc.data.threads || []);

        if (isMentor) {
          const profile = await getMentorProfile();
          if (profile) {
            setMentorForm({
              college: profile.college || '',
              experience: profile.experience || '',
              subjects: (profile.subjects || []).join(', '),
              researchAreas: (profile.researchAreas || []).join(', '),
              bio: profile.bio || '',
              graduationYear: profile.graduationYear || '',
              skills: (profile.skills || []).join(', '),
              currentJob: profile.currentJob || '',
              company: profile.company || '',
              goals: profile.goals || '',
              cvUrl: profile.cvUrl || '',
              profilePicUrl: profile.profilePic || '',
            });
          }
        }
      } catch (err) {
        console.error('Failed to load profile data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isMentor]);

  const activityDates = useMemo(() => {
    const map = {};
    const add = (d) => { if (d) { const k = new Date(d).toISOString().slice(0, 10); map[k] = (map[k] || 0) + 1; } };
    myUploads.forEach(r => add(r.createdAt));
    aiSummaries.forEach(s => add(s.createdAt));
    discussions.forEach(t => add(t.createdAt));
    return map;
  }, [myUploads, aiSummaries, discussions]);

  const user = dashboard?.user || storedUser || {};
  const stats = dashboard?.stats || {};
  const score = stats.contributionScore || 0;
  
  const skills = [
    { label: 'Intelligence', pct: Math.min(100, 40 + score / 5) },
    { label: 'Contribution', pct: Math.min(100, 30 + myUploads.length * 10) },
    { label: 'Networking', pct: Math.min(100, 20 + (discussions.length || 0) * 8) },
    { label: 'Curation', pct: Math.min(100, 35 + savedResources.length * 12) },
    { label: 'AI Fluency', pct: Math.min(100, 25 + aiSummaries.length * 15) },
    { label: 'Consistency', pct: Math.min(100, Object.keys(activityDates).length * 5) }
  ];

  const barData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      result.push({
        label: days[d.getDay()],
        value: activityDates[iso] || 0
      });
    }
    return result;
  }, [activityDates]);

  const donutData = [
    { label: 'Resources', value: myUploads.length || 5, color: 'var(--accent)' },
    { label: 'Summaries', value: aiSummaries.length || 3, color: '#8B5CF6' },
    { label: 'Discussions', value: discussions.length || 4, color: 'var(--gold)' },
    { label: 'Collab', value: 2, color: '#3B82F6' }
  ];

  const handleUpdateField = (e) => {
    setMentorForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveMentorProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMentorError('');

    try {
      const commonPayload = {
        role: storedUser.role,
        bio: mentorForm.bio,
        availableForMentorship: true,
      };

      if (isFaculty) {
        await saveMentorProfile({
          ...commonPayload,
          college: mentorForm.college.trim(),
          experience: Number(mentorForm.experience || 0),
          subjects: normalizeTags(mentorForm.subjects),
          researchAreas: normalizeTags(mentorForm.researchAreas),
          profilePic: profilePicFile,
          profilePicUrl: mentorForm.profilePicUrl,
        });
      } else {
        await saveMentorProfile({
          ...commonPayload,
          graduationYear: mentorForm.graduationYear.trim(),
          skills: normalizeTags(mentorForm.skills),
          currentJob: mentorForm.currentJob.trim(),
          company: mentorForm.company.trim(),
          goals: mentorForm.goals.trim(),
          cv: cvFile,
          cvUrl: mentorForm.cvUrl,
          profilePic: profilePicFile,
          profilePicUrl: mentorForm.profilePicUrl,
        });
      }
      navigate('/dashboard');
    } catch (err) {
      setMentorError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="premium-grid-base items-center justify-center" style={{ height: '80vh' }}>
       <div className="loader-ring" />
       <p className="premium-text-meta mt-24">Syncing biometric scorecard...</p>
    </div>
  );

  // RENDER MENTOR PROFILE
  if (isMentor) {
    return (
      <section className="premium-grid-base" style={{ padding: '40px' }}>
        <header className="premium-card flex-column gap-12" style={{ gridColumn: 'span 12', padding: '32px', background: 'var(--hero-gradient)' }}>
          <div className="flex-row gap-8 items-center" style={{ color: 'var(--accent)' }}>
            <UserRoundCheck size={18} />
            <span className="premium-text-meta" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Professional Identity Manager</span>
          </div>
          <h1 className="premium-text-hero" style={{ margin: 0 }}>Update <span style={{ color: 'var(--accent)' }}>Mentor Profile</span></h1>
          <p className="premium-text-body subdued">This profile powers your discovery in the hub and student chat experience. Keep it concise and credible.</p>
        </header>

        <main className="flex-column gap-24" style={{ gridColumn: 'span 8' }}>
          <form className="premium-card flex-column gap-32" style={{ padding: '40px' }} onSubmit={handleSaveMentorProfile}>
            {mentorError && <div className="error-msg">{mentorError}</div>}
            
            <div className="grid-6-6 gap-24">
              {isFaculty ? (
                <>
                  <div className="form-row">
                    <label>College / Institution</label>
                    <input name="college" value={mentorForm.college} onChange={handleUpdateField} required />
                  </div>
                  <div className="form-row">
                    <label>Expertise Experience (Years)</label>
                    <input name="experience" type="number" value={mentorForm.experience} onChange={handleUpdateField} required />
                  </div>
                  <div className="form-row" style={{ gridColumn: 'span 2' }}>
                    <label>Subjects (Comma separated)</label>
                    <input name="subjects" value={mentorForm.subjects} onChange={handleUpdateField} placeholder="DSA, Web Tech, AI" required />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-row">
                    <label>Graduation Year</label>
                    <input name="graduationYear" value={mentorForm.graduationYear} onChange={handleUpdateField} required />
                  </div>
                  <div className="form-row">
                    <label>Current Role</label>
                    <input name="currentJob" value={mentorForm.currentJob} onChange={handleUpdateField} required />
                  </div>
                  <div className="form-row">
                    <label>Company / Organization</label>
                    <input name="company" value={mentorForm.company} onChange={handleUpdateField} required />
                  </div>
                  <div className="form-row">
                    <label>Professional Skills</label>
                    <input name="skills" value={mentorForm.skills} onChange={handleUpdateField} placeholder="React, Python, Cloud" required />
                  </div>
                </>
              )}
            </div>

            <div className="form-row">
              <label>Professional Bio</label>
              <textarea name="bio" value={mentorForm.bio} onChange={handleUpdateField} rows="4" placeholder="Briefly describe your journey and how you help students..." required />
            </div>

            {!isFaculty && (
              <div className="form-row">
                <label>Mentorship Goals</label>
                <textarea name="goals" value={mentorForm.goals} onChange={handleUpdateField} rows="2" placeholder="What do you hope to achieve as a mentor?" />
              </div>
            )}

            <div className="flex-row gap-24 items-center mt-12 pt-24" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
               <button className="premium-button" type="submit" disabled={saving} style={{ padding: '16px 32px' }}>
                  {saving ? 'Syncing...' : 'Save Profile Changes'}
                  {!saving && <Save size={18} />}
               </button>
               <button className="premium-button-secondary" type="button" onClick={() => navigate('/dashboard')} style={{ padding: '16px 24px' }}>
                  Cancel
               </button>
            </div>
          </form>
        </main>

        <aside className="flex-column gap-24" style={{ gridColumn: 'span 4' }}>
          <section className="premium-card flex-column gap-20">
            <h3 className="premium-text-h3" style={{ margin: 0 }}>Visual Identity</h3>
            <div className="flex-column gap-16 items-center py-24" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
               <div style={{ width: 120, height: 120, borderRadius: '40px', overflow: 'hidden', background: 'var(--surface-elevated)', border: '2px solid var(--accent)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                  {mentorForm.profilePicUrl ? (
                    <img src={mentorForm.profilePicUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: '40px', fontWeight: 900, color: 'var(--accent)' }}>{user.name?.[0]}</div>
                  )}
               </div>
               <div className="flex-column items-center gap-8">
                  <label className="premium-button-secondary" style={{ cursor: 'pointer', padding: '8px 16px', fontSize: '13px' }}>
                    <Upload size={14} />
                    {profilePicFile ? 'File Selected' : 'Change Photo'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setProfilePicFile(e.target.files?.[0] || null)} />
                  </label>
               </div>
            </div>
          </section>

          {!isFaculty && (
            <section className="premium-card flex-column gap-12">
               <h3 className="premium-text-h3" style={{ margin: 0 }}>Career Credentials</h3>
               <p className="premium-text-meta subdued">Upload your resume for higher student trust and verification.</p>
               <label className="premium-card flex-column items-center justify-center gap-12" style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', minHeight: '120px' }}>
                  <FileText size={24} className={cvFile || mentorForm.cvUrl ? 'text-accent' : 'subdued'} />
                  <span className="premium-text-meta">{cvFile ? cvFile.name : mentorForm.cvUrl ? 'CV Uploaded' : 'Upload PDF Resume'}</span>
                  <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={(e) => setCvFile(e.target.files?.[0] || null)} />
               </label>
            </section>
          )}

          <section className="premium-card" style={{ background: 'rgba(46, 230, 166, 0.05)', borderColor: 'rgba(46, 230, 166, 0.2)' }}>
             <div className="flex-row gap-12 items-center">
                <ShieldCheck size={20} color="var(--accent)" />
                <span className="premium-text-meta" style={{ color: 'var(--accent)', fontWeight: 700 }}>Verification Pending</span>
             </div>
             <p className="premium-text-meta mt-8">Your profile updates are live immediately. Official verification badges are assigned after 24 hours of activity.</p>
          </section>
        </aside>
      </section>
    );
  }

  // RENDER STUDENT PROFILE (ORIGINAL)
  return (
    <div className="premium-grid-base">
       {/* Identity Scorecard Header */}
       <header className="premium-card flex-row justify-between items-center" style={{ gridColumn: 'span 12', padding: '32px 48px', background: 'linear-gradient(135deg, var(--surface) 0%, var(--bg) 100%)', border: '1px solid rgba(46, 230, 166, 0.1)' }}>
          <div className="flex-row gap-32 items-center">
             <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)', display: 'grid', placeItems: 'center', fontSize: '32px', fontWeight: 'bold', color: '#000', border: '4px solid rgba(255,255,255,0.05)' }}>
                {user.name?.[0] || 'S'}
             </div>
             <div className="flex-column gap-8">
                <h1 className="premium-text-hero" style={{ fontSize: '32px', margin: 0 }}>{user.name}</h1>
                <div className="flex-row gap-12">
                   <span className="premium-chip" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted)' }}>{user.branch} • Year {user.year}</span>
                   <span className="premium-chip" style={{ background: 'rgba(46, 230, 166, 0.1)', color: 'var(--accent)' }}><Bot size={12} style={{marginRight: 4}}/> Pro Identity Verified</span>
                </div>
             </div>
          </div>
          <div className="flex-row gap-48">
             <div className="flex-column items-center">
                <span className="premium-text-meta" style={{ opacity: 0.5 }}>CONTRIBUTION</span>
                <strong className="premium-text-h1" style={{ color: 'var(--accent)', margin: 0 }}>{score}</strong>
             </div>
             <div className="flex-column items-center">
                <span className="premium-text-meta" style={{ opacity: 0.5 }}>GLOBAL RANK</span>
                <strong className="premium-text-h1" style={{ color: 'var(--gold)', margin: 0 }}>#14</strong>
             </div>
             <div className="flex-column items-center">
                <span className="premium-text-meta" style={{ opacity: 0.5 }}>STREAK</span>
                <strong className="premium-text-h1" style={{ color: 'var(--accent)', margin: 0 }}><Flame size={24} style={{display: 'inline'}}/> {Object.keys(activityDates).length}</strong>
             </div>
          </div>
       </header>

       {/* Skill Section (Left 4) */}
       <aside className="col-left flex-column gap-24" style={{ gridColumn: 'span 4' }}>
          <section className="premium-card flex-column items-center py-48">
             <h3 className="premium-text-h3 mb-32">Skill DNA</h3>
             <SkillHexagon skills={skills} />
          </section>

          <section className="premium-card flex-column gap-16">
             <h3 className="premium-text-h3" style={{ margin: 0 }}>Identity Badges</h3>
             <div className="flex-column gap-12">
                 {myUploads.length > 0 ? (
                    <span className="premium-chip" style={{ background: 'rgba(46, 230, 166, 0.1)', color: 'var(--accent)', whiteSpace: 'nowrap' }}><Star size={12}/> First Publish</span>
                 ) : (
                    <span className="premium-chip" style={{ background: 'transparent', opacity: 0.4, border: '1px dashed rgba(255,255,255,0.2)', color: 'var(--muted)', whiteSpace: 'nowrap' }}><Star size={12}/> 1st Publish Milestone</span>
                 )}
                 {myUploads.length > 4 ? (
                    <span className="premium-chip" style={{ background: 'rgba(212, 175, 55, 0.1)', color: 'var(--gold)', whiteSpace: 'nowrap' }}><Award size={12}/> Knowledge Pillar (5+)</span>
                 ) : (
                    <span className="premium-chip" style={{ background: 'transparent', opacity: 0.4, border: '1px dashed rgba(255,255,255,0.2)', color: 'var(--muted)', whiteSpace: 'nowrap' }}><Award size={12}/> Knowledge Pillar</span>
                 )}
                 {discussions.length > 9 ? (
                    <span className="premium-chip" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', whiteSpace: 'nowrap' }}><MessageCircle size={12}/> Helpful Peer (10+ Doubts)</span>
                 ) : (
                    <span className="premium-chip" style={{ background: 'transparent', opacity: 0.4, border: '1px dashed rgba(255,255,255,0.2)', color: 'var(--muted)', whiteSpace: 'nowrap' }}><MessageCircle size={12}/> Solved 10 Doubts</span>
                 )}
                 {discussions.length > 24 ? (
                    <span className="premium-chip" style={{ background: 'rgba(46, 230, 166, 0.1)', color: 'var(--accent)', whiteSpace: 'nowrap' }}><Flame size={12}/> Community Expert (25+)</span>
                 ) : (
                    <span className="premium-chip" style={{ background: 'transparent', opacity: 0.4, border: '1px dashed rgba(255,255,255,0.2)', color: 'var(--muted)', whiteSpace: 'nowrap' }}><Flame size={12}/> Solved 25 Doubts</span>
                 )}
                 {aiSummaries.length > 2 ? (
                    <span className="premium-chip" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6', whiteSpace: 'nowrap' }}><Zap size={12}/> AI Prodigy (3+)</span>
                 ) : (
                    <span className="premium-chip" style={{ background: 'transparent', opacity: 0.4, border: '1px dashed rgba(255,255,255,0.2)', color: 'var(--muted)', whiteSpace: 'nowrap' }}><Zap size={12}/> AI Prodigy (3+ Insights)</span>
                 )}
                 {Object.keys(activityDates).length > 6 ? (
                    <span className="premium-chip" style={{ background: 'rgba(46, 230, 166, 0.1)', color: 'var(--accent)', whiteSpace: 'nowrap' }}><Activity size={12}/> Consistency Pro (7 Days)</span>
                 ) : (
                    <span className="premium-chip" style={{ background: 'transparent', opacity: 0.4, border: '1px dashed rgba(255,255,255,0.2)', color: 'var(--muted)', whiteSpace: 'nowrap' }}><Activity size={12}/> 7-Day Streak</span>
                 )}
                 <span className="premium-chip-outline" style={{ whiteSpace: 'nowrap' }}>Beta Explorer</span>
              </div>
          </section>
       </aside>

       {/* Analytics Section (Right 8) */}
       <main className="col-main flex-column gap-24" style={{ gridColumn: 'span 8' }}>
          <section className="premium-card flex-column gap-24">
             <div className="flex-row justify-between items-center">
                <h3 className="premium-text-h3" style={{ margin: 0 }}>Contribution Matrix</h3>
                <span className="premium-text-meta" style={{ opacity: 0.5 }}>Last 24 Weeks</span>
             </div>
             <Heatmap activityDates={activityDates} />
          </section>

          <div className="premium-grid-base" style={{ padding: 0 }}>
             <section className="premium-card flex-column gap-16" style={{ gridColumn: 'span 6' }}>
                <h3 className="premium-text-h3" style={{ margin: 0 }}>Vault Access</h3>
                <div className="flex-column gap-12">
                   {savedResources.slice(0, 4).map(r => (
                     <div key={r.id} className="flex-row justify-between items-center premium-text-meta" style={{ cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'background 0.2s' }} onClick={() => window.open(r.fileUrl || r.url || '#', '_blank')} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        <div className="flex-row gap-8">
                           <FileText size={14} color="var(--accent)" />
                           <span style={{ color: 'var(--text)' }}>{r.title}</span>
                        </div>
                        <ChevronRight size={14} color="var(--muted)" />
                     </div>
                   ))}
                   {savedResources.length === 0 && <p className="premium-text-meta opacity-50">Empty vault</p>}
                </div>
             </section>

             <section className="premium-card flex-column gap-16" style={{ gridColumn: 'span 6' }}>
                <h3 className="premium-text-h3" style={{ margin: 0 }}>Module Pulse</h3>
                <div className="flex-column gap-12">
                   <div className="flex-row justify-between premium-text-meta">
                      <span>Resources Contributed</span>
                      <strong style={{ color: 'var(--accent)' }}>{myUploads.length}</strong>
                   </div>
                   <div className="flex-row justify-between premium-text-meta">
                      <span>AI Insights Generated</span>
                      <strong style={{ color: '#8B5CF6' }}>{aiSummaries.length}</strong>
                   </div>
                   <div className="flex-row justify-between premium-text-meta">
                      <span>Peer Interactions</span>
                      <strong style={{ color: 'var(--gold)' }}>{discussions.length}</strong>
                   </div>
                   <div className="flex-row justify-between premium-text-meta">
                      <span>Collaborations Joined</span>
                      <strong style={{ color: 'var(--accent)' }}>0</strong>
                   </div>
                </div>
             </section>
          </div>

          <div className="premium-grid-base" style={{ padding: 0 }}>
             <section className="premium-card flex-column gap-16" style={{ gridColumn: 'span 6' }}>
                <h3 className="premium-text-h3" style={{ margin: 0 }}>Weekly Activity Trends</h3>
                <ActivityBarChart data={barData} />
             </section>

             <section className="premium-card flex-column gap-16" style={{ gridColumn: 'span 6' }}>
                <h3 className="premium-text-h3" style={{ margin: 0 }}>Type Distribution</h3>
                <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
                   <SubjectDonutChart data={donutData} />
                </div>
             </section>
          </div>

          <section className="premium-card flex-column gap-24" style={{ background: 'rgba(46, 230, 166, 0.05)', borderColor: 'rgba(46, 230, 166, 0.2)' }}>
             <div className="flex-row gap-16 items-center">
                <div style={{ padding: '12px', background: 'var(--accent)', borderRadius: '12px', color: '#000' }}>
                   <ShieldCheck size={24} />
                </div>
                <div className="flex-column gap-4">
                   <h3 className="premium-text-h3" style={{ margin: 0 }}>Career Readiness Score: 82%</h3>
                   <p className="premium-text-meta">Your profile is trending in the top 5% of your branch. Keep contributing to unlock premium placement referrals.</p>
                </div>
             </div>
          </section>
       </main>
    </div>
  );
};

export default ProfilePage;
