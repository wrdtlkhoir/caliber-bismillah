import { createBrowserRouter, RouterProvider, type Params } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { AsOfProvider } from '@/lib/asOf'
import { NAV } from '@/components/layout/Sidebar'
import { assetByTag } from '@/data/dataset'
import Actions from '@/pages/Actions'
import ComingSoon from '@/pages/ComingSoon'
import Investigation from '@/pages/Investigation'
import Overview from '@/pages/Overview'
import RootCause from '@/pages/RootCause'

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
        handle: handle((p) => ['Plant', assetByTag(p.id)?.plant ?? 'Plant', p.id ?? '']),
      },
      { path: 'root-cause', element: <RootCause /> },
      {
        path: 'root-cause/:id',
        element: <RootCause />,
        handle: handle((p) => ['Plant', assetByTag(p.id)?.plant ?? 'Plant', p.id ?? '', 'Root Cause & Decision']),
      },
      { path: 'actions', element: <Actions /> },
      {
        path: 'actions/:id',
        element: <Actions />,
        handle: handle(() => ['Action & Reliability', 'Execution & Health']),
      },
      ...NAV.filter((n) => !['/', '/investigation', '/root-cause', '/actions'].includes(n.to)).map((n) => ({
        path: n.to,
        element: <ComingSoon />,
        handle: handle(() => ['CALIBER', n.label]),
      })),
      { path: '*', element: <ComingSoon /> },
    ],
  },
])

export default function App() {
  return (
    <AsOfProvider>
      <RouterProvider router={router} />
    </AsOfProvider>
  )
}
