const BASE='https://mantledb.sh';
const NS='salsa-squad-votes-20260826-8f4c2a6e';

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    if(req.method==='GET'){
      const r=await fetch(`${BASE}/v2/${NS}/votes`,{cache:'no-store'});
      if(r.status===404)return res.status(200).json({});
      const text=await r.text();
      if(!r.ok)return res.status(r.status).send(text);
      try{return res.status(200).json(JSON.parse(text))}
      catch{return res.status(502).json({error:'Invalid storage response'})}
    }

    if(req.method==='POST'){
      const {id,by=1}=req.body||{};
      if(!id||typeof id!=='string')return res.status(400).json({error:'Missing vote id'});
      const n=Number(by);
      if(!Number.isFinite(n)||Math.abs(n)>1)return res.status(400).json({error:'Invalid increment'});
      const r=await fetch(`${BASE}/v2/increment/${NS}/votes`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({key:id,by:n})
      });
      const text=await r.text();
      if(!r.ok)return res.status(r.status).send(text);
      try{return res.status(200).json(JSON.parse(text))}
      catch{return res.status(200).json({success:true})}
    }

    res.setHeader('Allow','GET, POST');
    return res.status(405).json({error:'Method not allowed'});
  }catch(e){
    return res.status(502).json({error:'Vote storage unavailable',detail:String(e)});
  }
}
