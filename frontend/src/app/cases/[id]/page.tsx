'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, ArrowLeft, FileText, Users, Calendar, BookOpen,
  ShieldCheck, AlertTriangle, ChevronRight, Cpu, Hash, Search,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface Directive {
  id: string;
  text: string;
  page_number: number;
  action_required: 'comply' | 'appeal';
  deadline: string;
  responsible_department: string;
  confidence: number;
  verification_status: string;
}

interface Extraction {
  case_number: string;
  court: string;
  order_date: string;
  petitioner: string;
  respondent: string;
  summary: string;
  directives: Directive[];
}

interface Case {
  case_id: string;
  filename: string;
  status: string;
  extraction: Extraction | null;
}

export default function CasePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/api/cases/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setCaseData(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load case');
        setLoading(false);
      });
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="spinner mx-auto mb-3" />
        <div style={{ color: 'var(--text-secondary)' }} className="text-sm">Loading case...</div>
      </div>
    </div>
  );

  if (error || !caseData?.extraction) return (
    <div className="max-w-2xl mx-auto px-6 py-12 text-center">
      <AlertTriangle size={40} className="mx-auto mb-4" style={{ color: 'var(--danger)' }} />
      <div style={{ color: 'var(--danger)' }} className="font-medium">{error || 'No extraction data found'}</div>
      <Link href="/" className="mt-4 inline-flex items-center gap-1 text-sm" style={{ color: 'var(--accent)' }}>
        <ArrowLeft size={14} /> Upload a new judgment
      </Link>
    </div>
  );

  const { extraction } = caseData;
  const directives = extraction.directives || [];

  const confidenceColor = (c: number) =>
    c >= 0.8 ? 'var(--success)' : c >= 0.6 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
        <Link href="/" style={{ color: 'var(--accent)' }} className="hover:underline">Upload</Link>
        <ChevronRight size={12} />
        <span style={{ color: 'var(--text-primary)' }} className="font-medium">Extraction Results</span>
        <ChevronRight size={12} />
        <span>Verification</span>
        <ChevronRight size={12} />
        <span>Dashboard</span>
      </div>

      {/* Case Header */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--accent)' }}>
              Case Identified
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{extraction.case_number}</h1>
            <div className="text-sm mt-1 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <BookOpen size={13} />
              {extraction.court}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs mb-1 flex items-center gap-1 justify-end" style={{ color: 'var(--text-muted)' }}>
              <Calendar size={11} /> Order Date
            </div>
            <div className="font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>{extraction.order_date}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
            <div className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <Users size={11} /> Petitioner
            </div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{extraction.petitioner}</div>
          </div>
          <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
            <div className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <Users size={11} /> Respondent
            </div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{extraction.respondent}</div>
          </div>
        </div>

        {extraction.summary && (
          <div className="rounded-lg p-4" style={{ background: 'var(--surface-2)', borderLeft: '3px solid var(--accent)' }}>
            <div className="text-xs mb-1.5 font-semibold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
              <Cpu size={11} /> AI Summary
            </div>
            <div className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{extraction.summary}</div>
          </div>
        )}
      </div>

      {/* Directives */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Extracted Directives
          </h2>
          <div className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {directives.length} directive{directives.length !== 1 ? 's' : ''} found · Review before verification
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
          <Cpu size={12} style={{ color: 'var(--accent)' }} />
          <span>Llama 3.2</span>
          <span>·</span>
          <span>{caseData.filename}</span>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        {directives.map((d, i) => (
          <div key={`${d.id}-${i}`} className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                  <Hash size={10} /> {i + 1}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider" style={{
                  background: d.action_required === 'comply' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                  color: d.action_required === 'comply' ? 'var(--success)' : 'var(--danger)',
                }}>
                  {d.action_required === 'comply' ? <ShieldCheck size={10} /> : <AlertTriangle size={10} />}
                  {d.action_required}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                  <FileText size={10} /> Page {d.page_number}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Confidence</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'var(--surface-2)', color: confidenceColor(d.confidence) }}>
                  {Math.round(d.confidence * 100)}%
                </span>
              </div>
            </div>

            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-primary)' }}>{d.text}</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
                <div className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <Calendar size={10} /> Deadline
                </div>
                <div className="text-sm font-medium" style={{ color: d.deadline === 'not specified' ? 'var(--text-muted)' : 'var(--warning)' }}>
                  {d.deadline}
                </div>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
                <div className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <Users size={10} /> Responsible Department
                </div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{d.responsible_department}</div>
              </div>
            </div>
          </div>
        ))}

        {directives.length === 0 && (
          <div className="text-center py-12 card">
            <Search size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <div style={{ color: 'var(--text-secondary)' }}>No directives extracted. The PDF may be scanned or the model needs more context.</div>
          </div>
        )}
      </div>

      {/* Proceed Button */}
      {directives.length > 0 && (
        <div className="flex justify-end gap-3">
          <Link href="/" className="btn-secondary">
            Upload Another
          </Link>
          <button
            onClick={() => router.push(`/cases/${id}/verify`)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md flex items-center gap-2"
          >
            Proceed to Verification <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
