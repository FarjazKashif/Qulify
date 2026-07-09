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
  const inner = schema instanceof z.ZodOptional ? schema.unwrap() : schema

  if (inner instanceof z.ZodString) return { type: 'string' }
  if (inner instanceof z.ZodNumber) return { type: 'number' }
  if (inner instanceof z.ZodBoolean) return { type: 'boolean' }
  if (inner instanceof z.ZodEnum) return { type: 'string', enum: inner.options }

  return { type: 'string' } // safe fallback
}