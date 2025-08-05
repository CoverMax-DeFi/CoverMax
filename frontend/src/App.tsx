
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PrivyWeb3Provider } from "./context/PrivyWeb3Context";
import React from "react";

// Import pages directly
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Insurance from "./pages/Insurance";
import Admin from "./pages/Admin";
import WidgetDemo from "./pages/WidgetDemo";
import NotFound from "./pages/NotFound";
import { Navigate } from "react-router-dom";

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
          <Route path="/insurance" element={<Insurance />} />
          <Route path="/advanced" element={<Navigate to="/dashboard" replace />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/widget-demo" element={<WidgetDemo />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AppProviders>
  );
};

export default App;
