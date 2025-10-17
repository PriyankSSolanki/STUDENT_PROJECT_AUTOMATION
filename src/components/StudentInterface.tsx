import { useState } from "react";
import { toast } from "sonner";

export function StudentInterface() {
  const [testRequest, setTestRequest] = useState({
    email: "student@example.com",
    secret: "",
    task: "test-task",
    round: 1,
    nonce: "",
    brief: "Create a simple web application that displays 'Hello World' with a button that changes the text color when clicked.",
    checks: [
      "Page displays 'Hello World' text",
      "Button is present and clickable",
      "Text color changes when button is clicked",
      "Repository has MIT license",
      "README.md is complete and professional"
    ],
    evaluation_url: "",
    attachments: []
  });

  const generateNonce = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  const handleTestSubmission = async () => {
    try {
      const requestData = {
        ...testRequest,
        nonce: generateNonce(),
        evaluation_url: `${window.location.origin}/api/evaluate`,
      };

      const response = await fetch(`${window.location.origin}/api/build`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("Test submission successful!");
        console.log("Response:", result);
      } else {
        const error = await response.json();
        toast.error(`Submission failed: ${error.error}`);
      }
    } catch (error) {
      toast.error("Network error occurred");
      console.error(error);
    }
  };

  return (
    <div className="space-y-8">
      {/* API Documentation */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">API Endpoints</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Student Build Endpoint</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <code className="text-sm">
                POST {window.location.origin}/api/build
              </code>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Students send project build requests to this endpoint with task details.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Evaluation Notification Endpoint</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <code className="text-sm">
                POST {window.location.origin}/api/evaluate
              </code>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Students notify this endpoint when their project is built and deployed.
            </p>
          </div>
        </div>
      </div>

      {/* Request Format */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Request Format</h2>
        
        <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm text-gray-800">
{`{
  "email": "student@example.com",
  "secret": "shared-secret-key",
  "task": "captcha-solver-xyz",
  "round": 1,
  "nonce": "unique-request-id",
  "brief": "Create a captcha solver that handles ?url=https://.../image.png",
  "checks": [
    "Repo has MIT license",
    "README.md is professional",
    "Page displays captcha URL passed at ?url=...",
    "Page displays solved captcha text within 15 seconds"
  ],
  "evaluation_url": "https://example.com/api/evaluate",
  "attachments": [
    {
      "name": "sample.png",
      "url": "data:image/png;base64,iVBORw..."
    }
  ]
}`}
          </pre>
        </div>
      </div>

      {/* Test Interface */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Submission</h2>
        <p className="text-gray-600 mb-6">
          Test the student submission endpoint with sample data.
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student Email
              </label>
              <input
                type="email"
                value={testRequest.email}
                onChange={(e) => setTestRequest({ ...testRequest, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shared Secret
              </label>
              <input
                type="password"
                value={testRequest.secret}
                onChange={(e) => setTestRequest({ ...testRequest, secret: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter shared secret"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Name
              </label>
              <input
                type="text"
                value={testRequest.task}
                onChange={(e) => setTestRequest({ ...testRequest, task: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Round
              </label>
              <select
                value={testRequest.round}
                onChange={(e) => setTestRequest({ ...testRequest, round: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value={1}>Round 1</option>
                <option value={2}>Round 2</option>
                <option value={3}>Round 3</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Brief
            </label>
            <textarea
              value={testRequest.brief}
              onChange={(e) => setTestRequest({ ...testRequest, brief: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evaluation Checks
            </label>
            <div className="space-y-2">
              {testRequest.checks.map((check, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={check}
                    onChange={(e) => {
                      const newChecks = [...testRequest.checks];
                      newChecks[index] = e.target.value;
                      setTestRequest({ ...testRequest, checks: newChecks });
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <button
                    onClick={() => {
                      const newChecks = testRequest.checks.filter((_, i) => i !== index);
                      setTestRequest({ ...testRequest, checks: newChecks });
                    }}
                    className="px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  setTestRequest({
                    ...testRequest,
                    checks: [...testRequest.checks, ""]
                  });
                }}
                className="text-sm text-primary hover:text-primary-hover"
              >
                + Add Check
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleTestSubmission}
              className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors font-medium"
            >
              Send Test Request
            </button>
          </div>
        </div>
      </div>

      {/* Response Format */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Expected Response Format</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Success Response</h3>
            <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm text-gray-800">
{`{
  "success": true,
  "submissionId": "k1234567890abcdef"
}`}
              </pre>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Response</h3>
            <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm text-gray-800">
{`{
  "error": "Invalid secret"
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
