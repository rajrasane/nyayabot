'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, Plus, Filter, ShieldCheck, AlertTriangle,
  Calendar, Building2, Cpu, Pencil, Check, Clock, Search
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
  const [sortBy, setSortBy] = useState('Newest');

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
  const sortOptions = ['Newest', 'Oldest', 'Department (A-Z)', 'Case Number'];

  let filtered = items.filter((item) => {
    const deptMatch = filterDept === 'All' || item.responsible_department === filterDept;
    const actionMatch = filterAction === 'All' || item.action_required === filterAction;
    return deptMatch && actionMatch;
  });

  if (sortBy === 'Oldest') {
    filtered = [...filtered].reverse();
  } else if (sortBy === 'Department (A-Z)') {
    filtered = [...filtered].sort((a, b) => a.responsible_department.localeCompare(b.responsible_department));
  } else if (sortBy === 'Case Number') {
    filtered = [...filtered].sort((a, b) => a.case_number.localeCompare(b.case_number));
  }

  const stats = {
    total: items.length,
    comply: items.filter((i) => i.action_required === 'comply').length,
    appeal: items.filter((i) => i.action_required === 'appeal').length,
    depts: new Set(items.map((i) => i.responsible_department)).size,
  };

  const deadlineColor = (deadline: string) => {
    if (deadline === 'not specified') return 'text-slate-400';
    const lower = deadline.toLowerCase();
    if (lower.includes('immediately') || lower.includes('urgently') || lower.includes('14 days')) return 'text-red-700 font-bold';
    if (lower.includes('30 days') || lower.includes('60 days')) return 'text-amber-700 font-bold';
    return 'text-slate-900 font-medium';
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-slate-300 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold tracking-widest uppercase rounded-sm">Official Registry</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Human-Verified Records Only</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 font-serif">
            Compliance Action Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right mr-4">
            <div className="text-2xl font-bold text-slate-900 leading-none">{stats.total}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Total Actions</div>
          </div>
          <Link href="/" className="bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-2 px-4 py-2.5 rounded-sm text-sm font-medium transition-colors shadow-sm">
            <Plus size={16} /> New Judgment
          </Link>
        </div>
      </div>

      <div className="flex gap-8">
        
        {/* Left Sidebar: Filters & Stats */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-slate-50 border border-slate-200 p-5 mb-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
              <Filter size={14} /> Filter Records
            </h3>
            
            <div className="mb-4">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Action Type</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full text-sm p-2 border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-slate-500 rounded-sm"
              >
                {actions.map((a) => <option key={a} value={a}>{a.toUpperCase()}</option>)}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Department</label>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-full text-sm p-2 border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-slate-500 rounded-sm"
              >
                {departments.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>

            <div className="pt-6 border-t border-slate-200">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full text-sm p-2 border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-slate-500 rounded-sm"
              >
                {sortOptions.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          <div className="border border-slate-200 divide-y divide-slate-200">
            <div className="p-4 bg-white flex items-center justify-between">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><ShieldCheck size={14} /> Comply</div>
              <div className="text-lg font-bold text-slate-900">{stats.comply}</div>
            </div>
            <div className="p-4 bg-white flex items-center justify-between">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><AlertTriangle size={14} /> Appeal</div>
              <div className="text-lg font-bold text-slate-900">{stats.appeal}</div>
            </div>
            <div className="p-4 bg-white flex items-center justify-between">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Building2 size={14} /> Depts</div>
              <div className="text-lg font-bold text-slate-900">{stats.depts}</div>
            </div>
          </div>
        </div>

        {/* Right Content: Tabular List */}
        <div className="flex-1">
          {filtered.length === 0 ? (
            <div className="border border-slate-200 bg-slate-50 p-12 text-center">
              <Search size={32} className="mx-auto mb-3 text-slate-400" />
              <div className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-1">No Records Found</div>
              <div className="text-xs text-slate-500">Adjust filters or upload a new judgment to generate actions.</div>
            </div>
          ) : (
            <div className="border border-slate-200 bg-white">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <div className="col-span-2">Case No. & Date</div>
                <div className="col-span-4">Directive Extracted</div>
                <div className="col-span-2">Department</div>
                <div className="col-span-2">Deadline</div>
                <div className="col-span-2 text-right">Action / Status</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <div key={`${item.case_id}-${item.directive_id}`} className="grid grid-cols-12 gap-4 p-4 hover:bg-slate-50 transition-colors group">
                    
                    {/* Case Info */}
                    <div className="col-span-2">
                      <div className="font-bold text-xs text-slate-900 mb-1">{item.case_number}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 uppercase tracking-wider"><Calendar size={10} /> {item.order_date}</div>
                    </div>

                    {/* Directive */}
                    <div className="col-span-4 pr-4">
                      <p className="text-xs text-slate-800 leading-relaxed line-clamp-3 font-serif">
                        "{item.directive_text}"
                      </p>
                    </div>

                    {/* Department */}
                    <div className="col-span-2">
                      <div className="text-xs font-medium text-slate-700 line-clamp-2">{item.responsible_department}</div>
                    </div>

                    {/* Deadline */}
                    <div className="col-span-2">
                      <div className={`text-xs ${deadlineColor(item.deadline)}`}>{item.deadline}</div>
                    </div>

                    {/* Action & Status */}
                    <div className="col-span-2 flex flex-col items-end gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider ${
                        item.action_required.toLowerCase() === 'comply' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {item.action_required}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {item.verification_status === 'edited' ? <><Pencil size={10} /> Edited</> : <><Check size={10} /> Verified</>}
                      </span>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
