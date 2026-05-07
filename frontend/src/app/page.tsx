'use client';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, FileText, Search, ClipboardCheck, CheckCircle2,
  AlertTriangle, Loader2, Server, ArrowRight, Clock, Building2,
  Zap, ShieldCheck
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

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
  const [selectedCCMS, setSelectedCCMS] = useState<CCMSCase | null>(null);

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

      router.push(`/cases/${uploadData.case_id}/verify`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStatus('error');
    }
  };

  const isLoading = status === 'uploading' || status === 'analyzing';

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">

      {/* Header */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 text-xs mb-4 text-slate-500 font-semibold tracking-widest uppercase">
          <Server size={14} /> Karnataka CCMS <ArrowRight size={12} /> NyayaBot System
        </div>
        <h1 className="text-4xl font-bold mb-4 text-slate-900 font-serif">
          Secure Judgment Processing
        </h1>
        <p className="text-slate-600 text-sm leading-relaxed max-w-2xl mx-auto">
          Upload a High Court judgment or automatically fetch from the Court Case Monitoring System. 
          The system will extract directives and route them for formal officer verification on-premise.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Column: CCMS Integration */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <Server size={16} /> CCMS Auto-Fetch
            </h2>
            <button
              onClick={fetchCCMS}
              disabled={ccmsLoading}
              className="text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded transition-colors flex items-center gap-1.5"
            >
              {ccmsLoading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
              {ccmsLoading ? 'FETCHING' : ccmsFetched ? 'REFRESH' : 'FETCH PENDING'}
            </button>
          </div>

          <div className="flex-1 bg-white border border-slate-200 rounded-sm overflow-hidden flex flex-col">
            {!ccmsFetched ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 text-sm text-center">
                <Server size={32} className="mb-3 opacity-50" />
                Click fetch to retrieve pending<br/>judgments from the state registry.
              </div>
            ) : ccmsCases.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500 text-sm">
                No pending cases found in registry.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-y-auto max-h-[350px]">
                {ccmsCases.map((c) => (
                  <div key={c.ccms_id} onClick={() => setSelectedCCMS(c)} className="p-4 hover:bg-slate-50 transition-colors group cursor-pointer">
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="font-semibold text-sm text-slate-900">{c.case_number}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ${
                        c.priority === 'critical' ? 'bg-red-100 text-red-700' : 
                        c.priority === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                      }`}>{c.priority}</span>
                    </div>
                    <div className="text-xs text-slate-600 mb-2 line-clamp-2">{c.subject}</div>
                    <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1"><Building2 size={12} /> {c.respondent}</span>
                      <span className="flex items-center gap-1"><FileText size={12} /> {c.pages} pp</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Manual Upload */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <Upload size={16} /> Manual Upload
            </h2>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !isLoading && document.getElementById('pdf-input')?.click()}
            className={`flex-1 border-2 transition-colors cursor-pointer flex flex-col items-center justify-center p-8 text-center min-h-[250px] ${
              dragging ? 'border-blue-500 bg-blue-50' : 
              file ? 'border-emerald-500 bg-emerald-50' : 
              'border-slate-300 border-dashed bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <input
              id="pdf-input"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
            />

            {file ? (
              <>
                <FileText size={40} className="text-emerald-600 mb-3" />
                <div className="font-semibold text-slate-900 mb-1">{file.name}</div>
                <div className="text-xs text-slate-500 font-medium">
                  {(file.size / 1024 / 1024).toFixed(2)} MB • Click to replace
                </div>
              </>
            ) : (
              <>
                <Upload size={40} className="text-slate-400 mb-3" />
                <div className="font-semibold text-slate-900 mb-1">Select Judgment Document</div>
                <div className="text-xs text-slate-500 font-medium">
                  PDF format only (Max 50MB)
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!file || isLoading}
            className="mt-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            {isLoading ? (
              <><Loader2 size={18} className="animate-spin" /> Processing Securely...</>
            ) : (
              <><ShieldCheck size={18} /> Initiate Analysis</>
            )}
          </button>
        </div>
      </div>

      {/* Loading State & Errors */}
      {isLoading && (
        <div className="mt-8 bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
          <div className="mt-1 w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <div>
            <div className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-0.5">
              {status === 'uploading' ? 'Securely Uploading...' : 'Llama 3.2 Processing...'}
            </div>
            <div className="text-xs text-blue-800">
              {status === 'analyzing' ? 'Extracting directives via local LLM. This may take up to 30 seconds.' : 'Encrypting and transferring file...'}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-8 bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-600 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-red-900 uppercase tracking-wider mb-0.5">System Error</div>
            <div className="text-xs text-red-800">{error}</div>
          </div>
        </div>
      )}

      {/* Pipeline Steps - Stark & Formal */}
      <div className="mt-12 grid grid-cols-3 gap-0 border border-slate-200 bg-white">
        {[
          { step: '01', title: 'Data Extraction', desc: 'Secure local LLM extracts directives & timelines.' },
          { step: '02', title: 'Action Planning', desc: 'Auto-generation of compliance steps & departments.' },
          { step: '03', title: 'Officer Review', desc: 'Human-in-the-loop verification before execution.' },
        ].map((item, idx) => (
          <div key={item.step} className={`p-6 ${idx !== 2 ? 'border-r border-slate-200' : ''}`}>
            <div className="text-xs font-bold text-slate-400 mb-2">STEP {item.step}</div>
            <div className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-1.5">{item.title}</div>
            <div className="text-xs text-slate-600 leading-relaxed">{item.desc}</div>
          </div>
        ))}
      </div>

      {/* CCMS Prototype Modal */}
      {selectedCCMS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
              <Server size={20} className="text-slate-700" />
              <h3 className="font-bold text-slate-900 text-lg font-serif">CCMS Integration</h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Selected Case</div>
                <div className="font-bold text-slate-900">{selectedCCMS.case_number}</div>
                <div className="text-sm text-slate-600 mt-1">{selectedCCMS.subject}</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900 leading-relaxed">
                <strong>Prototype Notice:</strong> In a live deployment, clicking this would securely stream the PDF from the High Court CIS API directly into the on-premise Llama 3.2 extraction node. 
                <br /><br />
                For this evaluation prototype, please use the <strong>Manual Upload</strong> box to provide your own test PDF and see the extraction pipeline in action.
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedCCMS(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold py-2 px-6 transition-colors"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
