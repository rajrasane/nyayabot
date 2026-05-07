'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Check, X, Pencil, ChevronLeft, ChevronRight, ArrowRight, ArrowLeft,
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
    <div className="h-[calc(100vh-57px)] flex bg-slate-100">

      {/* LEFT — PDF Viewer (55%) */}
      <div className="flex flex-col w-[55%] border-r border-slate-200 bg-white">
        {/* We can keep a tiny indicator of the page, or remove it entirely. Let's keep it minimal if needed, or just iframe. */}
        <iframe
          key={pdfUrl}
          src={pdfUrl}
          className="flex-1 w-full h-full"
          style={{ border: 'none' }}
          title="Judgment PDF"
        />
      </div>

      {/* RIGHT — Verification Panel (45%) */}
      <div className="w-[45%] flex flex-col bg-white shadow-sm z-10">

        {/* Top Header Section */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Link href="/" className="hover:text-slate-800 transition-colors">Cases</Link>
              <ChevronRight size={12} />
              <span className="text-slate-800 font-medium">Verify Compliance Directives</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="font-semibold text-slate-900 font-serif text-lg flex items-center gap-2">
              <ShieldCheck size={18} className="text-slate-700" />
              Case No. {caseInfo?.case_number}
            </div>
          </div>
        </div>

          {/* Navigation Tabs - Formal */}
          <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50">
            {directives.map((d, i) => {
              const s = verifications[d.id]?.status || 'pending';
              const isCurrent = currentPage === i + 1;
              return (
                <button
                  key={`tab-${d.id}`}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    isCurrent 
                      ? 'border-slate-900 text-slate-900 bg-white' 
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Directive {i + 1}
                  {s === 'approved' && <Check size={14} className="text-emerald-600" />}
                  {s === 'edited' && <Pencil size={14} className="text-blue-600" />}
                  {s === 'rejected' && <X size={14} className="text-red-600" />}
                </button>
              );
            })}
          </div>

          {/* Active Directive Form */}
          {currentDirective && (
            <div className="flex-1 overflow-y-auto p-6">
              
              <div className="mb-6 pb-4 border-b border-slate-100">
                <h3 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-2">Extracted Text</h3>
                {editingId === currentDirective.id ? (
                  <textarea
                    className="w-full text-sm p-3 border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 focus:border-slate-900 resize-none font-serif leading-relaxed text-slate-900"
                    rows={5}
                    defaultValue={currentDirective.text}
                    onChange={(e) => updateEdit(currentDirective.id, 'edited_text', e.target.value)}
                  />
                ) : (
                  <div className="text-sm leading-relaxed p-4 bg-slate-50 border border-slate-200 rounded font-serif text-slate-900">
                    {verifications[currentDirective.id]?.edited_text || currentDirective.text}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-500 font-semibold block mb-2">Action Required</label>
                  {editingId === currentDirective.id ? (
                    <select
                      className="w-full text-sm p-2.5 border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 focus:border-slate-900 text-slate-900"
                      defaultValue={currentDirective.action_required}
                      onChange={(e) => updateEdit(currentDirective.id, 'edited_action', e.target.value)}
                    >
                      <option value="comply">Comply</option>
                      <option value="appeal">Appeal</option>
                    </select>
                  ) : (
                    <div className="text-sm p-2.5 bg-slate-50 border border-slate-200 rounded font-medium text-slate-900 flex items-center gap-2">
                      {currentDirective.action_required === 'comply' ? <ShieldCheck size={16} className="text-slate-400" /> : <AlertTriangle size={16} className="text-slate-400" />}
                      <span className="uppercase">{verifications[currentDirective.id]?.edited_action || currentDirective.action_required}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-500 font-semibold block mb-2">Confidence</label>
                  <div className="text-sm p-2.5 bg-slate-50 border border-slate-200 rounded font-medium text-slate-900 flex items-center gap-2">
                    <Cpu size={16} className="text-slate-400" />
                    {Math.round(currentDirective.confidence * 100)}%
                  </div>
                </div>
              </div>

              <div className="space-y-6 mb-8">
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-500 font-semibold flex items-center gap-1.5 mb-2">
                    <Calendar size={14} /> Compliance Deadline
                  </label>
                  {editingId === currentDirective.id ? (
                    <input type="text" className="w-full text-sm p-2.5 border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 focus:border-slate-900 text-slate-900"
                      defaultValue={currentDirective.deadline}
                      onChange={(e) => updateEdit(currentDirective.id, 'edited_deadline', e.target.value)}
                    />
                  ) : (
                    <div className="text-sm p-2.5 bg-slate-50 border border-slate-200 rounded font-medium text-slate-900">
                      {verifications[currentDirective.id]?.edited_deadline || currentDirective.deadline}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-500 font-semibold flex items-center gap-1.5 mb-2">
                    <Building2 size={14} /> Assigned Department
                  </label>
                  {editingId === currentDirective.id ? (
                    <input type="text" className="w-full text-sm p-2.5 border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 focus:border-slate-900 text-slate-900"
                      defaultValue={currentDirective.responsible_department}
                      onChange={(e) => updateEdit(currentDirective.id, 'edited_department', e.target.value)}
                    />
                  ) : (
                    <div className="text-sm p-2.5 bg-slate-50 border border-slate-200 rounded font-medium text-slate-900">
                      {verifications[currentDirective.id]?.edited_department || currentDirective.responsible_department}
                    </div>
                  )}
                </div>
              </div>

            {/* Action Buttons - Formal Group */}
            <div className="border-t border-slate-200 pt-6 mt-auto">
              <label className="text-xs uppercase tracking-widest text-slate-500 font-semibold block mb-3 text-center">Officer Verification Decision</label>
              <div className="flex gap-3 mb-6">
                <button onClick={() => setStatus(currentDirective.id, 'approved')}
                  className={`flex-1 py-2.5 rounded text-sm font-medium flex items-center justify-center gap-2 border transition-colors ${
                    verifications[currentDirective.id]?.status === 'approved' 
                      ? 'bg-emerald-600 text-white border-emerald-600' 
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                  }`}>
                  <Check size={16} /> Approve
                </button>
                <button onClick={() => editingId === currentDirective.id ? setEditingId(null) : startEdit(currentDirective.id)}
                  className={`flex-1 py-2.5 rounded text-sm font-medium flex items-center justify-center gap-2 border transition-colors ${
                    verifications[currentDirective.id]?.status === 'edited' || editingId === currentDirective.id
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                  }`}>
                  <Pencil size={16} /> {editingId === currentDirective.id ? 'Save Edits' : 'Edit'}
                </button>
                <button onClick={() => setStatus(currentDirective.id, 'rejected')}
                  className={`flex-1 py-2.5 rounded text-sm font-medium flex items-center justify-center gap-2 border transition-colors ${
                    verifications[currentDirective.id]?.status === 'rejected' 
                      ? 'bg-red-600 text-white border-red-600' 
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                  }`}>
                  <X size={16} /> Reject
                </button>
              </div>

              {/* Navigation / Finalize Buttons at Bottom Center */}
              <div className="flex justify-center gap-4 border-t border-slate-100 pt-5">
                {currentPage > 1 && (
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 py-2.5 px-6 rounded-full transition-colors"
                  >
                    <ArrowLeft size={16} /> Previous
                  </button>
                )}
                
                {currentPage < directives.length ? (
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 py-2.5 px-6 rounded-full transition-colors"
                  >
                    Next Directive <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={!allReviewed || saving || approvedCount === 0}
                    className="flex items-center gap-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 py-2.5 px-8 rounded-full transition-colors shadow-sm"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? 'Saving...' : `Finalize & Submit (${approvedCount}/${directives.length})`}
                  </button>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
