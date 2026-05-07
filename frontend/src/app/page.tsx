'use client';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, FileText, Search, ClipboardCheck, CheckCircle2,
  AlertTriangle, Loader2, Server, ArrowRight, Clock, Building2,
  Zap,
} from 'lucide-react';

const API = 'http://localhost:8000';

interface CCMSCase {
  ccms_id: string;
  case_number: string;
  court: string;
  filing_date: string;
  petitioner: string;
  respondent: string;
  subject: string;
  pages: number;
  priority: string;
}

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'error'>('idle');
  const [error, setError] = useState('');
  const [ccmsCases, setCcmsCases] = useState<CCMSCase[]>([]);
  const [ccmsLoading, setCcmsLoading] = useState(false);
  const [ccmsFetched, setCcmsFetched] = useState(false);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith('.pdf')) setFile(dropped);
  }, []);

  const fetchCCMS = async () => {
    setCcmsLoading(true);
    try {
      const res = await fetch(`${API}/api/ccms/pending`);
      const data = await res.json();
      setCcmsCases(data.cases || []);
      setCcmsFetched(true);
    } catch {
      setError('Could not connect to CCMS');
    }
    setCcmsLoading(false);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setError('');
    setStatus('uploading');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch(`${API}/api/upload`, { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.detail || 'Upload failed');

      setStatus('analyzing');
      const analyzeRes = await fetch(`${API}/api/analyze/${uploadData.case_id}`, { method: 'POST' });
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeData.detail || 'Analysis failed');

      router.push(`/cases/${uploadData.case_id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStatus('error');
    }
  };

  const isLoading = status === 'uploading' || status === 'analyzing';

  const priorityStyles: Record<string, { bg: string; color: string }> = {
    critical: { bg: 'rgba(239,68,68,0.12)', color: 'var(--danger)' },
    high: { bg: 'rgba(245,158,11,0.12)', color: 'var(--warning)' },
    medium: { bg: 'rgba(59,130,246,0.12)', color: 'var(--info)' },
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
            <Server size={10} />
            Karnataka CCMS
          </span>
          <ArrowRight size={12} />
          <span style={{ color: 'var(--accent)' }} className="font-semibold">NyayaBot</span>
        </div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Upload Court Judgment
        </h1>
        <p style={{ color: 'var(--text-secondary)' }} className="text-base leading-relaxed max-w-2xl">
          Upload a Karnataka High Court judgment PDF. NyayaBot extracts key directives,
          generates an action plan, and routes it for officer verification — entirely on-premise.
        </p>
      </div>

      {/* CCMS Fetch Section */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
              <Server size={18} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>CCMS Auto-Fetch</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Pull pending judgments from Court Case Monitoring System</div>
            </div>
          </div>
          <button
            onClick={fetchCCMS}
            disabled={ccmsLoading}
            className="btn-secondary flex items-center gap-2"
          >
            {ccmsLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            {ccmsLoading ? 'Fetching...' : ccmsFetched ? 'Refresh' : 'Fetch Pending'}
          </button>
        </div>

        {ccmsFetched && ccmsCases.length > 0 && (
          <div className="space-y-2">
            {ccmsCases.map((c) => (
              <div
                key={c.ccms_id}
                className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-150"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{c.case_number}</span>
                    <span className="badge" style={priorityStyles[c.priority] || priorityStyles.medium}>
                      {c.priority}
                    </span>
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{c.subject}</div>
                  <div className="text-xs mt-1 flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1"><Building2 size={10} /> {c.respondent}</span>
                    <span className="flex items-center gap-1"><FileText size={10} /> {c.pages} pages</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {c.filing_date}</span>
                  </div>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0 ml-4" />
              </div>
            ))}
            <div className="text-xs text-center pt-2" style={{ color: 'var(--text-muted)' }}>
              Select a case or upload your own PDF below
            </div>
          </div>
        )}

        {ccmsFetched && ccmsCases.length === 0 && (
          <div className="text-center py-4 text-xs" style={{ color: 'var(--text-muted)' }}>No pending cases from CCMS</div>
        )}
      </div>

      {/* Upload Box */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !isLoading && document.getElementById('pdf-input')?.click()}
        className="rounded-xl p-10 text-center cursor-pointer transition-all duration-200"
        style={{
          border: `2px dashed ${dragging ? 'var(--accent)' : file ? 'var(--success)' : 'var(--border)'}`,
          background: dragging ? 'var(--accent-muted)' : 'var(--surface)',
          borderRadius: 'var(--radius-xl)',
        }}
      >
        <input
          id="pdf-input"
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
        />

        {file ? (
          <div>
            <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.1)' }}>
              <FileText size={28} style={{ color: 'var(--success)' }} />
            </div>
            <div className="font-semibold text-base mb-1" style={{ color: 'var(--text-primary)' }}>{file.name}</div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {(file.size / 1024 / 1024).toFixed(2)} MB · Click to change
            </div>
          </div>
        ) : (
          <div>
            <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'var(--surface-2)' }}>
              <Upload size={28} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className="font-semibold text-base mb-2" style={{ color: 'var(--text-primary)' }}>
              Drop your judgment PDF here
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              or click to browse · Supports HC/KAT judgment copies
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="mt-5 card p-4">
          <div className="flex items-center gap-3">
            <div className="spinner" />
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {status === 'uploading' ? 'Uploading PDF...' : 'Analyzing with Llama 3.2 (on-premise)...'}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {status === 'analyzing' ? 'Extracting case details, directives, and timelines. This takes 20–60 seconds.' : 'Extracting text from document...'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-lg p-4 flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle size={16} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--danger)' }}>{error}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Make sure backend is running on port 8000 and Ollama is active.</div>
          </div>
        </div>
      )}

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={!file || isLoading}
        className="btn-primary mt-5 w-full flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <><Loader2 size={16} className="animate-spin" /> Processing...</>
        ) : (
          <><Search size={16} /> Analyze Judgment</>
        )}
      </button>

      {/* Pipeline Steps */}
      <div className="mt-10 grid grid-cols-3 gap-4">
        {[
          { icon: <Search size={22} />, title: 'Extract', desc: 'Case details, directives, parties & timelines' },
          { icon: <ClipboardCheck size={22} />, title: 'Action Plan', desc: 'Comply or appeal, deadline, responsible dept' },
          { icon: <CheckCircle2 size={22} />, title: 'Verify', desc: 'Officer reviews & approves before dashboard' },
        ].map((item) => (
          <div key={item.title} className="card p-5">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
              style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
              {item.icon}
            </div>
            <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>{item.title}</div>
            <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
