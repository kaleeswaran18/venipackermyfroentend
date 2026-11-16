import { useEffect, useMemo, useState } from "react";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  Pencil,
  RefreshCw,
  X,
  Users,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";

import api from "../../api/axios";

import "./EmployeeAttendance.css";

const WEEK_DAYS = [
  { key: "sun", label: "Sun" },
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
];

const WORK_CATEGORIES = [
  "Cutter",
  "Nailer",
  "Sandring",
  "Plainer",
  "Helper (M)",
  "Helper (L)",
  "Mcity",
  "Onsite Packing",
  "Others",
];

const STATUS_OPTIONS = [
  "Working",
  "Half Day",
  "Leave",
  "Permission",
  "Absent",
];

const STATUS_CLASS = {
  Working: "working",
  "Half Day": "half-day",
  Leave: "leave",
  Permission: "permission",
  Absent: "absent",
  Pending: "pending",
  "-": "future",
  Upcoming: "future",
};


/* =========================================================
   DATE HELPERS
========================================================= */

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDateOnly(date) {
  const result = new Date(date);

  result.setHours(0, 0, 0, 0);

  return result;
}

function getSunday(date) {
  const result = getDateOnly(date);

  result.setDate(
    result.getDate() - result.getDay()
  );

  return result;
}

function getWeekDates(startDate) {
  return WEEK_DAYS.map((_, index) => {
    const date = new Date(startDate);

    date.setDate(
      startDate.getDate() + index
    );

    return date;
  });
}

function getDayKey(date) {
  return WEEK_DAYS[new Date(date).getDay()].key;
}

function formatTimeForInput(date) {
  if (!date) return "";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  return value.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function createDateTime(date, time) {
  if (!time) return null;

  const [hours, minutes] = time.split(":");

  const result = new Date(date);

  result.setHours(
    Number(hours),
    Number(minutes),
    0,
    0
  );

  return result.toISOString();
}

function calculateWorkingHours(punchIn, punchOut) {
  if (!punchIn || !punchOut) return 0;

  const [inHours, inMinutes] = punchIn
    .split(":")
    .map(Number);

  const [outHours, outMinutes] = punchOut
    .split(":")
    .map(Number);

  if (
    Number.isNaN(inHours) ||
    Number.isNaN(inMinutes) ||
    Number.isNaN(outHours) ||
    Number.isNaN(outMinutes)
  ) {
    return 0;
  }

  const punchInMinutes =
    inHours * 60 + inMinutes;

  let punchOutMinutes =
    outHours * 60 + outMinutes;

  if (punchOutMinutes < punchInMinutes) {
    punchOutMinutes += 24 * 60;
  }

  const differenceMinutes =
    punchOutMinutes - punchInMinutes;

  return differenceMinutes / 60;
}

function formatWorkingHours(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return "-";
  }

  const totalMinutes = Math.round(
    numericValue * 60
  );

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}:${String(minutes).padStart(2, "0")}`;
}


/* =========================================================
   EMPTY DETAILS
========================================================= */

function createEmptyDetails() {
  return {
    workCategory: "",
    transferWorker: false,
    toLocation: "",
    punchIn: "",
    punchOut: "",
    workingHours: 0,
    otApplicable: false,
    otHours: 0,
    advanceAmount: 0,
    advanceRemark: "",
    remark: "",
  };
}


/* =========================================================
   COMPONENT
========================================================= */

function EmployeeAttendance() {
  const [employees, setEmployees] = useState([]);

  const [locations, setLocations] = useState([]);

  const [attendanceWeeks, setAttendanceWeeks] =
    useState([]);

  const [weekStart, setWeekStart] = useState(
    getSunday(new Date())
  );

  const [location, setLocation] = useState("");

  const [employeeId, setEmployeeId] =
    useState("all");

  const [isTodayView, setIsTodayView] =
    useState(true);

  const [selectedDetails, setSelectedDetails] =
    useState(null);

  const [editingAttendance, setEditingAttendance] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [toast, setToast] = useState({
    show: false,
    type: "",
    title: "",
    message: "",
  });


  /* =========================================================
     TOAST
  ========================================================= */

  const showToast = (
    type,
    title,
    message
  ) => {
    setToast({
      show: true,
      type,
      title,
      message,
    });

    setTimeout(() => {
      setToast({
        show: false,
        type: "",
        title: "",
        message: "",
      });
    }, 3000);
  };

  const closeToast = () => {
    setToast({
      show: false,
      type: "",
      title: "",
      message: "",
    });
  };


  /* =========================================================
     WEEK
  ========================================================= */

  const weekDates = useMemo(
    () => getWeekDates(weekStart),
    [weekStart]
  );

  const weekEnd = weekDates[6];

  const today = useMemo(
    () => getDateOnly(new Date()),
    []
  );

  const todayKey = getDayKey(today);


  /* =========================================================
     API - GET EMPLOYEES
  ========================================================= */

  const getEmployees = async () => {
    const response = await api.get(
      "/employees"
    );

    return response.data.data || [];
  };


  /* =========================================================
     API - GET LOCATIONS
  ========================================================= */

  const getLocations = async () => {
    const response = await api.get(
      "/locations"
    );

    return response.data.data || [];
  };


  /* =========================================================
     API - GET ATTENDANCE
  ========================================================= */

  const getAttendance = async () => {
    const response = await api.get(
      "/employee-attendance"
    );

    return response.data.data || [];
  };


  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  const loadPageData = async () => {
    try {
      setLoading(true);

      const [
        employeeData,
        locationData,
        attendanceData,
      ] = await Promise.all([
        getEmployees(),
        getLocations(),
        getAttendance(),
      ]);

      setEmployees(employeeData);
      setLocations(locationData);
      setAttendanceWeeks(attendanceData);

      if (
        !location &&
        locationData.length > 0
      ) {
        setLocation(locationData[0]._id);
      }
    } catch (error) {
      console.error(
        "Employee attendance load error:",
        error
      );

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to load attendance data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, []);


  /* =========================================================
     FIND WEEKLY ATTENDANCE DOCUMENT
  ========================================================= */

  const currentWeekAttendance = useMemo(() => {
    const targetStart =
      getDateOnly(weekStart).getTime();

    const targetEnd =
      getDateOnly(weekEnd).getTime();

    return attendanceWeeks.find(
      (item) => {
        const itemStart = getDateOnly(
          item.weekStartDate
        ).getTime();

        const itemEnd = getDateOnly(
          item.weekEndDate
        ).getTime();

        return (
          itemStart === targetStart &&
          itemEnd === targetEnd
        );
      }
    );
  }, [
    attendanceWeeks,
    weekStart,
    weekEnd,
  ]);


  /* =========================================================
     LOCATION NAME
  ========================================================= */

  const getLocationName = (id) => {
    const found = locations.find(
      (item) => item._id === id
    );

    return found?.name || "-";
  };


  /* =========================================================
     EMPLOYEE LOCATION
  ========================================================= */

  const getEmployeeLocationId = (
    employee
  ) => {
    if (
      employee.permanentLocationId &&
      typeof employee.permanentLocationId ===
        "object"
    ) {
      return employee.permanentLocationId._id;
    }

    return employee.permanentLocationId;
  };

  const getIdValue = (value) => {
    if (!value) return "";

    if (typeof value === "object") {
      return value._id || "";
    }

    return value;
  };

  const getDisplayStatus = (dayAttendance, date) => {
    // If attendance record exists, always show the actual API status.
    // Example: Working / Leave / Half Day / Permission / Absent.
    if (dayAttendance?.status) {
      return dayAttendance.status;
    }

    const targetDate = getDateOnly(date).getTime();
    const todayDate = getDateOnly(new Date()).getTime();

    // Today has not been completed yet, so keep it Pending.
    if (targetDate === todayDate) {
      return "Pending";
    }

    // Completed/past date with no API attendance record = no data.
    if (targetDate < todayDate) {
      return "-";
    }

    // Future date with no API attendance record = upcoming.
    return "Upcoming";
  };


  /* =========================================================
     FIND EMPLOYEE ATTENDANCE
  ========================================================= */

  const findAttendanceEmployee = (
    employee
  ) => {
    if (!currentWeekAttendance) {
      return null;
    }

    for (
      const locationItem of
        currentWeekAttendance.locations || []
    ) {
      const found =
        locationItem.employees?.find(
          (item) =>
            String(
              getIdValue(item.employeeId)
            ) ===
            String(employee._id)
        );

      if (found) {
        return {
          employee: found,
          locationId:
            locationItem.locationId,
        };
      }
    }

    return null;
  };


  /* =========================================================
     FIND DAY ATTENDANCE
  ========================================================= */

  const getEmployeeDay = (
    employee,
    date
  ) => {
    const result =
      findAttendanceEmployee(employee);

    if (!result) {
      return null;
    }

    const targetDate =
      getDateOnly(date).getTime();

    return (
      result.employee.days?.find(
        (day) =>
          getDateOnly(day.date).getTime() ===
          targetDate
      ) || null
    );
  };


  /* =========================================================
     EMPLOYEE TABLE DATA
  ========================================================= */

  const mappedEmployees = useMemo(() => {
    return employees.map((employee) => {
      const attendanceEmployee =
        findAttendanceEmployee(employee);

      const attendance = {};
      const details = {};

      WEEK_DAYS.forEach((day, index) => {
        const date = weekDates[index];

        const dayAttendance =
          attendanceEmployee?.employee?.days?.find(
            (item) =>
              getDateOnly(item.date).getTime() ===
              getDateOnly(date).getTime()
          );

        attendance[day.key] =
          getDisplayStatus(dayAttendance, date);

        if (dayAttendance) {
          details[day.key] = {
            workCategory:
              dayAttendance.workCategory || "",

            transferWorker:
              dayAttendance.temporaryRelocation ||
              false,

            toLocation:
              dayAttendance.toLocationId?._id ||
              dayAttendance.toLocationId ||
              "",

            punchIn:
              formatTimeForInput(
                dayAttendance.punchIn
              ),

            punchOut:
              formatTimeForInput(
                dayAttendance.punchOut
              ),

            workingHours:
              dayAttendance.workingHours || 0,

            otApplicable:
              dayAttendance.otApplicable ||
              false,

            otHours:
              dayAttendance.otHours || 0,

            advanceAmount:
              dayAttendance.advance?.amount ||
              0,

            advanceRemark:
              dayAttendance.advance?.remark ||
              "",

            remark:
              dayAttendance.remark || "",
          };
        }
      });

      return {
        ...employee,

        id: employee._id,

        name: employee.name,

        location:
          getEmployeeLocationId(employee),

        attendance,

        details,
      };
    });
  }, [
    employees,
    currentWeekAttendance,
    weekDates,
    locations,
  ]);


  /* =========================================================
     FILTER
  ========================================================= */

  const filteredEmployees = useMemo(() => {
    return mappedEmployees.filter(
      (employee) =>
        String(employee.location) ===
          String(location) &&
        (
          employeeId === "all" ||
          String(employee.id) ===
            String(employeeId)
        )
    );
  }, [
    mappedEmployees,
    location,
    employeeId,
  ]);


  /* =========================================================
     DISPLAY DAYS
  ========================================================= */

  const displayDays = useMemo(() => {
    if (isTodayView) {
      return WEEK_DAYS.filter(
        (day) => day.key === todayKey
      );
    }

    return WEEK_DAYS;
  }, [
    isTodayView,
    todayKey,
  ]);


  /* =========================================================
     WEEK NAVIGATION
  ========================================================= */

  const goPreviousWeek = () => {
    const next = new Date(weekStart);

    next.setDate(
      next.getDate() - 7
    );

    setWeekStart(getSunday(next));
    setIsTodayView(false);

    setSelectedDetails(null);
    setEditingAttendance(null);
  };


  const goNextWeek = () => {
    const next = new Date(weekStart);

    next.setDate(
      next.getDate() + 7
    );

    setWeekStart(getSunday(next));
    setIsTodayView(false);

    setSelectedDetails(null);
    setEditingAttendance(null);
  };


  const goToday = () => {
    setWeekStart(
      getSunday(new Date())
    );

    setIsTodayView(true);

    setSelectedDetails(null);
    setEditingAttendance(null);
  };


  /* =========================================================
     REFRESH
  ========================================================= */

  const handleRefresh = async () => {
    await loadPageData();
  };


  /* =========================================================
     SUMMARY
  ========================================================= */

  const getSummary = (dayKey) => {
    const counts = {
      Working: 0,
      "Half Day": 0,
      Leave: 0,
      Permission: 0,
      Absent: 0,
    };

    filteredEmployees.forEach(
      (employee) => {
        const status =
          employee.attendance[dayKey];

        if (
          counts[status] !== undefined
        ) {
          counts[status] += 1;
        }
      }
    );

    return counts;
  };


  /* =========================================================
     OPEN DETAILS
  ========================================================= */

  const openDetails = (
    employee,
    date,
    dayKey
  ) => {
    const details =
      employee.details?.[dayKey] ||
      createEmptyDetails();

    setSelectedDetails({
      employee,
      date,
      dayKey,
      status:
        employee.attendance[dayKey] ||
        "Pending",
      details,
    });
  };


  /* =========================================================
     OPEN EDIT
  ========================================================= */

  const openEdit = (
    employee,
    date,
    dayKey
  ) => {
    const existingDetails =
      employee.details?.[dayKey] ||
      createEmptyDetails();

    setEditingAttendance({
      employeeId: employee.id,

      employeeName:
        employee.name,

      permanentLocationId:
        employee.location,

      date,

      dayKey,

      status:
        STATUS_OPTIONS.includes(
          employee.attendance[dayKey]
        )
          ? employee.attendance[dayKey]
          : "Working",

      details: {
        ...existingDetails,
      },
    });
  };


  /* =========================================================
     EDIT CHANGE
  ========================================================= */

  const handleEditChange = (
    field,
    value
  ) => {
    setEditingAttendance(
      (current) => {
        const details = {
          ...current.details,
          [field]: value,
        };

        if (
          (field === "punchIn" ||
            field === "punchOut") &&
          details.punchIn &&
          details.punchOut
        ) {
          details.workingHours =
            calculateWorkingHours(
              details.punchIn,
              details.punchOut
            );
        }

        return {
          ...current,
          details,
        };
      }
    );
  };


  /* =========================================================
     BUILD DAILY ATTENDANCE
  ========================================================= */

  const buildDailyAttendance = () => {
    if (!editingAttendance) {
      return null;
    }

    const {
      date,
      status,
      permanentLocationId,
      details,
    } = editingAttendance;

    return {
      date:
        new Date(date).toISOString(),

      status,

      workCategory:
        status === "Working"
          ? details.workCategory || null
          : null,

      permanentLocationId,

      workLocationId:
        details.transferWorker &&
        details.toLocation
          ? details.toLocation
          : permanentLocationId,

      temporaryRelocation:
        Boolean(
          details.transferWorker
        ),

      toLocationId:
        details.transferWorker &&
        details.toLocation
          ? details.toLocation
          : null,

      punchIn: createDateTime(
        date,
        details.punchIn
      ),

      punchOut: createDateTime(
        date,
        details.punchOut
      ),

      workingHours:
        Number(
          details.workingHours
        ) || 0,

      otApplicable:
        Boolean(
          details.otApplicable
        ),

      otHours:
        Number(
          details.otHours
        ) || 0,

      advance: {
        amount:
          Number(
            details.advanceAmount
          ) || 0,

        remark:
          details.advanceRemark
            ?.trim() || null,
      },

      remark:
        details.remark?.trim() ||
        null,
    };
  };


  /* =========================================================
     CREATE ATTENDANCE
  ========================================================= */

  const createAttendance = async (
    dailyAttendance
  ) => {
    const employee =
      employees.find(
        (item) =>
          String(item._id) ===
          String(
            editingAttendance.employeeId
          )
      );

    if (!employee) {
      throw new Error(
        "Employee not found"
      );
    }

    const payload = {
      date:
        new Date(
          editingAttendance.date
        ).toISOString(),

      locations: [
        {
          locationId:
            editingAttendance.permanentLocationId,

          employees: [
            {
              employeeId:
                employee._id,

              name:
                employee.name,

              day:
                dailyAttendance,
            },
          ],
        },
      ],
    };

    await api.post(
      "/employee-attendance",
      payload
    );
  };


  /* =========================================================
     UPDATE ATTENDANCE
  ========================================================= */

  const updateAttendance = async (
    dailyAttendance
  ) => {
    if (!currentWeekAttendance?._id) {
      throw new Error(
        "Weekly attendance record not found"
      );
    }

    const payload = {
      locationId:
        editingAttendance.permanentLocationId,

      employeeId:
        editingAttendance.employeeId,

      date:
        new Date(
          editingAttendance.date
        ).toISOString(),

      day:
        dailyAttendance,
    };

    await api.patch(
      `/employee-attendance/${currentWeekAttendance._id}`,
      payload
    );
  };


  /* =========================================================
     SAVE TODAY ATTENDANCE
  ========================================================= */

  const handleSaveTodayAttendance =
    async () => {
      if (!editingAttendance) {
        return;
      }

      try {
        setSaving(true);

        const dailyAttendance =
          buildDailyAttendance();

        const existingDay =
          getEmployeeDay(
            employees.find(
              (item) =>
                String(item._id) ===
                String(
                  editingAttendance.employeeId
                )
            ),
            editingAttendance.date
          );

        if (existingDay) {
          await updateAttendance(
            dailyAttendance
          );

          showToast(
            "success",
            "Attendance Updated",
            "Employee attendance updated successfully."
          );
        } else {
          await createAttendance(
            dailyAttendance
          );

          showToast(
            "success",
            "Attendance Created",
            "Employee attendance saved successfully."
          );
        }

        await loadPageData();

        setEditingAttendance(null);
      } catch (error) {
        console.error(
          "Save attendance error:",
          error
        );

        showToast(
          "error",
          "Attendance Failed",
          error.response?.data?.message ||
            error.message ||
            "Failed to save attendance."
        );
      } finally {
        setSaving(false);
      }
    };


  /* =========================================================
     LOCATION NAME
  ========================================================= */

  const selectedLocationName =
    getLocationName(location);


  return (
    <div className="employee-attendance-layout">

      <Sidebar />

      <div className="employee-attendance-main">

        <Header />

        <main className="employee-attendance-content">

          {/* =====================================================
              PAGE HEADER
          ===================================================== */}

          <div className="employee-attendance-page-header">

            <div className="employee-attendance-title">

              <div className="employee-attendance-title-icon">
                <Users size={28} />
              </div>

              <div>
                <h1>
                  Employee Attendance
                </h1>

                <p>
                  {isTodayView
                    ? "Update today's employee attendance"
                    : "View employee attendance by week"}
                </p>
              </div>

            </div>

          </div>


          {/* =====================================================
              FILTER
          ===================================================== */}

          <section className="employee-attendance-filter-card">

            <div className="week-navigation">

              <button
                type="button"
                className="week-nav-btn"
                onClick={
                  goPreviousWeek
                }
              >
                <ChevronLeft size={18} />
                Previous Week
              </button>


              <button
                type="button"
                className="week-picker-btn"
                onClick={() =>
                  setIsTodayView(false)
                }
              >
                <CalendarDays size={18} />

                {formatDate(weekStart)}
                {" - "}
                {formatDate(weekEnd)}

                <ChevronDown size={17} />
              </button>


              <button
                type="button"
                className="week-nav-btn"
                onClick={
                  goNextWeek
                }
              >
                Next Week
                <ChevronRight size={18} />
              </button>


              <button
                type="button"
                className="today-btn"
                onClick={goToday}
              >
                <CalendarDays size={17} />
                Today
              </button>

            </div>


            <div className="attendance-filters">

              <div className="attendance-filter-group">

                <label>
                  Location
                </label>

                <div className="attendance-select">

                  <select
                    value={location}
                    onChange={(event) => {
                      setLocation(
                        event.target.value
                      );

                      setEmployeeId("all");
                    }}
                  >

                    {locations.map(
                      (item) => (
                        <option
                          key={item._id}
                          value={item._id}
                        >
                          {item.name}
                        </option>
                      )
                    )}

                  </select>

                  <ChevronDown size={16} />

                </div>

              </div>


              <div className="attendance-filter-group employee-filter">

                <label>
                  Employee
                </label>

                <div className="attendance-select">

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

                    {employees
                      .filter(
                        (employee) =>
                          String(
                            getEmployeeLocationId(
                              employee
                            )
                          ) ===
                          String(location)
                      )
                      .map(
                        (employee) => (
                          <option
                            key={employee._id}
                            value={
                              employee._id
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


              <button
                type="button"
                className="refresh-attendance-btn"
                onClick={
                  handleRefresh
                }
                title="Refresh"
                disabled={loading}
              >
                <RefreshCw
                  size={19}
                  className={
                    loading
                      ? "attendance-refresh-spin"
                      : ""
                  }
                />
              </button>

            </div>

          </section>


          {/* =====================================================
              WEEK INFO
          ===================================================== */}

          <div className="attendance-week-info">

            <strong>
              {isTodayView
                ? `Today: ${formatDate(today)}`
                : `Week: ${formatDate(
                    weekStart
                  )} - ${formatDate(
                    weekEnd
                  )}`}
            </strong>

            <span>
              {isTodayView
                ? "Today's attendance can be edited. Click Edit to update."
                : `Showing ${selectedLocationName} attendance for the selected week.`}
            </span>

          </div>


          {/* =====================================================
              TABLE
          ===================================================== */}

          <section className="attendance-table-card">

            <div className="attendance-table-wrapper">

              <table className={`employee-attendance-table ${
                isTodayView ? "today-attendance-table" : ""
              }`}>

                <thead>
                  <tr>
                    <th>#</th>
                    <th>Employee</th>

                    {isTodayView ? (
                      <>
                        <th>Status</th>
                        <th>Working Category</th>
                        <th>Transfer</th>
                        <th>Transfer Location</th>
                        <th>Punch In</th>
                        <th>Punch Out</th>
                        <th>Working Hours</th>
                        <th>OT Hours</th>
                        <th>Advance</th>
                      </>
                    ) : (
                      displayDays.map((day) => {
                        const date = weekDates[
                          WEEK_DAYS.findIndex(
                            (item) => item.key === day.key
                          )
                        ];

                        return (
                          <th key={day.key}>
                            <span>{day.label}</span>
                            <small>
                              {date.toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </small>
                          </th>
                        );
                      })
                    )}

                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={isTodayView ? 13 : 10}
                        className="attendance-empty-state"
                      >
                        Loading attendance...
                      </td>
                    </tr>
                  ) : filteredEmployees.length > 0 ? (
                    filteredEmployees.map((employee, employeeIndex) => {
                      const todayDetails = isTodayView
                        ? employee.details?.[todayKey]
                        : null;

                      const todayStatus = isTodayView
                        ? employee.attendance?.[todayKey] || "-"
                        : null;

                      return (
                        <tr key={employee._id}>
                          <td>{employeeIndex + 1}</td>

                          <td className="employee-name-cell">
                            {employee.name}
                          </td>

                          {isTodayView ? (
                            <>
                              <td>
                                <button
                                  type="button"
                                  className={`attendance-status ${
                                    STATUS_CLASS[todayStatus] || ""
                                  }`}
                                  onClick={() =>
                                    openEdit(employee, today, todayKey)
                                  }
                                >
                                  <span className="status-dot" />
                                  {todayStatus}
                                </button>
                              </td>

                              <td>
                                <span className="today-detail-value">
                                  {todayDetails?.workCategory || "-"}
                                </span>
                              </td>

                              <td>
                                <span
                                  className={
                                    todayDetails?.transferWorker
                                      ? "today-transfer yes"
                                      : "today-transfer no"
                                  }
                                >
                                  {todayDetails?.transferWorker
                                    ? "Yes"
                                    : "No"}
                                </span>
                              </td>

                              <td>
                                <span className="today-detail-value">
                                  {todayDetails?.toLocation
                                    ? getLocationName(todayDetails.toLocation)
                                    : "-"}
                                </span>
                              </td>

                              <td>
                                <span className="today-detail-value">
                                  {todayDetails?.punchIn || "-"}
                                </span>
                              </td>

                              <td>
                                <span className="today-detail-value">
                                  {todayDetails?.punchOut || "-"}
                                </span>
                              </td>

                              <td>
                                <span className="today-detail-value">
                                  {formatWorkingHours(
                                    todayDetails?.workingHours
                                  )}
                                </span>
                              </td>

                              <td>
                                <span className="today-detail-value">
                                  {todayDetails?.otApplicable
                                    ? `${todayDetails.otHours || 0} hrs`
                                    : "-"}
                                </span>
                              </td>

                              <td>
                                <span className="today-detail-value">
                                  {Number(todayDetails?.advanceAmount || 0) > 0
                                    ? `₹${todayDetails.advanceAmount}`
                                    : "-"}
                                </span>
                              </td>
                            </>
                          ) : (
                            displayDays.map((day) => {
                              const status =
                                employee.attendance[day.key] || "-";

                              return (
                                <td key={day.key}>
                                  <button
                                    type="button"
                                    className={`attendance-status ${
                                      STATUS_CLASS[status] || ""
                                    }`}
                                    onClick={() =>
                                      openDetails(
                                        employee,
                                        weekDates[
                                          WEEK_DAYS.findIndex(
                                            (item) => item.key === day.key
                                          )
                                        ],
                                        day.key
                                      )
                                    }
                                  >
                                    <span className="status-dot" />
                                    {status}
                                  </button>
                                </td>
                              );
                            })
                          )}

                          <td>
                            {isTodayView ? (
                              <button
                                type="button"
                                className="view-attendance-btn"
                                onClick={() =>
                                  openEdit(employee, today, todayKey)
                                }
                              >
                                <Pencil size={16} />
                                Edit
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="view-attendance-btn"
                                onClick={() =>
                                  openDetails(
                                    employee,
                                    weekDates[0],
                                    "sun"
                                  )
                                }
                              >
                                <Eye size={16} />
                                View
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={isTodayView ? 13 : 10}
                        className="attendance-empty-state"
                      >
                        No employees found for this location.
                      </td>
                    </tr>
                  )}
                </tbody>

              </table>

            </div>

          </section>


          {/* =====================================================
              WEEK SUMMARY
          ===================================================== */}

          {!isTodayView && (

            <section className="attendance-bottom-grid">

              <div className="attendance-summary-card">

                <div className="attendance-section-title">

                  <div>

                    <h2>
                      Week Summary -{" "}
                      {selectedLocationName}
                    </h2>

                    <p>
                      Total employees and
                      status count for the
                      selected week
                    </p>

                  </div>

                </div>


                <div className="summary-table-wrapper">

                  <table className="attendance-summary-table">

                    <thead>

                      <tr>

                        <th>
                          Date
                        </th>

                        <th>
                          Working
                        </th>

                        <th>
                          Half Day
                        </th>

                        <th>
                          Leave
                        </th>

                        <th>
                          Permission
                        </th>

                        <th>
                          Absent
                        </th>

                        <th>
                          Total
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {WEEK_DAYS.map(
                        (
                          day,
                          index
                        ) => {

                          const summary =
                            getSummary(
                              day.key
                            );

                          return (

                            <tr
                              key={
                                day.key
                              }
                            >

                              <td>
                                {weekDates[
                                  index
                                ].toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    weekday:
                                      "short",
                                  }
                                )}
                              </td>

                              <td>
                                {
                                  summary.Working
                                }
                              </td>

                              <td>
                                {
                                  summary[
                                    "Half Day"
                                  ]
                                }
                              </td>

                              <td>
                                {
                                  summary.Leave
                                }
                              </td>

                              <td>
                                {
                                  summary.Permission
                                }
                              </td>

                              <td>
                                {
                                  summary.Absent
                                }
                              </td>

                              <td>
                                {
                                  filteredEmployees.length
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

            </section>

          )}

        </main>

      </div>


      {/* =========================================================
          PREVIOUS WEEK DETAILS MODAL
      ========================================================= */}

      {selectedDetails && (

        <div
          className="attendance-details-overlay"
          onClick={() =>
            setSelectedDetails(null)
          }
        >

          <div
            className="attendance-details-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="attendance-details-header">

              <div>

                <h2>
                  Attendance Details -{" "}
                  {
                    selectedDetails
                      .employee.name
                  }
                </h2>

                <p>
                  {selectedDetails.date.toLocaleDateString(
                    "en-GB",
                    {
                      weekday:
                        "short",
                      day: "2-digit",
                      month:
                        "short",
                      year:
                        "numeric",
                    }
                  )}
                </p>

              </div>


              <button
                type="button"
                className="attendance-modal-close"
                onClick={() =>
                  setSelectedDetails(
                    null
                  )
                }
              >
                <X size={20} />
              </button>

            </div>


            <div className="attendance-details-body">

              <div className="attendance-detail-item">
                <span>
                  Employee
                </span>

                <strong>
                  {
                    selectedDetails
                      .employee.name
                  }
                </strong>
              </div>


              <div className="attendance-detail-item">
                <span>
                  Location
                </span>

                <strong>
                  {getLocationName(
                    selectedDetails
                      .employee.location
                  )}
                </strong>
              </div>


              <div className="attendance-detail-item">
                <span>
                  Status
                </span>

                <strong
                  className={`detail-status ${
                    STATUS_CLASS[
                      selectedDetails.status
                    ] || ""
                  }`}
                >
                  {
                    selectedDetails.status
                  }
                </strong>
              </div>


              <div className="attendance-detail-item">
                <span>
                  Working Category
                </span>

                <strong>
                  {
                    selectedDetails
                      .details
                      .workCategory ||
                    "-"
                  }
                </strong>
              </div>


              <div className="attendance-detail-item">
                <span>
                  Transfer Worker
                </span>

                <strong>
                  {
                    selectedDetails
                      .details
                      .transferWorker
                    ? "Yes"
                    : "No"
                  }
                </strong>
              </div>


              <div className="attendance-detail-item">
                <span>
                  To Location
                </span>

                <strong>
                  {selectedDetails
                    .details
                    .toLocation
                    ? getLocationName(
                        selectedDetails
                          .details
                          .toLocation
                      )
                    : "-"}
                </strong>
              </div>


              <div className="attendance-detail-item">
                <span>
                  Punch In
                </span>

                <strong>
                  {
                    selectedDetails
                      .details
                      .punchIn ||
                    "-"
                  }
                </strong>
              </div>


              <div className="attendance-detail-item">
                <span>
                  Punch Out
                </span>

                <strong>
                  {
                    selectedDetails
                      .details
                      .punchOut ||
                    "-"
                  }
                </strong>
              </div>


              <div className="attendance-detail-item">
                <span>
                  Working Hours
                </span>

                <strong>
                  {formatWorkingHours(
                    selectedDetails
                      .details
                      .workingHours
                  )}
                </strong>
              </div>


              <div className="attendance-detail-item">
                <span>
                  OT Hours
                </span>

                <strong>
                  {
                    selectedDetails
                      .details
                      .otHours ||
                    0
                  }
                </strong>
              </div>


              <div className="attendance-detail-item">
                <span>
                  Advance
                </span>

                <strong>
                  ₹
                  {
                    selectedDetails
                      .details
                      .advanceAmount ||
                    0
                  }
                </strong>
              </div>


              <div className="attendance-detail-item">
                <span>
                  Remark
                </span>

                <strong>
                  {
                    selectedDetails
                      .details
                      .remark ||
                    "-"
                  }
                </strong>
              </div>


              <div className="attendance-details-footer">

                <button
                  type="button"
                  onClick={() =>
                    setSelectedDetails(
                      null
                    )
                  }
                >
                  Close
                </button>

              </div>

            </div>

          </div>

        </div>

      )}


      {/* =========================================================
          TODAY EDIT MODAL
      ========================================================= */}

      {editingAttendance && (

        <div
          className="attendance-details-overlay"
          onClick={() =>
            !saving &&
            setEditingAttendance(null)
          }
        >

          <div
            className="attendance-details-modal attendance-edit-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="attendance-details-header">

              <div>

                <h2>
                  Edit Attendance -{" "}
                  {
                    editingAttendance
                      .employeeName
                  }
                </h2>

                <p>
                  {
                    editingAttendance.date.toLocaleDateString(
                      "en-GB",
                      {
                        weekday:
                          "long",
                        day: "2-digit",
                        month:
                          "short",
                        year:
                          "numeric",
                      }
                    )
                  }
                </p>

              </div>


              <button
                type="button"
                className="attendance-modal-close"
                onClick={() =>
                  !saving &&
                  setEditingAttendance(
                    null
                  )
                }
                disabled={saving}
              >
                <X size={20} />
              </button>

            </div>


            <div className="attendance-details-body attendance-edit-grid">

              {/* STATUS */}

              <div className="attendance-detail-item">

                <span>
                  Status
                </span>

                <select
                  value={
                    editingAttendance.status
                  }
                  onChange={(event) =>
                    setEditingAttendance(
                      (current) => ({
                        ...current,
                        status:
                          event.target
                            .value,
                      })
                    )
                  }
                  disabled={saving}
                >

                  {STATUS_OPTIONS.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status}
                      </option>
                    )
                  )}

                </select>

              </div>


              {/* WORK CATEGORY */}

              <div className="attendance-detail-item">

                <span>
                  Working Category
                </span>

                <select
                  value={
                    editingAttendance
                      .details
                      .workCategory
                  }
                  onChange={(event) =>
                    handleEditChange(
                      "workCategory",
                      event.target
                        .value
                    )
                  }
                  disabled={
                    saving ||
                    editingAttendance
                      .status !==
                      "Working"
                  }
                >

                  <option value="">
                    Select Category
                  </option>

                  {WORK_CATEGORIES.map(
                    (category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {category}
                      </option>
                    )
                  )}

                </select>

              </div>


              {/* TRANSFER WORKER */}

              <div className="attendance-detail-item">

                <span>
                  Transfer Worker
                </span>

                <select
                  value={
                    editingAttendance
                      .details
                      .transferWorker
                      ? "yes"
                      : "no"
                  }
                  onChange={(event) => {

                    const isTransfer =
                      event.target
                        .value ===
                      "yes";

                    handleEditChange(
                      "transferWorker",
                      isTransfer
                    );

                    if (!isTransfer) {
                      handleEditChange(
                        "toLocation",
                        ""
                      );
                    }

                  }}
                  disabled={saving}
                >

                  <option value="no">
                    No
                  </option>

                  <option value="yes">
                    Yes
                  </option>

                </select>

              </div>


              {/* TRANSFER LOCATION */}

              <div className="attendance-detail-item">

                <span>
                  Transfer Location
                </span>

                <select
                  value={
                    editingAttendance
                      .details
                      .toLocation
                  }
                  disabled={
                    saving ||
                    !editingAttendance
                      .details
                      .transferWorker
                  }
                  onChange={(event) =>
                    handleEditChange(
                      "toLocation",
                      event.target
                        .value
                    )
                  }
                >

                  <option value="">
                    Select Location
                  </option>

                  {locations
                    .filter(
                      (item) =>
                        String(
                          item._id
                        ) !==
                        String(
                          editingAttendance
                            .permanentLocationId
                        )
                    )
                    .map(
                      (item) => (
                        <option
                          key={
                            item._id
                          }
                          value={
                            item._id
                          }
                        >
                          {item.name}
                        </option>
                      )
                    )}

                </select>

              </div>


              {/* PUNCH IN */}

              <div className="attendance-detail-item">

                <span>
                  Punch In
                </span>

                <input
                  type="time"
                  value={
                    editingAttendance
                      .details
                      .punchIn
                  }
                  onChange={(event) =>
                    handleEditChange(
                      "punchIn",
                      event.target
                        .value
                    )
                  }
                  disabled={saving}
                />

              </div>


              {/* PUNCH OUT */}

              <div className="attendance-detail-item">

                <span>
                  Punch Out
                </span>

                <input
                  type="time"
                  value={
                    editingAttendance
                      .details
                      .punchOut
                  }
                  onChange={(event) =>
                    handleEditChange(
                      "punchOut",
                      event.target
                        .value
                    )
                  }
                  disabled={saving}
                />

              </div>


              {/* WORKING HOURS */}

              <div className="attendance-detail-item">

                <span>
                  Working Hours
                </span>

                <input
                  type="text"
                  value={
                    formatWorkingHours(
                      editingAttendance
                        .details
                        .workingHours
                    ) === "-"
                      ? ""
                      : formatWorkingHours(
                          editingAttendance
                            .details
                            .workingHours
                        )
                  }
                  readOnly
                  disabled={saving}
                />

              </div>


              {/* OT APPLICABLE */}

              <div className="attendance-detail-item">

                <span>
                  OT Applicable
                </span>

                <select
                  value={
                    editingAttendance
                      .details
                      .otApplicable
                      ? "yes"
                      : "no"
                  }
                  onChange={(event) =>
                    handleEditChange(
                      "otApplicable",
                      event.target
                        .value ===
                        "yes"
                    )
                  }
                  disabled={saving}
                >

                  <option value="no">
                    No
                  </option>

                  <option value="yes">
                    Yes
                  </option>

                </select>

              </div>


              {/* OT HOURS */}

              <div className="attendance-detail-item">

                <span>
                  OT Hours
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={
                    editingAttendance
                      .details
                      .otHours
                  }
                  disabled={
                    saving ||
                    !editingAttendance
                      .details
                      .otApplicable
                  }
                  onChange={(event) =>
                    handleEditChange(
                      "otHours",
                      Number(
                        event.target
                          .value
                      )
                    )
                  }
                />

              </div>


              {/* ADVANCE */}

              <div className="attendance-detail-item">

                <span>
                  Advance Amount
                </span>

                <input
                  type="number"
                  min="0"
                  value={
                    editingAttendance
                      .details
                      .advanceAmount
                  }
                  onChange={(event) =>
                    handleEditChange(
                      "advanceAmount",
                      Number(
                        event.target
                          .value
                      )
                    )
                  }
                  disabled={saving}
                />

              </div>


              {/* ADVANCE REMARK */}

              <div className="attendance-detail-item attendance-full-width">

                <span>
                  Advance Remark
                </span>

                <input
                  type="text"
                  value={
                    editingAttendance
                      .details
                      .advanceRemark
                  }
                  onChange={(event) =>
                    handleEditChange(
                      "advanceRemark",
                      event.target
                        .value
                    )
                  }
                  placeholder="Advance remark"
                  disabled={saving}
                />

              </div>


              {/* REMARK */}

              <div className="attendance-detail-item attendance-full-width">

                <span>
                  Remark
                </span>

                <textarea
                  value={
                    editingAttendance
                      .details
                      .remark
                  }
                  onChange={(event) =>
                    handleEditChange(
                      "remark",
                      event.target
                        .value
                    )
                  }
                  placeholder="Enter remark"
                  rows={3}
                  disabled={saving}
                />

              </div>

            </div>


            <div className="attendance-details-footer">

              <button
                type="button"
                className="attendance-cancel-btn"
                onClick={() =>
                  setEditingAttendance(
                    null
                  )
                }
                disabled={saving}
              >
                Cancel
              </button>


              <button
                type="button"
                className="attendance-save-btn"
                onClick={
                  handleSaveTodayAttendance
                }
                disabled={saving}
              >

                {saving ? (
                  <>
                    <RefreshCw
                      size={16}
                      className="attendance-refresh-spin"
                    />

                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle
                      size={16}
                    />

                    Save Attendance
                  </>
                )}

              </button>

            </div>

          </div>

        </div>

      )}


      {/* =========================================================
          TOAST
      ========================================================= */}

      {toast.show && (

        <div
          className={`attendance-toast attendance-toast-${toast.type}`}
        >

          <div className="attendance-toast-icon">

            {toast.type ===
            "success" ? (
              <CheckCircle
                size={20}
              />
            ) : (
              <AlertCircle
                size={20}
              />
            )}

          </div>


          <div className="attendance-toast-content">

            <strong>
              {toast.title}
            </strong>

            <span>
              {toast.message}
            </span>

          </div>


          <button
            type="button"
            className="attendance-toast-close"
            onClick={
              closeToast
            }
          >
            <X size={17} />
          </button>

        </div>

      )}

    </div>
  );
}

export default EmployeeAttendance;