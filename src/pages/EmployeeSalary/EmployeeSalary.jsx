import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  WalletCards,
  Users,
  Clock3,
  Banknote,
  HandCoins,
  X,
  Check,
} from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import api from "../../api/axios";

import "./EmployeeSalary.css";

// =========================================================
const WEEK_DAYS = [
  { key: "sun", label: "Sun" },
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
];

const STATUS_CLASS = {
  Pending: "pending",
  Paid: "paid",
};

// =========================================================
// DATE HELPERS
// =========================================================

function formatDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDateKey(date) {
  if (!date) return "";

  const d = new Date(date);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getSunday(date) {
  const result = new Date(date);
  const day = result.getDay();

  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);

  return result;
}

function getWeekDates(startDate) {
  return WEEK_DAYS.map((_, index) => {
    const date = new Date(startDate);

    date.setDate(startDate.getDate() + index);
    date.setHours(0, 0, 0, 0);

    return date;
  });
}

function getId(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  return value._id || value.id || "";
}

// =========================================================
// TIME FORMAT
// =========================================================

function formatTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// =========================================================
// EMPLOYEE SALARY COMPONENT
// =========================================================

function EmployeeSalary() {
  // =======================================================
  // WEEK
  // =======================================================

  const [weekStart, setWeekStart] = useState(
    getSunday(new Date())
  );

  // =======================================================
  // FILTERS
  // =======================================================

  const [location, setLocation] = useState("all");
  const [employeeId, setEmployeeId] = useState("all");

  // =======================================================
  // API DATA
  // =======================================================

  const [weeklySalaries, setWeeklySalaries] = useState([]);
  const [employeeMaster, setEmployeeMaster] = useState([]);
  const [locations, setLocations] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);

  // =======================================================
  // LOADING / ERROR
  // =======================================================

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =======================================================
  // MODALS
  // =======================================================

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [paymentEmployee, setPaymentEmployee] = useState(null);

  // =======================================================
  // PAYMENT
  // =======================================================

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    getDateKey(new Date())
  );
  const [paymentRemark, setPaymentRemark] = useState("");

  // =======================================================
  // WEEK DATES
  // =======================================================

  const weekDates = useMemo(
    () => getWeekDates(weekStart),
    [weekStart]
  );

  const weekEnd = weekDates[6];

  // =======================================================
  // CURRENT WEEK
  // =======================================================

  const currentWeekStart = getSunday(new Date());

  const isCurrentWeek =
    currentWeekStart.getTime() ===
    weekStart.getTime();

  // =======================================================
  // FETCH EMPLOYEES
  // =======================================================

  const fetchEmployees = async () => {
    const response = await api.get("/employees");

    setEmployeeMaster(response.data.data || []);
  };

  // =======================================================
  // FETCH LOCATIONS
  // =======================================================

  const fetchLocations = async () => {
    const response = await api.get("/locations");

    setLocations(response.data.data || []);
  };

  // =======================================================
  // FETCH WEEKLY SALARY
  // =======================================================

  const fetchWeeklySalary = async () => {
    const response = await api.get("/weekly-salary");

    setWeeklySalaries(response.data.data || []);
  };

  // =======================================================
  // FETCH ATTENDANCE
  // =======================================================

  const fetchAttendance = async () => {
    const response = await api.get(
      "/employee-attendance"
    );

    setAttendanceData(response.data.data || []);
  };

  // =======================================================
  // LOAD ALL API DATA
  // =======================================================

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      await Promise.all([
        fetchWeeklySalary(),
        fetchEmployees(),
        fetchLocations(),
        fetchAttendance(),
      ]);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load salary data"
      );
    } finally {
      setLoading(false);
    }
  };

  // =======================================================
  // INITIAL LOAD
  // =======================================================

  useEffect(() => {
    loadData();
  }, []);

  // =======================================================
  // SELECTED WEEK SALARY
  // =======================================================

  const selectedWeeklySalary = useMemo(() => {
    const selectedStart = getDateKey(weekStart);
    const selectedEnd = getDateKey(weekEnd);

    return weeklySalaries.find((salary) => {
      return (
        getDateKey(salary.weekStartDate) ===
          selectedStart &&
        getDateKey(salary.weekEndDate) ===
          selectedEnd
      );
    });
  }, [weeklySalaries, weekStart, weekEnd]);

  // =======================================================
  // LOCATION NAME
  // =======================================================

  const getLocationName = (locationId) => {
    if (!locationId) return "-";

    const id = getId(locationId);

    const locationItem = locations.find(
      (item) => getId(item._id || item.id) === id
    );

    return (
      locationItem?.name ||
      locationItem?.locationName ||
      "-"
    );
  };

  // =======================================================
  // GET EMPLOYEE MASTER DATA
  // =======================================================

  const getEmployeeMaster = (salaryEmployee) => {
    const id = getId(
      salaryEmployee?.employeeId
    );

    return employeeMaster.find(
      (employee) =>
        getId(employee._id || employee.id) === id
    );
  };

  // =======================================================
  // CONVERT SALARY EMPLOYEE FOR UI
  // =======================================================

  const mappedEmployees = useMemo(() => {
    if (!selectedWeeklySalary?.employees) {
      return [];
    }

    return selectedWeeklySalary.employees.map(
      (salaryEmployee) => {
        const masterEmployee =
          getEmployeeMaster(salaryEmployee);

        const permanentLocationId =
          masterEmployee?.permanentLocationId;

        const locationId =
          getId(permanentLocationId);

        const locationName =
          getLocationName(locationId);

        return {
          id:
            masterEmployee?.employeeCode ||
            salaryEmployee.employeeId?.employeeCode ||
            getId(salaryEmployee.employeeId),

          employeeObjectId:
            getId(salaryEmployee.employeeId),

          name:
            salaryEmployee.name ||
            masterEmployee?.name ||
            "-",

          location:
            locationName ||
            masterEmployee?.permanentLocationId?.name ||
            "-",

          locationId,

          workType: "-",

          dailyWage:
            Number(salaryEmployee.dailyWage) || 0,

          workingDays:
            Number(salaryEmployee.workingDays) || 0,

          halfDays:
            Number(salaryEmployee.halfDays) || 0,

          leaveDays:
            Number(salaryEmployee.leaveDays) || 0,

          workingHours:
            Number(
              salaryEmployee.totalWorkingHours
            ) || 0,

          otHours:
            Number(salaryEmployee.totalOTHours) || 0,

          basicSalary:
            Number(salaryEmployee.basicSalary) || 0,

          otAmount:
            Number(salaryEmployee.otAmount) || 0,

          advance:
            Number(salaryEmployee.totalAdvance) || 0,

          grossSalary:
            Number(salaryEmployee.grossSalary) || 0,

          finalPayable:
            Number(salaryEmployee.finalPayable) || 0,

          paymentStatus:
            selectedWeeklySalary.paid
              ? "Paid"
              : "Pending",

          attendance: {},
        };
      }
    );
  }, [
    selectedWeeklySalary,
    employeeMaster,
    locations,
  ]);

  // =======================================================
  // GET ATTENDANCE FOR EMPLOYEE
  // =======================================================

  const getEmployeeAttendance = (
    employeeObjectId
  ) => {
    if (!employeeObjectId) return {};

    const selectedStart =
      getDateKey(weekStart);

    const selectedEnd =
      getDateKey(weekEnd);

    const attendanceWeek =
      attendanceData.find((item) => {
        return (
          getDateKey(item.weekStartDate) ===
            selectedStart &&
          getDateKey(item.weekEndDate) ===
            selectedEnd
        );
      });

    if (!attendanceWeek) {
      return {};
    }

    let employeeAttendance = null;

    for (
      const locationItem of
        attendanceWeek.locations || []
    ) {
      const foundEmployee =
        (locationItem.employees || []).find(
          (employee) =>
            getId(employee.employeeId) ===
            employeeObjectId
        );

      if (foundEmployee) {
        employeeAttendance =
          foundEmployee;
        break;
      }
    }

    if (!employeeAttendance) {
      return {};
    }

    const attendanceMap = {};

    (employeeAttendance.days || []).forEach(
      (day) => {
        const dateKey = getDateKey(day.date);

        const dayDate = new Date(day.date);
        const dayIndex = dayDate.getDay();

        const weekDay =
          WEEK_DAYS[dayIndex];

        if (!weekDay) return;

        attendanceMap[weekDay.key] = {
          status:
            day.status || "Absent",

          punchIn:
            formatTime(day.punchIn),

          punchOut:
            formatTime(day.punchOut),

          workingHours:
            Number(day.workingHours) || 0,

          otHours:
            Number(day.otHours) || 0,

          advance:
            Number(day.advance?.amount) || 0,

          remark:
            day.remark || "-",

          date: dateKey,
        };
      }
    );

    return attendanceMap;
  };

  // =======================================================
  // ADD ATTENDANCE TO EMPLOYEES
  // =======================================================

  const employeesWithAttendance = useMemo(() => {
    return mappedEmployees.map(
      (employee) => ({
        ...employee,

        attendance:
          getEmployeeAttendance(
            employee.employeeObjectId
          ),
      })
    );
  }, [
    mappedEmployees,
    attendanceData,
    weekStart,
    weekEnd,
  ]);

  // =======================================================
  // FILTER EMPLOYEES
  // =======================================================

  const filteredEmployees = useMemo(() => {
    return employeesWithAttendance.filter(
      (employee) => {
        const locationMatch =
          location === "all" ||
          employee.locationId === location;

        const employeeMatch =
          employeeId === "all" ||
          employee.employeeObjectId === employeeId;

        return (
          locationMatch &&
          employeeMatch
        );
      }
    );
  }, [
    employeesWithAttendance,
    location,
    employeeId,
  ]);

  // =======================================================
  // LOCATION FILTER OPTIONS
  // =======================================================

  const locationOptions = useMemo(() => {
    return locations;
  }, [locations]);

  // =======================================================
  // PREVIOUS WEEK
  // =======================================================

  const goPreviousWeek = () => {
    const next = new Date(weekStart);

    next.setDate(
      next.getDate() - 7
    );

    next.setHours(0, 0, 0, 0);

    setWeekStart(getSunday(next));

    setSelectedEmployee(null);
    setPaymentEmployee(null);
  };

  // =======================================================
  // NEXT WEEK
  // =======================================================

  const goNextWeek = () => {
    const next = new Date(weekStart);

    next.setDate(
      next.getDate() + 7
    );

    next.setHours(0, 0, 0, 0);

    setWeekStart(getSunday(next));

    setSelectedEmployee(null);
    setPaymentEmployee(null);
  };

  // =======================================================
  // CURRENT WEEK
  // =======================================================

  const goToday = () => {
    setWeekStart(
      getSunday(new Date())
    );

    setSelectedEmployee(null);
    setPaymentEmployee(null);
  };

  // =======================================================
  // REFRESH
  // =======================================================

  const handleRefresh = () => {
    loadData();
  };

  // =======================================================
  // SUMMARY
  // =======================================================

  const summary = useMemo(() => {
    return filteredEmployees.reduce(
      (result, employee) => {
        result.totalEmployees += 1;

        result.totalWorkingDays +=
          employee.workingDays;

        result.totalOTHours +=
          employee.otHours;

        result.totalSalary +=
          employee.grossSalary;

        result.totalAdvance +=
          employee.advance;

        return result;
      },
      {
        totalEmployees: 0,
        totalWorkingDays: 0,
        totalOTHours: 0,
        totalSalary: 0,
        totalAdvance: 0,
      }
    );
  }, [filteredEmployees]);

  // =======================================================
  // OPEN EMPLOYEE DETAILS
  // =======================================================

  const openEmployeeDetails = (employee) => {
    setSelectedEmployee(employee);
  };

  // =======================================================
  // OPEN PAYMENT MODAL
  // =======================================================

  const openPaymentModal = (employee) => {
    setPaymentEmployee(employee);

    setPaymentAmount(
      employee.finalPayable.toString()
    );

    setPaymentDate(
      getDateKey(new Date())
    );

    setPaymentRemark(
      `Paid for week ${formatDate(
        weekStart
      )} - ${formatDate(weekEnd)}`
    );
  };

  // =======================================================
  // CLOSE MODALS
  // =======================================================

  const closeAllModals = () => {
    setSelectedEmployee(null);
    setPaymentEmployee(null);
  };

  // =======================================================
  // MARK WEEKLY SALARY AS PAID
  // =======================================================

  const markAsPaid = async () => {
    if (!paymentEmployee) return;

    if (!selectedWeeklySalary?._id) {
      alert(
        "Weekly salary record not found."
      );
      return;
    }

    const amount = Number(
      paymentAmount
    );

    if (!amount || amount <= 0) {
      alert(
        "Please enter a valid payment amount."
      );
      return;
    }

    try {
      setLoading(true);

      await api.patch(
        `/weekly-salary/${selectedWeeklySalary._id}`,
        {
          paid: true,
        }
      );

      await fetchWeeklySalary();

      setPaymentEmployee(null);
      setPaymentAmount("");
      setPaymentRemark("");
    } catch (err) {
      console.error(err);

      alert(
        err.response?.data?.message ||
          err.message ||
          "Failed to update payment"
      );
    } finally {
      setLoading(false);
    }
  };

  // =======================================================
  // EMPLOYEE FILTER OPTIONS
  // =======================================================

  const employeeFilterOptions =
    employeesWithAttendance.filter(
      (employee) =>
        location === "all" ||
        employee.locationId === location
    );

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="employee-salary-layout">
      <Sidebar />

      <div className="employee-salary-main">
        <Header />

        <main className="employee-salary-content">

          {/* =====================================================
              PAGE HEADER
          ===================================================== */}

          <div className="employee-salary-page-header">

            <div className="employee-salary-title">

              <div className="employee-salary-title-icon">
                <WalletCards size={28} />
              </div>

              <div>
                <h1>
                  Employee Salary
                </h1>

                <p>
                  View and manage weekly employee salary details
                </p>
              </div>

            </div>

            <div className="salary-info-box">

              <span className="salary-info-icon">
                i
              </span>

              <span>
                Salary is calculated based on attendance,
                working hours, OT hours and advance for
                the selected week.
              </span>

            </div>

          </div>

          {/* =====================================================
              FILTER / WEEK NAVIGATION
          ===================================================== */}

          <section className="employee-salary-filter-card">

            <div className="salary-week-navigation">

              <button
                type="button"
                className="salary-week-nav-btn"
                onClick={goPreviousWeek}
              >
                <ChevronLeft size={18} />
                Previous Week
              </button>

              <button
                type="button"
                className="salary-week-picker-btn"
                onClick={goToday}
              >
                <CalendarDays size={18} />

                {formatDate(weekStart)} -{" "}
                {formatDate(weekEnd)}

                <ChevronDown size={17} />
              </button>

              <button
                type="button"
                className="salary-week-nav-btn"
                onClick={goNextWeek}
              >
                Next Week
                <ChevronRight size={18} />
              </button>

              <button
                type="button"
                className="salary-today-btn"
                onClick={goToday}
              >
                This Week
              </button>

            </div>

            <div className="salary-filters">

              {/* Location */}

              <div className="salary-filter-group">

                <label>
                  Location
                </label>

                <div className="salary-select">

                  <select
                    value={location}
                    onChange={(event) => {
                      setLocation(
                        event.target.value
                      );

                      setEmployeeId("all");
                    }}
                  >

                    <option value="all">
                      All Locations
                    </option>

                    {locationOptions.map(
                      (item) => (
                        <option
                          key={
                            item._id ||
                            item.id
                          }
                          value={
                            item._id ||
                            item.id
                          }
                        >
                          {item.name}
                        </option>
                      )
                    )}

                  </select>

                  <ChevronDown size={16} />

                </div>

              </div>

              {/* Employee */}

              <div className="salary-filter-group salary-employee-filter">

                <label>
                  Employee
                </label>

                <div className="salary-select">

                  <select
                    value={employeeId}
                    onChange={(event) =>
                      setEmployeeId(
                        event.target.value
                      )
                    }
                  >

                    <option value="all">
                      All Employees
                    </option>

                    {employeeFilterOptions.map(
                      (employee) => (
                        <option
                          key={
                            employee.employeeObjectId
                          }
                          value={
                            employee.employeeObjectId
                          }
                        >
                          {employee.name}
                        </option>
                      )
                    )}

                  </select>

                  <ChevronDown size={16} />

                </div>

              </div>

              {/* Refresh */}

              <button
                type="button"
                className="salary-refresh-btn"
                onClick={handleRefresh}
                title="Refresh"
                disabled={loading}
              >
                <RefreshCw
                  size={19}
                  className={
                    loading
                      ? "salary-refresh-spin"
                      : ""
                  }
                />

                Refresh
              </button>

            </div>

          </section>

          {/* =====================================================
              WEEK INFO
          ===================================================== */}

          <div className="salary-week-info">

            <strong>
              Week: {formatDate(weekStart)} -{" "}
              {formatDate(weekEnd)}
            </strong>

            <span>
              {isCurrentWeek
                ? "Current week salary can be updated and paid."
                : "Previous week salary is view-only."}
            </span>

          </div>

          {/* =====================================================
              ERROR
          ===================================================== */}

          {error && (
            <div className="salary-error-message">
              {error}
            </div>
          )}

          {/* =====================================================
              NO WEEKLY SALARY
          ===================================================== */}

          {!loading &&
            !selectedWeeklySalary && (
              <div className="salary-no-data">
                No weekly salary data found for the
                selected week.
              </div>
            )}

          {/* =====================================================
              SUMMARY CARDS
          ===================================================== */}

          <section className="salary-summary-grid">

            <div className="salary-summary-card employees-card">

              <div className="salary-summary-icon">
                <Users size={23} />
              </div>

              <div>
                <span>
                  Total Employees
                </span>

                <strong>
                  {summary.totalEmployees}
                </strong>
              </div>

            </div>

            <div className="salary-summary-card working-days-card">

              <div className="salary-summary-icon">
                <CalendarDays size={23} />
              </div>

              <div>
                <span>
                  Total Working Days
                </span>

                <strong>
                  {summary.totalWorkingDays}
                </strong>
              </div>

            </div>

            <div className="salary-summary-card ot-card">

              <div className="salary-summary-icon">
                <Clock3 size={23} />
              </div>

              <div>
                <span>
                  Total OT Hours
                </span>

                <strong>
                  {summary.totalOTHours}
                </strong>
              </div>

            </div>

            <div className="salary-summary-card salary-card">

              <div className="salary-summary-icon">
                <Banknote size={23} />
              </div>

              <div>
                <span>
                  Total Salary Amount
                </span>

                <strong>
                  ₹{" "}
                  {summary.totalSalary.toLocaleString(
                    "en-IN"
                  )}
                </strong>
              </div>

            </div>

            <div className="salary-summary-card advance-card">

              <div className="salary-summary-icon">
                <HandCoins size={23} />
              </div>

              <div>
                <span>
                  Total Advance
                </span>

                <strong>
                  ₹{" "}
                  {summary.totalAdvance.toLocaleString(
                    "en-IN"
                  )}
                </strong>
              </div>

            </div>

          </section>

          {/* =====================================================
              SALARY TABLE
          ===================================================== */}

          <section className="salary-table-card">

            <div className="salary-table-wrapper">

              <table className="employee-salary-table">

                <thead>

                  <tr>

                    <th>#</th>

                    <th>
                      Employee
                    </th>

                    <th>
                      Working Days
                    </th>

                    <th>
                      Half Days
                    </th>

                    <th>
                      Leave Days
                    </th>

                    <th>
                      OT Hours
                    </th>

                    <th>
                      Basic Salary (₹)
                    </th>

                    <th>
                      OT Amount (₹)
                    </th>

                    <th>
                      Advance (₹)
                    </th>

                    <th>
                      Final Payable (₹)
                    </th>

                    <th>
                      Payment Status
                    </th>

                    <th>
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {loading ? (
                    <tr>
                      <td
                        colSpan={12}
                        className="salary-empty-state"
                      >
                        Loading salary data...
                      </td>
                    </tr>
                  ) : filteredEmployees.length > 0 ? (
                    filteredEmployees.map(
                      (employee, index) => (
                        <tr
                          key={
                            employee.employeeObjectId
                          }
                        >

                          <td>
                            {index + 1}
                          </td>

                          <td className="salary-employee-name">

                            <div className="salary-employee-avatar">
                              {employee.name.charAt(
                                0
                              )}
                            </div>

                            <div>

                              <strong>
                                {employee.name}
                              </strong>

                              <small>
                                {employee.id}
                              </small>

                            </div>

                          </td>

                          <td>
                            {employee.workingDays}
                          </td>

                          <td>
                            {employee.halfDays}
                          </td>

                          <td>
                            {employee.leaveDays}
                          </td>

                          <td>
                            {employee.otHours}
                          </td>

                          <td>
                            {employee.basicSalary.toLocaleString(
                              "en-IN"
                            )}
                          </td>

                          <td>
                            {employee.otAmount.toLocaleString(
                              "en-IN"
                            )}
                          </td>

                          <td>
                            {employee.advance.toLocaleString(
                              "en-IN"
                            )}
                          </td>

                          <td className="final-payable">

                            ₹{" "}
                            {employee.finalPayable.toLocaleString(
                              "en-IN"
                            )}

                          </td>

                          <td>

                            <span
                              className={`salary-payment-status ${
                                STATUS_CLASS[
                                  employee.paymentStatus
                                ]
                              }`}
                            >

                              <span className="payment-status-dot" />

                              {
                                employee.paymentStatus
                              }

                            </span>

                          </td>

                          <td>

                            <div className="salary-actions">

                              <button
                                type="button"
                                className="salary-view-btn"
                                onClick={() =>
                                  openEmployeeDetails(
                                    employee
                                  )
                                }
                              >
                                <Eye size={15} />
                                View
                              </button>

                              {employee.paymentStatus ===
                                "Pending" &&
                                isCurrentWeek && (
                                  <button
                                    type="button"
                                    className="salary-pay-btn"
                                    onClick={() =>
                                      openPaymentModal(
                                        employee
                                      )
                                    }
                                  >
                                    Pay
                                  </button>
                                )}

                            </div>

                          </td>

                        </tr>
                      )
                    )
                  ) : (
                    <tr>

                      <td
                        colSpan={12}
                        className="salary-empty-state"
                      >
                        No employees found.
                      </td>

                    </tr>
                  )}

                </tbody>

              </table>

            </div>

          </section>

        </main>

      </div>

      {/* =========================================================
          EMPLOYEE WEEKLY SALARY DETAILS MODAL
      ========================================================= */}

      {selectedEmployee && (
        <div
          className="salary-modal-overlay"
          onClick={closeAllModals}
        >

          <div
            className="salary-details-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="salary-details-header">

              <div>

                <h2>
                  Employee Weekly Salary Details
                </h2>

                <p>
                  {selectedEmployee.name} •{" "}
                  {selectedEmployee.id}
                </p>

              </div>

              <button
                type="button"
                className="salary-modal-close"
                onClick={closeAllModals}
              >
                <X size={20} />
              </button>

            </div>

            <div className="salary-details-content">

              {/* Employee Information */}

              <div className="salary-employee-top">

                <div className="salary-large-avatar">
                  {selectedEmployee.name.charAt(
                    0
                  )}
                </div>

                <div className="salary-employee-info">

                  <h3>
                    {selectedEmployee.name}
                  </h3>

                  <p>
                    Employee ID:{" "}
                    {selectedEmployee.id}
                  </p>

                  <p>
                    Location:{" "}
                    {selectedEmployee.location}
                  </p>

                  <p>
                    Work Type:{" "}
                    {selectedEmployee.workType}
                  </p>

                </div>

                <div className="salary-week-detail">

                  <span>
                    Week
                  </span>

                  <strong>
                    {formatDate(weekStart)} -{" "}
                    {formatDate(weekEnd)}
                  </strong>

                </div>

              </div>

              {/* Statistics */}

              <div className="employee-salary-stat-grid">

                <div className="employee-salary-stat working">

                  <strong>
                    {selectedEmployee.workingDays}
                  </strong>

                  <span>
                    Working Days
                  </span>

                </div>

                <div className="employee-salary-stat half">

                  <strong>
                    {selectedEmployee.halfDays}
                  </strong>

                  <span>
                    Half Days
                  </span>

                </div>

                <div className="employee-salary-stat leave">

                  <strong>
                    {selectedEmployee.leaveDays}
                  </strong>

                  <span>
                    Leave Days
                  </span>

                </div>

                <div className="employee-salary-stat ot">

                  <strong>
                    {selectedEmployee.otHours}
                  </strong>

                  <span>
                    OT Hours
                  </span>

                </div>

              </div>

              {/* Attendance Detail */}

              <div className="salary-attendance-section">

                <h3>
                  Weekly Attendance
                </h3>

                <div className="salary-attendance-table-wrapper">

                  <table className="salary-attendance-table">

                    <thead>

                      <tr>

                        <th>
                          Date
                        </th>

                        <th>
                          Day
                        </th>

                        <th>
                          Status
                        </th>

                        <th>
                          Punch In
                        </th>

                        <th>
                          Punch Out
                        </th>

                        <th>
                          Working Hours
                        </th>

                        <th>
                          OT Hours
                        </th>

                        <th>
                          Advance (₹)
                        </th>

                        <th>
                          Remark
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {WEEK_DAYS.map(
                        (day, index) => {

                          const attendance =
                            selectedEmployee
                              .attendance?.[
                              day.key
                            ] || {
                              status: "No Data",
                              punchIn: "-",
                              punchOut: "-",
                              workingHours: 0,
                              otHours: 0,
                              advance: 0,
                              remark: "-",
                            };

                          return (
                            <tr
                              key={day.key}
                            >

                              <td>
                                {weekDates[
                                  index
                                ].toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                  }
                                )}
                              </td>

                              <td>
                                {day.label}
                              </td>

                              <td>

                                <span
                                  className={`salary-attendance-status ${attendance.status
                                    .toLowerCase()
                                    .replace(
                                      " ",
                                      "-"
                                    )}`}
                                >

                                  <span className="attendance-dot" />

                                  {
                                    attendance.status
                                  }

                                </span>

                              </td>

                              <td>
                                {
                                  attendance.punchIn
                                }
                              </td>

                              <td>
                                {
                                  attendance.punchOut
                                }
                              </td>

                              <td>
                                {
                                  attendance.workingHours
                                }
                              </td>

                              <td>
                                {
                                  attendance.otHours
                                }
                              </td>

                              <td>
                                {
                                  attendance.advance
                                }
                              </td>

                              <td>
                                {
                                  attendance.remark
                                }
                              </td>

                            </tr>
                          );
                        }
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

              {/* Salary Calculation */}

              <div className="salary-calculation-section">

                <div className="salary-calculation-card">

                  <h3>
                    Salary Calculation
                  </h3>

                  <div className="salary-calculation-row">

                    <span>
                      Basic Salary (
                      {
                        selectedEmployee.workingDays
                      }{" "}
                      days)
                    </span>

                    <strong>
                      ₹{" "}
                      {selectedEmployee.basicSalary.toLocaleString(
                        "en-IN"
                      )}
                    </strong>

                  </div>

                  <div className="salary-calculation-row">

                    <span>
                      OT Amount (
                      {
                        selectedEmployee.otHours
                      }{" "}
                      hrs)
                    </span>

                    <strong>
                      ₹{" "}
                      {selectedEmployee.otAmount.toLocaleString(
                        "en-IN"
                      )}
                    </strong>

                  </div>

                  <div className="salary-calculation-row gross">

                    <span>
                      Gross Salary
                    </span>

                    <strong>
                      ₹{" "}
                      {selectedEmployee.grossSalary.toLocaleString(
                        "en-IN"
                      )}
                    </strong>

                  </div>

                  <div className="salary-calculation-row advance">

                    <span>
                      Advance
                    </span>

                    <strong>
                      - ₹{" "}
                      {selectedEmployee.advance.toLocaleString(
                        "en-IN"
                      )}
                    </strong>

                  </div>

                  <div className="salary-calculation-row final">

                    <span>
                      Final Payable
                    </span>

                    <strong>
                      ₹{" "}
                      {selectedEmployee.finalPayable.toLocaleString(
                        "en-IN"
                      )}
                    </strong>

                  </div>

                </div>

                <div className="salary-status-card">

                  <span>
                    Payment Status
                  </span>

                  <strong
                    className={
                      STATUS_CLASS[
                        selectedEmployee
                          .paymentStatus
                      ]
                    }
                  >

                    <span className="payment-status-dot" />

                    {
                      selectedEmployee.paymentStatus
                    }

                  </strong>

                </div>

              </div>

            </div>

            <div className="salary-details-footer">

              <button
                type="button"
                className="salary-close-btn"
                onClick={closeAllModals}
              >
                Close
              </button>

              {selectedEmployee.paymentStatus ===
                "Pending" &&
                isCurrentWeek && (
                  <button
                    type="button"
                    className="salary-footer-pay-btn"
                    onClick={() => {
                      openPaymentModal(
                        selectedEmployee
                      );

                      setSelectedEmployee(null);
                    }}
                  >
                    <Check size={17} />
                    Mark as Paid
                  </button>
                )}

            </div>

          </div>

        </div>
      )}

      {/* =========================================================
          MARK AS PAID MODAL
      ========================================================= */}

      {paymentEmployee && (
        <div
          className="salary-modal-overlay payment-overlay"
          onClick={closeAllModals}
        >

          <div
            className="payment-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="payment-modal-header">

              <div>

                <h2>
                  Mark as Paid
                </h2>

                <p>
                  Complete employee salary payment
                </p>

              </div>

              <button
                type="button"
                className="salary-modal-close"
                onClick={closeAllModals}
              >
                <X size={20} />
              </button>

            </div>

            <div className="payment-modal-body">

              <div className="payment-employee-header">

                <div className="payment-avatar">
                  {paymentEmployee.name.charAt(
                    0
                  )}
                </div>

                <div>

                  <h3>
                    {paymentEmployee.name}
                  </h3>

                  <p>
                    Employee ID:{" "}
                    {paymentEmployee.id}
                  </p>

                  <p>
                    Week:{" "}
                    {formatDate(weekStart)} -{" "}
                    {formatDate(weekEnd)}
                  </p>

                </div>

              </div>

              <div className="payment-final-amount">

                <span>
                  Final Payable Amount
                </span>

                <strong>
                  ₹{" "}
                  {paymentEmployee.finalPayable.toLocaleString(
                    "en-IN"
                  )}
                </strong>

              </div>

              <div className="payment-form-grid">

                <div className="payment-form-group">

                  <label>
                    Payment Amount (₹)
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={paymentAmount}
                    onChange={(event) =>
                      setPaymentAmount(
                        event.target.value
                      )
                    }
                  />

                </div>

                <div className="payment-form-group">

                  <label>
                    Payment Date
                  </label>

                  <div className="payment-date-input">

                    <CalendarDays size={17} />

                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(event) =>
                        setPaymentDate(
                          event.target.value
                        )
                      }
                    />

                  </div>

                </div>

              </div>

              <div className="payment-form-group">

                <label>
                  Remark (Optional)
                </label>

                <textarea
                  rows="4"
                  value={paymentRemark}
                  onChange={(event) =>
                    setPaymentRemark(
                      event.target.value
                    )
                  }
                  placeholder="Enter payment remark"
                />

              </div>

            </div>

            <div className="payment-modal-footer">

              <button
                type="button"
                className="payment-cancel-btn"
                onClick={closeAllModals}
              >
                Cancel
              </button>

              <button
                type="button"
                className="payment-confirm-btn"
                onClick={markAsPaid}
                disabled={loading}
              >

                <Check size={17} />

                {loading
                  ? "Updating..."
                  : "Mark as Paid"}

              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default EmployeeSalary;