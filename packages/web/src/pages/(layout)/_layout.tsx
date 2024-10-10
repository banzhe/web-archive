import { Toaster } from 'react-hot-toast'
import { Outlet } from 'react-router-dom'
import SideBar from '~/components/side-bar'

function Layout() {
  return (
    <main className="flex min-h-screen bg-black text-white">
      <Toaster
        position="top-center"
        reverseOrder={false}
      />
      <div className="w-64">
        <SideBar />
      </div>
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
    </main>
  )
}

export default Layout
