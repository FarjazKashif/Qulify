import { pgTable, varchar, text, integer, boolean, timestamp, pgEnum, jsonb, uuid, real } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { BusinessId } from '@qulify/shared'

// Enums
export const leadIntentEnum = pgEnum('lead_intent', ['buy', 'sell', 'rent'])
export const leadScoreEnum = pgEnum('lead_score', ['hot', 'warm', 'cold'])
export const leadStatusEnum = pgEnum('lead_status', ['new', 'contacted', 'qualified', 'closed'])
export const propertyTypeEnum = pgEnum('property_type', [
  'single-family',
  'condo',
  'townhome',
  'multi-family',
  'land',
  'commercial',
  'unknown'
])
export const timelineEnum = pgEnum('timeline', [
  'this-week',
  'this-month',
  'three-months',
  'six-months-plus',
  'just-browsing',
  'unknown'
])
export const conversationChannelEnum = pgEnum('conversation_channel', ['web', 'whatsapp'])
export const chatMessageRoleEnum = pgEnum('chat_message_role', ['visitor', 'assistant', 'system'])
export const notificationChannelEnum = pgEnum('notification_channel', ['whatsapp', 'email'])
export const notificationStatusEnum = pgEnum('notification_status', ['pending', 'sent', 'failed', 'delivered'])

// Businesses table - represents a real estate agent/brokerage using Qulify
export const businesses = pgTable('businesses', {
  id: varchar('id', { length: 255 }).primaryKey().notNull(), // BusinessId
  name: varchar('name', { length: 255 }).notNull(),
  serviceAreas: jsonb('service_areas').notNull().$type<string[]>(), // Array of service areas (cities, zip codes, etc.)
  priceMin: integer('price_min').notNull(), // Minimum price the agent works with
  priceMax: integer('price_max').notNull(), // Maximum price the agent works with
  agentName: varchar('agent_name', { length: 255 }).notNull(),
  agentWhatsapp: varchar('agent_whatsapp', { length: 20 }).notNull(), // WhatsApp number with country code
  agentEmail: varchar('agent_email', { length: 255 }).notNull(),
  widgetConfig: jsonb('widget_config').notNull().$type<{
    primaryColor: string
    welcomeMessage: string
    assistantName: string
  }>(), // Widget branding/configuration
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// Properties/Listings table - properties that businesses have for sale/rent
export const listings = pgTable('listings', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  businessId: varchar('business_id', { length: 255 })
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  address: varchar('address', { length: 255 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  price: integer('price').notNull(),
  bedrooms: integer('bedrooms'),
  bathrooms: real('bathrooms'), // Allow for half baths (e.g., 2.5)
  sqft: integer('sqft'),
  propertyType: propertyTypeEnum('property_type').notNull(),
  status: varchar('status', { length: 50 }).notNull(), // active, pending, sold, etc.
  description: text('description'),
  photoUrls: jsonb('photo_urls').$type<string[]>(), // Array of photo URLs
  mlsId: varchar('mls_id', { length: 100 }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// Leads table - potential clients who interact with the chatbot
export const leads = pgTable('leads', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  businessId: varchar('business_id', { length: 255 })
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  intent: leadIntentEnum('intent'),
  budgetRange: varchar('budget_range', { length: 50 }), // e.g., "$200k-$300k"
  locationPreference: varchar('location_preference', { length: 255 }),
  timeline: timelineEnum('timeline'),
  score: leadScoreEnum('score'),
  scoreReason: text('score_reason'), // Explanation for the lead score
  status: leadStatusEnum('status').default('new'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// Conversations table - tracks chat conversations between visitors and the bot
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  leadId: uuid('lead_id')
    .references(() => leads.id, { onDelete: 'set null' }), // Can be null if conversation didn't create a lead
  businessId: varchar('business_id', { length: 255 })
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  channel: conversationChannelEnum('channel').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true })
});

// Chat messages table - individual messages within conversations
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  businessId: varchar('business_id', { length: 255 })
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  role: chatMessageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// Lead qualifications table - stores the qualification state for leads in progress
export const leadQualifications = pgTable('lead_qualifications', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  leadId: uuid('lead_id')
    .notNull()
    .unique() // One qualification record per lead
    .references(() => leads.id, { onDelete: 'cascade' }),
  businessId: varchar('business_id', { length: 255 })
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  currentStep: varchar('current_step', { length: 20 }).notNull(), // QualificationStep enum
  leadProfile: jsonb('lead_profile').notNull().$type<{
    businessId: string
    name?: string
    phone?: string
    email?: string
    intent?: 'buy' | 'sell' | 'rent'
    budgetRange?: string
    locationPreference?: string
    propertyType?: 'single-family' | 'condo' | 'townhome' | 'multi-family' | 'land' | 'commercial' | 'unknown'
    timeline?: 'this-week' | 'this-month' | 'three-months' | 'six-months-plus' | 'just-browsing' | 'unknown'
  }>(),
  missingFields: jsonb('missing_fields').notNull().$type<string[]>(), // Fields still needed to qualify the lead
  isServiceMatch: boolean('is_service_match').notNull().default(false), // Whether lead's location matches service areas
  isPriceMatch: boolean('is_price_match').notNull().default(false) // Whether lead's budget matches price range
});

// Agent notifications table - tracks notifications sent to agents about leads to agents
export const agentNotifications = pgTable('agent_notifications', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  leadId: uuid('lead_id')
    .notNull()
    .references(() => leads.id, { onDelete: 'cascade' }),
  businessId: varchar('business_id', { length: 255 })
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  channel: notificationChannelEnum('channel').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
  status: notificationStatusEnum('status').notNull().default('pending')
});

// Relations
export const businessesRelations = relations(businesses, ({ many }) => ({
  listings: many(listings),
  leads: many(leads),
  conversations: many(conversations),
  agentNotifications: many(agentNotifications)
}));

export const listingsRelations = relations(listings, ({ one }) => ({
  business: one(businesses, {
    fields: [listings.businessId],
    references: [businesses.id]
  })
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  business: one(businesses, {
    fields: [leads.businessId],
    references: [businesses.id]
  }),
  conversations: many(conversations),
  qualifications: one(leadQualifications, {
    fields: [leads.id],
    references: [leadQualifications.leadId]
  })
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  business: one(businesses, {
    fields: [conversations.businessId],
    references: [businesses.id]
  }),
  lead: one(leads, {
    fields: [conversations.leadId],
    references: [leads.id]
  }),
  messages: many(chatMessages)
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [chatMessages.conversationId],
    references: [conversations.id]
  }),
  business: one(businesses, {
    fields: [chatMessages.businessId],
    references: [businesses.id]
  })
}));

export const leadQualificationsRelations = relations(leadQualifications, ({ one }) => ({
  lead: one(leads, {
    fields: [leadQualifications.leadId],
    references: [leads.id]
  }),
  business: one(businesses, {
    fields: [leadQualifications.businessId],
    references: [businesses.id]
  })
}));

export const agentNotificationsRelations = relations(agentNotifications, ({ one }) => ({
  lead: one(leads, {
    fields: [agentNotifications.leadId],
    references: [leads.id]
  }),
  business: one(businesses, {
    fields: [agentNotifications.businessId],
    references: [businesses.id]
  })
}));

// Type exports for use in TypeScript
export type Business = typeof businesses.$inferSelect
export type NewBusiness = typeof businesses.$inferInsert
export type Listing = typeof listings.$inferSelect
export type NewListing = typeof listings.$inferInsert
export type Lead = typeof leads.$inferSelect
export type NewLead = typeof leads.$inferInsert
export type Conversation = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert
export type ChatMessage = typeof chatMessages.$inferSelect
export type NewChatMessage = typeof chatMessages.$inferInsert
export type LeadQualification = typeof leadQualifications.$inferSelect
export type NewLeadQualification = typeof leadQualifications.$inferInsert
export type AgentNotification = typeof agentNotifications.$inferSelect
export type NewAgentNotification = typeof agentNotifications.$inferInsert