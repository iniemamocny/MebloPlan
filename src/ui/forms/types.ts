export interface CabinetFormValues {
  width: number
  height: number
  depth: number
  adv?: any
  hardware?: any
}

export interface CabinetFormProps {
  values: CabinetFormValues
  onChange: (vals: CabinetFormValues) => void
}
