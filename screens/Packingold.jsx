import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Alert, Modal, SafeAreaView, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from "react-native";
import { auth, db } from "../firebaseConfig";
import { CATEGORIES, buildPackingList, defaultSettings, tripDays } from "../utils/packingEngine";

const PACKING_VERSION=1;
const uid=()=>`${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
const OPTIONS={
  laundry:[["none","No laundry"],["once","Once"],["anytime","Anytime"]],
  style:[["light","Pack light"],["normal","Normal"],["prepared","Extra prepared"]],
  luggage:[["personal","Personal item"],["carryon","Carry-on"],["checked","Checked bag"]],
};
const ACTS=[["swimming","Swimming"],["workout","Workouts"],["hiking","Hiking"],["formal","Formal event"],["business","Business"]];

function Choice({selected,label,onPress}) {
  return <TouchableOpacity onPress={onPress} style={[st.chip,selected&&st.chipOn]}>
    <Text style={[st.chipText,selected&&st.chipTextOn]}>{label}</Text>
  </TouchableOpacity>;
}

export default function Packing() {
  const router=useRouter();
  const {tripId,title}=useLocalSearchParams();
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [items,setItems]=useState([]);
  const [settings,setSettings]=useState(defaultSettings());
  const [trip,setTrip]=useState({days:4,city:"",country:""});
  const [open,setOpen]=useState({});
  const [setup,setSetup]=useState(false);
  const [addOpen,setAddOpen]=useState(false);
  const [newName,setNewName]=useState("");
  const [newCategory,setNewCategory]=useState("personal");
  const [newQty,setNewQty]=useState("1");

  const ref=()=>{
    const u=auth.currentUser;
    return u&&tripId?doc(db,"users",u.uid,"trips",String(tripId),"preparation","packing"):null;
  };

  useEffect(()=>{(async()=>{
    const u=auth.currentUser;
    if(!u||!tripId){setLoading(false);return;}
    const tripRef=doc(db,"users",u.uid,"trips",String(tripId));
    const ts=await getDoc(tripRef);
    const d=ts.exists()?ts.data():{};
    const start=d.startDate?.toDate?.()||d.startDate||null;
    const end=d.endDate?.toDate?.()||d.endDate||null;
    const days=tripDays(start,end);
    const city=d.location?.city||"";
    const country=d.location?.country||"";
    setTrip({days,city,country});

    const ps=await getDoc(doc(db,"users",u.uid,"trips",String(tripId),"preparation","packing")).catch(()=>null);
    if(ps?.exists()){
      const saved=ps.data();
      setSettings({...defaultSettings(),...(saved.settings||{})});
      setItems(Array.isArray(saved.items)?saved.items:buildPackingList(days,saved.settings||defaultSettings()));
    }else{
      const defaults=defaultSettings();
      const initial=buildPackingList(days,defaults);
      setSettings(defaults); setItems(initial);
      await setDoc(doc(db,"users",u.uid,"trips",String(tripId),"preparation","packing"),{
        version:PACKING_VERSION,settings:defaults,items:initial,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
      });
    }
    setLoading(false);
  })()},[tripId]);

  const save=async(nextItems=items,nextSettings=settings)=>{
    const r=ref(); if(!r)return;
    setSaving(true);
    try{await setDoc(r,{version:PACKING_VERSION,settings:nextSettings,items:nextItems,updatedAt:new Date().toISOString()},{merge:true});}
    finally{setSaving(false);}
  };

  const updateItems=(fn)=>{
    setItems(prev=>{const next=fn(prev);save(next,settings);return next;});
  };
  const toggle=id=>updateItems(a=>a.map(x=>x.id===id?{...x,packed:!x.packed}:x));
  const qty=(id,delta)=>updateItems(a=>a.map(x=>x.id===id?{...x,qty:Math.max(1,(Number(x.qty)||1)+delta)}:x));
  const remove=id=>Alert.alert("Remove item?","You can add it back later.",[
    {text:"Cancel",style:"cancel"},{text:"Remove",style:"destructive",onPress:()=>updateItems(a=>a.filter(x=>x.id!==id))}
  ]);
  const addItem=()=>{
    const name=newName.trim(); if(!name)return;
    const next=[...items,{id:`custom_${uid()}`,name,category:newCategory,qty:Math.max(1,Number(newQty)||1),unit:"",reason:"Added by you",packed:false,custom:true}];
    setItems(next);save(next,settings);setNewName("");setNewQty("1");setAddOpen(false);
  };
  const regenerate=()=>{
    Alert.alert("Update recommendations?","CarryOn will recalculate its suggested items. Your custom items and packed checkmarks will be preserved.",[
      {text:"Cancel",style:"cancel"},
      {text:"Update",onPress:()=>{
        const generated=buildPackingList(trip.days,settings);
        const old=new Map(items.map(x=>[x.id,x]));
        const merged=generated.map(x=>old.has(x.id)?{...x,packed:old.get(x.id).packed}:x);
        const customs=items.filter(x=>x.custom);
        const next=[...merged,...customs];
        setItems(next);save(next,settings);setSetup(false);
      }}
    ]);
  };

  const done=items.filter(x=>x.packed).length,total=items.length;
  const pct=total?Math.round(done/total*100):0;
  const grouped=useMemo(()=>Object.fromEntries(CATEGORIES.map(c=>[c.id,items.filter(x=>x.category===c.id)])),[items]);

  if(loading)return <SafeAreaView style={st.safe}><View style={st.loading}><ActivityIndicator size="large" color="#3F63F3"/><Text style={st.muted}>Building your packing list…</Text></View></SafeAreaView>;

  return <SafeAreaView style={st.safe}>
    <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
      <View style={st.top}>
        <TouchableOpacity style={st.iconBtn} onPress={()=>router.back()}><Ionicons name="chevron-back" size={24} color="#1F2937"/></TouchableOpacity>
        <Text style={st.topTitle}>Packing</Text>
        <TouchableOpacity style={st.iconBtn} onPress={()=>setSetup(true)}><Ionicons name="options-outline" size={21} color="#3F63F3"/></TouchableOpacity>
      </View>

      <View style={st.hero}>
        <Text style={st.eyebrow}>YOUR TRIP</Text>
        <Text style={st.heroTitle}>{trip.city||title||"Upcoming trip"}{trip.country?`, ${trip.country}`:""}</Text>
        <Text style={st.heroSub}>{trip.days} day{trip.days===1?"":"s"} · personalized packing list</Text>
        <View style={st.progressRow}><Text style={st.progressBig}>{done}/{total}</Text><Text style={st.progressLabel}> items packed · {pct}%</Text></View>
        <View style={st.track}><View style={[st.fill,{width:`${pct}%`}]}/></View>
        {saving&&<Text style={st.saving}>Saving…</Text>}
      </View>

      <View style={st.actions}>
        <TouchableOpacity style={st.primary} onPress={()=>setAddOpen(true)}><Ionicons name="add" size={18} color="#fff"/><Text style={st.primaryText}>Add item</Text></TouchableOpacity>
        <TouchableOpacity style={st.secondary} onPress={()=>setSetup(true)}><Ionicons name="sparkles-outline" size={17} color="#3F63F3"/><Text style={st.secondaryText}>Customize</Text></TouchableOpacity>
      </View>

      <View style={st.tip}><Ionicons name="information-circle-outline" size={17} color="#3F63F3"/><Text style={st.tipText}>CarryOn starts you with the basics. Change quantities, remove anything you don't need, or add anything we missed.</Text></View>

      {CATEGORIES.map(cat=>{
        const arr=grouped[cat.id]||[]; if(!arr.length)return null;
        const isOpen=open[cat.id]!==false;
        const packed=arr.filter(x=>x.packed).length;
        return <View key={cat.id} style={st.card}>
          <TouchableOpacity style={st.catHead} onPress={()=>setOpen(o=>({...o,[cat.id]:!isOpen}))}>
            <View style={st.catLeft}><View style={st.catIcon}><Ionicons name={cat.icon} size={17} color="#3F63F3"/></View><View><Text style={st.catTitle}>{cat.title}</Text><Text style={st.catCount}>{packed} of {arr.length} packed</Text></View></View>
            <Ionicons name={isOpen?"chevron-up":"chevron-down"} size={17} color="#6B7280"/>
          </TouchableOpacity>
          {isOpen&&arr.map((x,i)=><View key={x.id} style={[st.item,i>0&&st.itemBorder]}>
            <TouchableOpacity style={[st.check,x.packed&&st.checkOn]} onPress={()=>toggle(x.id)}>{x.packed&&<Ionicons name="checkmark" size={14} color="#fff"/>}</TouchableOpacity>
            <View style={st.itemMain}>
              <Text style={[st.itemName,x.packed&&st.itemDone]}>{x.name}</Text>
              {!!x.reason&&<Text style={st.reason}>{x.reason}</Text>}
              {x.custom&&<Text style={st.custom}>ADDED BY YOU</Text>}
            </View>
            <View style={st.qty}>
              <TouchableOpacity style={st.qtyBtn} onPress={()=>qty(x.id,-1)}><Text style={st.qtyBtnText}>−</Text></TouchableOpacity>
              <View style={st.qtyMid}><Text style={st.qtyNum}>{x.qty}</Text>{!!x.unit&&<Text style={st.unit}>{x.unit}</Text>}</View>
              <TouchableOpacity style={st.qtyBtn} onPress={()=>qty(x.id,1)}><Text style={st.qtyBtnText}>+</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={st.trash} onPress={()=>remove(x.id)}><Ionicons name="trash-outline" size={16} color="#9CA3AF"/></TouchableOpacity>
          </View>)}
        </View>
      })}
    </ScrollView>

    <Modal visible={addOpen} transparent animationType="slide" onRequestClose={()=>setAddOpen(false)}>
      <View style={st.overlay}><View style={st.sheet}>
        <View style={st.sheetHead}><Text style={st.sheetTitle}>Add packing item</Text><TouchableOpacity onPress={()=>setAddOpen(false)}><Ionicons name="close" size={24}/></TouchableOpacity></View>
        <Text style={st.label}>ITEM</Text><TextInput style={st.input} value={newName} onChangeText={setNewName} placeholder="e.g. Retainer case" autoFocus/>
        <Text style={st.label}>CATEGORY</Text><View style={st.chips}>{CATEGORIES.map(c=><Choice key={c.id} label={c.title} selected={newCategory===c.id} onPress={()=>setNewCategory(c.id)}/>)}</View>
        <Text style={st.label}>QUANTITY</Text><TextInput style={[st.input,{width:90}]} value={newQty} onChangeText={setNewQty} keyboardType="number-pad"/>
        <TouchableOpacity style={st.saveBtn} onPress={addItem}><Text style={st.saveText}>Add to my list</Text></TouchableOpacity>
      </View></View>
    </Modal>

    <Modal visible={setup} transparent animationType="slide" onRequestClose={()=>setSetup(false)}>
      <View style={st.overlay}><ScrollView contentContainerStyle={st.sheet}>
        <View style={st.sheetHead}><View><Text style={st.sheetTitle}>Customize recommendations</Text><Text style={st.sheetSub}>We'll adjust suggested quantities and items.</Text></View><TouchableOpacity onPress={()=>setSetup(false)}><Ionicons name="close" size={24}/></TouchableOpacity></View>
        <Text style={st.label}>LAUNDRY ACCESS</Text><View style={st.chips}>{OPTIONS.laundry.map(([v,l])=><Choice key={v} label={l} selected={settings.laundry===v} onPress={()=>setSettings(s=>({...s,laundry:v}))}/>)}</View>
        <Text style={st.label}>PACKING STYLE</Text><View style={st.chips}>{OPTIONS.style.map(([v,l])=><Choice key={v} label={l} selected={settings.style===v} onPress={()=>setSettings(s=>({...s,style:v}))}/>)}</View>
        <Text style={st.label}>LUGGAGE</Text><View style={st.chips}>{OPTIONS.luggage.map(([v,l])=><Choice key={v} label={l} selected={settings.luggage===v} onPress={()=>setSettings(s=>({...s,luggage:v}))}/>)}</View>
        <Text style={st.label}>ACTIVITIES</Text><View style={st.chips}>{ACTS.map(([v,l])=><Choice key={v} label={l} selected={settings.activities.includes(v)} onPress={()=>setSettings(s=>({...s,activities:s.activities.includes(v)?s.activities.filter(a=>a!==v):[...s.activities,v]}))}/>)}</View>
        <Text style={st.label}>PERSONAL NEEDS</Text><View style={st.chips}>
          {[["glasses","Glasses"],["contacts","Contacts"],["medications","Medication"],["menstrual","Menstrual products"]].map(([v,l])=><Choice key={v} label={l} selected={settings[v]} onPress={()=>setSettings(s=>({...s,[v]:!s[v]}))}/>)}
        </View>
        <View style={st.warning}><Ionicons name="shield-checkmark-outline" size={17} color="#3F63F3"/><Text style={st.warningText}>Your custom items will stay on your list when recommendations are updated.</Text></View>
        <TouchableOpacity style={st.saveBtn} onPress={regenerate}><Text style={st.saveText}>Update my packing list</Text></TouchableOpacity>
      </ScrollView></View>
    </Modal>
  </SafeAreaView>;
}

const st=StyleSheet.create({
  safe:{flex:1,backgroundColor:"#DCE6FF"},scroll:{padding:16,paddingBottom:40},loading:{flex:1,alignItems:"center",justifyContent:"center",gap:12},muted:{color:"#6B7280"},
  top:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:12},iconBtn:{width:38,height:38,borderRadius:12,backgroundColor:"#EEF2FF",alignItems:"center",justifyContent:"center"},topTitle:{fontSize:19,fontWeight:"900",color:"#1F2937"},
  hero:{backgroundColor:"#EEF2FF",borderRadius:18,padding:17,borderWidth:1,borderColor:"#B4C6FF"},eyebrow:{fontSize:9,fontWeight:"900",letterSpacing:1,color:"#3F63F3"},heroTitle:{fontSize:21,fontWeight:"900",color:"#1F2937",marginTop:4},heroSub:{fontSize:11,color:"#6B7280",marginTop:3},progressRow:{flexDirection:"row",alignItems:"baseline",marginTop:15},progressBig:{fontSize:22,fontWeight:"900",color:"#1F2937"},progressLabel:{fontSize:11,color:"#6B7280"},track:{height:7,borderRadius:99,backgroundColor:"#D4DEFF",overflow:"hidden",marginTop:7},fill:{height:"100%",backgroundColor:"#3F63F3"},saving:{fontSize:9,color:"#6B7280",marginTop:5,textAlign:"right"},
  actions:{flexDirection:"row",gap:8,marginTop:10},primary:{flex:1,height:43,borderRadius:12,backgroundColor:"#3F63F3",flexDirection:"row",gap:5,alignItems:"center",justifyContent:"center"},primaryText:{color:"#fff",fontSize:12,fontWeight:"900"},secondary:{flex:1,height:43,borderRadius:12,backgroundColor:"#EEF2FF",borderWidth:1,borderColor:"#B4C6FF",flexDirection:"row",gap:5,alignItems:"center",justifyContent:"center"},secondaryText:{color:"#3F63F3",fontSize:12,fontWeight:"900"},
  tip:{flexDirection:"row",gap:7,backgroundColor:"#EEF2FF",borderRadius:12,padding:11,marginTop:10},tipText:{flex:1,fontSize:10.5,lineHeight:15,color:"#475569"},
  card:{backgroundColor:"#EEF2FF",borderRadius:15,borderWidth:1,borderColor:"#B4C6FF",marginTop:10,overflow:"hidden"},catHead:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",padding:13},catLeft:{flexDirection:"row",alignItems:"center",gap:9},catIcon:{width:32,height:32,borderRadius:10,backgroundColor:"#DCE6FF",alignItems:"center",justifyContent:"center"},catTitle:{fontSize:12.5,fontWeight:"900",color:"#1F2937"},catCount:{fontSize:9.5,color:"#6B7280",marginTop:2},
  item:{flexDirection:"row",alignItems:"center",paddingHorizontal:12,paddingVertical:11},itemBorder:{borderTopWidth:1,borderTopColor:"#D4DEFF"},check:{width:22,height:22,borderRadius:7,borderWidth:1.5,borderColor:"#9FB5FF",alignItems:"center",justifyContent:"center"},checkOn:{backgroundColor:"#3F63F3",borderColor:"#3F63F3"},itemMain:{flex:1,marginLeft:9},itemName:{fontSize:11.5,fontWeight:"700",color:"#1F2937"},itemDone:{textDecorationLine:"line-through",color:"#8A94A6"},reason:{fontSize:9,color:"#6B7280",marginTop:2},custom:{fontSize:7.5,fontWeight:"900",letterSpacing:.5,color:"#3F63F3",marginTop:3},
  qty:{flexDirection:"row",alignItems:"center",marginLeft:5},qtyBtn:{width:25,height:25,borderRadius:7,backgroundColor:"#DCE6FF",alignItems:"center",justifyContent:"center"},qtyBtnText:{fontSize:16,fontWeight:"800",color:"#3F63F3"},qtyMid:{minWidth:35,alignItems:"center"},qtyNum:{fontSize:12,fontWeight:"900",color:"#1F2937"},unit:{fontSize:7,color:"#6B7280"},trash:{paddingLeft:7,paddingVertical:5},
  overlay:{flex:1,backgroundColor:"rgba(15,23,42,.35)",justifyContent:"flex-end"},sheet:{backgroundColor:"#F8FAFF",borderTopLeftRadius:24,borderTopRightRadius:24,padding:18,paddingBottom:32,maxHeight:"90%"},sheetHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start",marginBottom:15},sheetTitle:{fontSize:18,fontWeight:"900",color:"#1F2937"},sheetSub:{fontSize:10.5,color:"#6B7280",marginTop:3},label:{fontSize:9,fontWeight:"900",letterSpacing:.8,color:"#6B7280",marginTop:12,marginBottom:6},input:{height:44,borderWidth:1,borderColor:"#B4C6FF",borderRadius:11,backgroundColor:"#fff",paddingHorizontal:12,color:"#1F2937"},chips:{flexDirection:"row",flexWrap:"wrap",gap:7},chip:{paddingHorizontal:11,paddingVertical:8,borderRadius:999,backgroundColor:"#EEF2FF",borderWidth:1,borderColor:"#B4C6FF"},chipOn:{backgroundColor:"#3F63F3",borderColor:"#3F63F3"},chipText:{fontSize:10.5,fontWeight:"700",color:"#3F63F3"},chipTextOn:{color:"#fff"},
  warning:{flexDirection:"row",gap:7,backgroundColor:"#EEF2FF",padding:10,borderRadius:11,marginTop:15},warningText:{flex:1,fontSize:10,lineHeight:14,color:"#475569"},saveBtn:{height:46,borderRadius:12,backgroundColor:"#3F63F3",alignItems:"center",justifyContent:"center",marginTop:16},saveText:{color:"#fff",fontSize:12,fontWeight:"900"}
});
