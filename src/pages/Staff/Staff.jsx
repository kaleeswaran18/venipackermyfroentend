import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  UserX,
  X,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import api from "../../api/axios";

import "./Staff.css";

const loginRoles = [
  "systemadmin",
  "owner",
  "business_executive",
  "supervisor",
];

const staffTypeOptions = [
  { value: "systemadmin", label: "System Admin" },
  { value: "owner", label: "Owner" },
  { value: "business_executive", label: "Business Executive" },
  { value: "supervisor", label: "Supervisor" },
  { value: "driver", label: "Driver" },
  { value: "worker", label: "Worker" },
  { value: "helper", label: "Helper" },
];

const emptyForm = {
  staffName: "",
  phoneNumber: "",
  monthlySalary: "",
  address: "",
  staffType: "worker",
  email: "",
  password: "",
  status: "Active",
};

function Staff() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Daily attendance overview for all staff
  const getLocalDateKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(
    () => getLocalDateKey()
  );


  const [search, setSearch] = useState("");
  const [staffTypeFilter, setStaffTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState("");

  const requiresLogin = loginRoles.includes(formData.staffType);

  // Monthly staff report (data is loaded from GET /staff/:id)
  const [showReport, setShowReport] = useState(false);
  const [reportStaff, setReportStaff] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportView, setReportView] = useState("datewise");

  // Monthly salary payment form
  const [paymentForm, setPaymentForm] = useState({
    paymentStatus: "Unpaid",
    paidAmount: "",
    paidAt: "",
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [editingPayment, setEditingPayment] = useState(false);
  const [showPaymentEditModal, setShowPaymentEditModal] = useState(false);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);

  const handleViewStaff = async (staff) => {
    try {
      setReportLoading(true);
      setReportStaff(staff);
      setReportMonth(new Date().getMonth());
      setReportYear(new Date().getFullYear());
      setReportView("datewise");
      setShowReport(true);
      const response = await api.get(`/staff/${staff._id}`);
      const payload = response.data?.data || response.data?.staff || response.data;
      setReportStaff(payload);
    } catch (error) {
      console.error("Get staff report error:", error);
      showToast("error", error.response?.data?.message || "Unable to load staff report.");
      setShowReport(false);
    } finally {
      setReportLoading(false);
    }
  };

  const changeReportMonth = (step) => {
    const date = new Date(reportYear, reportMonth + step, 1);
    setReportMonth(date.getMonth());
    setReportYear(date.getFullYear());
  };

  const selectedMonthlyRecord = (reportStaff?.monthlyRecords || []).find(
    (record) => Number(record.month) === reportMonth + 1 && Number(record.year) === reportYear
  );

  const isPaymentAlreadyPaid = selectedMonthlyRecord?.paymentStatus === "Paid";

  // Load payment values for the selected staff/month record
  useEffect(() => {
    const record = (reportStaff?.monthlyRecords || []).find(
      (item) =>
        Number(item.month) === reportMonth + 1 &&
        Number(item.year) === reportYear
    );

    setEditingPayment(false);
    setPaymentForm({
      paymentStatus: record?.paymentStatus || "Unpaid",
      paidAmount: record?.paidAmount ?? "",
      paidAt: record?.paidAt && !["null", "undefined"].includes(String(record.paidAt).toLowerCase())
        && !Number.isNaN(new Date(record.paidAt).getTime())
        ? new Date(record.paidAt).toISOString().slice(0, 10)
        : "",
    });
  }, [reportStaff, reportMonth, reportYear]);

  const monthAttendance = selectedMonthlyRecord?.attendance || [];
  const today = new Date();
  const isCurrentReportMonth =
    reportMonth === today.getMonth() && reportYear === today.getFullYear();
  const daysInReportMonth = new Date(reportYear, reportMonth + 1, 0).getDate();
  const visibleDays = isCurrentReportMonth ? today.getDate() : daysInReportMonth;

  const getAttendanceForDay = (day) => monthAttendance.find((item) => {
    const date = new Date(item.date);
    return date.getUTCFullYear() === reportYear &&
      date.getUTCMonth() === reportMonth &&
      date.getUTCDate() === day;
  });

  const reportRows = Array.from({ length: visibleDays }, (_, index) => ({
    day: index + 1,
    record: getAttendanceForDay(index + 1),
  }));

  const reportSummary = reportRows.reduce((summary, row) => {
    const item = row.record;
    if (!item) return summary;
    if (item.dayInWork === "Full Day") summary.fullDays += 1;
    if (item.dayInWork === "Half Day") summary.halfDays += 1;
    if (item.dayInWork === "Leave") summary.leaves += 1;
    if (item.dayInWork === "Permission") summary.permissions += 1;
    summary.workingHours += Number(item.workingHours || 0);
    summary.otDays += item.otType === "Day" ? Number(item.otDays || 0) : 0;
    summary.otHours += item.otType === "Hours" ? Number(item.otHours || 0) : 0;
    if (item.otType === "Time Between" && item.otStartTime && item.otEndTime) {
      const toMinutes = (value) => {
        const [h, m] = value.split(":").map(Number);
        return h * 60 + m;
      };
      let minutes = toMinutes(item.otEndTime) - toMinutes(item.otStartTime);
      if (minutes < 0) minutes += 1440;
      summary.otBetweenMinutes += minutes;
    }
    summary.advance += (item.advances || []).reduce((sum, advance) => sum + Number(advance.amount || 0), 0);
    return summary;
  }, { fullDays: 0, halfDays: 0, leaves: 0, permissions: 0, workingHours: 0, otDays: 0, otHours: 0, otBetweenMinutes: 0, advance: 0 });

  const formatReportTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };
  const formatMinutes = (minutes) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  const formatReportDate = (day) => new Date(Date.UTC(reportYear, reportMonth, day)).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

  // Display saved timestamps in Indian Standard Time
  const formatPaymentDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const paymentHistory = selectedMonthlyRecord?.paymentHistory || [];


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

  // ==========================================
  // SAVE MONTHLY SALARY PAYMENT
  // ==========================================

  const handleSavePayment = async (event) => {
    event.preventDefault();

    if (!reportStaff?._id) {
      showToast("error", "Staff details not found.");
      return;
    }

    const paidAmount = Number(paymentForm.paidAmount);

    if (paymentForm.paidAmount === "" || !Number.isFinite(paidAmount) || paidAmount < 0) {
      showToast("error", "Please enter a valid Paid Amount.");
      return;
    }

    if (paymentForm.paymentStatus === "Paid" && !paymentForm.paidAt) {
      showToast("error", "Please select the Paid At date.");
      return;
    }

    const paidAtDateTime = paymentForm.paidAt
      ? (() => {
          const [year, month, day] = paymentForm.paidAt.split("-").map(Number);
          const now = new Date();
          return new Date(
            year,
            month - 1,
            day,
            now.getHours(),
            now.getMinutes(),
            now.getSeconds()
          ).toISOString();
        })()
      : null;

    const payload = {
      month: reportMonth + 1,
      year: reportYear,
      paymentStatus: paymentForm.paymentStatus,
      paidAmount,
      paidAt: paidAtDateTime,
    };

    try {
      setSavingPayment(true);

      await api.patch(`/staff/${reportStaff._id}/payment`, payload);

      const response = await api.get(`/staff/${reportStaff._id}`);
      const updatedStaff =
        response.data?.data || response.data?.staff || response.data;

      setReportStaff(updatedStaff);
      setEditingPayment(false);
      setShowPaymentEditModal(false);
      showToast("success", "Monthly payment details saved successfully.");
    } catch (error) {
      console.error("Save monthly payment error:", error);
      showToast(
        "error",
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Unable to save monthly payment details."
      );
    } finally {
      setSavingPayment(false);
    }
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // ==========================================
  // DELETE CONFIRMATION (in-page dialog, no browser popup)
  // ==========================================

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ==========================================
  // GET STAFF
  // ==========================================

  const getStaff = async () => {
    try {
      setLoading(true);

      const response = await api.get("/staff");

      const result = response.data?.data || [];
      setStaffList(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error("Get staff error:", error);

      showToast(
        "error",
        error.response?.data?.message || "Unable to load staff details."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getStaff();
  }, []);

  // ==========================================
  // FORM CHANGE
  // ==========================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ==========================================
  // OPEN ADD MODAL
  // ==========================================

  const handleAddStaff = () => {
    setEditingStaff(null);
    setFormData({ ...emptyForm });
    setError("");
    setShowModal(true);
  };

  // ==========================================
  // OPEN EDIT MODAL
  // ==========================================

  const handleEditStaff = (staff) => {
    setEditingStaff(staff);

    setFormData({
      staffName: staff.staffName || "",
      phoneNumber: staff.phoneNumber || "",
      monthlySalary: staff.monthlySalary ?? "",
      address: staff.address || "",
      staffType: staff.staffType || "worker",
      email: staff.email || "",
      password: "",
      status: staff.status || "Active",
    });

    setError("");
    setShowModal(true);
  };

  // ==========================================
  // CLOSE MODAL
  // ==========================================

  const handleCloseModal = () => {
    if (submitting) return;

    setShowModal(false);
    setEditingStaff(null);
    setFormData({ ...emptyForm });
    setError("");
  };

  // ==========================================
  // SUBMIT STAFF
  // ==========================================

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.staffName.trim()) {
      setError("Please enter Staff Name.");
      return;
    }

    if (!formData.phoneNumber.trim()) {
      setError("Please enter Phone Number.");
      return;
    }

    if (
      formData.monthlySalary === "" ||
      Number(formData.monthlySalary) < 0
    ) {
      setError("Please enter a valid Monthly Salary.");
      return;
    }

    if (requiresLogin && !editingStaff) {
      if (!formData.email.trim()) {
        setError("Email is required for this staff type.");
        return;
      }

      if (!formData.password || formData.password.length < 6) {
        setError("Password must contain at least 6 characters.");
        return;
      }
    }

    const payload = {
      staffName: formData.staffName.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      monthlySalary: Number(formData.monthlySalary),
      address: formData.address.trim(),
      status: formData.status,
    };

    if (!editingStaff) {
      payload.staffType = formData.staffType;

      if (requiresLogin) {
        payload.email = formData.email.trim().toLowerCase();
        payload.password = formData.password;
      }
    }

    try {
      setSubmitting(true);

      const isEditing = Boolean(editingStaff);

      if (isEditing) {
        await api.patch(`/staff/${editingStaff._id}`, payload);
      } else {
        await api.post("/staff", payload);
      }

      setShowModal(false);
      setEditingStaff(null);
      setFormData({ ...emptyForm });

      showToast(
        "success",
        isEditing
          ? "Staff updated successfully."
          : "Staff created successfully."
      );

      await getStaff();
    } catch (error) {
      console.error("Save staff error:", error);

      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Unable to save staff details.";

      setError(message);
      showToast("error", message);
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // DELETE (DEACTIVATE) STAFF
  // ==========================================

  const handleDeleteStaff = (staff) => {
    setDeleteTarget(staff);
  };

  const confirmDeleteStaff = async () => {
    const staff = deleteTarget;

    if (!staff?._id) return;

    try {
      setDeleting(true);

      await api.delete(`/staff/${staff._id}`);

      setDeleteTarget(null);

      showToast("success", "Staff deactivated successfully.");

      await getStaff();
    } catch (error) {
      console.error("Delete staff error:", error);

      setDeleteTarget(null);

      showToast(
        "error",
        error.response?.data?.message || "Unable to deactivate staff."
      );
    } finally {
      setDeleting(false);
    }
  };

  // ==========================================
  // FILTER STAFF
  // ==========================================

  const filteredStaff = useMemo(() => {
    return staffList.filter((staff) => {
      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        (staff.staffName || "").toLowerCase().includes(searchValue) ||
        (staff.phoneNumber || "").toLowerCase().includes(searchValue);

      const matchesType =
        staffTypeFilter === "All" ||
        staff.staffType === staffTypeFilter;

      const matchesStatus =
        statusFilter === "All" ||
        staff.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [staffList, search, staffTypeFilter, statusFilter]);

  // ==========================================
  // SUMMARY
  // ==========================================

  const totalStaff = staffList.length;

  const activeStaff = staffList.filter(
    (staff) => staff.status === "Active"
  ).length;

  const inactiveStaff = staffList.filter(
    (staff) => staff.status === "Inactive"
  ).length;

  const loginStaff = staffList.filter(
    (staff) => loginRoles.includes(staff.staffType)
  ).length;

  // ==========================================
  // FORMAT STAFF TYPE
  // ==========================================

  const formatStaffType = (type) => {
    if (!type) return "-";

    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // ==========================================
  // JSX
  // ==========================================


  // ==========================================
  // DAILY ATTENDANCE OVERVIEW (ALL STAFF)
  // ==========================================

  const dailyAttendanceRows = useMemo(() => {
    const [year, month, day] = selectedAttendanceDate.split("-").map(Number);

    return staffList.map((staff) => {
      const monthlyRecord = (staff.monthlyRecords || []).find(
        (record) =>
          Number(record.month) === month &&
          Number(record.year) === year
      );

      const attendanceRecord = (monthlyRecord?.attendance || []).find((item) => {
        if (!item?.date) return false;
        const date = new Date(item.date);
        return (
          date.getUTCFullYear() === year &&
          date.getUTCMonth() + 1 === month &&
          date.getUTCDate() === day
        );
      });

      return { staff, status: attendanceRecord?.dayInWork || "Not Marked" };
    });
  }, [staffList, selectedAttendanceDate]);

  const dailyAttendanceSummary = useMemo(() => {
    const summary = {
      total: dailyAttendanceRows.length,
      fullDay: 0,
      halfDay: 0,
      leave: 0,
      permission: 0,
      notMarked: 0,
    };

    dailyAttendanceRows.forEach(({ status }) => {
      if (status === "Full Day") summary.fullDay += 1;
      else if (status === "Half Day") summary.halfDay += 1;
      else if (status === "Leave") summary.leave += 1;
      else if (status === "Permission") summary.permission += 1;
      else summary.notMarked += 1;
    });

    return summary;
  }, [dailyAttendanceRows]);

  const formatAttendanceDate = (dateKey) => {
    if (!dateKey) return "-";
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(
      "en-IN",
      { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }
    );
  };

  const getDailyAttendanceStatusClass = (status) => {
    if (status === "Full Day") return "full-day";
    if (status === "Half Day") return "half-day";
    if (status === "Leave") return "leave";
    if (status === "Permission") return "permission";
    return "not-marked";
  };


  return (
    <div className="staff-layout">
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

      {deleteTarget && (
        <div
          onClick={() => !deleting && setDeleteTarget(null)}
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
              Deactivate Staff?
            </h3>

            <p
              style={{
                margin: "0 0 20px",
                color: "#6b7280",
                fontSize: "14px",
              }}
            >
              Are you sure you want to deactivate{" "}
              <strong>{deleteTarget.staffName}</strong>?
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
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  background: "#ffffff",
                  color: "#374151",
                  fontWeight: 600,
                  cursor: deleting ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteStaff}
                disabled={deleting}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "8px",
                  background: "#dc2626",
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor: deleting ? "not-allowed" : "pointer",
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? "Deactivating..." : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar />

      <div className="staff-main">
        <Header />

        <main className="staff-content">
          {!showReport ? (
          <>
          {/* PAGE HEADER */}

          <section className="staff-page-header">
            <div>
              <h1>Staff Management</h1>
              <p>Manage staff details and login access.</p>
            </div>

            <button
              type="button"
              className="staff-add-btn"
              onClick={handleAddStaff}
            >
              <Plus size={18} />
              Add Staff
            </button>
          </section>

          {/* SUMMARY */}

          <section className="staff-summary">
            <div className="staff-summary-card">
              <div>
                <span>Total Staff</span>
                <strong>{totalStaff}</strong>
              </div>

              <div className="staff-summary-icon blue">
                <Users size={22} />
              </div>
            </div>

            <div className="staff-summary-card">
              <div>
                <span>Active Staff</span>
                <strong>{activeStaff}</strong>
              </div>

              <div className="staff-summary-icon green">
                <UserCheck size={22} />
              </div>
            </div>

            <div className="staff-summary-card">
              <div>
                <span>Inactive Staff</span>
                <strong>{inactiveStaff}</strong>
              </div>

              <div className="staff-summary-icon orange">
                <UserX size={22} />
              </div>
            </div>

            <div className="staff-summary-card">
              <div>
                <span>Login Access</span>
                <strong>{loginStaff}</strong>
              </div>

              <div className="staff-summary-icon purple">
                <Users size={22} />
              </div>
            </div>
          </section>

          

          {/* DAILY ATTENDANCE OVERVIEW - ALL STAFF */}
          <section className="staff-table-card" style={{ marginBottom: "24px" }}>
            <div className="staff-table-header" style={{ alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <h2>Daily Attendance Overview</h2>
                <p>Attendance status of all staff for the selected date.</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <label htmlFor="staff-daily-attendance-date" style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>
                  Select Date
                </label>
                <input
                  id="staff-daily-attendance-date"
                  type="date"
                  value={selectedAttendanceDate}
                  max={getLocalDateKey()}
                  onChange={(event) => setSelectedAttendanceDate(event.target.value)}
                  style={{ padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: "8px", color: "#111827", background: "#fff" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: "12px", margin: "18px 0" }}>
              {[
                ["Total Staff", dailyAttendanceSummary.total, "#2563eb"],
                ["Full Day", dailyAttendanceSummary.fullDay, "#16a34a"],
                ["Half Day", dailyAttendanceSummary.halfDay, "#d97706"],
                ["Leave", dailyAttendanceSummary.leave, "#dc2626"],
                ["Permission", dailyAttendanceSummary.permission, "#7c3aed"],
                ["Not Marked", dailyAttendanceSummary.notMarked, "#64748b"],
              ].map(([label, value, color]) => (
                <div key={label} style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "14px", background: "#fff" }}>
                  <div style={{ color: "#64748b", fontSize: "12px", marginBottom: "6px" }}>{label}</div>
                  <strong style={{ color, fontSize: "22px" }}>{value}</strong>
                </div>
              ))}
            </div>

            <div className="staff-table-wrapper">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th style={{ width: "70px" }}>S.No</th>
                    <th>Staff Name</th>
                    <th>Staff Type</th>
                    <th>Attendance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="4" className="staff-empty">Loading attendance details...</td></tr>
                  ) : dailyAttendanceRows.length === 0 ? (
                    <tr><td colSpan="4" className="staff-empty">No staff records found.</td></tr>
                  ) : (
                    dailyAttendanceRows.map(({ staff, status }, index) => (
                      <tr key={staff._id}>
                        <td>{index + 1}</td>
                        <td>
                          <div className="staff-name-cell">
                            <div className="staff-avatar">{(staff.staffName || "S").charAt(0).toUpperCase()}</div>
                            <span>{staff.staffName || "-"}</span>
                          </div>
                        </td>
                        <td>{formatStaffType(staff.staffType)}</td>
                        <td>
                          <span className={`staff-report-status ${getDailyAttendanceStatusClass(status)}`}>
                            {status === "Full Day" ? "Working – Full Day" : status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="staff-table-footer">
              Attendance for {formatAttendanceDate(selectedAttendanceDate)} · {dailyAttendanceRows.length} staff members
            </div>
          </section>

          {/* STAFF TABLE */}

          <section className="staff-table-card">
            <div className="staff-table-header">
              <div>
                <h2>Staff List</h2>
                <p>View and manage all staff members.</p>
              </div>

              <button
                type="button"
                className="staff-refresh-btn"
                onClick={getStaff}
                disabled={loading}
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>

            {/* FILTERS */}

            <div className="staff-filter-section">
              <div className="staff-search-box">
                <Search size={18} />

                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <select
                value={staffTypeFilter}
                onChange={(event) =>
                  setStaffTypeFilter(event.target.value)
                }
              >
                <option value="All">All Staff Types</option>

                {staffTypeOptions.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* TABLE */}

            <div className="staff-table-wrapper">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Phone Number</th>
                    <th>Staff Type</th>
                    <th>Monthly Salary</th>
                    <th>Login Access</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="staff-empty">
                        Loading staff details...
                      </td>
                    </tr>
                  ) : filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="staff-empty">
                        No staff records found.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((staff) => (
                      <tr key={staff._id}>
                        {/* STAFF NAME */}

                        <td>
                          <div className="staff-name-cell">
                            <div className="staff-avatar">
                              {(staff.staffName || "S")
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <span>{staff.staffName}</span>
                          </div>
                        </td>

                        {/* PHONE NUMBER */}

                        <td>{staff.phoneNumber}</td>

                        {/* STAFF TYPE */}

                        <td>{formatStaffType(staff.staffType)}</td>

                        {/* MONTHLY SALARY */}

                        <td>
                          ₹
                          {Number(
                            staff.monthlySalary || 0
                          ).toLocaleString("en-IN")}
                        </td>

                        {/* LOGIN ACCESS */}

                        <td>
                          {loginRoles.includes(staff.staffType) ? (
                            <span className="staff-login-badge enabled">
                              Enabled
                            </span>
                          ) : (
                            <span className="staff-login-badge disabled">
                              No Access
                            </span>
                          )}
                        </td>

                        {/* STATUS */}

                        <td>
                          <span
                            className={`staff-status ${
                              staff.status === "Active"
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            {staff.status}
                          </span>
                        </td>

                        {/* ACTIONS */}

                        <td>
                          <div className="staff-actions">
                            <button
                              type="button"
                              className="staff-view-action"
                              title="View Monthly Report"
                              onClick={() => handleViewStaff(staff)}
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              type="button"
                              className="staff-edit-action"
                              title="Edit Staff"
                              onClick={() => handleEditStaff(staff)}
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              className="staff-delete-action"
                              title="Deactivate Staff"
                              onClick={() => handleDeleteStaff(staff)}
                              disabled={staff.status === "Inactive"}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="staff-table-footer">
              Showing {filteredStaff.length} of {staffList.length} staff
              records
            </div>
          </section>
          </>
          ) : (
            <section className="staff-report-page">
              <div className="staff-report-header">
                <div>
                  <button className="staff-report-back" onClick={() => setShowReport(false)} type="button">← Back to Staff</button>
                  <h1>{reportStaff?.staffName || "Staff"} - Monthly Report</h1>
                  <p>{reportStaff?.phoneNumber || "-"} · Monthly Salary: ₹{Number(reportStaff?.monthlySalary || 0).toLocaleString("en-IN")}</p>
                </div>
                <div className="staff-report-month-nav">
                  <button type="button" onClick={() => changeReportMonth(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
                  <strong>{new Date(reportYear, reportMonth, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</strong>
                  <button type="button" onClick={() => changeReportMonth(1)} aria-label="Next month" disabled={reportYear === today.getFullYear() && reportMonth >= today.getMonth()}><ChevronRight size={18} /></button>
                </div>
              </div>

              <div className="staff-report-tabs">
                <button type="button" className={reportView === "datewise" ? "active" : ""} onClick={() => setReportView("datewise")}>Datewise</button>
                <button type="button" className={reportView === "overall" ? "active" : ""} onClick={() => setReportView("overall")}>Overall</button>
              </div>

              {reportLoading ? <div className="staff-report-empty">Loading monthly report...</div> : (
                <>
                  {reportView === "datewise" ? (
                    <div className="staff-report-days">
                      {reportRows.length === 0 ? <div className="staff-report-empty">No dates available for this month.</div> :
                        reportRows.map(({ day, record }) => (
                          <article className="staff-report-day-card" key={day}>
                            <div className="staff-report-day-heading">
                              <strong>{formatReportDate(day)}</strong>
                              <span className={`staff-report-status ${record?.dayInWork ? record.dayInWork.toLowerCase().replace(" ", "-") : "not-marked"}`}>{record?.dayInWork || "Not Marked"}</span>
                            </div>
                            <div className="staff-report-detail-grid">
                              <div><span>Punch In</span><strong>{formatReportTime(record?.punchIn)}</strong></div>
                              <div><span>Punch Out</span><strong>{formatReportTime(record?.punchOut)}</strong></div>
                              <div><span>Working Hours</span><strong>{record?.workingHours != null ? `${record.workingHours} hrs` : "-"}</strong></div>
                              <div><span>OT Type</span><strong>{record?.otType || "-"}</strong></div>
                              <div><span>OT Days / Hours</span><strong>{record?.otType === "Day" ? `${record.otDays || 0} days` : record?.otType === "Hours" ? `${record.otHours || 0} hrs` : "-"}</strong></div>
                              <div><span>OT Time Between</span><strong>{record?.otType === "Time Between" ? `${record.otStartTime || "-"} - ${record.otEndTime || "-"}` : "-"}</strong></div>
                            </div>
                            <div className="staff-report-advances">
                              <strong>Advances</strong>
                              {record?.advances?.length ? record.advances.map((advance, index) => (
                                <span key={index}>₹{Number(advance.amount || 0).toLocaleString("en-IN")} · {advance.paymentMode || "Payment"}</span>
                              )) : <span>No advances</span>}
                            </div>
                          </article>
                        ))}
                    </div>
                  ) : (
                    <div className="staff-report-summary-grid">
                      {[
                        ["Working Days", reportSummary.fullDays + reportSummary.halfDays],
                        ["Full Days", reportSummary.fullDays],
                        ["Half Days", reportSummary.halfDays],
                        ["Leave", reportSummary.leaves],
                        ["Permission", reportSummary.permissions],
                        ["Working Hours", `${reportSummary.workingHours.toFixed(2)} hrs`],
                        ["OT Days", reportSummary.otDays],
                        ["OT Hours", `${reportSummary.otHours.toFixed(2)} hrs`],
                        ["Time Between OT", formatMinutes(reportSummary.otBetweenMinutes)],
                        ["Total Advances", `₹${reportSummary.advance.toLocaleString("en-IN")}`],
                      ].map(([label, value]) => <div className="staff-report-summary-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}
                    </div>
                  )}

                  {/* MONTHLY PAYMENT DETAILS - SHOW ONLY IN OVERALL VIEW */}
                  {reportView === "overall" && (
                    <form className="staff-payment-card" onSubmit={handleSavePayment}>
                    <div className="staff-payment-heading">
                      <div>
                        <h2>Monthly Salary Payment</h2>
                        <p>
                          Payment details for {new Date(reportYear, reportMonth, 1).toLocaleDateString("en-IN", {
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <span className={`staff-payment-status ${paymentForm.paymentStatus.toLowerCase()}`}>
                        {paymentForm.paymentStatus}
                      </span>
                    </div>

                    <div className="staff-payment-grid">
                      <div className="staff-payment-field">
                        <label htmlFor="staff-payment-status">Payment Status</label>
                        <select
                          id="staff-payment-status"
                          value={paymentForm.paymentStatus}
                          disabled={isPaymentAlreadyPaid && !editingPayment}
                          onChange={(event) =>
                            setPaymentForm((previous) => ({
                              ...previous,
                              paymentStatus: event.target.value,
                            }))
                          }
                        >
                          <option value="Unpaid">Unpaid</option>
                          <option value="Paid">Paid</option>
                        </select>
                      </div>

                      <div className="staff-payment-field">
                        <label htmlFor="staff-paid-amount">Paid Amount (₹)</label>
                        <input
                          id="staff-paid-amount"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Enter paid amount"
                          value={paymentForm.paidAmount}
                          disabled={isPaymentAlreadyPaid && !editingPayment}
                          onChange={(event) =>
                            setPaymentForm((previous) => ({
                              ...previous,
                              paidAmount: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="staff-payment-field">
                        <label htmlFor="staff-paid-at">Paid At</label>
                        <input
                          id="staff-paid-at"
                          type="date"
                          value={paymentForm.paidAt}
                          disabled={isPaymentAlreadyPaid && !editingPayment}
                          onChange={(event) =>
                            setPaymentForm((previous) => ({
                              ...previous,
                              paidAt: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="staff-payment-footer">
                      <small>
                        These details are saved only for the selected staff and month.
                      </small>
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        {paymentHistory.length > 0 && (
                          <button
                            type="button"
                            className="staff-payment-history-btn"
                            onClick={() => setShowPaymentHistoryModal(true)}
                          >
                            View Payment History ({paymentHistory.length})
                          </button>
                        )}
                        {isPaymentAlreadyPaid && !editingPayment ? (
                          <button
                            type="button"
                            onClick={() => setShowPaymentEditModal(true)}
                          >
                            Edit Payment
                          </button>
                        ) : (
                          <button type="submit" disabled={savingPayment}>
                            {savingPayment
                              ? "Saving..."
                              : isPaymentAlreadyPaid
                                ? "Update Payment"
                                : "Save Payment"}
                          </button>
                        )}
                      </div>
                    </div>
                    </form>
                  )}
                </>
              )}
            </section>
          )}
        </main>
      </div>

      {/* ==========================================
          ADD / EDIT STAFF MODAL
      ========================================== */}

      {showModal && (
        <div className="staff-modal-overlay">
          <div className="staff-modal">
            <div className="staff-modal-header">
              <div>
                <h2>
                  {editingStaff ? "Edit Staff" : "Add New Staff"}
                </h2>

                <p>
                  {editingStaff
                    ? "Update staff information."
                    : "Enter the staff information below."}
                </p>
              </div>

              <button
                type="button"
                className="staff-modal-close"
                onClick={handleCloseModal}
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="staff-form-grid">
                {/* STAFF NAME */}

                <div className="staff-form-group">
                  <label>
                    Staff Name <span>*</span>
                  </label>

                  <input
                    type="text"
                    name="staffName"
                    placeholder="Enter Staff Name"
                    value={formData.staffName}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* PHONE */}

                <div className="staff-form-group">
                  <label>
                    Phone Number <span>*</span>
                  </label>

                  <input
                    type="tel"
                    name="phoneNumber"
                    placeholder="Enter Phone Number"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* MONTHLY SALARY */}

                <div className="staff-form-group">
                  <label>
                    Monthly Salary <span>*</span>
                  </label>

                  <input
                    type="number"
                    name="monthlySalary"
                    min="0"
                    placeholder="Enter Monthly Salary"
                    value={formData.monthlySalary}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* STAFF TYPE */}

                <div className="staff-form-group">
                  <label>
                    Staff Type <span>*</span>
                  </label>

                  <select
                    name="staffType"
                    value={formData.staffType}
                    onChange={handleChange}
                    disabled={!!editingStaff}
                    required
                  >
                    {staffTypeOptions.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>

                  {editingStaff && (
                    <small>
                      Staff type cannot be changed while editing.
                    </small>
                  )}
                </div>

                {/* STATUS */}

                <div className="staff-form-group">
                  <label>Status</label>

                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* ADDRESS */}

                <div className="staff-form-group full-width">
                  <label>Address</label>

                  <textarea
                    name="address"
                    placeholder="Enter Address"
                    rows="3"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* LOGIN DETAILS */}

              {requiresLogin && !editingStaff && (
                <div className="staff-login-section">
                  <div className="staff-login-section-heading">
                    <h3>Login Details</h3>
                    <span>Login access required</span>
                  </div>

                  <div className="staff-form-grid">
                    <div className="staff-form-group">
                      <label>
                        Email <span>*</span>
                      </label>

                      <input
                        type="email"
                        name="email"
                        placeholder="Enter Email Address"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="staff-form-group">
                      <label>
                        Password <span>*</span>
                      </label>

                      <input
                        type="password"
                        name="password"
                        placeholder="Minimum 6 characters"
                        value={formData.password}
                        onChange={handleChange}
                        minLength="6"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="staff-form-error">{error}</div>
              )}

              {/* FORM BUTTONS */}

              <div className="staff-modal-footer">
                <button
                  type="button"
                  className="staff-cancel-btn"
                  onClick={handleCloseModal}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="staff-save-btn"
                  disabled={submitting}
                >
                  {submitting
                    ? "Saving..."
                    : editingStaff
                      ? "Update Staff"
                      : "Create Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MONTHLY PAYMENT HISTORY MODAL */}
      {showPaymentHistoryModal && (
        <div
          className="staff-payment-modal-overlay"
          onClick={() => setShowPaymentHistoryModal(false)}
        >
          <div
            className="staff-payment-edit-modal staff-payment-history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-payment-history-title"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(760px, 94vw)", maxHeight: "85vh", overflowY: "auto" }}
          >
            <div className="staff-payment-edit-modal-header">
              <div>
                <h2 id="staff-payment-history-title">Salary Payment History</h2>
                <p>
                  {reportStaff?.staffName} ·{" "}
                  {new Date(reportYear, reportMonth, 1).toLocaleDateString("en-IN", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <button
                type="button"
                className="staff-payment-modal-close"
                onClick={() => setShowPaymentHistoryModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {paymentHistory.length === 0 ? (
              <div className="staff-report-empty">No payment history available.</div>
            ) : (
              <div style={{ display: "grid", gap: "12px", padding: "18px 0" }}>
                {[...paymentHistory].reverse().map((history, index) => (
                  <article
                    key={`${history.changedAt || index}-${index}`}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "10px",
                      padding: "14px",
                      background: "#fff",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "10px" }}>
                      <strong style={{ color: history.action === "CREATED" ? "#15803d" : "#2563eb" }}>
                        {history.action || "PAYMENT UPDATE"}
                      </strong>
                      <span style={{ color: "#6b7280", fontSize: "13px" }}>
                        {formatPaymentDateTime(history.changedAt)}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: "12px" }}>
                      <div>
                        <small style={{ color: "#6b7280" }}>Previous Amount</small>
                        <div><strong>₹{Number(history.previousPaidAmount || 0).toLocaleString("en-IN")}</strong></div>
                      </div>
                      <div>
                        <small style={{ color: "#6b7280" }}>New Amount</small>
                        <div><strong>₹{Number(history.paidAmount || 0).toLocaleString("en-IN")}</strong></div>
                      </div>
                      <div>
                        <small style={{ color: "#6b7280" }}>Previous Status</small>
                        <div><strong>{history.previousPaymentStatus || "-"}</strong></div>
                      </div>
                      <div>
                        <small style={{ color: "#6b7280" }}>New Status</small>
                        <div><strong>{history.paymentStatus || "-"}</strong></div>
                      </div>
                      <div>
                        <small style={{ color: "#6b7280" }}>Previous Paid At</small>
                        <div><strong>{formatPaymentDateTime(history.previousPaidAt)}</strong></div>
                      </div>
                      <div>
                        <small style={{ color: "#6b7280" }}>New Paid At</small>
                        <div><strong>{formatPaymentDateTime(history.paidAt)}</strong></div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="staff-payment-edit-modal-footer">
              <button
                type="button"
                className="staff-payment-cancel-btn"
                onClick={() => setShowPaymentHistoryModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MONTHLY PAYMENT EDIT MODAL */}
      {showPaymentEditModal && (
        <div className="staff-payment-modal-overlay" onClick={() => setShowPaymentEditModal(false)}>
          <div
            className="staff-payment-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-payment-edit-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="staff-payment-edit-modal-header">
              <div>
                <h2 id="staff-payment-edit-title">Edit Monthly Salary Payment</h2>
                <p>
                  {new Date(reportYear, reportMonth, 1).toLocaleDateString("en-IN", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <button
                type="button"
                className="staff-payment-modal-close"
                onClick={() => setShowPaymentEditModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSavePayment}>
              <div className="staff-payment-grid">
                <div className="staff-payment-field">
                  <label htmlFor="staff-payment-modal-status">Payment Status</label>
                  <select
                    id="staff-payment-modal-status"
                    value={paymentForm.paymentStatus}
                    onChange={(event) => setPaymentForm((previous) => ({
                      ...previous,
                      paymentStatus: event.target.value,
                    }))}
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>

                <div className="staff-payment-field">
                  <label htmlFor="staff-payment-modal-amount">Paid Amount (₹)</label>
                  <input
                    id="staff-payment-modal-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter paid amount"
                    value={paymentForm.paidAmount}
                    onChange={(event) => setPaymentForm((previous) => ({
                      ...previous,
                      paidAmount: event.target.value,
                    }))}
                  />
                </div>

                <div className="staff-payment-field">
                  <label htmlFor="staff-payment-modal-date">Paid At</label>
                  <input
                    id="staff-payment-modal-date"
                    type="date"
                    value={paymentForm.paidAt}
                    onChange={(event) => setPaymentForm((previous) => ({
                      ...previous,
                      paidAt: event.target.value,
                    }))}
                  />
                </div>
              </div>

              <div className="staff-payment-edit-modal-footer">
                <button
                  type="button"
                  className="staff-payment-cancel-btn"
                  onClick={() => setShowPaymentEditModal(false)}
                  disabled={savingPayment}
                >
                  Cancel
                </button>
                <button type="submit" disabled={savingPayment}>
                  {savingPayment ? "Updating..." : "Update Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Staff;
