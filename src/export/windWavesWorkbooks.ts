import type { Workbook as ExcelWorkbook, Worksheet } from 'exceljs'
import type { CarterInput, HolthuijsenInput } from '../engineering/waves/windWaves'

const INPUT_FILL = 'FFF2CC'
const OUTPUT_FILL = 'E2F0D9'
const WORKING_FILL = 'DDEBF7'
const HEADER_FILL = '1F4E78'
const BORDER_COLOUR = 'B7C9D6'

function styleSheet(sheet: Worksheet, title: string, subtitle: string, lastColumn: string) {
  sheet.views = [{ state: 'frozen', ySplit: 6, showGridLines: false, activeCell: 'B7' }]
  sheet.mergeCells(`A2:${lastColumn}2`)
  sheet.getCell('A2').value = title
  sheet.getCell('A2').font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FF1F1F1F' } }
  sheet.mergeCells(`A3:${lastColumn}3`)
  sheet.getCell('A3').value = 'Editable input cells are yellow. Green cells contain results; blue cells show intermediate calculations.'
  sheet.getCell('A3').font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF555555' } }
  sheet.mergeCells(`A4:${lastColumn}4`)
  sheet.getCell('A4').value = subtitle
  sheet.getCell('A4').font = { name: 'Arial', size: 10, color: { argb: 'FF7F6000' } }
}

function styleHeader(sheet: Worksheet, headers: string[]) {
  const row = sheet.getRow(6)
  row.values = headers
  row.height = 38
  row.eachCell(cell => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${HEADER_FILL}` } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = { bottom: { style: 'thin', color: { argb: `FF${BORDER_COLOUR}` } } }
  })
}

function styleDataRow(sheet: Worksheet, rowNumber: number, inputColumns: number[], outputColumns: number[], workingColumns: number[] = []) {
  const row = sheet.getRow(rowNumber)
  row.font = { name: 'Arial', size: 10, color: { argb: 'FF222222' } }
  row.alignment = { vertical: 'middle' }
  for (const column of inputColumns) row.getCell(column).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${INPUT_FILL}` } }
  for (const column of outputColumns) row.getCell(column).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${OUTPUT_FILL}` } }
  for (const column of workingColumns) row.getCell(column).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${WORKING_FILL}` } }
  for (let column = 1; column <= sheet.columnCount; column += 1) row.getCell(column).border = { bottom: { style: 'hair', color: { argb: `FF${BORDER_COLOUR}` } } }
}

function addDecimalValidation(sheet: Worksheet, columns: number[], minimum: number, maximum: number, message: string) {
  for (const column of columns) {
    for (let row = 7; row <= 31; row += 1) {
      sheet.getCell(row, column).dataValidation = {
        type: 'decimal', operator: 'between', allowBlank: true, showErrorMessage: true,
        formulae: [minimum, maximum], errorTitle: 'Invalid input', error: message,
      }
    }
  }
}

async function newWorkbook(title: string, subject: string) {
  const { default: ExcelJS } = await import('exceljs')
  const workbook: ExcelWorkbook = new ExcelJS.Workbook()
  workbook.creator = 'Marine Calculators'
  workbook.title = title
  workbook.subject = subject
  workbook.created = new Date()
  workbook.calcProperties.fullCalcOnLoad = true
  return workbook
}

async function saveWorkbook(workbook: ExcelWorkbook, filename: string) {
  const data = await workbook.xlsx.writeBuffer()
  const blob = new Blob([data as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function createHolthuijsenWorkbook(input: HolthuijsenInput) {
  const workbook = await newWorkbook('Fetch Limited Waves (Holthuijsen)', 'Fetch- and depth-limited wind-wave estimates')
  const sheet = workbook.addWorksheet('Wave Growth', { properties: { defaultRowHeight: 18 } })
  sheet.columns = [12,18,16,16,14,14,14,14,23,18,26,32].map(width => ({ width }))
  styleSheet(sheet, 'Fetch Limited Waves (Holthuijsen, 2006)', 'The workbook follows the Breugem and Holthuijsen formulation used by the web calculator.', 'L')
  styleHeader(sheet, ['Case','Wind speed, U10 (m/s)','Fetch, F (km)','Water depth, h (m)','Depth term, DH','Fetch term, FH','Depth term, DT','Fetch term, FT','Significant wave height, Hs (m)','Peak period, Tp (s)','Time until fetch limited (hours)','Notes'])
  for (let row = 7; row <= 31; row += 1) {
    const current = row === 7
    sheet.getCell(row, 1).value = row - 6
    sheet.getCell(row, 2).value = current ? input.windSpeed : null
    sheet.getCell(row, 3).value = current ? input.fetch : null
    sheet.getCell(row, 4).value = current ? input.waterDepth : null
    sheet.getCell(row, 5).value = { formula: `IF(OR(B${row}="",D${row}=""),"",TANH(0.343*(9.81*D${row}/B${row}^2)^1.14))` }
    sheet.getCell(row, 6).value = { formula: `IF(OR(B${row}="",C${row}=""),"",0.000414*(9.81*(C${row}*1000)/B${row}^2)^0.79)` }
    sheet.getCell(row, 7).value = { formula: `IF(OR(B${row}="",D${row}=""),"",TANH(0.1*(9.81*D${row}/B${row}^2)^2.01))` }
    sheet.getCell(row, 8).value = { formula: `IF(OR(B${row}="",C${row}=""),"",0.000000277*(9.81*(C${row}*1000)/B${row}^2)^1.45)` }
    sheet.getCell(row, 9).value = { formula: `IF(OR(B${row}="",C${row}="",D${row}=""),"",0.2433*B${row}^2/9.81*(E${row}*TANH(F${row}/E${row}))^0.572)` }
    sheet.getCell(row, 10).value = { formula: `IF(OR(B${row}="",C${row}="",D${row}=""),"",7.69*B${row}/9.81*(G${row}*TANH(H${row}/G${row}))^0.187)` }
    sheet.getCell(row, 11).value = { formula: `IF(OR(B${row}="",C${row}=""),"",77.23*(C${row}*1000)^0.67/(B${row}^0.34*9.81^0.33)/3600)` }
    styleDataRow(sheet, row, [2,3,4,12], [9,10,11], [5,6,7,8])
  }
  addDecimalValidation(sheet, [2], 0.01, 35, 'Enter a wind speed between 0.01 and 35 m/s.')
  addDecimalValidation(sheet, [3], 0, 10000, 'Enter a fetch between 0 and 10,000 km.')
  addDecimalValidation(sheet, [4], 0.01, 10000, 'Enter a water depth between 0.01 and 10,000 m.')
  for (const column of [2,3,4,9,10,11]) sheet.getColumn(column).numFmt = '0.000'
  for (const column of [5,6,7,8]) sheet.getColumn(column).numFmt = '0.000000'
  sheet.autoFilter = 'A6:L31'
  sheet.mergeCells('A34:L34'); sheet.getCell('A34').value = 'Reference: Breugem & Holthuijsen (2007), Journal of Waterway, Port, Coastal, and Ocean Engineering 133(3), 173–182.'
  sheet.getCell('A34').font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF555555' } }
  return workbook
}

export async function downloadHolthuijsenWorkbook(input: HolthuijsenInput) {
  await saveWorkbook(await createHolthuijsenWorkbook(input), 'fetch-limited-waves-holthuijsen.xlsx')
}

function addCarterSheet(workbook: ExcelWorkbook, name: string, title: string, input: CarterInput, mode: 'fetch' | 'duration') {
  const sheet = workbook.addWorksheet(name, { properties: { defaultRowHeight: 18 } })
  sheet.columns = [12,20,20,27,20,20,34].map(width => ({ width }))
  const extentLabel = mode === 'fetch' ? 'Fetch, F (km)' : 'Duration, D (hours)'
  styleSheet(sheet, title, 'Results are capped at the fully developed limits used by Carter (1982).', 'G')
  styleHeader(sheet, ['Case','Wind speed, U10 (m/s)',extentLabel,'Significant wave height, Hs (m)','Peak period, Tp (s)','Mean period, Tz (s)','Notes'])
  for (let row = 7; row <= 31; row += 1) {
    const current = row === 7
    sheet.getCell(row, 1).value = row - 6
    sheet.getCell(row, 2).value = current ? input.windSpeed : null
    sheet.getCell(row, 3).value = current ? input.extent : null
    if (mode === 'fetch') {
      sheet.getCell(row, 4).value = { formula: `IF(OR(B${row}="",C${row}=""),"",MIN(0.0163*SQRT(C${row})*B${row},0.0248*B${row}^2))` }
      sheet.getCell(row, 5).value = { formula: `IF(OR(B${row}="",C${row}=""),"",MIN(0.566*C${row}^0.3*B${row}^0.4,0.728*B${row}))` }
      sheet.getCell(row, 6).value = { formula: `IF(OR(B${row}="",C${row}=""),"",MIN(0.439*C${row}^0.3*B${row}^0.4,0.566*B${row}))` }
    } else {
      sheet.getCell(row, 4).value = { formula: `IF(OR(B${row}="",C${row}=""),"",MIN(0.0146*B${row}^(9/7)*C${row}^(5/7),0.0240*B${row}^2))` }
      sheet.getCell(row, 5).value = { formula: `IF(OR(B${row}="",C${row}=""),"",MIN(0.540*B${row}^(4/7)*C${row}^(3/7),0.728*B${row}))` }
      sheet.getCell(row, 6).value = { formula: `IF(OR(B${row}="",C${row}=""),"",MIN(0.419*B${row}^(4/7)*C${row}^(3/7),0.566*B${row}))` }
    }
    styleDataRow(sheet, row, [2,3,7], [4,5,6])
  }
  addDecimalValidation(sheet, [2], 0, mode === 'fetch' ? 35 : 100, `Enter a wind speed between 0 and ${mode === 'fetch' ? 35 : 100} m/s.`)
  addDecimalValidation(sheet, [3], 0, 10000, `Enter a ${mode} between 0 and 10,000 ${mode === 'fetch' ? 'km' : 'hours'}.`)
  for (const column of [2,3,4,5,6]) sheet.getColumn(column).numFmt = '0.000'
  sheet.autoFilter = 'A6:G31'
  sheet.mergeCells('A34:G34'); sheet.getCell('A34').value = 'References: Carter (1982), Ocean Engineering 9, 17–33; U.S. Army Corps of Engineers (2006), Coastal Engineering Manual II-2-44.'
  sheet.getCell('A34').font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF555555' } }
}

export async function createCarterWorkbook(fetchInput: CarterInput, durationInput: CarterInput) {
  const workbook = await newWorkbook('Fetch and Duration Limited Waves (Carter)', 'Carter wind-wave estimates')
  addCarterSheet(workbook, 'Fetch Limited', 'Fetch Limited Waves (Carter, 1982)', fetchInput, 'fetch')
  addCarterSheet(workbook, 'Duration Limited', 'Duration Limited Waves (Carter, 1982)', durationInput, 'duration')
  return workbook
}

export async function downloadCarterWorkbook(fetchInput: CarterInput, durationInput: CarterInput) {
  await saveWorkbook(await createCarterWorkbook(fetchInput, durationInput), 'carter-wind-waves.xlsx')
}
