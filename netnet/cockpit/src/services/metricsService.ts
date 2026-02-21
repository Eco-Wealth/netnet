export function incrementRunCount(state: any){
  state.metrics = state.metrics || { total_runs: 0 };
  state.metrics.total_runs = (state.metrics.total_runs || 0) + 1;
  return state;
}
