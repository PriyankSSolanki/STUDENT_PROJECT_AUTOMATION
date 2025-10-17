import { v } from "convex/values";
import { mutation, query, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// Create task template
export const createTaskTemplate = mutation({
  args: {
    name: v.string(),
    brief: v.string(),
    checks: v.array(v.string()),
    playwrightTests: v.string(),
    attachments: v.optional(v.array(v.object({
      name: v.string(),
      url: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.insert("taskTemplates", {
      name: args.name,
      brief: args.brief,
      checks: args.checks,
      playwrightTests: args.playwrightTests,
      attachments: args.attachments,
      createdBy: userId,
      isActive: true,
    });
  },
});

// Get task templates
export const getTaskTemplates = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("taskTemplates")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .order("desc")
      .collect();
  },
});

// Send task to students
export const sendTaskToStudents = mutation({
  args: {
    taskTemplateId: v.id("taskTemplates"),
    studentEmails: v.array(v.string()),
    studentEndpoints: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const taskTemplate = await ctx.db.get(args.taskTemplateId);
    if (!taskTemplate) {
      throw new Error("Task template not found");
    }

    // Get instructor config for shared secret
    const config = await ctx.db
      .query("instructorConfigs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!config) {
      throw new Error("Instructor configuration not found");
    }

    // Schedule task sending for each student
    for (let i = 0; i < args.studentEmails.length; i++) {
      await ctx.scheduler.runAfter(0, internal.tasks.sendTaskToStudent, {
        email: args.studentEmails[i],
        endpoint: args.studentEndpoints[i],
        taskTemplate: taskTemplate,
        sharedSecret: config.sharedSecret,
        evaluationUrl: config.evaluationBaseUrl,
      });
    }

    return { success: true, tasksSent: args.studentEmails.length };
  },
});

// Internal: Send task to individual student
export const sendTaskToStudent = internalAction({
  args: {
    email: v.string(),
    endpoint: v.string(),
    taskTemplate: v.object({
      name: v.string(),
      brief: v.string(),
      checks: v.array(v.string()),
      attachments: v.optional(v.array(v.object({
        name: v.string(),
        url: v.string(),
      }))),
    }),
    sharedSecret: v.string(),
    evaluationUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const nonce = generateNonce();
    const taskRequest = {
      email: args.email,
      secret: args.sharedSecret,
      task: args.taskTemplate.name,
      round: 1,
      nonce,
      brief: args.taskTemplate.brief,
      checks: args.taskTemplate.checks,
      evaluation_url: args.evaluationUrl,
      attachments: args.taskTemplate.attachments || [],
    };

    // Send with retry logic
    await sendWithRetry(args.endpoint, taskRequest, 3);
  },
});

// Instructor configuration
export const updateInstructorConfig = mutation({
  args: {
    sharedSecret: v.string(),
    githubToken: v.string(),
    evaluationBaseUrl: v.string(),
    maxRounds: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existingConfig = await ctx.db
      .query("instructorConfigs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingConfig) {
      await ctx.db.patch(existingConfig._id, {
        sharedSecret: args.sharedSecret,
        githubToken: args.githubToken, // In production, encrypt this
        evaluationBaseUrl: args.evaluationBaseUrl,
        maxRounds: args.maxRounds,
      });
      return existingConfig._id;
    } else {
      return await ctx.db.insert("instructorConfigs", {
        userId,
        sharedSecret: args.sharedSecret,
        githubToken: args.githubToken, // In production, encrypt this
        evaluationBaseUrl: args.evaluationBaseUrl,
        maxRounds: args.maxRounds,
      });
    }
  },
});

export const getInstructorConfig = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("instructorConfigs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

// Helper functions
function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

async function sendWithRetry(endpoint: string, payload: any, maxRetries: number): Promise<void> {
  let retries = 0;
  let delay = 1000; // Start with 1 second

  while (retries < maxRetries) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return; // Success
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        throw new Error(`Failed to send task after ${maxRetries} attempts: ${error}`);
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}
