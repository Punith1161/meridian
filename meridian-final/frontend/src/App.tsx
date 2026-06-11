import { useState, useCallback, useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/Sidebar";

// Pages
import Login from "@/pages/Login";
import Today from "@/pages/Today";
import AllTasks from "@/pages/AllTasks";
import Calendar from "@/pages/Calendar";
import Habits from "@/pages/Habits";
import Notes from "@/pages/Notes";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <div className="text-2xl font-bold tracking-widest bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">
        MERIDIAN
      </div>
      <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
    </div>
  );
}

function NotFound() {
  const [, navigate] = useLocation();
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <p className="text-4xl font-bold text-muted-foreground">404</p>
      <p className="text-muted-foreground">Page not found</p>
      <button onClick={() => navigate("/")} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
        Go home
      </button>
    </div>
  );
}

function AppShell() {
  const [, setLocation] = useLocation();
  const { token } = useAuth();

  if (!token) return <Redirect to="/login" />;

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      const map: Record<string, string> = {
        "1": "/today",
        "2": "/today",
        "3": "/tasks",
        "4": "/notes",
        "5": "/calendar",
        "6": "/habits",
      };
      if (map[e.key]) {
        e.preventDefault();
        setLocation(map[e.key]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setLocation]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 ml-14 flex flex-col overflow-hidden">
        <Switch>
          <Route path="/"          component={Today} />
          <Route path="/today"     component={Today} />
          <Route path="/tasks"     component={AllTasks} />
          <Route path="/notes"     component={Notes} />
          <Route path="/calendar"  component={Calendar} />
          <Route path="/habits"    component={Habits} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function AuthGate() {
  const { token, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  return (
    <Switch>
      <Route path="/login" component={Login} />
      {token ? <Route component={AppShell} /> : <Redirect to="/login" />}
    </Switch>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider delayDuration={300}>
        <AuthProvider>
          <AuthGate />
          <Toaster position="bottom-right" richColors closeButton />
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
