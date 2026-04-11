import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, GraduationCap, Upload, UserRoundCheck } from 'lucide-react';
import { getStoredUser } from '../lib/session';
import { getMentorProfile, normalizeTags, saveMentorProfile } from '../lib/mentorSystem';

const MentorProfileCompletion = () => {
  const navigate = useNavigate();
  const storedUser = useMemo(() => getStoredUser(), []);
  const [form, setForm] = useState({
    college: '',
    experience: '',
    subjects: '',
    researchAreas: '',
    bio: '',
    graduationYear: '',
    skills: '',
    currentJob: '',
    company: '',
    goals: '',
    cvUrl: '',
  });
  const [cvFile, setCvFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!storedUser) {
      navigate('/login', { replace: true });
      return;
    }

    if (!['faculty', 'graduate'].includes(String(storedUser.role || '').toLowerCase())) {
      navigate('/dashboard', { replace: true });
      return;
    }

    getMentorProfile()
      .then((profile) => {
        if (!profile) return;
        setForm({
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
        });
      })
      .catch((err) => setError(err.message || 'Unable to load mentor profile'));
  }, [navigate, storedUser]);

  const isFaculty = storedUser?.role === 'faculty';
  const title = isFaculty ? 'Complete Faculty Mentor Profile' : 'Complete Graduate Mentor Profile';

  const updateField = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const submitProfile = async (event) => {
    event.preventDefault();
    if (!storedUser) return;

    setSaving(true);
    setError('');

    try {
      const commonPayload = {
        role: storedUser.role,
        bio: form.bio,
        availableForMentorship: true,
      };

      if (isFaculty) {
        await saveMentorProfile({
          ...commonPayload,
          college: form.college.trim(),
          experience: Number(form.experience || 0),
          subjects: normalizeTags(form.subjects),
          researchAreas: normalizeTags(form.researchAreas),
        });
      } else {
        await saveMentorProfile({
          ...commonPayload,
          graduationYear: form.graduationYear.trim(),
          skills: normalizeTags(form.skills),
          currentJob: form.currentJob.trim(),
          company: form.company.trim(),
          goals: form.goals.trim(),
          cv: cvFile,
          cvUrl: form.cvUrl,
        });
      }

      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to save mentor profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="auth-page fade-in">
      <div className="auth-shell" style={{ alignItems: 'flex-start' }}>
        <div className="auth-card">
          <div className="auth-copy">
            <div className="eyebrow">
              <UserRoundCheck size={15} />
              Mentor Setup
            </div>
            <h1>{title}</h1>
            <p>
              This profile powers discovery in the student dashboard and powers the live mentor chat
              experience. Keep it concise, credible, and specific to your expertise.
            </p>
          </div>

          <div className="auth-points">
            <div className="auth-point">
              {isFaculty ? <Briefcase size={18} /> : <GraduationCap size={18} />}
              <div>
                <strong>{isFaculty ? 'Faculty discovery' : 'Graduate discovery'}</strong>
                <span>
                  Students will see your expertise, bio, and conversation entry point in the mentor grid.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="form-panel" style={{ maxWidth: '720px' }}>
          <div className="form-heading">
            <h2>{title}</h2>
            <p>{isFaculty ? 'Highlight your teaching and research strengths.' : 'Show your journey, skills, and current role.'}</p>
          </div>

          {error ? <div className="error-msg">{error}</div> : null}

          <form className="form" onSubmit={submitProfile}>
            {isFaculty ? (
              <>
                <div className="form-row">
                  <label htmlFor="college">College</label>
                  <input id="college" name="college" value={form.college} onChange={updateField} required />
                </div>
                <div className="form-row">
                  <label htmlFor="experience">Experience (years)</label>
                  <input id="experience" name="experience" type="number" min="0" value={form.experience} onChange={updateField} required />
                </div>
                <div className="form-row">
                  <label htmlFor="subjects">Subjects</label>
                  <input id="subjects" name="subjects" placeholder="DSA, DBMS, Operating Systems" value={form.subjects} onChange={updateField} required />
                </div>
                <div className="form-row">
                  <label htmlFor="researchAreas">Research Areas</label>
                  <input id="researchAreas" name="researchAreas" placeholder="AI, distributed systems" value={form.researchAreas} onChange={updateField} />
                </div>
              </>
            ) : (
              <>
                <div className="form-row">
                  <label htmlFor="graduationYear">Graduation Year</label>
                  <input id="graduationYear" name="graduationYear" value={form.graduationYear} onChange={updateField} required />
                </div>
                <div className="form-row">
                  <label htmlFor="skills">Skills</label>
                  <input id="skills" name="skills" placeholder="React, Firebase, System Design" value={form.skills} onChange={updateField} required />
                </div>
                <div className="form-row">
                  <label htmlFor="currentJob">Current Job</label>
                  <input id="currentJob" name="currentJob" value={form.currentJob} onChange={updateField} required />
                </div>
                <div className="form-row">
                  <label htmlFor="company">Company</label>
                  <input id="company" name="company" value={form.company} onChange={updateField} required />
                </div>
                <div className="form-row">
                  <label htmlFor="goals">Mentorship Goals</label>
                  <textarea id="goals" name="goals" value={form.goals} onChange={updateField} rows="3" />
                </div>
                <div className="form-row">
                  <label htmlFor="cv">CV / Resume (PDF)</label>
                  <input id="cv" type="file" accept="application/pdf" onChange={(event) => setCvFile(event.target.files?.[0] || null)} />
                  {form.cvUrl ? <span className="premium-text-meta">Existing CV linked</span> : null}
                </div>
              </>
            )}

            <div className="form-row">
              <label htmlFor="bio">Short Bio</label>
              <textarea id="bio" name="bio" value={form.bio} onChange={updateField} rows="4" required />
            </div>

            <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
              {saving ? 'Saving mentor profile...' : 'Save Mentor Profile'}
              {!saving ? <Upload size={16} /> : null}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default MentorProfileCompletion;
