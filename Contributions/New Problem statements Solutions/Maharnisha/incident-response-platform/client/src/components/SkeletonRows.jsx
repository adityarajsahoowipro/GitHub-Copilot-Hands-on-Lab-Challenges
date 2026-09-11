// Row-shaped placeholder shown while table/list data is loading.
export default function SkeletonRows({ rows = 5, columns = 6 }) {
  return (
    <div className="skeleton-table" aria-hidden="true">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div className="skeleton-row" key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <span className="skeleton-cell" key={colIndex} />
          ))}
        </div>
      ))}
    </div>
  );
}
