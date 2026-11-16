import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";

import "./Dashboard.css";

function Dashboard() {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Header />

        <main className="dashboard-content">
          <h1>Welcome back, Admin 👋</h1>
          <p className="dashboard-subtitle">
            Here's what's happening with your inventory today.
          </p>

          <div className="dashboard-cards">
            <div className="dashboard-card">
              <span>📍</span>
              <div>
                <p>Locations</p>
                <h2>5</h2>
              </div>
            </div>

            <div className="dashboard-card">
              <span>📦</span>
              <div>
                <p>Items</p>
                <h2>120</h2>
              </div>
            </div>

            <div className="dashboard-card">
              <span>📊</span>
              <div>
                <p>Current Stock</p>
                <h2>4,250</h2>
              </div>
            </div>
          </div>

          <div className="recent-section">
            <div className="section-header">
              <h2>Recent Stock Updates</h2>
              <button>View All</button>
            </div>

            <div className="table-wrapper">
              <table className="common-table">
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td>V1</td>
                    <td>Wood</td>
                    <td>100</td>
                    <td>08 Oct 2026</td>
                  </tr>

                  <tr>
                    <td>V2</td>
                    <td>Nails</td>
                    <td>500</td>
                    <td>08 Oct 2026</td>
                  </tr>

                  <tr>
                    <td>KAK</td>
                    <td>Consumables</td>
                    <td>75</td>
                    <td>07 Oct 2026</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;