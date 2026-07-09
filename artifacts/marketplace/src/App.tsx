import { lazy, Suspense } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Switch, Route } from "wouter";
import { Loader2 } from "lucide-react";

const Landing       = lazy(() => import("@/pages/landing"));
const Onboarding    = lazy(() => import("@/pages/onboarding"));
const Browse        = lazy(() => import("@/pages/buyer/browse"));
const ProductDetail = lazy(() => import("@/pages/buyer/product-detail"));
const Cart          = lazy(() => import("@/pages/buyer/cart"));
const BuyerOrders   = lazy(() => import("@/pages/buyer/orders"));
const BuyerRfqs     = lazy(() => import("@/pages/buyer/rfqs"));
const BuyerWishlist = lazy(() => import("@/pages/buyer/wishlist"));
const Compare       = lazy(() => import("@/pages/buyer/compare"));

const VendorDashboard    = lazy(() => import("@/pages/vendor/dashboard"));
const VendorOffers       = lazy(() => import("@/pages/vendor/offers"));
const VendorOrders       = lazy(() => import("@/pages/vendor/orders"));
const VendorRfqs         = lazy(() => import("@/pages/vendor/rfqs"));
const VendorWarehouses   = lazy(() => import("@/pages/vendor/warehouses"));
const VendorShipping     = lazy(() => import("@/pages/vendor/shipping-zones"));

const AdminDashboard  = lazy(() => import("@/pages/admin/dashboard"));
const AdminCompanies  = lazy(() => import("@/pages/admin/companies"));
const AdminProducts   = lazy(() => import("@/pages/admin/products"));
const AdminCoupons    = lazy(() => import("@/pages/admin/coupons"));
const AdminReports    = lazy(() => import("@/pages/admin/reports"));
const AdminAuditLogs  = lazy(() => import("@/pages/admin/audit-logs"));

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[40vh]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function App() {
  return (
    <Switch>
      <Route path="/">
        <Wrap><Landing /></Wrap>
      </Route>
      <Route path="/onboarding">
        <Wrap><Onboarding /></Wrap>
      </Route>

      {/* Buyer */}
      <Route path="/browse">
        <AppLayout allowedRoles={["buyer"]}><Wrap><Browse /></Wrap></AppLayout>
      </Route>
      <Route path="/products/:id">
        <AppLayout allowedRoles={["buyer"]}><Wrap><ProductDetail /></Wrap></AppLayout>
      </Route>
      <Route path="/cart">
        <AppLayout allowedRoles={["buyer"]}><Wrap><Cart /></Wrap></AppLayout>
      </Route>
      <Route path="/orders">
        <AppLayout allowedRoles={["buyer"]}><Wrap><BuyerOrders /></Wrap></AppLayout>
      </Route>
      <Route path="/rfq">
        <AppLayout allowedRoles={["buyer"]}><Wrap><BuyerRfqs /></Wrap></AppLayout>
      </Route>
      <Route path="/wishlist">
        <AppLayout allowedRoles={["buyer"]}><Wrap><BuyerWishlist /></Wrap></AppLayout>
      </Route>
      <Route path="/compare">
        <AppLayout allowedRoles={["buyer"]}><Wrap><Compare /></Wrap></AppLayout>
      </Route>

      {/* Vendor */}
      <Route path="/vendor">
        <AppLayout allowedRoles={["vendor"]}><Wrap><VendorDashboard /></Wrap></AppLayout>
      </Route>
      <Route path="/vendor/offers">
        <AppLayout allowedRoles={["vendor"]}><Wrap><VendorOffers /></Wrap></AppLayout>
      </Route>
      <Route path="/vendor/orders">
        <AppLayout allowedRoles={["vendor"]}><Wrap><VendorOrders /></Wrap></AppLayout>
      </Route>
      <Route path="/vendor/rfqs">
        <AppLayout allowedRoles={["vendor"]}><Wrap><VendorRfqs /></Wrap></AppLayout>
      </Route>
      <Route path="/vendor/warehouses">
        <AppLayout allowedRoles={["vendor"]}><Wrap><VendorWarehouses /></Wrap></AppLayout>
      </Route>
      <Route path="/vendor/shipping-zones">
        <AppLayout allowedRoles={["vendor"]}><Wrap><VendorShipping /></Wrap></AppLayout>
      </Route>

      {/* Admin */}
      <Route path="/admin">
        <AppLayout allowedRoles={["admin"]}><Wrap><AdminDashboard /></Wrap></AppLayout>
      </Route>
      <Route path="/admin/companies">
        <AppLayout allowedRoles={["admin"]}><Wrap><AdminCompanies /></Wrap></AppLayout>
      </Route>
      <Route path="/admin/products">
        <AppLayout allowedRoles={["admin"]}><Wrap><AdminProducts /></Wrap></AppLayout>
      </Route>
      <Route path="/admin/coupons">
        <AppLayout allowedRoles={["admin"]}><Wrap><AdminCoupons /></Wrap></AppLayout>
      </Route>
      <Route path="/admin/reports">
        <AppLayout allowedRoles={["admin"]}><Wrap><AdminReports /></Wrap></AppLayout>
      </Route>
      <Route path="/admin/audit-logs">
        <AppLayout allowedRoles={["admin"]}><Wrap><AdminAuditLogs /></Wrap></AppLayout>
      </Route>

      {/* 404 */}
      <Route>
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center space-y-3">
            <p className="text-6xl font-bold text-muted-foreground/30">404</p>
            <h1 className="text-xl font-semibold">Page not found</h1>
            <p className="text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
          </div>
        </div>
      </Route>
    </Switch>
  );
}
