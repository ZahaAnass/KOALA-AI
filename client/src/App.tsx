import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Spinner } from "@/components/ui/Feedback";
import { AppShell } from "@/components/layout/AppShell";

const LandingPage = lazy(() => import("@/pages/LandingPage"));
const SignInPage = lazy(() => import("@/pages/SignInPage"));
const SignUpPage = lazy(() => import("@/pages/SignUpPage"));
const SharePage = lazy(() => import("@/pages/SharePage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const ChatPage = lazy(() => import("@/pages/ChatPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const DocumentsPage = lazy(() => import("@/pages/DocumentsPage"));
const PromptsPage = lazy(() => import("@/pages/PromptsPage"));
const UsagePage = lazy(() => import("@/pages/UsagePage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));

function PageFallback() {
  return (
    <div className="flex flex-1 items-center justify-center py-20">
      <Spinner className="size-8 text-brand-500" />
    </div>
  );
}

const page = (element: React.ReactNode) => <Suspense fallback={<PageFallback />}>{element}</Suspense>;

const router = createBrowserRouter([
  { path: "/", element: page(<LandingPage />) },
  { path: "/sign-in/*", element: page(<SignInPage />) },
  { path: "/sign-up/*", element: page(<SignUpPage />) },
  { path: "/share/:token", element: page(<SharePage />) },
  {
    element: <AppShell />,
    children: [
      { path: "/dashboard", element: page(<DashboardPage />) },
      { path: "/dashboard/chats/:id", element: page(<ChatPage />) },
      { path: "/settings", element: page(<SettingsPage />) },
      { path: "/documents", element: page(<DocumentsPage />) },
      { path: "/prompts", element: page(<PromptsPage />) },
      { path: "/usage", element: page(<UsagePage />) },
      { path: "/admin", element: page(<AdminPage />) },
      { path: "/contact", element: page(<ContactPage />) },
    ],
  },
  { path: "*", element: page(<NotFoundPage />) },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
