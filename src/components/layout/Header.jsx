import { Menu, Bell } from "lucide-react";
import "./Header.css";

/*
  Props (all optional):
  - onMenuClick : called when the hamburger is clicked (mobile / tablet only)
  - menuOpen    : true while the sidebar drawer is open (for accessibility)
*/
function Header({ onMenuClick, menuOpen = false }) {
  return (
    <header className="header">
      <div className="header-left">
        {/* Visible only on mobile / tablet - hidden on laptop via CSS */}
        <button
          type="button"
          className="menu-btn"
          onClick={onMenuClick}
          aria-label="Open menu"
          aria-controls="app-sidebar"
          aria-expanded={menuOpen}
        >
          <Menu size={20} strokeWidth={1.8} aria-hidden="true" />
        </button>

        <div className="header-title">
          <h2>Veni Packers</h2>
          <span>Inventory Management System</span>
        </div>
      </div>

      <div className="header-right">
        <button type="button" className="header-icon" aria-label="Notifications">
          <Bell size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>

        <div className="profile">
          <div className="profile-avatar">A</div>

          <div className="profile-info">
            <strong>Admin</strong>
            <span>Administrator</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
