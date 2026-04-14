import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowDownToLine,
  Bookmark,
  Bot,
  ChevronRight,
  Eye,
  FileText,
  FolderUp,
  Home,
  PlayCircle,
  Plus,
  Search,
  Sparkles,
  Star,
  User,
  X,
  BookOpen,
  GraduationCap,
  Layers,
  Trash2,
  Award,
  CheckCircle,
  Flame,
  Maximize,
} from 'lucide-react';
import api from '../lib/api';
import { getStoredUser, isMentorRole } from '../lib/session';
import OneDayBatsmanMode from '../components/OneDayBatsmanMode';
import PDFPreviewModal from '../components/PDFPreviewModal';

const stepLabels = ['Academic Context', 'Type', 'Section', 'Publish'];

const initialUpload = {
  title: '',
  year: '3rd Year',
  branch: 'CSE',
  semester: 'Sem 5',
  course: '',
  type: 'Notes',
  section: 'Unit 1',
  tags: '',
  description: '',
  pdf: null,
};

const sectionOrder = (section = '') => {
  const match = String(section).match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
};

const sectionLabel = (section = '') => String(section || 'General').trim();

const YEAR_ORDER = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const SEM_ORDER = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'];

const sortYears = (years) =>
  [...years].sort((a, b) => {
    const ai = YEAR_ORDER.indexOf(a);
    const bi = YEAR_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

const sortSems = (sems) =>
  [...sems].sort((a, b) => {
    const ai = SEM_ORDER.indexOf(a);
    const bi = SEM_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

// Level icons and colors
const LEVEL_CONFIG = {
  years: { icon: GraduationCap, color: 'var(--accent)', bg: 'rgba(46, 230, 166, 0.1)', label: 'Academic Year' },
  branches: { icon: Home, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', label: 'Branch' },
  semesters: { icon: Layers, color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.1)', label: 'Semester' },
  courses: { icon: BookOpen, color: 'var(--gold)', bg: 'rgba(212, 175, 55, 0.1)', label: 'Course' },
  items: { icon: FileText, color: 'var(--accent)', bg: 'rgba(46, 230, 166, 0.05)', label: 'Materials' },
};

const ResourceHub = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState('explore');
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedResource, setSelectedResource] = useState(null);
  const [resourceContext, setResourceContext] = useState(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [viewMode, setViewMode] = useState('all');
  const [uploadStep, setUploadStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState(initialUpload);
  const [currentPath, setCurrentPath] = useState([]);
  const [showEndorsements, setShowEndorsements] = useState(false);
  const [ratingResource, setRatingResource] = useState(null);
  const [endorsements, setEndorsements] = useState([]);
  const [endorsementsLoading, setEndorsementsLoading] = useState(false);
  const [mentorComment, setMentorComment] = useState('');
  const [isPdfExpanded, setPdfExpanded] = useState(false);

  const currentUser = useMemo(() => getStoredUser(), []);
  const isMentor = useMemo(() => isMentorRole(currentUser), [currentUser]);

  const myId = useMemo(() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      return JSON.parse(atob(token.split('.')[1])).user.id;
    } catch { return null; }
  }, []);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let endpoint = '/resources';
      if (viewMode === 'mine') endpoint = '/resources/my-uploads';
      if (viewMode === 'saved') endpoint = '/resources/saved';
      const response = await api.get(endpoint);
      setResources(response.data.resources || []);
    } catch {
      setError('Connection disrupted. Ensure backend is active.');
    } finally {
      setLoading(false);
    }
  }, [viewMode]);

  useEffect(() => {
    const requestedMode = searchParams.get('mode');
    if (requestedMode) setMode(requestedMode === 'saved' ? 'explore' : requestedMode);
    if (requestedMode === 'saved') setViewMode('saved');
  }, [searchParams]);

  useEffect(() => {
    if (mode === 'explore') fetchResources();
  }, [mode, viewMode, fetchResources]);

  useEffect(() => {
    const fetchContext = async () => {
      if (!selectedResource?.id) { setResourceContext(null); return; }
      try {
        const response = await api.get(`/community/resources/${selectedResource.id}/context`);
        setResourceContext(response.data);
      } catch {
        setResourceContext(null);
      }
    };
    fetchContext();
  }, [selectedResource]);

  useEffect(() => {
    const fetchSelectedResource = async () => {
      if (!selectedResource?.id) return;
      try {
        const response = await api.get(`/resources/${selectedResource.id}`);
        setSelectedResource((curr) => (curr?.id === selectedResource.id
          ? { ...curr, ...response.data.resource }
          : curr));
      } catch {
        // Keep the existing preview open even if the detail refresh fails.
      }
    };
    fetchSelectedResource();
  }, [selectedResource?.id]);

  const fetchEndorsements = useCallback(async (resourceId) => {
    if (!resourceId) return;
    setEndorsementsLoading(true);
    try {
      const response = await api.get(`/resources/${resourceId}/endorsements`);
      setEndorsements(response.data.endorsements || []);
    } catch {
      setEndorsements([]);
    } finally {
      setEndorsementsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showEndorsements && ratingResource?.id) {
      fetchEndorsements(ratingResource.id);
    }
  }, [showEndorsements, ratingResource?.id, fetchEndorsements]);

  const tree = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = resources.filter((r) =>
      !query ||
      `${r.title} ${r.course} ${r.branch} ${r.section} ${(r.tags || []).join(' ')}`.toLowerCase().includes(query),
    );

    // If searching, return a flat "search" level to bypass folders
    if (query) {
      return {
        level: 'search',
        data: filtered.sort((a, b) => a.title.localeCompare(b.title)),
      };
    }

    const yearMap = new Map();
    filtered.forEach((r) => {
      const year = r.year || 'Unassigned Year';
      const branch = r.branch || 'General Branch';
      const semester = r.semester || 'General Semester';
      const course = r.course || 'General Course';
      
      if (!yearMap.has(year)) yearMap.set(year, new Map());
      if (!yearMap.get(year).has(branch)) yearMap.get(year).set(branch, new Map());
      if (!yearMap.get(year).get(branch).has(semester)) yearMap.get(year).get(branch).set(semester, new Map());
      if (!yearMap.get(year).get(branch).get(semester).has(course)) yearMap.get(year).get(branch).get(semester).set(course, []);
      yearMap.get(year).get(branch).get(semester).get(course).push(r);
    });

    if (currentPath.length === 0) { // Render years
      const years = sortYears(Array.from(yearMap.keys()));
      return {
        level: 'years',
        data: years.map((y) => ({
          label: y,
          count: Array.from(yearMap.get(y).values()).reduce(
            (accBtn, branchMap) => accBtn + Array.from(branchMap.values()).reduce(
              (accSem, semMap) => accSem + Array.from(semMap.values()).reduce((accCr, cr) => accCr + cr.length, 0), 0
            ), 0
          ),
        })),
      };
    }

    const [selYear, selBranch, selSem, selCourse] = currentPath;
    const yearData = yearMap.get(selYear);

    if (currentPath.length === 1) { // Render branches
      if (!yearData) return { level: 'branches', data: [] };
      const branches = Array.from(yearData.keys()).sort();
      return {
        level: 'branches',
        data: branches.map((b) => ({
          label: b,
          count: Array.from(yearData.get(b).values()).reduce(
            (accSem, semMap) => accSem + Array.from(semMap.values()).reduce((accCr, cr) => accCr + cr.length, 0), 0
          ),
        })),
      };
    }

    const branchData = yearData?.get(selBranch);

    if (currentPath.length === 2) { // Render semesters
      if (!branchData) return { level: 'semesters', data: [] };
      const sems = sortSems(Array.from(branchData.keys()));
      return {
        level: 'semesters',
        data: sems.map((s) => ({
          label: s,
          count: Array.from(branchData.get(s).values()).reduce((a, b) => a + b.length, 0),
        })),
      };
    }

    const semData = branchData?.get(selSem);
    if (currentPath.length === 3) { // Render courses
      if (!semData) return { level: 'courses', data: [] };
      const courses = Array.from(semData.keys()).sort();
      return {
        level: 'courses',
        data: courses.map((c) => ({ label: c, count: semData.get(c).length })),
      };
    }

    const courseData = semData?.get(selCourse);
    if (currentPath.length === 4) { // Render items
      if (!courseData) return { level: 'items', data: [] };
      return {
        level: 'items',
        data: [...courseData].sort(
          (a, b) => sectionOrder(a.section) - sectionOrder(b.section) || a.title.localeCompare(b.title)
        ),
      };
    }

    return { level: 'root', data: [] };
  }, [resources, search, currentPath]);

  const handleDownload = async (id) => {
    try {
      const res = await api.post(`/resources/download/${id}`);
      window.open(res.data.fileUrl, '_blank');
      fetchResources();
    } catch {
      setError('Download failed');
    }
  };

  const handleSave = async (id) => {
    try {
      const res = await api.post(`/resources/save/${id}`);
      setResources((curr) => curr.map((r) => (r.id === id ? { ...r, saved: res.data.saved } : r)));
      if (selectedResource?.id === id) setSelectedResource((curr) => ({ ...curr, saved: res.data.saved }));
    } catch (e) { console.warn(e); }
  };

  const handleRateResource = async (id, rating, comment = '') => {
    if (!id || ratingLoading) return;
    try {
      setRatingLoading(true);
      const response = await api.post(`/resources/rate/${id}`, { rating, comment });
      const nextAverage = response.data.ratingAverage || 0;
      const nextCount = response.data.ratingCount || 0;

      setResources((curr) => curr.map((resource) => (
        resource.id === id
          ? { ...resource, ratingAverage: nextAverage, ratingCount: nextCount, userRating: rating }
          : resource
      )));

      setSelectedResource((curr) => (curr?.id === id
        ? {
          ...curr,
          ratingAverage: nextAverage,
          ratingCount: nextCount,
          userRating: rating,
        }
        : curr));
    } catch (err) {
      setError(err?.response?.data?.message || 'Rating failed.');
    } finally {
      setRatingLoading(false);
    }
  };

  const handleDeleteResource = async (id) => {
    if (!window.confirm('Are you sure you want to delete this resource? This action cannot be undone.')) return;
    try {
      await api.delete(`/resources/${id}`);
      fetchResources();
      if (selectedResource?.id === id) setSelectedResource(null);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete resource');
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.pdf || !uploadForm.title || !uploadForm.course) {
      setError('Add the PDF, title, and subject before publishing.');
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      Object.entries(uploadForm).forEach(([key, value]) => {
        if (key === 'pdf') { formData.append('pdf', value); return; }
        formData.append(key, value);
      });
      await api.post('/resources/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadForm(initialUpload);
      setUploadStep(1);
      setMode('explore');
      fetchResources();
    } catch (err) {
      setError(err?.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const pushPath = (label) => setCurrentPath((p) => [...p, label]);
  const slicePath = (idx) => setCurrentPath((p) => p.slice(0, idx + 1));
  const resetPath = () => setCurrentPath([]);

  const levelCfg = LEVEL_CONFIG[tree.level] || LEVEL_CONFIG.years;

  // ─── Resource Row ───────────────────────────────────────────────────────────
  const ResourceRow = ({ resource, showContext }) => (
    <div
      className="premium-card resource-row-responsive flex-row items-center gap-24"
      style={{
        padding: '20px 28px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
        background: 'rgba(255,255,255,0.01)',
        border: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <div style={{ 
        width: '48px', 
        height: '48px', 
        background: 'rgba(46, 230, 166, 0.06)', 
        borderRadius: '14px', 
        color: 'var(--accent)', 
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        border: '1px solid rgba(46, 230, 166, 0.1)'
      }}>
        <FileText size={22} />
      </div>
      <div className="flex-column" style={{ flex: 1, minWidth: 0, gap: '6px' }}>
        <h4 className="premium-text-h3" style={{ margin: 0, fontSize: '16px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {resource.title}
        </h4>
        <div className="flex-row gap-8" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="premium-chip" style={{ fontSize: '10px', padding: '2px 10px', background: 'rgba(46, 230, 166, 0.1)', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {resource.type}
          </span>
          {showContext && (
            <span style={{ fontSize: '11px', color: 'var(--muted)', opacity: 0.8, fontWeight: 600 }}>
              {resource.year} • {resource.semester}
            </span>
          )}
          <div className="flex-row gap-6 opacity-60">
            <span className="premium-text-meta" style={{ fontSize: '12px' }}>{resource.branch}</span>
            <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--muted)' }} />
            <span className="premium-text-meta" style={{ fontSize: '12px' }}>{sectionLabel(resource.section)}</span>
          </div>
        </div>
      </div>
      <div className="flex-row resource-row-actions gap-20 items-center" style={{ flexShrink: 0 }}>
        <div className="flex-column items-end" style={{ gap: '4px', minWidth: '80px' }}>
          <div className="flex-row gap-4 items-center">
            <Star size={12} fill="var(--gold)" color="var(--gold)" />
            <span className="premium-text-meta" style={{ fontWeight: 700, color: 'var(--text)', fontSize: '14px' }}>
              {Number(resource.ratingAverage || 0).toFixed(1)}
            </span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--muted)', opacity: 0.5, fontWeight: 500 }}>{resource.downloads || 0} downloads</span>
        </div>
        <div className="flex-row gap-8 flex-wrap">
          <button
            className="premium-button-secondary"
            style={{ width: '38px', height: '38px', padding: 0, borderRadius: '10px', display: 'grid', placeItems: 'center' }}
            title="Preview"
            onClick={() => setSelectedResource(resource)}
          >
            <Eye size={18} />
          </button>
          <button
            className="premium-button"
            style={{ width: '38px', height: '38px', padding: 0, borderRadius: '10px', display: 'grid', placeItems: 'center' }}
            title="Download"
            onClick={() => handleDownload(resource.id)}
          >
            <ArrowDownToLine size={18} />
          </button>
          {!isMentor && (
            <>
              <button
                className={`premium-button-secondary ${resource.saved ? 'is-active' : ''}`}
                style={{ width: '38px', height: '38px', padding: 0, borderRadius: '10px', display: 'grid', placeItems: 'center', color: resource.saved ? 'var(--gold)' : 'inherit' }}
                onClick={() => handleSave(resource.id)}
              >
                <Bookmark size={18} fill={resource.saved ? 'currentColor' : 'none'} />
              </button>
            </>
          )}
          <button
            className="premium-button-secondary"
            style={{ 
              width: '38px', 
              height: '38px', 
              padding: 0, 
              borderRadius: '10px', 
              display: 'grid', 
              placeItems: 'center',
              color: 'var(--primary)',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.15)'
            }}
            title={isMentor ? "Rate as Expert" : "Mentor Endorsements"}
            onClick={() => {
              setRatingResource(resource);
              setShowEndorsements(true);
            }}
          >
            <GraduationCap size={18} />
          </button>
          {!isMentor && (
            <button
              style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', cursor: 'pointer', color: '#8B5CF6', display: 'grid', placeItems: 'center' }}
              onClick={() => navigate(`/summaries?resourceId=${resource.id}`)}
              title="Summarize with AI"
            >
              <Bot size={18} />
            </button>
          )}
          {!isMentor && resource.uploaderId === myId && (
            <button
              style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', color: '#f87171', display: 'grid', placeItems: 'center' }}
              onClick={() => handleDeleteResource(resource.id)}
              title="Delete Resource"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Drill-down Card ────────────────────────────────────────────────────────
  const DrillCard = ({ item, onClick }) => {
    const Icon = levelCfg.icon;
    return (
      <button
        className="premium-card flex-column items-center justify-center gap-20"
        style={{
          gridColumn: 'span 3',
          padding: '40px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: 'rgba(255,255,255,0.02)',
          transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
          border: '1px solid rgba(255,255,255,0.06)',
          position: 'relative',
        }}
        onClick={onClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-6px)';
          e.currentTarget.style.borderColor = levelCfg.color;
          e.currentTarget.style.background = `${levelCfg.bg}`;
          e.currentTarget.style.boxShadow = `0 20px 40px rgba(0,0,0,0.4)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
          e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
          e.currentTarget.style.boxShadow = '';
        }}
      >
        <div style={{
          width: '64px', height: '64px', borderRadius: '20px',
          background: 'rgba(255,255,255,0.03)', color: levelCfg.color,
          display: 'grid', placeItems: 'center',
          border: '1px solid rgba(255,255,255,0.05)',
          transition: 'all 0.3s ease'
        }}>
          {tree.level === 'years'
            ? <span style={{ fontWeight: 800, fontSize: '24px' }}>{item.label[0]}</span>
            : <Icon size={30} />
          }
        </div>
        <div className="flex-column gap-4">
          <span className="premium-text-h3" style={{ fontSize: '17px', margin: 0, fontWeight: 800, color: 'var(--text)' }}>
            {item.label}
          </span>
          <div className="flex-row gap-6 justify-center items-center">
            <span className="premium-text-meta" style={{ fontSize: '12px', fontWeight: 600, color: levelCfg.color }}>
              {item.count}
            </span>
            <span className="premium-text-meta" style={{ fontSize: '12px', opacity: 0.6 }}>
              {tree.level === 'courses' ? 'materials' : 'sections'}
            </span>
          </div>
        </div>
        <div style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          opacity: 0.3
        }}>
          <ChevronRight size={14} />
        </div>
      </button>
    );
  };

  // ─── Breadcrumb ─────────────────────────────────────────────────────────────
  const Breadcrumb = () => {
    const crumbs = [
      { label: 'Resource Hub', isRoot: true },
      ...currentPath.map((seg) => ({ label: seg, isRoot: false })),
    ];

    return (
      <nav
        className="flex-row gap-4"
        style={{
          gridColumn: 'span 12',
          flexWrap: 'wrap',
          alignItems: 'center',
          padding: '12px 20px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <div key={idx} className="flex-row gap-4 items-center">
              {idx > 0 && (
                <ChevronRight size={14} style={{ color: 'var(--muted)', opacity: 0.4 }} />
              )}
              {crumb.isRoot && <Home size={13} style={{ color: isLast ? 'var(--accent)' : 'var(--muted)' }} />}
              <button
                onClick={() => crumb.isRoot ? resetPath() : slicePath(idx - 1)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: isLast ? 'default' : 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: isLast ? 700 : 500,
                  color: isLast ? 'var(--accent)' : 'var(--muted)',
                  background: isLast ? 'rgba(46, 230, 166, 0.08)' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => !isLast && (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={(e) => !isLast && (e.currentTarget.style.color = 'var(--muted)')}
              >
                {crumb.label}
              </button>
            </div>
          );
        })}

        {currentPath.length > 0 && (
          <span
            className="premium-text-meta"
            style={{ marginLeft: 'auto', fontSize: '11px', opacity: 0.5 }}
          >
            {tree.level === 'items'
              ? `${tree.data.length} PDF${tree.data.length !== 1 ? 's' : ''}`
              : `${tree.data.length} ${tree.level}`}
          </span>
        )}
      </nav>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="premium-grid-base" style={{ gap: '24px', alignItems: 'start' }}>

      {/* Header - Always on top */}
      <header 
        className="flex-row justify-between items-end" 
        style={{ gridColumn: 'span 12', order: 1 }}
      >
        <div className="flex-column gap-8">
          <div className="flex-row gap-8" style={{ color: 'var(--accent)' }}>
            <FolderUp size={16} />
            <span className="premium-text-meta" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Knowledge Layer
            </span>
          </div>
          <h1 className="premium-text-hero" style={{ marginBottom: 0 }}>Resource Hub</h1>
        </div>
        <div className="flex-row gap-12">
          <div
            className="premium-card flex-row"
            style={{ padding: '4px', borderRadius: '12px', gap: '2px' }}
          >
            {['all', 'mine', 'saved'].map((value) => (
              <button
                key={value}
                onClick={() => { setViewMode(value); setMode('explore'); resetPath(); }}
                className="premium-text-meta"
                style={{
                  padding: '8px 18px', border: 'none', borderRadius: '8px',
                  background: viewMode === value ? 'rgba(46, 230, 166, 0.1)' : 'transparent',
                  color: viewMode === value ? 'var(--accent)' : 'var(--muted)',
                  cursor: 'pointer',
                  fontWeight: viewMode === value ? 700 : 500,
                  transition: 'all 0.15s ease',
                }}
              >
                {value === 'all' ? 'All' : value === 'mine' ? 'Mine' : 'Saved'}
              </button>
            ))}
          </div>
          {!isMentor && (
            <button className="premium-button" onClick={() => setMode('upload')}>
              <Plus size={18} />
              <span>Contribute</span>
            </button>
          )}
        </div>
      </header>

      {/* Status bar */}
      {(loading || error) && (
        <section className="premium-card" style={{ gridColumn: 'span 12', padding: '14px 24px', order: 1 }}>
          <span className="premium-text-meta" style={{ color: error ? 'var(--danger)' : 'var(--muted)' }}>
            {loading ? 'Refreshing live resources...' : error}
          </span>
        </section>
      )}

      {/* Explore Search Area */}
      {mode === 'explore' && (
        <section
          className="premium-card flex-row items-center gap-16"
          style={{ gridColumn: 'span 12', padding: '14px 24px', order: 1 }}
        >
          <Search size={18} color="var(--muted)" />
          <input
            className="premium-text-body"
            style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', flex: 1, fontSize: '15px' }}
            placeholder="Search by topic, course, unit, or tag..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPath(); }}
          />
          {search && (
            <button
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
              onClick={() => setSearch('')}
            >
              <X size={16} />
            </button>
          )}
        </section>
      )}

      {/* Main Content Area */}
      <div className={`flex-column resource-hub-main-col ${selectedResource ? 'with-preview' : ''}`} style={{ 
        gap: '24px',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>

          {/* Batsman Mode Banner (only on root) */}
          {currentPath.length === 0 && !search && (
            <section
              className="premium-card flex-row items-center justify-between gap-24 fade-in"
              style={{
                gridColumn: 'span 12', padding: '24px 32px',
                background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.05) 0%, rgba(14,22,36,0.9) 100%)',
                borderColor: 'rgba(239, 68, 68, 0.2)',
                cursor: 'pointer'
              }}
              onClick={() => setMode('batsman')}
            >
              <div className="flex-row items-center gap-24">
                <div style={{ width: 56, height: 56, background: 'rgba(239, 68, 68, 0.1)', borderRadius: '16px', display: 'grid', placeItems: 'center', color: '#EF4444', flexShrink: 0, border: '1px solid rgba(239,68,68,0.2)' }}>
                  <Flame size={28} />
                </div>
                <div className="flex-column gap-6" style={{ flex: 1 }}>
                  <h3 className="premium-text-h3" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    One Day Batsman Mode <span style={{ fontSize: '18px' }}>🏏</span>
                  </h3>
                  <p className="premium-text-meta">Last-minute 3-hour smart exam prep plan for top-priority topics.</p>
                </div>
              </div>
              <button className="premium-button" style={{ background: '#EF4444', color: '#fff', border: 'none', padding: '12px 24px' }}>
                Activate Mode
              </button>
            </section>
          )}

          {/* Feature banner (only on root) */}
          {resources.length > 0 && currentPath.length === 0 && (
            <section
              className="premium-card flex-row items-center gap-24"
              style={{
                gridColumn: 'span 12', padding: '24px',
                background: 'linear-gradient(90deg, rgba(46, 230, 166, 0.06) 0%, transparent 100%)',
                borderColor: 'rgba(46, 230, 166, 0.2)',
              }}
            >
              <div style={{ width: 48, height: 48, background: 'var(--accent)', borderRadius: '12px', display: 'grid', placeItems: 'center', color: '#000', flexShrink: 0 }}>
                <PlayCircle size={24} />
              </div>
              <div className="flex-column gap-4" style={{ flex: 1 }}>
                <h3 className="premium-text-h3" style={{ margin: 0 }}>{resources[0].title}</h3>
                <p className="premium-text-meta">{resources[0].course} | {resources[0].type}</p>
              </div>
              <button
                className="premium-button"
                onClick={() => navigate(`/summaries?resourceId=${resources[0].id}`)}
              >
                Resume via AI Genie
              </button>
            </section>
          )}

          {/* Breadcrumb */}
          <Breadcrumb />

          {/* Level label */}
          {currentPath.length > 0 && (
            <div className="flex-row gap-12 items-center" style={{ gridColumn: 'span 12' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: levelCfg.bg, color: levelCfg.color, display: 'grid', placeItems: 'center' }}>
                <levelCfg.icon size={16} />
              </div>
              <span className="premium-text-h3" style={{ margin: 0, fontSize: '15px', color: 'var(--muted)' }}>
                {levelCfg.label} — <span style={{ color: 'var(--text)' }}>{currentPath[currentPath.length - 1]}</span>
              </span>
            </div>
          )}

          {/* Tree content */}
          <section style={{ gridColumn: 'span 12' }}>
            {tree.data.length ? (
              tree.level === 'search' ? (
                <div className="flex-column gap-20">
                  <div className="flex-row justify-between items-center">
                    <h3 className="premium-text-h3" style={{ fontSize: '18px', margin: 0 }}>
                      Search Results <span style={{ color: 'var(--accent)', fontSize: '14px' }}>({tree.data.length})</span>
                    </h3>
                  </div>
                  <div className="flex-column gap-12">
                    {tree.data.map((item) => (
                      <ResourceRow key={item.id} resource={item} showContext={true} />
                    ))}
                  </div>
                </div>
              ) : tree.level === 'items' ? (
                <div className="flex-column gap-12">
                  {tree.data.map((item) => (
                    <div key={item.id} className="flex-column gap-6">
                      <div
                        className="premium-chip-outline"
                        style={{ width: 'fit-content', fontSize: '11px', padding: '3px 10px' }}
                      >
                        {sectionLabel(item.section)}
                      </div>
                      <ResourceRow resource={item} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="premium-grid-base" style={{ padding: 0 }}>
                  {tree.data.map((item, idx) => (
                    <DrillCard key={idx} item={item} onClick={() => pushPath(item.label)} />
                  ))}
                </div>
              )
            ) : (
              <div
                className="premium-card flex-column items-center justify-center gap-16"
                style={{ padding: '64px', opacity: 0.5, textAlign: 'center' }}
              >
                <Search size={48} />
                <p className="premium-text-body">
                  {search ? 'No resources found matching this search.' : 'No resources in this category yet.'}
                </p>
              </div>
            )}
          </section>
        </>
      )}

      {/* Batsman Mode */}
      {mode === 'batsman' && (
        <OneDayBatsmanMode 
          resources={resources} 
          onClose={() => setMode('explore')} 
          onResourceClick={(r) => setSelectedResource(r)} 
        />
      )}
      </div>

      {/* Upload wizard */}
      {mode === 'upload' && (
        <div
          className="premium-card flex-column gap-32 fade-in"
          style={{ gridColumn: 'span 12', maxWidth: '800px', margin: '0 auto', width: '100%' }}
        >
          {/* ... existing upload wizard content ... */}
          {/* Since I am wrapping the main area, the upload wizard should probably also be inside it or handled separately */}
          {/* I'll leave the existing upload wizard code but it might need adjustment if selectedResource is true during upload, which shouldn't happen usually */}
          {/* For now, I'll close the main column div before upload if I want upload to be full width, or keep it inside. */}
          {/* Actually, let's keep it inside for simplicity. */}
          <div className="flex-row justify-between items-center">
            <h2 className="premium-text-h2" style={{ margin: 0 }}>Upload Material</h2>
            <button
              onClick={() => setMode('explore')}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '8px' }}
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-row justify-between items-center" style={{ padding: '0 24px' }}>
            {stepLabels.map((label, index) => (
              <div key={label} className="flex-column items-center gap-8" style={{ opacity: uploadStep === index + 1 ? 1 : 0.3 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: uploadStep === index + 1 ? 'var(--accent)' : 'var(--surface-2)',
                  color: uploadStep === index + 1 ? '#000' : 'var(--text)',
                  display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '15px',
                }}>
                  {index + 1}
                </div>
                <span className="premium-text-meta" style={{ fontSize: '11px' }}>{label}</span>
              </div>
            ))}
          </div>

          <div className="flex-column gap-24" style={{ minHeight: '300px' }}>
            {uploadStep === 1 && (
              <div className="premium-grid-base" style={{ padding: 0 }}>
                <div className="flex-column gap-8" style={{ gridColumn: 'span 4' }}>
                  <label className="premium-text-meta">Year</label>
                  <select className="premium-select" value={uploadForm.year} onChange={(e) => setUploadForm({ ...uploadForm, year: e.target.value })}>
                    <option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option>
                  </select>
                </div>
                <div className="flex-column gap-8" style={{ gridColumn: 'span 4' }}>
                  <label className="premium-text-meta">Semester</label>
                  <select className="premium-select" value={uploadForm.semester} onChange={(e) => setUploadForm({ ...uploadForm, semester: e.target.value })}>
                    {SEM_ORDER.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex-column gap-8" style={{ gridColumn: 'span 4' }}>
                  <label className="premium-text-meta">Branch</label>
                  <select className="premium-select" value={uploadForm.branch} onChange={(e) => setUploadForm({ ...uploadForm, branch: e.target.value })}>
                    <option>CSE</option><option>ECE</option><option>MECH</option><option>AIML</option><option>EEE</option><option>CIVIL</option>
                  </select>
                </div>
                <div className="flex-column gap-8" style={{ gridColumn: 'span 12' }}>
                  <label className="premium-text-meta">Course / Subject Name</label>
                  <input
                    className="premium-select"
                    style={{ padding: '14px' }}
                    placeholder="e.g. Database Management Systems"
                    value={uploadForm.course}
                    onChange={(e) => setUploadForm({ ...uploadForm, course: e.target.value })}
                  />
                </div>
              </div>
            )}

            {uploadStep === 2 && (
              <div className="flex-row gap-12 flex-wrap">
                {['Notes', 'PYQ', 'Lab Manual', 'Projects', 'Assignments'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setUploadForm({ ...uploadForm, type })}
                    className="premium-card"
                    style={{
                      flex: 1, minWidth: '120px', padding: '24px 16px', textAlign: 'center', cursor: 'pointer',
                      background: uploadForm.type === type ? 'rgba(46, 230, 166, 0.1)' : 'var(--surface)',
                      border: uploadForm.type === type ? '1px solid rgba(46, 230, 166, 0.4)' : '1px solid rgba(255,255,255,0.05)',
                      color: uploadForm.type === type ? 'var(--accent)' : 'var(--text)',
                      fontWeight: uploadForm.type === type ? 700 : 500,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}

            {uploadStep === 3 && (
              <div className="flex-column gap-16">
                <label className="premium-text-meta">Section / Unit / Chapter</label>
                <input
                  className="premium-select"
                  style={{ padding: '16px' }}
                  placeholder="e.g. Unit 3 or Chapter 5"
                  value={uploadForm.section}
                  onChange={(e) => setUploadForm({ ...uploadForm, section: e.target.value })}
                />
                <p className="premium-text-meta" style={{ opacity: 0.6 }}>
                  This powers unit-wise sorting in the resource tree. Use a consistent format like "Unit 1", "Unit 2", etc.
                </p>
              </div>
            )}

            {uploadStep === 4 && (
              <div className="flex-column gap-16">
                <input
                  className="premium-select"
                  style={{ padding: '16px' }}
                  placeholder="Resource Title"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                />
                <label
                  style={{
                    border: '2px dashed rgba(46, 230, 166, 0.2)', borderRadius: '12px', padding: '24px',
                    textAlign: 'center', cursor: 'pointer', color: 'var(--muted)',
                    background: uploadForm.pdf ? 'rgba(46, 230, 166, 0.05)' : 'transparent',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input type="file" style={{ display: 'none' }} accept="application/pdf" onChange={(e) => setUploadForm({ ...uploadForm, pdf: e.target.files[0] })} />
                  {uploadForm.pdf ? (
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>📄 {uploadForm.pdf.name}</span>
                  ) : (
                    <span>Click to choose a PDF file</span>
                  )}
                </label>
                <textarea
                  className="premium-select"
                  style={{ padding: '16px', minHeight: '120px', resize: 'vertical' }}
                  placeholder="Brief description (optional)..."
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="flex-row justify-end gap-12">
            {uploadStep > 1 && (
              <button className="premium-button-secondary" onClick={() => setUploadStep((s) => s - 1)}>Back</button>
            )}
            {uploadStep < 4 ? (
              <button className="premium-button" onClick={() => setUploadStep((s) => s + 1)}>Continue</button>
            ) : (
              <button className="premium-button" disabled={uploading} onClick={handleUpload}>
                {uploading ? 'Publishing...' : 'Publish Material'}
              </button>
            )}
          </div>
        </div>
    )}

    {/* Side Preview Panel */}
      {selectedResource && (
        <aside
          className="premium-card resource-hub-preview-aside flex-column fade-in"
          style={{
            zIndex: 10,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            background: 'rgba(14, 22, 40, 0.7)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          }}
        >
          <header className="flex-row justify-between items-start">
            <div className="flex-column" style={{ gap: '4px', flex: 1 }}>
              <div className="flex-row gap-8" style={{ color: 'var(--accent)' }}>
                <FileText size={14} />
                <span className="premium-text-meta" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '10px' }}>
                  {selectedResource.course} › {sectionLabel(selectedResource.section)}
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>
                {selectedResource.title}
              </h2>
              <span className="premium-text-meta" style={{ fontSize: '11px', opacity: 0.7 }}>by {selectedResource.uploadedBy}</span>
            </div>
            <button
              className="premium-button-secondary"
              onClick={() => setSelectedResource(null)}
              style={{ width: '32px', height: '32px', padding: 0, borderRadius: '8px', display: 'grid', placeItems: 'center' }}
            >
              <X size={18} />
            </button>
          </header>

          <div style={{ flex: 1, position: 'relative', minHeight: '400px' }}>
            {selectedResource.fileUrl && (
              <button
                onClick={() => setPdfExpanded(true)}
                title="Expand Preview"
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '24px',
                  zIndex: 10,
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(14, 22, 40, 0.8)',
                  border: '1px solid rgba(46, 230, 166, 0.3)',
                  color: 'var(--accent)',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--accent)';
                  e.currentTarget.style.color = '#000';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(14, 22, 40, 0.8)';
                  e.currentTarget.style.color = 'var(--accent)';
                }}
              >
                <Maximize size={16} />
              </button>
            )}
            <iframe
              src={selectedResource.fileUrl}
              style={{ width: '100%', height: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', background: '#fff' }}
              title={selectedResource.title}
            />
          </div>

          <div className="flex-column" style={{ gap: '12px' }}>
            {!isMentor && (
              <div
                className="premium-card flex-column gap-12"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex-row justify-between items-center">
                  <div className="flex-column gap-4">
                    <strong style={{ color: 'var(--text)' }}>Student rating</strong>
                    <span className="premium-text-meta" style={{ fontSize: '12px' }}>
                      Help others decide which file is worth using.
                    </span>
                  </div>
                  <div className="flex-column items-end" style={{ gap: '2px' }}>
                    <strong style={{ color: 'var(--text)' }}>{Number(selectedResource.ratingAverage || 0).toFixed(1)}</strong>
                    <span className="premium-text-meta" style={{ fontSize: '11px' }}>
                      {selectedResource.ratingCount || 0} ratings
                    </span>
                  </div>
                </div>

                <div className="flex-row gap-8 items-center" style={{ flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4, 5].map((value) => {
                    const active = value <= Number(selectedResource.userRating || 0);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleRateResource(selectedResource.id, value)}
                        disabled={ratingLoading}
                        title={`Rate ${value} star${value > 1 ? 's' : ''}`}
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          border: active ? '1px solid rgba(212, 175, 55, 0.28)' : '1px solid rgba(255,255,255,0.06)',
                          background: active ? 'rgba(212, 175, 55, 0.12)' : 'rgba(255,255,255,0.02)',
                          color: active ? 'var(--gold)' : 'rgba(230, 238, 255, 0.45)',
                          display: 'grid',
                          placeItems: 'center',
                          cursor: ratingLoading ? 'wait' : 'pointer',
                        }}
                      >
                        <Star size={18} fill={active ? 'currentColor' : 'none'} />
                      </button>
                    );
                  })}
                  <span className="premium-text-meta" style={{ fontSize: '12px', marginLeft: '4px' }}>
                    {selectedResource.userRating ? `You rated this ${selectedResource.userRating}/5` : 'Tap a star to rate'}
                  </span>
                </div>
              </div>
            )}

            <div className="flex-row gap-8" style={{ flexWrap: 'wrap' }}>
              <button 
                className="premium-button-secondary" 
                style={{ flex: 1, padding: '10px 16px', fontSize: '13px' }} 
                onClick={() => setResourceContext('preview')}
              >
                <Eye size={16} /> Preview
              </button>
              
              <button 
                className="premium-button" 
                style={{ flex: 1, padding: '10px 16px', fontSize: '13px' }} 
                onClick={() => handleDownload(selectedResource.id)}
              >
                <ArrowDownToLine size={16} /> Download
              </button>
              
              <button
                className="premium-button-secondary"
                style={{ 
                  flex: 1, 
                  padding: '10px 16px', 
                  fontSize: '13px', 
                  color: 'var(--primary)',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.15)'
                }}
                onClick={() => {
                  setRatingResource(selectedResource);
                  setShowEndorsements(true);
                }}
              >
                <GraduationCap size={16} />
                {isMentor ? "Expert Rate" : "Mentors"}
              </button>

              {!isMentor && (
                <button
                  className={`premium-button-secondary ${selectedResource.saved ? 'is-active' : ''}`}
                  style={{ flex: 1, padding: '10px 16px', fontSize: '13px', color: selectedResource.saved ? 'var(--gold)' : 'inherit' }}
                  onClick={() => handleSave(selectedResource.id)}
                >
                  <Bookmark size={16} fill={selectedResource.saved ? 'currentColor' : 'none'} />
                  {selectedResource.saved ? 'Saved' : 'Save'}
                </button>
              )}
            </div>

            {!isMentor && (
              <div className="flex-row gap-8" style={{ flexWrap: 'wrap' }}>
                <button
                  className="premium-button-secondary"
                  style={{ flex: 1, padding: '10px 12px', fontSize: '12px', background: 'rgba(46, 230, 166, 0.08)', color: 'var(--accent)' }}
                  onClick={() => navigate(`/community?view=feed&resourceId=${selectedResource.id}&action=ask`)}
                >
                  <Plus size={14} /> Ask Doubt
                </button>
                <button
                  className="premium-button-secondary"
                  style={{ flex: 1, padding: '10px 12px', fontSize: '12px' }}
                  onClick={() => navigate(`/summaries?resourceId=${selectedResource.id}`)}
                >
                  <Bot size={14} /> AI Study
                </button>
              </div>
            )}

            {resourceContext && (
              <div className="flex-row justify-between" style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="premium-text-meta" style={{ fontSize: '11px' }}>📝 {resourceContext.relatedPosts?.length || 0} posts</span>
                <span className="premium-text-meta" style={{ fontSize: '11px' }}>👥 {resourceContext.activePeers?.length || 0} peers</span>
                <span className="premium-text-meta" style={{ fontSize: '11px' }}>🎓 {resourceContext.upcomingClasses?.length || 0} classes</span>
              </div>
            )}
          </div>
        </aside>
      )}
      {/* Mentor Endorsements Modal */}
      {showEndorsements && ratingResource && (
        <>
          <div 
            className="mentor-compose-backdrop" 
            style={{ 
              background: 'rgba(7, 11, 25, 0.4)', 
              backdropFilter: 'blur(16px)', 
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }} 
            onClick={() => setShowEndorsements(false)} 
          >
            <aside 
              className="premium-card fade-in" 
              style={{ 
                width: 'min(680px, 94vw)', 
                maxHeight: '85vh',
                overflowY: 'auto',
                background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(10, 10, 20, 0.98) 100%)',
                border: '1px solid rgba(46, 230, 166, 0.15)',
                borderRadius: '32px',
                padding: '0',
                boxShadow: '0 40px 100px rgba(0,0,0,0.7), inset 0 0 80px rgba(46, 230, 166, 0.05)',
                position: 'relative',
                display: 'block'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex-column" style={{ padding: '0' }}>
                <header 
                   style={{ 
                     padding: '40px 48px 32px', 
                     borderBottom: '1px solid rgba(255,255,255,0.06)',
                     background: 'linear-gradient(180deg, rgba(46, 230, 166, 0.04) 0%, transparent 100%)'
                   }}
                >
                  <div className="flex-row justify-between items-start">
                    <div className="flex-column gap-12">
                      <div className="flex-row gap-8 items-center" style={{ color: 'var(--accent)' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(46, 230, 166, 0.1)', display: 'grid', placeItems: 'center' }}>
                          <Award size={18} />
                        </div>
                        <span className="premium-text-meta" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: '11px', fontWeight: 800 }}>
                          CampusIQ Intelligence
                        </span>
                      </div>
                      <h2 className="premium-text-h2" style={{ margin: 0, fontSize: '28px', color: 'var(--text)' }}>
                        {isMentor ? 'Expert Resource Review' : 'Verified Mentor Endorsements'}
                      </h2>
                      <p className="premium-text-meta" style={{ fontSize: '14px', opacity: 0.6, maxWidth: '480px', lineHeight: 1.5 }}>
                        {isMentor 
                          ? `You are certifying ${ratingResource.title} as high-quality study material for campus-wide use.`
                          : `These insights are provided by verified mentors to help you master the core concepts of this material.`}
                      </p>
                    </div>
                    <button 
                      className="premium-button-secondary" 
                      style={{ 
                        width: '40px', 
                        height: '40px', 
                        padding: 0, 
                        borderRadius: '12px', 
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)'
                      }} 
                      onClick={() => setShowEndorsements(false)}
                    >
                      <X size={20} />
                    </button>
                  </div>
                </header>

                <div style={{ padding: '40px 48px' }}>
                  {isMentor ? (
                    <div className="flex-column gap-32">
                      <div className="flex-column gap-20">
                        <label className="premium-text-meta" style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          Rate Material Accuracy & Quality
                        </label>
                        <div className="flex-row gap-16 justify-center">
                          {[1, 2, 3, 4, 5].map((value) => {
                            const active = value <= (ratingResource.userRating || 0);
                            return (
                              <button
                                key={value}
                                onClick={() => handleRateResource(ratingResource.id, value, mentorComment)}
                                style={{
                                  width: '64px',
                                  height: '64px',
                                  borderRadius: '18px',
                                  border: active ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                                  background: active ? 'rgba(46, 230, 166, 0.1)' : 'rgba(255,255,255,0.02)',
                                  color: active ? 'var(--accent)' : 'rgba(255,255,255,0.3)',
                                  display: 'grid',
                                  placeItems: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                  boxShadow: active ? '0 0 20px rgba(46, 230, 166, 0.2)' : 'none'
                                }}
                                onMouseEnter={(e) => {
                                  if (!active) e.currentTarget.style.borderColor = 'rgba(46, 230, 166, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                  if (!active) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                }}
                              >
                                <Star size={28} fill={active ? 'currentColor' : 'none'} />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex-column gap-12">
                        <label className="premium-text-meta" style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          Expert Tip / Key Takeaway
                        </label>
                        <div style={{ position: 'relative' }}>
                          <textarea 
                            className="premium-select" 
                            placeholder="e.g. Focus specifically on the derivation in Unit 2, it's a common exam favorite."
                            style={{ 
                              minHeight: '140px', 
                              background: 'rgba(255,255,255,0.02)', 
                              fontSize: '15px', 
                              lineHeight: 1.6,
                              padding: '20px',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '20px'
                            }}
                            value={mentorComment}
                            onChange={(e) => setMentorComment(e.target.value)}
                          />
                        </div>
                      </div>

                      <button 
                         className="premium-button" 
                         style={{ width: '100%', height: '56px', borderRadius: '18px', fontSize: '16px' }} 
                         onClick={() => setShowEndorsements(false)}
                      >
                        <CheckCircle size={20} style={{ color: '#000' }} />
                        <span>Confirm Expert Endorsement</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex-column gap-24">
                      {endorsementsLoading ? (
                        <div className="flex-column items-center justify-center py-40 gap-16" style={{ opacity: 0.5 }}>
                          <Bot size={40} className="pulse" />
                          <span className="premium-text-meta">Syncing with mentor network...</span>
                        </div>
                      ) : endorsements.length > 0 ? (
                        <div className="flex-column gap-20">
                          {endorsements.map((review, idx) => (
                            <div 
                              key={idx} 
                              className="premium-card flex-column gap-20" 
                              style={{ 
                                background: 'rgba(255,255,255,0.03)', 
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '24px',
                                padding: '24px'
                              }}
                            >
                              <div className="flex-row justify-between items-center">
                                <div className="flex-row gap-14 items-center">
                                  <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'var(--accent)', color: '#000', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: '18px' }}>
                                    {review.userName?.[0] || 'M'}
                                  </div>
                                  <div className="flex-column gap-2">
                                    <div className="flex-row gap-8 items-center">
                                      <span className="premium-text-h3" style={{ fontSize: '16px', margin: 0, fontWeight: 700 }}>{review.userName}</span>
                                      <div style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(46, 230, 166, 0.1)', color: 'var(--accent)', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>
                                        Expert
                                      </div>
                                    </div>
                                    <span className="premium-text-meta" style={{ fontSize: '12px', opacity: 0.6 }}>{review.userRole}</span>
                                  </div>
                                </div>
                                <div className="flex-row gap-6 items-center" style={{ background: 'rgba(212, 175, 55, 0.08)', padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(212, 175, 55, 0.15)' }}>
                                  <Star size={14} fill="var(--gold)" color="var(--gold)" />
                                  <strong style={{ fontSize: '16px', color: 'var(--gold)' }}>{review.rating}</strong>
                                </div>
                              </div>
                              
                              {review.comment && (
                                <div style={{ position: 'relative', paddingLeft: '16px', borderLeft: '3px solid var(--accent)' }}>
                                  <p className="premium-text-body" style={{ fontSize: '14px', lineHeight: 1.6, opacity: 0.9, margin: 0 }}>
                                    "{review.comment}"
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div 
                          className="flex-column items-center justify-center py-60 gap-16" 
                          style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}
                        >
                          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'grid', placeItems: 'center', opacity: 0.5 }}>
                            <GraduationCap size={32} />
                          </div>
                          <div className="flex-column items-center gap-4">
                            <span className="premium-text-body" style={{ fontWeight: 600 }}>No Expert Reviews Yet</span>
                            <span className="premium-text-meta" style={{ opacity: 0.5 }}>Mentors will periodically review and rate this material.</span>
                          </div>
                        </div>
                      )}

                      <footer className="flex-row gap-10 items-center justify-center pt-8">
                        <div style={{ padding: '6px 16px', borderRadius: '99px', background: 'rgba(46, 230, 166, 0.05)', border: '1px solid rgba(46, 230, 166, 0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle size={14} color="var(--accent)" />
                          <span className="premium-text-meta" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CampusIQ Verified Learning Path</span>
                        </div>
                      </footer>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </>
      )}
      {/* PDF Expansion Modal */}
      {isPdfExpanded && selectedResource?.fileUrl && (
        <PDFPreviewModal 
          pdfUrl={selectedResource.fileUrl} 
          title={selectedResource.title} 
          onClose={() => setPdfExpanded(false)} 
        />
      )}

    </div>
  );
};

export default ResourceHub;
