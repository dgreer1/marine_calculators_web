import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { createCarterWorkbook, createHolthuijsenWorkbook } from '../src/export/windWavesWorkbooks'

describe('wind-wave Excel templates', () => {
  it('creates a Holthuijsen workbook with current inputs and 25 formula rows', async () => {
    const workbook = await createHolthuijsenWorkbook({ windSpeed: 10, fetch: 10, waterDepth: 10 })
    const sheet = workbook.getWorksheet('Wave Growth')!
    expect([sheet.getCell('B7').value, sheet.getCell('C7').value, sheet.getCell('D7').value]).toEqual([10, 10, 10])
    expect(sheet.getCell('I7').formula).toBe('IF(OR(B7="",C7="",D7=""),"",0.2433*B7^2/9.81*(E7*TANH(F7/E7))^0.572)')
    expect(sheet.getCell('K31').formula).toBe('IF(OR(B31="",C31=""),"",77.23*(C31*1000)^0.67/(B31^0.34*9.81^0.33)/3600)')
    expect(sheet.getCell('D31').dataValidation.type).toBe('decimal')

    const bytes = await workbook.xlsx.writeBuffer()
    const reopened = new ExcelJS.Workbook()
    await reopened.xlsx.load(bytes)
    expect(reopened.getWorksheet('Wave Growth')!.getCell('J7').formula).toContain('7.69*B7/9.81')
  })

  it('creates separate Carter fetch- and duration-limited sheets', async () => {
    const workbook = await createCarterWorkbook({ windSpeed: 10, extent: 10 }, { windSpeed: 12, extent: 4 })
    const fetch = workbook.getWorksheet('Fetch Limited')!
    const duration = workbook.getWorksheet('Duration Limited')!
    expect([fetch.getCell('B7').value, fetch.getCell('C7').value]).toEqual([10, 10])
    expect([duration.getCell('B7').value, duration.getCell('C7').value]).toEqual([12, 4])
    expect(fetch.getCell('D7').formula).toBe('IF(OR(B7="",C7=""),"",MIN(0.0163*SQRT(C7)*B7,0.0248*B7^2))')
    expect(duration.getCell('F31').formula).toBe('IF(OR(B31="",C31=""),"",MIN(0.419*B31^(4/7)*C31^(3/7),0.566*B31))')
  })
})
