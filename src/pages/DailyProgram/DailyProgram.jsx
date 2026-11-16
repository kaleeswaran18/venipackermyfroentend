
import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  MapPin,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock3,
  CircleAlert,
  X,
} from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import api from "../../api/axios";

import "./DailyProgram.css";

function DailyProgram() {
  const [programs, setPrograms] = useState([]);
  const [previousPrograms, setPreviousPrograms] = useState([]);
  const [upcomingPrograms, setUpcomingPrograms] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState("27-10-2026");
  const [activeTab, setActiveTab] = useState("today");
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editProgram, setEditProgram] = useState(null);

  /* =========================================
     DELETE CONFIRMATION STATE
  ========================================= */

  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: null,
    name: "",
  });

  /* =========================================
     TOAST STATE
  ========================================= */

  const [toast, setToast] = useState({
    show: false,
    type: "",
    title: "",
    message: "",
  });

  const [formData, setFormData] = useState({
    date: "27-10-2026",
    time: "",
    customer: "",
    person: "",
    location: "",
    purpose: "",
    status: "Not Started",
    remarks: "",
  });

  const formatDateForApi = (value) => {
    if (!value) return "";
    const [day, month, year] = value.split("-");
    return `${year}-${month}-${day}`;
  };

  const formatDateForDisplay = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return `${String(date.getDate()).padStart(2, "0")}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${date.getFullYear()}`;
  };

  const mapProgramFromApi = (item) => ({
    id: item._id,
    programNo: item.programNo,
    date: formatDateForDisplay(item.date),
    time: item.time,
    customer: item.customerName,
    person: item.contactPerson,
    location: item.location,
    purpose: item.purpose,
    status: item.status,
    remarks: item.remarks || "",
  });

  const fetchPrograms = async () => {
    try {
      setLoading(true);

      const response = await api.get("/daily-programs");
      const data = response?.data?.data || [];
      const mapped = data.map(mapProgramFromApi);

      const selectedDateValue = new Date(
        selectedDate.split("-").reverse().join("-")
      );

      const today = mapped.filter(
        (item) => item.date === selectedDate
      );

      const previous = mapped
        .filter(
          (item) =>
            new Date(item.date.split("-").reverse().join("-")) <
            selectedDateValue
        )
        .sort(
          (a, b) =>
            new Date(b.date.split("-").reverse().join("-")) -
            new Date(a.date.split("-").reverse().join("-"))
        );

      const upcoming = mapped
        .filter(
          (item) =>
            new Date(item.date.split("-").reverse().join("-")) >
            selectedDateValue
        )
        .sort(
          (a, b) =>
            new Date(a.date.split("-").reverse().join("-")) -
            new Date(b.date.split("-").reverse().join("-"))
        );

      setPrograms(today);
      setPreviousPrograms(previous);
      setUpcomingPrograms(upcoming);
    } catch (error) {
      showToast(
        "error",
        "Failed",
        error?.response?.data?.message ||
          "Unable to fetch daily programs."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, [selectedDate]);

  /* =========================================
     SEARCH
  ========================================= */

  const filteredPrograms = useMemo(() => {
    const value = search.toLowerCase().trim();

    if (!value) {
      return programs;
    }

    return programs.filter(
      (item) =>
        item.customer.toLowerCase().includes(value) ||
        item.person.toLowerCase().includes(value) ||
        item.location.toLowerCase().includes(value)
    );
  }, [programs, search]);

  /* =========================================
     ADD PROGRAM
  ========================================= */

  const openAddModal = () => {
    setEditProgram(null);

    setFormData({
      date: selectedDate,
      time: "",
      customer: "",
      person: "",
      location: "",
      purpose: "",
      status: "Not Started",
      remarks: "",
    });

    setShowModal(true);
  };

  /* =========================================
     EDIT PROGRAM
  ========================================= */

  const openEditModal = (program) => {
    setEditProgram(program);

    setFormData({
      date: program.date,
      time: program.time,
      customer: program.customer,
      person: program.person,
      location: program.location,
      purpose: program.purpose,
      status: program.status,
      remarks: program.remarks,
    });

    setShowModal(true);
  };

  /* =========================================
     CLOSE MODAL
  ========================================= */

  const closeModal = () => {
    setShowModal(false);
    setEditProgram(null);
  };

  /* =========================================
     FORM CHANGE
  ========================================= */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* =========================================
     SAVE / UPDATE PROGRAM
  ========================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const payload = {
        date: formatDateForApi(formData.date),
        time: formData.time,
        customerName: formData.customer.trim(),
        contactPerson: formData.person.trim(),
        location: formData.location.trim(),
        purpose: formData.purpose.trim(),
        status: formData.status,
        remarks: formData.remarks.trim(),
      };

      if (editProgram) {
        await api.patch(
          `/daily-programs/${editProgram.id}`,
          payload
        );

        showToast(
          "success",
          "Updated Successfully",
          "Daily program has been updated successfully."
        );
      } else {
        await api.post("/daily-programs", payload);

        showToast(
          "success",
          "Created Successfully",
          "Daily program has been created successfully."
        );
      }

      closeModal();
      await fetchPrograms();
    } catch (error) {
      showToast(
        "error",
        "Failed",
        error?.response?.data?.message ||
          "Unable to save daily program."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================
     SHOW TOAST
  ========================================= */

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

  /* =========================================
     CLOSE TOAST
  ========================================= */

  const closeToast = () => {
    setToast({
      show: false,
      type: "",
      title: "",
      message: "",
    });
  };

  /* =========================================
     DELETE - OPEN CONFIRMATION
  ========================================= */

  const handleDelete = (id) => {
    const program = programs.find((item) => item.id === id);

    if (!program) return;

    setDeleteModal({
      show: true,
      id: program.id,
      name: program.customer,
    });
  };

  /* =========================================
     DELETE - CLOSE CONFIRMATION
  ========================================= */

  const closeDeleteModal = () => {
    setDeleteModal({
      show: false,
      id: null,
      name: "",
    });
  };

  /* =========================================
     DELETE - CONFIRM
  ========================================= */

  const confirmDelete = async () => {
    if (!deleteModal.id) return;

    try {
      setLoading(true);

      await api.delete(
        `/daily-programs/${deleteModal.id}`
      );

      closeDeleteModal();

      showToast(
        "success",
        "Deleted Successfully",
        "Daily program has been deleted successfully."
      );

      await fetchPrograms();
    } catch (error) {
      showToast(
        "error",
        "Failed",
        error?.response?.data?.message ||
          "Unable to delete daily program."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================
     CHANGE DATE
  ========================================= */

  const changeDate = (direction) => {
    const current = new Date(
      selectedDate.split("-").reverse().join("-")
    );

    current.setDate(current.getDate() + direction);

    const day = String(current.getDate()).padStart(2, "0");
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const year = current.getFullYear();

    setSelectedDate(`${day}-${month}-${year}`);
    setActiveTab("today");
  };

  /* =========================================
     GO TODAY
  ========================================= */

  const goToday = () => {
    const today = new Date();

    setSelectedDate(
      `${String(today.getDate()).padStart(2, "0")}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}-${today.getFullYear()}`
    );
    setActiveTab("today");
  };

  /* =========================================
     STATUS CLASS
  ========================================= */

  const getStatusClass = (status) => {
    switch (status) {
      case "Completed":
        return "program-status completed";

      case "In Progress":
        return "program-status progress";

      case "Pending":
        return "program-status pending";

      case "Not Started":
        return "program-status not-started";

      case "Cancelled":
        return "program-status cancelled";

      case "Planned":
        return "program-status planned";

      default:
        return "program-status";
    }
  };

  return (
    <div className="daily-program-layout">

      {/* =========================================
          EXISTING SIDEBAR - DO NOT REMOVE
      ========================================= */}

      <Sidebar />

      <div className="daily-program-main">

        {/* =========================================
            EXISTING HEADER - DO NOT REMOVE
        ========================================= */}

        <Header />

        <main className="daily-program-content">

          {/* =========================================
              PAGE HEADER
          ========================================= */}

          <div className="daily-program-header">

            <div className="daily-program-title">

              <div className="daily-program-icon">
                <CalendarDays size={27} />
              </div>

              <div>
                <h1>Daily Program</h1>

                <p>
                  View and manage daily customer visits and meeting programs.
                </p>
              </div>

            </div>

            <button
              className="add-program-btn"
              onClick={openAddModal}
            >
              <Plus size={19} />
              Add Program
            </button>

          </div>

          {/* =========================================
              DATE + TABS
          ========================================= */}

          <div className="program-toolbar">

            <div className="date-navigation">

              <button
                className="date-arrow-btn"
                onClick={() => changeDate(-1)}
              >
                <ChevronLeft size={21} />
              </button>

              <div className="program-date-input">

                <input
                  type="text"
                  value={selectedDate}
                  readOnly
                />

                <CalendarDays size={19} />

              </div>

              <button
                className="date-arrow-btn"
                onClick={() => changeDate(1)}
              >
                <ChevronRight size={21} />
              </button>

              <button
                className="today-btn"
                onClick={goToday}
              >
                Today
              </button>

            </div>

            <div className="program-tabs">

              <button
                className={activeTab === "today" ? "active" : ""}
                onClick={() => setActiveTab("today")}
              >
                Today ({programs.length})
              </button>

              <button
                className={activeTab === "previous" ? "active" : ""}
                onClick={() => setActiveTab("previous")}
              >
                Previous Days
              </button>

              <button
                className={activeTab === "upcoming" ? "active" : ""}
                onClick={() => setActiveTab("upcoming")}
              >
                Upcoming Days
              </button>

            </div>

          </div>

          {/* =========================================
              TODAY
          ========================================= */}

          {activeTab === "today" && (
            <>

              <section className="today-program-card">

                <div className="today-program-header">

                  <h2>Today's Program</h2>

                  <div className="program-search">

                    <Search size={18} />

                    <input
                      type="text"
                      placeholder="Search customer or location..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />

                  </div>

                </div>

                <div className="program-table-wrapper">

                  <table className="program-table">

                    <thead>
                      <tr>
                        <th>S.No</th>
                        <th>Time</th>
                        <th>Customer / Company</th>
                        <th>Location</th>
                        <th>Purpose / Meeting With</th>
                        <th>Status</th>
                        <th>Remarks</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>

                      {loading ? (
                        <tr>
                          <td colSpan="8" className="program-empty">
                            Loading programs...
                          </td>
                        </tr>
                      ) : filteredPrograms.length > 0 ? (

                        filteredPrograms.map((program, index) => (

                          <tr key={program.id}>

                            <td>{index + 1}</td>

                            <td className="program-time">
                              {program.time}
                            </td>

                            <td>

                              <div className="customer-cell">

                                <strong>
                                  {program.customer}
                                </strong>

                                <span>
                                  {program.person}
                                </span>

                              </div>

                            </td>

                            <td>

                              <div className="location-cell">

                                <MapPin size={18} />

                                <span>
                                  {program.location}
                                </span>

                              </div>

                            </td>

                            <td>
                              {program.purpose}
                            </td>

                            <td>

                              <span
                                className={getStatusClass(
                                  program.status
                                )}
                              >

                                {program.status === "Completed" && (
                                  <CheckCircle2 size={15} />
                                )}

                                {program.status === "In Progress" && (
                                  <Clock3 size={15} />
                                )}

                                {program.status === "Pending" && (
                                  <Clock3 size={15} />
                                )}

                                {program.status === "Not Started" && (
                                  <Clock3 size={15} />
                                )}

                                {program.status}

                              </span>

                            </td>

                            <td>
                              {program.remarks}
                            </td>

                            <td>

                              <div className="program-actions">

                                <button
                                  className="edit-program-btn"
                                  onClick={() =>
                                    openEditModal(program)
                                  }
                                  title="Edit"
                                >
                                  <Pencil size={17} />
                                </button>

                                <button
                                  className="delete-program-btn"
                                  onClick={() =>
                                    handleDelete(program.id)
                                  }
                                  title="Delete"
                                >
                                  <Trash2 size={17} />
                                </button>

                              </div>

                            </td>

                          </tr>

                        ))

                      ) : (

                        <tr>

                          <td
                            colSpan="8"
                            className="program-empty"
                          >
                            No programs found.
                          </td>

                        </tr>

                      )}

                    </tbody>

                  </table>

                </div>

                <div className="program-total">
                  Total: {filteredPrograms.length} Programs
                </div>

              </section>

              {/* =========================================
                  PREVIOUS + UPCOMING
              ========================================= */}

              <div className="bottom-program-grid">

                {/* PREVIOUS */}

                <section className="small-program-card previous-card">

                  <div className="small-card-header">

                    <div>
                      <Clock3 size={20} />
                      <h3>Previous Days</h3>
                    </div>

                    <button>
                      View All
                    </button>

                  </div>

                  <div className="small-table-wrapper">

                    <table className="small-program-table">

                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Customer / Company</th>
                          <th>Location</th>
                          <th>Status</th>
                        </tr>
                      </thead>

                      <tbody>

                        {previousPrograms.map(
                          (item, index) => (

                            <tr key={index}>

                              <td>
                                {item.date}
                              </td>

                              <td>
                                {item.customer}
                              </td>

                              <td>
                                {item.location}
                              </td>

                              <td>

                                <span
                                  className={getStatusClass(
                                    item.status
                                  )}
                                >
                                  <CheckCircle2 size={14} />
                                  {item.status}
                                </span>

                              </td>

                            </tr>

                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                </section>

                {/* UPCOMING */}

                <section className="small-program-card upcoming-card">

                  <div className="small-card-header">

                    <div>
                      <CalendarDays size={20} />
                      <h3>Upcoming Days</h3>
                    </div>

                    <button>
                      View All
                    </button>

                  </div>

                  <div className="small-table-wrapper">

                    <table className="small-program-table">

                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Customer / Company</th>
                          <th>Location</th>
                          <th>Status</th>
                        </tr>
                      </thead>

                      <tbody>

                        {upcomingPrograms.map(
                          (item, index) => (

                            <tr key={index}>

                              <td>
                                {item.date}
                              </td>

                              <td>
                                {item.customer}
                              </td>

                              <td>
                                {item.location}
                              </td>

                              <td>

                                <span
                                  className={getStatusClass(
                                    item.status
                                  )}
                                >
                                  <Clock3 size={14} />
                                  {item.status}
                                </span>

                              </td>

                            </tr>

                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                </section>

              </div>

            </>
          )}

          {/* =========================================
              PREVIOUS TAB
          ========================================= */}

          {activeTab === "previous" && (

            <section className="full-tab-card">

              <div className="full-tab-header previous-title">

                <Clock3 size={21} />

                <h2>
                  Previous Days
                </h2>

              </div>

              <div className="program-table-wrapper">

                <table className="program-table">

                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer / Company</th>
                      <th>Location</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>

                    {previousPrograms.map(
                      (item, index) => (

                        <tr key={index}>

                          <td>
                            {item.date}
                          </td>

                          <td>
                            {item.customer}
                          </td>

                          <td>
                            {item.location}
                          </td>

                          <td>

                            <span
                              className={getStatusClass(
                                item.status
                              )}
                            >
                              {item.status}
                            </span>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            </section>

          )}

          {/* =========================================
              UPCOMING TAB
          ========================================= */}

          {activeTab === "upcoming" && (

            <section className="full-tab-card">

              <div className="full-tab-header upcoming-title">

                <CalendarDays size={21} />

                <h2>
                  Upcoming Days
                </h2>

              </div>

              <div className="program-table-wrapper">

                <table className="program-table">

                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer / Company</th>
                      <th>Location</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>

                    {upcomingPrograms.map(
                      (item, index) => (

                        <tr key={index}>

                          <td>
                            {item.date}
                          </td>

                          <td>
                            {item.customer}
                          </td>

                          <td>
                            {item.location}
                          </td>

                          <td>

                            <span
                              className={getStatusClass(
                                item.status
                              )}
                            >
                              {item.status}
                            </span>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            </section>

          )}

        </main>

      </div>

      {/* =========================================
          ADD / EDIT PROGRAM MODAL
      ========================================= */}

      {showModal && (

        <div
          className="program-modal-overlay"
          onClick={closeModal}
        >

          <div
            className="program-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="program-modal-header">

              <div>

                <h2>
                  {editProgram
                    ? "Edit Program"
                    : "Add Program"}
                </h2>

                <p>
                  {editProgram
                    ? "Update daily customer visit program."
                    : "Create a new customer visit program."}
                </p>

              </div>

              <button
                className="modal-close-btn"
                onClick={closeModal}
              >
                <X size={21} />
              </button>

            </div>

            <form
              className="program-form"
              onSubmit={handleSubmit}
            >

              <div className="program-form-grid">

                {/* DATE */}

                <div className="program-form-group">

                  <label>
                    Date <span>*</span>
                  </label>

                  <input
                    type="date"
                    name="date"
                    value={
                      formData.date
                        ? formData.date
                            .split("-")
                            .reverse()
                            .join("-")
                        : ""
                    }
                    onChange={(e) => {

                      const date = e.target.value
                        .split("-")
                        .reverse()
                        .join("-");

                      setFormData((prev) => ({
                        ...prev,
                        date,
                      }));

                    }}
                    required
                  />

                </div>

                {/* TIME */}

                <div className="program-form-group">

                  <label>
                    Time <span>*</span>
                  </label>

                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    required
                  />

                </div>

                {/* CUSTOMER */}

                <div className="program-form-group">

                  <label>
                    Customer / Company <span>*</span>
                  </label>

                  <input
                    type="text"
                    name="customer"
                    value={formData.customer}
                    onChange={handleChange}
                    placeholder="Enter customer/company"
                    required
                  />

                </div>

                {/* MEETING WITH */}

                <div className="program-form-group">

                  <label>
                    Meeting With
                  </label>

                  <input
                    type="text"
                    name="person"
                    value={formData.person}
                    onChange={handleChange}
                    placeholder="Enter person name"
                  />

                </div>

                {/* LOCATION */}

                <div className="program-form-group">

                  <label>
                    Location <span>*</span>
                  </label>

                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Enter location"
                    required
                  />

                </div>

                {/* PURPOSE */}

                <div className="program-form-group">

                  <label>
                    Purpose
                  </label>

                  <input
                    type="text"
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleChange}
                    placeholder="Enter purpose"
                  />

                </div>

                {/* STATUS */}

                <div className="program-form-group">

                  <label>
                    Status
                  </label>

                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >

                    <option value="Not Started">
                      Not Started
                    </option>

                    <option value="Pending">
                      Pending
                    </option>

                    <option value="In Progress">
                      In Progress
                    </option>

                    <option value="Completed">
                      Completed
                    </option>

                    <option value="Cancelled">
                      Cancelled
                    </option>

                  </select>

                </div>

                {/* REMARKS */}

                <div className="program-form-group">

                  <label>
                    Remarks
                  </label>

                  <input
                    type="text"
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleChange}
                    placeholder="Enter remarks"
                  />

                </div>

              </div>

              <div className="program-modal-actions">

                <button
                  type="button"
                  className="program-cancel-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="program-save-btn"
                  disabled={loading}
                >
                  {loading
                    ? "Saving..."
                    : editProgram
                    ? "Update Program"
                    : "Save Program"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* =========================================
          DELETE CONFIRMATION POPUP
      ========================================= */}

      {deleteModal.show && (

        <div
          className="delete-modal-overlay"
          onClick={closeDeleteModal}
        >

          <div
            className="delete-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="delete-modal-icon">
              <CircleAlert size={25} />
            </div>

            <h3>
              Delete Program?
            </h3>

            <p>
              Are you sure you want to delete this program?
            </p>

            {deleteModal.name && (
              <div className="delete-program-name">
                {deleteModal.name}
              </div>
            )}

            <div className="delete-modal-actions">

              <button
                type="button"
                className="delete-cancel-btn"
                onClick={closeDeleteModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="delete-confirm-btn"
                onClick={confirmDelete}
              >
                Delete
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =========================================
          DELETE SUCCESS TOAST
      ========================================= */}

      {toast.show && (

        <div
          className={`daily-program-toast ${
            toast.type === "success"
              ? "daily-program-toast-success"
              : "daily-program-toast-error"
          }`}
        >

          <div className="daily-program-toast-icon">

            {toast.type === "success" ? (
              <CheckCircle2 size={20} />
            ) : (
              <CircleAlert size={20} />
            )}

          </div>

          <div className="daily-program-toast-content">

            <strong>
              {toast.title}
            </strong>

            <span>
              {toast.message}
            </span>

          </div>

          <button
            type="button"
            className="daily-program-toast-close"
            onClick={closeToast}
          >
            <X size={17} />
          </button>

        </div>

      )}

    </div>
  );
}

export default DailyProgram;
