import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// Student endpoint: Receive project build request
export const receiveProjectRequest = mutation({
  args: {
    email: v.string(),
    secret: v.string(),
    task: v.string(),
    round: v.number(),
    nonce: v.string(),
    brief: v.string(),
    checks: v.array(v.string()),
    evaluation_url: v.string(),
    attachments: v.optional(v.array(v.object({
      name: v.string(),
      url: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    // Verify secret (in production, this would be more secure)
    const expectedSecret = process.env.SHARED_SECRET;
    if (!expectedSecret || args.secret !== expectedSecret) {
      throw new Error("Invalid secret");
    }

    // Check if this is an update (round > 1) or new submission
    const existingSubmission = await ctx.db
      .query("submissions")
      .withIndex("by_email_and_task", (q) => 
        q.eq("email", args.email).eq("task", args.task)
      )
      .filter((q) => q.lt(q.field("round"), args.round))
      .first();

    const submissionId = await ctx.db.insert("submissions", {
      email: args.email,
      task: args.task,
      round: args.round,
      nonce: args.nonce,
      brief: args.brief,
      checks: args.checks,
      evaluationUrl: args.evaluation_url,
      attachments: args.attachments,
      status: "received",
      createdAt: Date.now(),
    });

    // Log the request
    await ctx.db.insert("systemLogs", {
      level: "info",
      message: `Received project request for ${args.email}, task: ${args.task}, round: ${args.round}`,
      context: {
        submissionId,
        email: args.email,
        task: args.task,
      },
      timestamp: Date.now(),
    });

    // Schedule the build process
    await ctx.scheduler.runAfter(0, internal.submissions.buildProject, {
      submissionId,
    });

    return { success: true, submissionId };
  },
});

// Internal: Build and deploy project
export const buildProject = internalAction({
  args: {
    submissionId: v.id("submissions"),
  },
  handler: async (ctx, args) => {
    const submission = await ctx.runQuery(internal.submissions.getSubmission, {
      submissionId: args.submissionId,
    });

    if (!submission) {
      throw new Error("Submission not found");
    }

    try {
      // Update status to building
      await ctx.runMutation(internal.submissions.updateSubmissionStatus, {
        submissionId: args.submissionId,
        status: "building",
      });

      // Generate code using LLM
      const generatedCode = await generateProjectCode(submission.brief, submission.attachments);
      
      // Create GitHub repository
      const repoData = await createGitHubRepo(submission, generatedCode);
      
      // Update status to deploying
      await ctx.runMutation(internal.submissions.updateSubmissionStatus, {
        submissionId: args.submissionId,
        status: "deploying",
      });

      // Enable GitHub Pages and wait for deployment
      const pagesUrl = await deployToGitHubPages(repoData.repoUrl);

      // Update submission with repo details
      await ctx.runMutation(internal.submissions.updateSubmissionRepo, {
        submissionId: args.submissionId,
        repoUrl: repoData.repoUrl,
        commitSha: repoData.commitSha,
        pagesUrl,
        status: "completed",
      });

      // Notify evaluation endpoint
      await notifyEvaluationEndpoint(submission, repoData.repoUrl, repoData.commitSha, pagesUrl);

      await ctx.runMutation(internal.submissions.logMessage, {
        level: "info",
        message: `Successfully built and deployed project for ${submission.email}`,
        context: {
          submissionId: args.submissionId,
          email: submission.email,
          task: submission.task,
        },
      });

    } catch (error) {
      await ctx.runMutation(internal.submissions.updateSubmissionStatus, {
        submissionId: args.submissionId,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      await ctx.runMutation(internal.submissions.logMessage, {
        level: "error",
        message: `Failed to build project for ${submission.email}: ${error}`,
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

// Internal queries and mutations
export const getSubmission = internalQuery({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.submissionId);
  },
});

export const updateSubmissionStatus = internalMutation({
  args: {
    submissionId: v.id("submissions"),
    status: v.union(
      v.literal("received"),
      v.literal("building"),
      v.literal("deploying"),
      v.literal("completed"),
      v.literal("failed")
    ),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.submissionId, {
      status: args.status,
      ...(args.errorMessage && { errorMessage: args.errorMessage }),
    });
  },
});

export const updateSubmissionRepo = internalMutation({
  args: {
    submissionId: v.id("submissions"),
    repoUrl: v.string(),
    commitSha: v.string(),
    pagesUrl: v.string(),
    status: v.literal("completed"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.submissionId, {
      repoUrl: args.repoUrl,
      commitSha: args.commitSha,
      pagesUrl: args.pagesUrl,
      status: args.status,
      completedAt: Date.now(),
    });
  },
});

export const logMessage = internalMutation({
  args: {
    level: v.union(v.literal("info"), v.literal("warn"), v.literal("error")),
    message: v.string(),
    context: v.optional(v.object({
      submissionId: v.optional(v.id("submissions")),
      email: v.optional(v.string()),
      task: v.optional(v.string()),
      error: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("systemLogs", {
      level: args.level,
      message: args.message,
      context: args.context,
      timestamp: Date.now(),
    });
  },
});

// Query submissions for instructor dashboard
export const getSubmissionsByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("submissions")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .order("desc")
      .collect();
  },
});

export const getAllSubmissions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("submissions")
      .order("desc")
      .take(100);
  },
});

// Helper functions (would be implemented with actual APIs)
async function generateProjectCode(brief: string, attachments?: Array<{name: string, url: string}>) {
  // This would use the OpenAI API to generate code based on the brief
  // For now, return a simple template
  return {
    "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Project</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .container { text-align: center; }
        .brief { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Generated Project</h1>
        <div class="brief">
            <h2>Project Brief:</h2>
            <p>${brief}</p>
        </div>
        <p>This project was automatically generated based on the provided brief.</p>
    </div>
</body>
</html>`,
    "README.md": `# Generated Project

## Summary
This project was automatically generated based on the provided brief: "${brief}"

## Setup
1. Clone this repository
2. Open index.html in a web browser

## Usage
Open the deployed GitHub Pages URL to view the application.

## Code Explanation
This is a minimal HTML application generated automatically based on the project requirements.

## License
MIT License - see LICENSE file for details.
`,
    "LICENSE": `MIT License

Copyright (c) ${new Date().getFullYear()} Student Project

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`
  };
}

async function createGitHubRepo(submission: any, code: Record<string, string>) {
  // This would use the GitHub API to create a repository
  // For now, return mock data
  const repoName = `${submission.task}-${Date.now()}`;
  return {
    repoUrl: `https://github.com/student/${repoName}`,
    commitSha: "abc123def456",
  };
}

async function deployToGitHubPages(repoUrl: string) {
  // This would enable GitHub Pages and wait for deployment
  // For now, return mock URL
  const repoName = repoUrl.split('/').pop();
  return `https://student.github.io/${repoName}`;
}

async function notifyEvaluationEndpoint(submission: any, repoUrl: string, commitSha: string, pagesUrl: string) {
  // This would POST to the evaluation URL with retry logic
  const payload = {
    email: submission.email,
    task: submission.task,
    round: submission.round,
    nonce: submission.nonce,
    repo_url: repoUrl,
    commit_sha: commitSha,
    pages_url: pagesUrl,
  };

  // Implement exponential backoff retry logic here
  console.log("Would notify evaluation endpoint:", submission.evaluationUrl, payload);
}
