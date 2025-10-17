import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function InstructorConfig() {
  const config = useQuery(api.tasks.getInstructorConfig);
  const updateConfig = useMutation(api.tasks.updateInstructorConfig);
  
  const [formData, setFormData] = useState({
    sharedSecret: "",
    githubToken: "",
    evaluationBaseUrl: "",
    maxRounds: 3,
  });

  // Update form when config loads
  useState(() => {
    if (config) {
      setFormData({
        sharedSecret: config.sharedSecret || "",
        githubToken: config.githubToken || "",
        evaluationBaseUrl: config.evaluationBaseUrl || "",
        maxRounds: config.maxRounds || 3,
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateConfig(formData);
      toast.success("Configuration updated successfully");
    } catch (error) {
      toast.error("Failed to update configuration");
      console.error(error);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Instructor Configuration</h2>
        <p className="text-gray-600 mt-1">
          Configure your system settings for automated project evaluation
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Shared Secret
          </label>
          <input
            type="password"
            value={formData.sharedSecret}
            onChange={(e) => setFormData({ ...formData, sharedSecret: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Enter shared secret for student authentication"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            This secret will be used to authenticate requests from students
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            GitHub Token
          </label>
          <input
            type="password"
            value={formData.githubToken}
            onChange={(e) => setFormData({ ...formData, githubToken: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="GitHub personal access token"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Used for creating repositories and enabling GitHub Pages
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Evaluation Base URL
          </label>
          <input
            type="url"
            value={formData.evaluationBaseUrl}
            onChange={(e) => setFormData({ ...formData, evaluationBaseUrl: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="https://your-domain.com/api/evaluate"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            URL where students will send their completed project notifications
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximum Rounds
          </label>
          <select
            value={formData.maxRounds}
            onChange={(e) => setFormData({ ...formData, maxRounds: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value={1}>1 Round</option>
            <option value={2}>2 Rounds</option>
            <option value={3}>3 Rounds</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Maximum number of revision rounds per task
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors font-medium"
          >
            Save Configuration
          </button>
        </div>
      </form>

      {config && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">API Endpoints</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Student Build Endpoint:</span>
              <code className="ml-2 px-2 py-1 bg-white rounded text-xs">
                {window.location.origin}/api/build
              </code>
            </div>
            <div>
              <span className="font-medium">Evaluation Endpoint:</span>
              <code className="ml-2 px-2 py-1 bg-white rounded text-xs">
                {config.evaluationBaseUrl}
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
