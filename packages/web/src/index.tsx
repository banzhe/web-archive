import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import '@web-archive/shared/global.css'
import router from './utils/router'

const Routes = () => <RouterProvider router={router} />

createRoot(document.getElementById('root')!).render(<Routes />)
