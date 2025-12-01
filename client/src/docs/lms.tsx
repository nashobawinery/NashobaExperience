import { registerModuleDocs } from "./index";

registerModuleDocs({
  moduleKey: "lms",
  moduleName: "Learning Management System",
  description: "Staff training, certification, and microlearning platform",
  lastUpdated: "2024-12-01",
  sections: [
    {
      id: "overview",
      title: "Overview",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            The Learning Management System (LMS) provides a mobile-first microlearning experience 
            for staff training and certification. Inspired by modern learning apps, it features 
            swipeable lesson cards, progress tracking, interactive quizzes, and certification management.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Learner Experience</h4>
              <p className="text-sm text-muted-foreground">
                Staff access courses through an intuitive mobile-friendly interface, complete lessons, 
                take quizzes, and earn certifications—all designed for quick, on-the-go learning.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Admin Dashboard</h4>
              <p className="text-sm text-muted-foreground">
                Create and manage courses, lessons, and quizzes. Track learner progress, 
                view completion rates, and issue certifications.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "courses",
      title: "Course Structure",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Courses are containers for related lessons and quizzes, organized by category and difficulty:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Course Properties</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Title & Description</strong>: Course name and overview</li>
                <li>• <strong>Category</strong>: Group related courses together</li>
                <li>• <strong>Difficulty</strong>: Beginner, Intermediate, or Advanced</li>
                <li>• <strong>Duration</strong>: Estimated completion time in minutes</li>
                <li>• <strong>Passing Score</strong>: Minimum quiz score to pass (default 80%)</li>
                <li>• <strong>Certificate</strong>: Enable/disable certificate on completion</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Course Statuses</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Draft</strong>: Course being developed, not visible to learners</li>
                <li>• <strong>Published</strong>: Active and available for enrollment</li>
                <li>• <strong>Archived</strong>: No longer active, hidden from catalog</li>
              </ul>
            </div>
          </div>
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
            <h4 className="font-medium mb-2">Prerequisites</h4>
            <p className="text-sm text-muted-foreground">
              Courses can require other courses as prerequisites. Learners must complete prerequisite 
              courses before accessing advanced content.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "lessons",
      title: "Lesson Types",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Each course contains lessons of various types, designed for different learning modalities:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Text Lessons</h4>
              <p className="text-sm text-muted-foreground">
                Rich text content with markdown/HTML support. Include headers, lists, bold/italic text, 
                and embedded images for comprehensive written content.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Video Lessons</h4>
              <p className="text-sm text-muted-foreground">
                Embedded video content from hosted URLs. Track video progress to ensure learners 
                watch the complete content before marking complete.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Document Lessons</h4>
              <p className="text-sm text-muted-foreground">
                PDF or document downloads for reference materials, SOPs, or detailed guides that 
                learners can save for offline access.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Interactive Lessons</h4>
              <p className="text-sm text-muted-foreground">
                Custom interactive content with embedded activities, simulations, or 
                external learning tools.
              </p>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Lesson Ordering</h4>
            <p className="text-sm text-muted-foreground">
              Lessons within a course are ordered for logical progression. Learners complete 
              lessons in sequence to build knowledge progressively.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "quizzes",
      title: "Quizzes & Assessments",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Quizzes assess learner understanding and determine course completion:
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Multiple Choice</h4>
              <p className="text-sm text-muted-foreground">
                Single correct answer from multiple options. Best for testing factual knowledge.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">True/False</h4>
              <p className="text-sm text-muted-foreground">
                Simple binary choice questions. Good for quick knowledge checks.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Multi-Select</h4>
              <p className="text-sm text-muted-foreground">
                Multiple correct answers from options. Tests comprehensive understanding.
              </p>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-3">Quiz Features</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• <strong>Point Values</strong>: Assign different weights to questions</li>
              <li>• <strong>Explanations</strong>: Show correct answer explanations after submission</li>
              <li>• <strong>Passing Score</strong>: Configurable minimum score to pass (default 80%)</li>
              <li>• <strong>Lesson-Attached</strong>: Quizzes can be attached to specific lessons or course-wide</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "enrollments",
      title: "Enrollments & Assignments",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Learners can self-enroll or be assigned to courses by managers:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Enrollment Statuses</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Enrolled</strong>: Registered but not started</li>
                <li>• <strong>In Progress</strong>: Actively working on course</li>
                <li>• <strong>Completed</strong>: All lessons and quizzes passed</li>
                <li>• <strong>Expired</strong>: Due date passed without completion</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Assignment Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Assign by manager with due dates</li>
                <li>• Role-based required courses</li>
                <li>• Track who assigned the course</li>
                <li>• Bulk assignment support</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "progress",
      title: "Progress Tracking",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Comprehensive tracking of learner progress at multiple levels:
          </p>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-3">What's Tracked</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• <strong>Lesson Completion</strong>: Which lessons have been completed</li>
              <li>• <strong>Time Spent</strong>: Total time in each lesson and course</li>
              <li>• <strong>Video Progress</strong>: Percentage watched for video lessons</li>
              <li>• <strong>Quiz Attempts</strong>: All quiz attempts with scores</li>
              <li>• <strong>Course Progress</strong>: Percentage completion per enrollment</li>
              <li>• <strong>Certification Status</strong>: Earned certificates with dates</li>
            </ul>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
              <h4 className="font-medium mb-2">Admin Reports</h4>
              <p className="text-sm text-muted-foreground">
                Access dashboard showing team progress, completion rates, quiz performance, 
                and certification status. Export data for external analysis.
              </p>
            </div>
            <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
              <h4 className="font-medium mb-2">Learner Dashboard</h4>
              <p className="text-sm text-muted-foreground">
                Learners see their enrolled courses, progress indicators, upcoming due dates, 
                and earned certifications.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "certifications",
      title: "Certifications",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Issue certifications to learners who complete courses and pass assessments:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Certificate Requirements</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Complete all required lessons</li>
                <li>• Pass final quiz with minimum score</li>
                <li>• Meet any prerequisite requirements</li>
                <li>• Optional: Time-based expiration</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Certificate Management</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Unique certificate numbers</li>
                <li>• View all issued certifications</li>
                <li>• Track expiration dates</li>
                <li>• PDF certificate generation</li>
                <li>• Revoke certificates if needed</li>
              </ul>
            </div>
          </div>
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
            <h4 className="font-medium mb-2">Recertification</h4>
            <p className="text-sm text-muted-foreground">
              Courses with expiration dates require recertification. Learners are notified 
              before expiration to retake the course and maintain their certification.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "mobile-experience",
      title: "Mobile Experience",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The LMS is designed mobile-first with a microlearning approach inspired by modern learning apps:
          </p>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-3">Mobile Features</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• <strong>Swipeable Lesson Cards</strong>: Navigate through lessons with intuitive swipe gestures</li>
              <li>• <strong>Bite-sized Content</strong>: Lessons designed for 5-15 minute consumption</li>
              <li>• <strong>Touch-Friendly UI</strong>: Large buttons, readable text, accessible navigation</li>
              <li>• <strong>Progress Sync</strong>: Seamless progress tracking across devices</li>
              <li>• <strong>Responsive Design</strong>: Works on phones, tablets, and desktops</li>
            </ul>
          </div>
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
            <h4 className="font-medium mb-2">Microlearning Philosophy</h4>
            <p className="text-sm text-muted-foreground">
              Content is structured for short, focused learning sessions. Staff can complete a lesson 
              during a break, making training accessible without long time commitments.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "admin-tabs",
      title: "Admin Dashboard Tabs",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            The LMS Admin Dashboard provides tools for complete learning management:
          </p>
          <div className="space-y-3">
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Overview Tab</h5>
              <p className="text-sm text-muted-foreground">
                Dashboard with key metrics: published courses, total enrollments, completion rates, 
                certificates issued, and recent activity.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Categories Tab</h5>
              <p className="text-sm text-muted-foreground">
                Create and manage course categories with names, descriptions, icons, and colors. 
                Organize courses for easy discovery.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Courses Tab</h5>
              <p className="text-sm text-muted-foreground">
                Create, edit, and manage courses. Add lessons and quizzes, set difficulty levels, 
                configure passing scores, and publish courses.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Enrollments Tab</h5>
              <p className="text-sm text-muted-foreground">
                View all enrollments, assign courses to learners, track progress, and manage 
                due dates across the organization.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Certificates Tab</h5>
              <p className="text-sm text-muted-foreground">
                View issued certificates, track expirations, revoke if needed, and generate 
                certificate reports.
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ],
});
