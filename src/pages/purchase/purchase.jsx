import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import {
  ShoppingCart,
  ArrowLeft,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Pencil,
} from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import PurchaseList from "./purchaselist";
import usePurchaseForm, {
  PURCHASE_TYPES,
  formatMoney,
  formatDateTime,
  getNowLocal,
} from "./usePurchaseForm";
import "./purchase.css";

/* =========================================================
   SMALL UI PIECES
========================================================= */

function SectionCard({ number, title, className = "", children }) {
  return (
    <section className={`purchase-section ${className}`}>
      <div className="purchase-section-head">
        {number !== "" && <span>{number}.</span>}
        {title}
      </div>

      <div className="purchase-section-body">{children}</div>
    </section>
  );
}

function Field({ label, required, className = "", children }) {
  return (
    <div className={`purchase-field ${className}`}>
      <label>
        {label}
        {required && <span> *</span>}
      </label>

      {children}
    </div>
  );
}

/* =========================================================
   PAYMENT DETAILS (card + popup)
========================================================= */

const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card"];
const rupee = (value) => `₹${formatMoney(value)}`;
const today = () => getNowLocal(); // current date + time

function PaymentModal({ payment, maxAmount, onClose, onSave }) {
  const isEditing = Boolean(payment);

  const [data, setData] = useState(
    payment
      ? {
          paymentDate: payment.paymentDate || today(),
          amount: payment.amount,
          paymentMode: payment.paymentMode || "Cash",
          referenceNo: payment.referenceNo || "",
          remarks: payment.remarks || "",
        }
      : {
          paymentDate: today(),
          amount: "",
          paymentMode: "Cash",
          referenceNo: "",
          remarks: "",
        }
  );
  const [error, setError] = useState("");

  const change = (event) =>
    setData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));

  const save = () => {
    const amount = Number(data.amount);

    if (!data.paymentDate) return setError("Payment date is required.");
    if (!amount || amount <= 0)
      return setError("Enter a valid payment amount.");
    if (amount > maxAmount)
      return setError(
        `Amount cannot be more than ${rupee(maxAmount)} (pending amount).`
      );

    onSave({ ...data, amount });
    onClose();
  };

  // portal => modal is outside the <form>, so Enter key never submits the purchase
  return createPortal(
    <div className="pay-overlay" onClick={onClose}>
      <div className="pay-modal" onClick={(event) => event.stopPropagation()}>
        <div className="pay-modal-head">
          <div>
            <h3>{isEditing ? "Edit Payment" : "Add Payment"}</h3>
            <p>
              {isEditing
                ? "Update the payment details for this order."
                : "Record the payment received for this order."}
            </p>
          </div>

          <button type="button" className="pay-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="pay-modal-body">
          <div className="pay-grid">
            <Field label="Payment Date & Time" required>
              <input
                type="datetime-local"
                name="paymentDate"
                value={data.paymentDate}
                onChange={change}
              />
            </Field>

            <Field label="Payment Amount (₹)" required>
              <input
                type="number"
                name="amount"
                value={data.amount}
                onChange={change}
                placeholder="Enter payment amount"
                min="0"
                step="any"
                autoFocus
              />
            </Field>

            <Field label="Payment Mode" required>
              <select
                name="paymentMode"
                value={data.paymentMode}
                onChange={change}
              >
                {PAYMENT_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Reference Number">
              <input
                type="text"
                name="referenceNo"
                value={data.referenceNo}
                onChange={change}
                placeholder="UPI / bank / cheque reference"
              />
            </Field>
          </div>

          <Field label="Remarks">
            <textarea
              name="remarks"
              value={data.remarks}
              onChange={change}
              placeholder="Enter payment remarks"
              rows={3}
            />
          </Field>

          {error && <div className="pay-error">{error}</div>}
        </div>

        <div className="pay-modal-foot">
          <button
            type="button"
            className="purchase-reset-btn"
            onClick={onClose}
          >
            Cancel
          </button>

          <button type="button" className="purchase-save-btn" onClick={save}>
            <Save size={16} />
            {isEditing ? "Update Payment" : "Save Payment"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PaymentDetails({
  totalAmount,
  paymentHistory,
  paidAmount,
  pendingAmount,
  paymentStatus,
  onAdd,
  onUpdate,
  onRemove,
}) {
  const [open, setOpen] = useState(false); // add popup
  const [editing, setEditing] = useState(null); // payment being edited

  const closeModal = () => {
    setOpen(false);
    setEditing(null);
  };

  const statusClass =
    paymentStatus === "Paid"
      ? "paid"
      : paymentStatus === "Partially Paid"
      ? "partial"
      : "none";

  return (
    <section className="purchase-section">
      <div className="purchase-section-head">
        <CreditCard size={18} />
        Payment Details
      </div>

      <div className="purchase-section-body">
        <div className="pay-total-row">
          <div>
            <small>Total Amount</small>
            <strong>{rupee(totalAmount)}</strong>
          </div>

          <button
            type="button"
            className="pay-add-btn"
            onClick={() => setOpen(true)}
            disabled={totalAmount <= 0 || pendingAmount <= 0}
            title={totalAmount <= 0 ? "Enter the purchase amount first" : ""}
          >
            <Plus size={16} />
            Add Payment
          </button>
        </div>

        <div className="pay-history">
          <div className="pay-history-head">Payment History</div>

          {paymentHistory.length === 0 ? (
            <div className="pay-empty">
              No payment received yet. Click <b>Add Payment</b> to record the
              first payment.
            </div>
          ) : (
            <div
              className="purchase-table-wrap"
              style={{ border: 0, borderRadius: 0 }}
            >
              <table className="purchase-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>Reference</th>
                    <th className="pay-action-col">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paymentHistory.map((payment, index) => (
                    <tr key={payment.id}>
                      <td>{index + 1}</td>
                      <td>{formatDateTime(payment.paymentDate)}</td>
                      <td>{rupee(payment.amount)}</td>
                      <td>{payment.paymentMode}</td>
                      <td>{payment.referenceNo || "-"}</td>
                      <td className="pay-action-col">
                        <div className="pay-actions">
                          {/* EDIT: always */}
                          <button
                            type="button"
                            className="pay-action-btn edit"
                            onClick={() => setEditing(payment)}
                            title="Edit payment"
                            aria-label="Edit payment"
                          >
                            <Pencil size={15} />
                          </button>

                          {/* DELETE: only before it is saved to the database */}
                          {!payment.saved && (
                            <button
                              type="button"
                              className="pay-action-btn delete"
                              onClick={() => onRemove(payment.id)}
                              title="Delete payment"
                              aria-label="Delete payment"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="pay-summary">
          <div className="pay-box">
            <small>Already Paid</small>
            <strong>{rupee(paidAmount)}</strong>
          </div>

          <div className="pay-box pending">
            <small>Pending Amount</small>
            <strong>{rupee(pendingAmount)}</strong>
          </div>

          <div className={`pay-box status ${statusClass}`}>
            <small>Payment Status</small>
            <strong>
              {paymentStatus === "Unpaid" ? "Not Received" : paymentStatus}
            </strong>
          </div>
        </div>
      </div>

      {(open || editing) && (
        <PaymentModal
          key={editing ? editing.id : "new"}
          payment={editing}
          maxAmount={
            editing
              ? pendingAmount + Number(editing.amount || 0)
              : pendingAmount
          }
          onClose={closeModal}
          onSave={(data) =>
            editing ? onUpdate(editing.id, data) : onAdd(data)
          }
        />
      )}
    </section>
  );
}

/* =========================================================
   PIECE CFT / CUBIC METER CALCULATIONS
========================================================= */

const CFT_TO_CUBIC_METER = 0.0283168;

const getPieceCft = (piece) => {
  const width = Number(piece?.width) || 0;
  const height = Number(piece?.height) || 0;
  const inch = Number(piece?.inch) || 0;
  const count = Number(piece?.count) || 0;

  return (width * height * inch * count) / 1728;
};

const getPieceCubicMeter = (piece) =>
  getPieceCft(piece) * CFT_TO_CUBIC_METER;

const getPiecesTotals = (pieceList = []) =>
  pieceList.reduce(
    (totals, piece) => {
      const cft = getPieceCft(piece);
      return {
        cft: totals.cft + cft,
        cubicMeter: totals.cubicMeter + cft * CFT_TO_CUBIC_METER,
      };
    },
    { cft: 0, cubicMeter: 0 }
  );

/* =========================================================
   PAGE
========================================================= */

function NewPurchase() {
  const navigate = useNavigate();
  const { id } = useParams(); // present only on /master/purchase/edit/:id

  const {
    locations,
    itemCategories,
    itemOptions,
    pieceSizes,
    form,
    pieces,
    paymentHistory,
    loading,
    saving,
    refreshKey,
    toast,
    totalAmount,
    paidAmount,
    pendingAmount,
    paymentStatus,
    isEdit,
    isItem,
    isNewItem,
    showQuantity,
    closeToast,
    handleChange,
    handleTypeChange,
    handleCategoryChange,
    handleItemChange,
    handlePieceSizeChange,
    handlePieceChange,
    addPiece,
    removePiece,
    addPayment,
    updatePayment,
    removePayment,
    handleReset,
    handleSubmit,
  } = usePurchaseForm(id);

  // Synchronize calculated piece totals with the purchase form payload.
  const syncPieceTotals = (nextPieces) => {
    const totals = getPiecesTotals(nextPieces);
    handleChange({
      target: { name: "cft", value: totals.cft.toFixed(4) },
    });
    handleChange({
      target: { name: "cubicMeter", value: totals.cubicMeter.toFixed(6) },
    });
  };

  const onPieceSizeChange = (pieceId, pieceSizeId) => {
    const selectedSize = pieceSizes.find(
      (item) => String(item._id) === String(pieceSizeId)
    );
    const nextPieces = pieces.map((piece) =>
      piece.id === pieceId
        ? {
            ...piece,
            pieceSizeId,
            width: selectedSize ? Number(selectedSize.width) : "",
            height: selectedSize ? Number(selectedSize.height) : "",
            inch: selectedSize ? Number(selectedSize.inch) : "",
          }
        : piece
    );
    handlePieceSizeChange(pieceId, pieceSizeId);
    syncPieceTotals(nextPieces);
  };

  const onPieceCountChange = (pieceId, value) => {
    const nextPieces = pieces.map((piece) =>
      piece.id === pieceId ? { ...piece, count: value } : piece
    );
    handlePieceChange(pieceId, "count", value);
    syncPieceTotals(nextPieces);
  };

  const onAddPiece = () => {
    addPiece();
    syncPieceTotals(pieces);
  };

  const onRemovePiece = (pieceId) => {
    const nextPieces = pieces.filter((piece) => piece.id !== pieceId);
    removePiece(pieceId);
    syncPieceTotals(nextPieces);
  };

  useEffect(() => {
    if (isNewItem) syncPieceTotals(pieces);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieces, isNewItem]);

  const pieceTotals = getPiecesTotals(pieces);

  return (
    <div className="purchase-layout">
      {/* TOAST */}
      {toast.show && (
        <div className={`purchase-toast purchase-toast-${toast.type}`}>
          <div className="purchase-toast-icon">
            {toast.type === "success" ? (
              <CheckCircle size={21} />
            ) : (
              <AlertCircle size={21} />
            )}
          </div>

          <div className="purchase-toast-content">
            <strong>{toast.title}</strong>
            <span>{toast.message}</span>
          </div>

          <button
            type="button"
            className="purchase-toast-close"
            onClick={closeToast}
            aria-label="Close notification"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <Sidebar />

      <div className="purchase-main">
        <Header />

        <main className="purchase-content">
          {/* PAGE TITLE */}
          <div className="purchase-page-header">
            <div className="purchase-title">
              <ShoppingCart size={34} />
              <h1>{isEdit ? "Edit Purchase" : "New Purchase"}</h1>
            </div>

            <button
              type="button"
              className="purchase-back-btn"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={17} />
              Back
            </button>
          </div>

          <form onSubmit={handleSubmit} className="purchase-form">
            {/* 1. PURCHASE DETAILS */}
            <SectionCard number={1} title="Purchase Details">
              <div className="purchase-grid purchase-grid-5">
                <Field label="Purchase No" required>
                  <input
                    type="text"
                    name="purchaseNo"
                    value={form.purchaseNo}
                    onChange={handleChange}
                    placeholder="Enter purchase no"
                    required
                  />
                </Field>

                <Field label="Purchase Date" required>
                  <input
                    type="date"
                    name="purchaseDate"
                    value={form.purchaseDate}
                    onChange={handleChange}
                    required
                  />
                </Field>

                <Field label="Location" required>
                  <select
                    name="locationId"
                    value={form.locationId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Location</option>
                    {locations.map((location) => (
                      <option key={location._id} value={location._id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Type" required>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleTypeChange}
                    required
                  >
                    {PURCHASE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Category" required={isItem}>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleCategoryChange}
                    disabled={!isItem}
                    required={isItem}
                  >
                    <option value="">
                      {isItem ? "Select Category" : "Not applicable"}
                    </option>
                    {itemCategories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </SectionCard>

            {/* 2. STOCK DETAILS */}
            <SectionCard number={2} title="Stock Details">
              <div className={`purchase-stock ${isNewItem ? "with-pieces" : ""}`}>
                <div className="purchase-stock-left">
                  <Field label="Item" required>
                    <select
                      name="referenceId"
                      value={form.referenceId}
                      onChange={handleItemChange}
                      required
                    >
                      <option value="">Select Item</option>
                      {itemOptions.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {isNewItem && (
                    <div className="purchase-grid purchase-grid-2">
                      <Field label="CFT">
                        <input
                          type="number"
                          name="cft"
                          value={pieceTotals.cft.toFixed(4)}
                          readOnly
                          className="readonly"
                          tabIndex={-1}
                          placeholder="Auto calculated"
                          min="0"
                          step="any"
                        />
                      </Field>

                      <Field label="Cubic Meter">
                        <input
                          type="number"
                          name="cubicMeter"
                          value={pieceTotals.cubicMeter.toFixed(6)}
                          readOnly
                          className="readonly"
                          tabIndex={-1}
                          placeholder="Auto calculated"
                          min="0"
                          step="any"
                        />
                      </Field>
                    </div>
                  )}

                  {showQuantity && (
                    <div className="purchase-grid purchase-grid-2">
                      <Field label="Quantity" required>
                        <input
                          type="number"
                          name="quantity"
                          value={form.quantity}
                          onChange={handleChange}
                          placeholder="e.g. 50"
                          min="0"
                          step="any"
                        />
                      </Field>

                      <Field label="Unit" required>
                        <input
                          type="text"
                          name="unit"
                          value={form.unit}
                          onChange={handleChange}
                          placeholder="e.g. kg"
                        />
                      </Field>
                    </div>
                  )}
                </div>

                {isNewItem && (
                  <div className="purchase-pieces">
                    <div className="purchase-pieces-head">
                      <h3>Pieces Details</h3>

                      <button
                        type="button"
                        className="purchase-link-btn"
                        onClick={onAddPiece}
                      >
                        <Plus size={15} />
                        Add Piece
                      </button>
                    </div>

                    <div className="purchase-pieces-table">
                      <div
                        className="purchase-pieces-row purchase-pieces-labels"
                        style={{
                          gridTemplateColumns:
                            "minmax(130px, 1.2fr) repeat(6, minmax(70px, 0.8fr)) 36px",
                        }}
                      >
                        <span>Piece Size</span>
                        <span>Width</span>
                        <span>Height</span>
                        <span>Inch</span>
                        <span>Count (pcs)</span>
                        <span>CFT</span>
                        <span>Cubic Meter</span>
                        <span />
                      </div>

                      {pieces.map((piece) => (
                        <div
                          className="purchase-pieces-row"
                          key={piece.id}
                          style={{
                            gridTemplateColumns:
                              "minmax(130px, 1.2fr) repeat(6, minmax(70px, 0.8fr)) 36px",
                          }}
                        >
                          <select
                            value={piece.pieceSizeId}
                            onChange={(event) =>
                              onPieceSizeChange(piece.id, event.target.value)
                            }
                            required
                          >
                            <option value="">Select Size</option>
                            {pieceSizes.map((pieceSize) => (
                              <option key={pieceSize._id} value={pieceSize._id}>
                                {pieceSize.width} x {pieceSize.height} x{" "}
                                {pieceSize.inch}
                              </option>
                            ))}
                          </select>

                          <input
                            type="number"
                            value={piece.width}
                            readOnly
                            className="readonly"
                            tabIndex={-1}
                          />

                          <input
                            type="number"
                            value={piece.height}
                            readOnly
                            className="readonly"
                            tabIndex={-1}
                          />

                          <input
                            type="number"
                            value={piece.inch}
                            readOnly
                            className="readonly"
                            tabIndex={-1}
                          />

                          <input
                            type="number"
                            value={piece.count}
                            onChange={(event) =>
                              onPieceCountChange(piece.id, event.target.value)
                            }
                            min="0"
                            step="1"
                          />

                          <input
                            type="number"
                            value={getPieceCft(piece).toFixed(4)}
                            readOnly
                            className="readonly"
                            tabIndex={-1}
                          />

                          <input
                            type="number"
                            value={getPieceCubicMeter(piece).toFixed(6)}
                            readOnly
                            className="readonly"
                            tabIndex={-1}
                          />

                          <button
                            type="button"
                            className="purchase-icon-btn"
                            onClick={() => onRemovePiece(piece.id)}
                            aria-label="Remove piece"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* 3. SUPPLIER DETAILS */}
            <SectionCard number={3} title="Supplier Details">
              <div className="purchase-grid purchase-grid-supplier">
                <Field label="Supplier Name" required>
                  <input
                    type="text"
                    name="supplierName"
                    value={form.supplierName}
                    onChange={handleChange}
                    placeholder="Enter supplier name"
                  />
                </Field>

                <Field label="Phone">
                  <input
                    type="text"
                    name="supplierPhone"
                    value={form.supplierPhone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                  />
                </Field>

                <Field label="Address">
                  <textarea
                    name="supplierAddress"
                    value={form.supplierAddress}
                    onChange={handleChange}
                    placeholder="Enter address"
                    rows={2}
                  />
                </Field>
              </div>
            </SectionCard>

            {/* 4 + 5 : AMOUNT / PAYMENT */}
            <div className="purchase-two-col">
              {/* 4. AMOUNT DETAILS */}
              <SectionCard number={4} title="Amount Details">
                <div className="purchase-grid purchase-grid-3">
                  <Field label="Amount (₹)" required>
                    <input
                      type="number"
                      name="amount"
                      value={form.amount}
                      onChange={handleChange}
                      placeholder="e.g. 50000"
                      min="0"
                      step="any"
                    />
                  </Field>

                  <Field label="Tax Amount (₹)">
                    <input
                      type="number"
                      name="taxAmount"
                      value={form.taxAmount}
                      onChange={handleChange}
                      placeholder="e.g. 5000"
                      min="0"
                      step="any"
                    />
                  </Field>

                  <Field label="Total Amount (₹)">
                    <input
                      type="number"
                      value={totalAmount || ""}
                      placeholder="Auto calculated"
                      className="readonly"
                      readOnly
                      tabIndex={-1}
                    />
                  </Field>
                </div>
              </SectionCard>

              {/* 5. PAYMENT DETAILS */}
              <PaymentDetails
                totalAmount={totalAmount}
                paymentHistory={paymentHistory}
                paidAmount={paidAmount}
                pendingAmount={pendingAmount}
                paymentStatus={paymentStatus}
                onAdd={addPayment}
                onUpdate={updatePayment}
                onRemove={removePayment}
              />
            </div>

            {/* 6. REMARKS + ACTIONS */}
            <SectionCard number={6} title="Purchase Remarks">
              <div className="purchase-remarks-row">
                <textarea
                  name="remarks"
                  value={form.remarks}
                  onChange={handleChange}
                  placeholder="Enter remarks"
                  rows={3}
                />

                <div className="purchase-actions">
                  <button
                    type="button"
                    className="purchase-reset-btn"
                    onClick={handleReset}
                    disabled={saving}
                  >
                    <RotateCcw size={16} />
                    Reset
                  </button>

                  <button
                    type="submit"
                    className="purchase-save-btn"
                    disabled={saving || loading}
                  >
                    <Save size={16} />
                    {saving
                      ? "Saving..."
                      : isEdit
                      ? "Update Purchase"
                      : "Save Purchase"}
                  </button>
                </div>
              </div>
            </SectionCard>
          </form>

          {/* PURCHASE LIST (only on the new-purchase page) */}
          {!isEdit && <PurchaseList key={refreshKey} />}
        </main>
      </div>
    </div>
  );
}

export default NewPurchase;
