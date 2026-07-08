import { AppLayout } from "@/components/layout/AppLayout";
import { Switch, Route } from "wouter";
import Landing from "@/pages/landing";
import Onboarding from "@/pages/onboarding";
import Browse from "@/pages/buyer/browse";
import ProductDetail from "@/pages/buyer/product-detail";
import Cart from "@/pages/buyer/cart";
import BuyerOrders from "@/pages/buyer/orders";
import BuyerRfqs from "@/pages/buyer/rfqs";
import BuyerWishlist from "@/pages/buyer/wishlist";
import Compare from "@/pages/buyer/compare";
import VendorDashboard from "@/pages/vendor/dashboard";
import VendorOffers from "@/pages/vendor/offers";
import VendorOrders from "@/pages/vendor/orders";
import VendorRfqs from "@/pages/vendor/rfqs";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminCompanies from "@/pages/admin/companies";
import AdminProducts from "@/pages/admin/products";

export default function App() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/onboarding" component={Onboarding} />
      
      {/* Buyer Routes */}
      <Route path="/browse">
        <AppLayout allowedRoles={["buyer"]}><Browse /></AppLayout>
      </Route>
      <Route path="/products/:id">
        <AppLayout allowedRoles={["buyer"]}><ProductDetail /></AppLayout>
      </Route>
      <Route path="/cart">
        <AppLayout allowedRoles={["buyer"]}><Cart /></AppLayout>
      </Route>
      <Route path="/orders">
        <AppLayout allowedRoles={["buyer"]}><BuyerOrders /></AppLayout>
      </Route>
      <Route path="/rfq">
        <AppLayout allowedRoles={["buyer"]}><BuyerRfqs /></AppLayout>
      </Route>
      <Route path="/wishlist">
        <AppLayout allowedRoles={["buyer"]}><BuyerWishlist /></AppLayout>
      </Route>
      <Route path="/compare">
        <AppLayout allowedRoles={["buyer"]}><Compare /></AppLayout>
      </Route>

      {/* Vendor Routes */}
      <Route path="/vendor">
        <AppLayout allowedRoles={["vendor"]}><VendorDashboard /></AppLayout>
      </Route>
      <Route path="/vendor/offers">
        <AppLayout allowedRoles={["vendor"]}><VendorOffers /></AppLayout>
      </Route>
      <Route path="/vendor/orders">
        <AppLayout allowedRoles={["vendor"]}><VendorOrders /></AppLayout>
      </Route>
      <Route path="/vendor/rfqs">
        <AppLayout allowedRoles={["vendor"]}><VendorRfqs /></AppLayout>
      </Route>

      {/* Admin Routes */}
      <Route path="/admin">
        <AppLayout allowedRoles={["admin"]}><AdminDashboard /></AppLayout>
      </Route>
      <Route path="/admin/companies">
        <AppLayout allowedRoles={["admin"]}><AdminCompanies /></AppLayout>
      </Route>
      <Route path="/admin/products">
        <AppLayout allowedRoles={["admin"]}><AdminProducts /></AppLayout>
      </Route>

      <Route>
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">404</h1>
            <p className="text-muted-foreground">Page not found</p>
          </div>
        </div>
      </Route>
    </Switch>
  );
}
