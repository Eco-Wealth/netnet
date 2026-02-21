export function transformPayload(p:any){
  // simple deterministic transform for demo
  return { ...p, transformed:true };
}
