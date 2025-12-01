import { registerModuleDocs } from "./index";

registerModuleDocs({
  moduleKey: "lms",
  moduleName: "Learning Management System",
  description: "Staff training and certification platform",
  lastUpdated: "2024-12-01",
  sections: [
    {
      id: "overview",
      title: "Overview",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            The Learning Management System (LMS) provides a mobile-first microlearning experience 
            for staff training and certification. It features swipeable lesson cards, progress tracking, 
            quizzes, and certification management.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Learner Experience</h4>
              <p className="text-sm text-muted-foreground">
                Staff access courses, complete lessons, take quizzes, and earn certifications 
                through an intuitive mobile-friendly interface.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Admin Dashboard</h4>
              <p className="text-sm text-muted-foreground">
                Manage courses, lessons, quizzes, track learner progress, and issue certifications.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "course-management",
      title: "Course Management",
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Creating Courses</h5>
              <p className="text-sm text-muted-foreground">
                Courses are containers for related lessons. Set a title, description, category, 
                difficulty level, and estimated duration.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Adding Lessons</h5>
              <p className="text-sm text-muted-foreground">
                Each course contains lessons with rich content. Lessons can include text, images, 
                videos, and interactive elements. Order lessons for a logical learning progression.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Quiz Configuration</h5>
              <p className="text-sm text-muted-foreground">
                Add quizzes to lessons or courses to assess understanding. Set passing scores, 
                question randomization, and retry limits.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "learner-progress",
      title: "Tracking Progress",
      content: (
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-3">Progress Tracking Features</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• <strong>Lesson Completion</strong> - Track which lessons each learner has completed</li>
              <li>• <strong>Quiz Scores</strong> - View quiz attempts and scores</li>
              <li>• <strong>Course Progress</strong> - Percentage completion per course</li>
              <li>• <strong>Time Spent</strong> - Track engagement time in courses</li>
              <li>• <strong>Certification Status</strong> - Monitor who has earned certifications</li>
            </ul>
          </div>
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
            <h4 className="font-medium mb-2">Admin Reports</h4>
            <p className="text-sm text-muted-foreground">
              Access reports showing team progress, completion rates, quiz performance, 
              and certification status. Export data for external analysis.
            </p>
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
            Issue certifications to learners who complete required courses and pass assessments.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Certification Requirements</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Complete all required lessons</li>
                <li>• Pass final quiz with minimum score</li>
                <li>• Optional: Time-based expiration</li>
                <li>• Optional: Recertification requirements</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Certification Management</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• View all issued certifications</li>
                <li>• Track expiration dates</li>
                <li>• Send renewal reminders</li>
                <li>• Revoke certifications if needed</li>
              </ul>
            </div>
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
            The LMS is designed mobile-first with a microlearning approach inspired by modern learning apps.
          </p>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-3">Mobile Features</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• <strong>Swipeable Lesson Cards</strong> - Navigate through lessons with swipe gestures</li>
              <li>• <strong>Bite-sized Content</strong> - Lessons designed for quick consumption</li>
              <li>• <strong>Offline Access</strong> - Download courses for offline learning</li>
              <li>• <strong>Push Notifications</strong> - Reminders for incomplete courses</li>
              <li>• <strong>Progress Sync</strong> - Seamless sync across devices</li>
            </ul>
          </div>
        </div>
      ),
    },
  ],
});
