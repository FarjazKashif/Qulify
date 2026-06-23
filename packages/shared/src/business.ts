export type BusinessId = string

export interface WidgetBranding {
  primaryColor: string
  welcomeMessage: string
  assistantName: string
}

export interface BusinessConfig {
  id: BusinessId
  name: string
  serviceAreas: string[]
  priceMin: number
  priceMax: number
  agentName: string
  agentWhatsapp: string
  agentEmail: string
  widgetConfig: WidgetBranding
  createdAt: string
}
