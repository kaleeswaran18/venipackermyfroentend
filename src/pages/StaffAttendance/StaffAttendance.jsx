import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Save,
  CalendarDays,
  Plus,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  History,
} from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import api from "../../api/axios";

import "./StaffAttendance.css";

// ==========================================
// DATE HELPERS
// ==========================================

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getLocalDate = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

// Generate a MongoDB-compatible 24-character ObjectId string on the client.
const generateAdvanceId = () => {
  const bytes = new Uint8Array(12);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const getEmptyAttendance = (date) => ({
  date,
  punchIn: "",
  punchOut: "",
  workingHours: 0,
  dayInWork: "",
  otType: "",
  otDays: 0,
  otHours: 0,
  otStartTime: "",
  otEndTime: "",
  advances: [],
});

const formatMonth = (date) =>
  date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

// ==========================================
// COMPONENT
// ==========================================

function StaffAttendance() {
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const todayKey = formatDateKey(today);

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [selectedStaffId, setSelectedStaffId] = useState("");

  const [attendance, setAttendance] = useState(
    getEmptyAttendance(todayKey)
  );

  // ==========================================
  // TOAST
  // ==========================================

  const [toast, setToast] = useState({
    show: false,
    type: "",
    message: "",
  });

  const toastTimer = useRef(null);

  const closeToast = () =>
    setToast({ show: false, type: "", message: "" });

  const showToast = (type, message) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);

    setToast({ show: true, type, message });

    toastTimer.current = setTimeout(closeToast, 3500);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // ==========================================
  // DELETE CONFIRMATION
  // ==========================================

  const [deleteIndex, setDeleteIndex] = useState(null);
  const [editingAdvanceIndex, setEditingAdvanceIndex] = useState(null);
  const [historyModal, setHistoryModal] = useState({
    open: false,
    title: "",
    entries: [],
  });

  // ==========================================

  const selectedDateObject = getLocalDate(selectedDate);

  const selectedMonth = selectedDateObject.getMonth() + 1;
  const selectedYear = selectedDateObject.getFullYear();

  const isToday = selectedDate === todayKey;
  const isEditable = isToday;

  const selectedStaff = staffList.find(
    (staff) => staff._id === selectedStaffId
  );

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  // ==========================================
  // GET STAFF
  // ==========================================

  const getStaff = async () => {
    try {
      setLoading(true);

      const response = await api.get("/staff");
      const result = response.data?.data || [];

      const activeStaff = Array.isArray(result)
        ? result.filter((staff) => staff.status === "Active")
        : [];

      setStaffList(activeStaff);
    } catch (err) {
      console.error("Get staff error:", err);

      showToast(
        "error",
        err.response?.data?.message || "Unable to load staff details."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getStaff();
  }, []);

  // ==========================================
  // LOAD SELECTED STAFF ATTENDANCE
  // ==========================================

  useEffect(() => {
    if (!selectedStaffId) {
      setAttendance(getEmptyAttendance(selectedDate));
      return;
    }

    const staff = staffList.find(
      (item) => item._id === selectedStaffId
    );

    if (!staff) return;

    const monthlyRecord = (staff.monthlyRecords || []).find(
      (record) =>
        Number(record.month) === selectedMonth &&
        Number(record.year) === selectedYear
    );

    const attendanceRecord = (
      monthlyRecord?.attendance || []
    ).find(
      (record) =>
        formatDateKey(new Date(record.date)) === selectedDate
    );

    if (attendanceRecord) {
      setAttendance({
        ...getEmptyAttendance(selectedDate),
        ...attendanceRecord,
        date: selectedDate,
        advances: (attendanceRecord.advances || []).map(
          (advance) => ({ ...advance })
        ),
      });
    } else {
      setAttendance(getEmptyAttendance(selectedDate));
    }
  }, [
    selectedStaffId,
    selectedDate,
    selectedMonth,
    selectedYear,
    staffList,
  ]);

  // ==========================================
  // SELECT DATE
  // ==========================================

  const handleDateSelect = (day) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );

    date.setHours(0, 0, 0, 0);

    if (date > today) return;

    setSelectedDate(formatDateKey(date));
  };

  // ==========================================
  // MONTH NAVIGATION
  // ==========================================

  const handlePreviousMonth = () => {
    const previousMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - 1,
      1
    );

    setCurrentMonth(previousMonth);

    const lastDay = new Date(
      previousMonth.getFullYear(),
      previousMonth.getMonth() + 1,
      0
    ).getDate();

    const previousDate = new Date(
      previousMonth.getFullYear(),
      previousMonth.getMonth(),
      Math.min(today.getDate(), lastDay)
    );

    if (previousDate > today) {
      previousDate.setTime(today.getTime());
    }

    setSelectedDate(formatDateKey(previousDate));
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      1
    );

    const isFutureMonth =
      nextMonth.getFullYear() > today.getFullYear() ||
      (nextMonth.getFullYear() === today.getFullYear() &&
        nextMonth.getMonth() > today.getMonth());

    if (isFutureMonth) return;

    setCurrentMonth(nextMonth);

    const lastDay = new Date(
      nextMonth.getFullYear(),
      nextMonth.getMonth() + 1,
      0
    ).getDate();

    const nextDate = new Date(
      nextMonth.getFullYear(),
      nextMonth.getMonth(),
      Math.min(today.getDate(), lastDay)
    );

    setSelectedDate(formatDateKey(nextDate));
  };

  // ==========================================
  // FIELD CHANGE
  // ==========================================

  const handleFieldChange = (field, value) => {
    setAttendance((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  // ==========================================
  // OT TYPE CHANGE
  // ==========================================

  const handleOTTypeChange = (value) => {
    setAttendance((previous) => ({
      ...previous,
      otType: value,
      otDays: 0,
      otHours: 0,
      otStartTime: "",
      otEndTime: "",
    }));
  };

  // ==========================================
  // ADVANCE CHANGE
  // ==========================================

  const handleAddAdvance = () => {
    const nextIndex = attendance.advances?.length || 0;
    setEditingAdvanceIndex(nextIndex);

    setAttendance((previous) => ({
      ...previous,
      advances: [
        ...(previous.advances || []),
        {
          _id: generateAdvanceId(),
          amount: "",
          paymentMode: "",
          referenceNumber: "",
          remarks: "",
        },
      ],
    }));
  };

  const handleEditAdvance = (index) => {
    console.log(
    "EDIT CLICKED ADVANCE:",
    attendance.advances[index]
  );
    setEditingAdvanceIndex(index);
  };

  const handleDoneAdvance = () => {
    const advance = attendance.advances?.[editingAdvanceIndex];

    if (!advance) {
      setEditingAdvanceIndex(null);
      return;
    }

    if (!Number(advance.amount) || Number(advance.amount) <= 0 || !advance.paymentMode) {
      showToast("error", "Please enter a valid amount and payment mode.");
      return;
    }

    setEditingAdvanceIndex(null);
  };

  const handleAdvanceChange = (index, field, value) => {
    setAttendance((previous) => {
      const advances = [...(previous.advances || [])];

      advances[index] = {
        ...advances[index],
        [field]: value,
      };

      return {
        ...previous,
        advances,
      };
    });
  };

  // Opens the confirmation popup
  const handleRemoveAdvance = (index) => {
    setDeleteIndex(index);
  };

  // Runs when user confirms in the popup
  const confirmRemoveAdvance = () => {
    setAttendance((previous) => ({
      ...previous,
      advances: previous.advances.filter(
        (_, advanceIndex) => advanceIndex !== deleteIndex
      ),
    }));

    setDeleteIndex(null);
    setEditingAdvanceIndex(null);

    showToast(
      "success",
      "Advance removed. Click Save Attendance to apply."
    );
  };

  // ==========================================
  // VIEW HISTORY
  // ==========================================

  const formatHistoryValue = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "object") {
      if (value.staffName) return value.staffName;
      if (value.name) return value.name;
      return JSON.stringify(value);
    }
    return String(value);
  };

  const formatHistoryDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openAttendanceHistory = () => {
    const entries = (attendance.changeHistory || []).map((item) => ({
      ...item,
      historyType: "Attendance",
      displayField: item.field,
      displayOldValue: item.oldValue,
      displayNewValue: item.newValue,
      changedAt: item.updatedAt,
      changedBy: item.updatedBy,
    }));

    setHistoryModal({
      open: true,
      title: "Attendance Change History",
      entries: entries.sort(
        (a, b) => new Date(b.changedAt || 0) - new Date(a.changedAt || 0)
      ),
    });
  };

  const openAdvanceHistory = (advance, index) => {
    const amountEntries = (advance.amountHistory || []).map((item) => ({
      historyType: "Advance",
      displayField: "Amount",
      displayOldValue: item.oldAmount,
      displayNewValue: item.newAmount,
      changedAt: item.updatedAt,
      changedBy: item.updatedBy,
    }));

    const otherEntries = (advance.changeHistory || []).map((item) => ({
      ...item,
      historyType: "Advance",
      displayField: item.field,
      displayOldValue: item.oldValue,
      displayNewValue: item.newValue,
      changedAt: item.updatedAt,
      changedBy: item.updatedBy,
    }));

    const entries = [...amountEntries, ...otherEntries].sort(
      (a, b) => new Date(b.changedAt || 0) - new Date(a.changedAt || 0)
    );

    setHistoryModal({
      open: true,
      title: `Advance ${index + 1} History`,
      entries,
    });
  };

  const closeHistoryModal = () => {
    setHistoryModal({ open: false, title: "", entries: [] });
  };

  // ==========================================
  // SAVE ATTENDANCE
  // ==========================================

  const handleSaveAttendance = async () => {
console.log(
  "ATTENDANCE STATE BEFORE SAVE:",
  attendance.advances
);

    if (!selectedStaff) {
      showToast("error", "Please select a staff member.");
      return;
    }

    if (!isToday) {
      showToast("error", "Only today's attendance can be updated.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        date: selectedDate,
        punchIn: attendance.punchIn || null,
        punchOut: attendance.punchOut || null,
        workingHours: Number(attendance.workingHours || 0),
        dayInWork: attendance.dayInWork || null,

        otType: attendance.otType || null,

        otDays:
          attendance.otType === "Day"
            ? Number(attendance.otDays || 0)
            : 0,

        otHours:
          attendance.otType === "Hours"
            ? Number(attendance.otHours || 0)
            : 0,

        otStartTime:
          attendance.otType === "Time Between"
            ? attendance.otStartTime || null
            : null,

        otEndTime:
          attendance.otType === "Time Between"
            ? attendance.otEndTime || null
            : null,

        advances: (attendance.advances || []).map((advance) => ({
          ...(advance._id && { _id: advance._id }),
          ...(advance.financeTransactionId && {
            financeTransactionId: advance.financeTransactionId,
          }),
          amount: Number(advance.amount || 0),
          paymentMode: advance.paymentMode,
          referenceNumber: advance.referenceNumber || "",
          remarks: advance.remarks || "",
        })),
      };
    console.log("FINAL ADVANCE STATE:", attendance.advances);
console.log("FINAL API PAYLOAD:", payload.advances);

      await api.patch(
        `/staff/${selectedStaff._id}/attendance`,
        payload
      );

      showToast(
        "success",
        `${selectedStaff.staffName} attendance saved successfully.`
      );

      setEditingAdvanceIndex(null);
      await getStaff();
    } catch (err) {
      console.error("Save attendance error:", err);

      showToast(
        "error",
        err.response?.data?.message || "Unable to save attendance."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // DATE TABS
  // ==========================================

  const dateTabs = Array.from(
    { length: daysInMonth },
    (_, index) => index + 1
  );

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="attendance-layout">
      {/* TOAST */}

      {toast.show && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            zIndex: 99999,
            minWidth: "320px",
            maxWidth: "420px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 16px",
            background: "#ffffff",
            borderRadius: "12px",
            boxShadow:
              "0 12px 35px rgba(0,0,0,0.14), 0 3px 10px rgba(0,0,0,0.08)",
            borderLeft: `4px solid ${
              toast.type === "success" ? "#16a34a" : "#dc2626"
            }`,
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: toast.type === "success" ? "#dcfce7" : "#fee2e2",
              color: toast.type === "success" ? "#16a34a" : "#dc2626",
            }}
          >
            {toast.type === "success" ? (
              <CheckCircle size={21} />
            ) : (
              <AlertCircle size={21} />
            )}
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "3px",
            }}
          >
            <strong style={{ fontSize: "14px", color: "#111827" }}>
              {toast.type === "success" ? "Success" : "Error"}
            </strong>

            <span
              style={{
                fontSize: "13px",
                color: "#6b7280",
                lineHeight: 1.4,
              }}
            >
              {toast.message}
            </span>
          </div>

          <button
            type="button"
            onClick={closeToast}
            aria-label="Close notification"
            style={{
              width: "30px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              borderRadius: "7px",
              background: "transparent",
              color: "#9ca3af",
              cursor: "pointer",
            }}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* DELETE CONFIRMATION */}

      {deleteIndex !== null && (
        <div
          onClick={() => setDeleteIndex(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99998,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15, 23, 42, 0.45)",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(420px, 90vw)",
              padding: "24px",
              background: "#ffffff",
              borderRadius: "14px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                margin: "0 auto 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                background: "#fee2e2",
                color: "#dc2626",
              }}
            >
              <Trash2 size={24} />
            </div>

            <h3 style={{ margin: "0 0 8px", color: "#111827" }}>
              Remove Advance?
            </h3>

            <p
              style={{
                margin: "0 0 20px",
                color: "#6b7280",
                fontSize: "14px",
              }}
            >
              Are you sure you want to remove this advance entry?
            </p>

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "center",
              }}
            >
              <button
                type="button"
                onClick={() => setDeleteIndex(null)}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  background: "#ffffff",
                  color: "#374151",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmRemoveAdvance}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "8px",
                  background: "#dc2626",
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {historyModal.open && (
        <div
          onClick={closeHistoryModal}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            background: "rgba(15, 23, 42, 0.5)",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(760px, 96vw)",
              maxHeight: "85vh",
              overflow: "auto",
              padding: "22px",
              background: "#ffffff",
              borderRadius: "14px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
              <div>
                <h3 style={{ margin: 0, color: "#111827" }}>{historyModal.title}</h3>
                <p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: "13px" }}>
                  {historyModal.entries.length} change(s) recorded
                </p>
              </div>
              <button
                type="button"
                onClick={closeHistoryModal}
                aria-label="Close history"
                style={{ border: 0, background: "transparent", cursor: "pointer", color: "#6b7280" }}
              >
                <X size={21} />
              </button>
            </div>

            {historyModal.entries.length > 0 ? (
              <div style={{ display: "grid", gap: "12px" }}>
                {historyModal.entries.map((entry, index) => {
                  const changedBy = entry.changedBy;
                  const changedByName =
                    changedBy && typeof changedBy === "object"
                      ? changedBy.name || changedBy.staffName || changedBy.email || "User"
                      : changedBy
                        ? String(changedBy)
                        : "-";

                  return (
                    <div
                      key={`${entry.displayField || entry.field}-${entry.changedAt || index}-${index}`}
                      style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "14px", background: "#fff" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                        <strong style={{ color: "#111827", textTransform: "capitalize" }}>
                          {(entry.displayField || entry.field || "Field").replace(/([A-Z])/g, " $1")}
                        </strong>
                        <small style={{ color: "#6b7280" }}>{formatHistoryDate(entry.changedAt)}</small>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div style={{ background: "#fef2f2", padding: "10px", borderRadius: "8px", minWidth: 0 }}>
                          <small style={{ display: "block", color: "#991b1b", marginBottom: "4px" }}>Old Value</small>
                          <strong style={{ color: "#7f1d1d", overflowWrap: "anywhere" }}>
                            {formatHistoryValue(entry.displayOldValue ?? entry.oldValue)}
                          </strong>
                        </div>
                        <div style={{ background: "#f0fdf4", padding: "10px", borderRadius: "8px", minWidth: 0 }}>
                          <small style={{ display: "block", color: "#166534", marginBottom: "4px" }}>New Value</small>
                          <strong style={{ color: "#14532d", overflowWrap: "anywhere" }}>
                            {formatHistoryValue(entry.displayNewValue ?? entry.newValue)}
                          </strong>
                        </div>
                      </div>
                      <small style={{ display: "block", color: "#6b7280", marginTop: "9px" }}>
                        Updated by: {changedByName}
                      </small>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: "32px 12px", textAlign: "center", color: "#6b7280", border: "1px dashed #d1d5db", borderRadius: "10px" }}>
                No history available yet.
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "18px" }}>
              <button
                type="button"
                onClick={closeHistoryModal}
                style={{ padding: "9px 18px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#fff", cursor: "pointer", fontWeight: 600 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar />

      <div className="attendance-main">
        <Header />

        <main className="attendance-content">

          {/* PAGE HEADER */}

          <section className="attendance-page-header">
            <div>
              <h1>Staff Attendance</h1>
              <p>Manage daily staff attendance and overtime.</p>
            </div>

            <button
              type="button"
              className="attendance-refresh-btn"
              onClick={getStaff}
              disabled={loading}
            >
              <RefreshCw size={17} />
              Refresh
            </button>
          </section>

          {/* MONTH CALENDAR */}

          <section className="attendance-calendar-card">
            <div className="attendance-month-header">
              <div className="attendance-month-title">
                <CalendarDays size={21} />
                <h2>{formatMonth(currentMonth)}</h2>
              </div>

              <div className="attendance-month-actions">
                <button
                  type="button"
                  onClick={handlePreviousMonth}
                  title="Previous Month"
                >
                  <ChevronLeft size={20} />
                </button>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  disabled={
                    currentMonth.getFullYear() === today.getFullYear() &&
                    currentMonth.getMonth() === today.getMonth()
                  }
                  title="Next Month"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* DATE TABS */}

            <div className="attendance-date-grid">
              {dateTabs.map((day) => {
                const date = new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth(),
                  day
                );

                date.setHours(0, 0, 0, 0);

                const dateKey = formatDateKey(date);
                const upcoming = date > today;
                const selected = dateKey === selectedDate;
                const todayDate = dateKey === todayKey;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    className={`attendance-date-tab ${
                      selected ? "selected" : ""
                    } ${upcoming ? "upcoming" : ""}`}
                    disabled={upcoming}
                    onClick={() => handleDateSelect(day)}
                  >
                    <span className="attendance-date-day">
                      {date.toLocaleDateString("en-IN", {
                        weekday: "short",
                      })}
                    </span>

                    <strong>{day}</strong>

                    {todayDate && <small>Today</small>}
                  </button>
                );
              })}
            </div>

            <div className="attendance-date-legend">
              <span>
                <i className="legend-dot past"></i>
                Past – View only
              </span>

              <span>
                <i className="legend-dot current"></i>
                Today – Editable
              </span>

              <span>
                <i className="legend-dot future"></i>
                Upcoming – Disabled
              </span>
            </div>
          </section>

          {/* SELECTED DATE */}

          <section className="attendance-selected-info">
            <div>
              <h2>
                Attendance –{" "}
                {selectedDateObject.toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </h2>

              <p>
                {isToday
                  ? "You can update today's attendance."
                  : "Past attendance is available in view-only mode."}
              </p>
            </div>

            <span
              className={`attendance-mode-badge ${
                isEditable ? "editable" : "readonly"
              }`}
            >
              {isEditable ? "Editable" : "View Only"}
            </span>
          </section>

          {/* STAFF SELECT + ATTENDANCE */}

          <section className="attendance-table-card">
            <div className="attendance-table-header">
              <div>
                <h2>Staff Attendance</h2>
                <p>Total Staff: {staffList.length}</p>
              </div>
            </div>

            {/* STAFF DROPDOWN */}

            <div className="attendance-staff-select">
              <label htmlFor="attendanceStaff">
                Select Staff Name
              </label>

              <select
                id="attendanceStaff"
                value={selectedStaffId}
                onChange={(event) => {
                  setSelectedStaffId(event.target.value);
                }}
                disabled={loading}
              >
                <option value="">Select Staff</option>

                {staffList.map((staff) => (
                  <option key={staff._id} value={staff._id}>
                    {staff.staffName}
                  </option>
                ))}
              </select>
            </div>

            {/* SELECTED STAFF FORM */}

            {!selectedStaffId ? (
              <div className="attendance-empty">
                {loading
                  ? "Loading staff details..."
                  : "Please select a staff member to view attendance."}
              </div>
            ) : selectedStaff ? (
              <div className="attendance-staff-card">

                {/* STAFF HEADER */}

                <div className="attendance-staff-header">
                  <div className="attendance-staff-avatar">
                    {(selectedStaff.staffName || "S")
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="attendance-staff-info">
                    <h3>{selectedStaff.staffName}</h3>
                    <p>
                      {selectedStaff.staffType
                        ?.split("_")
                        .map(
                          (word) =>
                            word.charAt(0).toUpperCase() +
                            word.slice(1)
                        )
                        .join(" ")}
                      {" · "}
                      {selectedStaff.phoneNumber}
                    </p>
                  </div>

                  <span className="attendance-staff-status">
                    {selectedStaff.status}
                  </span>
                </div>

                {/* ATTENDANCE FIELDS */}

                <div className="attendance-fields-grid">
                  <div className="attendance-field">
                    <label>Punch In</label>
                    <input
                      type="time"
                      value={attendance.punchIn || ""}
                      disabled={!isEditable}
                      onChange={(event) =>
                        handleFieldChange(
                          "punchIn",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="attendance-field">
                    <label>Punch Out</label>
                    <input
                      type="time"
                      value={attendance.punchOut || ""}
                      disabled={!isEditable}
                      onChange={(event) =>
                        handleFieldChange(
                          "punchOut",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="attendance-field">
                    <label>Working Hours</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={attendance.workingHours ?? 0}
                      disabled={!isEditable}
                      onChange={(event) =>
                        handleFieldChange(
                          "workingHours",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="attendance-field">
                    <label>Day In Work</label>
                    <select
                      value={attendance.dayInWork || ""}
                      disabled={!isEditable}
                      onChange={(event) =>
                        handleFieldChange(
                          "dayInWork",
                          event.target.value
                        )
                      }
                    >
                      <option value="">Select</option>
                      <option value="Full Day">Full Day</option>
                      <option value="Half Day">Half Day</option>
                      <option value="Leave">Leave</option>
                      <option value="Permission">Permission</option>
                    </select>
                  </div>
                </div>

                {/* OVERTIME DETAILS */}

                <div className="attendance-subsection">
                  <div className="attendance-advance-header">
                    <h4>Overtime Details</h4>
                    <button
                      type="button"
                      className="attendance-add-advance"
                      onClick={openAttendanceHistory}
                    >
                      <History size={15} />
                      Attendance History
                    </button>
                  </div>

                  <div className="attendance-fields-grid">

                    {/* OT TYPE */}

                    <div className="attendance-field">
                      <label>OT Type</label>

                      <select
                        value={attendance.otType || ""}
                        disabled={!isEditable}
                        onChange={(event) =>
                          handleOTTypeChange(event.target.value)
                        }
                      >
                        <option value="">Select OT Type</option>
                        <option value="Hours">Hours</option>
                        <option value="Day">Day</option>
                        <option value="Time Between">
                          Time Between
                        </option>
                      </select>
                    </div>

                    {/* HOURS */}

                    {attendance.otType === "Hours" && (
                      <div className="attendance-field">
                        <label>OT Hours</label>

                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={attendance.otHours ?? 0}
                          disabled={!isEditable}
                          onChange={(event) =>
                            handleFieldChange(
                              "otHours",
                              event.target.value
                            )
                          }
                        />
                      </div>
                    )}

                    {/* DAYS */}

                    {attendance.otType === "Day" && (
                      <div className="attendance-field">
                        <label>OT Days</label>

                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={attendance.otDays ?? 0}
                          disabled={!isEditable}
                          onChange={(event) =>
                            handleFieldChange(
                              "otDays",
                              event.target.value
                            )
                          }
                        />
                      </div>
                    )}

                    {/* TIME BETWEEN */}

                    {attendance.otType === "Time Between" && (
                      <>
                        <div className="attendance-field">
                          <label>OT Start Time</label>

                          <input
                            type="time"
                            value={attendance.otStartTime || ""}
                            disabled={!isEditable}
                            onChange={(event) =>
                              handleFieldChange(
                                "otStartTime",
                                event.target.value
                              )
                            }
                          />
                        </div>

                        <div className="attendance-field">
                          <label>OT End Time</label>

                          <input
                            type="time"
                            value={attendance.otEndTime || ""}
                            disabled={!isEditable}
                            onChange={(event) =>
                              handleFieldChange(
                                "otEndTime",
                                event.target.value
                              )
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* ADVANCES */}

                <div className="attendance-subsection">
                  <div className="attendance-advance-header">
                    <h4>Advances</h4>

                    {isEditable && (
                      <button
                        type="button"
                        className="attendance-add-advance"
                        onClick={handleAddAdvance}
                      >
                        <Plus size={15} />
                        Add Advance
                      </button>
                    )}
                  </div>

                  {attendance.advances?.length > 0 ? (
                    <div className="attendance-advance-list">
                      {attendance.advances.map((advance, index) => (
                        <div
                          className="attendance-advance-item"
                          key={advance._id || index}
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: "10px",
                            padding: "14px",
                            marginBottom: "12px",
                            background: "#ffffff",
                          }}
                        >
                          {editingAdvanceIndex === index ? (
                            <>
                              <div className="attendance-advance-row">
                                <div className="attendance-field">
                                  <label>Amount</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={advance.amount ?? ""}
                                    disabled={!isEditable}
                                    onChange={(event) =>
                                      handleAdvanceChange(index, "amount", event.target.value)
                                    }
                                  />
                                </div>

                                <div className="attendance-field">
                                  <label>Payment Mode</label>
                                  <select
                                    value={advance.paymentMode || ""}
                                    disabled={!isEditable}
                                    onChange={(event) =>
                                      handleAdvanceChange(index, "paymentMode", event.target.value)
                                    }
                                  >
                                    <option value="">Select</option>
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Cheque">Cheque</option>
                                  </select>
                                </div>

                                <div className="attendance-field">
                                  <label>Reference Number</label>
                                  <input
                                    type="text"
                                    value={advance.referenceNumber || ""}
                                    disabled={!isEditable}
                                    onChange={(event) =>
                                      handleAdvanceChange(index, "referenceNumber", event.target.value)
                                    }
                                  />
                                </div>

                                <div className="attendance-field">
                                  <label>Remarks</label>
                                  <input
                                    type="text"
                                    value={advance.remarks || ""}
                                    disabled={!isEditable}
                                    onChange={(event) =>
                                      handleAdvanceChange(index, "remarks", event.target.value)
                                    }
                                  />
                                </div>
                              </div>

                              {isEditable && (
                                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "12px" }}>
                                  <button
                                    type="button"
                                    className="attendance-save-btn"
                                    onClick={handleDoneAdvance}
                                  >
                                    Done
                                  </button>
                                  <button
                                    type="button"
                                    className="attendance-remove-advance"
                                    onClick={() => handleRemoveAdvance(index)}
                                    title="Remove Advance"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                              <div style={{ display: "flex", gap: "22px", flexWrap: "wrap" }}>
                                <div>
                                  <small style={{ display: "block", color: "#6b7280" }}>Amount</small>
                                  <strong>₹{Number(advance.amount || 0).toLocaleString("en-IN")}</strong>
                                </div>
                                <div>
                                  <small style={{ display: "block", color: "#6b7280" }}>Payment Mode</small>
                                  <strong>{advance.paymentMode || "-"}</strong>
                                </div>
                                <div>
                                  <small style={{ display: "block", color: "#6b7280" }}>Reference Number</small>
                                  <strong>{advance.referenceNumber || "-"}</strong>
                                </div>
                                <div>
                                  <small style={{ display: "block", color: "#6b7280" }}>Remarks</small>
                                  <strong>{advance.remarks || "-"}</strong>
                                </div>
                              </div>

                              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                <button
                                  type="button"
                                  className="attendance-add-advance"
                                  onClick={() => openAdvanceHistory(advance, index)}
                                >
                                  <History size={14} />
                                  History
                                </button>
                                {isEditable && (
                                  <button
                                    type="button"
                                    className="attendance-add-advance"
                                    onClick={() => handleEditAdvance(index)}
                                  >
                                    Edit
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="attendance-no-advance">
                      No advances added.
                    </p>
                  )}
                </div>

                {/* SAVE BUTTON */}

                {isEditable && (
                  <div className="attendance-save-row">
                    <button
                      type="button"
                      className="attendance-save-btn"
                      onClick={handleSaveAttendance}
                      disabled={saving}
                    >
                      <Save size={16} />
                      {saving ? "Saving..." : "Save Attendance"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="attendance-empty">
                Selected staff not found.
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default StaffAttendance;
