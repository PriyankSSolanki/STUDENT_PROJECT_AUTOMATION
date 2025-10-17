import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // Student submissions and project data
  submissions: defineTable({
    email: v.string(),
    task: v.string(),
    round: v.number(),
    nonce: v.string(),
    brief: v.string(),
    checks: v.array(v.string()),
    evaluationUrl: v.string(),
    attachments: v.optional(v.array(v.object({
      name: v.string(),
      url: v.string(),
    }))),
    status: v.union(
      v.literal("received"),
      v.literal("building"),
      v.literal("deploying"),
      v.literal("completed"),
      v.literal("failed")
    ),
    repoUrl: v.optional(v.string()),
    commitSha: v.optional(v.string()),
    pagesUrl: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_task", ["task"])
    .index("by_status", ["status"])
    .index("by_email_and_task", ["email", "task"]),

  // Evaluation results
  evaluations: defineTable({
    submissionId: v.id("submissions"),
    email: v.string(),
    task: v.string(),
    round: v.number(),
    repoUrl: v.string(),
    pagesUrl: v.string(),
    
    // Evaluation results
    licenseCheck: v.boolean(),
    readmeQuality: v.number(), // 0-100 score
    codeQuality: v.number(), // 0-100 score
    functionalityTests: v.array(v.object({
      name: v.string(),
      passed: v.boolean(),
      details: v.string(),
    })),
    
    overallScore: v.number(), // 0-100
    passed: v.boolean(),
    feedback: v.string(),
    evaluatedAt: v.number(),
  })
    .index("by_submission", ["submissionId"])
    .index("by_email", ["email"])
    .index("by_task", ["task"]),

  // Task templates for instructors
  taskTemplates: defineTable({
    name: v.string(),
    brief: v.string(),
    checks: v.array(v.string()),
    playwrightTests: v.string(), // JavaScript code for Playwright tests
    attachments: v.optional(v.array(v.object({
      name: v.string(),
      url: v.string(),
    }))),
    createdBy: v.id("users"),
    isActive: v.boolean(),
  })
    .index("by_creator", ["createdBy"])
    .index("by_active", ["isActive"]),

  // Instructor configurations
  instructorConfigs: defineTable({
    userId: v.id("users"),
    sharedSecret: v.string(),
    githubToken: v.string(), // Encrypted
    evaluationBaseUrl: v.string(),
    maxRounds: v.number(),
  })
    .index("by_user", ["userId"]),

  // System logs
  systemLogs: defineTable({
    level: v.union(v.literal("info"), v.literal("warn"), v.literal("error")),
    message: v.string(),
    context: v.optional(v.object({
      submissionId: v.optional(v.id("submissions")),
      email: v.optional(v.string()),
      task: v.optional(v.string()),
      error: v.optional(v.string()),
    })),
    timestamp: v.number(),
  })
    .index("by_level", ["level"])
    .index("by_timestamp", ["timestamp"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
