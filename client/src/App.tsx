import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AudioProvider } from "@/lib/audio-context";
import { ThemeProvider } from "@/lib/theme-context";
import Home from "@/pages/home";
import CategoryPage from "@/pages/category";
import Auth from "@/pages/auth";
import UploadPage from "@/pages/upload";
import AdminPage from "@/pages/admin-page";
import SharedTrackPage from "@/pages/shared-track-v2";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/category/:id" component={CategoryPage} />
      <Route path="/login" component={Auth} />
      <Route path="/auth" component={Auth} />
      <Route path="/upload" component={UploadPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/shared/:linkId" component={SharedTrackPage} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AudioProvider>
            <Toaster />
            <Router />
          </AudioProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
