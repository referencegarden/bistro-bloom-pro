import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PermissionRoute } from "./components/PermissionRoute";
import { TenantProvider } from "./contexts/TenantContext";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Sales from "./pages/Sales";
import Purchases from "./pages/Purchases";
import Demands from "./pages/Demands";
import Categories from "./pages/Categories";
import Suppliers from "./pages/Suppliers";
import Employees from "./pages/Employees";
import Settings from "./pages/Settings";
import MenuItems from "./pages/MenuItems";
import POSCategories from "./pages/POSCategories";
import Attendance from "./pages/Attendance";
import AttendanceAdmin from "./pages/AttendanceAdmin";
import POS from "./pages/POS";
import POSOrders from "./pages/POSOrders";
import POSPayment from "./pages/POSPayment";
import KitchenDisplay from "./pages/KitchenDisplay";
import BarDisplay from "./pages/BarDisplay";
import CategoryManagement from "./pages/CategoryManagement";
import POSReports from "./pages/POSReports";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import SuperAdminLogin from "./pages/SuperAdminLogin";
import SuperAdminInitialize from "./pages/SuperAdminInitialize";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import SuperAdminTenants from "./pages/SuperAdminTenants";
import SuperAdminSubscriptions from "./pages/SuperAdminSubscriptions";
import { SuperAdminLayout } from "./components/SuperAdminLayout";
import { SubscriptionGuard } from "./components/SubscriptionGuard";
import SuperAdminPlans from "./pages/SuperAdminPlans";
import Tables from "./pages/Tables";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Redirect root to super admin */}
          <Route path="/" element={<Navigate to="/super-admin/login" replace />} />
          
          {/* Slug-based tenant routes */}
          <Route path="/:slug" element={
            <TenantProvider>
              <Auth />
            </TenantProvider>
          } />
          <Route
            path="/:slug/dashboard"
            element={
              <TenantProvider>
                <SubscriptionGuard>
                  <ProtectedRoute>
                    <PermissionRoute permission="can_view_reports">
                      <Layout>
                        <Dashboard />
                      </Layout>
                    </PermissionRoute>
                  </ProtectedRoute>
                </SubscriptionGuard>
              </TenantProvider>
            }
          />
          <Route
            path="/:slug/products"
            element={
              <TenantProvider>
                <SubscriptionGuard>
                  <ProtectedRoute>
                    <Layout>
                      <Products />
                    </Layout>
                  </ProtectedRoute>
                </SubscriptionGuard>
              </TenantProvider>
            }
          />
          <Route
            path="/:slug/sales"
            element={
              <TenantProvider>
                <SubscriptionGuard>
                  <ProtectedRoute>
                    <Layout>
                      <Sales />
                    </Layout>
                  </ProtectedRoute>
                </SubscriptionGuard>
              </TenantProvider>
            }
          />
          <Route
            path="/:slug/purchases"
            element={
              <TenantProvider>
                <SubscriptionGuard>
                  <ProtectedRoute>
                    <Layout>
                      <Purchases />
                    </Layout>
                  </ProtectedRoute>
                </SubscriptionGuard>
              </TenantProvider>
            }
          />
          <Route
            path="/:slug/demands"
            element={
              <TenantProvider>
                <SubscriptionGuard>
                  <ProtectedRoute>
                    <Layout>
                      <Demands />
                    </Layout>
                  </ProtectedRoute>
                </SubscriptionGuard>
              </TenantProvider>
            }
          />
          <Route
            path="/:slug/categories"
            element={
              <TenantProvider>
                <SubscriptionGuard>
                  <ProtectedRoute>
                    <Layout>
                      <Categories />
                    </Layout>
                  </ProtectedRoute>
                </SubscriptionGuard>
              </TenantProvider>
            }
          />
          <Route
            path="/:slug/suppliers"
            element={
              <TenantProvider>
                <SubscriptionGuard>
                  <ProtectedRoute>
                    <Layout>
                      <Suppliers />
                    </Layout>
                  </ProtectedRoute>
                </SubscriptionGuard>
              </TenantProvider>
            }
          />
          <Route
            path="/:slug/employees"
            element={
              <TenantProvider>
                <SubscriptionGuard>
                  <ProtectedRoute>
                    <Layout>
                      <Employees />
                    </Layout>
                  </ProtectedRoute>
                </SubscriptionGuard>
              </TenantProvider>
            }
          />
          <Route
            path="/:slug/menu-items"
            element={
              <TenantProvider>
                <SubscriptionGuard>
                  <ProtectedRoute>
                    <Layout>
                      <MenuItems />
                    </Layout>
                  </ProtectedRoute>
                </SubscriptionGuard>
              </TenantProvider>
            }
          />
          <Route
            path="/:slug/settings"
            element={
              <TenantProvider>
                <SubscriptionGuard>
                  <ProtectedRoute>
                    <Layout>
                      <Settings />
                    </Layout>
                  </ProtectedRoute>
                </SubscriptionGuard>
              </TenantProvider>
            }
          />
          <Route
            path="/:slug/attendance"
            element={
              <TenantProvider>
                <SubscriptionGuard>
                  <ProtectedRoute>
                    <Layout>
                      <Attendance />
                    </Layout>
                  </ProtectedRoute>
                </SubscriptionGuard>
              </TenantProvider>
            }
          />
          <Route
            path="/:slug/attendance-admin"
            element={
              <TenantProvider>
                <SubscriptionGuard>
                  <ProtectedRoute>
                    <Layout>
                      <AttendanceAdmin />
                    </Layout>
                  </ProtectedRoute>
                </SubscriptionGuard>
              </TenantProvider>
            }
          />
          <Route
            path="/:slug/category-management"
            element={
              <TenantProvider>
                <SubscriptionGuard>
                  <ProtectedRoute>
                    <Layout>
                      <CategoryManagement />
                    </Layout>
                  </ProtectedRoute>
                </SubscriptionGuard>
              </TenantProvider>
            }
          />
          <Route
            path="/:slug/tables"
            element={
              <TenantProvider>
                <SubscriptionGuard>
                  <ProtectedRoute>
                    <Layout>
                      <Tables />
                    </Layout>
                  </ProtectedRoute>
                </SubscriptionGuard>
              </TenantProvider>
            }
          />
          <Route
            path="/:slug/pos"
            element={
              <TenantProvider>
                <SubscriptionGuard>
                  <ProtectedRoute>
                    <POS />
                  </ProtectedRoute>
                </SubscriptionGuard>
              </TenantProvider>
            }
          />
          <Route
            path="/:slug/pos/orders"
            element={
              <TenantProvider>
                <SubscriptionGuard>
                  <ProtectedRoute>
                    <Layout>
                      <POSOrders />
                    </Layout>
                  </ProtectedRoute>
                </SubscriptionGuard>
              </TenantProvider>
            }
          />
          <Route
            path="/:slug/pos/payment/:orderId"
            element={
              <TenantProvider>
                <SubscriptionGuard>
                  <ProtectedRoute>
                    <POSPayment />
                  </ProtectedRoute>
                </SubscriptionGuard>
              </TenantProvider>
            }
          />
          <Route
            path="/:slug/pos/kitchen"
            element={
              <TenantProvider>
                <SubscriptionGuard>
                  <ProtectedRoute>
                    <PermissionRoute permission="can_view_kitchen_display">
                      <Layout>
                        <KitchenDisplay />
                      </Layout>
                    </PermissionRoute>
                  </ProtectedRoute>
                </SubscriptionGuard>
              </TenantProvider>
            }
          />
          <Route
            path="/:slug/pos/bar"
            element={
              <TenantProvider>
                <SubscriptionGuard>
                  <ProtectedRoute>
                    <PermissionRoute permission="can_view_bar_display">
                      <Layout>
                        <BarDisplay />
                      </Layout>
                    </PermissionRoute>
                  </ProtectedRoute>
                </SubscriptionGuard>
              </TenantProvider>
            }
          />
          <Route
            path="/:slug/pos/reports"
            element={
              <TenantProvider>
                <SubscriptionGuard>
                  <ProtectedRoute>
                    <Layout>
                      <POSReports />
                    </Layout>
                  </ProtectedRoute>
                </SubscriptionGuard>
              </TenantProvider>
            }
          />
          {/* Super Admin Routes */}
          <Route path="/super-admin/login" element={<SuperAdminLogin />} />
          <Route path="/super-admin/initialize" element={<SuperAdminInitialize />} />
          <Route path="/super-admin" element={<SuperAdminLayout />}>
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="tenants" element={<SuperAdminTenants />} />
            <Route path="subscriptions" element={<SuperAdminSubscriptions />} />
            <Route path="plans" element={<SuperAdminPlans />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
