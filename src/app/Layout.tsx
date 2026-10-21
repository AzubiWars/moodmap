import { BarChart3, Home, Map, MessageCircleHeart } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { DemoBanner } from '@/components/DemoBanner';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Start', icon: Home },
  { to: '/check', label: 'Mood-Check', icon: MessageCircleHeart },
  { to: '/map', label: 'Karte', icon: Map },
  { to: '/dashboard', label: 'Lagebild', icon: BarChart3 },
] as const;

export function Layout() {
  return (
    <div className="flex min-h-full flex-col">
      <DemoBanner />
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <NavLink to="/" className="flex items-center gap-2 text-lg font-bold">
            <img src="/favicon.svg" alt="" className="size-7" />
            Moodmap <span className="text-mood-5">NRW</span>
          </NavLink>
          <nav className="hidden gap-1 md:flex" aria-label="Hauptnavigation">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-4 py-2 text-sm font-medium',
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Hauptnavigation"
      >
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs',
                isActive ? 'text-mood-5' : 'text-slate-500',
              )
            }
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
