import { v } from "convex/values";
import { mutation, query, internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// Instructor endpoint: Receive evaluation notification
export const receiveEvaluationNotification = mutation({
  args: {
    email: v.string(),
    task: v.string(),
    round: v.number(),
    nonce: v.string(),
    repo_url: v.string(),
    commit_sha: v.string(),
    pages_url: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the corresponding submission
    const submission = await ctx.db
      .query("submissions")
      .withIndex("by_email_and_task", (q) => 
        q.eq("email", args.email).eq("task", args.task)
      )
      .filter((q) => q.eq(q.field("round"), args.round))
      .filter((q) => q.eq(q.field("nonce"), args.nonce))
      .first();

    if (!submission) {
      throw new Error("Submission not found");
    }

    // Schedule evaluation
    await ctx.scheduler.runAfter(0, internal.evaluation.evaluateProject, {
      submissionId: submission._id,
      repoUrl: args.repo_url,
      commitSha: args.commit_sha,
      pagesUrl: args.pages_url,
    });

    await ctx.db.insert("systemLogs", {
      level: "info",
      message: `Queued evaluation for ${args.email}, task: ${args.task}`,
      context: {
        submissionId: submission._id,
        email: args.email,
        task: args.task,
      },
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// Internal: Evaluate project
export const evaluateProject = internalAction({
  args: {
    submissionId: v.id("submissions"),
    repoUrl: v.string(),
    commitSha: v.string(),
    pagesUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const submission = await ctx.runQuery(internal.submissions.getSubmission, {
      submissionId: args.submissionId,
    });

    if (!submission) {
      throw new Error("Submission not found");
    }

    try {
      // Run repository-level checks
      const licenseCheck = await checkMITLicense(args.repoUrl);
      
      // Run LLM-based quality checks
      const readmeQuality = await evaluateReadmeQuality(args.repoUrl);
      const codeQuality = await evaluateCodeQuality(args.repoUrl);
      
      // Run functional tests with Playwright
      const functionalityTests = await runPlaywrightTests(args.pagesUrl, submission.checks);
      
      // Calculate overall score
      const overallScore = calculateOverallScore(licenseCheck, readmeQuality, codeQuality, functionalityTests);
      const passed = overallScore >= 70; // 70% threshold
      
      // Generate feedback
      const feedback = generateFeedback(licenseCheck, readmeQuality, codeQuality, functionalityTests);

      // Store evaluation results
      await ctx.runMutation(internal.evaluation.storeEvaluationResults, {
        submissionId: args.submissionId,
        email: submission.email,
        task: submission.task,
        round: submission.round,
        repoUrl: args.repoUrl,
        pagesUrl: args.pagesUrl,
        licenseCheck,
        readmeQuality,
        codeQuality,
        functionalityTests,
        overallScore,
        passed,
        feedback,
      });

      // If this is round 1, generate round 2 task
      if (submission.round === 1) {
        await ctx.scheduler.runAfter(0, internal.evaluation.generateNextRoundTask, {
          submissionId: args.submissionId,
          previousPassed: passed,
        });
      }

    } catch (error) {
      await ctx.runMutation(internal.submissions.logMessage, {
        level: "error",
        message: `Failed to evaluate project for ${submission.email}: ${error}`,
        context: {
          submissionId: args.submissionId,
          email: submission.email,
          task: submission.task,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  },
});

export const storeEvaluationResults = internalMutation({
  args: {
    submissionId: v.id("submissions"),
    email: v.string(),
    task: v.string(),
    round: v.number(),
    repoUrl: v.string(),
    pagesUrl: v.string(),
    licenseCheck: v.boolean(),
    readmeQuality: v.number(),
    codeQuality: v.number(),
    functionalityTests: v.array(v.object({
      name: v.string(),
      passed: v.boolean(),
      details: v.string(),
    })),
    overallScore: v.number(),
    passed: v.boolean(),
    feedback: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("evaluations", {
      submissionId: args.submissionId,
      email: args.email,
      task: args.task,
      round: args.round,
      repoUrl: args.repoUrl,
      pagesUrl: args.pagesUrl,
      licenseCheck: args.licenseCheck,
      readmeQuality: args.readmeQuality,
      codeQuality: args.codeQuality,
      functionalityTests: args.functionalityTests,
      overallScore: args.overallScore,
      passed: args.passed,
      feedback: args.feedback,
      evaluatedAt: Date.now(),
    });
  },
});

export const generateNextRoundTask = internalAction({
  args: {
    submissionId: v.id("submissions"),
    previousPassed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const submission = await ctx.runQuery(internal.submissions.getSubmission, {
      submissionId: args.submissionId,
    });

    if (!submission) return;

    // Generate tailored round 2 task based on round 1 performance
    const round2Brief = args.previousPassed 
      ? `Enhance your ${submission.task} with advanced features: Add user authentication, improve UI/UX, and implement data persistence.`
      : `Refactor your ${submission.task} to address the issues identified in round 1. Focus on code quality, proper error handling, and meeting all requirements.`;

    const round2Checks = [
      "Code is well-structured and documented",
      "Enhanced functionality beyond basic requirements",
      "Proper error handling implemented",
      "UI is responsive and user-friendly",
    ];

    // This would send the round 2 task to the student's endpoint
    console.log("Would send round 2 task:", {
      email: submission.email,
      task: `${submission.task}-round2`,
      round: 2,
      brief: round2Brief,
      checks: round2Checks,
    });
  },
});

// Query evaluations for instructor dashboard
export const getEvaluationsByTask = query({
  args: { task: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("evaluations")
      .withIndex("by_task", (q) => q.eq("task", args.task))
      .order("desc")
      .collect();
  },
});

export const getAllEvaluations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("evaluations")
      .order("desc")
      .take(100);
  },
});

// Helper functions for evaluation
async function checkMITLicense(repoUrl: string): Promise<boolean> {
  // This would check if the repo has an MIT LICENSE file
  // For now, return true as mock
  return true;
}

async function evaluateReadmeQuality(repoUrl: string): Promise<number> {
  // This would use LLM to evaluate README quality
  // Return score 0-100
  return Math.floor(Math.random() * 40) + 60; // Mock: 60-100
}

async function evaluateCodeQuality(repoUrl: string): Promise<number> {
  // This would use LLM to evaluate code quality
  // Return score 0-100
  return Math.floor(Math.random() * 40) + 60; // Mock: 60-100
}

async function runPlaywrightTests(pagesUrl: string, checks: string[]): Promise<Array<{name: string, passed: boolean, details: string}>> {
  // This would run actual Playwright tests
  // For now, return mock results
  return checks.map(check => ({
    name: check,
    passed: Math.random() > 0.3, // 70% pass rate
    details: `Test for "${check}" ${Math.random() > 0.3 ? 'passed' : 'failed'}`,
  }));
}

function calculateOverallScore(
  licenseCheck: boolean,
  readmeQuality: number,
  codeQuality: number,
  functionalityTests: Array<{passed: boolean}>
): number {
  const licenseScore = licenseCheck ? 10 : 0;
  const readmeScore = readmeQuality * 0.2; // 20% weight
  const codeScore = codeQuality * 0.3; // 30% weight
  const functionalityScore = (functionalityTests.filter(t => t.passed).length / functionalityTests.length) * 40; // 40% weight
  
  return Math.round(licenseScore + readmeScore + codeScore + functionalityScore);
}

function generateFeedback(
  licenseCheck: boolean,
  readmeQuality: number,
  codeQuality: number,
  functionalityTests: Array<{name: string, passed: boolean, details: string}>
): string {
  let feedback = "## Evaluation Feedback\n\n";
  
  feedback += `### License Check: ${licenseCheck ? '✅ PASS' : '❌ FAIL'}\n`;
  if (!licenseCheck) {
    feedback += "Please add an MIT LICENSE file to your repository.\n\n";
  }
  
  feedback += `### README Quality: ${readmeQuality}/100\n`;
  if (readmeQuality < 70) {
    feedback += "Consider improving your README with better documentation, setup instructions, and code explanations.\n\n";
  }
  
  feedback += `### Code Quality: ${codeQuality}/100\n`;
  if (codeQuality < 70) {
    feedback += "Focus on code structure, comments, and following best practices.\n\n";
  }
  
  feedback += "### Functionality Tests:\n";
  functionalityTests.forEach(test => {
    feedback += `- ${test.name}: ${test.passed ? '✅ PASS' : '❌ FAIL'}\n`;
    if (!test.passed) {
      feedback += `  ${test.details}\n`;
    }
  });
  
  return feedback;
}
