import { createBrowserRouter } from 'react-router-dom';
import { ActionCatalogPage } from '@/features/actions/ActionCatalogPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { SchoolDashboardPage } from '@/features/dashboard/SchoolDashboardPage';
import { SchoolPosterPage } from '@/features/dashboard/SchoolPosterPage';
import { ComponentGallery } from '@/features/demo/ComponentGallery';
import { DemoPage } from '@/features/demo/DemoPage';
import { LazyPitchPage } from '@/features/demo/LazyPitchPage';
import { DATA_MODE } from '@/lib/env';
import { LandingPage } from '@/features/info/LandingPage';
import { NotFoundPage } from '@/features/info/NotFoundPage';
import { PrivacyPage } from '@/features/info/PrivacyPage';
import { LazyMapPage } from '@/features/map/LazyMapPage';
import { MethodologyPage } from '@/features/info/MethodologyPage';
import { CheckPage } from '@/features/survey/CheckPage';
import { DonePage } from '@/features/survey/DonePage';
import { SchoolEntryPage } from '@/features/survey/SchoolEntryPage';
import { Layout } from './Layout';

const demoRoutes =
  DATA_MODE === 'mock'
    ? [
        { path: '/demo/live', element: <LazyPitchPage /> },
        { path: '/demo', element: <DemoPage /> },
        { path: '/demo/components', element: <ComponentGallery /> },
      ]
    : [];

// Routen laut docs/PRODUCT_SPEC.md §4
export const router = createBrowserRouter([
  ...demoRoutes,
  {
    element: <Layout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/s/:schoolCode', element: <SchoolEntryPage /> },
      { path: '/check', element: <CheckPage /> },
      { path: '/check/done', element: <DonePage /> },
      { path: '/map', element: <LazyMapPage /> },
      { path: '/massnahmen', element: <ActionCatalogPage /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/methodik', element: <MethodologyPage /> },
      { path: '/dashboard/school', element: <SchoolDashboardPage /> },
      { path: '/dashboard/school/poster', element: <SchoolPosterPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
