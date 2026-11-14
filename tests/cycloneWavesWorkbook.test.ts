import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { createCycloneWavesWorkbook } from '../src/export/cycloneWavesWorkbook'

describe('cyclone waves Excel template', () => {
  it('prefills the current case and provides 25 formula-driven rows', async () => {
    const workbook = await createCycloneWavesWorkbook(45)
    const sheet = workbook.getWorksheet('Cyclone Waves')!

    expect(sheet.getCell('B7').value).toBe(45)
    expect(sheet.getCell('B8').value).toBeNull()
    expect(sheet.getCell('C7').formula).toBe('IF(B7="","",0.25*B7)')
    expect(sheet.getCell('D19').formula).toBe('IF(C19="","",4.5*C19^0.48)')
    expect(sheet.getCell('E31').formula).toBe('IF(B31="","",1012.6-0.6077785*B31-0.01079967*B31^2)')
    expect(sheet.getCell('B31').dataValidation.type).toBe('decimal')
    expect(sheet.autoFilter).toBe('A6:F31')

    const bytes = await workbook.xlsx.writeBuffer()
    const reopened = new ExcelJS.Workbook()
    await reopened.xlsx.load(bytes)
    expect(reopened.getWorksheet('Cyclone Waves')!.getCell('D7').formula).toBe('IF(C7="","",4.5*C7^0.48)')
  })
})
