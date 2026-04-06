import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Articles from "./pages/Articles";
import ArticleDetail from "./pages/ArticleDetail";
import Bounties from "./pages/Bounties";
import BountyDetail from "./pages/BountyDetail";
import MasterProfile from "./pages/MasterProfile";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import Contributor from "./pages/Contributor";
import Dashboard from "./pages/Dashboard";
import MasterDashboard from "./pages/MasterDashboard";
import Insights from "./pages/Insights";
import Subscribe from "./pages/Subscribe";
import Unsubscribe from "./pages/Unsubscribe";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminArticles from "./pages/admin/AdminArticles";
import AdminBounties from "./pages/admin/AdminBounties";
import AdminInviteCodes from "./pages/admin/AdminInviteCodes";
import AdminAgents from "./pages/admin/AdminAgents";
import AdminSubscribers from "./pages/admin/AdminSubscribers";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      {/* New primary nav routes */}
      <Route path="/insights" component={Insights} />
      <Route path="/subscribe" component={Subscribe} />
      {/* Legacy articles route - redirect handled inside */}
      <Route path="/articles" component={Articles} />
      <Route path="/article/:code" component={ArticleDetail} />
      <Route path="/bounties" component={Bounties} />
      <Route path="/bounty/:id" component={BountyDetail} />
      <Route path="/master/:alias" component={MasterProfile} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/about" component={About} />
      <Route path="/contributor" component={Contributor} />
      <Route path="/unsubscribe" component={Unsubscribe} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/master/dashboard" component={MasterDashboard} />
      {/* Admin routes */}
      <Route path="/admin">
        {() => (
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        )}
      </Route>
      <Route path="/admin/users">
        {() => (
          <AdminLayout>
            <AdminUsers />
          </AdminLayout>
        )}
      </Route>
      <Route path="/admin/articles">
        {() => (
          <AdminLayout>
            <AdminArticles />
          </AdminLayout>
        )}
      </Route>
      <Route path="/admin/bounties">
        {() => (
          <AdminLayout>
            <AdminBounties />
          </AdminLayout>
        )}
      </Route>
      <Route path="/admin/invite-codes">
        {() => (
          <AdminLayout>
            <AdminInviteCodes />
          </AdminLayout>
        )}
      </Route>
      <Route path="/admin/agents">
        {() => (
          <AdminLayout>
            <AdminAgents />
          </AdminLayout>
        )}
      </Route>
      <Route path="/admin/subscribers">
        {() => (
          <AdminLayout>
            <AdminSubscribers />
          </AdminLayout>
        )}
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
