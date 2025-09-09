export function autoWidthsForRun(lengthMM:number, prefs:number[] = [600,800,400,500,300]){
  const result:number[] = []
  let remaining = Math.max(0, Math.floor(lengthMM))
  while (remaining >= 260){
    const pick = prefs.find(p=>p<=remaining) || remaining
    const width = (remaining - pick < 260 && remaining > 260) ? remaining : pick
    result.push(width)
    remaining -= width
    if (remaining < 260 && remaining>0){
      result.push(remaining)
      remaining = 0
    }
  }
  return result
}
