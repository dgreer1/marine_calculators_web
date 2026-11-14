<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import renderMathInElement from 'katex/contrib/auto-render'
import PlotlyChart from '../components/PlotlyChart.vue'
import { linspace } from '../engineering/numeric'
import { beachSlope, bedShear, criticalSediment, enclosedWindSetup, fallVelocity, fringeSetup, overtopping, planarSetup, reefBallTransmission, rockSizing, sedimentDensity, submergedTransmission } from '../engineering/remaining'
import { downloadRemainingWorkbook, supportsRemainingWorkbook } from '../export/remainingWorkbooks'

export type RemainingId='wave-setup'|'fringe-setup'|'fall-velocity'|'bed-shear'|'critical-current'|'critical-shear'|'critical-orbital'|'beach-slope'|'sediment-density'|'wind-setup'|'rock-sizing'|'overtopping'|'submerged-breakwater'|'reef-balls'
const props=defineProps<{id:RemainingId}>()
type Field={key:string;label:string;unit?:string;value:number;min?:number;max?:number;step?:number}
type Config={title:string;fields:Field[];calculate:(v:Record<string,number>)=>Record<string,number|string|boolean>;outputs:{key:string;label:string;unit?:string;digits?:number}[];background:string}
const configs:Record<RemainingId,Config>={
 'wave-setup':{title:'Wave Setup & Runup on a Planar Beach',fields:[['H','Deep Water Wave Height','m',1],['T','Wave Period','s',10],['beta','Beach Face Slope','',.05]].map(([key,label,unit,value])=>({key:key as string,label:label as string,unit:unit as string,value:value as number,min:0})),calculate:v=>planarSetup(v.H,v.T,v.beta),outputs:[{key:'iribarren',label:'Iribarren Number',digits:3},{key:'breakerType',label:'Breaker Type'},{key:'setup',label:'Wave Setup',unit:'m',digits:3},{key:'runup',label:'2% Runup',unit:'m',digits:3}],background:'The Iribarren number is $\\xi_0=\\beta/\\sqrt{H/L_0}$. Setup and 2% runup follow Stockdon et al. (2006), with separate dissipative ($\\xi_0<0.3$) and non-dissipative forms.'},
 'fringe-setup':{title:'Wind and Wave Setup on a Fringing Reef',fields:[['depth','Depth over Reef','m',.5],['H','Deep Water Wave Height','m',1],['T','Wave Period','s',10],['wind','Wind Speed','m/s',15],['width','Reef Width','m',300]].map(([key,label,unit,value])=>({key:key as string,label:label as string,unit:unit as string,value:value as number,min:0})),calculate:v=>fringeSetup(v.depth,v.H,v.T,v.wind,v.width),outputs:[{key:'waveSetup',label:'Wave Setup (Sánchez)',unit:'m',digits:3},{key:'windSetup',label:'Wind Setup (Sánchez)',unit:'m',digits:3}],background:'Wave setup is $\\eta_w=\\max[-0.18h+0.48\\log_{10}(H_s^2T_p)-5.53H_s/T_p^2,0]$. Wind setup uses a wind-speed-dependent drag coefficient and reef width.'},
 'fall-velocity':{title:'Fall Velocity (Non-Cohesive Sediment)',fields:[{key:'d',label:'Particle Diameter',unit:'m',value:.0003,min:.000001},{key:'rhoS',label:'Density of Particle',unit:'kg/m³',value:2650,min:1},{key:'rho',label:'Density of Fluid',unit:'kg/m³',value:1027,min:1}],calculate:v=>({...fallVelocity(v.d,v.rhoS,v.rho),millimetres:v.d*1000,microns:v.d*1e6}),outputs:[{key:'millimetres',label:'Grain Diameter',unit:'mm',digits:6},{key:'microns',label:'Grain Diameter',unit:'µm',digits:2},{key:'fentonChurch',label:'Fall Velocity (Ferguson & Church)',unit:'m/s',digits:4},{key:'soulsby',label:'Fall Velocity (Soulsby)',unit:'m/s',digits:4}],background:'Two established settling-velocity formulations are shown: Ferguson & Church (2004) and Soulsby (1997). Both account for relative density, gravity, grain diameter and water viscosity.'},
 'bed-shear':{title:'Bed Shear Stress (Waves and Currents)',fields:[['H','Wave Height','m',2],['T','Wave Period','s',8],['phi','Wave–Current Angle','deg',45],['U','Depth-Averaged Current Speed','m/s',.5],['z0','Bed Roughness Length','m',.002],['depth','Water Depth','m',50],['rho','Water Density','kg/m³',1027]].map(([key,label,unit,value])=>({key:key as string,label:label as string,unit:unit as string,value:value as number,min:0})),calculate:v=>bedShear(v.H,v.T,v.phi,v.U,v.z0,v.depth,v.rho),outputs:[{key:'uw',label:'Bed Orbital Velocity',unit:'m/s',digits:3},{key:'A',label:'Orbital Semi-Excursion',unit:'m',digits:3},{key:'cd',label:'Drag Coefficient',digits:6},{key:'fw',label:'Wave Friction Factor',digits:6},{key:'tauC',label:'Current-Only Shear Stress',unit:'N/m²',digits:4},{key:'tauW',label:'Wave-Only Shear Stress',unit:'N/m²',digits:4},{key:'tauM',label:'Mean Combined Shear Stress',unit:'N/m²',digits:4},{key:'tauMax',label:'Maximum Combined Shear Stress',unit:'N/m²',digits:4}],background:'Combined wave–current shear stress uses the simple DATA13 method of Soulsby (1997), assuming rough turbulent flow. $\\tau_c=\\rho C_DU^2$ and $\\tau_w=\\tfrac12\\rho f_wU_w^2$.'},
 'critical-current':{title:'Critical Depth Averaged Current Speed (Non-Cohesive)',fields:[{key:'d',label:'Median Grain Size',unit:'m',value:.0001},{key:'depth',label:'Water Depth',unit:'m',value:10},{key:'rhoS',label:'Particle Density',unit:'kg/m³',value:2650},{key:'rho',label:'Fluid Density',unit:'kg/m³',value:1027}],calculate:v=>criticalSediment(v.d,v.depth,10,v.rhoS,v.rho),outputs:[{key:'dStar',label:'D*',digits:2},{key:'current',label:'Critical Depth-Averaged Current Speed',unit:'m/s',digits:3}],background:'The threshold current follows Soulsby (1997): $\\bar U_{cr}=7(h/d_{50})^{1/7}[g(s-1)d_{50}f(D_*)]^{1/2}$.'},
 'critical-shear':{title:'Critical Bed Shear Stress (Non-Cohesive)',fields:[{key:'d',label:'Grain Size',unit:'m',value:.0002},{key:'rhoS',label:'Particle Density',unit:'kg/m³',value:2650},{key:'rho',label:'Fluid Density',unit:'kg/m³',value:1027}],calculate:v=>criticalSediment(v.d,10,10,v.rhoS,v.rho),outputs:[{key:'dStar',label:'D*',digits:2},{key:'shields',label:'Critical Shields Parameter',digits:4},{key:'shear',label:'Critical Bed Shear Stress',unit:'N/m²',digits:3}],background:'The critical Shields parameter is $\\theta_{cr}=0.30/(1+1.2D_*)+0.055[1-e^{-0.02D_*}]$, and $\\tau_{cr}=\\theta_{cr}g(\\rho_s-\\rho)d$.'},
 'critical-orbital':{title:'Critical Bed Orbital Velocity (Non-Cohesive)',fields:[{key:'d',label:'Grain Size',unit:'m',value:.0002},{key:'T',label:'Wave Period',unit:'s',value:10},{key:'rhoS',label:'Particle Density',unit:'kg/m³',value:2650},{key:'rho',label:'Fluid Density',unit:'kg/m³',value:1027}],calculate:v=>criticalSediment(v.d,10,v.T,v.rhoS,v.rho),outputs:[{key:'orbital',label:'Critical Bed Orbital Velocity',unit:'m/s',digits:3}],background:'Critical bed orbital velocity follows the piecewise Soulsby (1997) relationship for grains below and above 0.5 mm.'},
 'beach-slope':{title:'Beach-Face Slope by Grain Size',fields:[{key:'d',label:'Median Grain Size',unit:'m',value:.001,min:.000126}],calculate:v=>({slope:beachSlope(v.d)}),outputs:[{key:'slope',label:'Beach Slope',digits:3}],background:'Beach-face slope is estimated from median grain size using the empirical relationship in the original application: $\\beta=-0.178(d_{50,mm}-0.125)^{-0.187}+0.294$.'},
 'sediment-density':{title:'Sediment Density and Porosity',fields:[['sand','Percentage Sand','%',30],['silt','Percentage Silt','%',30],['clay','Percentage Clay','%',40],['rhoW','Water Density','kg/m³',1025],['rhoS','Specific Sediment Density','kg/m³',2650]].map(([key,label,unit,value])=>({key:key as string,label:label as string,unit:unit as string,value:value as number,min:0})),calculate:v=>sedimentDensity(v.sand,v.silt,v.clay,v.rhoW,v.rhoS),outputs:[{key:'dry',label:'Dry Bulk Density',unit:'kg/m³',digits:2},{key:'wet',label:'Wet Bulk Density',unit:'kg/m³',digits:2},{key:'porosity',label:'Porosity',digits:2}],background:'Dry density is a weighted empirical combination of sand, silt and clay fractions. Wet bulk density and porosity are then calculated from water and particle densities.'},
 'wind-setup':{title:'Wind Setup in an Enclosed Water Body',fields:[{key:'wind',label:'Wind Speed',unit:'m/s',value:25},{key:'depth',label:'Average Depth',unit:'m',value:1},{key:'fetch',label:'Fetch',unit:'m',value:4000}],calculate:v=>({setup:enclosedWindSetup(v.wind,v.depth,v.fetch)}),outputs:[{key:'setup',label:'Wind Setup',unit:'m',digits:3}],background:'Wind setup is calculated as $\\eta=\\tfrac12k(U_{10}^2/gh)F$, with $k=3.5\\times10^{-6}$.'},
 'rock-sizing':{title:'Rock Sizing for Double Layer Sea Dikes and Revetments',fields:[['H','Significant Wave Height','m',2.5],['periodType','Wave Period Characterisation','',1],['T','Wave Period','s',16],['rhoS','Rock Density','kg/m³',2700],['rhoW','Water Density','kg/m³',1025],['S','Damage Parameter','',2],['P','Notional Permeability','',.4],['Nz','Number of Waves','',2160],['alpha','Slope Angle','deg',14],['waveAngle','Wave Angle','deg',0],['safety','Safety Factor','',1.1],['depth','Depth at Toe','m',3]].map(([key,label,unit,value])=>({key:key as string,label:label as string,unit:unit as string,value:value as number,min:0})),calculate:v=>rockSizing(v.H,v.T,v.rhoS,v.rhoW,v.S,v.P,v.Nz,v.alpha,v.depth,v.waveAngle,v.safety,Boolean(v.periodType)),outputs:[{key:'xi',label:'Surf Similarity Parameter',digits:3},{key:'duration',label:'Storm Duration',unit:'hours',digits:2},{key:'steepness',label:'Wave Steepness',digits:4},{key:'wavelength',label:'Deep Water Wavelength',unit:'m',digits:2},{key:'diameter',label:'Rock Diameter Dn50',unit:'m',digits:2}],background:'Nominal armour diameter follows Van der Meer (1988) for two-layer, non-overtopped rock slopes, including permeability, damage, storm duration, depth, obliquity and safety factors.'},
 'overtopping':{title:'Runup/Overtopping of Sea Dikes and Revetments',fields:[['H','Significant Wave Height at Toe','m',2.5],['T','Wave Period','s',9],['alpha','Slope Angle','deg',20],['waveAngle','Wave Angle','deg',0],['runupSafety','Runup Safety Factor','',1.1],['overtopSafety','Overtopping Safety Factor','',1.5],['rough','Slope Roughness Factor','',.9],['berm','Berm Factor','',1],['Rc','Crest Level Above SWL','m',8.5]].map(([key,label,unit,value])=>({key:key as string,label:label as string,unit:unit as string,value:value as number,min:0})),calculate:v=>overtopping(v.H,v.T,v.alpha,v.waveAngle,v.runupSafety,v.overtopSafety,v.rough,v.berm,v.Rc),outputs:[{key:'xi',label:'Surf Similarity Parameter',digits:3},{key:'runup',label:'2% Runup',unit:'m',digits:2},{key:'rate',label:'Overtopping Rate',unit:'litres/m/s',digits:4},{key:'percentage',label:'Percentage Overtopping',unit:'%',digits:2}],background:'Runup and mean overtopping discharge follow the EurOtop formulations used in the original application, including slope roughness, berm, wave-angle and safety factors.'},
 'submerged-breakwater':{title:'Wave Transmission over Submerged Breakwater',fields:[['H','Wave Height','m',2],['L','Wave Length','m',150],['depth','Submergence Depth','m',.5],['width','Reef Width','m',15],['d50','Core Median Rock Size','m',.5]].map(([key,label,unit,value])=>({key:key as string,label:label as string,unit:unit as string,value:value as number,min:.000001})),calculate:v=>submergedTransmission(v.H,v.L,v.depth,v.width,v.d50),outputs:[{key:'coefficient',label:'Transmission Coefficient',digits:2},{key:'reduction',label:'Wave Reduction',unit:'%',digits:0},{key:'inRange',label:'Variables Within Calibration Range'}],background:'Transmission follows the empirical submerged-breakwater relationship used in the Shiny app. A warning is shown when either calibration parameter is outside its published range.'},
 'reef-balls':{title:'Wave Transmission over Reef Balls',fields:[['H','Wave Height','m',1.5],['L','Wave Length','m',150],['depth','Submergence Depth','m',.5],['width','Peak-to-Peak Array Width','m',15]].map(([key,label,unit,value])=>({key:key as string,label:label as string,unit:unit as string,value:value as number,min:.000001})),calculate:v=>reefBallTransmission(v.H,v.L,v.depth,v.width),outputs:[{key:'coefficient',label:'Transmission Coefficient',digits:2},{key:'reduction',label:'Wave Reduction',unit:'%',digits:0}],background:'The transmission coefficient is calculated from relative submergence and dimensionless array width, with interpolation through the transition range.'}
}
const fullBackgrounds: Record<RemainingId,string> = {
  'wave-setup': `Wave setup and runup on a planar beach are calculated using Stockdon et al. (2006). The deep-water wavelength is

$L_0=\\frac{gT^2}{2\\pi}$

and the Iribarren number is

$\\xi_0=\\frac{\\beta_f}{\\sqrt{H_0/L_0}}$

where $H_0$ is deep-water wave height, $T$ is wave period and $\\beta_f$ is beach-face slope. For dissipative conditions ($\\xi_0<0.3$):

$\\eta=0.016\\sqrt{H_0L_0}, \\qquad R_{2\\%}=0.043\\sqrt{H_0L_0}$

For $\\xi_0\\ge0.3$:

$\\eta=0.35\\beta_f\\sqrt{H_0L_0}$

$R_{2\\%}=1.1\\left[0.35\\beta_f\\sqrt{H_0L_0}+\\frac{\\sqrt{H_0L_0(0.563\\beta_f^2+0.004)}}{2}\\right]$

Breaker type is classified as spilling for $\\xi_0<0.5$, plunging for $0.5\\le\\xi_0<3.3$, and surging or collapsing above 3.3.

Reference: Stockdon, H. F., Holman, R. A., Howd, P. A., & Sallenger, A. H. (2006). Empirical parameterization of setup, swash, and runup. Coastal Engineering, 53(7), 573–588.`,
  'fringe-setup': `Wave and wind setup on a fringing reef follow the empirical relationships presented by Sánchez et al. (2007). Wave setup is

$\\eta_{wave}=\\max\\left[-0.18h+0.48\\log_{10}(H_s^2T_p)-5.53\\frac{H_s}{T_p^2},0\\right]$

where $h$ is depth over the reef, $H_s$ is significant wave height and $T_p$ is peak period.

Wind setup is

$\\eta_{wind}=\\frac{BC_DU_{10}^2}{K(h+\\eta_{wave})}$

where $B$ is reef width, $K=100000/3$, and the wind drag coefficient varies linearly from $C_D=0.00063$ at zero wind to $0.00723$ at 100 m/s:

$C_D=0.00063+(0.00723-0.00063)\\frac{U_{10}}{100}$

These relationships are empirical and should be applied cautiously outside the calibration conditions.

Reference: Sánchez, A., et al. (2007), fringing-reef wave and wind setup relationships used in the original application.`,
  'fall-velocity': `Fall velocity for non-cohesive sediment is calculated with two methods. Ferguson and Church (2004) define

$w=\\frac{Rg d^2}{C_1\\nu+\\sqrt{0.75C_2Rg d^3}}$

where $R=(\\rho_s-\\rho)/\\rho$, $C_1=18$, $C_2=1$, $d$ is particle diameter and $\\nu=1.36\\times10^{-6}\\,m^2/s$.

Soulsby (1997) defines dimensionless grain size as

$D_*=\\left[\\frac{g(s-1)}{\\nu^2}\\right]^{1/3}d, \\qquad s=\\frac{\\rho_s}{\\rho}$

and fall velocity as

$w=\\frac{\\nu}{d}\\left(\\sqrt{10.36^2+1.049D_*^3}-10.36\\right)$

The sediment is assumed to be non-cohesive and the fluid properties are represented by the entered density and fixed kinematic viscosity.

References: Ferguson, R. I., & Church, M. (2004). A simple universal equation for grain settling velocity. Journal of Sedimentary Research, 74(6), 933–937. Soulsby, R. L. (1997). Dynamics of Marine Sands. Thomas Telford.`,
  'bed-shear': `Combined wave-current bed shear stress uses the simple DATA13 method of Soulsby (1997). Rough turbulent flow is assumed, which is appropriate for most practical marine settings.

Current-only shear stress is

$\\tau_c=\\rho C_D\\bar U^2, \\qquad C_D=\\left[\\frac{0.40}{1+\\ln(z_0/h)}\\right]^2$

Wave-only shear stress is

$\\tau_w=\\frac12\\rho f_wU_w^2, \\qquad f_w=1.39\\left(\\frac{A}{z_0}\\right)^{-0.52}$

where $U_w=\\pi H/[T\\sinh(kh)]$ and $A=U_wT/(2\\pi)$ is semi-orbital excursion.

The cycle-mean combined stress is

$\\tau_m=\\tau_c\\left[1+1.2\\left(\\frac{\\tau_w}{\\tau_c+\\tau_w}\\right)^{3.2}\\right]$

and maximum combined stress is

$\\tau_{max}=\\left[(\\tau_m+\\tau_w\\cos\\phi)^2+(\\tau_w\\sin\\phi)^2\\right]^{1/2}$

The wave-current angle is folded into 0–90 degrees because wave orbital motion reverses. $\\tau_m$ governs current friction and diffusion into the outer flow; $\\tau_{max}$ is used for threshold of motion and entrainment. Typical $z_0$ values from Soulsby range from about 0.00005 m for silt/sand to 0.006 m for rippled sand.

Reference: Soulsby, R. L. (1997). Dynamics of Marine Sands. Thomas Telford.`,
  'critical-current': `The critical threshold for depth-averaged current speed over a horizontal, unrippled bed follows Soulsby (1997):

$\\bar U_{cr}=7\\left(\\frac{h}{d_{50}}\\right)^{1/7}\\left[g(s-1)d_{50}f(D_*)\\right]^{1/2}$

where $s=\\rho_s/\\rho$ and

$D_*=\\left[\\frac{g(s-1)}{\\nu^2}\\right]^{1/3}d_{50}$

$f(D_*)=\\frac{0.30}{1+1.2D_*}+0.055[1-\\exp(-0.02D_*)]$

The relationship is valid for $D_*>0.1$.

Reference: Soulsby, R. L. (1997). Dynamics of Marine Sands. Thomas Telford.`,
  'critical-shear': `Critical bed shear stress for non-cohesive sediment is calculated from the Soulsby (1997) approximation to the Shields curve.

$D_*=\\left[\\frac{g(s-1)}{\\nu^2}\\right]^{1/3}d$

$\\theta_{cr}=\\frac{0.30}{1+1.2D_*}+0.055[1-\\exp(-0.020D_*)]$

$\\tau_{cr}=\\theta_{cr}g(\\rho_s-\\rho)d$

Here $d$ is grain diameter, $s=\\rho_s/\\rho$, and $\\nu=1.36\\times10^{-6}\\,m^2/s$.

Reference: Soulsby, R. L. (1997). Dynamics of Marine Sands. Thomas Telford.`,
  'critical-orbital': `Critical bed orbital velocity for non-cohesive sediment follows Soulsby (1997). For $d<0.5$ mm:

$U_{w,cr}=[0.118g(s-1)]^{2/3}d^{1/3}T^{1/3}$

For $d\\ge0.5$ mm:

$U_{w,cr}=[1.09g(s-1)]^{4/7}d^{3/7}T^{1/7}$

where $s=\\rho_s/\\rho$, $d$ is grain diameter and $T$ is wave period.

Reference: Soulsby, R. L. (1997). Dynamics of Marine Sands. Thomas Telford.`,
  'beach-slope': `Beach-face slope is estimated from median grain size using the empirical relationship

$\\beta=-0.178(d_{50,mm}-0.125)^{-0.187}+0.294$

where $d_{50,mm}$ is median grain size in millimetres. The relationship should not be extrapolated below 0.125 mm, where the fractional power becomes undefined in real arithmetic. It is an empirical estimate rather than a substitute for a surveyed beach profile.`,
  'sediment-density': `Dry bulk density is estimated from the percentages of sand, silt and clay:

$\\rho_{dry}=1550p_{sand}+1120p_{silt}+415p_{clay}$

where each fraction $p$ is expressed from 0 to 1. The three percentages should sum to 100.

Wet bulk density is

$\\rho_{bulk}=\\rho_w+\\frac{\\rho_s-\\rho_w}{\\rho_s}\\rho_{dry}$

and porosity is

$n=\\frac{\\rho_s-\\rho_{dry}}{\\rho_s}$

where $\\rho_w$ is water density and $\\rho_s$ is the specific density of sediment particles.`,
  'wind-setup': `Wind setup in an enclosed water body is estimated as

$\\eta_{wind}=\\frac12k\\left(\\frac{U_{10}^2}{gh}\\right)F$

where $U_{10}$ is 10 m wind speed, $h$ is average water depth, $F$ is fetch, $g=9.81\\,m/s^2$, and $k=3.5\\times10^{-6}$. The method assumes a uniform enclosed water body and constant wind acting along the fetch.`,
  'rock-sizing': `Rock sizing follows Van der Meer (1988) for two-layer armoured, non-overtopped slopes. Deep-water wavelength, steepness and surf similarity are

$L_0=\\frac{gT^2}{2\\pi}, \\qquad s_m=\\frac{H_s}{L_0}, \\qquad \\xi_m=s_m^{-1/2}\\tan\\alpha$

The transition value is

$\\xi_{mc}=\\left[\\frac{C_{pl}}{C_s}P^{0.31}\\sqrt{\\tan\\alpha}\\right]^{1/(P+0.5)}$

with $C_{pl}=8.4$, $C_s=1.3$ for spectral period $T_{m-1}$, or 8.7 and 1.4 for mean period $T_m$. Plunging and surging stability numbers incorporate permeability $P$, damage $S_d$, number of waves $N_z$, depth limitation, obliquity and safety factors. Nominal diameter is

$D_{n50}=\\frac{H_s}{\\Delta N_s}, \\qquad \\Delta=\\frac{\\rho_s}{\\rho_w}-1$

The calculator selects the plunging or surging expression using $\\xi_m$, $\\xi_{mc}$ and slope limits.

Reference: Van der Meer, J. W. (1988). Rock slopes and gravel beaches under wave attack. Delft Hydraulics Communication No. 396.`,
  'overtopping': `Runup and overtopping follow EurOtop relationships for sea dikes and revetments. Surf similarity is

$\\xi_m=s_m^{-1/2}\\tan\\alpha, \\qquad s_m=H_s/L_0$

For $\\xi_m<1.7$, 2% runup is

$R_{2\\%}=1.65\\gamma_s\\gamma_r\\gamma_b\\gamma_\\beta\\xi_mH_s$

and for larger $\\xi_m$:

$R_{2\\%}=\\gamma_s\\gamma_r(4-1.5/\\sqrt{\\xi_m})H_s$

The wave-angle factor is $\\gamma_\\beta=0.5+0.5\\cos^2\\beta$. Mean overtopping discharge uses the relevant breaking, non-breaking or steep-slope exponential EurOtop expression and is returned in litres per metre per second. Percentage overtopping is

$P_{ov}=100\\exp[-3.91R_c^2/R_{2\\%}^2]$

Reference: EurOtop (2018). Manual on wave overtopping of sea defences and related structures.`,
  'submerged-breakwater': `Wave transmission over a submerged rubble-mound breakwater is calculated as

$K_t=1-\\left[\\exp\\left(-0.65\\frac{d_s}{H}-1.09\\frac{H}{B}\\right)+0.047\\frac{Bd_s}{Ld_{50}}-0.067\\frac{d_sH}{Bd_{50}}\\right]$

where $H$ and $L$ are incident wave height and wavelength, $d_s$ is submergence depth, $B$ is crest width and $d_{50}$ is median core-rock size. Wave reduction is $(1-K_t)\\times100\\%$.

The empirical calibration ranges used by the original application are

$0\\le Bd_s/(Ld_{50})\\le7.08$

and

$0\\le d_sH/(Bd_{50})\\le2.14$.

Results outside these ranges are flagged and should not be relied upon without further validation.`,
  'reef-balls': `Wave transmission over a Reef Ball array is expressed using relative submergence

$R^*=R_c/H$

and dimensionless effective array width

$b^*=0.6B/\\sqrt{HL}$.

For $R^*\\le0.4$:

$K_t=[-0.249\\min(4,b^*)+0.9474]^2$

For $R^*\\ge0.7$:

$K_t=\\frac{1}{1+0.3(R^*)^{-1.5}b^*}$

The calculator linearly blends the two expressions for $0.4<R^*<0.7$. Percentage wave reduction is $(1-K_t)\\times100\\%$. The relationship is empirical and should be used within the geometric and wave conditions represented by its source data.`
}
for (const [id, background] of Object.entries(fullBackgrounds)) configs[id as RemainingId].background = background
const backgroundImages: Partial<Record<RemainingId,{src:string;alt:string;caption:string}[]>> = {
  'reef-balls': [{ src: 'reef-balls-schematic.png', alt: 'Reef Ball array geometry and wave transmission variables', caption: 'Reef Ball array schematic used by the transmission relationship.' }],
  'submerged-breakwater': [{ src: 'submerged-breakwater-schematic.png', alt: 'Submerged breakwater geometry and calculation variables', caption: 'Submerged breakwater geometry and variables.' }],
  'rock-sizing': [{ src: 'rock-sizing-damage-table.png', alt: 'Van der Meer damage parameter guidance table', caption: 'Damage parameter guidance used in the original Shiny background.' }],
  'overtopping': [
    { src: 'overtopping-schematic.png', alt: 'Revetment runup and overtopping geometry', caption: 'Runup and overtopping geometry.' },
    { src: 'wave-reduction-factors.png', alt: 'EurOtop wave reduction factor guidance', caption: 'Wave reduction factors from the original background.' },
    { src: 'eurotop-coefficients.png', alt: 'EurOtop coefficient guidance table', caption: 'EurOtop coefficient guidance used by the original calculator.' },
  ],
}
const config=configs[props.id];const stored=JSON.parse(localStorage.getItem(`marine-calculators:${props.id}:v1`)??'{}');const values=reactive<Record<string,number>>(Object.fromEntries(config.fields.map(f=>[f.key,stored[f.key]??f.value])));watch(values,v=>localStorage.setItem(`marine-calculators:${props.id}:v1`,JSON.stringify(v)),{deep:true});const result=computed(()=>config.calculate(values));const sweepKey=ref(config.fields[0].key);const outputKey=ref(config.outputs.find(o=>typeof result.value[o.key]==='number')?.key??config.outputs[0].key);const sweep=computed(()=>{const base=values[sweepKey.value];const field=config.fields.find(f=>f.key===sweepKey.value)!;const lo=Math.max(field.min??0,base*.25||.000001);const hi=Math.max(base*2,lo*2);return linspace(lo,hi,80).map(x=>({x,y:Number(config.calculate({...values,[sweepKey.value]:x})[outputKey.value])}))});const chartData=computed(()=>[{x:sweep.value.map(p=>p.x),y:sweep.value.map(p=>p.y),type:'scatter' as const,mode:'lines' as const,line:{color:'#0879bd',width:2},hovertemplate:'%{x:.4g}<br>%{y:.4g}<extra></extra>'},{x:[values[sweepKey.value]],y:[Number(result.value[outputKey.value])],type:'scatter' as const,mode:'markers' as const,marker:{color:'#111',size:9},hovertemplate:'Current<extra></extra>'}]);function display(key:string,digits=3){const v=result.value[key];if(typeof v==='boolean')return v?'Yes':'No';if(typeof v==='string')return v;return Number.isFinite(v)?Number(v).toFixed(digits):'Not applicable'}
const exporting=ref(false);const canExport=supportsRemainingWorkbook(props.id);async function downloadExcel(){exporting.value=true;try{await downloadRemainingWorkbook(props.id,{...values})}finally{exporting.value=false}}
onMounted(async()=>{await nextTick();const el=document.querySelector('.remaining-background') as HTMLElement|null;if(!el)return;renderMathInElement(el,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false});for(const item of backgroundImages[props.id]??[]){const figure=document.createElement('figure');figure.className='background-figure';const image=document.createElement('img');image.src=`${import.meta.env.BASE_URL}images/background/${item.src}`;image.alt=item.alt;image.loading='lazy';const caption=document.createElement('figcaption');caption.textContent=item.caption;figure.append(image,caption);el.append(figure)}})
</script>
<template>
  <section class="calculator">
    <div class="calculator-heading"><h1>{{ config.title }}</h1><button v-if="canExport" class="excel-download" type="button" :disabled="exporting" @click="downloadExcel">{{ exporting ? 'Preparing Excel…' : 'Download Excel template' }}</button></div>
    <div class="calculator-grid">
      <article class="panel input-panel">
        <div class="panel-title input-title"><h2>Input</h2></div>
        <label v-for="f in config.fields" :key="f.key">
          {{ f.label }} <span v-if="f.unit">({{ f.unit }})</span>
          <select v-if="f.key === 'periodType'" v-model.number="values[f.key]">
            <option :value="1">Spectral Wave Period (Tm-1)</option>
            <option :value="0">Mean Wave Period (Tm)</option>
          </select>
          <input v-else v-model.number="values[f.key]" type="number" :min="f.min ?? 0" :max="f.max" :step="f.step ?? 'any'" />
        </label>
      </article>
      <article class="panel output-panel">
        <div class="panel-title output-title"><h2>Output</h2></div>
        <dl class="results"><div v-for="o in config.outputs" :key="o.key"><dt>{{ o.label }}</dt><dd>{{ display(o.key, o.digits) }}<template v-if="o.unit"> {{ o.unit }}</template></dd></div></dl>
      </article>
      <article class="panel charts-panel">
        <div class="panel-title graphical-title"><h2>Graphical</h2></div>
        <div class="graphical-body single-graphical-body">
          <PlotlyChart :data="chartData" :layout="{ xaxis: { title: { text: config.fields.find(f => f.key === sweepKey)?.label } }, yaxis: { title: { text: config.outputs.find(o => o.key === outputKey)?.label } }, showlegend: false }" />
          <div class="select-row">
            <label>Input<select v-model="sweepKey"><option v-for="f in config.fields.filter(f => f.key !== 'periodType')" :key="f.key" :value="f.key">{{ f.label }}</option></select></label>
            <label>Output<select v-model="outputKey"><option v-for="o in config.outputs.filter(o => typeof result[o.key] === 'number')" :key="o.key" :value="o.key">{{ o.label }}</option></select></label>
          </div>
        </div>
      </article>
    </div>
    <article class="background-panel"><div class="background-title"><h2>Background</h2><span>−</span></div><div class="background-body remaining-background"><p>{{ config.background }}</p></div></article>
  </section>
</template>
