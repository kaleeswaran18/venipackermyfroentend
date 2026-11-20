
import { formatQuantity } from "../utils";

// variant: "new" | "used" | "simple"
const COLUMN_COUNT = { new: 6, used: 4, simple: 3 };

const getPieceCft = (piece) => {
  const width = Number(piece.width || 0);
  const height = Number(piece.height || 0);
  const inch = Number(piece.inch || 0);
  const count = Number(piece.count || 0);

  return (width * height * inch * count) / 1728;
};

const getCubicMeter = (cft) => cft * 0.0283168;

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
              rows.map((row, index) => {
                const pieces = row.pieces || [];

                const totalCft = pieces.reduce(
                  (total, piece) => total + getPieceCft(piece),
                  0
                );

                const totalCubicMeter = getCubicMeter(totalCft);

                return (
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
                          {pieces.length > 0 ? (
                            <table className="piece-table">
                              <thead>
                                <tr>
                                  <th>WIDTH</th>
                                  <th>HEIGHT</th>
                                  <th>INCH</th>
                                  <th>COUNT</th>
                                  <th>CFT</th>
                                  <th>CUBIC METER</th>
                                </tr>
                              </thead>

                              <tbody>
                                {pieces.map((piece, pieceIndex) => {
                                  const cft = getPieceCft(piece);
                                  const cubicMeter = getCubicMeter(cft);

                                  return (
                                    <tr
                                      key={
                                        piece._id || piece.id || pieceIndex
                                      }
                                    >
                                      <td>{piece.width}</td>
                                      <td>{piece.height}</td>
                                      <td>{piece.inch}</td>

                                      <td className="piece-count">
                                        {piece.count}
                                      </td>

                                      <td>{cft.toFixed(4)}</td>
                                      <td>{cubicMeter.toFixed(6)}</td>
                                    </tr>
                                  );
                                })}

                                <tr className="piece-total-row">
                                  <td colSpan={4}>
                                    <strong>TOTAL</strong>
                                  </td>
                                  <td>
                                    <strong>{totalCft.toFixed(4)}</strong>
                                  </td>
                                  <td>
                                    <strong>
                                      {totalCubicMeter.toFixed(6)}
                                    </strong>
                                  </td>
                                </tr>
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StockTable;
