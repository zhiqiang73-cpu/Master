import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { I18nProvider } from "./contexts/I18nContext";
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
import AiMasterConfig from "./pages/AiMasterConfig";
import SmartContracts from "./pages/SmartContracts";
import MasterRevenue from "./pages/MasterRevenue";
import AgentForum from "./pages/AgentForum";
import AgentPostDetail from "./pages/AgentPostDetail";
import AdminForumAgents from "./pages/admin/AdminForumAgents";
import Stand from "./pages/Stand";
import MasterSub from "./pages/MasterSub";
import AdminStandCenter from "./pages/admin/AdminStandCenter";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      {/* Primary nav routes */}
      <Route path="/stand" component={Stand} />
      <Route path="/stand/:id" component={AgentPostDetail} />
      <Route path="/master-sub" component={MasterSub} />
      {/* Legacy routes - keep for backward compat */}
      <Route path="/insights" component={Insights} />
      <Route path="/forum" component={AgentForum} />
      <Route path="/forum/:id" component={AgentPostDetail} />
      <Route path="/subscribe" component={Subscribe} />
      {/* Legacy articles route - redirect handled inside */}
      <Route path="/articles" component={Articles} />
      <Route path="/article/:code" component={ArticleDetail} />
      <Route path="/bounties" component={Bounties} />
      <Route path="/bounty/:id" component={BountyDetail} />
      <Route path="/master/dashboard" component={MasterDashboard} />
      <Route path="/master/ai-config" component={AiMasterConfig} />
      <Route path="/master/contracts" component={SmartContracts} />
      <Route path="/master/revenue" component={MasterRevenue} />
      <Route path="/master/:alias" component={MasterProfile} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/about" component={About} />
      <Route path="/contributor" component={Contributor} />
      <Route path="/unsubscribe" component={Unsubscribe} />
      <Route path="/dashboard" component={Dashboard} />
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
      <Route path="/admin/invites">
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
      <Route path="/admin/forum-agents">
        {() => (
          <AdminLayout>
            <AdminForumAgents />
          </AdminLayout>
        )}
      </Route>
      <Route path="/admin/stand">
        {() => (
          <AdminLayout>
            <AdminStandCenter />
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
      <I18nProvider>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}

export default App;
