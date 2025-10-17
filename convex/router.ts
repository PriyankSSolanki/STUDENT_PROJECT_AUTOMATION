import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// Student endpoint: Receive project build requests
http.route({
  path: "/api/build",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      
      const result = await ctx.runMutation(api.submissions.receiveProjectRequest, {
        email: body.email,
        secret: body.secret,
        task: body.task,
        round: body.round,
        nonce: body.nonce,
        brief: body.brief,
        checks: body.checks,
        evaluation_url: body.evaluation_url,
        attachments: body.attachments,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: error instanceof Error ? error.message : "Unknown error" 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

// Instructor endpoint: Receive evaluation notifications
http.route({
  path: "/api/evaluate",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      
      const result = await ctx.runMutation(api.evaluation.receiveEvaluationNotification, {
        email: body.email,
        task: body.task,
        round: body.round,
        nonce: body.nonce,
        repo_url: body.repo_url,
        commit_sha: body.commit_sha,
        pages_url: body.pages_url,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: error instanceof Error ? error.message : "Unknown error" 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

export default http;
