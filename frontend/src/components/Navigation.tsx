'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, LayoutDashboard, UploadCloud, Activity, BarChart3, Info } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/demo', label: 'Scoring Demo', icon: LayoutDashboard },
    { href: '/batch', label: 'Batch Scoring', icon: UploadCloud },
    { href: '/drift', label: 'Drift Dashboard', icon: Activity },
    { href: '/analytics', label: 'SQL Analytics & Fairness', icon: BarChart3 },
    { href: '/about', label: 'Model Card & Methodology', icon: Info },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white bg-opacity-90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 group">
            <Shield className="h-6 w-6 text-blue-900 group-hover:scale-105 transition-transform" />
            <span className="text-xl font-bold tracking-tight text-gray-900">
              Credit<span className="text-blue-900 font-semibold">Scope</span>
            </span>
          </Link>
          <span className="hidden sm:inline-block rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            Portfolio Demo
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center gap-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-blue-900 border-b-2 border-blue-900 py-1.5 -mb-0.5'
                    : 'text-gray-600 hover:text-gray-900 hover:border-b-2 hover:border-gray-300 py-1.5 -mb-0.5'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
