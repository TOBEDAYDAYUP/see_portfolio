import {NextResponse} from "next/server";
import {loadPortfolioValuation} from "../../../../lib/portfolio/valuation-server";
export async function GET(){
 const headers={"Cache-Control":"private, no-store, max-age=0"};
 if(process.env.NODE_ENV!=="development")
  return NextResponse.json({status:"error",message:"Private portfolio data require authentication in production."},{status:403,headers});
 try{
  const result=await loadPortfolioValuation();
  return NextResponse.json(result,{headers,status:result.status==="error"?502:200});
 }catch{return NextResponse.json({status:"error",message:"Portfolio valuation temporarily unavailable."},{status:502,headers});}
}
