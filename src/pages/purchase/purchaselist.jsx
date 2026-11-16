import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit, Eye, Trash2 } from "lucide-react";
import api from "../../api/axios";

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-IN");

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB");
};

const getName = (value, fallback = "-") =>
  value?.name ||
  value?.itemName ||
  value?.title ||
  fallback;

function PurchaseList() {
  const navigate = useNavigate();

  const [purchases, setPurchases] = useState([]);
  const [items, setItems] = useState([]);
  const [nails, setNails] = useState([]);
  const [consumables, setConsumables] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // GET PURCHASES
  // =====================================================

  const loadPurchases = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        purchaseResponse,
        itemsResponse,
        nailsResponse,
        consumablesResponse,
      ] = await Promise.all([
        api.get("/purchases"),
        api.get("/items"),
        api.get("/nails"),
        api.get("/consumables"),
      ]);

      setPurchases(
        purchaseResponse.data?.data || []
      );

      setItems(
        itemsResponse.data?.data || []
      );

      setNails(
        nailsResponse.data?.data || []
      );

      setConsumables(
        consumablesResponse.data?.data || []
      );
    } catch (err) {
      console.error(
        "Load purchases error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to load purchases."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchases();
  }, []);

  // =====================================================
  // GET ITEM NAME
  // =====================================================

  const getReferenceName = (purchase) => {
    let list = [];

    if (purchase.type === "nail") {
      list = nails;
    } else if (purchase.type === "consumable") {
      list = consumables;
    } else {
      list = items;
    }

    const found = list.find(
      (item) =>
        String(item._id) ===
        String(purchase.referenceId)
    );

    return getName(
      found,
      purchase.referenceId || "-"
    );
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async (purchase) => {
    const confirmed = window.confirm(
      `Delete purchase ${
        purchase.purchaseNo || ""
      }?`
    );

    if (!confirmed) return;

    try {
      await api.delete(
        `/purchases/${purchase._id}`
      );

      setPurchases((current) =>
        current.filter(
          (item) =>
            item._id !== purchase._id
        )
      );
    } catch (err) {
      console.error(
        "Delete purchase error:",
        err
      );

      window.alert(
        err.response?.data?.message ||
          "Failed to delete purchase."
      );
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <section className="purchase-section">
      <div className="purchase-section-head">
        Purchase List
      </div>

      <div className="purchase-section-body">

        {error && (
          <div className="purchase-toast purchase-toast-error">
            {error}
          </div>
        )}

        <div className="purchase-table-wrap">
          <table className="purchase-table">

            <thead>
              <tr>
                <th>#</th>
                <th>Purchase No</th>
                <th>Date</th>
                <th>Location</th>
                <th>Type</th>
                <th>Category</th>
                <th>Item</th>
                <th>Supplier</th>
                <th>Amount</th>
                <th>Tax</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Pending</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {/* LOADING */}

              {loading && (
                <tr>
                  <td
                    colSpan="15"
                    className="purchase-empty"
                  >
                    Loading purchases...
                  </td>
                </tr>
              )}

              {/* EMPTY */}

              {!loading &&
                purchases.length === 0 && (
                  <tr>
                    <td
                      colSpan="15"
                      className="purchase-empty"
                    >
                      No purchases found.
                    </td>
                  </tr>
                )}

              {/* DATA */}

              {!loading &&
                purchases.length > 0 &&
                purchases.map(
                  (purchase, index) => (
                    <tr
                      key={purchase._id}
                    >
                      <td>
                        {index + 1}
                      </td>

                      <td>
                        {purchase.purchaseNo ||
                          "-"}
                      </td>

                      <td>
                        {formatDate(
                          purchase.purchaseDate
                        )}
                      </td>

                      <td>
                        {getName(
                          purchase.location
                        )}
                      </td>

                      <td>
                        {purchase.type || "-"}
                      </td>

                      <td>
                        {getName(
                          purchase.category
                        )}
                      </td>

                      <td>
                        {getReferenceName(
                          purchase
                        )}
                      </td>

                      <td>
                        {purchase.supplierName ||
                          "-"}
                      </td>

                      <td>
                        ₹
                        {formatMoney(
                          purchase.amount
                        )}
                      </td>

                      <td>
                        ₹
                        {formatMoney(
                          purchase.taxAmount
                        )}
                      </td>

                      <td>
                        ₹
                        {formatMoney(
                          purchase.totalAmount
                        )}
                      </td>

                      <td>
                        ₹
                        {formatMoney(
                          purchase.paidAmount
                        )}
                      </td>

                      <td>
                        ₹
                        {formatMoney(
                          purchase.pendingAmount
                        )}
                      </td>

                      <td>
                        {purchase.paymentStatus ||
                          "-"}
                      </td>

                      <td>
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                          }}
                        >

                          {/* VIEW */}

                          <button
                            type="button"
                            className="purchase-icon-btn"
                            title="View"
                            onClick={() =>
                              navigate(
                                `/master/purchase/${purchase._id}`
                              )
                            }
                          >
                            <Eye size={16} />
                          </button>

                          {/* EDIT */}

                          <button
                            type="button"
                            className="purchase-icon-btn"
                            title="Edit"
                            onClick={() =>
                              navigate(
                                `/master/purchase/edit/${purchase._id}`
                              )
                            }
                          >
                            <Edit size={16} />
                          </button>

                          {/* DELETE */}

                          <button
                            type="button"
                            className="purchase-icon-btn danger"
                            title="Delete"
                            onClick={() =>
                              handleDelete(
                                purchase
                              )
                            }
                          >
                            <Trash2 size={16} />
                          </button>

                        </div>
                      </td>
                    </tr>
                  )
                )}

            </tbody>

          </table>
        </div>

      </div>
    </section>
  );
}

export default PurchaseList;