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

import "./Nails.css";

function Nails() {
  const [showForm, setShowForm] = useState(false);

  const [nails, setNails] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
  });

  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(false);

  // =========================
  // TOAST
  // =========================

  const [toast, setToast] = useState({
    show: false,
    type: "",
    title: "",
    message: "",
  });

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

  // =========================
  // DELETE MODAL
  // =========================

  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: null,
    name: "",
  });

  // =========================
  // GET ALL NAILS
  // =========================

  const getNails = async () => {
    try {
      setLoading(true);

      const response = await api.get("/nails");

      setNails(response.data.data || []);
    } catch (error) {
      console.error("Get nails error:", error);

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to fetch nails"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getNails();
  }, []);

  // =========================
  // INPUT CHANGE
  // =========================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // =========================
  // CREATE / UPDATE
  // =========================

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = formData.name.trim();

    // EMPTY VALIDATION
    if (!name) {
      showToast(
        "error",
        "Nail Name Required",
        "Please enter a nail name."
      );

      return;
    }

    try {
      if (editingId) {
        await api.patch(`/nails/${editingId}`, {
          name,
        });

        showToast(
          "success",
          "Nail Updated",
          "Nail updated successfully."
        );
      } else {
        await api.post("/nails", {
          name,
        });

        showToast(
          "success",
          "Nail Created",
          "Nail added successfully."
        );
      }

      await getNails();

      setFormData({
        name: "",
      });

      setEditingId(null);

      setShowForm(false);
    } catch (error) {
      console.error("Save nail error:", error);

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to save nail."
      );
    }
  };

  // =========================
  // EDIT
  // =========================

  const handleEdit = (nail) => {
    setFormData({
      name: nail.name,
    });

    setEditingId(nail._id);

    setShowForm(true);
  };

  // =========================
  // DELETE
  // =========================

  const handleDelete = (nail) => {
    setDeleteModal({
      show: true,
      id: nail._id,
      name: nail.name,
    });
  };

  const confirmDelete = async () => {
    try {
      await api.delete(
        `/nails/${deleteModal.id}`
      );

      setDeleteModal({
        show: false,
        id: null,
        name: "",
      });

      showToast(
        "success",
        "Nail Deleted",
        "Nail deleted successfully."
      );

      await getNails();
    } catch (error) {
      console.error("Delete nail error:", error);

      setDeleteModal({
        show: false,
        id: null,
        name: "",
      });

      showToast(
        "error",
        "Delete Failed",
        error.response?.data?.message ||
          "Failed to delete nail."
      );
    }
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      show: false,
      id: null,
      name: "",
    });
  };

  // =========================
  // ADD NAIL
  // =========================

  const handleAddNail = () => {
    setFormData({
      name: "",
    });

    setEditingId(null);

    setShowForm(true);
  };

  // =========================
  // CLOSE FORM
  // =========================

  const handleCloseForm = () => {
    setShowForm(false);

    setEditingId(null);

    setFormData({
      name: "",
    });
  };

  return (
    <div className="nails-layout">

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
            aria-label="Close notification"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* DELETE MODAL */}

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
              <h3>Delete Nail?</h3>

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

      <Sidebar />

      <div className="nails-main">

        <Header />

        <main className="nails-content">

          {/* PAGE HEADER */}

          <div className="nails-page-header">
            <div>
              <h1>Nails</h1>

              <p>
                Manage all nail products.
              </p>
            </div>

            <button
              type="button"
              className="add-nail-btn"
              onClick={handleAddNail}
            >
              <Plus size={18} />
              Add Nail
            </button>
          </div>

          {/* ADD / EDIT FORM */}

          {showForm && (
            <section className="nail-form-card">

              <div className="form-header">

                <div>
                  <h2>
                    {editingId
                      ? "Edit Nail"
                      : "Add Nail"}
                  </h2>

                  <p>
                    {editingId
                      ? "Update nail."
                      : "Create a new nail product."}
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

                    <label htmlFor="nail-name">
                      Nail Name <span>*</span>
                    </label>

                    <input
                      id="nail-name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter nail name"
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
                    className="save-nail-btn"
                  >
                    {editingId
                      ? "Update Nail"
                      : "Save Nail"}
                  </button>

                </div>

              </form>

            </section>
          )}

          {/* ALL NAILS */}

          <section className="nails-table-card">

            <div className="table-section-header">

              <div>
                <h2>All Nails</h2>

                <p>
                  {nails.length}{" "}
                  {nails.length === 1
                    ? "nail"
                    : "nails"}{" "}
                  available
                </p>
              </div>

            </div>

            <div className="table-wrapper">

              <table className="nails-table">

                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Nail Name</th>
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
                        Loading nails...
                      </td>
                    </tr>
                  ) : nails.length > 0 ? (
                    nails.map((nail, index) => (
                      <tr key={nail._id}>

                        <td>
                          {index + 1}
                        </td>

                        <td className="nail-name">
                          {nail.name}
                        </td>

                        <td>

                          <div className="action-buttons">

                            <button
                              type="button"
                              className="edit-btn"
                              onClick={() =>
                                handleEdit(nail)
                              }
                              aria-label={`Edit ${nail.name}`}
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() =>
                                handleDelete(nail)
                              }
                              aria-label={`Delete ${nail.name}`}
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
                        colSpan="3"
                        className="empty-state"
                      >
                        No nails found.
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

export default Nails;