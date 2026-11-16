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

import "./FinishedMaterials.css";

function FinishedMaterialsCategory() {
  const [showForm, setShowForm] = useState(false);

  const [finishedMaterials, setFinishedMaterials] = useState([]);

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
  // GET ALL FINISHED MATERIALS
  // Backend: GET /finished-materials
  // =========================

  const getFinishedMaterials = async () => {
    try {
      setLoading(true);

      const response = await api.get("/finished-materials");

      setFinishedMaterials(response.data.data || []);
    } catch (error) {
      console.error(
        "Get finished materials error:",
        error
      );

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to fetch finished materials"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getFinishedMaterials();
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
        "Finished Material Name Required",
        "Please enter a finished material name."
      );

      return;
    }

    try {
      // UPDATE
      if (editingId) {
        await api.patch(
          `/finished-materials/${editingId}`,
          {
            name,
          }
        );

        showToast(
          "success",
          "Material Updated",
          "Finished material updated successfully"
        );
      }

      // CREATE
      else {
        await api.post(
          "/finished-materials",
          {
            name,
          }
        );

        showToast(
          "success",
          "Material Created",
          "Finished material added successfully"
        );
      }

      await getFinishedMaterials();

      setFormData({
        name: "",
      });

      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      console.error(
        "Save finished material error:",
        error
      );

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to save finished material"
      );
    }
  };

  // =========================
  // EDIT
  // =========================

  const handleEdit = (material) => {
    setFormData({
      name: material.name,
    });

    setEditingId(material._id);

    setShowForm(true);
  };

  // =========================
  // OPEN DELETE MODAL
  // =========================

  const handleDelete = (material) => {
    setDeleteModal({
      show: true,
      id: material._id,
      name: material.name,
    });
  };

  // =========================
  // DELETE
  // Backend: DELETE /finished-materials/:id
  // =========================

  const confirmDelete = async () => {
    try {
      await api.delete(
        `/finished-materials/${deleteModal.id}`
      );

      setDeleteModal({
        show: false,
        id: null,
        name: "",
      });

      showToast(
        "success",
        "Material Deleted",
        "Finished material deleted successfully"
      );

      await getFinishedMaterials();
    } catch (error) {
      console.error(
        "Delete finished material error:",
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
          "Failed to delete finished material"
      );
    }
  };

  // =========================
  // CLOSE DELETE MODAL
  // =========================

  const closeDeleteModal = () => {
    setDeleteModal({
      show: false,
      id: null,
      name: "",
    });
  };

  // =========================
  // ADD
  // =========================

  const handleAddFinishedMaterial = () => {
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
    <div className="finished-material-category-layout">

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
              <h3>Delete Finished Material?</h3>

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

      <div className="finished-material-category-main">

        <Header />

        <main className="finished-material-category-content">

          {/* =========================
              PAGE HEADER
          ========================= */}

          <div className="finished-material-category-page-header">

            <div>
              <h1>Finished Materials Category</h1>

              <p>
                Manage all finished materials.
              </p>
            </div>

            <button
              type="button"
              className="add-finished-material-category-btn"
              onClick={handleAddFinishedMaterial}
            >
              <Plus size={18} />
              Add Finished Material
            </button>

          </div>

          {/* =========================
              FORM
          ========================= */}

          {showForm && (
            <section className="finished-material-category-form-card">

              <div className="form-header">

                <div>
                  <h2>
                    {editingId
                      ? "Edit Finished Material"
                      : "Add Finished Material"}
                  </h2>

                  <p>
                    {editingId
                      ? "Update finished material."
                      : "Create a new finished material."}
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

                    <label htmlFor="finished-material-name">
                      Finished Material Name{" "}
                      <span>*</span>
                    </label>

                    <input
                      id="finished-material-name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter finished material name"
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
                    className="save-finished-material-category-btn"
                  >
                    {editingId
                      ? "Update Material"
                      : "Save Material"}
                  </button>

                </div>

              </form>

            </section>
          )}

          {/* =========================
              TABLE
          ========================= */}

          <section className="finished-material-category-table-card">

            <div className="table-section-header">

              <div>
                <h2>All Finished Materials</h2>

                <p>
                  {finishedMaterials.length}{" "}
                  {finishedMaterials.length === 1
                    ? "finished material"
                    : "finished materials"}{" "}
                  available
                </p>
              </div>

            </div>

            <div className="table-wrapper">

              <table className="finished-material-category-table">

                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Finished Material Name</th>
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
                        Loading finished materials...
                      </td>
                    </tr>
                  ) : finishedMaterials.length > 0 ? (
                    finishedMaterials.map(
                      (material, index) => (
                        <tr key={material._id}>

                          <td>{index + 1}</td>

                          <td className="finished-material-category-name">
                            {material.name}
                          </td>

                          <td>

                            <div className="action-buttons">

                              <button
                                type="button"
                                className="edit-btn"
                                onClick={() =>
                                  handleEdit(material)
                                }
                                aria-label={`Edit ${material.name}`}
                              >
                                <Pencil size={16} />
                              </button>

                              <button
                                type="button"
                                className="delete-btn"
                                onClick={() =>
                                  handleDelete(material)
                                }
                                aria-label={`Delete ${material.name}`}
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
                        No finished materials found.
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

export default FinishedMaterialsCategory;