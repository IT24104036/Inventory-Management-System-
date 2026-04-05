import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getSessionUser, hasActiveSession } from "@/lib/session";

const queryClient = new QueryClient();

const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Admin = lazy(() => import("./pages/Admin"));
const Staff = lazy(() => import("./pages/Staff"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));

const AppFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex items-center gap-3 text-[#0F172A]/60">
      <div className="w-6 h-6 border-2 border-[#007A5E] border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-black uppercase tracking-widest">Loading…</span>
    </div>
  </div>
);

// Redirects unauthenticated users to /login; optionally enforces role
const ProtectedRoute = ({ element, requiredRole }) => {
  const session = getSessionUser();
  if (!hasActiveSession() || !session) return <Navigate to="/login" replace />;
  if (requiredRole && session.role?.toUpperCase() !== requiredRole.toUpperCase())
    return <Navigate to="/login" replace />;
  return element;
};

// Keep auth pages available so "Login" always asks for credentials.
const GuestRoute = ({ element }) => {
  return element;
};

const App = () => (<QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<AppFallback />}>
          <Routes>
            <Route path="/" element={<Index />}/>
            <Route path="/login" element={<GuestRoute element={<Login />} />}/>
            <Route path="/admin/*" element={<ProtectedRoute element={<Admin />} requiredRole="ADMIN" />}/>
            <Route path="/staff/*" element={<ProtectedRoute element={<Staff />} />}/>
            <Route path="/forgot-password" element={<GuestRoute element={<ForgotPassword />} />}/>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />}/>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>);
export default App;
