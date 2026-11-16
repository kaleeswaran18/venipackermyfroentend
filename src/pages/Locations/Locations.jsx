import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import api from "../../api/axios";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";

import "./Locations.css";

function Locations() {
  // ==========================================
  // FORM
  // ==========================================

  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
  });

  const [editingId, setEditingId] = useState(null);

  // ==========================================
  // LOCATIONS
  // ==========================================

  const [locations, setLocations] = useState([]);

  const [loading, setLoading] = useState(false);

  // ==========================================
  // TOAST
  // ==========================================

  const [toast, setToast] = useState({
    show: false,
    type: "",
    title: "",
    message: "",
  });

  // ==========================================
  // DELETE MODAL
  // ==========================================

  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: null,
    name: "",
  });

  // ==========================================
  // SHOW TOAST
  // ==========================================

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

  // ==========================================
  // CLOSE TOAST
  // ==========================================

  const closeToast = () => {
    setToast({
      show: false,
      type: "",
      title: "",
      message: "",
    });
  };

  // ==========================================
  // GET ALL LOCATIONS
  // ==========================================

  const getLocations = async () => {
    try {
      setLoading(true);

      const response = await api.get("/locations");

      setLocations(response.data.data || []);
    } catch (error) {
      console.error("Get locations error:", error);

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to fetch locations"
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LOAD LOCATIONS
  // ==========================================

  useEffect(() => {
    getLocations();
  }, []);

  // ==========================================
  // INPUT CHANGE
  // ==========================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // ==========================================
  // CREATE / UPDATE
  // ==========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = formData.name.trim();

    // ========================================
    // EMPTY VALIDATION
    // ========================================

    if (!name) {
      showToast(
        "error",
        "Location Name Required",
        "Please enter a location name."
      );

      return;
    }

    try {
      // ======================================
      // UPDATE
      // ======================================

      if (editingId) {
        await api.patch(`/locations/${editingId}`, {
          name,
        });

        showToast(
          "success",
          "Location Updated",
          "Location updated successfully."
        );
      }

      // ======================================
      // CREATE
      // ======================================

      else {
        await api.post("/locations", {
          name,
        });

        showToast(
          "success",
          "Location Created",
          "Location added successfully."
        );
      }

      // Refresh table
      await getLocations();

      // Reset form
      setFormData({
        name: "",
      });

      setEditingId(null);

      setShowForm(false);
    } catch (error) {
      console.error("Save location error:", error);

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to save location."
      );
    }
  };

  // ==========================================
  // ADD LOCATION
  // ==========================================

  const handleAddLocation = () => {
    setFormData({
      name: "",
    });

    setEditingId(null);

    setShowForm(true);
  };

  // ==========================================
  // EDIT LOCATION
  // ==========================================

  const handleEdit = (location) => {
    setFormData({
      name: location.name || "",
    });

    setEditingId(location._id);

    setShowForm(true);
  };

  // ==========================================
  // DELETE - OPEN MODAL
  // ==========================================

  const handleDelete = (location) => {
    setDeleteModal({
      show: true,
      id: location._id,
      name: location.name,
    });
  };

  // ==========================================
  // CONFIRM DELETE
  // ==========================================

  const confirmDelete = async () => {
    try {
      await api.delete(`/locations/${deleteModal.id}`);

      setDeleteModal({
        show: false,
        id: null,
        name: "",
      });

      showToast(
        "success",
        "Location Deleted",
        "Location deleted successfully."
      );

      await getLocations();
    } catch (error) {
      console.error("Delete location error:", error);

      setDeleteModal({
        show: false,
        id: null,
        name: "",
      });

      showToast(
        "error",
        "Delete Failed",
        error.response?.data?.message ||
          "Failed to delete location."
      );
    }
  };

  // ==========================================
  // CLOSE DELETE MODAL
  // ==========================================

  const closeDeleteModal = () => {
    setDeleteModal({
      show: false,
      id: null,
      name: "",
    });
  };

  // ==========================================
  // CLOSE FORM
  // ==========================================

  const handleCloseForm = () => {
    setShowForm(false);

    setEditingId(null);

    setFormData({
      name: "",
    });
  };

  return (
    <div className="locations-layout">

      {/* ======================================
          TOAST
      ======================================= */}

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
            aria-label="Close notification"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* ======================================
          DELETE CONFIRMATION MODAL
      ======================================= */}

      {deleteModal.show && (
        <div
          className="delete-modal-overlay"
          onClick={closeDeleteModal}
        >
          <div
            className="delete-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="delete-modal-icon">
              <Trash2 size={25} />
            </div>

            <div className="delete-modal-content">
              <h3>Delete Location?</h3>

              <p>
                Are you sure you want to delete{" "}
                <strong>{deleteModal.name}</strong>?
              </p>

              <span>
                This action cannot be undone.
              </span>
            </div>

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
                <Trash2 size={16} />
                Delete
              </button>

            </div>
          </div>
        </div>
      )}

      {/* ======================================
          SIDEBAR
      ======================================= */}

      <Sidebar />

      <div className="locations-main">

        {/* ====================================
            HEADER
        ===================================== */}

        <Header />

        <main className="locations-content">

          {/* ===================================
              PAGE HEADER
          ==================================== */}

          <div className="locations-page-header">

            <div>
              <h1>Locations</h1>

              <p>
                Manage all inventory locations.
              </p>
            </div>

            <button
              type="button"
              className="add-location-btn"
              onClick={handleAddLocation}
            >
              <Plus size={18} />

              Add Location
            </button>

          </div>

          {/* ===================================
              ADD / EDIT FORM
          ==================================== */}

          {showForm && (
            <section className="location-form-card">

              <div className="form-header">

                <div>
                  <h2>
                    {editingId
                      ? "Edit Location"
                      : "Add Location"}
                  </h2>

                  <p>
                    {editingId
                      ? "Update inventory location."
                      : "Create a new inventory location."}
                  </p>
                </div>

                <button
                  type="button"
                  className="close-form-btn"
                  onClick={handleCloseForm}
                  aria-label="Close form"
                >
                  <X size={20} />
                </button>

              </div>

              <form onSubmit={handleSubmit}>

                <div className="form-grid">

                  <div className="form-group">

                    <label htmlFor="location-name">
                      Location Name{" "}
                      <span>*</span>
                    </label>

                    <input
                      id="location-name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter location name"
                    />

                  </div>

                </div>

                <div className="form-actions">

                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={handleCloseForm}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="save-location-btn"
                  >
                    {editingId
                      ? "Update Location"
                      : "Save Location"}
                  </button>

                </div>

              </form>

            </section>
          )}

          {/* ===================================
              ALL LOCATIONS
          ==================================== */}

          <section className="locations-table-card">

            <div className="table-section-header">

              <div>
                <h2>All Locations</h2>

                <p>
                  {locations.length}{" "}
                  {locations.length === 1
                    ? "location"
                    : "locations"}{" "}
                  available
                </p>
              </div>

            </div>

            <div className="table-wrapper">

              <table className="locations-table">

                <thead>

                  <tr>
                    <th>S.No</th>
                    <th>Location</th>
                    <th>Actions</th>
                  </tr>

                </thead>

                <tbody>

                  {loading ? (

                    <tr>
                      <td
                        colSpan="3"
                        className="empty-state"
                      >
                        Loading locations...
                      </td>
                    </tr>

                  ) : locations.length > 0 ? (

                    locations.map(
                      (location, index) => (
                        <tr
                          key={location._id}
                        >

                          <td>
                            {index + 1}
                          </td>

                          <td className="location-name">
                            {location.name}
                          </td>

                          <td>

                            <div className="action-buttons">

                              <button
                                type="button"
                                className="edit-btn"
                                onClick={() =>
                                  handleEdit(
                                    location
                                  )
                                }
                                aria-label={`Edit ${location.name}`}
                              >
                                <Pencil
                                  size={16}
                                />
                              </button>

                              <button
                                type="button"
                                className="delete-btn"
                                onClick={() =>
                                  handleDelete(
                                    location
                                  )
                                }
                                aria-label={`Delete ${location.name}`}
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
                        colSpan="3"
                        className="empty-state"
                      >
                        No locations found.
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

export default Locations;