import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Users,
  Factory,
  Boxes,
  Truck,
  History,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";

import "./DailyHistoryPage.css";
 import "./DailyHistoryRedesign.css";

const API_URL = "http://localhost:5000/api/daily-history";

const HISTORY_FILTERS = [
  { id: "all", label: "All" },
  { id: "attendance", label: "Attendance" },
  { id: "production", label: "Production" },
  { id: "consumption", label: "Consumption" },
  { id: "customer_delivery", label: "Delivery" },
];

/* ========================================================= */
/* HELPERS                                                    */
/* ========================================================= */

const formatDateKey = (date) => {
  if (!date) return "";

  return new Date(date).toISOString().split("T")[0];
};

const formatFullDate = (date) => {
  if (!date) return "";

  return new Date(date).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatTime = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateTime = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// "base" -> "Base", "cubicMeter" -> "Cubic Meter"
const formatLabel = (key) =>
  String(key || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());

const getTypeLabel = (type) => {
  switch (type) {
    case "production":
      return "Production";
    case "consumption":
      return "Consumption";
    case "customer_delivery":
      return "Delivery";
    case "attendance":
      return "Attendance";
    default:
      return type || "-";
  }
};

const getActionLabel = (action) => {
  switch (action) {
    case "created":
      return "Created";
    case "updated":
      return "Updated";
    case "deleted":
      return "Deleted";
    default:
      return action || "-";
  }
};

const getLocationName = (location) =>
  location?.name || (typeof location === "string" ? location : "-");

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "object") return String(value._id || value.id || "");
  return String(value);
};

const getLocalDateKey = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDayStatus = (employeeDay) => employeeDay?.status || "-";

const getUserName = (user) =>
  user?.name || user?.email || (typeof user === "string" ? user : "-");

// Company name: categoryDetails (updates) or company (updatesHistory)
const getCompanyName = (data) => {
  if (!data) return "";

  if (data.categoryDetails?.name) return data.categoryDetails.name;

  if (data.company && typeof data.company === "object") {
    return data.company.name || "";
  }

  return data.company || "";
};

const getRemark = (data) => data?.remark || data?.workerDetails || "";

// Value chips of one record (attendance / production / consumption)
const getValueItems = (data) => {
  if (!data) return [];

  const items = [];

  if (data.workersPresent !== undefined) {
    items.push({ label: "Workers", value: data.workersPresent });
  }

  if (data.values && typeof data.values === "object") {
    Object.entries(data.values).forEach(([key, value]) => {
      items.push({ label: formatLabel(key), value });
    });
  }

  if (data.quantity !== undefined) {
    items.push({
      label: "Quantity",
      value: `${data.quantity}${data.unit ? ` ${data.unit}` : ""}`,
    });
  }

  if (Number(data.cft || 0) > 0) {
    items.push({ label: "CFT", value: data.cft });
  }

  if (Number(data.cubicMeter || 0) > 0) {
    items.push({ label: "Cubic Meter", value: data.cubicMeter });
  }

  if (Array.isArray(data.pieces)) {
    data.pieces
      .filter((piece) => Number(piece.count || 0) > 0)
      .forEach((piece) => {
        items.push({
          label: `${piece.width}x ${piece.height} x ${piece.inch} `,
          value: piece.count,
        });
      });
  }

  return items;
};

/* ========================================================= */
/* SMALL UI PIECES                                            */
/* ========================================================= */

function ValueChips({ data }) {
  const items = getValueItems(data);

  if (items.length === 0) return <span className="dh-muted">-</span>;

  return (
    <div className="dh-chips">
      {items.map((item, index) => (
        <span className="dh-chip" key={`${item.label}-${index}`}>
          <em>{item.label}</em>
          <b>{item.value}</b>
        </span>
      ))}
    </div>
  );
}

function Section({ tone, Icon, title, count, children }) {
  return (
    <section className={`dh-section dh-tone-${tone}`}>
      <div className="dh-section-head">
        <div className="dh-section-title">
          <span className="dh-section-icon">
            <Icon size={20} />
          </span>

          <h3>{title}</h3>
        </div>

        <span className="dh-count">{count}</span>
      </div>

      {children}
    </section>
  );
}

function EmptyState({ text }) {
  return <div className="dh-empty">{text}</div>;
}

// One production / consumption / delivery record
function RecordCard({ record, tone, title, subtitle, badge }) {
  const data = record.data || {};
  const remark = getRemark(data);

  return (
    <article className={`dh-record dh-tone-${tone}`}>
      <div className="dh-record-top">
        <div className="dh-record-name">
          <h4>{title || "-"}</h4>

          <div className="dh-record-meta">
            {badge && <span className="dh-badge">{badge}</span>}
            {subtitle && <span className="dh-sub">{subtitle}</span>}
          </div>
        </div>

        <span className="dh-time">
          <Clock size={13} />
          {formatTime(record.updatedAt)}
        </span>
      </div>

      <ValueChips data={data} />

      {remark && <p className="dh-remark">{remark}</p>}

      <div className="dh-record-foot">
        <span className="dh-loc">
          <MapPin size={13} />
          {getLocationName(record.locationId)}
        </span>

        <span>by {getUserName(record.updatedBy)}</span>
      </div>
    </article>
  );
}

/* ========================================================= */
/* PAGE                                                       */
/* ========================================================= */

function DailyHistoryPage() {
  const [dailyHistories, setDailyHistories] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState("all");
  const [attendanceWeeks, setAttendanceWeeks] = useState([]);
  const [customerDeliveries, setCustomerDeliveries] = useState([]);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [moduleError, setModuleError] = useState("");

  const stripRef = useRef(null);

  // =========================================
  // GET DAILY HISTORY
  // =========================================

  useEffect(() => {
    const fetchDailyHistories = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("accessToken");

        const response = await fetch(API_URL, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          credentials: "include",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Failed to fetch daily history");
        }

        const histories = result.data || [];

        setDailyHistories(histories);

        if (histories.length > 0) {
          setSelectedDate(formatDateKey(histories[0].date));
        }
      } catch (err) {
        console.error("Daily history fetch error:", err);

        setError(err.message || "Failed to load daily history");
      } finally {
        setLoading(false);
      }
    };

    fetchDailyHistories();
  }, []);

  // =========================================
  // GET LOCATIONS, ATTENDANCE & CUSTOMER DELIVERY
  // =========================================

  useEffect(() => {
    const fetchHistoryModules = async () => {
      try {
        setModuleLoading(true);
        setModuleError("");

        const token = localStorage.getItem("accessToken");
        const headers = {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        };
        const options = { headers, credentials: "include" };

        const [locationResponse, attendanceResponse, deliveryResponse] =
          await Promise.all([
            fetch("http://localhost:5000/api/locations", options),
            fetch("http://localhost:5000/api/employee-attendance", options),
            fetch("http://localhost:5000/api/customer-delivery", options),
          ]);

        const [locationResult, attendanceResult, deliveryResult] =
          await Promise.all([
            locationResponse.json(),
            attendanceResponse.json(),
            deliveryResponse.json(),
          ]);

        if (!locationResponse.ok) {
          throw new Error(locationResult.message || "Failed to fetch locations");
        }
        if (!attendanceResponse.ok) {
          throw new Error(attendanceResult.message || "Failed to fetch attendance");
        }
        if (!deliveryResponse.ok) {
          throw new Error(deliveryResult.message || "Failed to fetch customer deliveries");
        }

        setLocations(locationResult.data || []);
        setAttendanceWeeks(attendanceResult.data || []);
        setCustomerDeliveries(deliveryResult.data || []);
      } catch (err) {
        console.error("Daily history module fetch error:", err);
        setModuleError(err.message || "Failed to load attendance and delivery history");
      } finally {
        setModuleLoading(false);
      }
    };

    fetchHistoryModules();
  }, []);

  // =========================================
  // SELECTED DAY
  // =========================================

  const selectedHistory = useMemo(() => {
    if (!selectedDate) return null;

    return dailyHistories.find(
      (history) => formatDateKey(history.date) === selectedDate
    );
  }, [dailyHistories, selectedDate]);

  const attendanceRecords = useMemo(() => {
    if (!selectedDate) return [];

    const records = [];
    attendanceWeeks.forEach((week) => {
      (week.locations || []).forEach((locationEntry) => {
        (locationEntry.employees || []).forEach((employee) => {
          (employee.days || []).forEach((day) => {
            if (getLocalDateKey(day.date) !== selectedDate) return;

            const actualWorkLocationId = getId(day.workLocationId);
            if (!actualWorkLocationId) return;
            if (
              selectedLocationId !== "all" &&
              actualWorkLocationId !== selectedLocationId
            ) return;

            records.push({
              ...day,
              employeeId: employee.employeeId,
              employeeName: employee.name || employee.employeeName || "Unknown Employee",
              workLocationId: actualWorkLocationId,
            });
          });
        });
      });
    });
    return records;
  }, [attendanceWeeks, selectedDate, selectedLocationId]);

  const attendanceGroups = useMemo(() => ([
    { status: "Working", records: attendanceRecords.filter((record) => record.status === "Working") },
    { status: "Leave", records: attendanceRecords.filter((record) => record.status === "Leave") },
    { status: "Permission", records: attendanceRecords.filter((record) => record.status === "Permission") },
  ]), [attendanceRecords]);

  const attendanceCount = attendanceRecords.length;

  const productionRecords = useMemo(
    () => selectedHistory?.updates?.filter((update) => update.type === "production") || [],
    [selectedHistory]
  );

  const consumptionRecords = useMemo(
    () => selectedHistory?.updates?.filter((update) => update.type === "consumption") || [],
    [selectedHistory]
  );

  const deliveryRecords = useMemo(() => {
    if (!selectedDate) return [];

    return customerDeliveries.filter((delivery) => {
      if (getLocalDateKey(delivery.actualDeliveryDate) !== selectedDate) return false;
      const assignedLocationId = getId(delivery.orderId?.assignedLocation);
      if (!assignedLocationId) return false;
      return selectedLocationId === "all" || assignedLocationId === selectedLocationId;
    });
  }, [customerDeliveries, selectedDate, selectedLocationId]);

  // Update history: newest first
  const historyEntries = useMemo(() => {
    return [...(selectedHistory?.updatesHistory || [])].sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  }, [selectedHistory]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === "all") return historyEntries;

    return historyEntries.filter((entry) => entry.type === historyFilter);
  }, [historyEntries, historyFilter]);

  const filterCounts = useMemo(() => {
    const counts = { all: historyEntries.length };

    historyEntries.forEach((entry) => {
      counts[entry.type] = (counts[entry.type] || 0) + 1;
    });

    return counts;
  }, [historyEntries]);

  const scrollStrip = (direction) => {
    stripRef.current?.scrollBy({
      left: direction * 320,
      behavior: "smooth",
    });
  };

  // =========================================
  // SHELL (sidebar + header stay as they are)
  // =========================================

  const renderShell = (children) => (
    <div className="daily-history-layout">
      <Sidebar />

      <div className="daily-history-main">
        <Header />

        <main className="daily-history-content">
          <div className="dh-page">{children}</div>
        </main>
      </div>
    </div>
  );

  if (loading) {
    return renderShell(
      <div className="dh-state">Loading daily history...</div>
    );
  }

  if (error) {
    return renderShell(<div className="dh-state dh-state-error">{error}</div>);
  }

  return renderShell(
    <>
      {/* ======================================
          PAGE HEADER
      ======================================= */}

      <div className="dh-header">
        <div>
          <h1>Daily History</h1>

          <p>
            View attendance, production, consumption and daily activities.
          </p>
        </div>

        <span className="dh-days-badge">
          <CalendarDays size={16} />
          {dailyHistories.length} {dailyHistories.length === 1 ? "Day" : "Days"}
        </span>
      </div>

      {dailyHistories.length === 0 ? (
        <EmptyState text="No daily history available." />
      ) : (
        <>
          {/* ======================================
              DATE STRIP (horizontal)
          ======================================= */}

          <div className="dh-strip-card">
            <div className="dh-strip-top">
              <div className="dh-strip-title">
                <CalendarDays size={18} />
                <h2>Date Wise History</h2>
              </div>

              <div className="dh-strip-nav">
                <button
                  type="button"
                  aria-label="Scroll left"
                  onClick={() => scrollStrip(-1)}
                >
                  <ChevronLeft size={18} />
                </button>

                <button
                  type="button"
                  aria-label="Scroll right"
                  onClick={() => scrollStrip(1)}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="dh-strip" ref={stripRef}>
              {dailyHistories.map((history) => {
                const key = formatDateKey(history.date);
                const date = new Date(history.date);

                return (
                  <button
                    key={history._id}
                    type="button"
                    className={`dh-date ${selectedDate === key ? "selected" : ""}`}
                    onClick={() => setSelectedDate(key)}
                  >
                    <span className="dh-date-week">
                      {date.toLocaleDateString("en-IN", { weekday: "short" })}
                    </span>

                    <span className="dh-date-day">
                      {String(date.getDate()).padStart(2, "0")}
                    </span>

                    <span className="dh-date-month">
                      {date.toLocaleDateString("en-IN", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedHistory && (
            <>
              {/* ======================================
                  DAY TITLE + SUMMARY
              ======================================= */}

              <div className="dh-day-title">
                <h2>{formatFullDate(selectedHistory.date)}</h2>
                <span>Daily activity summary</span>
              </div>

              <div className="dh-location-filter" style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0 18px" }}>
                <label htmlFor="daily-history-location" style={{ fontWeight: 600 }}>View on Location</label>
                <select
                  id="daily-history-location"
                  value={selectedLocationId}
                  onChange={(event) => setSelectedLocationId(event.target.value)}
                  style={{ minWidth: 180, padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
                >
                  <option value="all">All Locations</option>
                  {locations.map((location) => (
                    <option key={location._id} value={location._id}>{location.name}</option>
                  ))}
                </select>
                {moduleLoading && <span className="dh-muted">Loading attendance & delivery...</span>}
                {moduleError && <span className="dh-state-error">{moduleError}</span>}
              </div>

              <div className="dh-summary-grid">
                <div className="dh-summary dh-tone-green">
                  <span className="dh-summary-icon">
                    <Users size={22} />
                  </span>

                  <div>
                    <span>Attendance</span>
                    <strong>{attendanceCount} Workers</strong>
                  </div>
                </div>

                <div className="dh-summary dh-tone-blue">
                  <span className="dh-summary-icon">
                    <Factory size={22} />
                  </span>

                  <div>
                    <span>Production</span>
                    <strong>{productionRecords.length} Records</strong>
                  </div>
                </div>

                <div className="dh-summary dh-tone-orange">
                  <span className="dh-summary-icon">
                    <Boxes size={22} />
                  </span>

                  <div>
                    <span>Consumption</span>
                    <strong>{consumptionRecords.length} Records</strong>
                  </div>
                </div>

                <div className="dh-summary dh-tone-purple">
                  <span className="dh-summary-icon">
                    <Truck size={22} />
                  </span>

                  <div>
                    <span>Customer Delivery</span>
                    <strong>{deliveryRecords.length} Records</strong>
                  </div>
                </div>
              </div>

              {/* ======================================
                  ATTENDANCE
              ======================================= */}

              <Section
                tone="green"
                Icon={Users}
                title="Attendance"
                count={`${attendanceRecords.length} Workers`}
              >
                {attendanceRecords.length === 0 ? (
                  <EmptyState text="No attendance records for this date and location" />
                ) : (
                  <div className="dh-record-grid">
                    {attendanceGroups.map((group) => (
                      <div key={group.status} className="dh-att-card">
                        <div className="dh-section-head">
                          <h4>{group.status}</h4>
                          <span className="dh-count">{group.records.length}</span>
                        </div>
                        {group.records.length === 0 ? (
                          <span className="dh-muted">No employees</span>
                        ) : group.records.map((record, index) => (
                          <div key={`${record.employeeId || record.employeeName}-${index}`} className="dh-old">
                            <div className="dh-record-meta">
                              <strong>{record.employeeName}</strong>
                              {record.workCategory && (
                                <span className="dh-sub">{record.workCategory}</span>
                              )}
                            </div>
                            <span className="dh-loc">
                              <MapPin size={13} />
                              {locations.find((item) => item._id === record.workLocationId)?.name || "-"}
                            </span>
                            {(record.punchIn || record.punchOut) && (
                              <p className="dh-remark">
                                {record.punchIn ? `In: ${formatTime(record.punchIn)}` : ""}
                                {record.punchIn && record.punchOut ? " | " : ""}
                                {record.punchOut ? `Out: ${formatTime(record.punchOut)}` : ""}
                              </p>
                            )}
                            {record.workingHours !== undefined && record.workingHours !== null && (
                              <p className="dh-remark">Working Hours: {record.workingHours}</p>
                            )}
                            {record.remark && <p className="dh-remark">{record.remark}</p>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* ======================================
                  PRODUCTION
              ======================================= */}

              <Section
                tone="blue"
                Icon={Factory}
                title="Production"
                count={`${productionRecords.length} Records`}
              >
                {productionRecords.length === 0 ? (
                  <EmptyState text="No production records for this date" />
                ) : (
                  <div className="dh-record-grid">
                    {productionRecords.map((record) => (
                      <RecordCard
                        key={record._id}
                        record={record}
                        tone="blue"
                        title={record.data?.product?.name}
                        subtitle={getCompanyName(record.data)}
                      />
                    ))}
                  </div>
                )}
              </Section>

              {/* ======================================
                  CONSUMPTION
              ======================================= */}

              <Section
                tone="orange"
                Icon={Boxes}
                title="Consumption"
                count={`${consumptionRecords.length} Records`}
              >
                {consumptionRecords.length === 0 ? (
                  <EmptyState text="No consumption records for this date" />
                ) : (
                  <div className="dh-record-grid">
                    {consumptionRecords.map((record) => (
                      <RecordCard
                        key={record._id}
                        record={record}
                        tone="orange"
                        title={record.data?.reference?.name}
                        badge={getTypeLabel(record.data?.type)}
                        subtitle={
                          record.data?.type === "item"
                            ? record.data?.categoryDetails?.name
                            : ""
                        }
                      />
                    ))}
                  </div>
                )}
              </Section>

              {/* ======================================
                  CUSTOMER DELIVERY
              ======================================= */}

              <Section
                tone="purple"
                Icon={Truck}
                title="Customer Delivery"
                count={`${deliveryRecords.length} Records`}
              >
                {deliveryRecords.length === 0 ? (
                  <EmptyState text="No customer delivery records for this date and location" />
                ) : (
                  <div className="dh-record-grid">
                    {deliveryRecords.map((delivery) => (
                      <article className="dh-record dh-tone-purple" key={delivery._id}>
                        <div className="dh-record-top">
                          <div className="dh-record-name">
                            <h4>{delivery.deliveryNo || "Delivery"}</h4>
                            <div className="dh-record-meta">
                              <span className="dh-badge">{delivery.deliveryStatus || "-"}</span>
                              <span className="dh-sub">{delivery.customerName || "-"}</span>
                            </div>
                          </div>
                          <span className="dh-time">{formatDateKey(delivery.actualDeliveryDate)}</span>
                        </div>

                        <div className="dh-details">
                          <strong>{delivery.companyId?.companyName || "-"}</strong>
                          <span>{getLocationName(delivery.orderId?.assignedLocation)}</span>
                        </div>

                        {(delivery.products || []).map((product) => (
                          <div className="dh-old" key={product._id || product.productId}>
                            <p className="dh-remark">
                              <strong>{product.productName}</strong>
                              {product.size ? ` (${product.size})` : ""}
                              {` · ${product.finishedMaterialCategoryName || ""}`}
                            </p>
                            <ValueChips data={{
                              values: {
                                "Rate Per Piece": product.ratePerPiece,
                                Amount: product.amount,
                                ...(product.fields || []).reduce((acc, field) => {
                                  acc[`${field.fieldName} Ordered`] = field.orderedQuantity;
                                  acc[`${field.fieldName} Delivered`] = field.deliveredQuantity;
                                  acc[`${field.fieldName} Pending`] = field.pendingQuantity;
                                  if (field.stockDeductedQuantity !== undefined) {
                                    acc[`${field.fieldName} Stock Deducted`] = field.stockDeductedQuantity;
                                  }
                                  return acc;
                                }, {}),
                              },
                            }} />
                          </div>
                        ))}

                        <ValueChips data={{
                          values: {
                            "Tax Amount": delivery.taxAmount ?? 0,
                            "Delivery Status": delivery.deliveryStatus || "-",
                          },
                        }} />
                        {delivery.remarks && <p className="dh-remark">{delivery.remarks}</p>}
                      </article>
                    ))}
                  </div>
                )}
              </Section>

              {/* ======================================
                  UPDATE HISTORY
              ======================================= */}

              <Section
                tone="slate"
                Icon={History}
                title="Update History"
                count={`${historyEntries.length} Records`}
              >
                <div className="dh-filters">
                  {HISTORY_FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      className={`dh-filter ${
                        historyFilter === filter.id ? "active" : ""
                      }`}
                      onClick={() => setHistoryFilter(filter.id)}
                    >
                      {filter.label}
                      <span>{filterCounts[filter.id] || 0}</span>
                    </button>
                  ))}
                </div>

                <div className="dh-table-wrap">
                  <table className="dh-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Type</th>
                        <th>Action</th>
                        <th>Location</th>
                        <th>Details</th>
                        <th>Old Value</th>
                        <th>New Value</th>
                        <th>Updated By</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredHistory.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="dh-table-empty">
                            No update history available
                          </td>
                        </tr>
                      ) : (
                        filteredHistory.map((entry, index) => {
                          const data = entry.newData || entry.oldData || {};
                          const name =
                            data.product?.name || data.reference?.name || "";
                          const sub = getCompanyName(data);

                          return (
                            <tr key={entry._id || index}>
                              <td className="dh-nowrap">
                                {formatDateTime(entry.updatedAt)}
                              </td>

                              <td>
                                <span className="dh-type-pill">
                                  {getTypeLabel(entry.type)}
                                </span>
                              </td>

                              <td>
                                <span className={`dh-action ${entry.action}`}>
                                  {getActionLabel(entry.action)}
                                </span>
                              </td>

                              <td className="dh-nowrap">
                                {getLocationName(entry.locationId)}
                              </td>

                              <td>
                                {name ? (
                                  <div className="dh-details">
                                    <strong>{name}</strong>
                                    {sub && <span>{sub}</span>}
                                  </div>
                                ) : (
                                  <span className="dh-muted">-</span>
                                )}
                              </td>

                              <td>
                                {entry.action === "created" ? (
                                  <span className="dh-muted">-</span>
                                ) : (
                                  <div className="dh-old">
                                    <ValueChips data={entry.oldData} />
                                    {getRemark(entry.oldData) && (
                                      <p className="dh-remark">
                                        {getRemark(entry.oldData)}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </td>

                              <td>
                                {entry.action === "deleted" ? (
                                  <span className="dh-muted">-</span>
                                ) : (
                                  <div>
                                    <ValueChips data={entry.newData} />
                                    {getRemark(entry.newData) && (
                                      <p className="dh-remark">
                                        {getRemark(entry.newData)}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </td>

                              <td className="dh-nowrap">
                                {getUserName(entry.updatedBy)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Section>
            </>
          )}
        </>
      )}
    </>
  );
}

export default DailyHistoryPage;
