'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, Plus, Filter, ShieldCheck, AlertTriangle,
  Calendar, Building2, Cpu, Pencil, Check, Clock, Users,
  FileText, ArrowUpRight,
} from 'lucide-react';

const API = 'http://localhost:8000';

interface DashboardItem {
  case_id: string;
  case_number: string;
  court: string;
  order_date: string;
  directive_id: string;
  directive_text: string;
  action_required: string;
  deadline: string;
  responsible_department: string;
  confidence: number;
  verification_status: string;
}

export default function DashboardPage() {
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState('All');
  const [filterAction, setFilterAction] = useState('All');

  useEffect(() => {
    fetch(`${API}/api/dashboard`)
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const departments = ['All', ...Array.from(new Set(items.map((i) => i.responsible_department)))];
  const actions = ['All', 'comply', 'appeal'];

  const filtered = items.filter((item) => {
    const deptMatch = filterDept === 'All' || item.responsible_department === filterDept;
    const actionMatch = filterAction === 'All' || item.action_required === filterAction;
    return deptMatch && actionMatch;
  });

  const stats = {
    total: items.length,
    comply: items.filter((i) => i.action_required === 'comply').length,
    appeal: items.filter((i) => i.action_required === 'appeal').length,
    depts: new Set(items.map((i) => i.responsible_department)).size,
  };

  const deadlineColor = (deadline: string) => {
    if (deadline === 'not specified') return 'var(--text-muted)';
    const lower = deadline.toLowerCase();
    if (lower.includes('immediately') || lower.includes('urgently') || lower.includes('14 days')) return 'var(--danger)';
    if (lower.includes('30 days') || lower.includes('60 days')) return 'var(--warning)';
    return 'var(--text-primary)';
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="spinner" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--success)' }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--success)' }}>Verified Records Only</span>
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Action Dashboard
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Showing {filtered.length} approved action{filtered.length !== 1 ? 's' : ''} — all human-verified
          </p>
        </div>
        <Link href="/" className="btn-primary flex items-center gap-1.5">
          <Plus size={16} /> New Judgment
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Actions', value: stats.total, color: 'var(--accent)', icon: <LayoutDashboard size={18} /> },
          { label: 'Comply', value: stats.comply, color: 'var(--success)', icon: <ShieldCheck size={18} /> },
          { label: 'Appeal', value: stats.appeal, color: 'var(--danger)', icon: <AlertTriangle size={18} /> },
          { label: 'Departments', value: stats.depts, color: 'var(--warning)', icon: <Building2 size={18} /> },
        ].map((s, i) => (
          <div key={s.label} className="card p-5 stat-card" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: `${s.color}15`, color: s.color }}>
                {s.icon}
              </div>
            </div>
            <div className="text-3xl font-bold mb-0.5" style={{ color: s.color, fontFamily: 'var(--font-heading)' }}>{s.value}</div>
            <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          <Filter size={12} /> Filter by:
        </div>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg cursor-pointer"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'var(--font-body)' }}
        >
          {departments.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg cursor-pointer"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'var(--font-body)' }}
        >
          {actions.map((a) => <option key={a}>{a}</option>)}
        </select>
      </div>

      {/* Action Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 card">
          <FileText size={40} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <div className="font-semibold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>No verified actions yet</div>
          <div className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Upload a judgment and complete verification to see actions here.
          </div>
          <Link href="/" className="btn-primary inline-flex items-center gap-1.5">
            <Plus size={16} /> Upload Judgment
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div
              key={`${item.case_id}-${item.directive_id}`}
              className="card p-5"
              style={{
                borderColor: item.action_required === 'comply' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
              }}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge" style={{
                    background: item.action_required === 'comply' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                    color: item.action_required === 'comply' ? 'var(--success)' : 'var(--danger)',
                  }}>
                    {item.action_required === 'comply' ? <ShieldCheck size={10} /> : <AlertTriangle size={10} />}
                    {item.action_required.toUpperCase()}
                  </span>
                  <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                    {item.case_number}
                  </span>
                  <span className="badge" style={{
                    background: item.verification_status === 'edited' ? 'rgba(59,130,246,0.12)' : 'rgba(16,185,129,0.08)',
                    color: item.verification_status === 'edited' ? 'var(--info)' : 'var(--success)',
                  }}>
                    {item.verification_status === 'edited' ? <><Pencil size={10} /> Officer Edited</> : <><Check size={10} /> Verified</>}
                  </span>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs mb-0.5 flex items-center gap-1 justify-end" style={{ color: 'var(--text-muted)' }}>
                    <Calendar size={10} /> Order Date
                  </div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{item.order_date}</div>
                </div>
              </div>

              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-primary)' }}>{item.directive_text}</p>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
                  <div className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                    <Clock size={10} /> Deadline
                  </div>
                  <div className="text-sm font-bold" style={{ color: deadlineColor(item.deadline) }}>
                    {item.deadline}
                  </div>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
                  <div className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                    <Building2 size={10} /> Department
                  </div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.responsible_department}</div>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
                  <div className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                    <Cpu size={10} /> AI Confidence
                  </div>
                  <div className="text-sm font-bold" style={{
                    color: item.confidence >= 0.8 ? 'var(--success)' : item.confidence >= 0.6 ? 'var(--warning)' : 'var(--danger)',
                  }}>
                    {Math.round(item.confidence * 100)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
