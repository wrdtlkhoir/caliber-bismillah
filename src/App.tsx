import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { NAV } from '@/components/layout/Sidebar'
import ComingSoon from '@/pages/ComingSoon'
import Overview from '@/pages/Overview'

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Overview /> },
      ...NAV.filter((n) => n.to !== '/').map((n) => ({ path: n.to, element: <ComingSoon /> })),
      { path: '*', element: <ComingSoon /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
