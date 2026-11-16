
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ShoppingCart, ArrowLeft, Edit, ChevronDown } from "lucide-react";

import api from "../../api/axios";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import "./purchase.css";
import "./purchaseview.css";

const formatMoney = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB");
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getName = (value, fallback = "-") =>
  value?.name || value?.itemName || value?.title || fallback;

const toId = (value) =>
  (value && typeof value === "object" ? value._id : value) || "";

const getValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";

  if (typeof value === "object") {
    return value.name || value.itemName || value.title || JSON.stringify(value);
  }

  return String(value);
};

function Section({ title, children }) {
  return (
    <section className="purchase-section">
      <div className="purchase-section-head">{title}</div>
      <div className="purchase-section-body">{children}</div>
    </section>
  );
}

function Info({ label, children }) {
  return (
    <div className="pv-item">
      <span>{label}</span>
      <strong>{children || "-"}</strong>
    </div>
  );
}

function HistoryCard({ title, date, children }) {
  return (
    <div className="pv-history-card">
      <div className="pv-history-card-head">
        <strong>{title}</strong>
        <span>{formatDateTime(date)}</span>
      </div>
      <div className="pv-history-card-body">{children}</div>
    </div>
  );
}

function ChangeRow({ label, oldValue, newValue }) {
  return (
    <div className="pv-change-row">
      <strong>{label}</strong>
      <div className="pv-change-values">
        <span className="pv-old-value">{getValue(oldValue)}</span>
        <span className="pv-change-arrow">→</span>
        <span className="pv-new-value">{getValue(newValue)}</span>
      </div>
    </div>
  );
}

function PieceTable({ pieces = [] }) {
  if (!pieces.length) return <p>No piece details.</p>;

  return (
    <div className="purchase-table-wrap">
      <table className="purchase-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Piece Size</th>
            <th>Width</th>
            <th>Inch</th>
            <th>Feet</th>
            <th>Count (pcs)</th>
          </tr>
        </thead>
        <tbody>
          {pieces.map((piece, index) => (
            <tr key={piece._id || index}>
              <td>{index + 1}</td>
              <td>
                {piece.width} x {piece.inch} x {piece.feet}
              </td>
              <td>{piece.width}</td>
              <td>{piece.inch}</td>
              <td>{piece.feet}</td>
              <td>{piece.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StockSnapshot({ stock }) {
  if (!stock) return <p>No stock snapshot available.</p>;

  return (
    <>
      <div className="pv-grid">
        <Info label="Quantity">{stock.quantity}</Info>
        <Info label="Current Stock">{stock.currentStock}</Info>
        <Info label="Unit">{stock.unit}</Info>
        <Info label="CFT">{stock.cft}</Info>
        <Info label="Cubic Meter">{stock.cubicMeter}</Info>
      </div>

      {stock.pieces?.length > 0 && (
        <PieceTable pieces={stock.pieces} />
      )}
    </>
  );
}

function PurchaseView() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [purchase, setPurchase] = useState(null);
  const [itemName, setItemName] = useState("-");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false);
  const [showStockHistory, setShowStockHistory] = useState(false);
  const [showSupplierHistory, setShowSupplierHistory] = useState(false);
  const [showAmountHistory, setShowAmountHistory] = useState(false);
  const [showRemarksHistory, setShowRemarksHistory] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/purchases/${id}`);
        const data = response.data?.data;

        setPurchase(data);

        if (data) {
          try {
            const endpoint =
              data.type === "nail"
                ? "/nails"
                : data.type === "consumable"
                ? "/consumables"
                : "/items";

            const listResponse = await api.get(endpoint);

            const found = (listResponse.data?.data || []).find(
              (item) =>
                String(item._id) === String(toId(data.referenceId))
            );

            setItemName(getName(found, toId(data.referenceId) || "-"));
          } catch (itemError) {
            console.error("Item name load error:", itemError);
          }
        }
      } catch (err) {
        console.error("Load purchase error:", err);
        setError(err.response?.data?.message || "Failed to load purchase.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const statusClass =
    purchase?.paymentStatus === "Paid"
      ? "paid"
      : purchase?.paymentStatus === "Partially Paid"
      ? "partial"
      : "unpaid";

  const isNewItem =
    (purchase?.pieces?.length || 0) > 0 ||
    Number(purchase?.cft || 0) > 0 ||
    Number(purchase?.cubicMeter || 0) > 0;

  // Helper: newest history entry first
  const sortNewestFirst = (entries = []) =>
    [...entries].sort((a, b) => {
      const dateA = new Date(a.changedAt || 0).getTime();
      const dateB = new Date(b.changedAt || 0).getTime();
      return dateB - dateA;
    });

  // Section-wise history filtering
  const purchaseHistory = sortNewestFirst(
    (purchase?.history || []).filter(
      (entry) => entry.section === "purchase"
    )
  );

  const supplierHistory = sortNewestFirst(
    (purchase?.history || []).filter(
      (entry) => entry.section === "supplier"
    )
  );

  const amountHistory = sortNewestFirst(
    (purchase?.history || []).filter(
      (entry) => entry.section === "amount"
    )
  );

  const remarksHistory = sortNewestFirst(
    (purchase?.history || []).filter(
      (entry) => entry.section === "remarks"
    )
  );

  // Stock history belonging to this purchase only
  const stockHistory = sortNewestFirst(
    (purchase?.openingStockId?.stockHistory || []).filter(
      (entry) =>
        String(toId(entry.referenceId)) === String(purchase?._id)
    )
  );

  // Initial purchase snapshot saved when the purchase was created
  const initialPurchase =
    purchase?.initialSnapshot || purchase;

  // Payment rows - Latest payment first
  const paymentHistory = sortNewestFirst(purchase?.paymentHistory || []);

  // Payment edit history - Latest edit first
  const paymentEditHistory = (purchase?.paymentHistory || [])
    .flatMap((payment, paymentIndex) => {
      const edits = payment.editHistory || [];

      return edits.map((edit, editIndex) => ({
        ...edit,
        paymentId: payment._id,
        paymentNumber: paymentIndex + 1,
        editNumber: edits.length - editIndex,
      }));
    })
    .sort((a, b) => {
      const dateA = new Date(a.changedAt || 0).getTime();
      const dateB = new Date(b.changedAt || 0).getTime();
      return dateB - dateA;
    });

  // Number stock updates in their original chronological order
  const stockUpdateCount = stockHistory.filter(
    (entry) => entry.operation !== "PURCHASE_IN"
  ).length;

  return (
    <div className="purchase-layout">
      <Sidebar />

      <div className="purchase-main">
        <Header />

        <main className="purchase-content">
          <div className="purchase-page-header">
            <div className="purchase-title">
              <ShoppingCart size={34} />
              <h1>Purchase Details</h1>
            </div>

            <div className="pv-actions">
              <button
                type="button"
                className="purchase-back-btn"
                onClick={() => navigate("/master/purchase")}
              >
                <ArrowLeft size={17} />
                Back
              </button>

              {purchase && (
                <button
                  type="button"
                  className="purchase-save-btn"
                  onClick={() => navigate(`/master/purchase/edit/${id}`)}
                >
                  <Edit size={16} />
                  Edit
                </button>
              )}
            </div>
          </div>

          {loading && <p className="pv-message">Loading purchase...</p>}

          {!loading && error && (
            <p className="pv-message pv-error">{error}</p>
          )}

          {!loading && !error && purchase && (
            <div className="purchase-form">
              {/* 1. PURCHASE DETAILS */}
              <Section title="1. Purchase Details">
                <div className="pv-grid">
                  <Info label="Purchase No">{purchase.purchaseNo}</Info>
                  <Info label="Purchase Date">
                    {formatDate(purchase.purchaseDate)}
                  </Info>
                  <Info label="Location">{getName(purchase.location)}</Info>
                  <Info label="Type">{purchase.type}</Info>
                  <Info label="Category">{getName(purchase.category)}</Info>
                </div>

                {purchaseHistory.length > 0 && (
                  <div className="pv-history">
                    <button
                      className="pv-history-toggle"
                      onClick={() =>
                        setShowPurchaseHistory(!showPurchaseHistory)
                      }
                    >
                      <span>
                        Purchase Details Update History (
                        {purchaseHistory.length})
                      </span>
                      <ChevronDown
                        className={showPurchaseHistory ? "rotated" : ""}
                      />
                    </button>

                    {showPurchaseHistory && (
                      <div className="pv-history-content">
                        <HistoryCard
                          title="Initial Purchase Details"
                          date={purchase.createdAt}
                        >
                          <div className="pv-grid">
                            <Info label="Purchase No">
                              {initialPurchase?.purchaseNo}
                            </Info>
                            <Info label="Purchase Date">
                              {formatDate(initialPurchase?.purchaseDate)}
                            </Info>
                            <Info label="Amount">
                              {formatMoney(initialPurchase?.amount)}
                            </Info>
                            <Info label="Tax">
                              {formatMoney(initialPurchase?.taxAmount)}
                            </Info>
                            <Info label="Total">
                              {formatMoney(initialPurchase?.totalAmount)}
                            </Info>
                          </div>
                        </HistoryCard>

                        {purchaseHistory.map((history, index) => (
                          <HistoryCard
                            key={history._id || index}
                            title={`Update ${purchaseHistory.length - index}`}
                            date={history.changedAt}
                          >
                            {["purchaseNo", "purchaseDate"].map((field) => {
                              const oldValue = history.oldData?.[field];
                              const newValue = history.newData?.[field];

                              if (
                                JSON.stringify(oldValue) ===
                                JSON.stringify(newValue)
                              ) {
                                return null;
                              }

                              return (
                                <ChangeRow
                                  key={field}
                                  label={field}
                                  oldValue={
                                    field === "purchaseDate"
                                      ? formatDate(oldValue)
                                      : oldValue
                                  }
                                  newValue={
                                    field === "purchaseDate"
                                      ? formatDate(newValue)
                                      : newValue
                                  }
                                />
                              );
                            })}
                          </HistoryCard>
                        ))}

                        <HistoryCard title="Latest Purchase Details">
                          <div className="pv-grid">
                            <Info label="Purchase No">
                              {purchase.purchaseNo}
                            </Info>
                            <Info label="Purchase Date">
                              {formatDate(purchase.purchaseDate)}
                            </Info>
                            <Info label="Supplier">
                              {purchase.supplierName}
                            </Info>
                          </div>
                        </HistoryCard>
                      </div>
                    )}
                  </div>
                )}
              </Section>

              {/* 2. STOCK DETAILS */}
              <Section title="2. Stock Details">
                <div className="pv-grid">
                  <Info label="Item">{itemName}</Info>

                  {isNewItem ? (
                    <>
                      <Info label="CFT">{purchase.cft}</Info>
                      <Info label="Cubic Meter">{purchase.cubicMeter}</Info>
                    </>
                  ) : (
                    <>
                      <Info label="Quantity">{purchase.quantity}</Info>
                      <Info label="Unit">{purchase.unit}</Info>
                    </>
                  )}
                </div>

                {purchase.pieces?.length > 0 && (
                  <div className="pv-gap">
                    <PieceTable pieces={purchase.pieces} />
                  </div>
                )}

                {stockHistory.length > 0 && (
                  <div className="pv-history">
                    <button
                      className="pv-history-toggle"
                      onClick={() => setShowStockHistory(!showStockHistory)}
                    >
                      <span>
                        Stock Update History ({stockHistory.length})
                      </span>
                      <ChevronDown
                        className={showStockHistory ? "rotated" : ""}
                      />
                    </button>

                    {showStockHistory && (
                      <div className="pv-history-content">
                        {stockHistory.map((entry, index) => {
                          const stockUpdateNumber =
                            stockUpdateCount -
                            stockHistory
                              .slice(0, index)
                              .filter(
                                (item) => item.operation !== "PURCHASE_IN"
                              ).length;

                          return (
                            <HistoryCard
                              key={entry._id || index}
                              title={
                                entry.operation === "PURCHASE_IN"
                                  ? "Initial Purchase Stock"
                                  : `Stock Update ${stockUpdateNumber}`
                              }
                              date={entry.changedAt}
                            >
                              <div className="pv-stock-comparison">
                                <div>
                                  <h4>Before Update</h4>
                                  <StockSnapshot stock={entry.oldStock} />
                                </div>

                                <div>
                                  <h4>After Update</h4>
                                  <StockSnapshot stock={entry.newStock} />
                                </div>
                              </div>
                            </HistoryCard>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Section>

              {/* 3. SUPPLIER DETAILS */}
              <Section title="3. Supplier Details">
                <div className="pv-grid pv-grid-3">
                  <Info label="Supplier Name">{purchase.supplierName}</Info>
                  <Info label="Phone">{purchase.supplierPhone}</Info>
                  <Info label="Address">{purchase.supplierAddress}</Info>
                </div>

                {supplierHistory.length > 0 && (
                  <div className="pv-history">
                    <button
                      className="pv-history-toggle"
                      onClick={() =>
                        setShowSupplierHistory(!showSupplierHistory)
                      }
                    >
                      <span>
                        Supplier Update History ({supplierHistory.length})
                      </span>
                      <ChevronDown
                        className={showSupplierHistory ? "rotated" : ""}
                      />
                    </button>

                    {showSupplierHistory && (
                      <div className="pv-history-content">
                        {supplierHistory.map((history, index) => (
                          <HistoryCard
                            key={history._id || index}
                            title={`Supplier Update ${
                              supplierHistory.length - index
                            }`}
                            date={history.changedAt}
                          >
                            {[
                              "supplierName",
                              "supplierPhone",
                              "supplierAddress",
                            ].map((field) => {
                              const oldValue = history.oldData?.[field];
                              const newValue = history.newData?.[field];

                              if (oldValue === newValue) return null;

                              return (
                                <ChangeRow
                                  key={field}
                                  label={field}
                                  oldValue={oldValue}
                                  newValue={newValue}
                                />
                              );
                            })}
                          </HistoryCard>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Section>

              {/* 4. AMOUNT DETAILS */}
              <Section title="4. Amount Details">
                <div className="pv-grid">
                  <Info label="Amount">{formatMoney(purchase.amount)}</Info>
                  <Info label="Tax">{formatMoney(purchase.taxAmount)}</Info>
                  <Info label="Total">{formatMoney(purchase.totalAmount)}</Info>
                  <Info label="Paid">{formatMoney(purchase.paidAmount)}</Info>
                  <Info label="Pending">
                    {formatMoney(purchase.pendingAmount)}
                  </Info>
                </div>

                <div className="pv-gap">
                  <span className={`pv-badge ${statusClass}`}>
                    {purchase.paymentStatus || "Unpaid"}
                  </span>
                </div>

                {amountHistory.length > 0 && (
                  <div className="pv-history">
                    <button
                      className="pv-history-toggle"
                      onClick={() => setShowAmountHistory(!showAmountHistory)}
                    >
                      <span>
                        Amount Update History ({amountHistory.length})
                      </span>
                      <ChevronDown
                        className={showAmountHistory ? "rotated" : ""}
                      />
                    </button>

                    {showAmountHistory && (
                      <div className="pv-history-content">
                        {amountHistory.map((history, index) => (
                          <HistoryCard
                            key={history._id || index}
                            title={`Amount Update ${
                              amountHistory.length - index
                            }`}
                            date={history.changedAt}
                          >
                            {["amount", "taxAmount", "totalAmount"].map(
                              (field) => {
                                const oldValue = history.oldData?.[field];
                                const newValue = history.newData?.[field];

                                if (oldValue === newValue) return null;

                                return (
                                  <ChangeRow
                                    key={field}
                                    label={field}
                                    oldValue={formatMoney(oldValue)}
                                    newValue={formatMoney(newValue)}
                                  />
                                );
                              }
                            )}
                          </HistoryCard>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Section>

              {/* 5. PAYMENT HISTORY */}
              <Section title="5. Payment History">
                <div className="purchase-table-wrap">
                  <table className="purchase-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Date</th>
                        <th>Amount (₹)</th>
                        <th>Mode</th>
                        <th>Reference No</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>

                    <tbody>
                      {!purchase.paymentHistory?.length ? (
                        <tr>
                          <td colSpan="6" className="purchase-empty">
                            No payments added.
                          </td>
                        </tr>
                      ) : (
                        paymentHistory.map((payment, index) => (
                          <tr key={payment._id || index}>
                            <td>{index + 1}</td>
                            <td>{formatDate(payment.paymentDate)}</td>
                            <td>{formatMoney(payment.amount)}</td>
                            <td>{payment.paymentMode || "-"}</td>
                            <td>{payment.referenceNo || "-"}</td>
                            <td>{payment.remarks || "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {paymentEditHistory.length > 0 && (
                  <div className="pv-history">
                    <div className="pv-history-title">
                      Payment Edit History ({paymentEditHistory.length})
                    </div>

                    <div className="pv-history-content">
                      {paymentEditHistory.map((edit, index) => (
                        <HistoryCard
                          key={edit._id || index}
                          title={`Payment ${edit.paymentNumber} - Edit ${edit.editNumber}`}
                          date={edit.changedAt}
                        >
                          {edit.oldAmount !== undefined && (
                            <ChangeRow
                              label="Amount"
                              oldValue={formatMoney(edit.oldAmount)}
                              newValue={formatMoney(edit.newAmount)}
                            />
                          )}

                          {edit.oldPaymentDate !== undefined && (
                            <ChangeRow
                              label="Payment Date"
                              oldValue={formatDateTime(edit.oldPaymentDate)}
                              newValue={formatDateTime(edit.newPaymentDate)}
                            />
                          )}

                          {edit.oldPaymentMode !== undefined && (
                            <ChangeRow
                              label="Payment Mode"
                              oldValue={edit.oldPaymentMode}
                              newValue={edit.newPaymentMode}
                            />
                          )}

                          {edit.oldRemarks !== undefined && (
                            <ChangeRow
                              label="Remarks"
                              oldValue={edit.oldRemarks}
                              newValue={edit.newRemarks}
                            />
                          )}
                        </HistoryCard>
                      ))}
                    </div>
                  </div>
                )}
              </Section>

              {/* 6. REMARKS */}
              <Section title="6. Purchase Remarks">
                <p className="pv-remarks">{purchase.remarks || "-"}</p>

                {remarksHistory.length > 0 && (
                  <div className="pv-history">
                    <button
                      className="pv-history-toggle"
                      onClick={() =>
                        setShowRemarksHistory(!showRemarksHistory)
                      }
                    >
                      <span>
                        Remarks Update History ({remarksHistory.length})
                      </span>
                      <ChevronDown
                        className={showRemarksHistory ? "rotated" : ""}
                      />
                    </button>

                    {showRemarksHistory && (
                      <div className="pv-history-content">
                        {remarksHistory.map((history, index) => (
                          <HistoryCard
                            key={history._id || index}
                            title={`Remarks Update ${
                              remarksHistory.length - index
                            }`}
                            date={history.changedAt}
                          >
                            <ChangeRow
                              label="Remarks"
                              oldValue={history.oldData?.remarks}
                              newValue={history.newData?.remarks}
                            />
                          </HistoryCard>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default PurchaseView;
