'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Scale, LayoutDashboard, FileText, Shield, Activity } from 'lucide-react';

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      className="px-6 py-3.5 flex items-center justify-between"
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <Link href="/" className="flex items-center gap-3 group">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, var(--accent), #0d9268)',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)',
          }}
        >
          <Scale size={18} color="#fff" strokeWidth={2.5} />
        </div>
        <div>
          <div
            className="font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', fontSize: '1.05rem' }}
          >
            NyayaBot
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Judgment Compliance System
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-1">
        <NavLink href="/" icon={<FileText size={15} />} label="Upload" active={pathname === '/'} />
        <NavLink href="/dashboard" icon={<LayoutDashboard size={15} />} label="Dashboard" active={pathname === '/dashboard'} />
        <NavLink href="/audit" icon={<Activity size={15} />} label="Audit Trail" active={pathname === '/audit'} />

        <div
          className="ml-4 flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
          style={{
            background: 'var(--accent-muted)',
            border: '1px solid rgba(16, 185, 129, 0.15)',
            color: 'var(--accent)',
          }}
        >
          <Shield size={12} />
          <span className="font-semibold">On-Premise</span>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <span>Llama 3.2</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer hover:bg-[var(--surface-2)]"
      style={{
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: active ? 'var(--surface-2)' : 'transparent',
      }}
    >
      {icon}
      {label}
    </Link>
  );
}
