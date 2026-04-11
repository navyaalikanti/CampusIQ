import { useEffect } from 'react';
import { X, FileText } from 'lucide-react';

const PDFPreviewModal = ({ pdfUrl, title, onClose }) => {
  useEffect(() => {
    // Prevent background scrolling while modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div 
      className="fade-in"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(10, 15, 26, 0.85)',
        backdropFilter: 'blur(16px)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
      onClick={(e) => {
        // If clicking exactly on the overlay background, close it
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '1200px',
          height: '100%',
          maxHeight: '90vh',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 30px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          transform: 'translateY(0)',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div 
          style={{
            padding: '16px 24px',
            backgroundColor: '#0f172a',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'rgba(46, 230, 166, 0.15)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
              <FileText size={18} />
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.02em' }}>
              {title || 'Document Preview'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            title="Close Preview"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
              color: '#cbd5e1',
              padding: '8px',
              borderRadius: '8px',
              display: 'grid',
              placeItems: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = '#cbd5e1';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <X size={20} />
          </button>
        </div>
        
        <iframe 
          src={pdfUrl} 
          style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
          title={title}
        />
      </div>
    </div>
  );
};

export default PDFPreviewModal;
