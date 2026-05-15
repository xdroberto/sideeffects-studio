export type UniformSpec =
  | {
      name: string
      type: 'float'
      default: number
      min: number
      max: number
      step?: number
      label?: string
    }
  | {
      name: string
      type: 'int'
      default: number
      min: number
      max: number
      step?: number
      label?: string
    }
  | {
      name: string
      type: 'vec3'
      default: [number, number, number]
      label?: string
    }

export type FeedbackSpec = {
  compute: string
  display: string
  seed?: string
  resolution: number
  iterations: number
}

export type Effect = {
  id: string
  name: string
  description?: string
  uniforms: UniformSpec[]
  fragment?: string
  feedback?: FeedbackSpec
}

export type PatchValues = Record<string, number | [number, number, number]>
