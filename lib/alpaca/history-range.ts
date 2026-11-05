/** Explicit supported ranges only; never forward arbitrary client query params to Alpaca. */
export const portfolioHistoryRanges=["1D","1W","1M","1Y","ALL"] as const;
export type PortfolioHistoryRange=typeof portfolioHistoryRanges[number];
export function isPortfolioHistoryRange(value:string):value is PortfolioHistoryRange {
 return (portfolioHistoryRanges as readonly string[]).includes(value);
}
export const portfolioHistoryResolution:Record<PortfolioHistoryRange,string>={
 "1D":"5-minute snapshots",
 "1W":"Hourly snapshots",
 "1M":"Daily snapshots",
 "1Y":"Daily snapshots",
 "ALL":"Daily snapshots",
};
const historyPath="/v2/account/portfolio/history";
/**
 * Match period and resolution to Alpaca's Portfolio History endpoint.
 * Alpaca denotes 1 year as 1A, not 1Y. An ALL query must be anchored
 * at the actual account creation date and ends at now; never a fabricated number of years.
 */
export function portfolioHistoryRequestPath(
 range:PortfolioHistoryRange,accountCreatedAt?:string,nowIso=new Date().toISOString(),
):string|null {
 const params=new URLSearchParams();
 if(range==="ALL"){
  const date=accountCreatedAt?.slice(0,10);
  if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date)||
     !Number.isFinite(Date.parse(date+"T00:00:00Z"))||
     new Date(date+"T00:00:00Z").toISOString().slice(0,10)!==date||
     !Number.isFinite(Date.parse(nowIso))||date>nowIso.slice(0,10))return null;
  // Alpaca treats omitted end as a default period (often 1M), NOT all-time.
  // Explicit start + end prevents accidental truncation of the ALL window.
  params.set("start",date);
  params.set("end",nowIso);
  params.set("timeframe","1D");
 }else{
  const values={
   "1D":{period:"1D",timeframe:"5Min"},
   "1W":{period:"1W",timeframe:"1H"},
   "1M":{period:"1M",timeframe:"1D"},
   "1Y":{period:"1A",timeframe:"1D"},
  }[range];
  params.set("period",values.period);
  params.set("timeframe",values.timeframe);
  if(range==="1D"||range==="1W")params.set("intraday_reporting","market_hours");
 }
 return historyPath+"?"+params.toString();
}
