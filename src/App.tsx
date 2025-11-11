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
                    <PermissionRoute permission="can_view_products">
                      <Layout>
                        <Products />
                      </Layout>
                    </PermissionRoute>
                  </ProtectedRoute>
                </SubscriptionGuard>
              </TenantProvider>
            }
          />
          <Route
            path="/sales"
            element={
              <ProtectedRoute>
                <PermissionRoute permission="can_make_sales">
                  <Layout>
                    <Sales />
                  </Layout>
                </PermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases"
            element={
              <ProtectedRoute>
                <PermissionRoute permission="can_manage_stock">
                  <Layout>
                    <Purchases />
                  </Layout>
                </PermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/demands"
            element={
              <ProtectedRoute>
                <Layout>
                  <Demands />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <ProtectedRoute>
                <Layout>
                  <Categories />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers"
            element={
              <ProtectedRoute>
                <Layout>
                  <Suppliers />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute>
                <Layout>
                  <Employees />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/menu-items"
            element={
              <ProtectedRoute>
                <PermissionRoute permission="can_make_sales">
                  <Layout>
                    <MenuItems />
                  </Layout>
                </PermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <Layout>
                  <Attendance />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance-admin"
            element={
              <ProtectedRoute>
                <PermissionRoute permission="can_manage_attendance">
                  <Layout>
                    <AttendanceAdmin />
                  </Layout>
                </PermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pos"
            element={
              <ProtectedRoute>
                <PermissionRoute permission="can_use_pos">
                  <POS />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pos/orders"
            element={
              <ProtectedRoute>
                <PermissionRoute permission="can_manage_orders">
                  <Layout>
                    <POSOrders />
                  </Layout>
                </PermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pos/payment/:orderId"
            element={
              <ProtectedRoute>
                <PermissionRoute permission="can_process_payments">
                  <POSPayment />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pos/kitchen"
            element={
              <ProtectedRoute>
                <PermissionRoute permission="can_view_kitchen_display">
                  <Layout>
                    <KitchenDisplay />
                  </Layout>
                </PermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/category-management"
            element={
              <ProtectedRoute>
                <PermissionRoute permission="can_manage_stock">
                  <Layout>
                    <CategoryManagement />
                  </Layout>
                </PermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pos/reports"
            element={
              <ProtectedRoute>
                <PermissionRoute permission="can_access_pos_reports">
                  <Layout>
                    <POSReports />
                  </Layout>
                </PermissionRoute>
              </ProtectedRoute>
            }
          />
          {/* Super Admin Routes */}
          <Route path="/super-admin/login" element={<SuperAdminLogin />} />
          <Route path="/super-admin/initialize" element={<SuperAdminInitialize />} />
          <Route path="/super-admin" element={<SuperAdminLayout />}>
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="tenants" element={<SuperAdminTenants />} />
            <Route path="subscriptions" element={<SuperAdminSubscriptions />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
