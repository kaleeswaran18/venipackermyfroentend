import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Boxes,
  Tags,
  IndianRupee,
  Users,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import "./Sidebar.css";

/* Menu config - add / remove items here, no need to touch JSX */
const MENU = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    id: "stock",
    label: "Stock Management",
    icon: Boxes,
    basePath: "/stock",
    children: [
      { label: "Opening Stock", href: "/stock/opening" },
      { label: "Purchase", href: "/stock/purchase" },
      { label: "Consumption", href: "/stock/consumption" },
      { label: "Order", href: "/stock/order" },
      { label: "Production", href: "/stock/production" },
      { label: "Finished Wood Stock", href: "/stock/finished-wood" },
      { label: "Daily Report", href: "/stock/daily-report" },
    ],
  },

  {
    id: "master",
    label: "Master Data",
    icon: Tags,
    basePath: "/master",
    children: [
      { label: "Items Categories", href: "/master/items-categories" },
      { label: "Items", href: "/master/items" },
      { label: "Nails", href: "/master/nails" },
      { label: "Consumables", href: "/master/consumables" },
      {
        label: "Finished Materials Categories",
        href: "/master/finished-materials-categories",
      },
      {
        label: "Finished Materials Item",
        href: "/master/finished-materials",
      },
      {
        label: "Finished Materials Field",
        href: "/master/finished-materials-field",
      },
      {
        label: "Finished Materials overallstock",
        href: "/master/finished-materials-overallstock",
      },
       {
        label: "Finished piece Size",
        href: "/master/finished-piece-size",
      },
      { label: "Locations", href: "/master/locations" },
      { label: "Overall Stock", href: "/master/overall-stock" },
       { label: "Attendance", href: "/master/Attendance" },
        { label: "weeklysalary", href: "/master/weeklysalary" },
        { label: "Employees", href: "/master/employees" },
        { label: "Enquiry", href: "/master/enquiry" },
        { label: "Dailyprogram", href: "/master/dailyprogram" },
  //  { label: "Createorder", href: "/master/createorder" },
   { label: "Property", href: "/master/property" },
   { label: "VehicleExpense", href: "/master/VehicleExpense" },
   { label: "Purchase", href: "/master/purchase" },
   { label: " Tax", href: "/master/tax" },
     { label: "CustomerDelivery", href: "/master/CustomerDelivery" },
      { label: "Staff", href: "/master/Staff" },
      { label: "Staff Attendance", href: "/master/StaffAttendance" },
      { label: "stocktransfer", href: "/master/stocktransfer" },
      { label: "financeCategory", href: "/master/financeCategory" },
      { label: "financeTransaction", href: "/master/financeTransaction" },
       {label:"daily log", href:"/master/daily-log"},
      { label: "company", href: "/master/company" },
       { label: "nailsworker", href: "/master/nailsworker" },
      { label: "contractwork", href: "/master/contractwork" },
      // Property  
      
    ],
  },
  {
    id: "sales",
    label: "Sales",
    icon: IndianRupee,
    basePath: "/sales",
    children: [
      { label: "Customers / Companies", href: "/sales/customers" },
      { label: "Deliveries", href: "/sales/deliveries" },
      { label: "Sales", href: "/sales/sales" },
      { label: "Outstanding", href: "/sales/outstanding" },
    ],
  },
  {
    id: "users",
    label: "Users & Permissions",
    icon: Users,
    basePath: "/users",
    children: [
      { label: "Users", href: "/users" },
      { label: "Roles", href: "/users/roles" },
      { label: "Permissions", href: "/users/permissions" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    basePath: "/settings",
    children: [{ label: "Profile", href: "/settings/profile" }],
  },
];

function Sidebar({ isOpen = false, onClose, onLogout }) {
  const { pathname } = useLocation();

  // Group that contains the current page opens automatically
  const [openMenu, setOpenMenu] = useState(
    () =>
      MENU.find((item) => item.children && pathname.startsWith(item.basePath))
        ?.id ?? null
  );

  // While the drawer is open: Esc closes it, and the page behind doesn't scroll
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("sidebar-open");

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("sidebar-open");
    };
  }, [isOpen, onClose]);

  const handleGroupClick = (id) => {
    setOpenMenu((current) => (current === id ? null : id));
  };

  return (
    <>
      {/* Dark overlay behind the drawer (mobile / tablet only) */}
      <div
        className={`sidebar-overlay ${isOpen ? "visible" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside id="app-sidebar" className={`sidebar ${isOpen ? "open" : ""}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">V</div>

          <div className="logo-text">
            <h2>Veni Packers</h2>
            <span>Management System</span>
          </div>
        </div>

        {/* Menu */}
        <nav className="sidebar-menu" aria-label="Main navigation">
          {MENU.map((item) => {
            const Icon = item.icon;

            /* Single link (Dashboard) */
            if (!item.children) {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.id}
                  to={item.href}
                  className={`sidebar-item ${isActive ? "active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={onClose}
                >
                  <Icon
                    className="item-icon"
                    size={19}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  <span className="item-label">{item.label}</span>
                </Link>
              );
            }

            /* Group with submenu */
            const isGroupOpen = openMenu === item.id;
            const hasActive = pathname.startsWith(item.basePath);

            return (
              <div
                key={item.id}
                className={`menu-group ${isGroupOpen ? "open" : ""}`}
              >
                <button
                  type="button"
                  className={`sidebar-item menu-button ${
                    hasActive ? "has-active" : ""
                  }`}
                  onClick={() => handleGroupClick(item.id)}
                  aria-expanded={isGroupOpen}
                  aria-controls={`submenu-${item.id}`}
                >
                  <Icon
                    className="item-icon"
                    size={19}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />

                  <span className="item-label">{item.label}</span>

                  <ChevronRight
                    className="arrow"
                    size={16}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </button>

                <div
                  id={`submenu-${item.id}`}
                  className="submenu-wrap"
                  aria-hidden={!isGroupOpen}
                >
                  <div className="submenu">
                    <div className="submenu-inner">
                      {item.children.map((child) => {
                        const isChildActive = pathname === child.href;

                        return (
                          <Link
                            key={child.href}
                            to={child.href}
                            className={isChildActive ? "active" : ""}
                            aria-current={
                              isChildActive ? "page" : undefined
                            }
                            tabIndex={isGroupOpen ? 0 : -1}
                            onClick={onClose}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="logout-button"
            onClick={onLogout}
          >
            <LogOut
              className="item-icon"
              size={19}
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <span className="item-label">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;