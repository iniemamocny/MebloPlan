import React from 'react'

export const CornerForm = () => (
  <div className="small">Szafka narożna posiada kształt litery L.</div>
)

export const SinkForm = () => (
  <div className="small">Szafka zlewozmywakowa bez górnego wieńca.</div>
)

export const CargoForm = () => (
  <div className="small">Szafka cargo z wysuwanym koszem.</div>
)

export const ApplianceForm = ({variant}:{variant:string}) => (
  <div className="small">Szafka pod urządzenie: {variant}</div>
)
