import type { BusinessId } from './business'

export type LeadIntent = 'buy' | 'sell' | 'rent'

export type LeadScore = 'hot' | 'warm' | 'cold'

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'closed'

export type PropertyType =
  | 'single-family'
  | 'condo'
  | 'townhome'
  | 'multi-family'
  | 'land'
  | 'commercial'
  | 'unknown'

export type Timeline =
  | 'this-week'
  | 'this-month'
  | 'three-months'
  | 'six-months-plus'
  | 'just-browsing'
  | 'unknown'

export interface LeadProfile {
  businessId: BusinessId
  name?: string
  phone?: string
  email?: string
  intent?: LeadIntent
  budgetRange?: string
  locationPreference?: string
  propertyType?: PropertyType
  timeline?: Timeline
}

export interface QualifiedLead extends LeadProfile {
  id: string
  score: LeadScore
  scoreReason: string
  status: LeadStatus
  createdAt: string
}
