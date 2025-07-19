// Phase 3: Schema-Driven Code Generation
import { z } from 'zod';
import { atom } from 'jotai';

// Central schema definition - Single source of truth
export const TaskSchema = z.object({
  id: z.number(),
  title: z.string().min(1, "Title required").max(100, "Title too long"),
  description: z.string().optional(),
  completed: z.boolean().default(false),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  deadline: z.string().optional(),
  estimatedHours: z.number().positive().optional(),
  assignedTo: z.number().optional(),
  projectId: z.number().optional(),
  tags: z.array(z.string()).default([]),
  dependencies: z.array(z.number()).default([])
});

export const ProjectSchema = z.object({
  id: z.number(),
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  goalId: z.number(),
  deadline: z.string().optional(),
  status: z.enum(['planning', 'active', 'completed', 'on-hold']).default('planning'),
  assignedTo: z.number().optional(),
  percentComplete: z.number().min(0).max(100).default(0)
});

export const GoalSchema = z.object({
  id: z.number(),
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  deadline: z.string().optional(),
  assignedTo: z.number().optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']).default('draft'),
  percentComplete: z.number().min(0).max(100).default(0),
  teamId: z.number().optional(),
  shareLevel: z.enum(['just_me', 'my_team', 'specific_people']).default('just_me')
});

// Auto-generated types from schemas
export type Task = z.infer<typeof TaskSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Goal = z.infer<typeof GoalSchema>;

// Auto-generated insert schemas (for forms)
export const TaskInsertSchema = TaskSchema.omit({ id: true });
export const ProjectInsertSchema = ProjectSchema.omit({ id: true });
export const GoalInsertSchema = GoalSchema.omit({ id: true });

// Auto-generated validation functions
export const validateTask = (data: unknown) => TaskSchema.safeParse(data);
export const validateProject = (data: unknown) => ProjectSchema.safeParse(data);
export const validateGoal = (data: unknown) => GoalSchema.safeParse(data);

// Schema-driven API endpoint generation
export const generateEndpoints = () => {
  const endpoints = {
    tasks: {
      list: '/api/tasks',
      create: '/api/tasks',
      update: (id: number) => `/api/tasks/${id}/edit`,
      delete: (id: number) => `/api/tasks/${id}`,
      schema: TaskSchema
    },
    projects: {
      list: '/api/projects',
      create: '/api/projects',
      update: (id: number) => `/api/projects/${id}/edit`,
      delete: (id: number) => `/api/projects/${id}`,
      schema: ProjectSchema
    },
    goals: {
      list: '/api/goals',
      create: '/api/goals',
      update: (id: number) => `/api/goals/${id}/edit`,
      delete: (id: number) => `/api/goals/${id}`,
      schema: GoalSchema
    }
  };
  
  return endpoints;
};

// Schema evolution tracking
export const schemaVersionAtom = atom('1.0.0');
export const schemaMigrationsAtom = atom([
  {
    version: '1.0.0',
    description: 'Initial schema definition',
    migrations: [],
    timestamp: new Date().toISOString()
  }
]);

// Auto-generated form field configurations
export const generateFormFields = (schema: z.ZodObject<any>) => {
  const shape = schema.shape;
  const fields: any[] = [];
  
  Object.entries(shape).forEach(([key, zodType]: [string, any]) => {
    const fieldConfig: any = {
      name: key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      required: !zodType.isOptional()
    };
    
    // Determine field type based on Zod schema
    if (zodType._def.typeName === 'ZodString') {
      fieldConfig.type = 'text';
      if (key === 'description') fieldConfig.type = 'textarea';
      if (key === 'deadline') fieldConfig.type = 'date';
    } else if (zodType._def.typeName === 'ZodNumber') {
      fieldConfig.type = 'number';
    } else if (zodType._def.typeName === 'ZodBoolean') {
      fieldConfig.type = 'checkbox';
    } else if (zodType._def.typeName === 'ZodEnum') {
      fieldConfig.type = 'select';
      fieldConfig.options = zodType._def.values;
    } else if (zodType._def.typeName === 'ZodArray') {
      fieldConfig.type = 'tags';
    }
    
    fields.push(fieldConfig);
  });
  
  return fields;
};

// Demo: Schema-driven components
export const schemaStatsAtom = atom((get) => {
  const schemas = { TaskSchema, ProjectSchema, GoalSchema };
  
  return {
    totalSchemas: Object.keys(schemas).length,
    totalFields: Object.values(schemas).reduce((total, schema) => 
      total + Object.keys(schema.shape).length, 0
    ),
    generatedEndpoints: Object.keys(generateEndpoints()).length * 4, // CRUD operations
    autoValidationRules: Object.values(schemas).reduce((total, schema) => {
      return total + Object.values(schema.shape).filter((field: any) => 
        field._def.checks?.length > 0 || !field.isOptional()
      ).length;
    }, 0)
  };
});