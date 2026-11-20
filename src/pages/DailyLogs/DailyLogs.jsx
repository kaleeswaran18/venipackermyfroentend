
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Briefcase,
  Users,
} from "lucide-react";

import api from "../../api/axios";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";

import "./DailyLogs.css";

function DailyLogs() {
  const today = new Date().toISOString().slice(0, 10);

  const [activeTab, setActiveTab] = useState("work");

  const [logs, setLogs] = useState([]);
  const [locations, setLocations] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Visitor Filters
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedLocation, setSelectedLocation] = useState("");

  // Work Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPerson, setSelectedPerson] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    date: today,
    location: "",
    personName: "",
    assignedWork: "",
    remarks: "",
    visitorName: "",
    purpose: "",
    visitDetails: "",
    arrivalTime: "",
  });

  const [toast, setToast] = useState({
    show: false,
    type: "",
    title: "",
    message: "",
  });

  // =====================================
  // TOAST
  // =====================================

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

  const closeToast = () => {
    setToast({
      show: false,
      type: "",
      title: "",
      message: "",
    });
  };

  // =====================================
  // GET LOCATIONS
  // =====================================

  const getLocations = async () => {
    try {
      const response = await api.get("/locations");

      setLocations(response.data.data || []);
    } catch (error) {
      console.error("Get locations error:", error);

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to fetch locations."
      );
    }
  };

  // =====================================
  // GET DAILY LOGS
  // =====================================

  const getDailyLogs = async () => {
    try {
      setLoading(true);

      const params = {
        type: activeTab,
      };

      // Visitor Log API Filters
      if (activeTab === "visitor") {
        if (selectedDate) {
          params.date = selectedDate;
        }

        if (selectedLocation) {
          params.location = selectedLocation;
        }
      }

      // Work Log:
      // Fetch all work records.
      // Date range and person filtering happens in frontend.

      const response = await api.get("/daily-logs", {
        params,
      });

      setLogs(response.data.data || []);
    } catch (error) {
      console.error("Get daily logs error:", error);

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to fetch daily logs."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================
  // INITIAL API
  // =====================================

  useEffect(() => {
    getLocations();
  }, []);

  useEffect(() => {
    getDailyLogs();
  }, [activeTab, selectedDate, selectedLocation]);

  // =====================================
  // UNIQUE PERSON NAMES
  // =====================================

  const personOptions = useMemo(() => {
    const names = logs
      .filter((log) => log.type === "work" && log.personName)
      .map((log) => log.personName.trim())
      .filter(Boolean);

    return [...new Set(names)].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [logs]);

  // =====================================
  // FILTER DAILY LOGS
  // =====================================

  const filteredLogs = useMemo(() => {
    if (activeTab === "visitor") {
      return logs;
    }

    return logs.filter((log) => {
      const logDate = new Date(log.date)
        .toISOString()
        .slice(0, 10);

      const matchesStartDate =
        !startDate || logDate >= startDate;

      const matchesEndDate =
        !endDate || logDate <= endDate;

      const matchesPerson =
        !selectedPerson ||
        log.personName?.trim() === selectedPerson;

      return (
        matchesStartDate &&
        matchesEndDate &&
        matchesPerson
      );
    });
  }, [
    logs,
    activeTab,
    startDate,
    endDate,
    selectedPerson,
  ]);

  // =====================================
  // CLEAR WORK FILTERS
  // =====================================

  const clearWorkFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedPerson("");
  };

  // =====================================
  // RESET FORM
  // =====================================

  const resetForm = () => {
    setFormData({
      date: today,
      location: selectedLocation || "",
      personName: "",
      assignedWork: "",
      remarks: "",
      visitorName: "",
      purpose: "",
      visitDetails: "",
      arrivalTime: "",
    });

    setEditId(null);
  };

  // =====================================
  // OPEN ADD FORM
  // =====================================

  const handleAdd = () => {
    resetForm();
    setShowForm(true);
  };

  // =====================================
  // OPEN EDIT FORM
  // =====================================

  const handleEdit = (log) => {
    setEditId(log._id);

    setFormData({
      date: log.date
        ? new Date(log.date).toISOString().slice(0, 10)
        : today,

      location: log.location?._id || log.location || "",

      personName: log.personName || "",
      assignedWork: log.assignedWork || "",
      remarks: log.remarks || "",

      visitorName: log.visitorName || "",
      purpose: log.purpose || "",
      visitDetails: log.visitDetails || "",
      arrivalTime: log.arrivalTime || "",
    });

    setShowForm(true);
  };

  // =====================================
  // FORM INPUT CHANGE
  // =====================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // =====================================
  // SAVE DAILY LOG
  // =====================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.location) {
      showToast(
        "error",
        "Required",
        "Please select a location."
      );
      return;
    }

    if (activeTab === "work") {
      if (
        !formData.personName.trim() ||
        !formData.assignedWork.trim()
      ) {
        showToast(
          "error",
          "Required",
          "Please enter person name and assigned work."
        );
        return;
      }
    }

    if (activeTab === "visitor") {
      if (
        !formData.visitorName.trim() ||
        !formData.purpose.trim() ||
        !formData.arrivalTime
      ) {
        showToast(
          "error",
          "Required",
          "Please fill all required visitor details."
        );
        return;
      }
    }

    const payload =
      activeTab === "work"
        ? {
            type: "work",
            date: formData.date,
            location: formData.location,
            personName: formData.personName.trim(),
            assignedWork: formData.assignedWork.trim(),
            remarks: formData.remarks.trim(),
          }
        : {
            type: "visitor",
            date: formData.date,
            location: formData.location,
            visitorName: formData.visitorName.trim(),
            purpose: formData.purpose.trim(),
            visitDetails: formData.visitDetails.trim(),
            arrivalTime: formData.arrivalTime,
          };

    try {
      setSaving(true);

      if (editId) {
        await api.patch(
          `/daily-logs/${editId}`,
          payload
        );

        showToast(
          "success",
          "Updated",
          "Daily log updated successfully."
        );
      } else {
        await api.post("/daily-logs", payload);

        showToast(
          "success",
          "Created",
          "Daily log created successfully."
        );
      }

      setShowForm(false);
      resetForm();

      await getDailyLogs();
    } catch (error) {
      console.error("Save daily log error:", error);

      showToast(
        "error",
        "Save Failed",
        error.response?.data?.message ||
          "Failed to save daily log."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================
  // DELETE DAILY LOG
  // =====================================

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this daily log?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/daily-logs/${id}`);

      showToast(
        "success",
        "Deleted",
        "Daily log deleted successfully."
      );

      await getDailyLogs();
    } catch (error) {
      console.error("Delete daily log error:", error);

      showToast(
        "error",
        "Delete Failed",
        error.response?.data?.message ||
          "Failed to delete daily log."
      );
    }
  };

  // =====================================
  // CLOSE FORM
  // =====================================

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  // =====================================
  // DATE FORMAT
  // =====================================

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  // =====================================
  // RENDER
  // =====================================

  return (
    <div className="daily-logs-layout">

      {/* TOAST */}

      {toast.show && (
        <div
          className={`location-toast location-toast-${toast.type}`}
        >
          <div className="location-toast-icon">
            {toast.type === "success" ? (
              <CheckCircle size={21} />
            ) : (
              <AlertCircle size={21} />
            )}
          </div>

          <div className="location-toast-content">
            <strong>{toast.title}</strong>
            <span>{toast.message}</span>
          </div>

          <button
            type="button"
            className="location-toast-close"
            onClick={closeToast}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* ADD / EDIT MODAL */}

      {showForm && (
        <div className="daily-logs-modal-overlay">
          <div className="daily-logs-modal">

            <div className="daily-logs-modal-header">
              <div>
                <h2>
                  {editId ? "Edit" : "Add"}{" "}
                  {activeTab === "work"
                    ? "Work Log"
                    : "Visitor Log"}
                </h2>

                <p>Enter daily log details</p>
              </div>

              <button
                type="button"
                onClick={closeForm}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>

              <div className="daily-logs-form-grid">

                {/* DATE */}

                <div className="daily-logs-form-group">
                  <label>Date *</label>

                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* LOCATION */}

                <div className="daily-logs-form-group">
                  <label>Location *</label>

                  <select
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    required
                  >
                    <option value="">
                      Select Location
                    </option>

                    {locations.map((location) => (
                      <option
                        key={location._id}
                        value={location._id}
                      >
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* WORK LOG FORM */}

                {activeTab === "work" ? (
                  <>
                    <div className="daily-logs-form-group">
                      <label>Person Name *</label>

                      <input
                        type="text"
                        name="personName"
                        value={formData.personName}
                        onChange={handleChange}
                        placeholder="Enter person name"
                        required
                      />
                    </div>

                    <div className="daily-logs-form-group">
                      <label>Assigned Work *</label>

                      <input
                        type="text"
                        name="assignedWork"
                        value={formData.assignedWork}
                        onChange={handleChange}
                        placeholder="Enter assigned work"
                        required
                      />
                    </div>

                    <div className="daily-logs-form-group full-width">
                      <label>Remarks</label>

                      <textarea
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleChange}
                        placeholder="Example: Kumar + 2 persons"
                        rows="3"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* VISITOR LOG FORM */}

                    <div className="daily-logs-form-group">
                      <label>Visitor Name *</label>

                      <input
                        type="text"
                        name="visitorName"
                        value={formData.visitorName}
                        onChange={handleChange}
                        placeholder="Enter visitor name"
                        required
                      />
                    </div>

                    <div className="daily-logs-form-group">
                      <label>Purpose *</label>

                      <input
                        type="text"
                        name="purpose"
                        value={formData.purpose}
                        onChange={handleChange}
                        placeholder="Enter visit purpose"
                        required
                      />
                    </div>

                    <div className="daily-logs-form-group">
                      <label>Arrival Time *</label>

                      <input
                        type="time"
                        name="arrivalTime"
                        value={formData.arrivalTime}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="daily-logs-form-group">
                      <label>Visit Details</label>

                      <textarea
                        name="visitDetails"
                        value={formData.visitDetails}
                        onChange={handleChange}
                        placeholder="Enter visit details"
                        rows="3"
                      />
                    </div>
                  </>
                )}

              </div>

              {/* FORM ACTIONS */}

              <div className="daily-logs-form-actions">

                <button
                  type="button"
                  onClick={closeForm}
                  className="daily-logs-cancel-btn"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="daily-logs-save-btn"
                >
                  {saving
                    ? "Saving..."
                    : editId
                      ? "Update"
                      : "Save"}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

      {/* SIDEBAR */}

      <Sidebar />

      <div className="daily-logs-main">

        <Header />

        <main className="daily-logs-content">

          {/* PAGE HEADER */}

          <div className="daily-logs-page-header">
            <div>
              <h1>Daily Logs</h1>
              <p>
                Manage daily work and visitor records
              </p>
            </div>

            <button
              type="button"
              className="daily-logs-add-btn"
              onClick={handleAdd}
            >
              <Plus size={18} />

              Add{" "}
              {activeTab === "work"
                ? "Work Log"
                : "Visitor Log"}
            </button>
          </div>

          {/* TABS */}

          <div className="daily-logs-tabs">

            <button
              type="button"
              className={
                activeTab === "work" ? "active" : ""
              }
              onClick={() => setActiveTab("work")}
            >
              <Briefcase size={18} />
              Work Log
            </button>

            <button
              type="button"
              className={
                activeTab === "visitor" ? "active" : ""
              }
              onClick={() => setActiveTab("visitor")}
            >
              <Users size={18} />
              Visitor Log
            </button>

          </div>

          {/* FILTERS */}

          <section className="daily-logs-filter-card">

            {activeTab === "work" ? (
              <>
                {/* START DATE */}

                <div className="daily-logs-form-group">
                  <label>Starting Date</label>

                  <input
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(event) =>
                      setStartDate(event.target.value)
                    }
                  />
                </div>

                {/* END DATE */}

                <div className="daily-logs-form-group">
                  <label>Ending Date</label>

                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(event) =>
                      setEndDate(event.target.value)
                    }
                  />
                </div>

                {/* PERSON NAME */}

                <div className="daily-logs-form-group">
                  <label>Person Name</label>

                  <select
                    value={selectedPerson}
                    onChange={(event) =>
                      setSelectedPerson(event.target.value)
                    }
                  >
                    <option value="">
                      All Persons
                    </option>

                    {personOptions.map((name) => (
                      <option
                        key={name}
                        value={name}
                      >
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* CLEAR FILTERS */}

                <button
                  type="button"
                  className="daily-logs-cancel-btn"
                  onClick={clearWorkFilters}
                >
                  Clear Filters
                </button>
              </>
            ) : (
              <>
                {/* VISITOR DATE FILTER */}

                <div className="daily-logs-form-group">
                  <label>Date</label>

                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(event) =>
                      setSelectedDate(event.target.value)
                    }
                  />
                </div>

                {/* VISITOR LOCATION FILTER */}

                <div className="daily-logs-form-group">
                  <label>Location</label>

                  <select
                    value={selectedLocation}
                    onChange={(event) =>
                      setSelectedLocation(event.target.value)
                    }
                  >
                    <option value="">
                      All Locations
                    </option>

                    {locations.map((location) => (
                      <option
                        key={location._id}
                        value={location._id}
                      >
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

          </section>

          {/* TABLE */}

          <section className="daily-logs-table-card">

            <div className="daily-logs-table-header">

              <div>
                <h2>
                  {activeTab === "work"
                    ? "Work Details"
                    : "Visitor Details"}
                </h2>

                <p>
                  {activeTab === "work"
                    ? `${startDate || "All Dates"} - ${
                        endDate || "All Dates"
                      }`
                    : selectedDate
                      ? formatDate(selectedDate)
                      : "All Dates"}
                </p>
              </div>

              <span className="daily-logs-count">
                {filteredLogs.length} Records
              </span>

            </div>

            <div className="daily-logs-table-wrapper">

              <table className="daily-logs-table">

                {/* TABLE HEADER */}

                <thead>
                  {activeTab === "work" ? (
                    <tr>
                      <th>S.No</th>
                      <th>Date</th>
                      <th>Person Name</th>
                      <th>Location</th>
                      <th>Assigned Work</th>
                      <th>Remarks</th>
                      <th>Action</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>S.No</th>
                      <th>Date</th>
                      <th>Visitor Name</th>
                      <th>Location</th>
                      <th>Purpose</th>
                      <th>Visit Details</th>
                      <th>Arrival Time</th>
                      <th>Action</th>
                    </tr>
                  )}
                </thead>

                {/* TABLE BODY */}

                <tbody>

                  {loading ? (
                    <tr>
                      <td
                        colSpan={
                          activeTab === "work" ? 7 : 8
                        }
                        className="daily-logs-empty"
                      >
                        Loading records...
                      </td>
                    </tr>
                  ) : filteredLogs.length > 0 ? (
                    filteredLogs.map((log, index) => (
                      <tr key={log._id}>

                        <td>{index + 1}</td>

                        <td>
                          {formatDate(log.date)}
                        </td>

                        {activeTab === "work" ? (
                          <>
                            <td>{log.personName}</td>

                            <td>
                              {log.location?.name || "-"}
                            </td>

                            <td>{log.assignedWork}</td>

                            <td>{log.remarks || "-"}</td>
                          </>
                        ) : (
                          <>
                            <td>{log.visitorName}</td>

                            <td>
                              {log.location?.name || "-"}
                            </td>

                            <td>{log.purpose}</td>

                            <td>
                              {log.visitDetails || "-"}
                            </td>

                            <td>{log.arrivalTime}</td>
                          </>
                        )}

                        {/* ACTIONS */}

                        <td>
                          <div className="daily-logs-actions">

                            <button
                              type="button"
                              className="daily-logs-edit-btn"
                              onClick={() => handleEdit(log)}
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              className="daily-logs-delete-btn"
                              onClick={() =>
                                handleDelete(log._id)
                              }
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>

                          </div>
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={
                          activeTab === "work" ? 7 : 8
                        }
                        className="daily-logs-empty"
                      >
                        No{" "}
                        {activeTab === "work"
                          ? "work"
                          : "visitor"}{" "}
                        logs found.
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>

            </div>
          </section>

        </main>
      </div>
    </div>
  );
}

export default DailyLogs;
