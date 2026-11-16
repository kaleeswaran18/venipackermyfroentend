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

import "./Items.css";

function Items() {
  const [showForm, setShowForm] = useState(false);

  const [items, setItems] = useState([]);

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
  // GET ALL ITEMS
  // =========================

  const getItems = async () => {
    try {
      setLoading(true);

      const response = await api.get("/items");

      setItems(response.data.data || []);
    } catch (error) {
      console.error("Get items error:", error);

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to fetch items"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getItems();
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
        "Item Name Required",
        "Please enter an item name."
      );
      return;
    }

    try {
      if (editingId) {
        await api.patch(`/items/${editingId}`, {
          name,
        });

        showToast(
          "success",
          "Item Updated",
          "Item updated successfully"
        );
      } else {
        await api.post("/items", {
          name,
        });

        showToast(
          "success",
          "Item Created",
          "Item added successfully"
        );
      }

      await getItems();

      setFormData({
        name: "",
      });

      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      console.error("Save item error:", error);

      showToast(
        "error",
        "Error",
        error.response?.data?.message ||
          "Failed to save item"
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
        `/items/${deleteModal.id}`
      );

      setDeleteModal({
        show: false,
        id: null,
        name: "",
      });

      showToast(
        "success",
        "Item Deleted",
        "Item deleted successfully"
      );

      await getItems();
    } catch (error) {
      console.error("Delete item error:", error);

      setDeleteModal({
        show: false,
        id: null,
        name: "",
      });

      showToast(
        "error",
        "Delete Failed",
        error.response?.data?.message ||
          "Failed to delete item"
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
  // ADD ITEM
  // =========================

  const handleAddItem = () => {
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
    <div className="items-layout">

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
              <h3>Delete Item?</h3>

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

      <div className="items-main">
        <Header />

        <main className="items-content">

          {/* =========================
              PAGE HEADER
          ========================= */}

          <div className="items-page-header">
            <div>
              <h1>Items</h1>

              <p>
                Manage all inventory items.
              </p>
            </div>

            <button
              type="button"
              className="add-item-btn"
              onClick={handleAddItem}
            >
              <Plus size={18} />
              Add Item
            </button>
          </div>

          {/* =========================
              ADD / EDIT FORM
          ========================= */}

          {showForm && (
            <section className="item-form-card">
              <div className="form-header">
                <div>
                  <h2>
                    {editingId
                      ? "Edit Item"
                      : "Add Item"}
                  </h2>

                  <p>
                    {editingId
                      ? "Update item."
                      : "Create a new inventory item."}
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
                    <label htmlFor="item-name">
                      Item Name <span>*</span>
                    </label>

                    <input
                      id="item-name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter item name"
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
                    className="save-item-btn"
                  >
                    {editingId
                      ? "Update Item"
                      : "Save Item"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* =========================
              ALL ITEMS
          ========================= */}

          <section className="items-table-card">
            <div className="table-section-header">
              <div>
                <h2>All Items</h2>

                <p>
                  {items.length}{" "}
                  {items.length === 1
                    ? "item"
                    : "items"}{" "}
                  available
                </p>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Item Name</th>
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
                        Loading items...
                      </td>
                    </tr>
                  ) : items.length > 0 ? (
                    items.map((item, index) => (
                      <tr key={item._id}>
                        <td>{index + 1}</td>

                        <td className="item-name">
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
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="3"
                        className="empty-state"
                      >
                        No items found.
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

export default Items;