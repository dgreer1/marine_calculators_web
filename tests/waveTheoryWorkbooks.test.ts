import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { createLinearWaveWorkbook, createShoalingWorkbook, createStokesDriftWorkbook } from '../src/export/waveTheoryWorkbooks'

describe('Fenton–McKee wave workbooks',()=>{
  it('uses the explicit wavelength approximation in linear waves',async()=>{
    const {workbook}=await createLinearWaveWorkbook({waveHeight:2,wavePeriod:12,waterDepth:100});const s=workbook.getWorksheet('Calculations')!
    expect([s.getCell('B7').value,s.getCell('C7').value,s.getCell('D7').value]).toEqual([2,12,100])
    expect(s.getCell('G7').formula).toBe('IF(OR(E7="",F7=""),"",E7*TANH(F7)^(2/3))')
    expect(s.getCell('Q31').formula).toContain('Deep-water breaking')
  })
  it('uses the same wavelength steps for shoaling and refraction',async()=>{
    const {workbook}=await createShoalingWorkbook({deepWaterWaveHeight:1,wavePeriod:15,waterDepth:10,deepWaterDirection:45});const s=workbook.getWorksheet('Calculations')!
    expect(s.getCell('H7').formula).toBe('IF(OR(F7="",G7=""),"",F7*TANH(G7)^(2/3))')
    expect(s.getCell('Q7').formula).toBe('IF(OR(B7="",M7="",P7=""),"",B7*M7*P7)')
  })
  it('exports and reopens Stokes drift formulas',async()=>{
    const {workbook}=await createStokesDriftWorkbook({waveHeight:1,wavePeriod:10,waterDepth:10});const bytes=await workbook.xlsx.writeBuffer();const reopened=new ExcelJS.Workbook();await reopened.xlsx.load(bytes);const s=reopened.getWorksheet('Calculations')!
    expect(s.getCell('G7').formula).toContain('TANH(F7)^(2/3)');expect(s.getCell('J7').formula).toContain('EXP(-2*H7*D7)')
  })
})
