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

import "./Consumables.css";

function Consumables() {
  const [showForm, setShowForm] = useState(false);

  const [consumables, setConsumables] = useState([]);

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
  // GET ALL CONSUMABLES
  // =========================

  const getConsumables = async () => {
    try {
      setLoading(true);

      const response = await api.get("/consumables");

      setConsumables(response.data.data || []);
    } catch (error) {
      console.error(
        "Get consumables error:",
        error
      );

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to fetch consumables"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getConsumables();
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

    if (!name) {
      showToast(
        "error",
        "Consumable Name Required",
        "Please enter a consumable name."
      );

      return;
    }

    try {
      if (editingId) {
        await api.patch(
          `/consumables/${editingId}`,
          {
            name,
          }
        );

        showToast(
          "success",
          "Consumable Updated",
          "Consumable updated successfully"
        );
      } else {
        await api.post("/consumables", {
          name,
        });

        showToast(
          "success",
          "Consumable Created",
          "Consumable added successfully"
        );
      }

      await getConsumables();

      setFormData({
        name: "",
      });

      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      console.error(
        "Save consumable error:",
        error
      );

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to save consumable"
      );
    }
  };

  // =========================
  // EDIT
  // =========================

  const handleEdit = (item) => {
    setFormData({
      name: item.name,
    });

    setEditingId(item._id);

    setShowForm(true);
  };

  // =========================
  // DELETE
  // =========================

  const handleDelete = (item) => {
    setDeleteModal({
      show: true,
      id: item._id,
      name: item.name,
    });
  };

  const confirmDelete = async () => {
    try {
      await api.delete(
        `/consumables/${deleteModal.id}`
      );

      setDeleteModal({
        show: false,
        id: null,
        name: "",
      });

      showToast(
        "success",
        "Consumable Deleted",
        "Consumable deleted successfully"
      );

      await getConsumables();
    } catch (error) {
      console.error(
        "Delete consumable error:",
        error
      );

      setDeleteModal({
        show: false,
        id: null,
        name: "",
      });

      showToast(
        "error",
        "Delete Failed",
        error.response?.data?.message ||
          "Failed to delete consumable"
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
  // ADD CONSUMABLE
  // =========================

  const handleAddConsumable = () => {
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
    <div className="consumables-layout">

      {/* =========================
          TOAST
      ========================= */}

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

      {/* =========================
          DELETE MODAL
      ========================= */}

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
              <h3>Delete Consumable?</h3>

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

      <div className="consumables-main">

        <Header />

        <main className="consumables-content">

          {/* =========================
              PAGE HEADER
          ========================= */}

          <div className="consumables-page-header">

            <div>
              <h1>Consumables</h1>

              <p>
                Manage all consumable materials.
              </p>
            </div>

            <button
              type="button"
              className="add-consumable-btn"
              onClick={handleAddConsumable}
            >
              <Plus size={18} />
              Add Consumable
            </button>

          </div>

          {/* =========================
              ADD / EDIT FORM
          ========================= */}

          {showForm && (
            <section className="consumable-form-card">

              <div className="form-header">

                <div>
                  <h2>
                    {editingId
                      ? "Edit Consumable"
                      : "Add Consumable"}
                  </h2>

                  <p>
                    {editingId
                      ? "Update consumable."
                      : "Create a new consumable material."}
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

                    <label htmlFor="consumable-name">
                      Consumable Name{" "}
                      <span>*</span>
                    </label>

                    <input
                      id="consumable-name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter consumable name"
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
                    className="save-consumable-btn"
                  >
                    {editingId
                      ? "Update Consumable"
                      : "Save Consumable"}
                  </button>

                </div>

              </form>

            </section>
          )}

          {/* =========================
              ALL CONSUMABLES
          ========================= */}

          <section className="consumables-table-card">

            <div className="table-section-header">

              <div>
                <h2>All Consumables</h2>

                <p>
                  {consumables.length}{" "}
                  {consumables.length === 1
                    ? "consumable"
                    : "consumables"}{" "}
                  available
                </p>
              </div>

            </div>

            <div className="table-wrapper">

              <table className="consumables-table">

                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Consumable Name</th>
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
                        Loading consumables...
                      </td>
                    </tr>
                  ) : consumables.length > 0 ? (
                    consumables.map(
                      (item, index) => (
                        <tr key={item._id}>

                          <td>
                            {index + 1}
                          </td>

                          <td className="consumable-name">
                            {item.name}
                          </td>

                          <td>

                            <div className="action-buttons">

                              <button
                                type="button"
                                className="edit-btn"
                                onClick={() =>
                                  handleEdit(item)
                                }
                                aria-label={`Edit ${item.name}`}
                              >
                                <Pencil size={16} />
                              </button>

                              <button
                                type="button"
                                className="delete-btn"
                                onClick={() =>
                                  handleDelete(item)
                                }
                                aria-label={`Delete ${item.name}`}
                              >
                                <Trash2 size={16} />
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
                        No consumables found.
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

export default Consumables;