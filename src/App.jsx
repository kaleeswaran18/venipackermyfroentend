import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";

import Login from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import Locations from "./pages/Locations/Locations";
import Items from "./pages/Items/Items";
import Nails from "./pages/Nails/Nails";
import Consumables from "./pages/Consumables/Consumables";
import FinishedMaterials from "./pages/FinishedMaterials/FinishedMaterials";
import ItemsCategories from "./pages/ItemsCategories/ItemsCategories";
import FinishedMaterialsCategory from "./pages/FinishedMaterialsCategory/FinishedMaterials";
import OpeningStock from "./pages/OpeningStock/OpeningStock";
import FinishedMaterialsField from './pages/FinishedMaterialsFiled/FinishedMaterialsFiled'
import FinishedMaterialsOverallStock from './pages/FinishedMaterialsoverallstock/FinishedMaterialsoverallstock'
import FinishedPieceSize from './pages/piece-size/PieceSize'
import OverallStock from "./pages/OverallStock/Overallstock";
import DailyUpdate from "./pages/DailyUpdate/DailyUpdate";
import DailyHistoryPage from "./pages/DailyHistoryPage/DailyHistoryPage";
import EmployeeAttendance from "./pages/EmployeeAttendance/EmployeeAttendance";
import EmployeeSalary from "./pages/EmployeeSalary/EmployeeSalary";
import Employees from "./pages/Employees/Employees";
import Enquiry from "./pages/Enquiry/Enquiry";
import DailyProgram from "./pages/DailyProgram/DailyProgram";
import CreateOrder from "./pages/CreateOrder/CreateOrder";
import Property from "./pages/Property/Property";
import VehicleExpense from "./pages/VehicleExpense/VehicleExpense";
import Purchase from "./pages/purchase/purchase";
import PurchaseList from "./pages/purchase/purchaselist";
import Tax from "./pages/tax/tax";
import PurchaseView from "./pages/purchase/purchaseview";
import CustomerDelivery from "./pages/CustomerDelivery/CustomerDelivery";
import Staff from "./pages/Staff/Staff";
import StaffAttendance from "./pages/StaffAttendance/StaffAttendance";
import StockTransfer from "./pages/StockTransfer/StockTransfer";
import FinanceCategory from "./pages/FinanceCategory/FinanceCategory";
import FinanceTransaction from "./pages/finance-transaction/FinanceTransaction";
import Companies from "./pages/Companies/Companies";
function ProtectedRoute() {
  const accessToken = localStorage.getItem("accessToken");

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}


function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Login */}
        <Route path="/login" element={<Login />} />


        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>

          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          {/* Master */}
          <Route
            path="/master/nails"
            element={<Nails />}
          />
          <Route path="/master/Attendance" element={<EmployeeAttendance />}/>
     {/* /master/weeklysalary */}
      <Route path="/master/weeklysalary" element={<EmployeeSalary />}/>
      <Route path="/master/employees" element={<Employees />}/>
      {/* /master/enquiry */}
      <Route path="/master/enquiry" element={<Enquiry />}/>
       <Route path="/master/dailyprogram" element={<DailyProgram />}/>
       <Route path="/master/createorder" element={<CreateOrder />}/>
       <Route path="/master/property" element={<Property />}/>
       <Route path="/master/VehicleExpense" element={<VehicleExpense />}/>
       <Route path="/master/purchase" element={<Purchase />}/>
       <Route path="/master/purchase/edit/:id" element={<Purchase />} />
       <Route path="/master/purchase-list" element={<PurchaseList />}/>
       <Route path="/master/tax" element={<Tax />}/>
       <Route path="/master/purchase/:id" element={<PurchaseView />} />
       <Route path="/master/CustomerDelivery" element={<CustomerDelivery />}/>
       <Route path="/master/stocktransfer" element={<StockTransfer />}/>
        <Route path="/master/financeCategory" element={<FinanceCategory />}/>
        <Route path="/master/financeTransaction" element={<FinanceTransaction />}/>
        <Route path="/master/company" element={<Companies />}/>
{/* <Route path="/master/purchase/edit/:id" element={<NewPurchase />} /> */}
       {/* /master/VehicleExpense */}
       {/* Property */}
       {/* /master/property */}
     {/* /master/employees */}
     {/* /master/dailyprogram */}
          <Route
            path="/master/items-categories"
            element={<ItemsCategories />}
          />
          <Route
  path="/daily-history"
  element={<DailyHistoryPage/>}
/>
          <Route
            path="/master/daily-update"
            element={<DailyUpdate />}
          />
          <Route path="/master/Staff" element={<Staff />} />
          <Route path="/master/StaffAttendance" element={<StaffAttendance />} />

          <Route
            path="/master/locations"
            element={<Locations />}
          />

          <Route
            path="/master/items"
            element={<Items />}
          />

          <Route
            path="/master/consumables"
            element={<Consumables />}
          />

          <Route
            path="/master/finished-materials"
            element={<FinishedMaterials />}
          />
          <Route
            path="/master/finished-piece-size"
            element={<FinishedPieceSize />}
          />
          <Route
            path="/master/overall-stock"
            element={<OverallStock />}
          />
          <Route
            path="/master/finished-materials-categories"
            element={<FinishedMaterialsCategory />}
          />
          <Route
            path="/master/finished-materials-field"
            element={<FinishedMaterialsField />}
          />
          <Route
            path="/master/finished-materials-overallstock"
            element={<FinishedMaterialsOverallStock />}
          />
          {/* Stock */}
          <Route
            path="/stock/opening"
            element={<OpeningStock />}
          />

        </Route>


        {/* Default */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;