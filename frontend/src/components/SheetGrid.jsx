import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

export function SheetGrid({ sheet, onDataChange }) {
  const { theme } = useContext(ThemeContext);
  
  if (!sheet) {
    return <div>Loading...</div>;
  }

  const columnDefs = sheet.data.cols.map((col, idx) => ({
    field: `col_${idx}`,
    headerName: col.key,
    editable: true,
    flex: 1,
  }));

  const rowData = sheet.data.rows.map((row, idx) => {
    const obj = { id: idx };
    row.forEach((cell, cellIdx) => {
      obj[`col_${cellIdx}`] = cell.value || '';
    });
    return obj;
  });

  const handleCellValueChanged = (event) => {
    const newData = [...sheet.data.rows];
    const colIndex = parseInt(event.colDef.field.split('_')[1]);
    if (!newData[event.rowIndex]) {
      newData[event.rowIndex] = [];
    }
    if (!newData[event.rowIndex][colIndex]) {
      newData[event.rowIndex][colIndex] = {};
    }
    newData[event.rowIndex][colIndex].value = event.newValue;
    
    onDataChange({
      ...sheet.data,
      rows: newData,
    });
  };

  return (
    <div className={`ag-theme-quartz-${theme === 'light' ? 'light' : 'dark'} h-full`}>
      <AgGridReact
        columnDefs={columnDefs}
        rowData={rowData}
        onCellValueChanged={handleCellValueChanged}
        defaultColDef={{ filter: true, sortable: true }}
      />
    </div>
  );
}
