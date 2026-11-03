"use client";
import { useEffect,useRef } from "react"; import { Map,Marker,setWorkerUrl } from "maplibre-gl"; import { MAP_STYLE_URL } from "@/features/map/map-config";
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs",import.meta.url).toString());
export function PinMap({latitude,longitude,onChange}:{latitude:number;longitude:number;onChange:(longitude:number,latitude:number)=>void}){const el=useRef<HTMLDivElement>(null),map=useRef<Map|null>(null),marker=useRef<Marker|null>(null),change=useRef(onChange),initial=useRef({latitude,longitude});
 useEffect(()=>{change.current=onChange;},[onChange]);
 useEffect(()=>{if(!el.current)return;const start=initial.current;const m=new Map({container:el.current,style:MAP_STYLE_URL,center:[start.longitude,start.latitude],zoom:14});const pin=new Marker({draggable:true}).setLngLat([start.longitude,start.latitude]).addTo(m);pin.on("dragend",()=>{const p=pin.getLngLat();change.current(p.lng,p.lat);});m.on("click",e=>{pin.setLngLat(e.lngLat);change.current(e.lngLat.lng,e.lngLat.lat);});map.current=m;marker.current=pin;return()=>m.remove();},[]);
 useEffect(()=>{marker.current?.setLngLat([longitude,latitude]);},[latitude,longitude]);return <div ref={el} style={{height:360,borderRadius:12,overflow:"hidden"}}/>;}
