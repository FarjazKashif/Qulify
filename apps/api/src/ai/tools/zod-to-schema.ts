import { z, type ZodTypeAny } from 'zod'

/**
 * Minimal Zod → JSON Schema converter for tool input schemas.
 * Uses Zod's public instanceof checks rather than internal _def
 * structure, since Zod v4 restructured internals and broke the old
 * zod-to-json-schema package. Only handles shapes our tools actually
 * use — not a general-purpose converter.
 */
export const zodToJsonSchema = (schema: ZodTypeAny): Record<string, unknown> => {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape
    const properties: Record<string, unknown> = {}
    const required: string[] = []

    for (const [key, fieldSchema] of Object.entries(shape)) {
      const field = fieldSchema as ZodTypeAny
      properties[key] = fieldToJsonSchema(field)

      if (!field.isOptional()) {
        required.push(key)
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined
    }
  }

  return fieldToJsonSchema(schema)
}

const fieldToJsonSchema = (schema: ZodTypeAny): Record<string, unknown> => {
  const isOptional = schema instanceof z.ZodOptional
  const inner = isOptional ? schema.unwrap() : schema

  let baseSchema: Record<string, unknown>

  if (inner instanceof z.ZodString) {
    baseSchema = { type: 'string' }
  } else if (inner instanceof z.ZodNumber) {
    baseSchema = { type: 'number' }
  } else if (inner instanceof z.ZodBoolean) {
    baseSchema = { type: 'boolean' }
  } else if (inner instanceof z.ZodEnum) {
    baseSchema = { type: 'string', enum: inner.options }
  } else {
    baseSchema = { type: 'string' }
  }

  // Groq sometimes sends null for optional fields it doesn't have a value
  // for, rather than omitting the key entirely. Allow null as a valid
  // type for optional fields so the request isn't rejected before it
  // even reaches our own validation.
  if (isOptional) {
    const types = Array.isArray(baseSchema.type) ? baseSchema.type : [baseSchema.type as string]
    return { ...baseSchema, type: [...types, 'null'] }
  }

  return baseSchema
}