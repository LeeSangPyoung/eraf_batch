/**
 * Export data array to CSV file and trigger download
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Column definitions [{key, label}]
 * @param {string} filename - Output filename (without .csv)
 */
export const exportToCSV = (data, columns, filename = 'export') => {
  if (!data || data.length === 0) return;

  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const separator = ',';

  // Header row
  const header = columns.map((col) => escapeCSV(col.label)).join(separator);

  // Data rows
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        return escapeCSV(value != null ? String(value) : '');
      })
      .join(separator),
  );

  const csv = BOM + [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  window.URL.revokeObjectURL(url);
};

function escapeCSV(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
