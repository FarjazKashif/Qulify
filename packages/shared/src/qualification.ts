import type { LeadProfile } from './lead'

export type QualificationStep =
  | 'intent'
  | 'property-location'
  | 'budget'
  | 'timeline'
  | 'contact'
  | 'complete'
  | 'closed'

export interface QualificationState {
  currentStep: QualificationStep
  leadProfile: LeadProfile
  missingFields: string[]
  isServiceMatch: boolean
  isPriceMatch: boolean
}