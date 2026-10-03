import { createBrowserRouter, RouterProvider, type Params } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { NAV } from '@/components/layout/Sidebar'
import { investigations } from '@/data/investigation'
import ComingSoon from '@/pages/ComingSoon'
import Investigation from '@/pages/Investigation'
import Overview from '@/pages/Overview'

/** Breadcrumb topbar dibaca dari `handle.crumbs` route yang aktif. */
export type RouteHandle = { crumbs: (params: Params) => string[] }

const handle = (crumbs: RouteHandle['crumbs']): RouteHandle => ({ crumbs })

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Overview />, handle: handle(() => ['Plant Intelligence', 'Overview']) },
      { path: 'investigation', element: <Investigation /> },
      {
        path: 'investigation/:id',
        element: <Investigation />,
        handle: handle((p) => ['Plant', investigations[p.id ?? '']?.unitLabel ?? 'Unit', p.id ?? '']),
      },
      { path: 'root-cause/:id', element: <ComingSoon />, handle: handle((p) => ['Root Cause & Decision', p.id ?? '']) },
      ...NAV.filter((n) => n.to !== '/' && n.to !== '/investigation').map((n) => ({
        path: n.to,
        element: <ComingSoon />,
        handle: handle(() => ['CALIBER', n.label]),
      })),
      { path: '*', element: <ComingSoon /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
