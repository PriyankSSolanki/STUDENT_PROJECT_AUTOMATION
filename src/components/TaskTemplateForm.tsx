import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function TaskTemplateForm() {
  const taskTemplates = useQuery(api.tasks.getTaskTemplates);
  const createTask = useMutation(api.tasks.createTaskTemplate);
  const sendTasks = useMutation(api.tasks.sendTaskToStudents);
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    brief: "",
    checks: [""],
    playwrightTests: "",
  });

  const [sendTasksData, setSendTasksData] = useState({
    selectedTask: "",
    studentEmails: "",
    studentEndpoints: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const checks = formData.checks.filter(check => check.trim() !== "");
      await createTask({
        name: formData.name,
        brief: formData.brief,
        checks,
        playwrightTests: formData.playwrightTests,
      });
      
      toast.success("Task template created successfully");
      setFormData({
        name: "",
        brief: "",
        checks: [""],
        playwrightTests: "",
      });
      setShowForm(false);
    } catch (error) {
      toast.error("Failed to create task template");
      console.error(error);
    }
  };

  const handleSendTasks = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const emails = sendTasksData.studentEmails.split('\n').map(e => e.trim()).filter(e => e);
      const endpoints = sendTasksData.studentEndpoints.split('\n').map(e => e.trim()).filter(e => e);
      
      if (emails.length !== endpoints.length) {
        toast.error("Number of emails and endpoints must match");
        return;
      }

      await sendTasks({
        taskTemplateId: sendTasksData.selectedTask as any,
        studentEmails: emails,
        studentEndpoints: endpoints,
      });
      
      toast.success(`Tasks sent to ${emails.length} students`);
      setSendTasksData({
        selectedTask: "",
        studentEmails: "",
        studentEndpoints: "",
      });
    } catch (error) {
      toast.error("Failed to send tasks");
      console.error(error);
    }
  };

  const addCheck = () => {
    setFormData({
      ...formData,
      checks: [...formData.checks, ""],
    });
  };

  const updateCheck = (index: number, value: string) => {
    const newChecks = [...formData.checks];
    newChecks[index] = value;
    setFormData({ ...formData, checks: newChecks });
  };

  const removeCheck = (index: number) => {
    const newChecks = formData.checks.filter((_, i) => i !== index);
    setFormData({ ...formData, checks: newChecks });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Task Templates</h2>
          <p className="text-gray-600 mt-1">
            Create and manage project task templates
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors font-medium"
        >
          {showForm ? "Cancel" : "Create New Task"}
        </button>
      </div>

      {showForm && (
        <div className="mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create Task Template</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g., captcha-solver-xyz"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Brief
              </label>
              <textarea
                value={formData.brief}
                onChange={(e) => setFormData({ ...formData, brief: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Describe the project requirements..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Evaluation Checks
              </label>
              {formData.checks.map((check, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={check}
                    onChange={(e) => updateCheck(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter evaluation criteria..."
                  />
                  {formData.checks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCheck(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addCheck}
                className="text-sm text-primary hover:text-primary-hover"
              >
                + Add Check
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Playwright Tests (JavaScript)
              </label>
              <textarea
                value={formData.playwrightTests}
                onChange={(e) => setFormData({ ...formData, playwrightTests: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
                placeholder="// Playwright test code
const { test, expect } = require('@playwright/test');

test('basic functionality', async ({ page }) => {
  await page.goto(baseUrl);
  // Add your tests here
});"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors font-medium"
              >
                Create Task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Send Tasks Section */}
      {taskTemplates && taskTemplates.length > 0 && (
        <div className="mb-8 p-6 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Send Tasks to Students</h3>
          
          <form onSubmit={handleSendTasks} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Task Template
              </label>
              <select
                value={sendTasksData.selectedTask}
                onChange={(e) => setSendTasksData({ ...sendTasksData, selectedTask: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="">Choose a task...</option>
                {taskTemplates.map((task) => (
                  <option key={task._id} value={task._id}>
                    {task.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Emails (one per line)
                </label>
                <textarea
                  value={sendTasksData.studentEmails}
                  onChange={(e) => setSendTasksData({ ...sendTasksData, studentEmails: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="student1@example.com&#10;student2@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student API Endpoints (one per line)
                </label>
                <textarea
                  value={sendTasksData.studentEndpoints}
                  onChange={(e) => setSendTasksData({ ...sendTasksData, studentEndpoints: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="https://student1.com/api/build&#10;https://student2.com/api/build"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
              >
                Send Tasks
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Task Templates List */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Existing Templates</h3>
        
        {taskTemplates && taskTemplates.length > 0 ? (
          <div className="space-y-4">
            {taskTemplates.map((task) => (
              <div key={task._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900">{task.name}</h4>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    task.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                  }`}>
                    {task.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-3">{task.brief}</p>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Checks:</span>
                  <ul className="list-disc list-inside ml-4 mt-1 text-gray-600">
                    {task.checks.map((check, index) => (
                      <li key={index}>{check}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No task templates created yet. Create your first template above.
          </p>
        )}
      </div>
    </div>
  );
}
