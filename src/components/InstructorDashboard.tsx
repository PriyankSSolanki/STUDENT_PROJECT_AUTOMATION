import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { TaskTemplateForm } from "./TaskTemplateForm";
import { SubmissionsList } from "./SubmissionsList";
import { EvaluationResults } from "./EvaluationResults";
import { InstructorConfig } from "./InstructorConfig";

export function InstructorDashboard() {
  const [activeSection, setActiveSection] = useState<"config" | "tasks" | "submissions" | "evaluations">("config");
  
  const config = useQuery(api.tasks.getInstructorConfig);
  const taskTemplates = useQuery(api.tasks.getTaskTemplates);
  const submissions = useQuery(api.submissions.getAllSubmissions);
  const evaluations = useQuery(api.evaluation.getAllEvaluations);

  const sections = [
    { id: "config", label: "Configuration", count: config ? 1 : 0 },
    { id: "tasks", label: "Task Templates", count: taskTemplates?.length || 0 },
    { id: "submissions", label: "Submissions", count: submissions?.length || 0 },
    { id: "evaluations", label: "Evaluations", count: evaluations?.length || 0 },
  ] as const;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar Navigation */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h2 className="font-semibold text-gray-900 mb-4">Dashboard</h2>
          <nav className="space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? "bg-primary text-white"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>{section.label}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    activeSection === section.id
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {section.count}
                  </span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mt-4">
          <h3 className="font-semibold text-gray-900 mb-3">Quick Stats</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Active Tasks</span>
              <span className="font-medium">{taskTemplates?.filter(t => t.isActive).length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pending Submissions</span>
              <span className="font-medium">
                {submissions?.filter(s => s.status === "received" || s.status === "building").length || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Completed Evaluations</span>
              <span className="font-medium">{evaluations?.length || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3">
        <div className="bg-white rounded-lg shadow-sm border">
          {activeSection === "config" && <InstructorConfig />}
          {activeSection === "tasks" && <TaskTemplateForm />}
          {activeSection === "submissions" && <SubmissionsList />}
          {activeSection === "evaluations" && <EvaluationResults />}
        </div>
      </div>
    </div>
  );
}
