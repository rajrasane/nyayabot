'use client';
import { useEffect, useState } from 'react';
import {
  Activity, FileText, ShieldCheck, Check, X, Pencil, Cpu,
  Upload, Clock, ArrowUpRight, User,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface AuditEntry {
  id: number;
  case_id: string;
  case_number: string;
  action: string;
  directive_id: string;
  officer: string;
  details: string;
  timestamp: string;
}

const actionConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pdf_uploaded:           { icon: <Upload size={13} />,      color: 'var(--info)',    label: 'PDF Uploaded' },
  ai_analysis_complete:   { icon: <Cpu size={13} />,         color: 'var(--accent)',  label: 'AI Analysis Complete' },
  directive_approved:     { icon: <Check size={13} />,       color: 'var(--success)', label: 'Directive Approved' },
  directive_edited:       { icon: <Pencil size={13} />,      color: 'var(--info)',    label: 'Directive Edited' },
  directive_rejected:     { icon: <X size={13} />,           color: 'var(--danger)',  label: 'Directive Rejected' },
  verification_complete:  { icon: <ShieldCheck size={13} />, color: 'var(--success)', label: 'Verification Complete' },
};

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/audit`)
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.entries || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      });
    } catch { return ts; }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="spinner" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1.5">
          <Activity size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Full Audit Trail</span>
        </div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          System Activity Log
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Every action is logged with timestamp, officer identity, and case reference. Nothing is automated without audit.
        </p>
      </div>

      {/* Stats bar */}
      <div className="card p-4 mb-6 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
            <FileText size={15} />
          </div>
          <div>
            <div className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>{entries.length}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Events</div>
          </div>
        </div>
        <div className="h-8 w-px" style={{ background: 'var(--border-subtle)' }} />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--success)' }}>
            <Check size={15} />
          </div>
          <div>
            <div className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
              {entries.filter(e => e.action === 'directive_approved').length}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Approvals</div>
          </div>
        </div>
        <div className="h-8 w-px" style={{ background: 'var(--border-subtle)' }} />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger)' }}>
            <X size={15} />
          </div>
          <div>
            <div className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
              {entries.filter(e => e.action === 'directive_rejected').length}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Rejections</div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {entries.length === 0 ? (
        <div className="text-center py-16 card">
          <Activity size={40} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <div className="font-semibold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>No activity yet</div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Upload and verify a judgment to see the audit trail.
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {entries.map((entry, i) => {
            const cfg = actionConfig[entry.action] || { icon: <Activity size={13} />, color: 'var(--text-muted)', label: entry.action };
            return (
              <div key={entry.id} className="flex gap-4 py-3 px-4 rounded-lg transition-colors duration-150"
                style={{ background: i % 2 === 0 ? 'var(--surface)' : 'transparent' }}>

                {/* Icon */}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${cfg.color}15`, color: cfg.color }}>
                  {cfg.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {cfg.label}
                    </span>
                    {entry.case_number && (
                      <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                        {entry.case_number}
                      </span>
                    )}
                    {entry.directive_id && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {entry.directive_id}
                      </span>
                    )}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {entry.details}
                  </div>
                </div>

                {/* Meta */}
                <div className="text-right flex-shrink-0">
                  <div className="text-xs flex items-center gap-1 justify-end mb-0.5" style={{ color: 'var(--text-muted)' }}>
                    <User size={10} /> {entry.officer}
                  </div>
                  <div className="text-xs flex items-center gap-1 justify-end" style={{ color: 'var(--text-muted)' }}>
                    <Clock size={10} /> {formatTime(entry.timestamp)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
