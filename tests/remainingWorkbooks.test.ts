import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { createRemainingWorkbook, supportsRemainingWorkbook } from '../src/export/remainingWorkbooks'

describe('additional calculator Excel templates', () => {
  it.each([
    ['wave-setup',{H:1,T:10,beta:.05},'I7','IF(F7="","",IF(F7<0.3,0.043*SQRT(B7*E7),1.1*(0.35*D7*SQRT(B7*E7)+SQRT(B7*E7*(0.563*D7^2+0.004))/2)))'],
    ['fringe-setup',{depth:.5,H:1,T:10,wind:15,width:300},'I7','IF(OR(B7="",E7="",F7=""),"",F7*G7*E7^2/((100000/3)*(B7+H7)))'],
    ['fall-velocity',{d:.0003,rhoS:2650,rho:1027},'J7','IF(H7="","",1.36E-6/B7*(SQRT(10.36^2+1.049*H7^3)-10.36))'],
    ['beach-slope',{d:.001},'C7','IF(B7="","",-0.178*(B7*1000-0.125)^-0.187+0.294)'],
    ['sediment-density',{sand:30,silt:30,clay:40,rhoW:1025,rhoS:2650},'J7','IF(OR(H7="",F7=""),"",(F7-H7)/F7)'],
    ['wind-setup',{wind:25,depth:1,fetch:4000},'E7','IF(OR(B7="",C7="",D7=""),"",0.5*3.5E-6*(B7^2/(9.81*C7))*D7)'],
  ] as const)('creates %s with copied Excel formulas', async (id, values, formulaCell, expectedFormula) => {
    const workbook = await createRemainingWorkbook(id, values)
    const sheet = workbook.getWorksheet('Calculations')!
    expect(sheet.getCell(formulaCell).formula).toBe(expectedFormula)
    expect(sheet.getCell('B7').value).toBe(Object.values(values)[0])
    expect(sheet.getCell('B31').dataValidation.type).toBe('decimal')
    expect(supportsRemainingWorkbook(id)).toBe(true)
  })

  it('exports and reopens a generated workbook with formulas intact', async () => {
    const workbook = await createRemainingWorkbook('wind-setup',{wind:25,depth:1,fetch:4000})
    const bytes=await workbook.xlsx.writeBuffer();const reopened=new ExcelJS.Workbook();await reopened.xlsx.load(bytes)
    expect(reopened.getWorksheet('Calculations')!.getCell('E31').formula).toContain('3.5E-6')
  })

  it('converts rock-sizing storm duration to number of waves', async () => {
    const workbook=await createRemainingWorkbook('rock-sizing',{H:2.5,periodType:1,T:16,rhoS:2700,rhoW:1025,S:2,P:.4,duration:9.6,alpha:14,waveAngle:0,safety:1.1,depth:3})
    expect(workbook.getWorksheet('Calculations')!.getCell('N7').formula).toBe('IF(OR(I7="",D7=""),"",I7*3600/D7)')
  })

  it.each([
    ['critical-current',{d:.0001,depth:10,rhoS:2650,rho:1027},'I7','7*(C7/B7)^(1/7)'],
    ['critical-shear',{d:.0002,rhoS:2650,rho:1027},'G7','F7*9.81*(C7-D7)*B7'],
    ['critical-orbital',{d:.0002,T:10,rhoS:2650,rho:1027},'F7','IF(B7<0.0005'],
    ['submerged-breakwater',{H:2,L:150,depth:.5,width:15,d50:.5},'K7','IF(AND(G7>=0,G7<=7.08'],
    ['reef-balls',{H:1.5,L:150,depth:.5,width:15},'J7','IF(F7<=0.4,H7'],
    ['rock-sizing',{H:2.5,periodType:1,T:16,rhoS:2700,rhoW:1025,S:2,P:.4,duration:9.6,alpha:14,waveAngle:0,safety:1.1,depth:3},'Z7','B7/(Y7*(E7/F7-1))'],
    ['overtopping',{H:2.5,T:9,alpha:20,waveAngle:0,runupSafety:1.1,overtopSafety:1.5,rough:.9,berm:1,Rc:8.5},'T7','100*EXP(-3.91*J7^2/O7^2)'],
    ['bed-shear',{H:2,T:8,phi:45,U:.5,z0:.002,depth:50,rho:1027},'U7','SQRT((S7+R7*COS(RADIANS(T7)))^2'],
  ] as const)('creates the expanded %s workbook',async(id,values,cell,fragment)=>{
    const workbook=await createRemainingWorkbook(id,values);const formula=workbook.getWorksheet('Calculations')!.getCell(cell).formula
    expect(formula).toContain(fragment);expect(supportsRemainingWorkbook(id)).toBe(true)
  })
})
