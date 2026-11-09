"use client";

import {useEffect,useState} from "react";
import {Marker,type Map as MapType} from "maplibre-gl";
import {MapCanvas} from "@/features/map/map-canvas";
import {canCommitPinTap} from "@/lib/map-pin-selection";
import styles from "./upload-form.module.css";

export type MemoryPin = {latitude:number;longitude:number};

// Keep the pin fixed to a geographic coordinate; only a deliberate tap or completed
// marker drag changes the selection. Pinch/double-tap zoom must not choose another point.
export function ContributionPinPicker({value,onChange}:{value:MemoryPin|null;onChange:(point:MemoryPin)=>void}) {
  const [map,setMap]=useState<MapType|null>(null);
  useEffect(()=>{
    if(!map)return;
    const initial=value ? {lng:value.longitude,lat:value.latitude}:map.getCenter();
    if(value)map.jumpTo({center:[initial.lng,initial.lat],zoom:Math.max(map.getZoom(),12)});

    const markerElement=document.createElement("button");
    markerElement.type="button";
    markerElement.className=styles.draggablePin;
    markerElement.title="Kéo ghim để chọn vị trí";
    markerElement.setAttribute("aria-label","Kéo ghim đến vị trí kỷ niệm");
    const pinShape=document.createElement("span");
    pinShape.className=styles.draggablePinShape;
    pinShape.setAttribute("aria-hidden","true");
    markerElement.appendChild(pinShape);

    // MapLibre owns the marker's outer transform. The pin tip, not its center,
    // is the exact geographic anchor, irrespective of zoom level.
    const marker=new Marker({element:markerElement,draggable:true,anchor:"bottom"})
      .setLngLat([initial.lng,initial.lat]).addTo(map);

    let committed={longitude:initial.lng,latitude:initial.lat};
    let ignoreClicksUntil=0;
    let pendingTap:ReturnType<typeof setTimeout>|null=null;
    const cancelPendingTap=()=>{
      if(pendingTap!==null){clearTimeout(pendingTap);pendingTap=null;}
    };
    const choose=(lng:number,lat:number)=>{
      committed={longitude:Number(lng.toFixed(6)),latitude:Number(lat.toFixed(6))};
      onChange(committed);
    };
    const dragEnd=()=>{
      if(Date.now()<ignoreClicksUntil){
        marker.setLngLat([committed.longitude,committed.latitude]);
        return;
      }
      const point=marker.getLngLat();
      choose(point.lng,point.lat);
    };
    const multiTouch=(event:{originalEvent:TouchEvent})=>{
      if(event.originalEvent.touches.length<2)return;
      ignoreClicksUntil=Date.now()+550;
      cancelPendingTap();
    };
    const click=(event:{lngLat:{lng:number;lat:number};originalEvent:MouseEvent})=>{
      // MapLibre fires click events before dblclick, so commit only after
      // the double-click window. Never commit during/after a pinch gesture.
      cancelPendingTap();
      if(!canCommitPinTap(map.isZooming(),event.originalEvent.detail,Date.now(),ignoreClicksUntil))return;
      const {lng,lat}=event.lngLat;
      pendingTap=setTimeout(()=>{
        pendingTap=null;
        if(!canCommitPinTap(map.isZooming(),1,Date.now(),ignoreClicksUntil))return;
        marker.setLngLat([lng,lat]);
        choose(lng,lat);
      },280);
    };
    const stopMarkerClick=(event:MouseEvent)=>event.stopPropagation();

    markerElement.addEventListener("click",stopMarkerClick);
    marker.on("dragend",dragEnd);
    map.on("click",click);
    map.on("dblclick",cancelPendingTap);
    map.on("zoomstart",cancelPendingTap);
    map.on("touchstart",multiTouch);
    map.on("touchmove",multiTouch);

    return ()=>{
      cancelPendingTap();
      map.off("touchmove",multiTouch);
      map.off("touchstart",multiTouch);
      map.off("zoomstart",cancelPendingTap);
      map.off("dblclick",cancelPendingTap);
      map.off("click",click);
      marker.off("dragend",dragEnd);
      markerElement.removeEventListener("click",stopMarkerClick);
      marker.remove();
    };
    // Value is read only when the picker mounts; the marker retains its
    // geographic position until the visitor intentionally selects again.
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
