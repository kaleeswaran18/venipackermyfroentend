import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight, RefreshCw, Package, Hammer, Droplets, Pencil,
  X, CheckCircle, AlertCircle, Save,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import api from "../../api/axios";
import "./StockTransfer.css";

const STOCK_TYPES = [
  { value: "item", label: "Items", icon: Package },
  { value: "nail", label: "Nails", icon: Hammer },
  { value: "consumable", label: "Consumables", icon: Droplets },
];

const EMPTY_FORM = {
  fromLocation: "", toLocation: "", itemType: "", category: "",
  stockId: "", quantity: "", unit: "", pieces: [], remarks: "",
};

const getArray = (response) => {
  const data = response?.data?.data ?? response?.data ?? [];
  return Array.isArray(data) ? data : [];
};

const getName = (value) =>
  typeof value === "string" ? value : value?.name || "—";

const getId = (value) =>
  typeof value === "string" ? value : value?._id || "";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
};

function StockTransfer() {
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [openingStock, setOpeningStock] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [editForm, setEditForm] = useState({
    quantity: "", unit: "", pieces: [], remarks: "", isNewItem: false,
  });
  const [toast, setToast] = useState({ show: false, type: "", message: "" });
  const toastTimer = useRef(null);

  const closeToast = useCallback(() => {
    setToast({ show: false, type: "", message: "" });
  }, []);

  const showToast = useCallback((type, message) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ show: true, type, message });
    toastTimer.current = setTimeout(closeToast, 3500);
  }, [closeToast]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const loadMasterData = useCallback(async () => {
    try {
      setLoading(true);
      const [locationRes, categoryRes, stockRes] = await Promise.all([
        api.get("/locations"),
        api.get("/item-categories"),
        api.get("/opening-stock"),
      ]);
      setLocations(getArray(locationRes).filter((item) => item.isActive));
      setCategories(getArray(categoryRes).filter((item) => item.isActive));
      setOpeningStock(getArray(stockRes));
    } catch (error) {
      console.error("Load stock transfer data:", error);
      showToast("error", error.response?.data?.message || "Unable to load master data.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadTransfers = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const response = await api.get("/stock-transfers");
      setTransfers(getArray(response));
    } catch (error) {
      console.error("Load stock transfers:", error);
      showToast("error", error.response?.data?.message || "Unable to load transfer history.");
    } finally {
      setHistoryLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadMasterData();
    loadTransfers();
  }, [loadMasterData, loadTransfers]);

  const selectedStock = useMemo(
    () => openingStock.find((stock) => stock._id === form.stockId),
    [openingStock, form.stockId]
  );

  const filteredStock = useMemo(() => {
    if (!form.fromLocation || !form.itemType) return [];
    return openingStock.filter((stock) => {
      if (getId(stock.location) !== form.fromLocation) return false;
      if (stock.type !== form.itemType) return false;
      if (form.itemType === "item") {
        return form.category && getId(stock.category) === form.category;
      }
      return true;
    });
  }, [openingStock, form.fromLocation, form.itemType, form.category]);

  const setField = (field, value) =>
    setForm((previous) => ({ ...previous, [field]: value }));

  const handleFromLocation = (value) => {
    setForm((previous) => ({
      ...EMPTY_FORM,
      fromLocation: value,
      toLocation: previous.toLocation === value ? "" : previous.toLocation,
    }));
  };

  const handleTypeSelect = (value) => {
    setForm((previous) => ({
      ...previous, itemType: value, category: "", stockId: "",
      quantity: "", unit: "", pieces: [],
    }));
  };

  const handleCategorySelect = (value) => {
    setForm((previous) => ({
      ...previous, category: value, stockId: "",
      quantity: "", unit: "", pieces: [],
    }));
  };

  const handleStockSelect = (stockId) => {
    const stock = openingStock.find((item) => item._id === stockId);
    setForm((previous) => ({
      ...previous,
      stockId,
      quantity: "",
      unit: stock?.unit || "",
      pieces: (stock?.pieces || []).map((piece) => ({
        pieceSizeId: getId(piece.pieceSizeId),
        width: piece.width,
        inch: piece.inch,
        feet: piece.feet,
        availableCount: Number(piece.count || 0),
        count: "",
      })),
    }));
  };

  const handlePieceCount = (pieceSizeId, value) => {
    setForm((previous) => ({
      ...previous,
      pieces: previous.pieces.map((piece) =>
        piece.pieceSizeId === pieceSizeId ? { ...piece, count: value } : piece
      ),
    }));
  };

  const isNewItem =
    form.itemType === "item" &&
    getName(selectedStock?.category).toLowerCase() === "newitem";

  const handleCreateTransfer = async (event) => {
    event.preventDefault();

    if (!form.fromLocation || !form.toLocation) {
      showToast("error", "Please select From and To locations.");
      return;
    }
    if (form.fromLocation === form.toLocation) {
      showToast("error", "From and To locations cannot be the same.");
      return;
    }
    if (!selectedStock || !form.itemType) {
      showToast("error", "Please select an item.");
      return;
    }

    const payload = {
      fromLocation: form.fromLocation,
      toLocation: form.toLocation,
      itemType: form.itemType,
      referenceId: getId(selectedStock.referenceId),
      remarks: form.remarks.trim(),
    };

    if (form.itemType === "item") payload.category = getId(selectedStock.category);

    if (isNewItem) {
      const invalid = form.pieces.some(
        (piece) => Number(piece.count || 0) > piece.availableCount
      );
      if (invalid) {
        showToast("error", "Transfer count cannot exceed available count.");
        return;
      }
      payload.pieces = form.pieces
        .filter((piece) => Number(piece.count) > 0)
        .map((piece) => ({
          pieceSizeId: piece.pieceSizeId,
          count: Number(piece.count),
        }));
      if (!payload.pieces.length) {
        showToast("error", "Enter count for at least one piece size.");
        return;
      }
    } else {
      const quantity = Number(form.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        showToast("error", "Enter a valid transfer quantity.");
        return;
      }
      if (quantity > Number(selectedStock.currentStock || 0)) {
        showToast("error", "Transfer quantity exceeds available stock.");
        return;
      }
      payload.quantity = quantity;
      payload.unit = form.unit || selectedStock.unit;
    }

    try {
      setSaving(true);
      await api.post("/stock-transfers", payload);
      showToast("success", "Stock transferred successfully.");
      setForm(EMPTY_FORM);
      await Promise.all([loadMasterData(), loadTransfers()]);
    } catch (error) {
      console.error("Create stock transfer:", error);
      showToast("error", error.response?.data?.message || "Unable to complete stock transfer.");
    } finally {
      setSaving(false);
    }
  };

  const getTransferIsNewItem = (transfer) =>
    transfer.itemType === "item" &&
    getName(transfer.category).toLowerCase() === "newitem";

  const openEdit = (transfer) => {
    setEditingTransfer(transfer);
    setEditForm({
      quantity: transfer.quantity ?? "",
      unit: transfer.unit || "",
      pieces: (transfer.pieces || []).map((piece) => ({
        pieceSizeId: getId(piece.pieceSizeId),
        count: String(piece.count ?? ""),
      })),
      remarks: transfer.remarks || "",
      isNewItem: getTransferIsNewItem(transfer),
    });
  };

  const handleEditSave = async (event) => {
    event.preventDefault();
    if (!editingTransfer) return;

    const payload = { remarks: editForm.remarks };
    if (editForm.isNewItem) {
      payload.pieces = editForm.pieces
        .filter((piece) => Number(piece.count) > 0)
        .map((piece) => ({
          pieceSizeId: piece.pieceSizeId,
          count: Number(piece.count),
        }));
      if (!payload.pieces.length) {
        showToast("error", "Enter at least one piece count.");
        return;
      }
    } else {
      const quantity = Number(editForm.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        showToast("error", "Enter a valid quantity.");
        return;
      }
      payload.quantity = quantity;
      payload.unit = editForm.unit;
    }

    try {
      setSaving(true);
      await api.patch(`/stock-transfers/${editingTransfer._id}`, payload);
      showToast("success", "Stock transfer updated successfully.");
      setEditingTransfer(null);
      await Promise.all([loadMasterData(), loadTransfers()]);
    } catch (error) {
      console.error("Update stock transfer:", error);
      showToast("error", error.response?.data?.message || "Unable to update transfer.");
    } finally {
      setSaving(false);
    }
  };

  const getTransferItemName = (transfer) => {
    const referenceId = getId(transfer.referenceId);
    const stock = openingStock.find(
      (item) => getId(item.referenceId) === referenceId
    );
    return getName(transfer.referenceId) !== "—"
      ? getName(transfer.referenceId)
      : getName(stock?.referenceId);
  };

  // Resolve the dimensions for each transferred piece size.
  // The transfer record stores pieceSizeId + count; dimensions are read
  // from the populated pieceSizeId or the source location's opening stock.
  const getTransferPieceSize = (transfer, piece) => {
    const populatedSize =
      piece.pieceSizeId && typeof piece.pieceSizeId === "object"
        ? piece.pieceSizeId
        : null;

    if (
      populatedSize &&
      populatedSize.width !== undefined &&
      populatedSize.inch !== undefined &&
      populatedSize.feet !== undefined
    ) {
      return populatedSize;
    }

    if (
      piece.width !== undefined &&
      piece.inch !== undefined &&
      piece.feet !== undefined
    ) {
      return piece;
    }

    const sourceStock = openingStock.find(
      (stock) =>
        getId(stock.referenceId) === getId(transfer.referenceId) &&
        getId(stock.location) === getId(transfer.fromLocation) &&
        getId(stock.category) === getId(transfer.category)
    );

    return (
      sourceStock?.pieces?.find(
        (stockPiece) =>
          getId(stockPiece.pieceSizeId) === getId(piece.pieceSizeId)
      ) || null
    );
  };

  return (
    <div className="stock-transfer-layout">
      {toast.show && (
        <div className={`st-toast ${toast.type}`}>
          <span className="st-toast-icon">
            {toast.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          </span>
          <div>
            <strong>{toast.type === "success" ? "Success" : "Error"}</strong>
            <p>{toast.message}</p>
          </div>
          <button type="button" onClick={closeToast} aria-label="Close notification">
            <X size={17} />
          </button>
        </div>
      )}

      <Sidebar />
      <div className="stock-transfer-main">
        <Header />
        <main className="stock-transfer-content">
          <section className="st-page-header">
            <div>
              <h1>Stock Transfer</h1>
              <p>Transfer available stock between locations.</p>
            </div>
            <button
              type="button"
              className="st-secondary-btn"
              onClick={() => { loadMasterData(); loadTransfers(); }}
              disabled={loading || historyLoading}
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </section>

          <form className="st-card" onSubmit={handleCreateTransfer}>
            <div className="st-card-heading">
              <div>
                <h2>Transfer Details</h2>
                <p>Select locations and the stock you want to transfer.</p>
              </div>
              <span className="st-heading-icon"><ArrowLeftRight size={20} /></span>
            </div>

            <div className="st-form-grid">
              <div className="st-field">
                <label htmlFor="st-from">From Location *</label>
                <select
                  id="st-from"
                  value={form.fromLocation}
                  onChange={(event) => handleFromLocation(event.target.value)}
                  required
                >
                  <option value="">Select From Location</option>
                  {locations.map((location) => (
                    <option key={location._id} value={location._id}>
                      {location.name.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="st-field">
                <label htmlFor="st-to">To Location *</label>
                <select
                  id="st-to"
                  value={form.toLocation}
                  onChange={(event) => setField("toLocation", event.target.value)}
                  required
                >
                  <option value="">Select To Location</option>
                  {locations
                    .filter((location) => location._id !== form.fromLocation)
                    .map((location) => (
                      <option key={location._id} value={location._id}>
                        {location.name.toUpperCase()}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="st-divider" />
            <div className="st-section-title">
              <h3>Select Stock Type</h3>
              <span>Choose one option</span>
            </div>
            <div className="st-type-grid">
              {STOCK_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  type="button"
                  key={value}
                  className={`st-type-card ${form.itemType === value ? "active" : ""}`}
                  onClick={() => handleTypeSelect(value)}
                  disabled={!form.fromLocation}
                >
                  <span className="st-type-icon"><Icon size={21} /></span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            {!form.fromLocation && (
              <p className="st-hint">Select From Location to view stock types.</p>
            )}

            {form.itemType === "item" && (
              <div className="st-field st-select-field">
                <label htmlFor="st-category">Item Category *</label>
                <select
                  id="st-category"
                  value={form.category}
                  onChange={(event) => handleCategorySelect(event.target.value)}
                  required
                >
                  <option value="">Select Item Category</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name === "newitem" ? "New Items" : "Used Items"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.itemType && (
              <div className="st-field st-select-field">
                <label htmlFor="st-item">Select Item *</label>
                <select
                  id="st-item"
                  value={form.stockId}
                  onChange={(event) => handleStockSelect(event.target.value)}
                  disabled={form.itemType === "item" && !form.category}
                  required
                >
                  <option value="">Select Item</option>
                  {filteredStock.map((stock) => (
                    <option key={stock._id} value={stock._id}>
                      {getName(stock.referenceId)}
                    </option>
                  ))}
                </select>
                {form.fromLocation &&
                  (form.itemType !== "item" || form.category) &&
                  filteredStock.length === 0 && (
                    <small className="st-no-stock">No matching stock found in this location.</small>
                  )}
              </div>
            )}

            {selectedStock && (
              <div className="st-stock-panel">
                <div className="st-stock-panel-heading">
                  <div>
                    <span className="st-eyebrow">Selected Item</span>
                    <h3>{getName(selectedStock.referenceId)}</h3>
                    <p>{form.itemType === "item" ? getName(selectedStock.category) : form.itemType}</p>
                  </div>
                  <span className="st-stock-badge">Stock Available</span>
                </div>

                {isNewItem ? (
                  <div className="st-table-scroll">
                    <table className="st-piece-table">
                      <thead>
                        <tr><th>Piece Size</th><th>Current Stock</th><th>Transfer Count</th></tr>
                      </thead>
                      <tbody>
                        {form.pieces.map((piece) => (
                          <tr key={piece.pieceSizeId}>
                            <td>{piece.width} × {piece.inch} × {piece.feet}</td>
                            <td>{piece.availableCount}</td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                max={piece.availableCount}
                                step="1"
                                value={piece.count}
                                placeholder="0"
                                onChange={(event) => handlePieceCount(piece.pieceSizeId, event.target.value)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <>
                    <div className="st-current-stock">
                      <span>Current Stock</span>
                      <strong>
                        {Number(selectedStock.currentStock ?? 0).toLocaleString("en-IN")} {selectedStock.unit || ""}
                      </strong>
                    </div>
                    <div className="st-field st-quantity-field">
                      <label htmlFor="st-quantity">Transfer Quantity *</label>
                      <div className="st-quantity-input">
                        <input
                          id="st-quantity"
                          type="number"
                          min="0"
                          max={selectedStock.currentStock}
                          step="any"
                          value={form.quantity}
                          onChange={(event) => setField("quantity", event.target.value)}
                          placeholder="Enter quantity"
                          required
                        />
                        <span>{selectedStock.unit || "Unit"}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="st-field st-remarks-field">
              <label htmlFor="st-remarks">Remarks</label>
              <textarea
                id="st-remarks"
                rows="3"
                value={form.remarks}
                onChange={(event) => setField("remarks", event.target.value)}
                placeholder="Enter remarks (optional)"
              />
            </div>
            <div className="st-form-actions">
              <button type="button" className="st-cancel-btn" onClick={() => setForm(EMPTY_FORM)} disabled={saving}>
                Clear
              </button>
              <button type="submit" className="st-primary-btn" disabled={saving || loading || !selectedStock}>
                <ArrowLeftRight size={17} /> {saving ? "Transferring..." : "Transfer Stock"}
              </button>
            </div>
          </form>

          <section className="st-card st-history-card">
            <div className="st-card-heading">
              <div>
                <h2>Transfer History</h2>
                <p>Recent transfers between locations.</p>
              </div>
              <button type="button" className="st-secondary-btn" onClick={loadTransfers} disabled={historyLoading}>
                <RefreshCw size={15} /> Refresh
              </button>
            </div>
            {historyLoading ? (
              <div className="st-empty-state">Loading transfer history...</div>
            ) : transfers.length === 0 ? (
              <div className="st-empty-state">No stock transfers found.</div>
            ) : (
              <div className="st-table-scroll">
                <table className="st-history-table">
                  <thead>
                    <tr>
                      <th>Date</th><th>From</th><th>To</th><th>Type</th>
                      <th>Item</th><th>Transferred</th><th>Remarks</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map((transfer) => {
                      const newItem = getTransferIsNewItem(transfer);
                      const transferred = newItem
                        ? (transfer.pieces || []).map((piece, index) => {
                            const size = getTransferPieceSize(transfer, piece);
                            const sizeLabel = size
                              ? `${size.width} × ${size.inch} × ${size.feet}`
                              : `Piece ${index + 1}`;

                            return (
                              <div
                                className="st-transfer-piece-detail"
                                key={piece.pieceSizeId?._id || piece.pieceSizeId || index}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  whiteSpace: "nowrap",
                                  marginBottom: "3px",
                                }}
                              >
                                <span>{sizeLabel}</span>
                                <span aria-hidden="true">→</span>
                                <strong>{piece.count} pcs</strong>
                              </div>
                            );
                          })
                        : `${transfer.quantity ?? "—"} ${transfer.unit || ""}`;
                      return (
                        <tr key={transfer._id}>
                          <td>{formatDate(transfer.transferDate)}</td>
                          <td>{getName(transfer.fromLocation).toUpperCase()}</td>
                          <td>{getName(transfer.toLocation).toUpperCase()}</td>
                          <td><span className="st-table-chip">{getName(transfer.category) === "—" ? transfer.itemType : getName(transfer.category)}</span></td>
                          <td>{getTransferItemName(transfer)}</td>
                          <td>{transferred}</td>
                          <td>{transfer.remarks || "—"}</td>
                          <td>
                            <button type="button" className="st-edit-btn" onClick={() => openEdit(transfer)}>
                              <Pencil size={14} /> Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>

      {editingTransfer && (
        <div className="st-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setEditingTransfer(null);
        }}>
          <form className="st-edit-modal" onSubmit={handleEditSave}>
            <div className="st-modal-header">
              <div><h2>Correct Transfer</h2><p>{getTransferItemName(editingTransfer)}</p></div>
              <button type="button" onClick={() => setEditingTransfer(null)} aria-label="Close">
                <X size={19} />
              </button>
            </div>

            {editForm.isNewItem ? (
              <div className="st-edit-piece-list">
                <label>Piece Size Counts</label>
                {editForm.pieces.map((piece, index) => (
                  <div className="st-edit-piece-row" key={piece.pieceSizeId}>
                    <span>
                      {(() => {
                        const size = getTransferPieceSize(editingTransfer, piece);
                        return size
                          ? `${size.width} × ${size.inch} × ${size.feet}`
                          : `Piece ${index + 1}`;
                      })()}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={piece.count}
                      onChange={(event) => setEditForm((previous) => ({
                        ...previous,
                        pieces: previous.pieces.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, count: event.target.value } : item
                        ),
                      }))}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="st-field">
                <label>Transfer Quantity</label>
                <div className="st-quantity-input">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editForm.quantity}
                    onChange={(event) => setEditForm((previous) => ({ ...previous, quantity: event.target.value }))}
                    required
                  />
                  <span>{editForm.unit}</span>
                </div>
              </div>
            )}

            <div className="st-field">
              <label>Remarks</label>
              <textarea
                rows="3"
                value={editForm.remarks}
                onChange={(event) => setEditForm((previous) => ({ ...previous, remarks: event.target.value }))}
              />
            </div>
            <div className="st-form-actions">
              <button type="button" className="st-cancel-btn" onClick={() => setEditingTransfer(null)} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="st-primary-btn" disabled={saving}>
                <Save size={16} /> {saving ? "Saving..." : "Save Correction"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default StockTransfer;
