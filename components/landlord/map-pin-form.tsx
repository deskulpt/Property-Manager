"use client"

import { useActionState } from "react"
import { SubmitButton } from "@/components/submit-button"
import { submitPropertyPin } from "@/lib/actions"

type MapPinFormProps = {
  propertyId: string
  latitude: number | null
  longitude: number | null
  entranceLatitude: number | null
  entranceLongitude: number | null
  entranceLabel: string | null
  hideExactPin: boolean
}

type PinState = { ok: boolean; error: string; message: string }

const initial: PinState = { ok: false, error: "", message: "" }

export function MapPinForm(props: MapPinFormProps) {
  const [state, action] = useActionState(
    async (_prev: PinState, formData: FormData): Promise<PinState> => {
      return submitPropertyPin(formData)
    },
    initial,
  )

  return (
    <form action={action} className="grid gap-4 border border-ink/10 bg-card p-4">
      <input type="hidden" name="propertyId" value={props.propertyId} />
      <div>
        <h3 className="font-serif text-lg font-semibold text-brand">Map pin</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Latitude and longitude power the public Leaflet map and Directions links. No Mapbox or
          Google Maps key is required.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Latitude
          <input
            name="latitude"
            type="text"
            inputMode="decimal"
            defaultValue={props.latitude ?? ""}
            placeholder="e.g. 19.2813"
            className="border border-ink/15 bg-paper px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Longitude
          <input
            name="longitude"
            type="text"
            inputMode="decimal"
            defaultValue={props.longitude ?? ""}
            placeholder="e.g. 73.0483"
            className="border border-ink/15 bg-paper px-3 py-2 font-mono text-sm"
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm">
          Entrance latitude
          <input
            name="entranceLatitude"
            type="text"
            inputMode="decimal"
            defaultValue={props.entranceLatitude ?? ""}
            className="border border-ink/15 bg-paper px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Entrance longitude
          <input
            name="entranceLongitude"
            type="text"
            inputMode="decimal"
            defaultValue={props.entranceLongitude ?? ""}
            className="border border-ink/15 bg-paper px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Entrance label
          <input
            name="entranceLabel"
            type="text"
            defaultValue={props.entranceLabel ?? ""}
            placeholder="Truck gate 2"
            className="border border-ink/15 bg-paper px-3 py-2 text-sm"
          />
        </label>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          name="hideExactPin"
          type="checkbox"
          value="1"
          defaultChecked={props.hideExactPin}
          className="mt-1"
        />
        <span>
          Hide exact pin on public pages (show area centre until an application is approved)
        </span>
      </label>
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="text-sm text-avail" role="status">
          {state.message}
        </p>
      ) : null}
      {!props.latitude && !state.message ? (
        <p className="text-sm text-ink-soft" role="status">
          Add a map pin to show this property on the map
        </p>
      ) : null}
      <div>
        <SubmitButton pendingLabel="Saving pin…">Save map pin</SubmitButton>
      </div>
    </form>
  )
}
