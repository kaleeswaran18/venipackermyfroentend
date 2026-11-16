import { useEffect, useMemo, useState } from "react";

import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  X,
  Calendar,
  Gauge,
  History,
} from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";

import api from "../../api/axios";

import "./VehicleExpense.css";

function VehicleExpense() {
  // ==========================================
  // VEHICLE EXPENSE DATA
  // ==========================================

  const [vehicleExpenses, setVehicleExpenses] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  // ==========================================
  // ADD / EDIT MODAL
  // ==========================================

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState(null);

  // ==========================================
  // VIEW MODAL
  // ==========================================

  const [viewExpense, setViewExpense] =
    useState(null);

  // ==========================================
  // FORM
  // ==========================================

  // Convert a Date into the local YYYY-MM-DDTHH:mm format required by datetime-local.
  const getLocalDateTimeValue = (date = new Date()) => {
    const localDate = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    );

    return localDate.toISOString().slice(0, 16);
  };

  // Convert the local datetime-local value into an ISO timestamp for the backend.
  const toISOStringFromLocalDateTime = (value) => {
    if (!value) return "";

    return new Date(value).toISOString();
  };

  const emptyForm = {
    date: "",
    vehicle: "",
    driver: "",
    startKms: "",
    endKms: "",
    totalKms: "",
    diesel: "",
    status: "In Progress",
  };

  const [formData, setFormData] =
    useState(emptyForm);

  // ==========================================
  // FILTERS
  // ==========================================

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [vehicleFilter, setVehicleFilter] =
    useState("All");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  // ==========================================
  // TOAST
  // ==========================================

  const [toast, setToast] =
    useState({
      show: false,
      type: "",
      message: "",
    });

  // ==========================================
  // SHOW TOAST
  // ==========================================

  const showToast = (type, message) => {
    setToast({
      show: true,
      type,
      message,
    });

    setTimeout(() => {
      setToast({
        show: false,
        type: "",
        message: "",
      });
    }, 3000);
  };

  // ==========================================
  // GET ALL VEHICLE EXPENSES
  // ==========================================

  const getVehicleExpenses = async () => {
    try {
      setLoading(true);

      const response =
        await api.get("/vehicle-expenses");

      setVehicleExpenses(
        response?.data?.data || []
      );
    } catch (error) {
      console.error(
        "Get vehicle expenses error:",
        error
      );

      showToast(
        "error",
        error?.response?.data?.message ||
          "Failed to fetch vehicle expenses."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LOAD DATA
  // ==========================================

  useEffect(() => {
    getVehicleExpenses();
  }, []);

  // ==========================================
  // UNIQUE VEHICLES
  // ==========================================

  const vehicles = useMemo(() => {
    const values = vehicleExpenses
      .map((item) => item.vehicle)
      .filter(Boolean);

    return [...new Set(values)];
  }, [vehicleExpenses]);

  // ==========================================
  // FILTER DATA
  // ==========================================

  const filteredExpenses =
    vehicleExpenses.filter((expense) => {
      const searchValue =
        search.toLowerCase().trim();

      const matchesSearch =
        !searchValue ||
        expense.vehicle
          ?.toLowerCase()
          .includes(searchValue) ||
        expense.driver
          ?.toLowerCase()
          .includes(searchValue);

      const matchesStatus =
        statusFilter === "All" ||
        expense.status === statusFilter;

      const matchesVehicle =
        vehicleFilter === "All" ||
        expense.vehicle === vehicleFilter;

      const expenseDate =
        expense.date
          ? new Date(expense.date)
          : null;

      const matchesStartDate =
        !startDate ||
        (expenseDate &&
          expenseDate >=
            new Date(`${startDate}T00:00:00`));

      const matchesEndDate =
        !endDate ||
        (expenseDate &&
          expenseDate <=
            new Date(`${endDate}T23:59:59`));

      return (
        matchesSearch &&
        matchesStatus &&
        matchesVehicle &&
        matchesStartDate &&
        matchesEndDate
      );
    });

  // ==========================================
  // RESET FILTERS
  // ==========================================

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setVehicleFilter("All");
    setStartDate("");
    setEndDate("");
  };

  // ==========================================
  // OPEN ADD FORM
  // ==========================================

  const handleAdd = () => {
    setEditingId(null);

    setFormData({
      ...emptyForm,
      date: getLocalDateTimeValue(),
    });

    setShowForm(true);
  };

  // ==========================================
  // OPEN EDIT FORM
  // ==========================================

  const handleEdit = async (expense) => {
    try {
      setLoading(true);

      const response =
        await api.get(
          `/vehicle-expenses/${expense._id}`
        );

      const item =
        response?.data?.data || expense;

      setEditingId(item._id);

      setFormData({
        date: item.date
          ? getLocalDateTimeValue(new Date(item.date))
          : "",

        vehicle: item.vehicle || "",

        driver: item.driver || "",

        startKms:
          item.startKms ?? "",

        endKms:
          item.endKms ?? "",

        // read-only, calculated by backend
        totalKms:
          item.totalKms ?? "",

        diesel:
          item.diesel ?? "",

        status:
          item.status || "In Progress",
      });

      setShowForm(true);
    } catch (error) {
      console.error(
        "Get vehicle expense error:",
        error
      );

      showToast(
        "error",
        error?.response?.data?.message ||
          "Failed to load vehicle expense."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // VIEW
  // ==========================================

  const handleView = async (expense) => {
    try {
      setLoading(true);

      const response =
        await api.get(
          `/vehicle-expenses/${expense._id}`
        );

      setViewExpense(
        response?.data?.data || expense
      );
    } catch (error) {
      console.error(
        "View vehicle expense error:",
        error
      );

      showToast(
        "error",
        error?.response?.data?.message ||
          "Failed to load vehicle expense."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // INPUT CHANGE
  // ==========================================

  const handleChange = (e) => {
    const { name, value } =
      e.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // ==========================================
  // SAVE / UPDATE
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      // ========================================
      // CREATE
      // ========================================

      if (!editingId) {
        const payload = {
          date: toISOStringFromLocalDateTime(formData.date),
          vehicle:
            formData.vehicle.trim(),
          driver:
            formData.driver.trim(),
          startKms:
            Number(formData.startKms),
        };

        const response =
          await api.post(
            "/vehicle-expenses",
            payload
          );

        const createdExpense =
          response?.data?.data;

        if (createdExpense) {
          setVehicleExpenses(
            (prev) => [
              createdExpense,
              ...prev,
            ]
          );
        }

        showToast(
          "success",
          "Vehicle expense added successfully."
        );
      }

      // ========================================
      // UPDATE
      // ========================================

      else {
        const isCompleted =
          formData.status ===
          "Completed";

        const hasEndKms =
          formData.endKms !== "" &&
          formData.endKms !== null;

        // End KMs entered but status is still In Progress
        if (!isCompleted && hasEndKms) {
          showToast(
            "error",
            "End KMs is entered. Please update status to Completed and try again."
          );

          return;
        }

        const hasDiesel =
          formData.diesel !== "" &&
          formData.diesel !== null;

        // End KMs can not be less than Start KMs
        if (
          (isCompleted || hasEndKms) &&
          Number(formData.endKms) <
            Number(formData.startKms)
        ) {
          showToast(
            "error",
            "End KMs cannot be less than Start KMs."
          );

          return;
        }

        const payload = {
          date: toISOStringFromLocalDateTime(formData.date),
          vehicle:
            formData.vehicle.trim(),
          driver:
            formData.driver.trim(),
          startKms:
            Number(formData.startKms),
          status:
            formData.status,
        };

        // Completed -> End KMs + Diesel required
        if (isCompleted) {
          payload.endKms =
            Number(formData.endKms);

          payload.diesel =
            Number(formData.diesel || 0);
        }

        // In Progress -> End KMs + Diesel optional
        else {
          payload.endKms = hasEndKms
            ? Number(formData.endKms)
            : null;

          payload.diesel = hasDiesel
            ? Number(formData.diesel)
            : 0;
        }

        // totalKms is NOT sent, backend calculates it

        const response =
          await api.patch(
            `/vehicle-expenses/${editingId}`,
            payload
          );

        const updatedExpense =
          response?.data?.data;

        if (updatedExpense) {
          setVehicleExpenses(
            (prev) =>
              prev.map((item) =>
                item._id === editingId
                  ? updatedExpense
                  : item
              )
          );
        }

        showToast(
          "success",
          "Vehicle expense updated successfully."
        );
      }

      closeForm();
    } catch (error) {
      console.error(
        "Save vehicle expense error:",
        error
      );

      showToast(
        "error",
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save vehicle expense."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // DELETE
  // ==========================================

  const handleDelete = async (expense) => {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete vehicle expense for ${expense.vehicle}?`
      );

    if (!confirmed) return;

    try {
      setLoading(true);

      await api.delete(
        `/vehicle-expenses/${expense._id}`
      );

      setVehicleExpenses(
        (prev) =>
          prev.filter(
            (item) =>
              item._id !== expense._id
          )
      );

      showToast(
        "success",
        "Vehicle expense deleted successfully."
      );
    } catch (error) {
      console.error(
        "Delete vehicle expense error:",
        error
      );

      showToast(
        "error",
        error?.response?.data?.message ||
          "Failed to delete vehicle expense."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // CLOSE FORM
  // ==========================================

  const closeForm = () => {
    setShowForm(false);

    setEditingId(null);

    setFormData(emptyForm);
  };

  // ==========================================
  // FORMAT DATE
  // ==========================================

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // ==========================================
  // CHANGE HISTORY HELPERS
  // ==========================================

  const formatHistoryValue = (value, field) => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    if (field === "diesel") {
      return `₹ ${Number(value).toLocaleString("en-IN")}`;
    }

    if (field === "date") {
      return formatDate(value);
    }

    return String(value);
  };

  const getChangedByName = (changedBy) => {
    if (!changedBy) return "Unknown User";

    if (typeof changedBy === "object") {
      return (
        changedBy.name ||
        changedBy.username ||
        changedBy.email ||
        changedBy._id ||
        "Unknown User"
      );
    }

    return String(changedBy);
  };

  const formatFieldName = (field) => {
    const names = {
      startKms: "Start KMs",
      endKms: "End KMs",
      totalKms: "Total KMs",
      diesel: "Diesel Amount",
      vehicle: "Vehicle",
      driver: "Driver",
      date: "Date",
      status: "Status",
    };

    return names[field] || field;
  };

  // ==========================================
  // TOTAL KMS (read-only)
  // Shows End - Start while editing,
  // otherwise the value saved by backend.
  // ==========================================

  const startNumber =
    formData.startKms !== ""
      ? Number(formData.startKms)
      : null;

  const endNumber =
    formData.endKms !== "" &&
    formData.endKms !== null
      ? Number(formData.endKms)
      : null;

  const totalKmsDisplay =
    startNumber !== null &&
    endNumber !== null &&
    endNumber >= startNumber
      ? endNumber - startNumber
      : formData.totalKms;

  const isCompletedStatus =
    formData.status === "Completed";

  return (
    <div className="vehicle-expense-layout">

      <Sidebar />

      <div className="vehicle-expense-main">

        <Header />

        <main className="vehicle-expense-content">

          {/* PAGE HEADER */}
          <div className="vehicle-expense-page-header">

            <div>
              <h1>
                Vehicle Expense
              </h1>

              <p>
                Manage vehicle trips and expenses
              </p>
            </div>

            <button
              type="button"
              className="add-vehicle-expense-btn"
              onClick={handleAdd}
              disabled={loading}
            >
              <Plus size={18} />

              Add Vehicle Expense
            </button>

          </div>

          {/* FILTERS */}
          <div className="vehicle-expense-filter-card">

            <div className="vehicle-expense-search">

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search vehicle, driver..."
              />

            </div>

            <div className="vehicle-expense-date-filter">

              <Calendar size={18} />

              <input
                type="date"
                value={startDate}
                onChange={(e) =>
                  setStartDate(e.target.value)
                }
              />

              <span>—</span>

              <input
                type="date"
                value={endDate}
                onChange={(e) =>
                  setEndDate(e.target.value)
                }
              />

            </div>

            <div className="vehicle-expense-filter">

              <label>
                Status
              </label>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value
                  )
                }
              >
                <option value="All">
                  All
                </option>

                <option value="In Progress">
                  In Progress
                </option>

                <option value="Completed">
                  Completed
                </option>
              </select>

            </div>

            <div className="vehicle-expense-filter">

              <label>
                Vehicle
              </label>

              <select
                value={vehicleFilter}
                onChange={(e) =>
                  setVehicleFilter(
                    e.target.value
                  )
                }
              >
                <option value="All">
                  All
                </option>

                {vehicles.map(
                  (vehicle) => (
                    <option
                      key={vehicle}
                      value={vehicle}
                    >
                      {vehicle}
                    </option>
                  )
                )}

              </select>

            </div>

            <button
              type="button"
              className="vehicle-expense-reset-btn"
              onClick={resetFilters}
            >
              Reset
            </button>

          </div>

          {/* TABLE */}
          <div className="vehicle-expense-table-card">

            <div className="vehicle-expense-table-header">

              <h2>
                Vehicle Expense List
                {" "}
                ({filteredExpenses.length})
              </h2>

              <div className="vehicle-expense-show">

                <span>
                  Show
                </span>

                <select>
                  <option>
                    10
                  </option>

                  <option>
                    25
                  </option>

                  <option>
                    50
                  </option>
                </select>

                <span>
                  entries
                </span>

              </div>

            </div>

            <div className="vehicle-expense-table-wrapper">

              <table className="vehicle-expense-table">

                <thead>
                  <tr>
                    <th>
                      S.No
                    </th>

                    <th>
                      Date & Time
                    </th>

                    <th>
                      Vehicle
                    </th>

                    <th>
                      Driver
                    </th>

                    <th>
                      Start KMs
                    </th>

                    <th>
                      End KMs
                    </th>

                    <th>
                      Total KMs
                    </th>

                    <th>
                      Diesel
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {loading &&
                  vehicleExpenses.length === 0 ? (

                    <tr>
                      <td
                        colSpan="10"
                        className="vehicle-expense-empty"
                      >
                        Loading...
                      </td>
                    </tr>

                  ) : filteredExpenses.length ===
                    0 ? (

                    <tr>
                      <td
                        colSpan="10"
                        className="vehicle-expense-empty"
                      >
                        No vehicle expense
                        records found.
                      </td>
                    </tr>

                  ) : (

                    filteredExpenses.map(
                      (expense, index) => (

                        <tr
                          key={
                            expense._id
                          }
                        >

                          <td>
                            {expense.serialNo ??
                              index + 1}
                          </td>

                          <td>
                            {formatDate(
                              expense.date
                            )}
                          </td>

                          <td>
                            {expense.vehicle}
                          </td>

                          <td>
                            {expense.driver}
                          </td>

                          <td>
                            {expense.startKms}
                          </td>

                          <td>
                            {expense.endKms ??
                              "—"}
                          </td>

                          <td>
                            {expense.totalKms ??
                              "—"}
                          </td>

                          <td>
                            {expense.diesel
                              ? `₹ ${Number(
                                  expense.diesel
                                ).toLocaleString(
                                  "en-IN"
                                )}`
                              : "—"}
                          </td>

                          <td>

                            <span
                              className={`vehicle-expense-status ${
                                expense.status ===
                                "Completed"
                                  ? "completed"
                                  : "in-progress"
                              }`}
                            >
                              {
                                expense.status
                              }
                            </span>

                          </td>

                          <td>

                            <div className="vehicle-expense-actions">

                              <button
                                type="button"
                                title="View"
                                onClick={() =>
                                  handleView(
                                    expense
                                  )
                                }
                              >
                                <Eye
                                  size={17}
                                />
                              </button>

                              <button
                                type="button"
                                title="Edit"
                                onClick={() =>
                                  handleEdit(
                                    expense
                                  )
                                }
                              >
                                <Pencil
                                  size={17}
                                />
                              </button>

                              <button
                                type="button"
                                title="Delete"
                                onClick={() =>
                                  handleDelete(
                                    expense
                                  )
                                }
                              >
                                <Trash2
                                  size={17}
                                />
                              </button>

                            </div>

                          </td>

                        </tr>

                      )
                    )

                  )}

                </tbody>

              </table>

            </div>

          </div>

        </main>

      </div>

      {/* ==========================================
          ADD / EDIT MODAL (2 column grid)

          Add : Date | Vehicle
                Driver | Start KMs

          Edit: Date | Vehicle
                Driver | Start KMs
                Status | End KMs
                Total KMs | Diesel
      ========================================== */}

      {showForm && (

        <div
          className="vehicle-expense-modal-overlay"
          onClick={closeForm}
        >

          <div
            className="vehicle-expense-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="vehicle-expense-modal-header">

              <h2>
                {editingId
                  ? "Edit Vehicle Expense"
                  : "Add Vehicle Expense"}
              </h2>

              <button
                type="button"
                className="vehicle-expense-modal-close"
                onClick={closeForm}
              >
                <X size={22} />
              </button>

            </div>

            <form
              onSubmit={handleSubmit}
              className="vehicle-expense-form"
            >

              {/* DATE */}
              <div className="vehicle-expense-form-group">

                <label>
                  Date & Time <span>*</span>
                </label>

                <div className="vehicle-expense-input-icon">

                  <Calendar size={18} />

                  <input
                    type="datetime-local"
                    name="date"
                    value={
                      formData.date
                    }
                    onChange={
                      handleChange
                    }
                    required
                  />

                </div>

              </div>

              {/* VEHICLE */}
              <div className="vehicle-expense-form-group">

                <label>
                  Vehicle <span>*</span>
                </label>

                <input
                  type="text"
                  name="vehicle"
                  value={
                    formData.vehicle
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter vehicle number"
                  required
                />

              </div>

              {/* DRIVER */}
              <div className="vehicle-expense-form-group">

                <label>
                  Driver <span>*</span>
                </label>

                <input
                  type="text"
                  name="driver"
                  value={
                    formData.driver
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter driver name"
                  required
                />

              </div>

              {/* START KMS */}
              <div className="vehicle-expense-form-group">

                <label>
                  Start KMs <span>*</span>
                </label>

                <div className="vehicle-expense-input-icon">

                  <Gauge size={18} />

                  <input
                    type="number"
                    name="startKms"
                    value={
                      formData.startKms
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Enter start KMs"
                    min="0"
                    required
                  />

                </div>

              </div>

              {/* EDIT ONLY */}
              {editingId && (

                <>
                  {/* STATUS */}
                  <div className="vehicle-expense-form-group">

                    <label>
                      Status
                    </label>

                    <select
                      name="status"
                      value={
                        formData.status
                      }
                      onChange={
                        handleChange
                      }
                    >
                      <option value="In Progress">
                        In Progress
                      </option>

                      <option value="Completed">
                        Completed
                      </option>
                    </select>

                  </div>

                  {/* END KMS
                      In Progress -> optional
                      Completed   -> required */}
                  <div className="vehicle-expense-form-group">

                    <label>
                      End KMs{" "}
                      {isCompletedStatus && (
                        <span>*</span>
                      )}
                    </label>

                    <div className="vehicle-expense-input-icon">

                      <Gauge size={18} />

                      <input
                        type="number"
                        name="endKms"
                        value={
                          formData.endKms
                        }
                        onChange={
                          handleChange
                        }
                        placeholder="Enter end KMs"
                        min={
                          formData.startKms ||
                          0
                        }
                        required={
                          isCompletedStatus
                        }
                      />

                    </div>

                  </div>

                  {/* TOTAL KMS (read-only) */}
                  <div className="vehicle-expense-form-group">

                    <label>
                      Total KMs
                    </label>

                    <div className="vehicle-expense-input-icon">

                      <Gauge size={18} />

                      <input
                        type="number"
                        name="totalKms"
                        value={
                          totalKmsDisplay ??
                          ""
                        }
                        placeholder="Auto calculated"
                        readOnly
                        tabIndex={-1}
                      />

                    </div>

                    <small className="vehicle-expense-hint">
                      Calculated automatically
                    </small>

                  </div>

                  {/* DIESEL
                      In Progress -> optional
                      Completed   -> required */}
                  <div className="vehicle-expense-form-group">

                    <label>
                      Diesel{" "}
                      {isCompletedStatus && (
                        <span>*</span>
                      )}
                    </label>

                    <input
                      type="number"
                      name="diesel"
                      value={
                        formData.diesel
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Enter diesel amount"
                      min="0"
                      required={
                        isCompletedStatus
                      }
                    />

                  </div>

                </>

              )}

              {/* ACTIONS */}
              <div className="vehicle-expense-modal-actions">

                <button
                  type="button"
                  className="vehicle-expense-cancel-btn"
                  onClick={closeForm}
                  disabled={loading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="vehicle-expense-save-btn"
                  disabled={loading}
                >
                  {loading
                    ? "Saving..."
                    : editingId
                    ? "Update"
                    : "Save"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* ==========================================
          VIEW MODAL (2 column grid)

          Date | Vehicle
          Driver | Start KMs
          End KMs | Total KMs
          Diesel | Status
      ========================================== */}

      {viewExpense && (

        <div
          className="vehicle-expense-modal-overlay"
          onClick={() =>
            setViewExpense(null)
          }
        >

          <div
            className="vehicle-expense-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="vehicle-expense-modal-header">

              <h2>
                Vehicle Expense Details
              </h2>

              <button
                type="button"
                className="vehicle-expense-modal-close"
                onClick={() =>
                  setViewExpense(null)
                }
              >
                <X size={22} />
              </button>

            </div>

            <div className="vehicle-expense-form">

              <div className="vehicle-expense-form-group">
                <label>
                  Date & Time
                </label>

                <input
                  value={formatDate(
                    viewExpense.date
                  )}
                  readOnly
                />
              </div>

              <div className="vehicle-expense-form-group">
                <label>
                  Vehicle
                </label>

                <input
                  value={
                    viewExpense.vehicle ||
                    ""
                  }
                  readOnly
                />
              </div>

              <div className="vehicle-expense-form-group">
                <label>
                  Driver
                </label>

                <input
                  value={
                    viewExpense.driver ||
                    ""
                  }
                  readOnly
                />
              </div>

              <div className="vehicle-expense-form-group">
                <label>
                  Start KMs
                </label>

                <input
                  value={
                    viewExpense.startKms ??
                    ""
                  }
                  readOnly
                />
              </div>

              <div className="vehicle-expense-form-group">
                <label>
                  End KMs
                </label>

                <input
                  value={
                    viewExpense.endKms ??
                    "—"
                  }
                  readOnly
                />
              </div>

              <div className="vehicle-expense-form-group">
                <label>
                  Total KMs
                </label>

                <input
                  value={
                    viewExpense.totalKms ??
                    "—"
                  }
                  readOnly
                />
              </div>

              <div className="vehicle-expense-form-group">
                <label>
                  Diesel
                </label>

                <input
                  value={
                    viewExpense.diesel
                      ? `₹ ${Number(
                          viewExpense.diesel
                        ).toLocaleString(
                          "en-IN"
                        )}`
                      : "—"
                  }
                  readOnly
                />
              </div>

              <div className="vehicle-expense-form-group">
                <label>
                  Status
                </label>

                <input
                  value={
                    viewExpense.status ||
                    ""
                  }
                  readOnly
                />
              </div>

              {/* CHANGE HISTORY */}
              <div className="vehicle-expense-history">
                <div className="vehicle-expense-history-header">
                  <h3>
                    <History size={19} />
                    Change History
                  </h3>

                  <span>
                    {viewExpense.changeHistory?.length || 0} Updates
                  </span>
                </div>

                {!viewExpense.changeHistory ||
                viewExpense.changeHistory.length === 0 ? (
                  <div className="vehicle-expense-no-history">
                    No changes have been recorded yet.
                  </div>
                ) : (
                  [...viewExpense.changeHistory]
                    .sort(
                      (a, b) =>
                        new Date(b.changedAt) - new Date(a.changedAt)
                    )
                    .map((history, index) => (
                      <div
                        className="vehicle-expense-history-item"
                        key={history._id || index}
                      >
                        <div className="vehicle-expense-history-top">
                          <strong>
                            {index === 0
                              ? "Latest Update"
                              : `Previous Update ${index}`}
                          </strong>

                          <span>
                            {history.changedAt
                              ? new Date(history.changedAt).toLocaleString("en-IN")
                              : "—"}
                          </span>
                        </div>
<div className="vehicle-expense-history-user">
  Changed By:{" "}
  <strong>
    {getChangedByName(history.changedBy)}
    {history.changedBy?.role && ` (${history.changedBy.role})`}
  </strong>
</div>

                        <div className="vehicle-expense-history-changes">
                          {history.changes?.map((change, changeIndex) => (
                            <div
                              className="vehicle-expense-history-change"
                              key={changeIndex}
                            >
                              <strong>{formatFieldName(change.field)}</strong>

                              <div className="vehicle-expense-history-values">
                                <span className="old-value">
                                  {formatHistoryValue(change.oldValue, change.field)}
                                </span>
                                <span aria-hidden="true">→</span>
                                <span className="new-value">
                                  {formatHistoryValue(change.newValue, change.field)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {history.reason && (
                          <div className="vehicle-expense-history-reason">
                            <strong>Reason:</strong> {history.reason}
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>

              <div className="vehicle-expense-modal-actions">

                <button
                  type="button"
                  className="vehicle-expense-cancel-btn"
                  onClick={() =>
                    setViewExpense(null)
                  }
                >
                  Close
                </button>

              </div>

            </div>

          </div>

        </div>

      )}

      {/* ==========================================
          TOAST
      ========================================== */}

      {toast.show && (

        <div
          className={`vehicle-expense-toast ${toast.type}`}
        >
          {toast.message}
        </div>

      )}

    </div>
  );
}

export default VehicleExpense;
