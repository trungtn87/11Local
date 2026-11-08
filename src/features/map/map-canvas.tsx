"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import {Map,AttributionControl,type Map as MapType,type StyleSpecification} from "maplibre-gl";
import {useEffect,useRef,useState} from "react";
import {CAO_BANG_CAMERA,MAP_STYLE_URL} from "./map-config";
import {loadCleanStyle} from "./map-style";
import styles from "./map-canvas.module.css";
export function MapCanvas({embedded=false,onReady}:{embedded?:boolean;onReady?:(map:MapType)=>void}){
const node=useRef<HTMLDivElement>(null),ready=useRef(onReady);const [state,setState]=useState("loading");
useEffect(()=>{ready.current=onReady;},[onReady]);
useEffect(()=>{let active=true;let map:MapType|undefined;(async()=>{try{const style=await loadCleanStyle(MAP_STYLE_URL);if(!active||!node.current)return;map=new Map({container:node.current,style:style as StyleSpecification|string,center:CAO_BANG_CAMERA.center,zoom:CAO_BANG_CAMERA.zoom,attributionControl:false,dragRotate:false});map.addControl(new AttributionControl({compact:true}),"bottom-right");map.once("load",()=>{if(active){setState("ready");ready.current?.(map!);}});map.on("error",()=>{if(active)setState("error");});}catch{if(active)setState("error");}})();return()=>{active=false;map?.remove();};},[]);
return <div className={embedded?styles.embedded:styles.shell} aria-label="Bản đồ kỷ niệm"><div ref={node} className={styles.map}/>{state!=="ready"&&<div className={styles.status}>{state==="loading"?"Đang mở bản đồ…":"Không thể tải bản đồ"}</div>}</div>;
}
