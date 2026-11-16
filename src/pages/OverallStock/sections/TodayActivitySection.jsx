
import { useMemo, useState, useEffect } from "react";
import {
  CalendarDays,
  Users,
  Factory,
  ShoppingCart,
  SquarePen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getId, getNumericValues, sumNumbers } from "../utils";

// Update this import path based on your Axios file location
import api from "../../../api/axios";

const joinUnits = (units) => {
  const unique = [...new Set(units.filter(Boolean))];

  if (unique.length === 1) return unique[0];
  if (unique.length > 1) return "Mixed";
  return "-";
};

function TodayActivitySection({
  dailyHistories,
  location,
  company,
  locationName,
}) {
  const navigate = useNavigate();

  const [attendanceCount, setAttendanceCount] = useState(0);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // ========================================
  // FETCH TODAY LOCATION-WISE ATTENDANCE
  // ========================================

  useEffect(() => {
    let isActive = true;

    const fetchTodayAttendance = async () => {
      if (!location) {
        setAttendanceCount(0);
        return;
      }

      try {
        setAttendanceLoading(true);

        const response = await api.get(
          "/employee-attendance/today-location-summary"
        );

        const locations =
          response.data?.data?.locations || [];

        const selectedLocationId = String(
          getId(location) || location
        );

        const selectedLocation = locations.find(
          (item) =>
            String(getId(item.locationId)) ===
            selectedLocationId
        );

        if (isActive) {
          setAttendanceCount(
            Number(selectedLocation?.attendanceCount || 0)
          );
        }
      } catch (error) {
        console.error(
          "Today attendance fetch error:",
          error
        );

        if (isActive) {
          setAttendanceCount(0);
        }
      } finally {
        if (isActive) {
          setAttendanceLoading(false);
        }
      }
    };

    fetchTodayAttendance();

    return () => {
      isActive = false;
    };
  }, [location]);

  // ========================================
  // DAILY UPDATE NAVIGATION
  // ========================================

  const handleUpdateClick = () => {
    const params = new URLSearchParams();

    if (location) params.set("location", location);
    if (company) params.set("company", company);

    navigate(`/master/daily-update?${params.toString()}`);
  };

  // ========================================
  // GET TODAY DAILY HISTORY
  // ========================================

  const todayHistory = useMemo(() => {
    if (!dailyHistories?.length) return null;

    const now = new Date();

    return (
      dailyHistories.find((history) => {
        const historyDate = new Date(history.date);

        return (
          historyDate.getFullYear() === now.getFullYear() &&
          historyDate.getMonth() === now.getMonth() &&
          historyDate.getDate() === now.getDate()
        );
      }) || null
    );
  }, [dailyHistories]);

  // ========================================
  // PRODUCTION & CONSUMPTION
  // EXISTING LOGIC - UNCHANGED
  // ========================================

  const todayActivity = useMemo(() => {
    const result = {
      production: 0,
      consumption: 0,
      consumptionUnit: "-",
    };

    if (!todayHistory || !location) return result;

    const sameLocation = (item) =>
      String(getId(item.locationId)) === String(location);

    // Production
    const productionLocation =
      todayHistory.production?.find(sameLocation);

    productionLocation?.categories?.forEach((category) => {
      const categoryId = getId(category.categoryId);

      if (company && String(categoryId) !== String(company)) return;

      category.products?.forEach((product) => {
        result.production += sumNumbers(
          getNumericValues(product.values)
        );
      });
    });

    // Consumption
    const consumptionLocation =
      todayHistory.consumption?.find(sameLocation);

    if (consumptionLocation) {
      const items = consumptionLocation.items || [];

      result.consumption = sumNumbers(
        items
          .filter((item) => item.quantity !== undefined)
          .map((item) => item.quantity)
      );

      result.consumptionUnit = joinUnits(
        items.map((item) => item.unit)
      );
    }

    return result;
  }, [todayHistory, location, company]);

  // ========================================
  // UI
  // ========================================

  return (
    <section className="overall-card">
      <div className="card-heading">
        <span className="heading-icon heading-icon-blue">
          <CalendarDays size={26} />
        </span>

        <h2>
          Today's Activity ({today} - {locationName})
        </h2>

        <div className="card-heading-actions">
          <button
            type="button"
            className="btn-solid"
            onClick={handleUpdateClick}
          >
            <SquarePen size={17} />
            Update Today's Data
          </button>
        </div>
      </div>

      <div className="activity-grid">

        {/* ATTENDANCE - NEW API */}

        <div className="activity-tile tile-green">
          <Users size={46} />

          <div>
            <span className="tile-label">Attendance</span>

            <strong>
              {attendanceLoading ? "..." : attendanceCount}
            </strong>

            <span className="tile-unit">Workers</span>
          </div>
        </div>

        {/* PRODUCTION - EXISTING LOGIC */}

        <div className="activity-tile tile-blue">
          <Factory size={46} />

          <div>
            <span className="tile-label">
              Production (Today)
            </span>

            <strong>{todayActivity.production}</strong>

            <span className="tile-unit">Units</span>
          </div>
        </div>

        {/* CONSUMPTION - EXISTING LOGIC */}

        <div className="activity-tile tile-orange">
          <ShoppingCart size={46} />

          <div>
            <span className="tile-label">
              Consumption (Today)
            </span>

            <strong>{todayActivity.consumption}</strong>

            <span className="tile-unit">
              {todayActivity.consumptionUnit}
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}

export default TodayActivitySection;
