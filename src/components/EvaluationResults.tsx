import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function EvaluationResults() {
  const evaluations = useQuery(api.evaluation.getAllEvaluations);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Evaluation Results</h2>
        <p className="text-gray-600 mt-1">
          View detailed evaluation results for all student submissions
        </p>
      </div>

      {evaluations && evaluations.length > 0 ? (
        <div className="space-y-6">
          {evaluations.map((evaluation) => (
            <div key={evaluation._id} className="border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {evaluation.email} - {evaluation.task}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Round {evaluation.round} • Evaluated {formatDate(evaluation.evaluatedAt)}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getScoreColor(evaluation.overallScore)}`}>
                    {evaluation.overallScore}%
                  </div>
                  <div className={`text-sm font-medium ${
                    evaluation.passed ? "text-green-600" : "text-red-600"
                  }`}>
                    {evaluation.passed ? "PASSED" : "FAILED"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">License Check</div>
                  <div className={`font-medium ${
                    evaluation.licenseCheck ? "text-green-600" : "text-red-600"
                  }`}>
                    {evaluation.licenseCheck ? "✅ PASS" : "❌ FAIL"}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">README Quality</div>
                  <div className={`font-medium ${getScoreColor(evaluation.readmeQuality)}`}>
                    {evaluation.readmeQuality}/100
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Code Quality</div>
                  <div className={`font-medium ${getScoreColor(evaluation.codeQuality)}`}>
                    {evaluation.codeQuality}/100
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Functionality Tests</h4>
                <div className="space-y-2">
                  {evaluation.functionalityTests.map((test, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">{test.name}</span>
                      <span className={`text-sm font-medium ${
                        test.passed ? "text-green-600" : "text-red-600"
                      }`}>
                        {test.passed ? "✅ PASS" : "❌ FAIL"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Links</h4>
                <div className="flex gap-4 text-sm">
                  <a
                    href={evaluation.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary-hover"
                  >
                    Repository →
                  </a>
                  <a
                    href={evaluation.pagesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary-hover"
                  >
                    Live Site →
                  </a>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Feedback</h4>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-3 rounded">
                    {evaluation.feedback}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No evaluations yet</h3>
          <p className="text-gray-500">
            Evaluation results will appear here once projects are submitted and evaluated.
          </p>
        </div>
      )}
    </div>
  );
}
