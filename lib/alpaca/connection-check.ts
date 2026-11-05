/**
 * Safe browser-side interpretation of a local Alpaca Paper API response.
 * Never render raw upstream bodies, HTML, or credentials in connection errors.
 */
export type ConnectionCheckState="connected"|"not_configured"|"error";
export type ConnectionCheckResult={state:ConnectionCheckState;message:string};

export function interpretConnectionCheck(
 httpStatus:number,
 responseText:string,
):ConnectionCheckResult{
 let result:unknown;
 try{
  result=JSON.parse(responseText);
 }catch{
  const explanation=httpStatus===404
    ?"The local /api/alpaca/portfolio route was not found. Restart npm run dev in the SEEPortfolio project folder."
    :httpStatus>=500
      ?"The local Alpaca API returned an invalid response (HTTP "+httpStatus+"). Check the npm run dev terminal for a Next.js server error."
      :"The local Alpaca API did not return JSON (HTTP "+httpStatus+"). Check the browser Network tab and local development server.";
  return {state:"error",message:explanation};
 }
 if(!result||typeof result!=="object"||!("status" in result))
  return {state:"error",message:"The local Alpaca API returned an unexpected response (HTTP "+httpStatus+")."};
 if(result.status==="connected"&&httpStatus>=200&&httpStatus<300){
  const count="positions" in result&&Array.isArray(result.positions)?result.positions.length:0;
  return {state:"connected",message:"Alpaca Paper connection successful. Open positions: "+count+"."};
 }
 if(result.status==="not_configured")
  return {state:"not_configured",message:"Keys not found in .env.local. Add both credentials and restart npm run dev."};
 if(result.status==="error"){
  const message="message" in result&&typeof result.message==="string"?result.message:"";
  // Backend response messages are application-owned, not raw upstream bodies.
  return {state:"error",message:message||"Alpaca Paper API error (HTTP "+httpStatus+")."};
 }
 return {state:"error",message:"Unrecognized Alpaca API status (HTTP "+httpStatus+")."};
}
