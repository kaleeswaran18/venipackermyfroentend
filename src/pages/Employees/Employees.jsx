
import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  User,
  Phone,
  MapPin,
  Calendar,
} from "lucide-react";

import api from "../../api/axios";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";

import "./Employees.css";

function Employees() {
  // =========================================================
  // FORM
  // =========================================================

  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    permanentLocationId: "",
    joiningDate: "",
    dailyWage: "",
    isActive: true,
  });

  // =========================================================
  // EMPLOYEES
  // =========================================================

  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // =========================================================
  // LOCATIONS
  // =========================================================

  const [locations, setLocations] = useState([]);

  const [loadingLocations, setLoadingLocations] =
    useState(false);

  // =========================================================
  // TOAST
  // =========================================================

  const [toast, setToast] = useState({
    show: false,
    type: "",
    title: "",
    message: "",
  });

  // =========================================================
  // DELETE MODAL
  // =========================================================

  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: null,
    name: "",
  });

  // =========================================================
  // SHOW TOAST
  // =========================================================

  const showToast = (type, title, message) => {
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

  // =========================================================
  // CLOSE TOAST
  // =========================================================

  const closeToast = () => {
    setToast({
      show: false,
      type: "",
      title: "",
      message: "",
    });
  };

  // =========================================================
  // GET ALL EMPLOYEES
  // =========================================================

  const getEmployees = async () => {
    try {
      setLoading(true);

      const response = await api.get("/employees");

      setEmployees(response.data.data || []);
    } catch (error) {
      console.error(
        "Get employees error:",
        error
      );

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to fetch employees."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // GET LOCATIONS
  // =========================================================

  const getLocations = async () => {
    try {
      setLoadingLocations(true);

      const response = await api.get("/locations");

      setLocations(response.data.data || []);
    } catch (error) {
      console.error(
        "Get locations error:",
        error
      );

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to fetch locations."
      );
    } finally {
      setLoadingLocations(false);
    }
  };

  // =========================================================
  // LOAD DATA
  // =========================================================

  useEffect(() => {
    getEmployees();
    getLocations();
  }, []);

  // =========================================================
  // INPUT CHANGE
  // =========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // =========================================================
  // STATUS CHANGE
  // =========================================================

  const handleStatusChange = () => {
    setFormData((current) => ({
      ...current,
      isActive: !current.isActive,
    }));
  };

  // =========================================================
  // RESET FORM
  // =========================================================

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      permanentLocationId: "",
      joiningDate: "",
      dailyWage: "",
      isActive: true,
    });

    setEditingId(null);
  };

  // =========================================================
  // VALIDATION
  // =========================================================

  const validateForm = () => {
    if (!formData.name.trim()) {
      showToast(
        "error",
        "Name Required",
        "Please enter employee name."
      );

      return false;
    }

    if (!formData.phone.trim()) {
      showToast(
        "error",
        "Phone Number Required",
        "Please enter employee phone number."
      );

      return false;
    }

    if (!/^[0-9]{10}$/.test(formData.phone)) {
      showToast(
        "error",
        "Invalid Phone Number",
        "Please enter a valid 10 digit phone number."
      );

      return false;
    }

    if (!formData.permanentLocationId) {
      showToast(
        "error",
        "Location Required",
        "Please select permanent location."
      );

      return false;
    }

    if (!formData.joiningDate) {
      showToast(
        "error",
        "Joining Date Required",
        "Please select joining date."
      );

      return false;
    }

    if (
      formData.dailyWage === "" ||
      Number(formData.dailyWage) < 0
    ) {
      showToast(
        "error",
        "Daily Wage Required",
        "Please enter a valid daily wage."
      );

      return false;
    }

    return true;
  };

  // =========================================================
  // CREATE / UPDATE EMPLOYEE
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        permanentLocationId:
          formData.permanentLocationId,
        joiningDate: formData.joiningDate,
        dailyWage: Number(formData.dailyWage),
        isActive: formData.isActive,
      };

      // =====================================================
      // UPDATE
      // =====================================================

      if (editingId) {
        await api.patch(
          `/employees/${editingId}`,
          payload
        );

        showToast(
          "success",
          "Employee Updated",
          "Employee updated successfully."
        );
      }

      // =====================================================
      // CREATE
      // =====================================================

      else {
        await api.post(
          "/employees",
          payload
        );

        showToast(
          "success",
          "Employee Created",
          "Employee added successfully."
        );
      }

      // Refresh table
      await getEmployees();

      // Reset
      resetForm();

      setShowForm(false);
    } catch (error) {
      console.error(
        "Save employee error:",
        error
      );

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to save employee."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================
  // ADD EMPLOYEE
  // =========================================================

  const handleAddEmployee = () => {
    resetForm();

    setShowForm(true);
  };

  // =========================================================
  // EDIT EMPLOYEE
  // =========================================================

  const handleEdit = (employee) => {
    setFormData({
      name: employee.name || "",

      phone: employee.phone || "",

      permanentLocationId:
        employee.permanentLocationId?._id ||
        employee.permanentLocationId ||
        "",

      joiningDate: employee.joiningDate
        ? employee.joiningDate.split("T")[0]
        : "",

      dailyWage:
        employee.dailyWage ?? "",

      isActive:
        employee.isActive !== false,
    });

    setEditingId(employee._id);

    setShowForm(true);
  };

  // =========================================================
  // CANCEL
  // =========================================================

  const handleCancel = () => {
    resetForm();

    setShowForm(false);
  };

  // =========================================================
  // DELETE - OPEN MODAL
  // =========================================================

  const handleDelete = (employee) => {
    setDeleteModal({
      show: true,
      id: employee._id,
      name: employee.name,
    });
  };

  // =========================================================
  // CLOSE DELETE MODAL
  // =========================================================

  const closeDeleteModal = () => {
    setDeleteModal({
      show: false,
      id: null,
      name: "",
    });
  };

  // =========================================================
  // CONFIRM DELETE
  // =========================================================

  const confirmDelete = async () => {
    if (!deleteModal.id) {
      return;
    }

    try {
      await api.delete(
        `/employees/${deleteModal.id}`
      );

      closeDeleteModal();

      showToast(
        "success",
        "Employee Deleted",
        "Employee deleted successfully."
      );

      await getEmployees();
    } catch (error) {
      console.error(
        "Delete employee error:",
        error
      );

      closeDeleteModal();

      showToast(
        "error",
        "Delete Failed",
        error.response?.data?.message ||
          "Failed to delete employee."
      );
    }
  };

  // =========================================================
  // LOCATION NAME
  // =========================================================

  const getLocationName = (employee) => {
    if (
      employee.permanentLocationId &&
      typeof employee.permanentLocationId ===
        "object"
    ) {
      return (
        employee.permanentLocationId.name ||
        "-"
      );
    }

    const location = locations.find(
      (item) =>
        item._id ===
        employee.permanentLocationId
    );

    return location?.name || "-";
  };

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  };

  return (
    <div className="employees-layout">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <Sidebar />

      <div className="employees-main">

        {/* ===================================================
            HEADER
        =================================================== */}

        <Header />

        <main className="employees-content">

          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <div className="employees-page-header">

            <div>
              <h1>Employees</h1>

              <p>
                Manage employee details and
                information
              </p>
            </div>

            <button
              type="button"
              className="add-employee-btn"
              onClick={handleAddEmployee}
            >
              <Plus size={18} />

              Add Employee
            </button>

          </div>

          {/* =================================================
              FORM
          ================================================= */}

          {showForm && (
            <section className="employee-form-card">

              <div className="employee-form-header">

                <div>
                  <h2>
                    {editingId
                      ? "Edit Employee"
                      : "Employee Details"}
                  </h2>

                  <p>
                    {editingId
                      ? "Update employee information"
                      : "Enter the employee information below"}
                  </p>
                </div>

                <button
                  type="button"
                  className="close-form-btn"
                  onClick={handleCancel}
                  disabled={submitting}
                >
                  <X size={18} />
                </button>

              </div>

              <form onSubmit={handleSubmit}>

                <div className="employee-form-grid">

                  {/* Employee Name */}

                  <div className="employee-form-group">
                    <label>
                      Employee Name{" "}
                      <span>*</span>
                    </label>

                    <div className="employee-input-wrapper">
                      <User size={19} />

                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter employee name"
                      />
                    </div>
                  </div>

                  {/* Phone */}

                  <div className="employee-form-group">
                    <label>
                      Phone Number{" "}
                      <span>*</span>
                    </label>

                    <div className="employee-input-wrapper">
                      <Phone size={19} />

                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="Enter 10 digit phone number"
                        maxLength={10}
                      />
                    </div>
                  </div>

                  {/* Location */}

                  <div className="employee-form-group">
                    <label>
                      Permanent Location{" "}
                      <span>*</span>
                    </label>

                    <div className="employee-input-wrapper">
                      <MapPin size={19} />

                      <select
                        name="permanentLocationId"
                        value={
                          formData.permanentLocationId
                        }
                        onChange={handleChange}
                        disabled={
                          loadingLocations
                        }
                      >
                        <option value="">
                          {loadingLocations
                            ? "Loading locations..."
                            : "Select Location"}
                        </option>

                        {locations.map(
                          (location) => (
                            <option
                              key={location._id}
                              value={location._id}
                            >
                              {location.name}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Joining Date */}

                  <div className="employee-form-group">
                    <label>
                      Joining Date{" "}
                      <span>*</span>
                    </label>

                    <div className="employee-input-wrapper">
                      <Calendar size={19} />

                      <input
                        type="date"
                        name="joiningDate"
                        value={
                          formData.joiningDate
                        }
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  {/* Daily Wage */}

                  <div className="employee-form-group">
                    <label>
                      Daily Wage{" "}
                      <span>*</span>
                    </label>

                    <div className="employee-input-wrapper">
                      <span className="employee-rupee">
                        ₹
                      </span>

                      <input
                        type="number"
                        name="dailyWage"
                        value={
                          formData.dailyWage
                        }
                        onChange={handleChange}
                        placeholder="Enter daily wage"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Status */}

                  <div className="employee-form-group">

                    <label>
                      Employee Status
                    </label>

                    <div className="employee-status-control">

                      <button
                        type="button"
                        className={`employee-status-toggle ${
                          formData.isActive
                            ? "active"
                            : ""
                        }`}
                        onClick={
                          handleStatusChange
                        }
                      >
                        <span />
                      </button>

                      <span>
                        {formData.isActive
                          ? "Active Employee"
                          : "Inactive Employee"}
                      </span>

                    </div>

                    <p className="employee-status-help">
                      Inactive employees will not
                      be shown in daily operations.
                    </p>

                  </div>

                </div>

                {/* FORM ACTIONS */}

                <div className="employee-form-actions">

                  <button
                    type="button"
                    className="employee-cancel-btn"
                    onClick={handleCancel}
                    disabled={submitting}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="employee-save-btn"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Saving..."
                      : editingId
                      ? "Update Employee"
                      : "Create Employee"}
                  </button>

                </div>

              </form>

            </section>
          )}

          {/* =================================================
              EMPLOYEE TABLE
          ================================================= */}

          <section className="employees-table-card">

            <div className="employees-table-header">

              <div>
                <h2>Employee List</h2>

                <p>
                  {employees.length} employee
                  {employees.length !== 1
                    ? "s"
                    : ""}{" "}
                  found
                </p>
              </div>

            </div>

            <div className="employees-table-wrapper">

              <table className="employees-table">

                <thead>
                  <tr>
                    <th>Employee Code</th>
                    <th>Employee Name</th>
                    <th>Phone</th>
                    <th>Permanent Location</th>
                    <th>Joining Date</th>
                    <th>Daily Wage</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {loading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="employee-empty-state"
                      >
                        Loading employees...
                      </td>
                    </tr>
                  ) : employees.length > 0 ? (
                    employees.map(
                      (employee) => (
                        <tr
                          key={employee._id}
                        >

                          {/* Code */}

                          <td>
                            <span className="employee-code">
                              {
                                employee.employeeCode
                              }
                            </span>
                          </td>

                          {/* Name */}

                          <td>
                            <span className="employee-name">
                              {employee.name}
                            </span>
                          </td>

                          {/* Phone */}

                          <td>
                            {employee.phone}
                          </td>

                          {/* Location */}

                          <td>
                            <span className="employee-location">
                              <MapPin
                                size={14}
                              />

                              {getLocationName(
                                employee
                              )}
                            </span>
                          </td>

                          {/* Joining Date */}

                          <td>
                            {formatDate(
                              employee.joiningDate
                            )}
                          </td>

                          {/* Daily Wage */}

                          <td>
                            <span className="employee-wage">
                              ₹
                              {Number(
                                employee.dailyWage
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </span>
                          </td>

                          {/* Status */}

                          <td>
                            <span
                              className={`employee-status-badge ${
                                employee.isActive
                                  ? "active"
                                  : "inactive"
                              }`}
                            >
                              {employee.isActive
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </td>

                          {/* Actions */}

                          <td>

                            <div className="employee-action-buttons">

                              <button
                                type="button"
                                className="employee-edit-btn"
                                onClick={() =>
                                  handleEdit(
                                    employee
                                  )
                                }
                                title="Edit Employee"
                              >
                                <Pencil
                                  size={16}
                                />
                              </button>

                              <button
                                type="button"
                                className="employee-delete-btn"
                                onClick={() =>
                                  handleDelete(
                                    employee
                                  )
                                }
                                title="Delete Employee"
                              >
                                <Trash2
                                  size={16}
                                />
                              </button>

                            </div>

                          </td>

                        </tr>
                      )
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="employee-empty-state"
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

      {/* =====================================================
          TOAST
      ===================================================== */}

      {toast.show && (
        <div
          className={`employee-toast employee-toast-${toast.type}`}
        >

          <div className="employee-toast-icon">

            {toast.type === "success" ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}

          </div>

          <div className="employee-toast-content">

            <strong>
              {toast.title}
            </strong>

            <span>
              {toast.message}
            </span>

          </div>

          <button
            type="button"
            className="employee-toast-close"
            onClick={closeToast}
          >
            <X size={17} />
          </button>

        </div>
      )}

      {/* =====================================================
          DELETE CONFIRMATION MODAL
      ===================================================== */}

      {deleteModal.show && (
        <div
          className="employee-delete-modal-overlay"
          onClick={closeDeleteModal}
        >

          <div
            className="employee-delete-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="employee-delete-modal-icon">
              <Trash2 size={25} />
            </div>

            <div className="employee-delete-modal-content">

              <h3>
                Delete Employee?
              </h3>

              <p>
                Are you sure you want to delete{" "}
                <strong>
                  {deleteModal.name}
                </strong>
                ?
              </p>

              <span>
                This action cannot be undone.
              </span>

            </div>

            <div className="employee-delete-modal-actions">

              <button
                type="button"
                className="employee-delete-cancel-btn"
                onClick={closeDeleteModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="employee-delete-confirm-btn"
                onClick={confirmDelete}
              >
                <Trash2 size={16} />
                Delete
              </button>

            </div>

          </div>

        </div>
      )}
    </div>
  );
}

export default Employees;
