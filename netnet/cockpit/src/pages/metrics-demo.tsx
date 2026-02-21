import React from 'react';
import { incrementRunCount } from '../services/metricsService';
export default function MetricsDemo(){
  const [state,setState]=React.useState({});
  return (<div>
    <h3>Metrics Demo</h3>
    <button onClick={()=>setState(incrementRunCount(state))}>Run</button>
    <pre>{JSON.stringify(state,null,2)}</pre>
  </div>);
}
