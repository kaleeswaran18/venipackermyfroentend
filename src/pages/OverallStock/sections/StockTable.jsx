import { formatQuantity } from "../utils";

// variant: "new" | "used" | "simple"
const COLUMN_COUNT = { new: 6, used: 4, simple: 3 };

function StockTable({ title, nameHeader, rows, variant, scopeName }) {
  return (
    <div className="stock-panel">
      <div className="stock-panel-header">
        <h3>{title}</h3>
        <p>
          {rows.length} {rows.length === 1 ? "item" : "items"} available in{" "}
          {scopeName}
        </p>
      </div>

      <div className="stock-panel-scroll">
        <table className="stock-table">
          <thead>
            <tr>
              <th className="col-no">S.NO</th>

              {variant !== "simple" && <th>CATEGORY</th>}

              <th className="col-left">{nameHeader}</th>

              {variant === "new" ? (
                <>
                  <th>CFT</th>
                  <th>CUBIC METER</th>
                  <th className="col-left">PIECES</th>
                </>
              ) : (
                <th>OPENING STOCK</th>
              )}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMN_COUNT[variant]} className="empty-cell">
                  No opening stock found.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.id || index}>
                  <td className="col-no">{index + 1}</td>

                  {variant !== "simple" && (
                    <td>
                      <span className="chip">{row.category}</span>
                    </td>
                  )}

                  <td className="col-left col-name">{row.name}</td>

                  {variant === "new" ? (
                    <>
                      <td>{row.cft ?? "-"}</td>
                      <td>{row.cubicMeter ?? "-"}</td>

                      <td className="col-left col-pieces">
                        {row.pieces && row.pieces.length > 0 ? (
                          <table className="piece-table">
                            <thead>
                              <tr>
                                <th>WIDTH</th>
                                <th>INCH</th>
                                <th>FEET</th>
                                <th>COUNT</th>
                              </tr>
                            </thead>

                            <tbody>
                              {row.pieces.map((piece, pieceIndex) => (
                                <tr
                                  key={piece._id || piece.id || pieceIndex}
                                >
                                  <td>{piece.width}</td>
                                  <td>{piece.inch}</td>
                                  <td>{piece.feet}</td>
                                  <td className="piece-count">
                                    {piece.count}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          "-"
                        )}
                      </td>
                    </>
                  ) : (
                    <td className="col-stock">{formatQuantity(row)}</td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StockTable;