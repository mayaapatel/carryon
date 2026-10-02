const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const CHECKPOINTS={
 '1':[{id:'CP1',pre:false,open:[210,1380]},{id:'CP2',pre:true,open:[240,1230]},{id:'CP3',pre:false,open:[225,1200]}],
 '2':[{id:'CP5',pre:true,open:[195,1380]}],
 '3':[{id:'CP6',pre:false,open:[225,1200]},{id:'CP7',pre:false,open:[210,1200]},{id:'CP7A',pre:true,open:[210,1350]},{id:'CP8',pre:false,open:[240,1230]}],
 '5':[{id:'CP10',pre:true,open:[0,1440]}]
};
const concourseTerminal={B:'1',C:'1',E:'2',F:'2',G:'3',H:'3',K:'3',L:'3',M:'5'};
const gateMax={B:24,C:31,E:17,F:28,G:21,H:18,K:20,L:27,M:40};
// Approximate airside graph calibrated to ORD concourse geometry; route estimate, not indoor positioning.
const anchors={
 '1':{CP1:{B:3,C:9},CP2:{B:4,C:8},CP3:{B:5,C:7}},
 '2':{CP5:{E:4,F:5}},
 '3':{CP6:{G:4,H:7,K:10,L:15},CP7:{G:6,H:5,K:7,L:12},CP7A:{G:8,H:5,K:6,L:10},CP8:{G:12,H:8,K:5,L:6}},
 '5':{CP10:{M:5}}
};
export function routeToGate(checkpoint='CP7A',gate='H12',pace='average'){
 const m=String(gate||'').toUpperCase().match(/^([BCEFGHKLM])(\d+)/); if(!m)return{minutes:10,distanceFt:2600,route:`${checkpoint} → gate`,confidence:45,estimated:true};
 const [,c,n0]=m,n=+n0,t=concourseTerminal[c]||'3'; const base=anchors[t]?.[checkpoint]?.[c]??8; const depth=(n/Math.max(1,gateMax[c]||20))*8; const mins=(base+depth); const factor={fast:.82,average:1,relaxed:1.22,mobility:1.55}[pace]||1; const minutes=Math.max(3,Math.round(mins*factor));
 return{minutes,distanceFt:Math.round(minutes*270/factor/50)*50,route:`${checkpoint} → Concourse ${c} → ${gate}`,confidence:72,estimated:true};
}
export function estimatedCheckedIn({capacity=180,loadFactor=.86,minutesToDeparture=120,status=''}){
 const booked=Math.round(capacity*loadFactor); const x=minutesToDeparture;
 let share=x>300?.18:x>240?.28:x>180?.45:x>120?.63:x>90?.76:x>60?.87:x>30?.95:.98;
 if(/boarding/i.test(status))share=Math.max(share,.96); if(/cancel/i.test(status))share=0;
 return{booked,checkedIn:Math.round(booked*share),share,source:'modeled',confidence:58};
}
export function boardingForecast({capacity=180,loadFactor=.86,minutesToDeparture=50,status='',airportPressure=1}){
 const ci=estimatedCheckedIn({capacity,loadFactor,minutesToDeparture,status}); const atGateShare=clamp(1-(minutesToDeparture-20)/100,.18,.92); const atGate=Math.round(ci.checkedIn*atGateShare); const groups=Math.max(3,Math.ceil(capacity/45)); const rate=10.5/Math.max(.85,airportPressure); const full=Math.max(12,Math.round(ci.booked/rate)); const queue=Math.max(2,Math.round((atGate/rate)*.55));
 return{wait:queue,fullBoarding:full,modeledAtGate:atGate,checkedIn:ci.checkedIn,booked:ci.booked,groups,confidence:55,source:'modeled-checkin'};
}
export function customsForecast({arrivingPassengers=220,internationalArrivals=5,hour=17,traveler='citizen'}){
 const peak=hour>=14&&hour<=20?1.22:hour>=6&&hour<=9?1.08:.92; const wave=clamp((internationalArrivals*180+arrivingPassengers)/1100,.65,1.8); const baseline=traveler==='visitor'?40.3:27.3; const wait=Math.round(clamp(baseline*peak*(.55+.45*wave),8,85));
 return{wait,range:[Math.max(5,wait-8),wait+11],confidence:68,source:'CBP-calibrated + arrival demand'};
}
export function airportPressure(summary){const pax=summary?.originatingTravelers||0;return clamp(.75+pax/28000,.8,1.8)}
export function aircraftSeats(model=''){const s=String(model).toUpperCase(); if(/A380/.test(s))return 500;if(/747/.test(s))return 410;if(/777/.test(s))return 320;if(/A350/.test(s))return 300;if(/787/.test(s))return 260;if(/A330/.test(s))return 270;if(/A321/.test(s))return 190;if(/A320/.test(s))return 170;if(/737.*9|739/.test(s))return 180;if(/737|738/.test(s))return 165;if(/E17|E19|CRJ/.test(s))return 80;return 160}
export function terminalForGate(gate=''){return concourseTerminal[String(gate).toUpperCase()[0]]||''}
