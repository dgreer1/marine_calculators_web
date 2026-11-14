import type { Workbook as ExcelWorkbook, Worksheet } from 'exceljs'
import type { RemainingId } from '../calculators/RemainingCalculator.vue'

type ColumnKind = 'input' | 'working' | 'output'
type ColumnSpec = { label: string; kind: ColumnKind; width?: number; key?: string; formula?: (row: number) => string; format?: string; min?: number; max?: number }
type WorkbookSpec = { title: string; filename: string; note: string; reference: string; columns: ColumnSpec[] }

const specs: Partial<Record<RemainingId, WorkbookSpec>> = {
  'wave-setup': {
    title: 'Wave Setup & Runup on a Planar Beach', filename: 'wave-setup-runup.xlsx',
    note: 'Stockdon et al. (2006). Beach-face slope is entered as a ratio, for example 0.05 for 1:20.',
    reference: 'Stockdon et al. (2006), Coastal Engineering 53(7), 573–588.',
    columns: [
      { key:'H', label:'Deep-water wave height, H0 (m)', kind:'input', min:0 }, { key:'T', label:'Wave period, T (s)', kind:'input', min:0 }, { key:'beta', label:'Beach-face slope, β', kind:'input', min:0 },
      { label:'Deep-water wavelength, L0 (m)', kind:'working', formula:r=>`IF(C${r}="","",9.81*C${r}^2/(2*PI()))` },
      { label:'Iribarren number, ξ0', kind:'output', formula:r=>`IF(OR(B${r}="",D${r}=""),"",D${r}/SQRT(B${r}/E${r}))` },
      { label:'Breaker type', kind:'output', formula:r=>`IF(F${r}="","",IF(F${r}<0.5,"Spilling",IF(F${r}<3.3,"Plunging","Surging or Collapsing")))`, format:'@' },
      { label:'Wave setup (m)', kind:'output', formula:r=>`IF(F${r}="","",IF(F${r}<0.3,0.016*SQRT(B${r}*E${r}),0.35*D${r}*SQRT(B${r}*E${r})))` },
      { label:'2% runup (m)', kind:'output', formula:r=>`IF(F${r}="","",IF(F${r}<0.3,0.043*SQRT(B${r}*E${r}),1.1*(0.35*D${r}*SQRT(B${r}*E${r})+SQRT(B${r}*E${r}*(0.563*D${r}^2+0.004))/2)))` },
    ],
  },
  'fringe-setup': {
    title:'Wind and Wave Setup on a Fringing Reef', filename:'fringing-reef-setup.xlsx', note:'Empirical Sánchez et al. relationships; apply cautiously outside their calibration conditions.', reference:'Sánchez et al. (2007), relationships used in the original application.',
    columns:[
      {key:'depth',label:'Depth over reef, h (m)',kind:'input',min:0},{key:'H',label:'Deep-water wave height, Hs (m)',kind:'input',min:0},{key:'T',label:'Peak period, Tp (s)',kind:'input',min:0},{key:'wind',label:'Wind speed, U10 (m/s)',kind:'input',min:0},{key:'width',label:'Reef width, B (m)',kind:'input',min:0},
      {label:'Wind drag coefficient, CD',kind:'working',formula:r=>`IF(E${r}="","",0.00063+(0.00723-0.00063)*E${r}/100)`,format:'0.000000'},
      {label:'Wave setup (m)',kind:'output',formula:r=>`IF(OR(B${r}="",C${r}="",D${r}=""),"",MAX(-0.18*B${r}+0.48*LOG10(C${r}^2*D${r})-5.53*C${r}/D${r}^2,0))`},
      {label:'Wind setup (m)',kind:'output',formula:r=>`IF(OR(B${r}="",E${r}="",F${r}=""),"",F${r}*G${r}*E${r}^2/((100000/3)*(B${r}+H${r})))`},
    ],
  },
  'fall-velocity': {
    title:'Fall Velocity (Non-Cohesive Sediment)', filename:'sediment-fall-velocity.xlsx', note:'Uses a fixed kinematic viscosity of 1.36×10⁻⁶ m²/s, matching the web calculator.', reference:'Ferguson & Church (2004); Soulsby (1997), Dynamics of Marine Sands.',
    columns:[
      {key:'d',label:'Particle diameter, d (m)',kind:'input',min:0.000001},{key:'rhoS',label:'Particle density, ρs (kg/m³)',kind:'input',min:1},{key:'rho',label:'Fluid density, ρ (kg/m³)',kind:'input',min:1},
      {label:'Diameter (mm)',kind:'output',formula:r=>`IF(B${r}="","",B${r}*1000)`,format:'0.000000'},{label:'Diameter (µm)',kind:'output',formula:r=>`IF(B${r}="","",B${r}*1000000)`},
      {label:'Relative submerged density, R',kind:'working',formula:r=>`IF(OR(C${r}="",D${r}=""),"",(C${r}-D${r})/D${r})`,format:'0.000000'},
      {label:'Dimensionless grain size, D*',kind:'working',formula:r=>`IF(OR(B${r}="",C${r}="",D${r}=""),"",(9.81*(C${r}/D${r}-1)/(1.36E-6)^2)^(1/3)*B${r})`},
      {label:'Fall velocity, Ferguson & Church (m/s)',kind:'output',formula:r=>`IF(G${r}="","",G${r}*9.81*B${r}^2/(18*1.36E-6+SQRT(0.75*G${r}*9.81*B${r}^3)))`},
      {label:'Fall velocity, Soulsby (m/s)',kind:'output',formula:r=>`IF(H${r}="","",1.36E-6/B${r}*(SQRT(10.36^2+1.049*H${r}^3)-10.36))`},
    ],
  },
  'beach-slope': {
    title:'Beach-Face Slope by Grain Size', filename:'beach-face-slope.xlsx', note:'This empirical relationship is undefined at and below a median grain size of 0.125 mm.', reference:'Empirical relationship transferred from the original Shiny application.',
    columns:[{key:'d',label:'Median grain size, d50 (m)',kind:'input',min:0.000126},{label:'Beach-face slope, β',kind:'output',formula:r=>`IF(B${r}="","",-0.178*(B${r}*1000-0.125)^-0.187+0.294)`}],
  },
  'sediment-density': {
    title:'Sediment Density and Porosity', filename:'sediment-density-porosity.xlsx', note:'Sand, silt and clay percentages should total 100%. The total column is included as a check.', reference:'Empirical dry-density relationship transferred from the original Shiny application.',
    columns:[
      {key:'sand',label:'Sand (%)',kind:'input',min:0,max:100},{key:'silt',label:'Silt (%)',kind:'input',min:0,max:100},{key:'clay',label:'Clay (%)',kind:'input',min:0,max:100},{key:'rhoW',label:'Water density, ρw (kg/m³)',kind:'input',min:1},{key:'rhoS',label:'Particle density, ρs (kg/m³)',kind:'input',min:1},
      {label:'Fraction total (%)',kind:'working',formula:r=>`IF(COUNTA(B${r}:D${r})=0,"",SUM(B${r}:D${r}))`,format:'0.0'},
      {label:'Dry bulk density (kg/m³)',kind:'output',formula:r=>`IF(COUNTA(B${r}:D${r})<3,"",415*D${r}/100+1120*C${r}/100+1550*B${r}/100)`},
      {label:'Wet bulk density (kg/m³)',kind:'output',formula:r=>`IF(OR(H${r}="",E${r}="",F${r}=""),"",E${r}+(F${r}-E${r})/F${r}*H${r})`},
      {label:'Porosity',kind:'output',formula:r=>`IF(OR(H${r}="",F${r}=""),"",(F${r}-H${r})/F${r})`,format:'0.000'},
    ],
  },
  'wind-setup': {
    title:'Wind Setup in an Enclosed Water Body', filename:'enclosed-water-wind-setup.xlsx', note:'Assumes a uniform enclosed water body and constant wind acting along the fetch.', reference:'Relationship and coefficient transferred from the original Shiny application.',
    columns:[{key:'wind',label:'Wind speed, U10 (m/s)',kind:'input',min:0},{key:'depth',label:'Average depth, h (m)',kind:'input',min:0.000001},{key:'fetch',label:'Fetch, F (m)',kind:'input',min:0},{label:'Wind setup (m)',kind:'output',formula:r=>`IF(OR(B${r}="",C${r}="",D${r}=""),"",0.5*3.5E-6*(B${r}^2/(9.81*C${r}))*D${r})`}],
  },
  'critical-current': {
    title:'Critical Depth-Averaged Current Speed',filename:'critical-current-speed.xlsx',note:'Soulsby (1997) threshold for non-cohesive sediment on a horizontal, unrippled bed.',reference:'Soulsby (1997), Dynamics of Marine Sands.',
    columns:[{key:'d',label:'Median grain size, d50 (m)',kind:'input',min:0.000001},{key:'depth',label:'Water depth, h (m)',kind:'input',min:0.000001},{key:'rhoS',label:'Particle density, ρs (kg/m³)',kind:'input',min:1},{key:'rho',label:'Fluid density, ρ (kg/m³)',kind:'input',min:1},{label:'Relative density, s',kind:'working',formula:r=>`IF(OR(D${r}="",E${r}=""),"",D${r}/E${r})`},{label:'Dimensionless grain size, D*',kind:'output',formula:r=>`IF(OR(B${r}="",F${r}=""),"",(9.81*(F${r}-1)/(1.36E-6)^2)^(1/3)*B${r})`},{label:'Critical Shields parameter',kind:'working',formula:r=>`IF(G${r}="","",0.30/(1+1.2*G${r})+0.055*(1-EXP(-0.02*G${r})))`},{label:'Critical current speed (m/s)',kind:'output',formula:r=>`IF(OR(B${r}="",C${r}="",F${r}="",H${r}=""),"",7*(C${r}/B${r})^(1/7)*SQRT(9.81*(F${r}-1)*B${r}*H${r}))`}],
  },
  'critical-shear': {
    title:'Critical Bed Shear Stress',filename:'critical-bed-shear-stress.xlsx',note:'Soulsby (1997) approximation to the Shields curve for non-cohesive sediment.',reference:'Soulsby (1997), Dynamics of Marine Sands.',
    columns:[{key:'d',label:'Grain size, d (m)',kind:'input',min:0.000001},{key:'rhoS',label:'Particle density, ρs (kg/m³)',kind:'input',min:1},{key:'rho',label:'Fluid density, ρ (kg/m³)',kind:'input',min:1},{label:'Dimensionless grain size, D*',kind:'output',formula:r=>`IF(OR(B${r}="",C${r}="",D${r}=""),"",(9.81*(C${r}/D${r}-1)/(1.36E-6)^2)^(1/3)*B${r})`},{label:'Critical Shields parameter',kind:'output',formula:r=>`IF(E${r}="","",0.30/(1+1.2*E${r})+0.055*(1-EXP(-0.02*E${r})))`},{label:'Critical bed shear stress (N/m²)',kind:'output',formula:r=>`IF(OR(B${r}="",C${r}="",D${r}="",F${r}=""),"",F${r}*9.81*(C${r}-D${r})*B${r})`}],
  },
  'critical-orbital': {
    title:'Critical Bed Orbital Velocity',filename:'critical-bed-orbital-velocity.xlsx',note:'The Soulsby (1997) formula changes at a grain size of 0.5 mm.',reference:'Soulsby (1997), Dynamics of Marine Sands.',
    columns:[{key:'d',label:'Grain size, d (m)',kind:'input',min:0.000001},{key:'T',label:'Wave period, T (s)',kind:'input',min:0.000001},{key:'rhoS',label:'Particle density, ρs (kg/m³)',kind:'input',min:1},{key:'rho',label:'Fluid density, ρ (kg/m³)',kind:'input',min:1},{label:'Critical bed orbital velocity (m/s)',kind:'output',formula:r=>`IF(OR(B${r}="",C${r}="",D${r}="",E${r}=""),"",IF(B${r}<0.0005,(0.118*9.81*(D${r}/E${r}-1))^(2/3)*B${r}^(1/3)*C${r}^(1/3),(1.09*9.81*(D${r}/E${r}-1))^(4/7)*B${r}^(3/7)*C${r}^(1/7)))`}],
  },
  'submerged-breakwater': {
    title:'Wave Transmission over a Submerged Breakwater',filename:'submerged-breakwater-transmission.xlsx',note:'The calibration check must be considered before relying on the result.',reference:'Empirical relationship and calibration ranges transferred from the original Shiny application.',
    columns:[{key:'H',label:'Wave height, H (m)',kind:'input',min:0.000001},{key:'L',label:'Wavelength, L (m)',kind:'input',min:0.000001},{key:'depth',label:'Submergence depth, ds (m)',kind:'input',min:0.000001},{key:'width',label:'Crest width, B (m)',kind:'input',min:0.000001},{key:'d50',label:'Core median rock size, d50 (m)',kind:'input',min:0.000001},{label:'Calibration parameter, A',kind:'working',formula:r=>`IF(OR(C${r}="",D${r}="",E${r}="",F${r}=""),"",E${r}*D${r}/(C${r}*F${r}))`},{label:'Calibration parameter, B',kind:'working',formula:r=>`IF(OR(B${r}="",D${r}="",E${r}="",F${r}=""),"",D${r}*B${r}/(E${r}*F${r}))`},{label:'Transmission coefficient, Kt',kind:'output',formula:r=>`IF(OR(B${r}="",C${r}="",D${r}="",E${r}="",F${r}=""),"",1-(EXP(-0.65*D${r}/B${r}-1.09*B${r}/E${r})+0.047*G${r}-0.067*H${r}))`},{label:'Wave reduction (%)',kind:'output',formula:r=>`IF(I${r}="","",(1-I${r})*100)`},{label:'Within calibration range',kind:'output',formula:r=>`IF(OR(G${r}="",H${r}=""),"",IF(AND(G${r}>=0,G${r}<=7.08,H${r}>=0,H${r}<=2.14),"Yes","No"))`,format:'@'}],
  },
  'reef-balls': {
    title:'Wave Transmission over Reef Balls',filename:'reef-ball-wave-transmission.xlsx',note:'The transition between low- and high-relative-submergence expressions is blended linearly.',reference:'Empirical Reef Ball relationship transferred from the original Shiny application.',
    columns:[{key:'H',label:'Wave height, H (m)',kind:'input',min:0.000001},{key:'L',label:'Wavelength, L (m)',kind:'input',min:0.000001},{key:'depth',label:'Submergence depth, Rc (m)',kind:'input',min:0.000001},{key:'width',label:'Array width, B (m)',kind:'input',min:0.000001},{label:'Relative submergence, R*',kind:'working',formula:r=>`IF(OR(B${r}="",D${r}=""),"",D${r}/B${r})`},{label:'Dimensionless array width, b*',kind:'working',formula:r=>`IF(OR(B${r}="",C${r}="",E${r}=""),"",0.6*E${r}/SQRT(B${r}*C${r}))`},{label:'Low-submergence Kt',kind:'working',formula:r=>`IF(G${r}="","",(-0.249*MIN(4,G${r})+0.9474)^2)`},{label:'High-submergence Kt',kind:'working',formula:r=>`IF(OR(F${r}="",G${r}=""),"",1/(1+0.3*F${r}^-1.5*G${r}))`},{label:'Transmission coefficient, Kt',kind:'output',formula:r=>`IF(F${r}="","",IF(F${r}<=0.4,H${r},IF(F${r}<0.7,(0.7-F${r})/0.3*H${r}+(F${r}-0.4)/0.3*I${r},I${r})))`},{label:'Wave reduction (%)',kind:'output',formula:r=>`IF(J${r}="","",(1-J${r})*100)`}],
  },
  'rock-sizing': {
    title:'Rock Sizing for Double-Layer Sea Dikes and Revetments',filename:'rock-sizing-revetment.xlsx',note:'Van der Meer (1988) calculation. Period type is 1 for spectral Tm-1 and 0 for mean Tm.',reference:'Van der Meer (1988), Delft Hydraulics Communication No. 396.',
    columns:[{key:'H',label:'Significant wave height, Hs (m)',kind:'input',min:0.000001},{key:'periodType',label:'Period type (1=Tm-1, 0=Tm)',kind:'input',min:0,max:1},{key:'T',label:'Wave period, T (s)',kind:'input',min:0.000001},{key:'rhoS',label:'Rock density, ρs (kg/m³)',kind:'input',min:1},{key:'rhoW',label:'Water density, ρw (kg/m³)',kind:'input',min:1},{key:'S',label:'Damage parameter, Sd',kind:'input',min:0},{key:'P',label:'Notional permeability, P',kind:'input',min:0.000001},{key:'duration',label:'Storm duration, D (hours)',kind:'input',min:0.000001},{key:'alpha',label:'Slope angle, α (deg)',kind:'input',min:0.000001,max:89.999},{key:'waveAngle',label:'Wave angle, β (deg)',kind:'input',min:0,max:90},{key:'safety',label:'Safety factor',kind:'input',min:0.000001},{key:'depth',label:'Depth at toe (m)',kind:'input',min:0.000001},
      {label:'Number of waves, Nz',kind:'output',formula:r=>`IF(OR(I${r}="",D${r}=""),"",I${r}*3600/D${r})`},{label:'Deep-water wavelength, L0 (m)',kind:'working',formula:r=>`IF(D${r}="","",9.81*D${r}^2/(2*PI()))`},{label:'Wave steepness',kind:'output',formula:r=>`IF(OR(B${r}="",O${r}=""),"",B${r}/O${r})`},{label:'Surf similarity, ξm',kind:'output',formula:r=>`IF(P${r}="","",P${r}^-0.5*TAN(RADIANS(J${r})))`},{label:'Cpl',kind:'working',formula:r=>`IF(C${r}="","",IF(C${r}=1,8.4,8.7))`},{label:'Cs',kind:'working',formula:r=>`IF(C${r}="","",IF(C${r}=1,1.3,1.4))`},{label:'Transition ξmc',kind:'working',formula:r=>`IF(OR(H${r}="",J${r}="",R${r}="",S${r}=""),"",((R${r}/S${r})*H${r}^0.31*SQRT(TAN(RADIANS(J${r}))))^(1/(H${r}+0.5)))`},{label:'Depth factor',kind:'working',formula:r=>`IF(OR(B${r}="",M${r}=""),"",MIN(IF(B${r}/M${r}>0.3,0.4*(B${r}/M${r})+0.58,0.7),0.82))`},{label:'Wave-angle factor',kind:'working',formula:r=>`IF(K${r}="","",0.5+0.5*COS(RADIANS(K${r}))^2)`},{label:'Plunging stability',kind:'working',formula:r=>`IF(OR(G${r}="",H${r}="",N${r}="",L${r}="",Q${r}="",R${r}="",U${r}="",V${r}=""),"",R${r}/(V${r}*L${r})*H${r}^0.18*(G${r}/SQRT(N${r}))^0.2*U${r}*Q${r}^-0.5)`},{label:'Surging stability',kind:'working',formula:r=>`IF(OR(G${r}="",H${r}="",N${r}="",J${r}="",L${r}="",Q${r}="",S${r}="",U${r}="",V${r}=""),"",S${r}/(V${r}*L${r})*H${r}^-0.13*(G${r}/SQRT(N${r}))^0.2*U${r}*SQRT(1/TAN(RADIANS(J${r})))*Q${r}^H${r})`},{label:'Selected stability',kind:'working',formula:r=>`IF(OR(Q${r}="",T${r}=""),"",IF(OR(Q${r}<T${r},1/TAN(RADIANS(J${r}))>3.95),W${r},X${r}))`},{label:'Nominal rock diameter, Dn50 (m)',kind:'output',formula:r=>`IF(OR(B${r}="",E${r}="",F${r}="",Y${r}=""),"",B${r}/(Y${r}*(E${r}/F${r}-1)))`}],
  },
  'overtopping': {
    title:'Runup and Overtopping of Sea Dikes and Revetments',filename:'revetment-runup-overtopping.xlsx',note:'EurOtop relationships used in the web calculator. Intermediate discharge branches remain visible.',reference:'EurOtop (2018), Manual on wave overtopping of sea defences and related structures.',
    columns:[{key:'H',label:'Significant wave height at toe, Hs (m)',kind:'input',min:0.000001},{key:'T',label:'Wave period, T (s)',kind:'input',min:0.000001},{key:'alpha',label:'Slope angle, α (deg)',kind:'input',min:0.000001,max:89.999},{key:'waveAngle',label:'Wave angle, β (deg)',kind:'input',min:0,max:90},{key:'runupSafety',label:'Runup safety factor',kind:'input',min:0.000001},{key:'overtopSafety',label:'Overtopping safety factor',kind:'input',min:0.000001},{key:'rough',label:'Slope roughness factor',kind:'input',min:0.000001},{key:'berm',label:'Berm factor',kind:'input',min:0.000001},{key:'Rc',label:'Crest above SWL, Rc (m)',kind:'input',min:0},
      {label:'Deep-water wavelength, L0 (m)',kind:'working',formula:r=>`IF(C${r}="","",9.81*C${r}^2/(2*PI()))`},{label:'Wave steepness',kind:'working',formula:r=>`IF(OR(B${r}="",K${r}=""),"",B${r}/K${r})`},{label:'Surf similarity, ξm',kind:'output',formula:r=>`IF(L${r}="","",L${r}^-0.5*TAN(RADIANS(D${r})))`},{label:'Wave-angle factor',kind:'working',formula:r=>`IF(E${r}="","",0.5+0.5*COS(RADIANS(E${r}))^2)`},{label:'2% runup (m)',kind:'output',formula:r=>`IF(M${r}="","",IF(M${r}<1.7,1.65*F${r}*H${r}*I${r}*N${r}*M${r}*B${r},F${r}*H${r}*(4-1.5/SQRT(M${r}))*B${r}))`},{label:'Breaking discharge q1 (m³/m/s)',kind:'working',formula:r=>`IF(O${r}="","",G${r}*0.067*M${r}/SQRT(TAN(RADIANS(D${r})))*SQRT(9.81*B${r}^3)*EXP(-4.3*J${r}/(M${r}*I${r}*H${r}*N${r}*B${r})))`},{label:'Non-breaking discharge q2 (m³/m/s)',kind:'working',formula:r=>`IF(O${r}="","",G${r}*0.2*SQRT(9.81*B${r}^3)*EXP(-2.3*J${r}/(I${r}*H${r}*N${r}*B${r})))`},{label:'Steep-slope discharge q3 (m³/m/s)',kind:'working',formula:r=>`IF(O${r}="","",G${r}*0.2*SQRT(9.81*B${r}^3)*EXP(-1.11*J${r}/((0.33+0.022*M${r})*I${r}*H${r}*N${r}*B${r})))`},{label:'Overtopping rate (litres/m/s)',kind:'output',formula:r=>`IF(M${r}="","",1000*IF(M${r}<1.8,P${r},IF(M${r}>7,R${r},Q${r})))`},{label:'Percentage overtopping (%)',kind:'output',formula:r=>`IF(O${r}="","",100*EXP(-3.91*J${r}^2/O${r}^2))`}],
  },
  'bed-shear': {
    title:'Bed Shear Stress from Waves and Currents',filename:'wave-current-bed-shear.xlsx',note:'Uses the Fenton–McKee explicit wavelength approximation and the Soulsby DATA13 combined-stress method.',reference:'Fenton & McKee (1990); Soulsby (1997), Dynamics of Marine Sands.',
    columns:[{key:'H',label:'Wave height, H (m)',kind:'input',min:0},{key:'T',label:'Wave period, T (s)',kind:'input',min:0.000001},{key:'phi',label:'Wave-current angle, φ (deg)',kind:'input',min:0,max:360},{key:'U',label:'Depth-averaged current, U (m/s)',kind:'input',min:0},{key:'z0',label:'Bed roughness, z0 (m)',kind:'input',min:0.0000001},{key:'depth',label:'Water depth, h (m)',kind:'input',min:0.000001},{key:'rho',label:'Water density, ρ (kg/m³)',kind:'input',min:1},
      {label:'Deep-water wavelength, L0 (m)',kind:'working',formula:r=>`IF(C${r}="","",9.81*C${r}^2/(2*PI()))`},{label:'Fenton–McKee term',kind:'working',formula:r=>`IF(OR(C${r}="",G${r}=""),"",(2*PI()*SQRT(G${r}/9.81)/C${r})^1.5)`},{label:'Wavelength, L (m)',kind:'working',formula:r=>`IF(OR(I${r}="",J${r}=""),"",I${r}*TANH(J${r})^(2/3))`},{label:'Wavenumber, k (1/m)',kind:'working',formula:r=>`IF(K${r}="","",2*PI()/K${r})`},{label:'Bed orbital velocity, Uw (m/s)',kind:'output',formula:r=>`IF(OR(B${r}="",C${r}="",G${r}="",L${r}=""),"",B${r}*PI()/(C${r}*SINH(L${r}*G${r})))`},{label:'Orbital semi-excursion, A (m)',kind:'output',formula:r=>`IF(OR(M${r}="",C${r}=""),"",M${r}*C${r}/(2*PI()))`},{label:'Drag coefficient, CD',kind:'output',formula:r=>`IF(OR(F${r}="",G${r}=""),"",(0.40/(1+LN(F${r}/G${r})))^2)`},{label:'Wave friction factor, fw',kind:'output',formula:r=>`IF(M${r}="","",IF(M${r}>0,1.39*(N${r}/F${r})^-0.52,0))`},{label:'Current-only stress (N/m²)',kind:'output',formula:r=>`IF(OR(H${r}="",O${r}="",E${r}=""),"",H${r}*O${r}*E${r}^2)`},{label:'Wave-only stress (N/m²)',kind:'output',formula:r=>`IF(OR(H${r}="",P${r}="",M${r}=""),"",0.5*H${r}*P${r}*M${r}^2)`},{label:'Mean combined stress (N/m²)',kind:'output',formula:r=>`IF(OR(Q${r}="",R${r}=""),"",IF(Q${r}+R${r}>0,Q${r}*(1+1.2*(R${r}/(Q${r}+R${r}))^3.2),0))`},{label:'Folded angle (deg)',kind:'working',formula:r=>`IF(D${r}="","",IF(MOD(ABS(D${r}),180)>90,180-MOD(ABS(D${r}),180),MOD(ABS(D${r}),180)))`},{label:'Maximum combined stress (N/m²)',kind:'output',formula:r=>`IF(OR(R${r}="",S${r}="",T${r}=""),"",SQRT((S${r}+R${r}*COS(RADIANS(T${r})))^2+(R${r}*SIN(RADIANS(T${r})))^2))`}],
  },
}

const fill = { input:'FFF2CC', working:'DDEBF7', output:'E2F0D9' } satisfies Record<ColumnKind,string>

export function supportsRemainingWorkbook(id: RemainingId) { return id in specs }

export async function createRemainingWorkbook(id: RemainingId, values: Record<string,number>) {
  const spec = specs[id]
  if (!spec) throw new Error('Excel export is not available for this calculator yet.')
  const { default: ExcelJS } = await import('exceljs')
  const workbook: ExcelWorkbook = new ExcelJS.Workbook()
  workbook.creator='Marine Calculators';workbook.title=spec.title;workbook.subject=spec.title;workbook.created=new Date();workbook.calcProperties.fullCalcOnLoad=true
  const sheet = workbook.addWorksheet('Calculations',{properties:{defaultRowHeight:18}})
  const totalColumns = spec.columns.length + 2
  sheet.columns = [{width:10},...spec.columns.map(c=>({width:c.width??22})),{width:34}]
  const lastLetter = sheet.getColumn(totalColumns).letter
  sheet.views=[{state:'frozen',ySplit:6,showGridLines:false,activeCell:'B7'}]
  sheet.mergeCells(`A2:${lastLetter}2`);sheet.getCell('A2').value=spec.title;sheet.getCell('A2').font={name:'Arial',size:15,bold:true,color:{argb:'FF1F1F1F'}}
  sheet.mergeCells(`A3:${lastLetter}3`);sheet.getCell('A3').value='Editable input cells are yellow. Blue cells show intermediate calculations. Green cells contain results.';sheet.getCell('A3').font={name:'Arial',size:10,italic:true,color:{argb:'FF555555'}}
  sheet.mergeCells(`A4:${lastLetter}4`);sheet.getCell('A4').value=spec.note;sheet.getCell('A4').font={name:'Arial',size:10,color:{argb:'FF7F6000'}}
  const header=sheet.getRow(6);header.values=['Case',...spec.columns.map(c=>c.label),'Notes'];header.height=38
  header.eachCell(cell=>{cell.font={name:'Arial',size:10,bold:true,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1F4E78'}};cell.alignment={horizontal:'center',vertical:'middle',wrapText:true}})
  for(let row=7;row<=31;row+=1){
    sheet.getCell(row,1).value=row-6
    spec.columns.forEach((column,index)=>{
      const cell=sheet.getCell(row,index+2)
      if(column.kind==='input')cell.value=row===7?values[column.key!]:null
      else cell.value={formula:column.formula!(row)}
      cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:`FF${fill[column.kind]}`}}
      cell.font={name:'Arial',size:10,color:{argb:'FF222222'}}
      cell.border={bottom:{style:'hair',color:{argb:'FFB7C9D6'}}}
      if(column.format)cell.numFmt=column.format
      else if(column.kind!=='input')cell.numFmt='0.000'
      if(column.kind==='input')cell.dataValidation={type:'decimal',operator:'between',allowBlank:true,showErrorMessage:true,formulae:[column.min??-1E100,column.max??1E100],errorTitle:'Invalid input',error:`Enter a value between ${column.min??'the permitted minimum'} and ${column.max??'the permitted maximum'}.`}
    })
    const notes=sheet.getCell(row,totalColumns);notes.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFF2CC'}};notes.border={bottom:{style:'hair',color:{argb:'FFB7C9D6'}}}
  }
  sheet.autoFilter=`A6:${lastLetter}31`
  sheet.mergeCells(`A34:${lastLetter}34`);sheet.getCell('A34').value=`Reference: ${spec.reference}`;sheet.getCell('A34').font={name:'Arial',size:9,italic:true,color:{argb:'FF555555'}}
  return workbook
}

export async function downloadRemainingWorkbook(id: RemainingId, values: Record<string,number>) {
  const spec=specs[id];if(!spec)throw new Error('Excel export is not available for this calculator yet.')
  const workbook=await createRemainingWorkbook(id,values);const data=await workbook.xlsx.writeBuffer();const blob=new Blob([data as BlobPart],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=spec.filename;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url)
}
