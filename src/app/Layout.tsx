import { BarChart3, Home, Map, MessageCircleHeart } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { AppLogo } from '@/components/brand/AppLogo';
import { DemoBanner } from '@/components/DemoBanner';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
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
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <NavLink to="/" className="flex items-center gap-2 text-lg font-bold">
            <AppLogo variant="handshake" className="size-7" />
            Moodmap <span className="hidden text-mood-5 sm:inline">NRW</span>
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
                    isActive ? 'bg-primary text-primary-fg' : 'text-muted hover:bg-subtle',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          {/* Rollen-Umschalter (#30) und Theme-Toggle (#35) */}
          <div className="flex items-center gap-2" data-slot="header-actions">
            <RoleSwitcher variant="segmented" className="hidden lg:inline-flex" />
            <RoleSwitcher variant="compact" className="lg:hidden" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
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
                isActive ? 'font-semibold text-accent' : 'text-muted',
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
