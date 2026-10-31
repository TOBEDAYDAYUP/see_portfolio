/** Format Alpaca news `created_at` (UTC/offset timestamp) to Toronto-market time.
 * This is the provider's article timestamp, not independently verified publisher time.
 */
export function formatResearchNewsTimestamp(raw:string):string{
 const value=raw.trim();
 // Do not turn a date-only value into a fictional midnight publishing time.
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/i.test(value))
  return "Time unavailable";
 const parsed=new Date(value);
 if(Number.isNaN(parsed.getTime()))return "Time unavailable";
 const parts=new Intl.DateTimeFormat("en-US",{
  timeZone:"America/Toronto",year:"numeric",month:"short",day:"numeric",
  hour:"numeric",minute:"2-digit",hour12:true,timeZoneName:"short",
 }).formatToParts(parsed);
 const take=(type:string)=>parts.find(item=>item.type===type)?.value??"";
 const month=take("month"),day=take("day"),year=take("year");
 const hour=take("hour"),minute=take("minute"),ampm=take("dayPeriod"),zone=take("timeZoneName");
 return `${month} ${day}, ${year} · ${hour}:${minute} ${ampm} ${zone}`;
}
