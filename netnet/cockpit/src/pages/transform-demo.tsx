import React from 'react';
import { transformPayload } from '../services/transformService';
export default function TransformDemo(){
  const [out,setOut]=React.useState({});
  return (<div>
    <h3>Transform Demo</h3>
    <button onClick={()=>setOut(transformPayload({hello:'world'}))}>Run</button>
    <pre>{JSON.stringify(out,null,2)}</pre>
  </div>);
}
