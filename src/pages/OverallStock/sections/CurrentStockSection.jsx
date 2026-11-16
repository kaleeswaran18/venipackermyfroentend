import { useMemo } from "react";
import { Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getId, getName, sumNumbers } from "../utils";

function CurrentStockSection({
  overallStocks,
  location,
  company,
  locationName,
  companyName,
}) {
  const navigate = useNavigate();
  const currentStockRows = useMemo(() => {
    return overallStocks.filter((stock) => {
      const stockLocationId = getId(stock.locationId);
      const stockCategoryId = getId(stock.categoryId);

      const locationMatches =
        !location || String(stockLocationId) === String(location);

      const companyMatches =
        !company || String(stockCategoryId) === String(company);

      return locationMatches && companyMatches;
    });
  }, [overallStocks, location, company]);

  const currentStockFields = useMemo(() => {
    const keys = [];

    currentStockRows.forEach((row) => {
      Object.keys(row.values || {}).forEach((key) => {
        if (!keys.includes(key)) keys.push(key);
      });
    });

    return keys;
  }, [currentStockRows]);

  return (
    <section className="overall-card">
      <div className="card-heading">
        <span className="heading-icon heading-icon-orange">
          <Package size={26} />
        </span>

        <h2>
          Current Stock - {locationName} ({companyName})
        </h2>

       <div className="card-heading-actions">
  <button
    type="button"
    className="btn-outline"
    onClick={() => navigate("/daily-history")}
  >
    View All
  </button>
</div>
      </div>

      <div className="table-scroll">
        <table className="current-table">
          <thead>
            <tr>
              <th className="col-no">#</th>
              <th>Product</th>

              {currentStockFields.map((field) => (
                <th key={field}>{field}</th>
              ))}

              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            {currentStockRows.length === 0 ? (
              <tr>
                <td colSpan={3 + currentStockFields.length}>
                  No current stock available
                </td>
              </tr>
            ) : (
              currentStockRows.map((row, index) => {
                const numericValues = currentStockFields.map((field) =>
                  Number(row.values?.[field] || 0)
                );

                return (
                  <tr
                    key={row._id || `${getId(row.productId)}-${index}`}
                  >
                    <td className="col-no">{index + 1}</td>

                    <td className="col-product">{getName(row.productId)}</td>

                    {currentStockFields.map((field) => (
                      <td key={field} className="num">
                        {row.values?.[field] ?? 0}
                      </td>
                    ))}

                    <td className="total">{sumNumbers(numericValues)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default CurrentStockSection;