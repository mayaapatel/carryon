// utils/packingEngine.js
// Deterministic packing recommendations: no paid API or AI call required.

export const CATEGORIES = [
  { id:"clothing", title:"Clothing", icon:"shirt-outline" },
  { id:"shoes", title:"Shoes", icon:"footsteps-outline" },
  { id:"toiletries", title:"Toiletries", icon:"sparkles-outline" },
  { id:"health", title:"Health", icon:"medkit-outline" },
  { id:"electronics", title:"Electronics", icon:"phone-portrait-outline" },
  { id:"documents", title:"Travel Essentials", icon:"document-text-outline" },
  { id:"personal", title:"Personal Item", icon:"bag-handle-outline" },
  { id:"activities", title:"Activities", icon:"sunny-outline" },
];

const item=(id,name,category,qty=1,unit="",reason="",custom=false)=>({
  id,name,category,qty,unit,reason,packed:false,custom
});

export function tripDays(start,end){
  if(!start||!end) return 4;
  const a=new Date(start), b=new Date(end);
  if(Number.isNaN(a.getTime())||Number.isNaN(b.getTime())) return 4;
  return Math.max(1,Math.round((b-a)/86400000)+1);
}

export function defaultSettings(){
  return {
    laundry:"none", style:"normal", luggage:"carryon",
    activities:[], glasses:false, contacts:false,
    medications:false, menstrual:false
  };
}

export function buildPackingList(days=4,settings=defaultSettings(),weather=null){
  const laundry=settings.laundry||"none";
  const style=settings.style||"normal";
  const multiplier=style==="light"?.75:style==="prepared"?1.2:1;
  const clothingDays=laundry==="anytime"?Math.min(days,4):laundry==="once"?Math.ceil(days/2)+1:days;
  const q=(n,min=1)=>Math.max(min,Math.ceil(n*multiplier));
  const list=[
    item("underwear","Underwear","clothing",q(clothingDays+1),"","One per day + spare"),
    item("socks","Socks","clothing",q(clothingDays+1),"pairs","One pair per day + spare"),
    item("tops","Everyday tops","clothing",q(Math.max(2,clothingDays*.7)),"","Mix-and-match across the trip"),
    item("bottoms","Bottoms","clothing",q(Math.max(2,clothingDays/3)),"","Can usually be reworn"),
    item("pajamas","Pajamas","clothing",days>6?2:1,"set",""),
    item("underlayer","Undershirts / base layers","clothing",q(Math.max(1,clothingDays/3)),"",""),
    item("casual_shoes","Everyday walking shoes","shoes",1,"pair",""),
    item("toothbrush","Toothbrush","toiletries",1),
    item("toothpaste","Toothpaste","toiletries",1),
    item("deodorant","Deodorant","toiletries",1),
    item("shampoo","Shampoo","toiletries",1),
    item("conditioner","Conditioner","toiletries",1),
    item("bodywash","Body wash / soap","toiletries",1),
    item("skincare","Skincare essentials","toiletries",1,"set",""),
    item("hair","Hairbrush / comb","toiletries",1),
    item("sunscreen","Sunscreen","health",1),
    item("painrelief","Basic pain reliever","health",1),
    item("firstaid","Small first-aid kit","health",1),
    item("phone","Phone","electronics",1),
    item("charger","Phone charger","electronics",1),
    item("powerbank","Portable charger","electronics",1),
    item("headphones","Headphones / earbuds","electronics",1),
    item("adapter","Travel power adapter","electronics",1,"","Useful for international travel"),
    item("wallet","Wallet","documents",1),
    item("id","ID / driver's license","documents",1),
    item("passport","Passport (if needed)","documents",1),
    item("cards","Credit / debit cards","documents",2),
    item("confirmations","Travel confirmations","documents",1,"set","Keep offline copies"),
    item("waterbottle","Reusable water bottle","personal",1),
    item("snacks","Travel snacks","personal",q(Math.max(1,days/3)),"",""),
    item("sunglasses","Sunglasses","personal",1),
    item("daybag","Day bag / backpack","personal",1),
  ];

  const acts=new Set(settings.activities||[]);
  if(acts.has("swimming")){
    list.push(item("swimsuit","Swimsuit","activities",days>5?2:1),item("sandals","Sandals / flip-flops","shoes",1,"pair"));
  }
  if(acts.has("workout")){
    list.push(item("workout","Workout outfits","activities",Math.min(days,3),"set"),item("gymshoes","Athletic shoes","shoes",1,"pair"));
  }
  if(acts.has("hiking")){
    list.push(item("hikingboots","Hiking shoes / boots","shoes",1,"pair"),item("hikegear","Hiking day gear","activities",1,"set"));
  }
  if(acts.has("formal")){
    list.push(item("formaloutfit","Formal outfit","activities",1,"set"),item("formalshoes","Dress shoes","shoes",1,"pair"));
  }
  if(acts.has("business")) list.push(item("business","Business outfits","activities",Math.min(days,3),"set"));
  if(settings.glasses) list.push(item("glasses","Glasses + case","personal",1,"set"));
  if(settings.contacts) list.push(item("contacts","Contacts + solution","personal",q(days+2),"lenses"));
  if(settings.medications) list.push(item("meds","Prescription medications","health",days+2,"days","Trip supply + 2-day buffer"));
  if(settings.menstrual) list.push(item("period","Menstrual products","health",1,"trip supply"));

  // Weather is optional; packing.jsx can pass a summary later.
  if(weather?.cold) list.push(item("coat","Warm coat / jacket","clothing",1));
  if(weather?.veryCold) list.push(item("winter","Hat + gloves + scarf","clothing",1,"set"));
  if(weather?.rain) list.push(item("rain","Rain jacket / compact umbrella","personal",1));

  return list;
}
