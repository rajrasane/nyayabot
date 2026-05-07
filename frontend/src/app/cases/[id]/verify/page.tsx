'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Check, X, Pencil, ChevronLeft, ChevronRight, ArrowRight,
  FileText, ShieldCheck, AlertTriangle, Cpu, Calendar, Building2,
  Save, Loader2,
} from 'lucide-react';

const API = 'http://localhost:8000';

interface Directive {
  id: string;
  text: string;
  page_number: number;
  action_required: string;
  deadline: string;
  responsible_department: string;
  confidence: number;
  verification_status: string;
}

interface VerificationState {
  [directiveId: string]: {
    status: 'pending' | 'approved' | 'edited' | 'rejected';
    edited_text?: string;
    edited_deadline?: string;
    edited_department?: string;
    edited_action?: string;
  };
}

export default function VerifyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [directives, setDirectives] = useState<Directive[]>([]);
  const [caseInfo, setCaseInfo] = useState<{ case_number: string } | null>(null);
  const [verifications, setVerifications] = useState<VerificationState>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetch(`${API}/api/cases/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const dirs = data.extraction?.directives || [];
        setDirectives(dirs);
        setCaseInfo({ case_number: data.extraction?.case_number || '' });
        const init: VerificationState = {};
        dirs.forEach((d: Directive) => { init[d.id] = { status: 'pending' }; });
        setVerifications(init);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const setStatus = (id: string, status: 'approved' | 'rejected') => {
    setVerifications((prev) => ({ ...prev, [id]: { ...prev[id], status } }));
    setEditingId(null);
  };

  const startEdit = (id: string) => {
    setEditingId(id);
    setVerifications((prev) => ({ ...prev, [id]: { ...prev[id], status: 'edited' } }));
  };

  const updateEdit = (id: string, field: string, value: string) => {
    setVerifications((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const allReviewed = directives.every((d) => verifications[d.id]?.status !== 'pending');
  const approvedCount = Object.values(verifications).filter((v) => v.status === 'approved' || v.status === 'edited').length;

  const handleSubmit = async () => {
    setSaving(true);
    const payload = {
      verifications: Object.entries(verifications).map(([directive_id, v]) => ({
        directive_id,
        status: v.status,
        edited_text: v.edited_text,
        edited_deadline: v.edited_deadline,
        edited_department: v.edited_department,
        edited_action: v.edited_action,
      })),
    };
    try {
      await fetch(`${API}/api/verify/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      router.push('/dashboard');
    } catch {
      setSaving(false);
    }
  };

  const statusConfig: Record<string, { bg: string; color: string; label: string; icon: React.ReactNode }> = {
    pending:  { bg: 'rgba(122,139,168,0.1)', color: 'var(--text-muted)', label: 'Pending', icon: null },
    approved: { bg: 'rgba(16,185,129,0.12)', color: 'var(--success)', label: 'Approved', icon: <Check size={10} /> },
    edited:   { bg: 'rgba(59,130,246,0.12)', color: 'var(--info)', label: 'Edited', icon: <Pencil size={10} /> },
    rejected: { bg: 'rgba(239,68,68,0.12)', color: 'var(--danger)', label: 'Rejected', icon: <X size={10} /> },
  };

  const statusBadge = (status: string) => {
    const s = statusConfig[status] || statusConfig.pending;
    return (
      <span className="badge" style={{ background: s.bg, color: s.color }}>
        {s.icon} {s.label}
      </span>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="spinner" />
    </div>
  );

  const currentDirective = directives[currentPage - 1];
  const pdfUrl = currentDirective
    ? `${API}/api/pdf/${id}/highlight/${currentDirective.id}#page=${currentDirective.page_number}`
    : `${API}/api/pdf/${id}`;

  return (
    <div className="h-[calc(100vh-57px)] flex flex-col" style={{ background: 'var(--background)' }}>

      {/* Top Bar */}
      <div className="px-6 py-3 flex items-center justify-between"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <div className="flex items-center gap-2 text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>
            <Link href="/" style={{ color: 'var(--accent)' }} className="hover:underline">Upload</Link>
            <ChevronRight size={10} />
            <Link href={`/cases/${id}`} style={{ color: 'var(--accent)' }} className="hover:underline">Results</Link>
            <ChevronRight size={10} />
            <span style={{ color: 'var(--text-primary)' }} className="font-medium">Verify</span>
          </div>
          <div className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', fontSize: '1rem' }}>
            <ShieldCheck size={15} style={{ color: 'var(--accent)' }} />
            Human Verification — {caseInfo?.case_number}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span style={{ color: approvedCount > 0 ? 'var(--success)' : 'var(--text-muted)' }} className="font-bold">{approvedCount}</span>
            <span> / {directives.length} approved</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!allReviewed || saving || approvedCount === 0}
            className="btn-primary flex items-center gap-2 py-2 px-4"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving...' : `Send ${approvedCount} to Dashboard`}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Main Split */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — PDF Viewer (55%) */}
        <div className="flex flex-col" style={{ width: '55%', borderRight: '1px solid var(--border-subtle)' }}>
          <div className="px-4 py-2 text-xs flex items-center gap-2"
            style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
            <FileText size={12} />
            <span>Source PDF — verify AI extraction on the right</span>
            {currentDirective && (
              <span className="ml-auto font-medium flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--warning)' }} />
                Highlighted · Page {currentDirective.page_number}
              </span>
            )}
          </div>
          <iframe
            key={pdfUrl}
            src={pdfUrl}
            className="flex-1 w-full"
            style={{ border: 'none', background: '#fff' }}
            title="Judgment PDF"
          />
        </div>

        {/* RIGHT — Verification Panel (45%) */}
        <div className="flex-1 flex flex-col" style={{ background: 'var(--background)' }}>

          {/* Directive Tabs */}
          <div className="flex overflow-x-auto p-2 gap-1"
            style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface)' }}>
            {directives.map((d, i) => {
              const s = verifications[d.id]?.status || 'pending';
              const cfg = statusConfig[s];
              return (
                <button
                  key={`tab-${d.id}`}
                  onClick={() => setCurrentPage(i + 1)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 flex items-center gap-1 cursor-pointer"
                  style={{
                    background: currentPage === i + 1 ? 'var(--accent)' : 'transparent',
                    color: currentPage === i + 1 ? 'white' : cfg.color,
                  }}
                >
                  #{i + 1} {cfg.icon}
                </button>
              );
            })}
          </div>

          {/* Active Directive */}
          {currentDirective && (
            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-base font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                  Directive #{currentPage}
                </span>
                {statusBadge(verifications[currentDirective.id]?.status || 'pending')}
                <span className="text-xs ml-auto badge" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                  <FileText size={10} /> Page {currentDirective.page_number}
                </span>
              </div>

              <div className="space-y-4 mb-5">
                {/* Directive Text */}
                <div>
                  <div className="text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Directive Text</div>
                  {editingId === currentDirective.id ? (
                    <textarea
                      className="w-full text-sm p-3 rounded-lg resize-none"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--accent)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'var(--font-body)' }}
                      rows={4}
                      defaultValue={currentDirective.text}
                      onChange={(e) => updateEdit(currentDirective.id, 'edited_text', e.target.value)}
                    />
                  ) : (
                    <div className="text-sm leading-relaxed p-3 rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
                      {verifications[currentDirective.id]?.edited_text || currentDirective.text}
                    </div>
                  )}
                </div>

                {/* Action + Confidence */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Action</div>
                    {editingId === currentDirective.id ? (
                      <select
                        className="w-full text-sm p-2.5 rounded-lg cursor-pointer"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--accent)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
                        defaultValue={currentDirective.action_required}
                        onChange={(e) => updateEdit(currentDirective.id, 'edited_action', e.target.value)}
                      >
                        <option value="comply">Comply</option>
                        <option value="appeal">Appeal</option>
                      </select>
                    ) : (
                      <div className="text-sm p-2.5 rounded-lg font-bold uppercase flex items-center gap-1.5" style={{
                        background: currentDirective.action_required === 'comply' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                        color: currentDirective.action_required === 'comply' ? 'var(--success)' : 'var(--danger)',
                      }}>
                        {currentDirective.action_required === 'comply' ? <ShieldCheck size={13} /> : <AlertTriangle size={13} />}
                        {verifications[currentDirective.id]?.edited_action || currentDirective.action_required}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Confidence</div>
                    <div className="text-sm p-2.5 rounded-lg font-bold flex items-center gap-1.5" style={{
                      background: 'var(--surface-2)',
                      color: currentDirective.confidence >= 0.8 ? 'var(--success)' : currentDirective.confidence >= 0.6 ? 'var(--warning)' : 'var(--danger)',
                    }}>
                      <Cpu size={13} />
                      {Math.round(currentDirective.confidence * 100)}%
                    </div>
                  </div>
                </div>

                {/* Deadline */}
                <div>
                  <div className="text-xs font-semibold mb-1.5 uppercase tracking-widest flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                    <Calendar size={10} /> Deadline
                  </div>
                  {editingId === currentDirective.id ? (
                    <input type="text" className="w-full text-sm p-2.5 rounded-lg"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--accent)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', outline: 'none' }}
                      defaultValue={currentDirective.deadline}
                      onChange={(e) => updateEdit(currentDirective.id, 'edited_deadline', e.target.value)}
                    />
                  ) : (
                    <div className="text-sm p-2.5 rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--warning)' }}>
                      {verifications[currentDirective.id]?.edited_deadline || currentDirective.deadline}
                    </div>
                  )}
                </div>

                {/* Department */}
                <div>
                  <div className="text-xs font-semibold mb-1.5 uppercase tracking-widest flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                    <Building2 size={10} /> Department
                  </div>
                  {editingId === currentDirective.id ? (
                    <input type="text" className="w-full text-sm p-2.5 rounded-lg"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--accent)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', outline: 'none' }}
                      defaultValue={currentDirective.responsible_department}
                      onChange={(e) => updateEdit(currentDirective.id, 'edited_department', e.target.value)}
                    />
                  ) : (
                    <div className="text-sm p-2.5 rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
                      {verifications[currentDirective.id]?.edited_department || currentDirective.responsible_department}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button onClick={() => setStatus(currentDirective.id, 'approved')}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-150"
                  style={{
                    background: verifications[currentDirective.id]?.status === 'approved' ? 'var(--success)' : 'rgba(16,185,129,0.1)',
                    color: verifications[currentDirective.id]?.status === 'approved' ? '#fff' : 'var(--success)',
                    border: `1px solid ${verifications[currentDirective.id]?.status === 'approved' ? 'var(--success)' : 'rgba(16,185,129,0.2)'}`,
                  }}>
                  <Check size={14} /> Approve
                </button>
                <button onClick={() => editingId === currentDirective.id ? setEditingId(null) : startEdit(currentDirective.id)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-150"
                  style={{
                    background: verifications[currentDirective.id]?.status === 'edited' ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.08)',
                    color: 'var(--info)',
                    border: `1px solid ${verifications[currentDirective.id]?.status === 'edited' ? 'var(--info)' : 'rgba(59,130,246,0.15)'}`,
                  }}>
                  <Pencil size={14} /> {editingId === currentDirective.id ? 'Done' : 'Edit'}
                </button>
                <button onClick={() => setStatus(currentDirective.id, 'rejected')}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-150"
                  style={{
                    background: verifications[currentDirective.id]?.status === 'rejected' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.08)',
                    color: 'var(--danger)',
                    border: `1px solid ${verifications[currentDirective.id]?.status === 'rejected' ? 'var(--danger)' : 'rgba(239,68,68,0.15)'}`,
                  }}>
                  <X size={14} /> Reject
                </button>
              </div>

              {/* Navigation */}
              <div className="flex justify-between mt-5">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="text-xs px-3 py-1.5 rounded-md disabled:opacity-30 flex items-center gap-1 cursor-pointer"
                  style={{ color: 'var(--text-secondary)', background: 'var(--surface-2)' }}>
                  <ChevronLeft size={12} /> Previous
                </button>
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{currentPage} / {directives.length}</span>
                <button onClick={() => setCurrentPage((p) => Math.min(directives.length, p + 1))} disabled={currentPage === directives.length}
                  className="text-xs px-3 py-1.5 rounded-md disabled:opacity-30 flex items-center gap-1 cursor-pointer"
                  style={{ color: 'var(--text-secondary)', background: 'var(--surface-2)' }}>
                  Next <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
