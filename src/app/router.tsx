import { createBrowserRouter } from 'react-router-dom';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { DemoPage } from '@/features/demo/DemoPage';
import { LandingPage } from '@/features/info/LandingPage';
import { NotFoundPage } from '@/features/info/NotFoundPage';
import { PrivacyPage } from '@/features/info/PrivacyPage';
import { MapPage } from '@/features/map/MapPage';
import { CheckPage } from '@/features/survey/CheckPage';
import { SchoolEntryPage } from '@/features/survey/SchoolEntryPage';
import { Layout } from './Layout';

// Routen laut docs/PRODUCT_SPEC.md §4
export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/s/:schoolCode', element: <SchoolEntryPage /> },
      { path: '/check', element: <CheckPage /> },
      { path: '/map', element: <MapPage /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/demo', element: <DemoPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
