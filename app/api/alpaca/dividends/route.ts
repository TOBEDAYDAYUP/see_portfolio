import {NextResponse} from "next/server";
import {loadPortfolioDividends} from "../../../../lib/portfolio/dividends-server";
export async function GET(){
 const headers={"Cache-Control":"private, no-store, max-age=0"};
 if(process.env.NODE_ENV!=="development")
  return NextResponse.json({status:"error",message:"Private portfolio access disabled in production before authentication."},{status:403,headers});
 try{
  const value=await loadPortfolioDividends();
  return NextResponse.json(value,{headers,status:value.status==="error"?502:200});
 }catch{return NextResponse.json({status:"error",message:"Dividend sources are temporarily unavailable."},{status:502,headers});}
}
