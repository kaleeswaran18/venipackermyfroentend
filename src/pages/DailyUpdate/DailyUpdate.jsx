import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Users,
  Factory,
  ShoppingCart,
  Package,
  Hammer,
  Droplets,
  ArrowLeft,
  Save,
  Pencil,
  Trash2,
  Plus,
  ClipboardList,
  Clock,
  X,
} from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import api from "../../api/axios";

import "./DailyUpdate.css";
import "./EntryModal.css";

const OVERALL_STOCK_PATH = "/overall-stock";

const TABS = [
  { id: "attendance", number: 1, label: "Attendance", tone: "green", Icon: Users },
  { id: "production", number: 2, label: "Production", tone: "blue", Icon: Factory },
  { id: "consumption", number: 3, label: "Consumption", tone: "orange", Icon: ShoppingCart },
];

const CONSUMPTION_TABS = [
  { id: "item", label: "Item", Icon: Package },
  { id: "nail", label: "Nails", Icon: Hammer },
  { id: "consumable", label: "Consumables", Icon: Droplets },
];

const ITEM_CONDITION_TABS = [
  { id: "useditem", label: "Used Item" },
  { id: "newitem", label: "New Item" },
];

function DailyUpdate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Sent from Overall Stock page: /master/daily-update?location=<id>&company=<id>
  const locationParam = searchParams.get("location");
  const companyParam = searchParams.get("company");

  const [activeTab, setActiveTab] = useState("attendance");
  const [activeConsumptionTab, setActiveConsumptionTab] = useState("item");
  const [activeItemCondition, setActiveItemCondition] = useState("useditem");
  const [dailyHistory, setDailyHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // FETCH TODAY DAILY HISTORY
  // =====================================================

  const fetchTodayDailyHistory = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) setLoading(true);
        setError("");

        const response = await api.get("/daily-history/today", {
          params: {
            ...(locationParam && { locationId: locationParam }),
            ...(companyParam && { companyId: companyParam }),
          },
        });

        setDailyHistory(response.data?.data || null);
      } catch (err) {
        console.error("Failed to fetch today's daily history:", err);

        if (!silent) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Failed to load today's data"
          );
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [locationParam, companyParam]
  );

  useEffect(() => {
    fetchTodayDailyHistory();
  }, [fetchTodayDailyHistory]);

  // =====================================================
  // COMMON DATA
  // =====================================================

  const attendanceData = dailyHistory?.attendance || [];
  const productionData = dailyHistory?.production || [];
  const consumptionData = dailyHistory?.consumption || [];
  const updatesData = dailyHistory?.updates || [];
  const historyData = dailyHistory?.updatesHistory || [];

  // userId -> name (updatesHistory only stores the user id)
  const userNameMap = useMemo(() => {
    const map = {};
    updatesData.forEach((update) => {
      if (update.updatedBy?._id) map[update.updatedBy._id] = update.updatedBy.name;
    });
    return map;
  }, [updatesData]);

  // Location from URL; falls back to first available location.
  const selectedLocationId = useMemo(() => {
    if (locationParam) return locationParam;
    if (productionData.length > 0) return productionData[0]?.locationId?._id;
    if (attendanceData.length > 0) return attendanceData[0]?.locationId?._id;
    if (consumptionData.length > 0) return consumptionData[0]?.locationId?._id;
    return null;
  }, [locationParam, productionData, attendanceData, consumptionData]);

  const selectedLocationName = useMemo(() => {
    const sources = [attendanceData, productionData, consumptionData];

    for (const list of sources) {
      const found = list.find(
        (item) => item.locationId?._id === selectedLocationId
      );

      if (found?.locationId?.name) return found.locationId.name;
    }

    return "-";
  }, [attendanceData, productionData, consumptionData, selectedLocationId]);

  // Production category = FinishedMaterial (e.g. Mahindra City)
  const selectedCategory = useMemo(() => {
    const locationProduction = productionData.find(
      (item) => item.locationId?._id === selectedLocationId
    );

    const categories = locationProduction?.categories || [];

    // Company from URL; falls back to first category.
    if (companyParam) {
      const matched = categories.find(
        (category) => category.categoryId?._id === companyParam
      );

      if (matched) return matched.categoryId;
    }

    return categories[0]?.categoryId || null;
  }, [productionData, selectedLocationId, companyParam]);

  const selectedCategoryId = selectedCategory?._id || null;
  const selectedCategoryName = selectedCategory?.name || "All";

  const formattedDate = useMemo(() => {
    if (!dailyHistory?.date) return "-";

    return new Date(dailyHistory.date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [dailyHistory]);

  // =====================================================
  // SAVE ENTRY (popup submit)
  // =====================================================

  // PATCH /api/daily-history/:id  (id = today's daily history _id)
  const handleSaveEntry = async (payload) => {
    if (!dailyHistory?._id) {
      throw new Error("Today's daily history not found");
    }

    await api.patch(`/daily-history/${dailyHistory._id}`, payload);

    // Refresh tables without the full-page loader
    await fetchTodayDailyHistory({ silent: true });
  };

  // =====================================================
  // LAYOUT WRAPPER
  // =====================================================

  const renderShell = (children) => (
    <div className="daily-update-layout">
      <Sidebar />

      <div className="daily-update-main">
        <Header />
        <main className="daily-update-content">{children}</main>
      </div>
    </div>
  );

  if (loading) {
    return renderShell(
      <div className="empty-section">Loading today's data...</div>
    );
  }

  if (error) {
    return renderShell(<div className="empty-section">{error}</div>);
  }

  // =====================================================
  // MAIN UI
  // =====================================================

  return renderShell(
    <>
      {/* PAGE HEADER */}

      <div className="daily-update-header">
        <div>
          <h1>Update Today's Data</h1>

          <div className="daily-update-meta">
            <div>
              <strong>Date:</strong>
              <span>{formattedDate}</span>
            </div>

            <div>
              <strong>Location:</strong>
              <span>{selectedLocationName}</span>
            </div>

            <div>
              <strong>Company:</strong>
              <span className="company-badge">{selectedCategoryName}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="back-button"
          onClick={() => navigate(OVERALL_STOCK_PATH)}
        >
          <ArrowLeft size={18} />
          Back to Overview
        </button>
      </div>

      {/* ACTIVITY TABS */}

      <div className="activity-tabs" role="tablist">
        {TABS.map(({ id, number, label, tone, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            className={`activity-tab tone-${tone} ${
              activeTab === id ? "active" : ""
            }`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={28} className="activity-icon" />
            <span className="activity-number">{number}</span>
            <span className="activity-label">{label}</span>
          </button>
        ))}
      </div>

      {activeTab === "attendance" && (
        <AttendanceSection
          key={selectedLocationId}
          selectedLocationId={selectedLocationId}
          historyData={historyData}
          userNameMap={userNameMap}
        />
      )}

      {activeTab === "production" && (
        <ProductionSection
          productionData={productionData}
          updatesData={updatesData}
          historyData={historyData}
          userNameMap={userNameMap}
          selectedLocationId={selectedLocationId}
          selectedCategoryId={selectedCategoryId}
          onSave={handleSaveEntry}
        />
      )}

      {activeTab === "consumption" && (
        <ConsumptionSection
          consumptionData={consumptionData}
          updatesData={updatesData}
          historyData={historyData}
          userNameMap={userNameMap}
          selectedLocationId={selectedLocationId}
          selectedCompanyId={selectedCategoryId}
          activeConsumptionTab={activeConsumptionTab}
          setActiveConsumptionTab={setActiveConsumptionTab}
          activeItemCondition={activeItemCondition}
          setActiveItemCondition={setActiveItemCondition}
          onSave={handleSaveEntry}
        />
      )}

    </>
  );
}

/* ========================================================= */
/* SHARED UI                                                  */
/* ========================================================= */

function CardHeader({ tone, Icon, title, subtitle }) {
  return (
    <div className="activity-card-header">
      <div className="section-icon">
        <Icon size={28} />
      </div>

      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function HistoryCard({ Icon, title, subtitle, children }) {
  return (
    <section className="history-card">
      <div className="history-header">
        <div className="history-title-icon">
          <Icon size={22} />
        </div>

        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="table-wrapper">{children}</div>
    </section>
  );
}

function EmptyRow({ colSpan, text }) {
  return (
    <tr>
      <td colSpan={colSpan} className="empty-cell">
        {text}
      </td>
    </tr>
  );
}

function ActionButtons({ withDelete = false, onEdit, onUpdate }) {
  return (
    <div className="table-actions">
      <button className="edit-button" type="button" onClick={onEdit}>
        <Pencil size={14} />
        Edit
      </button>

      {/* <button className="update-button" type="button" onClick={onUpdate}>
        <Save size={14} />
        Update
      </button> */}

      {/* {withDelete && (
        <button className="delete-button" type="button">
          <Trash2 size={14} />
          Delete
        </button>
      )} */}
    </div>
  );
}

function AddButton({ onClick }) {
  return (
    <button
      className="add-button"
      type="button"
      aria-label="Add"
      onClick={onClick}
    >
      <Plus size={16} />
    </button>
  );
}

function EntryModal({ title, subtitle, fields, initialValues, onClose, onSubmit }) {
  const [values, setValues] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleChange = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      await onSubmit(values);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to save entry"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="entry-modal-overlay" onClick={onClose}>
      <form
        className="entry-modal"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="entry-modal-header">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>

          <button
            type="button"
            className="entry-modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="entry-modal-body">
          {fields.map((field) => (
            <div className="entry-field" key={field.key}>
              <label htmlFor={`entry-${field.key}`}>
                {field.label}
                {field.hint && (
                  <span className="entry-field-hint">{field.hint}</span>
                )}
              </label>

              {field.type === "textarea" ? (
                <textarea
                  id={`entry-${field.key}`}
                  value={values[field.key] ?? ""}
                  placeholder={field.placeholder || ""}
                  onChange={(event) =>
                    handleChange(field.key, event.target.value)
                  }
                />
              ) : (
                <input
                  id={`entry-${field.key}`}
                  type={field.type || "text"}
                  min={field.type === "number" ? "0" : undefined}
                  step={field.type === "number" ? "any" : undefined}
                  value={values[field.key] ?? ""}
                  readOnly={field.readOnly}
                  className={field.readOnly ? "readonly" : ""}
                  onChange={(event) =>
                    handleChange(field.key, event.target.value)
                  }
                />
              )}
            </div>
          ))}

          {error && <div className="entry-modal-error">{error}</div>}
        </div>

        <div className="entry-modal-footer">
          <button
            type="button"
            className="entry-cancel-button"
            onClick={onClose}
          >
            Cancel
          </button>

          <button type="submit" className="entry-save-button" disabled={saving}>
            <Save size={16} />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ========================================================= */
/* ATTENDANCE                                                 */
/* ========================================================= */

function AttendanceSection({ historyData, selectedLocationId, userNameMap }) {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState("");

  const fetchAttendance = useCallback(async () => {
    try {
      setAttendanceLoading(true);
      setAttendanceError("");

      // Fetch the weekly attendance documents. Each employee's day record
      // contains workLocationId, which is the actual location for that day.
      const response = await api.get("/employee-attendance");
      const payload = response.data?.data ?? response.data;
      const records = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.attendance)
          ? payload.attendance
          : Array.isArray(payload?.records)
            ? payload.records
            : Array.isArray(payload?.docs)
              ? payload.docs
              : Array.isArray(payload?.locations)
                ? [payload]
                : [];

      setAttendanceRecords(records);
    } catch (err) {
      console.error("Failed to fetch employee attendance:", err);
      setAttendanceError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load employee attendance"
      );
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance, selectedLocationId]);

  const todayEmployees = useMemo(() => {
    if (!selectedLocationId) return [];

    const todayKey = getLocalDateKey(new Date());
    const employeeMap = new Map();

    attendanceRecords.forEach((weeklyRecord) => {
      (weeklyRecord.locations || []).forEach((locationRecord) => {
        (locationRecord.employees || []).forEach((employeeRecord) => {
          const employee = employeeRecord.employeeId;
          const employeeId = getRefId(employee) || getRefId(employeeRecord._id);
          const employeeName =
            employee?.fullName ||
            employee?.name ||
            [employee?.firstName, employee?.lastName].filter(Boolean).join(" ") ||
            employeeRecord.name ||
            "Unknown Employee";

          (employeeRecord.days || []).forEach((day) => {
            if (getLocalDateKey(day.date) !== todayKey) return;

            // IMPORTANT: use only workLocationId, never permanentLocationId.
            if (getRefId(day.workLocationId) !== String(selectedLocationId)) return;

            const status = String(day.status || "").trim().toLowerCase();
            if (!["working", "leave", "permission"].includes(status)) return;

            const uniqueKey = `${employeeId || employeeName}-${todayKey}`;
            employeeMap.set(uniqueKey, {
              id: uniqueKey,
              name: employeeName,
              status,
              punchIn: day.punchIn,
              punchOut: day.punchOut,
              workingHours: day.workingHours,
              workCategory: day.workCategory || "",
            });
          });
        });
      });
    });

    return Array.from(employeeMap.values());
  }, [attendanceRecords, selectedLocationId]);

  const workingEmployees = todayEmployees.filter((item) => item.status === "working");
  const leaveEmployees = todayEmployees.filter((item) => item.status === "leave");
  const permissionEmployees = todayEmployees.filter((item) => item.status === "permission");

  const attendanceHistory = getHistoryEntries(
    historyData,
    "attendance",
    selectedLocationId
  );

  return (
    <>
      <section className="activity-card tone-green" style={{ marginBottom: 20 }}>
        <CardHeader
          Icon={Users}
          title="Today's Attendance"
          subtitle="Employees grouped by their actual work location"
        />

        {attendanceLoading ? (
          <div className="empty-section">Loading attendance...</div>
        ) : attendanceError ? (
          <div className="empty-section" role="alert">{attendanceError}</div>
        ) : (
          <div
            className="attendance-status-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              marginTop: 16,
            }}
          >
            <AttendanceStatusCard
              title="Working"
              employees={workingEmployees}
              tone="#15803d"
            />
            <AttendanceStatusCard
              title="Leave"
              employees={leaveEmployees}
              tone="#b45309"
            />
            <AttendanceStatusCard
              title="Permission"
              employees={permissionEmployees}
              tone="#2563eb"
            />
          </div>
        )}
      </section>

      {/* <HistoryCard
        Icon={Clock}
        title="Attendance History"
        subtitle="Changes made to today's attendance"
      >
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Time</th>
              <th>Action</th>
              <th>No. of Workers</th>
              <th>Employees</th>
              <th>Updated By</th>
            </tr>
          </thead>
          <tbody>
            {attendanceHistory.length === 0 ? (
              <EmptyRow colSpan={6} text="No attendance history" />
            ) : (
              attendanceHistory.map((entry, index) => (
                <tr key={entry._id || `attendance-history-${index}`}>
                  <td>{index + 1}</td>
                  <td>{formatTime(entry.updatedAt)}</td>
                  <td><ActionChip action={entry.action} /></td>
                  <td className="strong">
                    <HistoryChange
                      entry={entry}
                      render={(data) => data?.workersPresent ?? 0}
                    />
                  </td>
                  <td>
                    <HistoryChange
                      entry={entry}
                      render={(data) => data?.workerDetails || "-"}
                    />
                  </td>
                  <td>{getHistoryUserName(entry, userNameMap)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </HistoryCard> */}
    </>
  );
}

function AttendanceStatusCard({ title, employees, tone }) {
  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderTop: `4px solid ${tone}`,
        borderRadius: 10,
        padding: 16,
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <strong style={{ color: tone, fontSize: 20 }}>{employees.length}</strong>
      </div>

      {employees.length === 0 ? (
        <p style={{ margin: 0, color: "#6b7280" }}>No employees</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          {employees.map((employee) => (
            <li key={employee.id} style={{ paddingBottom: 8, borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ fontWeight: 600 }}>
                {employee.name}
                {employee.workCategory && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#64748b",
                    }}
                  >
                    ({employee.workCategory})
                  </span>
                )}
              </div>
              {(employee.punchIn || employee.punchOut) && (
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 3 }}>
                  {employee.punchIn && <span>In: {formatAttendanceTime(employee.punchIn)}</span>}
                  {employee.punchIn && employee.punchOut && <span> · </span>}
                  {employee.punchOut && <span>Out: {formatAttendanceTime(employee.punchOut)}</span>}
                </div>
              )}
              {employee.workingHours !== undefined && employee.workingHours !== null && employee.workingHours !== "" && (
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>
                  Work time: {employee.workingHours}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function getLocalDateKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatAttendanceTime(value) {
  if (!value) return "";

  // Supports both ISO/date values and already formatted time strings.
  if (typeof value === "string" && /^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) {
    const [hour, minute] = value.split(":");
    const date = new Date();
    date.setHours(Number(hour), Number(minute), 0, 0);
    return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ========================================================= */
/* PRODUCTION                                                 */
/* ========================================================= */

function ProductionSection({
  productionData,
  updatesData,
  historyData,
  userNameMap,
  selectedLocationId,
  selectedCategoryId,
  onSave,
}) {
  const [entry, setEntry] = useState(null);

  const locationProduction = productionData.find(
    (item) => item.locationId?._id === selectedLocationId
  );

  const categoryProduction = locationProduction?.categories?.find(
    (category) => category.categoryId?._id === selectedCategoryId
  );

  const products = categoryProduction?.products || [];
  const fieldKeys = getProductionFieldKeys(products);

  const productionUpdates = updatesData.filter(
    (update) =>
      update.type === "production" &&
      update.locationId?._id === selectedLocationId
  );

  // productId -> product name (updates only store productId)
  const productNameMap = {};
  productionData.forEach((location) =>
    (location.categories || []).forEach((category) =>
      (category.products || []).forEach((product) => {
        if (product.productId?._id) {
          productNameMap[product.productId._id] = product.productId.name;
        }
      })
    )
  );

  const getUpdateProductName = (update) =>
    update.data?.productName ||
    productNameMap[update.data?.productId] ||
    update.data?.productId ||
    "-";

  const productionHistory = getHistoryEntries(
    historyData,
    "production",
    selectedLocationId
  );

  const getHistoryProductName = (entry) => {
    const d = entry.newData || entry.oldData || {};
    return productNameMap[d.productId] || d.productId || "-";
  };

  const openEntry = (product) => {
    setEntry({
      product,
      fields: [
        { key: "productName", label: "Product Name", type: "text", readOnly: true },
        ...fieldKeys.map((field) => ({
          key: `value_${field}`,
          label: formatFieldName(field),
          type: "number",
          hint: `Current total: ${product.values?.[field] ?? 0}`,
        })),
        { key: "remark", label: "Remark", type: "textarea", placeholder: "Optional remark" },
      ],
      initialValues: {
        productName: product.productId?.name || "",
        // New entry starts from 0 (value is added to the total)
        ...Object.fromEntries(
          fieldKeys.map((field) => [`value_${field}`, 0])
        ),
        remark: "",
      },
    });
  };

  // EDIT: open the modal pre-filled with the saved values of one update record
  const openEdit = (update) => {
    const data = update.data || {};
    const values = data.values || {};
    const keys = Object.keys(values);

    setEntry({
      mode: "edit",
      update,
      fields: [
        { key: "productName", label: "Product Name", type: "text", readOnly: true },
        ...keys.map((field) => ({
          key: `value_${field}`,
          label: formatFieldName(field),
          type: "number",
        })),
        { key: "remark", label: "Remark", type: "textarea", placeholder: "Optional remark" },
      ],
      initialValues: {
        productName: getUpdateProductName(update),
        ...Object.fromEntries(
          keys.map((field) => [`value_${field}`, values[field] ?? 0])
        ),
        remark: data.remark || "",
      },
    });
  };

  const submitEntry = async (formValues) => {
    const isEdit = entry.mode === "edit";
    const data = isEdit ? entry.update.data || {} : {};

    const keys = isEdit ? Object.keys(data.values || {}) : fieldKeys;

    await onSave({
      type: "production",
      locationId: selectedLocationId,
      categoryId: isEdit ? data.categoryId || selectedCategoryId : selectedCategoryId,
      productId: isEdit ? data.productId : entry.product.productId?._id,
      values: Object.fromEntries(
        keys.map((field) => [
          field,
          Number(formValues[`value_${field}`] || 0),
        ])
      ),
      remark: formValues.remark,
      ...(isEdit && { updateId: entry.update._id }),
    });

    setEntry(null);
  };

  return (
    <>
      {entry && (
        <EntryModal
          title={entry.mode === "edit" ? "Edit Production" : "Add Production"}
          subtitle={entry.initialValues.productName}
          fields={entry.fields}
          initialValues={entry.initialValues}
          onClose={() => setEntry(null)}
          onSubmit={submitEntry}
        />
      )}

      <section className="activity-card tone-blue">
        <CardHeader
          Icon={Factory}
          title="Production"
          subtitle="Manage production quantity by product"
        />

        <div className="table-wrapper table-wrapper-top">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Product Name</th>

                {fieldKeys.map((field) => (
                  <th key={field}>{formatFieldName(field)}</th>
                ))}

                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {products.length === 0 ? (
                <EmptyRow
                  colSpan={3 + fieldKeys.length}
                  text="No products found"
                />
              ) : (
                products.map((product, index) => (
                  <tr key={product.productId?._id || index}>
                    <td>{index + 1}</td>
                    <td className="strong">
                      {product.productId?.name || "-"}
                    </td>

                    {fieldKeys.map((field) => (
                      <td key={field}>{product.values?.[field] ?? 0}</td>
                    ))}

                    <td>
                      <AddButton onClick={() => openEntry(product)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <HistoryCard
        Icon={ClipboardList}
        title="Production Today Action"
        subtitle="Today's created records (modify if needed)"
      >
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>Values</th>
              <th>Created Time</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {productionUpdates.length === 0 ? (
              <EmptyRow colSpan={5} text="No production updates yet" />
            ) : (
              productionUpdates.map((update, index) => (
                <tr key={update._id || index}>
                  <td>{index + 1}</td>
                  <td className="strong">
                    {getUpdateProductName(update)}
                  </td>
                  <td>
                    <ProductionValues values={update.data?.values} />
                  </td>
                  <td>{formatTime(update.updatedAt)}</td>
                  <td>
                    <ActionButtons
                      withDelete
                      onEdit={() => openEdit(update)}
                      onUpdate={() => openEdit(update)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </HistoryCard>

      <HistoryCard
        Icon={Clock}
        title="Production History"
        subtitle="All production records for selected location"
      >
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Time</th>
              <th>Action</th>
              <th>Product</th>
              <th>Values</th>
              <th>Remark</th>
              <th>Updated By</th>
            </tr>
          </thead>

          <tbody>
            {productionHistory.length === 0 ? (
              <EmptyRow colSpan={7} text="No production history" />
            ) : (
              productionHistory.map((entry, index) => (
                <tr key={entry._id || `production-history-${index}`}>
                  <td>{index + 1}</td>
                  <td>{formatTime(entry.updatedAt)}</td>
                  <td>
                    <ActionChip action={entry.action} />
                  </td>
                  <td className="strong">{getHistoryProductName(entry)}</td>
                  <td>
                    <HistoryChange
                      entry={entry}
                      render={(d) => <ProductionValues values={d?.values} />}
                    />
                  </td>
                  <td>
                    {(entry.newData || entry.oldData)?.remark || "-"}
                  </td>
                  <td>{getHistoryUserName(entry, userNameMap)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </HistoryCard>
    </>
  );
}

/* ========================================================= */
/* CONSUMPTION                                                */
/* ========================================================= */

function ConsumptionSection({
  consumptionData,
  updatesData,
  historyData,
  userNameMap,
  selectedLocationId,
  selectedCompanyId,
  activeConsumptionTab,
  setActiveConsumptionTab,
  activeItemCondition,
  setActiveItemCondition,
  onSave,
}) {
  const [entry, setEntry] = useState(null);
  const isItemTab = activeConsumptionTab === "item";
  const isNewItemView = isItemTab && activeItemCondition === "newitem";
  const isUsedItemView = isItemTab && activeItemCondition === "useditem";

  // Location + Company based items
  const allItems = consumptionData
    .filter((entry) => entry.locationId?._id === selectedLocationId)
    .filter((entry) => matchesCompany(entry, selectedCompanyId))
    .flatMap((entry) =>
      (entry.items || []).filter((item) =>
        matchesCompany(item, selectedCompanyId)
      )
    );

  const filteredItems = allItems
    .filter((item) => item.type === activeConsumptionTab)
    .filter(
      (item) =>
        !isItemTab || getItemCondition(item) === activeItemCondition
    );

  const consumptionUpdates = updatesData.filter(
    (update) =>
      update.type === "consumption" &&
      update.locationId?._id === selectedLocationId
  );

  // referenceId -> item name (updates only store referenceId)
  const itemNameMap = {};
  consumptionData.forEach((entry) =>
    (entry.items || []).forEach((item) => {
      if (item.referenceId && item.item?.name) {
        itemNameMap[item.referenceId] = item.item.name;
      }
    })
  );

  const getUpdateItemName = (update) =>
    update.data?.itemName ||
    itemNameMap[update.data?.referenceId] ||
    update.data?.referenceId ||
    "-";

  const consumptionHistory = getHistoryEntries(
    historyData,
    "consumption",
    selectedLocationId
  );

  const getHistoryItemName = (entry) => {
    const d = entry.newData || entry.oldData || {};
    return itemNameMap[d.referenceId] || d.referenceId || "-";
  };

  const openEntry = (item) => {
    const fields = [
      { key: "itemName", label: "Item Name", type: "text", readOnly: true },
    ];

    const initialValues = {
      itemName: item.item?.name || "",
      remark: "",
    };

    if (item.category?.name) {
      fields.push({
        key: "categoryName",
        label: "Category",
        type: "text",
        readOnly: true,
      });
      initialValues.categoryName = item.category.name;
    }

    // New entry starts from 0 (value is consumed from stock and added to the total)
    if (Array.isArray(item.pieces)) {
      // New item: CFT, Cubic Meter and piece counts
      fields.push(
        {
          key: "cft",
          label: "CFT",
          type: "number",
          hint: `Today's total: ${item.cft ?? 0}`,
        },
        {
          key: "cubicMeter",
          label: "Cubic Meter",
          type: "number",
          hint: `Today's total: ${item.cubicMeter ?? 0}`,
        }
      );
      initialValues.cft = 0;
      initialValues.cubicMeter = 0;

      item.pieces.forEach((piece, index) => {
        fields.push({
          key: `piece_${index}`,
          label: `Pieces (${piece.width} x ${piece.inch} x ${piece.feet})`,
          type: "number",
          hint: `Today's total: ${piece.count ?? 0}`,
        });
        initialValues[`piece_${index}`] = 0;
      });
    } else {
      // Used item / Nail / Consumable: Quantity and Unit
      fields.push(
        {
          key: "quantity",
          label: "Quantity",
          type: "number",
          hint: `Today's total: ${item.quantity ?? 0}`,
        },
        { key: "unit", label: "Unit", type: "text", readOnly: true }
      );
      initialValues.quantity = 0;
      initialValues.unit = item.unit || "";
    }

    fields.push({
      key: "remark",
      label: "Remark",
      type: "textarea",
      placeholder: "Optional remark",
    });

    setEntry({ item, fields, initialValues });
  };

  // EDIT: open the modal pre-filled with the saved values of one update record.
  // On save, the same PATCH API is called with that record's `updateId`.
  const openEdit = (update) => {
    const data = update.data || {};

    const matchedItem = consumptionData
      .flatMap((entry) => entry.items || [])
      .find(
        (item) =>
          item.type === data.type &&
          String(item.referenceId) === String(data.referenceId) &&
          (data.type !== "item" ||
            getRefId(item.category) === getRefId(data.category))
      );

    const fields = [
      { key: "itemName", label: "Item Name", type: "text", readOnly: true },
    ];

    const initialValues = {
      itemName: getUpdateItemName(update),
      remark: data.remark || "",
    };

    if (matchedItem?.category?.name) {
      fields.push({
        key: "categoryName",
        label: "Category",
        type: "text",
        readOnly: true,
      });
      initialValues.categoryName = matchedItem.category.name;
    }

    if (Array.isArray(data.pieces)) {
      fields.push(
        { key: "cft", label: "CFT", type: "number" },
        { key: "cubicMeter", label: "Cubic Meter", type: "number" }
      );
      initialValues.cft = data.cft ?? 0;
      initialValues.cubicMeter = data.cubicMeter ?? 0;

      data.pieces.forEach((piece, index) => {
        fields.push({
          key: `piece_${index}`,
          label: `Pieces (${piece.width} x ${piece.inch} x ${piece.feet})`,
          type: "number",
        });
        initialValues[`piece_${index}`] = piece.count ?? 0;
      });
    } else {
      fields.push(
        { key: "quantity", label: "Quantity", type: "number" },
        { key: "unit", label: "Unit", type: "text", readOnly: true }
      );
      initialValues.quantity = data.quantity ?? 0;
      initialValues.unit = data.unit || "";
    }

    fields.push({
      key: "remark",
      label: "Remark",
      type: "textarea",
      placeholder: "Optional remark",
    });

    setEntry({ mode: "edit", update, fields, initialValues });
  };

  const submitEntry = async (formValues) => {
    const isEdit = entry.mode === "edit";

    // ADD  -> values come from the item row
    // EDIT -> values come from the saved update record
    const source = isEdit ? entry.update.data || {} : entry.item;

    const categoryId = isEdit
      ? getRefId(source.category)
      : source.category?._id;

    // Backend fields: section, locationId, type (item|nail|consumable),
    // category (item only), referenceId, quantity/unit or cft/cubicMeter/pieces
    // EDIT also sends updateId
    const payload = {
      section: "consumption",
      locationId: selectedLocationId,
      type: source.type,
      referenceId: isEdit
        ? source.referenceId
        : source.referenceId || source.item?._id,
      ...(categoryId && { category: categoryId }),
      remark: formValues.remark,
      ...(isEdit && { updateId: entry.update._id }),
    };

    if (Array.isArray(source.pieces)) {
      payload.cft = Number(formValues.cft || 0);
      payload.cubicMeter = Number(formValues.cubicMeter || 0);
      payload.pieces = source.pieces.map((piece, index) => ({
        pieceSizeId: piece.pieceSizeId,
        width: piece.width,
        inch: piece.inch,
        feet: piece.feet,
        count: Number(formValues[`piece_${index}`] || 0),
      }));

      const hasValue =
        payload.cft > 0 ||
        payload.cubicMeter > 0 ||
        payload.pieces.some((piece) => piece.count > 0);

      if (!isEdit && !hasValue) throw new Error("Enter a value greater than 0");
    } else {
      payload.quantity = Number(formValues.quantity || 0);
      payload.unit = formValues.unit;

      if (!isEdit && payload.quantity <= 0) {
        throw new Error("Enter a quantity greater than 0");
      }
    }

    await onSave(payload);

    setEntry(null);
  };

  return (
    <>
      {entry && (
        <EntryModal
          title={entry.mode === "edit" ? "Edit Consumption" : "Add Consumption"}
          subtitle={entry.initialValues.itemName}
          fields={entry.fields}
          initialValues={entry.initialValues}
          onClose={() => setEntry(null)}
          onSubmit={submitEntry}
        />
      )}

      <section className="activity-card tone-orange">
        <CardHeader
          Icon={ShoppingCart}
          title="Consumption"
          subtitle="Manage consumption items by type and product"
        />

        <div className="consumption-tabs" role="tablist">
          {CONSUMPTION_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeConsumptionTab === id}
              className={activeConsumptionTab === id ? "active" : ""}
              onClick={() => setActiveConsumptionTab(id)}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </div>

        {isItemTab && (
          <div
            className="consumption-tabs item-condition-tabs"
            role="tablist"
            style={{ marginTop: 12 }}
          >
            {ITEM_CONDITION_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeItemCondition === id}
                className={activeItemCondition === id ? "active" : ""}
                onClick={() => setActiveItemCondition(id)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="table-wrapper table-wrapper-top">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item Name</th>

                {isNewItemView ? (
                  <>
                    <th>Category</th>
                    <th>CFT</th>
                    <th>Cubic Meter</th>
                    <th>Pieces</th>
                  </>
                ) : (
                  <>
                    {isUsedItemView && <th>Category</th>}
                    <th>Quantity</th>
                    <th>Unit</th>
                  </>
                )}

                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredItems.length === 0 ? (
                <EmptyRow
                  colSpan={isNewItemView ? 7 : isUsedItemView ? 6 : 5}
                  text="No records found"
                />
              ) : (
                filteredItems.map((item, index) => (
                  <tr key={item.referenceId || index}>
                    <td>{index + 1}</td>
                    <td className="strong">{item.item?.name || "-"}</td>

                    {isNewItemView ? (
                      <>
                        <td>
                          <span className="chip">
                            {item.category?.name || "-"}
                          </span>
                        </td>
                        <td>{item.cft ?? 0}</td>
                        <td>{item.cubicMeter ?? 0}</td>
                        <td>
                          <PieceSummary pieces={item.pieces} />
                        </td>
                      </>
                    ) : (
                      <>
                        {isUsedItemView && (
                          <td>
                            <span className="chip">
                              {item.category?.name || "-"}
                            </span>
                          </td>
                        )}
                        <td className="strong">{item.quantity ?? 0}</td>
                        <td>{item.unit || "-"}</td>
                      </>
                    )}

                    <td>
                      <AddButton onClick={() => openEntry(item)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <HistoryCard
        Icon={ClipboardList}
        title="Consumption Today Action"
        subtitle="Today's created records (modify if needed)"
      >
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Type</th>
              <th>Item Name</th>
              <th>Quantity / Pieces</th>
              <th>Unit</th>
              <th>Created Time</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {consumptionUpdates.length === 0 ? (
              <EmptyRow colSpan={7} text="No consumption updates yet" />
            ) : (
              consumptionUpdates.map((update, index) => (
                <tr key={update._id || index}>
                  <td>{index + 1}</td>
                  <td>
                    <span className="chip">
                      {formatConsumptionType(update.data?.type)}
                    </span>
                  </td>
                  <td className="strong">
                    {getUpdateItemName(update)}
                  </td>
                  <td>
                    <ConsumptionValue data={update.data} />
                  </td>
                  <td>{update.data?.unit || "-"}</td>
                  <td>{formatTime(update.updatedAt)}</td>
                  <td>
                    <ActionButtons
                      withDelete
                      onEdit={() => openEdit(update)}
                      onUpdate={() => openEdit(update)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </HistoryCard>

      <HistoryCard
        Icon={Clock}
        title="Consumption History"
        subtitle="All consumption records for selected location"
      >
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Time</th>
              <th>Action</th>
              <th>Type</th>
              <th>Item Name</th>
              <th>Quantity / Pieces</th>
              <th>Unit</th>
              <th>Remark</th>
              <th>Updated By</th>
            </tr>
          </thead>

          <tbody>
            {consumptionHistory.length === 0 ? (
              <EmptyRow colSpan={9} text="No consumption history" />
            ) : (
              consumptionHistory.map((entry, index) => {
                const d = entry.newData || entry.oldData || {};

                return (
                  <tr key={entry._id || `consumption-history-${index}`}>
                    <td>{index + 1}</td>
                    <td>{formatTime(entry.updatedAt)}</td>
                    <td>
                      <ActionChip action={entry.action} />
                    </td>
                    <td>
                      <span className="chip">
                        {formatConsumptionType(d.type)}
                      </span>
                    </td>
                    <td className="strong">{getHistoryItemName(entry)}</td>
                    <td>
                      <HistoryChange
                        entry={entry}
                        render={(data) => <ConsumptionValue data={data} />}
                      />
                    </td>
                    <td>{d.unit || "-"}</td>
                    <td>{d.remark || "-"}</td>
                    <td>{getHistoryUserName(entry, userNameMap)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </HistoryCard>
    </>
  );
}

/* ========================================================= */


/* ========================================================= */
/* HELPERS                                                    */
/* ========================================================= */

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Item category name decides the tab: "newitem" or "useditem".
function getItemCondition(item) {
  return normalizeKey(item?.category?.name);
}

function getRefId(value) {
  if (!value) return null;
  return String(typeof value === "object" ? value._id : value);
}

// Filters by company only when the record actually carries a company reference.
function matchesCompany(record, companyId) {
  if (!companyId || !record) return true;

  const ids = [
    record.companyId,
    record.company,
    record.finishedMaterialId,
    record.finishedMaterialCategoryId,
  ]
    .map(getRefId)
    .filter(Boolean);

  if (ids.length === 0) return true;

  return ids.includes(String(companyId));
}

function getProductionFieldKeys(products) {
  const fieldSet = new Set();

  products.forEach((product) => {
    Object.keys(product.values || {}).forEach((key) => fieldSet.add(key));
  });

  return Array.from(fieldSet);
}

function formatFieldName(field) {
  if (!field) return "";

  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
}

function ProductionValues({ values }) {
  if (!values) return "-";

  const entries =
    values instanceof Map ? Array.from(values.entries()) : Object.entries(values);

  if (entries.length === 0) return "-";

  return (
    <div className="value-chips">
      {entries.map(([key, value]) => (
        <span key={key} className="value-chip">
          <em>{formatFieldName(key)}</em>
          <b>{value ?? 0}</b>
        </span>
      ))}
    </div>
  );
}

function PieceSummary({ pieces }) {
  if (!pieces || pieces.length === 0) return "0";

  return (
    <div className="value-chips">
      {pieces.map((piece, index) => (
        <span key={piece.pieceSizeId || index} className="value-chip">
          <em>
            {piece.width} x {piece.inch} x {piece.feet}
          </em>
          <b>{piece.count ?? 0}</b>
        </span>
      ))}
    </div>
  );
}

// Shows the value of one consumption update.
// New item  -> CFT / Cubic Meter / per-size piece chips (e.g. 2 x 4 x 6 [4])
// Others    -> plain quantity
function ConsumptionValue({ data }) {
  if (!data) return "-";

  if (Array.isArray(data.pieces)) {
    // Hide sizes with count 0. Use `const usedPieces = data.pieces;`
    // if you want to show 0-count sizes too.
    const usedPieces = data.pieces.filter((p) => Number(p.count || 0) > 0);
    const hasCft = Number(data.cft || 0) > 0;
    const hasCubic = Number(data.cubicMeter || 0) > 0;

    if (!usedPieces.length && !hasCft && !hasCubic) return "0";

    return (
      <div className="value-chips">
        {hasCft && (
          <span className="value-chip">
            <em>CFT</em>
            <b>{data.cft}</b>
          </span>
        )}

        {hasCubic && (
          <span className="value-chip">
            <em>Cubic Meter</em>
            <b>{data.cubicMeter}</b>
          </span>
        )}

        {usedPieces.map((piece, index) => (
          <span key={piece.pieceSizeId || index} className="value-chip">
            <em>
              {piece.width} x {piece.inch} x {piece.feet}
            </em>
            <b>{piece.count}</b>
          </span>
        ))}
      </div>
    );
  }

  // Used item / nail / consumable
  return data.quantity ?? 0;
}

// updatesHistory entries of one type + location, newest first
function getHistoryEntries(historyData, type, locationId) {
  return (historyData || [])
    .filter(
      (entry) =>
        entry.type === type &&
        getRefId(entry.locationId) === String(locationId)
    )
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function getHistoryUserName(entry, userNameMap) {
  return (
    entry.updatedBy?.name ||
    userNameMap?.[getRefId(entry.updatedBy)] ||
    "-"
  );
}

function ActionChip({ action }) {
  const labels = { created: "Created", updated: "Updated", deleted: "Deleted" };

  return <span className="chip">{labels[action] || action || "-"}</span>;
}

// created / deleted -> shows the data once
// updated           -> shows  old value  →  new value
function HistoryChange({ entry, render }) {
  const isChange = entry.action === "updated" && entry.oldData;

  if (!isChange) return <>{render(entry.newData || entry.oldData)}</>;

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
    >
      <div style={{ opacity: 0.55 }}>{render(entry.oldData)}</div>
      <span>→</span>
      <div>{render(entry.newData)}</div>
    </div>
  );
}

function formatConsumptionType(type) {
  if (!type) return "-";
  if (type === "item") return "Item";
  if (type === "nail") return "Nail";
  if (type === "consumable") return "Consumable";
  return type;
}

function formatTime(date) {
  if (!date) return "-";

  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default DailyUpdate;
