import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { RootLayout } from './layouts/RootLayout/RootLayout'
import { HomePage } from './routes/HomePage/Homepage'
import { DashboardLayout } from "./layouts/DashboardLayout/DashboardLayout"
import { DashboardPage } from './routes/DashboardPage/DashboardPage'
import { ChatPage } from './routes/ChatPage/ChatPage'
import { SignInPage } from './routes/SignIn/SignInPage'
import { SignUpPage } from './routes/SignUp/SignUpPage'
import Contact from './routes/ContactPage/Contact'

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/sign-in/*',
        element: <SignInPage />
      },
      {
        path: '/sign-up/*',
        element: <SignUpPage />
      },
      {
        path: '/',
        element: <HomePage />
      },
      {
        path: '/contact',
        element: <Contact />
      },
      {
        element: <DashboardLayout />,
        children: [
          {
            path: "/dashboard",
            element: <DashboardPage />
          },
          {
            path: "dashboard/chats/:id",
            element: <ChatPage />
          }
        ]
      }
    ]
  }
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
