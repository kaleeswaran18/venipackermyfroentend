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

import "./ItemsCategories.css";

function ItemsCategories() {
  const [showForm, setShowForm] = useState(false);

  const [locations, setLocations] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
  });

  const [editingId, setEditingId] = useState(null);

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

  // ==========================================
  // DELETE MODAL
  // ==========================================

  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: null,
    name: "",
  });

  // ==========================================
  // GET ALL ITEM CATEGORIES
  // ==========================================

  const getLocations = async () => {
    try {
      setLoading(true);

      const response = await api.get("/item-categories");

      setLocations(response.data.data || []);
    } catch (error) {
      console.error("Get item categories error:", error);

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to fetch item categories"
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LOAD ITEM CATEGORIES
  // ==========================================

  useEffect(() => {
    getLocations();
  }, []);

  // ==========================================
  // HANDLE INPUT
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

    if (!name) {
      showToast(
        "error",
        "Item Category Name Required",
        "Please enter an item category name."
      );

      return;
    }

    try {
      if (editingId) {
        // UPDATE

        await api.patch(`/item-categories/${editingId}`, {
          name,
        });

        showToast(
          "success",
          "Category Updated",
          "Item category updated successfully"
        );
      } else {
        // CREATE

        await api.post("/item-categories", {
          name,
        });

        showToast(
          "success",
          "Category Created",
          "Item category added successfully"
        );
      }

      await getLocations();

      setFormData({
        name: "",
      });

      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      console.error(
        "Save item category error:",
        error
      );

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to save item category"
      );
    }
  };

  // ==========================================
  // EDIT
  // ==========================================

  const handleEdit = (category) => {
    setFormData({
      name: category.name,
    });

    setEditingId(category._id);

    setShowForm(true);
  };

  // ==========================================
  // OPEN DELETE MODAL
  // ==========================================

  const handleDelete = (category) => {
    setDeleteModal({
      show: true,
      id: category._id,
      name: category.name,
    });
  };

  // ==========================================
  // CONFIRM DELETE
  // ==========================================

  const confirmDelete = async () => {
    try {
      await api.delete(
        `/item-categories/${deleteModal.id}`
      );

      setDeleteModal({
        show: false,
        id: null,
        name: "",
      });

      showToast(
        "success",
        "Category Deleted",
        "Item category deleted successfully"
      );

      await getLocations();
    } catch (error) {
      console.error(
        "Delete item category error:",
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
          "Failed to delete item category"
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
  // ADD ITEM CATEGORY
  // ==========================================

  const handleAddCategory = () => {
    setFormData({
      name: "",
    });

    setEditingId(null);

    setShowForm(true);
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
              <h3>Delete Item Category?</h3>

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

      <div className="locations-main">
        <Header />

        <main className="locations-content">

          {/* =====================================
              PAGE HEADER
          ====================================== */}

          <div className="locations-page-header">
            <div>
              <h1>Items Categories</h1>

              <p>
                Manage all item categories.
              </p>
            </div>

            <button
              type="button"
              className="add-location-btn"
              onClick={handleAddCategory}
            >
              <Plus size={18} />
              Add Category
            </button>
          </div>

          {/* =====================================
              ADD / EDIT FORM
          ====================================== */}

          {showForm && (
            <section className="location-form-card">

              <div className="form-header">

                <div>
                  <h2>
                    {editingId
                      ? "Edit Item Category"
                      : "Add Item Category"}
                  </h2>

                  <p>
                    {editingId
                      ? "Update item category."
                      : "Create a new item category."}
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

                    <label htmlFor="category-name">
                      Category Name{" "}
                      <span>*</span>
                    </label>

                    <input
                      id="category-name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter category name"
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
                      ? "Update Category"
                      : "Save Category"}
                  </button>

                </div>

              </form>

            </section>
          )}

          {/* =====================================
              ALL ITEM CATEGORIES
          ====================================== */}

          <section className="locations-table-card">

            <div className="table-section-header">

              <div>
                <h2>All Item Categories</h2>

                <p>
                  {locations.length}{" "}
                  {locations.length === 1
                    ? "item category"
                    : "item categories"}{" "}
                  available
                </p>
              </div>

            </div>

            <div className="table-wrapper">

              <table className="locations-table">

                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Category Name</th>
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
                        Loading item categories...
                      </td>
                    </tr>
                  ) : locations.length > 0 ? (
                    locations.map(
                      (category, index) => (
                        <tr key={category._id}>

                          <td>
                            {index + 1}
                          </td>

                          <td className="location-name">
                            {category.name}
                          </td>

                          <td>

                            <div className="action-buttons">

                              <button
                                type="button"
                                className="edit-btn"
                                onClick={() =>
                                  handleEdit(category)
                                }
                                aria-label={`Edit ${category.name}`}
                              >
                                <Pencil size={16} />
                              </button>

                              <button
                                type="button"
                                className="delete-btn"
                                onClick={() =>
                                  handleDelete(category)
                                }
                                aria-label={`Delete ${category.name}`}
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
                        No item categories found.
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

export default ItemsCategories;