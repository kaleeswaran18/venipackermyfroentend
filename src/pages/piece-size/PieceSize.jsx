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

import "./PieceSize.css";

function PieceSize() {
  // ==========================================
  // FORM
  // ==========================================

  const [showForm, setShowForm] = useState(false);

  const [pieceSizes, setPieceSizes] = useState([]);

  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    width: "",
    inch: "",
    feet: "",
  });

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
  // GET ALL PIECE SIZES
  // GET /api/piece-size
  // ==========================================

  const getPieceSizes = async () => {
    try {
      setLoading(true);

      const response = await api.get("/piece-size");

      setPieceSizes(response.data.data || []);
    } catch (error) {
      console.error("Get piece sizes error:", error);

      showToast(
        "error",
        "Load Failed",
        error.response?.data?.message ||
          "Failed to load piece sizes."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LOAD DATA
  // ==========================================

  useEffect(() => {
    getPieceSizes();
  }, []);

  // ==========================================
  // INPUT CHANGE
  // ==========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ==========================================
  // CREATE / UPDATE
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    // FIX: values can be numbers when editing,
    // so always convert to string before trim()
    const width = String(formData.width).trim();
    const inch = String(formData.inch).trim();
    const feet = String(formData.feet).trim();

    // ========================================
    // VALIDATION
    // ========================================

    if (!width) {
      showToast(
        "error",
        "Width Required",
        "Please enter width."
      );
      return;
    }

    if (!inch) {
      showToast(
        "error",
        "Inch Required",
        "Please enter inch."
      );
      return;
    }

    if (!feet) {
      showToast(
        "error",
        "Feet Required",
        "Please enter feet."
      );
      return;
    }

    try {
      setLoading(true);

      const payload = {
        width: Number(width),
        inch: Number(inch),
        feet: Number(feet),
      };

      // ======================================
      // UPDATE
      // PATCH /api/piece-size/:id
      // ======================================

      if (editingId) {
        const response = await api.patch(
          `/piece-size/${editingId}`,
          payload
        );

        setPieceSizes((prev) =>
          prev.map((item) =>
            item._id === editingId
              ? response.data.data
              : item
          )
        );

        showToast(
          "success",
          "Piece Size Updated",
          "Piece size updated successfully."
        );
      }

      // ======================================
      // CREATE
      // POST /api/piece-size
      // ======================================

      else {
        const response = await api.post(
          "/piece-size",
          payload
        );

        setPieceSizes((prev) => [
          ...prev,
          response.data.data,
        ]);

        showToast(
          "success",
          "Piece Size Created",
          "Piece size created successfully."
        );
      }

      // Reset form
      setFormData({
        width: "",
        inch: "",
        feet: "",
      });

      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      console.error(
        "Save piece size error:",
        error
      );

      showToast(
        "error",
        "Save Failed",
        error.response?.data?.message ||
          "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // ADD PIECE SIZE
  // ==========================================

  const handleAddPieceSize = () => {
    setFormData({
      width: "",
      inch: "",
      feet: "",
    });

    setEditingId(null);
    setShowForm(true);
  };

  // ==========================================
  // EDIT
  // GET /api/piece-size/:id
  // ==========================================

  const handleEdit = async (item) => {
    try {
      setLoading(true);

      const response = await api.get(
        `/piece-size/${item._id}`
      );

      const pieceSize = response.data.data;

      // FIX: keep form values as strings
      setFormData({
        width: String(pieceSize.width ?? ""),
        inch: String(pieceSize.inch ?? ""),
        feet: String(pieceSize.feet ?? ""),
      });

      setEditingId(pieceSize._id);
      setShowForm(true);
    } catch (error) {
      console.error(
        "Get piece size error:",
        error
      );

      showToast(
        "error",
        "Load Failed",
        error.response?.data?.message ||
          "Failed to load piece size."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // OPEN DELETE MODAL
  // ==========================================

  const openDeleteModal = (item) => {
    setDeleteModal({
      show: true,
      id: item._id,
      name: `${item.width} × ${item.inch} × ${item.feet}`,
    });
  };

  // ==========================================
  // DELETE
  // DELETE /api/piece-size/:id
  // ==========================================

  const handleDelete = async () => {
    try {
      setLoading(true);

      await api.delete(
        `/piece-size/${deleteModal.id}`
      );

      setPieceSizes((prev) =>
        prev.filter(
          (item) => item._id !== deleteModal.id
        )
      );

      setDeleteModal({
        show: false,
        id: null,
        name: "",
      });

      showToast(
        "success",
        "Piece Size Deleted",
        "Piece size deleted successfully."
      );
    } catch (error) {
      console.error(
        "Delete piece size error:",
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
          "Failed to delete piece size."
      );
    } finally {
      setLoading(false);
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

  const closeForm = () => {
    setShowForm(false);

    setEditingId(null);

    setFormData({
      width: "",
      inch: "",
      feet: "",
    });
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="piece-size-layout">

      {/* ======================================
          TOAST
      ======================================= */}

      {toast.show && (
        <div
          className={`piece-size-toast piece-size-toast-${toast.type}`}
        >
          <div className="piece-size-toast-icon">
            {toast.type === "success" ? (
              <CheckCircle size={21} />
            ) : (
              <AlertCircle size={21} />
            )}
          </div>

          <div className="piece-size-toast-content">
            <strong>{toast.title}</strong>
            <span>{toast.message}</span>
          </div>

          <button
            type="button"
            className="piece-size-toast-close"
            onClick={closeToast}
            aria-label="Close notification"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* ======================================
          SIDEBAR
      ======================================= */}

      <Sidebar />

      <div className="piece-size-main">

        {/* HEADER */}

        <Header />

        <main className="piece-size-content">

          {/* ===================================
              PAGE HEADER
          ==================================== */}

          <div className="page-header">
            <div>
              <h1>Piece Size</h1>

              <p>
                Manage piece size master
              </p>
            </div>

            <button
              type="button"
              className="add-btn"
              onClick={handleAddPieceSize}
            >
              <Plus size={18} />
              Add Piece Size
            </button>
          </div>

          {/* ===================================
              FORM
          ==================================== */}

          {showForm && (
            <div className="form-card">

              <div className="form-header">
                <h2>
                  {editingId
                    ? "Edit Piece Size"
                    : "Add Piece Size"}
                </h2>

                <button
                  type="button"
                  className="close-btn"
                  onClick={closeForm}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>

                <div className="form-grid">

                  {/* WIDTH */}

                  <div className="form-group">
                    <label>
                      Width <span>*</span>
                    </label>

                    <input
                      type="number"
                      name="width"
                      value={formData.width}
                      onChange={handleChange}
                      min="0"
                      step="any"
                      placeholder="Enter width"
                    />
                  </div>

                  {/* INCH */}

                  <div className="form-group">
                    <label>
                      Inch <span>*</span>
                    </label>

                    <input
                      type="number"
                      name="inch"
                      value={formData.inch}
                      onChange={handleChange}
                      min="0"
                      step="any"
                      placeholder="Enter inch"
                    />
                  </div>

                  {/* FEET */}

                  <div className="form-group">
                    <label>
                      Feet <span>*</span>
                    </label>

                    <input
                      type="number"
                      name="feet"
                      value={formData.feet}
                      onChange={handleChange}
                      min="0"
                      step="any"
                      placeholder="Enter feet"
                    />
                  </div>

                </div>

                <div className="form-actions">

                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={closeForm}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="save-btn"
                    disabled={loading}
                  >
                    {editingId
                      ? "Update Piece Size"
                      : "Save Piece Size"}
                  </button>

                </div>

              </form>
            </div>
          )}

          {/* ===================================
              TABLE
          ==================================== */}

          <div className="table-card">

            <div className="table-header">
              <div>
                <h2>All Piece Sizes</h2>

                <span>
                  {pieceSizes.length} piece sizes
                </span>
              </div>
            </div>

            <div className="table-wrapper">

              <table>

                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Width</th>
                    <th>Inch</th>
                    <th>Feet</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>

                  {loading &&
                  pieceSizes.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="empty-row"
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : pieceSizes.length > 0 ? (
                    pieceSizes.map((item, index) => (
                      <tr key={item._id}>

                        <td>
                          {index + 1}
                        </td>

                        <td>
                          <strong>
                            {item.width}
                          </strong>
                        </td>

                        <td>
                          {item.inch}
                        </td>

                        <td>
                          {item.feet}
                        </td>

                        <td>
                          <div className="action-buttons">

                            <button
                              type="button"
                              className="edit-btn"
                              onClick={() =>
                                handleEdit(item)
                              }
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() =>
                                openDeleteModal(item)
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
                        colSpan="5"
                        className="empty-row"
                      >
                        No piece sizes found
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>

            </div>
          </div>

        </main>
      </div>

      {/* ======================================
          DELETE MODAL
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

              <h3>
                Delete Piece Size?
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
                onClick={handleDelete}
                disabled={loading}
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

export default PieceSize;
