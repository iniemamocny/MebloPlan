/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest'
import React, { act } from 'react'
import ReactDOM from 'react-dom/client'
import useLocalStorageState from '../src/ui/hooks/useLocalStorageState'

// React 18 requires this flag for act() in custom setups
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

async function setup(key: string, initial: any){
  const container = document.createElement('div')
  let hookValue: any
  let setHookValue: (v: any) => void = () => {}

  function Test(){
    const [v, setV] = useLocalStorageState(key, initial)
    hookValue = v
    setHookValue = setV
    return <div>{String(v)}</div>
  }

  const root = ReactDOM.createRoot(container)
  await act(async () => {
    root.render(<Test />)
  })

  return { container, root, get value(){ return hookValue }, setValue: setHookValue }
}

describe('useLocalStorageState', () => {
  it('reads existing value from localStorage', async () => {
    localStorage.setItem('test', JSON.stringify(5))
    const { container, root } = await setup('test', 0)
    expect(container.textContent).toBe('5')
    await act(async () => {
      root.unmount()
    })
  })

  it('saves updates to localStorage', async () => {
    localStorage.clear()
    const { container, setValue, root } = await setup('count', 1)
    expect(localStorage.getItem('count')).toBe(JSON.stringify(1))
    await act(async () => {
      setValue(7)
    })
    expect(localStorage.getItem('count')).toBe(JSON.stringify(7))
    expect(container.textContent).toBe('7')
    await act(async () => {
      root.unmount()
    })
  })
})

