import type { Workbook as ExcelWorkbook } from 'exceljs'

const INPUT_FILL = 'FFF2CC'
const OUTPUT_FILL = 'E2F0D9'
const HEADER_FILL = '1F4E78'
const BORDER_COLOUR = 'B7C9D6'

export async function createCycloneWavesWorkbook(windSpeed: number) {
  const { default: ExcelJS } = await import('exceljs')
  const workbook: ExcelWorkbook = new ExcelJS.Workbook()
  workbook.creator = 'Marine Calculators'
  workbook.subject = 'Cyclone generated wave estimates'
  workbook.title = 'Cyclone Generated Waves (Kumar et al., 2003)'
  workbook.created = new Date()
  workbook.calcProperties.fullCalcOnLoad = true

  const sheet = workbook.addWorksheet('Cyclone Waves', {
    views: [{ state: 'frozen', ySplit: 6, activeCell: 'B7' }],
    properties: { defaultRowHeight: 18 },
  })
  sheet.views = [{ state: 'frozen', ySplit: 6, showGridLines: false, activeCell: 'B7' }]
  sheet.columns = [
    { key: 'case', width: 12 },
    { key: 'wind', width: 20 },
    { key: 'height', width: 28 },
    { key: 'period', width: 20 },
    { key: 'pressure', width: 27 },
    { key: 'notes', width: 36 },
  ]

  sheet.mergeCells('A2:F2')
  sheet.getCell('A2').value = 'Cyclone Generated Waves (Kumar et al., 2003)'
  sheet.getCell('A2').font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FF1F1F1F' } }
  sheet.getCell('A3').value = 'Editable input cells are yellow. Green cells contain Excel formulas.'
  sheet.mergeCells('A3:F3')
  sheet.getCell('A3').font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF555555' } }
  sheet.mergeCells('A4:F4')
  sheet.getCell('A4').value = 'Use these empirical relationships as ballpark estimates. The original study reports poorer performance for Hs below 3 m.'
  sheet.getCell('A4').font = { name: 'Arial', size: 10, color: { argb: 'FF7F6000' } }

  const headers = ['Case', 'Wind speed, U10 (m/s)', 'Significant wave height, Hs (m)', 'Peak period, Tp (s)', 'Atmospheric pressure, pa (mbar)', 'Notes']
  const headerRow = sheet.getRow(6)
  headerRow.values = headers
  headerRow.height = 34
  headerRow.eachCell(cell => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${HEADER_FILL}` } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = { bottom: { style: 'thin', color: { argb: `FF${BORDER_COLOUR}` } } }
  })

  for (let rowNumber = 7; rowNumber <= 31; rowNumber += 1) {
    const row = sheet.getRow(rowNumber)
    row.getCell(1).value = rowNumber - 6
    row.getCell(2).value = rowNumber === 7 ? windSpeed : null
    row.getCell(3).value = { formula: `IF(B${rowNumber}="","",0.25*B${rowNumber})` }
    row.getCell(4).value = { formula: `IF(C${rowNumber}="","",4.5*C${rowNumber}^0.48)` }
    row.getCell(5).value = { formula: `IF(B${rowNumber}="","",1012.6-0.6077785*B${rowNumber}-0.01079967*B${rowNumber}^2)` }
    row.font = { name: 'Arial', size: 10, color: { argb: 'FF222222' } }
    row.alignment = { vertical: 'middle' }
    for (const column of [2, 6]) row.getCell(column).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${INPUT_FILL}` } }
    for (const column of [3, 4, 5]) row.getCell(column).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${OUTPUT_FILL}` } }
    for (let column = 1; column <= 6; column += 1) {
      row.getCell(column).border = { bottom: { style: 'hair', color: { argb: `FF${BORDER_COLOUR}` } } }
    }
  }

  sheet.getColumn(2).numFmt = '0.00'
  sheet.getColumn(3).numFmt = '0.00'
  sheet.getColumn(4).numFmt = '0.00'
  sheet.getColumn(5).numFmt = '0.0'
  sheet.getColumn(1).alignment = { horizontal: 'center' }
  sheet.getColumn(2).alignment = { horizontal: 'right' }
  sheet.getColumn(3).alignment = { horizontal: 'right' }
  sheet.getColumn(4).alignment = { horizontal: 'right' }
  sheet.getColumn(5).alignment = { horizontal: 'right' }
  sheet.getColumn(2).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
    if (rowNumber >= 7 && rowNumber <= 31) {
      cell.dataValidation = {
        type: 'decimal', operator: 'between', allowBlank: true, showErrorMessage: true,
        formulae: [0, 100], errorTitle: 'Invalid wind speed', error: 'Enter a wind speed between 0 and 100 m/s.',
      }
    }
  })
  sheet.autoFilter = 'A6:F31'

  sheet.getCell('A34').value = 'Equations'
  sheet.getCell('A34').font = { name: 'Arial', size: 11, bold: true, color: { argb: `FF${HEADER_FILL}` } }
  sheet.mergeCells('A35:F35')
  sheet.getCell('A35').value = 'Hs = 0.25 U10     Tp = 4.5 Hs^0.48     pa = 1012.6 - 0.6077785 U10 - 0.01079967 U10^2'
  sheet.getCell('A35').font = { name: 'Arial', size: 10 }
  sheet.mergeCells('A37:F37')
  sheet.getCell('A37').value = 'References: Kumar, Mandal & Kumar (2003), Ocean Engineering 30(17), 2239–2253; Wooten (2011), Journal of Applied Sciences 11(15), 2712–2722.'
  sheet.getCell('A37').font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF555555' } }
  sheet.getCell('A37').alignment = { wrapText: true }
  sheet.getRow(37).height = 30

  return workbook
}

export async function downloadCycloneWavesWorkbook(windSpeed: number) {
  const workbook = await createCycloneWavesWorkbook(windSpeed)
  const data = await workbook.xlsx.writeBuffer()
  const blob = new Blob([data as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'cyclone-generated-waves.xlsx'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
