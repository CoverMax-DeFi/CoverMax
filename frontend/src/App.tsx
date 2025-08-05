
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PrivyWeb3Provider } from "./context/PrivyWeb3Context";
import React from "react";

// Import pages directly
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import UnifiedDashboard from "./pages/UnifiedDashboard";
import Insurance from "./pages/Insurance";
import Advanced from "./pages/Advanced";
import Admin from "./pages/Admin";
import WidgetDemo from "./pages/WidgetDemo";
import NotFound from "./pages/NotFound";

const AppProviders: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => (
  <TooltipProvider>
    <PrivyWeb3Provider>
      {children}
    </PrivyWeb3Provider>
  </TooltipProvider>
));

const App: React.FC = () => {
  return (
    <AppProviders>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/unified" element={<UnifiedDashboard />} />
          <Route path="/insurance" element={<Insurance />} />
          <Route path="/advanced" element={<Advanced />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/widget-demo" element={<WidgetDemo />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AppProviders>
  );
};

export default App;
