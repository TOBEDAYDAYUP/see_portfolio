/** Hit testing is performed in SVG viewBox coordinates, never screen pixels. */
export type ChartCoordinate={x:number;y:number};

/**
 * Return the index of a REAL historical observation closest along the
 * hit-tested polyline. The mouse may be near any segment, not only a dot.
 * This deliberately never interpolates / fabricates an account equity value.
 */
export function nearestHistoryObservation(
 pointer:ChartCoordinate,points:readonly ChartCoordinate[],tolerance:number,
):number|null{
 if(!Number.isFinite(pointer.x)||!Number.isFinite(pointer.y)||
    !Number.isFinite(tolerance)||tolerance<0||points.length===0)return null;
 let bestDistance=Infinity;
 let bestIndex:number|null=null;
 const consider=(index:number,distance:number)=>{
  if(distance<bestDistance){
   bestDistance=distance;
   bestIndex=index;
  }
 };
 for(let i=0;i<points.length;i++){
  const p=points[i];
  if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
  const dx=pointer.x-p.x,dy=pointer.y-p.y;
  consider(i,dx*dx+dy*dy);
 }
 for(let i=0;i+1<points.length;i++){
  const start=points[i],end=points[i+1];
  if(!Number.isFinite(start.x)||!Number.isFinite(start.y)||
     !Number.isFinite(end.x)||!Number.isFinite(end.y))continue;
  const vx=end.x-start.x,vy=end.y-start.y;
  const lengthSquared=vx*vx+vy*vy;
  if(lengthSquared<=0)continue;
  const projection=((pointer.x-start.x)*vx+(pointer.y-start.y)*vy)/lengthSquared;
  const t=Math.max(0,Math.min(1,projection));
  const dx=pointer.x-(start.x+t*vx),dy=pointer.y-(start.y+t*vy);
  const distance=dx*dx+dy*dy;
  // Snap to one of the actual observations bounding the line segment.
  // If the cursor is on a sparse segment, do not invent intermediate equity.
  if(distance<bestDistance){
   bestDistance=distance;
   bestIndex=t<0.5?i:i+1;
  }
 }
 return bestDistance<=tolerance*tolerance?bestIndex:null;
}

/** Show the timestamp provided by Alpaca, with DST-aware NY market time. */
export function formatHistoryCrosshairTime(timestampSeconds:number):string{
 if(!Number.isFinite(timestampSeconds))return "Time unavailable";
 const date=new Date(timestampSeconds*1000);
 if(!Number.isFinite(date.getTime()))return "Time unavailable";
 return new Intl.DateTimeFormat("en-US",{
  timeZone:"America/New_York",
  year:"numeric",month:"short",day:"numeric",
  hour:"numeric",minute:"2-digit",timeZoneName:"short",
 }).format(date);
}
