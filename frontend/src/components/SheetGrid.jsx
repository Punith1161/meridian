import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

export function SheetGrid({ sheet, onDataChange }) {
  if (!sheet) {
    return <div>Loading...</div>;
  }

  const columnDefs = sheet.data.cols.map((col, idx) => ({
    field: `col_${idx}`,
    headerName: col,
    editable: true,
    flex: 1,
  }));

  const rowData = sheet.data.rows.map((row, idx) => {
    const obj = { id: idx };
    row.forEach((cell, cellIdx) => {
      obj[`col_${cellIdx}`] = cell ?? '';
    });
    return obj;
  });

  const handleCellValueChanged = (event) => {
    const newData = [...sheet.data.rows];
    const colIndex = parseInt(event.colDef.field.split('_')[1]);
    if (!newData[event.rowIndex]) {
      newData[event.rowIndex] = [];
    }
    newData[event.rowIndex][colIndex] = event.newValue;
    
    onDataChange({
      ...sheet.data,
      rows: newData,
    });
  };

  return (
    <div className="ag-theme-meridian h-full">
      <AgGridReact
        columnDefs={columnDefs}
        rowData={rowData}
        onCellValueChanged={handleCellValueChanged}
        defaultColDef={{ filter: false, sortable: false, resizable: true }}
      />
    </div>
  );
}
