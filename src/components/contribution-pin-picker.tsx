"use client";

import {useEffect,useState} from "react";
import {Marker,type Map as MapType} from "maplibre-gl";
import {MapCanvas} from "@/features/map/map-canvas";
import styles from "./upload-form.module.css";

export type MemoryPin = {latitude:number;longitude:number};

// The marker itself is draggable (rather than forcing visitors to drag the map).
// Initial center is just a suggestion; no location is submitted until the pin is moved or the map clicked.
export function ContributionPinPicker({value,onChange}:{value:MemoryPin|null;onChange:(point:MemoryPin)=>void}) {
  const [map,setMap]=useState<MapType|null>(null);
  useEffect(()=>{
    if(!map)return;
    const initial=value ? {lng:value.longitude,lat:value.latitude}:map.getCenter();
    if (value) map.jumpTo({center:[initial.lng,initial.lat],zoom:Math.max(map.getZoom(),12)});
    const markerElement=document.createElement("button");
    markerElement.type="button";
    markerElement.className=styles.draggablePin;
    markerElement.textContent="📍";
    markerElement.title="Kéo ghim để chọn vị trí";
    markerElement.setAttribute("aria-label","Kéo ghim đến vị trí kỷ niệm");
    const marker=new Marker({element:markerElement,draggable:true})
      .setLngLat([initial.lng,initial.lat]).addTo(map);
    const choose=(lng:number,lat:number)=>onChange({
      longitude:Number(lng.toFixed(6)),latitude:Number(lat.toFixed(6)),
    });
    const dragEnd=()=>{const point=marker.getLngLat();choose(point.lng,point.lat);};
    const click=(event:{lngLat:{lng:number;lat:number}})=>{
      marker.setLngLat([event.lngLat.lng,event.lngLat.lat]);
      choose(event.lngLat.lng,event.lngLat.lat);
    };
    marker.on("dragend",dragEnd);
    map.on("click",click);
    return ()=>{map.off("click",click);marker.off("dragend",dragEnd);marker.remove();};
    // Pin position is preserved in React after a selection; the mounted marker keeps its own position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[map,onChange]);
  return <div className={styles.pinSection}>
    <p className={styles.helper}>Chạm lên bản đồ hoặc <strong>kéo trực tiếp ghim đỏ</strong> tới địa điểm muốn lưu.</p>
    <div className={styles.mapFrame}><MapCanvas embedded onReady={setMap}/></div>
    <p className={styles.coordinate} role="status">{value
      ? `Đã chọn: ${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}`
      : "Chưa chọn vị trí. Hãy kéo ghim hoặc chạm vào bản đồ."}</p>
  </div>;
}
