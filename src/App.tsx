import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { InstructorDashboard } from "./components/InstructorDashboard";
import { StudentInterface } from "./components/StudentInterface";
import { useState } from "react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"instructor" | "student">("instructor");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-primary">Student Project Automation</h2>
          <div className="flex items-center gap-4">
            <Authenticated>
              <nav className="flex gap-2">
                <button
                  onClick={() => setActiveTab("instructor")}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    activeTab === "instructor"
                      ? "bg-primary text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Instructor
                </button>
                <button
                  onClick={() => setActiveTab("student")}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    activeTab === "student"
                      ? "bg-primary text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Student
                </button>
              </nav>
            </Authenticated>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Content activeTab={activeTab} />
      </main>
      <Toaster />
    </div>
  );
}

function Content({ activeTab }: { activeTab: "instructor" | "student" }) {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <Unauthenticated>
        <div className="max-w-md mx-auto mt-20">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-4">
              Student Project Automation
            </h1>
            <p className="text-gray-600">
              Automated building, deploying, and evaluating of student projects
            </p>
          </div>
          <SignInForm />
        </div>
      </Unauthenticated>

      <Authenticated>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Welcome back, {loggedInUser?.email ?? "friend"}!
          </h1>
          <p className="text-gray-600">
            {activeTab === "instructor" 
              ? "Manage tasks, evaluate submissions, and track student progress"
              : "View API endpoints and test project submissions"
            }
          </p>
        </div>

        {activeTab === "instructor" ? <InstructorDashboard /> : <StudentInterface />}
      </Authenticated>
    </div>
  );
}
