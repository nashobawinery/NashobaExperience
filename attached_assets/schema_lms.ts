// LMS Schema extracted from main schema.ts
// Training LMS (Learning Management System)
// ========================================

// Course catalog - Training courses available at the facility
export const staffCourses = pgTable("staff_courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id").references(() => facilities.id).notNull(),
  
  // Course details
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // clinical, safety, compliance, orientation, skills
  
  // Course type and structure
  courseType: text("course_type").notNull().default("self_paced"), // self_paced, instructor_led, external
  duration: integer("duration"), // Duration in minutes
  passingScore: integer("passing_score"), // Required score to pass (0-100)
  
  // Regulatory requirements (EOEA 651 CMR 12)
  isRequired: boolean("is_required").notNull().default(false),
  requiredForRoles: text("required_for_roles").array(), // Array of role types that must complete
  renewalFrequencyDays: integer("renewal_frequency_days"), // Days until recertification required
  completionDays: integer("completion_days").default(30), // Days to complete course from assignment date
  regulatoryReference: text("regulatory_reference"), // e.g., "651 CMR 12.07(3)"
  
  // Content
  contentUrl: text("content_url"), // Link to external content or uploaded file
  contentType: text("content_type"), // video, document, scorm, external_link
  
  // Metadata
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdById: varchar("created_by_id").references(() => staff.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Course assignments - Track which staff are assigned to which courses
export const staffCourseAssignments = pgTable("staff_course_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").references(() => staff.id).notNull(),
  courseId: varchar("course_id").references(() => staffCourses.id).notNull(),
  
  // Assignment details
  assignedById: varchar("assigned_by_id").references(() => staff.id),
  assignedDate: timestamp("assigned_date").defaultNow().notNull(),
  dueDate: timestamp("due_date"),
  
  // Progress tracking
  status: text("status").notNull().default("assigned"), // assigned, in_progress, completed, expired, waived
  progress: integer("progress").notNull().default(0), // 0-100 percentage
  score: integer("score"), // Test/quiz score if applicable
  
  // Completion tracking
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  // Certification
  certificationNumber: text("certification_number"),
  certificationExpiresAt: timestamp("certification_expires_at"),
  
  // Notes
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Course progress logs - Track detailed progress within a course
export const courseProgressLogs = pgTable("course_progress_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").references(() => staffCourseAssignments.id).notNull(),
  
  // Progress details
  eventType: text("event_type").notNull(), // started, module_completed, quiz_attempted, completed
  eventData: jsonb("event_data"), // Additional data like module name, quiz answers, etc.
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod schemas for Training LMS
export const insertStaffCourseSchema = createInsertSchema(staffCourses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStaffCourseAssignmentSchema = createInsertSchema(staffCourseAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCourseProgressLogSchema = createInsertSchema(courseProgressLogs).omit({
  id: true,
  createdAt: true,
});

// Type exports for Training LMS
export type StaffCourse = typeof staffCourses.$inferSelect;
export type InsertStaffCourse = z.infer<typeof insertStaffCourseSchema>;

export type StaffCourseAssignment = typeof staffCourseAssignments.$inferSelect;
export type InsertStaffCourseAssignment = z.infer<typeof insertStaffCourseAssignmentSchema>;

export type CourseProgressLog = typeof courseProgressLogs.$inferSelect;
export type InsertCourseProgressLog = z.infer<typeof insertCourseProgressLogSchema>;

// ========================================
// Full LMS System - Course Content & Delivery
// ========================================

// Course Lessons - ordered content units within a course
export const courseLessons = pgTable("course_lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").references(() => staffCourses.id, { onDelete: "cascade" }).notNull(),
  
  // Lesson details
  title: text("title").notNull(),
  description: text("description"),
  
  // Ordering
  sortOrder: integer("sort_order").notNull().default(0),
  
  // Lesson settings
  estimatedMinutes: integer("estimated_minutes"), // Estimated time to complete
  isMandatory: boolean("is_mandatory").notNull().default(true), // Must complete to finish course
  
  // Status
  isPublished: boolean("is_published").notNull().default(false),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Lesson Departments - which departments a lesson applies to (many-to-many)
// DEPRECATED: Use course_departments instead for course-level targeting
export const lessonDepartments = pgTable("lesson_departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id").references(() => courseLessons.id, { onDelete: "cascade" }).notNull(),
  department: text("department").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("lesson_dept_unique_idx").on(table.lessonId, table.department),
]);

export const insertLessonDepartmentSchema = createInsertSchema(lessonDepartments).omit({
  id: true,
  createdAt: true,
});
export type InsertLessonDepartment = z.infer<typeof insertLessonDepartmentSchema>;
export type LessonDepartment = typeof lessonDepartments.$inferSelect;

// Course Departments - which departments a course targets (many-to-many)
export const courseDepartments = pgTable("course_departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").references(() => staffCourses.id, { onDelete: "cascade" }).notNull(),
  department: text("department").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("course_dept_unique_idx").on(table.courseId, table.department),
]);

export const insertCourseDepartmentSchema = createInsertSchema(courseDepartments).omit({
  id: true,
  createdAt: true,
});
export type InsertCourseDepartment = z.infer<typeof insertCourseDepartmentSchema>;
export type CourseDepartment = typeof courseDepartments.$inferSelect;

// Lesson Pages - sub-sections within a lesson (e.g., 1.1, 1.2, 1.3)
export const lessonPages = pgTable("lesson_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id").references(() => courseLessons.id, { onDelete: "cascade" }).notNull(),
  
  // Page details
  title: text("title").notNull(),
  description: text("description"),
  
  // Page number within the lesson (1, 2, 3...)
  pageNumber: integer("page_number").notNull().default(1),
  
  // Ordering
  sortOrder: integer("sort_order").notNull().default(0),
  
  // Estimated time for this page
  estimatedMinutes: integer("estimated_minutes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Lesson Content Blocks - rich content within lessons or pages
export const lessonContentBlocks = pgTable("lesson_content_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id").references(() => courseLessons.id, { onDelete: "cascade" }).notNull(),
  
  // Optional page reference - if null, belongs directly to lesson (legacy/default behavior)
  pageId: varchar("page_id").references(() => lessonPages.id, { onDelete: "cascade" }),
  
  // Block type: text, video, image, file, embed, divider, text_image (combined layout)
  blockType: text("block_type").notNull(),
  
  // Content based on type
  content: text("content"), // For text blocks - HTML/rich text content
  videoUrl: text("video_url"), // For video blocks - YouTube/Vimeo embed URL
  imageUrl: text("image_url"), // For image blocks
  fileUrl: text("file_url"), // For file blocks - downloadable file
  fileName: text("file_name"), // Original filename for downloads
  embedCode: text("embed_code"), // For custom embed blocks
  
  // Layout options for multi-column/combined blocks
  // layout: "text_left_image_right", "image_left_text_right", "text_top_image_bottom", "image_top_text_bottom", "full_width"
  layout: text("layout").default("full_width"),
  
  // Image sizing: "small", "medium", "large", "full"
  imageSize: text("image_size").default("medium"),
  
  // Optional caption/description
  caption: text("caption"),
  
  // Ordering
  sortOrder: integer("sort_order").notNull().default(0),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Course Prerequisites - learning path dependencies
export const coursePrerequisites = pgTable("course_prerequisites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").references(() => staffCourses.id, { onDelete: "cascade" }).notNull(),
  prerequisiteCourseId: varchar("prerequisite_course_id").references(() => staffCourses.id, { onDelete: "cascade" }).notNull(),
  
  // Requirement type
  requirementType: text("requirement_type").notNull().default("completion"), // completion, passing_score
  minimumScore: integer("minimum_score"), // Required if requirementType is passing_score
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Question Banks - reusable question pools
export const questionBanks = pgTable("question_banks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id").references(() => facilities.id).notNull(),
  
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"), // Same categories as courses
  
  isActive: boolean("is_active").notNull().default(true),
  
  createdById: varchar("created_by_id").references(() => staff.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Questions - individual quiz questions
export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Can belong to a question bank and/or directly to a quiz
  questionBankId: varchar("question_bank_id").references(() => questionBanks.id, { onDelete: "set null" }),
  
  // Question content
  questionType: text("question_type").notNull(), // multiple_choice, true_false, multiple_select, short_answer, matching
  questionText: text("question_text").notNull(),
  questionExplanation: text("question_explanation"), // Explanation shown after answering
  
  // Answer options (JSON array for multiple choice/select/matching)
  // For multiple_choice: [{id, text, isCorrect}]
  // For multiple_select: [{id, text, isCorrect}] (multiple can be correct)
  // For true_false: [{id: "true", text: "True", isCorrect}, {id: "false", text: "False", isCorrect}]
  // For matching: [{id, leftText, rightText}]
  // For short_answer: null (correct answers stored in correctAnswers)
  answerOptions: jsonb("answer_options"),
  
  // Correct answers for short_answer questions (array of acceptable answers)
  correctAnswers: text("correct_answers").array(),
  
  // Scoring
  points: integer("points").notNull().default(1),
  
  // Difficulty for adaptive learning (optional)
  difficulty: text("difficulty"), // easy, medium, hard
  
  // Tags for organization
  tags: text("tags").array(),
  
  isActive: boolean("is_active").notNull().default(true),
  
  createdById: varchar("created_by_id").references(() => staff.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Quizzes - assessments attached to courses or lessons
export const quizzes = pgTable("quizzes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").references(() => staffCourses.id, { onDelete: "cascade" }).notNull(),
  lessonId: varchar("lesson_id").references(() => courseLessons.id, { onDelete: "cascade" }), // If set, this is a lesson-level quiz
  
  // Quiz details
  title: text("title").notNull(),
  description: text("description"),
  instructions: text("instructions"), // Instructions shown before starting
  
  // Quiz settings
  passingScore: integer("passing_score").notNull().default(70), // Percentage required to pass
  timeLimitMinutes: integer("time_limit_minutes"), // Time limit (null = unlimited)
  maxAttempts: integer("max_attempts"), // Maximum attempts allowed (null = unlimited)
  
  // Question selection
  shuffleQuestions: boolean("shuffle_questions").notNull().default(false),
  shuffleAnswers: boolean("shuffle_answers").notNull().default(false),
  questionsToShow: integer("questions_to_show"), // Number of questions to randomly select (null = all)
  
  // Feedback settings
  showCorrectAnswers: boolean("show_correct_answers").notNull().default(true), // Show correct answers after submission
  showExplanations: boolean("show_explanations").notNull().default(true), // Show question explanations
  showScoreImmediately: boolean("show_score_immediately").notNull().default(true),
  
  // Placement in course
  sortOrder: integer("sort_order").notNull().default(0),
  isFinalExam: boolean("is_final_exam").notNull().default(false), // Is this the final course exam?
  
  isPublished: boolean("is_published").notNull().default(false),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Quiz Questions - links questions to quizzes
export const quizQuestions = pgTable("quiz_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quizId: varchar("quiz_id").references(() => quizzes.id, { onDelete: "cascade" }).notNull(),
  questionId: varchar("question_id").references(() => questions.id, { onDelete: "cascade" }).notNull(),
  
  // Override points for this quiz (null = use question's default)
  pointsOverride: integer("points_override"),
  
  // Ordering
  sortOrder: integer("sort_order").notNull().default(0),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Quiz Attempts - staff attempts at quizzes
export const quizAttempts = pgTable("quiz_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quizId: varchar("quiz_id").references(() => quizzes.id, { onDelete: "cascade" }).notNull(),
  staffId: varchar("staff_id").references(() => staff.id).notNull(),
  assignmentId: varchar("assignment_id").references(() => staffCourseAssignments.id), // Link to course assignment
  
  // Attempt tracking
  attemptNumber: integer("attempt_number").notNull().default(1),
  
  // Status
  status: text("status").notNull().default("in_progress"), // in_progress, submitted, graded
  
  // Timing
  startedAt: timestamp("started_at").defaultNow().notNull(),
  submittedAt: timestamp("submitted_at"),
  timeSpentSeconds: integer("time_spent_seconds"),
  
  // Scoring
  totalPoints: integer("total_points"), // Total possible points
  earnedPoints: integer("earned_points"), // Points earned
  scorePercent: integer("score_percent"), // Percentage score
  passed: boolean("passed"), // Did they pass?
  
  // For manual grading
  needsManualGrading: boolean("needs_manual_grading").notNull().default(false),
  gradedById: varchar("graded_by_id").references(() => staff.id),
  gradedAt: timestamp("graded_at"),
  graderNotes: text("grader_notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Question Responses - individual answers in an attempt
export const questionResponses = pgTable("question_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  attemptId: varchar("attempt_id").references(() => quizAttempts.id, { onDelete: "cascade" }).notNull(),
  questionId: varchar("question_id").references(() => questions.id).notNull(),
  
  // The actual response
  // For multiple_choice: selected option id
  // For multiple_select: array of selected option ids (stored as JSON)
  // For true_false: "true" or "false"
  // For short_answer: text response
  // For matching: array of {leftId, rightId} pairs
  responseValue: text("response_value"),
  responseJson: jsonb("response_json"), // For complex responses
  
  // Scoring
  isCorrect: boolean("is_correct"),
  pointsEarned: integer("points_earned"),
  pointsPossible: integer("points_possible"),
  
  // For manual grading
  needsManualGrading: boolean("needs_manual_grading").notNull().default(false),
  manualScore: integer("manual_score"),
  graderFeedback: text("grader_feedback"),
  
  answeredAt: timestamp("answered_at").defaultNow().notNull(),
});

// Lesson Progress - tracks which lessons a staff member has completed
export const lessonProgress = pgTable("lesson_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").references(() => staffCourseAssignments.id, { onDelete: "cascade" }).notNull(),
  lessonId: varchar("lesson_id").references(() => courseLessons.id, { onDelete: "cascade" }).notNull(),
  staffId: varchar("staff_id").references(() => staff.id).notNull(),
  
  // Progress tracking
  status: text("status").notNull().default("not_started"), // not_started, in_progress, completed
  progressPercent: integer("progress_percent").notNull().default(0),
  
  // Time tracking
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
  
  // Last position (for resume)
  lastContentBlockId: varchar("last_content_block_id").references(() => lessonContentBlocks.id),
  
  // Lesson Quiz tracking
  quizPassed: boolean("quiz_passed").default(false), // Has the lesson quiz been passed?
  quizScore: integer("quiz_score"), // Best quiz score percentage
  quizAttempts: integer("quiz_attempts").default(0), // Number of quiz attempts
  lastQuizAttemptAt: timestamp("last_quiz_attempt_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// External Training Lesson Progress - tracks lesson progress for external (email-based) training
export const externalLessonProgress = pgTable("external_lesson_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalTokenId: varchar("external_token_id").references(() => externalTrainingTokens.id, { onDelete: "cascade" }).notNull(),
  lessonId: varchar("lesson_id").references(() => courseLessons.id, { onDelete: "cascade" }).notNull(),
  
  // Progress tracking
  status: text("status").notNull().default("not_started"), // not_started, in_progress, quiz_required, completed
  contentViewed: boolean("content_viewed").default(false), // Has all content been viewed?
  
  // Lesson Quiz tracking
  quizPassed: boolean("quiz_passed").default(false), // Has the lesson quiz been passed?
  quizScore: integer("quiz_score"), // Best quiz score percentage
  quizAttempts: integer("quiz_attempts").default(0), // Number of quiz attempts
  lastQuizAttemptAt: timestamp("last_quiz_attempt_at"),
  
  // Time tracking
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Certificates - completion certificates
export const certificates = pgTable("certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id").references(() => facilities.id).notNull(),
  
  // Certificate details
  certificateNumber: text("certificate_number").notNull().unique(), // Unique certificate ID
  
  // Links
  staffId: varchar("staff_id").references(() => staff.id).notNull(),
  courseId: varchar("course_id").references(() => staffCourses.id).notNull(),
  assignmentId: varchar("assignment_id").references(() => staffCourseAssignments.id),
  
  // Certificate content
  staffName: text("staff_name").notNull(), // Name at time of issue
  courseName: text("course_name").notNull(), // Course name at time of issue
  completionDate: timestamp("completion_date").notNull(),
  expirationDate: timestamp("expiration_date"), // For courses with renewal requirements
  
  // Score if applicable
  score: integer("score"),
  
  // Regulatory info
  regulatoryReference: text("regulatory_reference"),
  
  // PDF storage
  pdfUrl: text("pdf_url"),
  
  // Verification
  verificationCode: text("verification_code"), // For external verification
  
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  issuedById: varchar("issued_by_id").references(() => staff.id),
  
  // Revocation
  isRevoked: boolean("is_revoked").notNull().default(false),
  revokedAt: timestamp("revoked_at"),
  revokedReason: text("revoked_reason"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Badges - achievement definitions
export const badges = pgTable("badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id").references(() => facilities.id).notNull(),
  
  name: text("name").notNull(),
  description: text("description"),
  iconName: text("icon_name"), // Lucide icon name
  iconColor: text("icon_color"), // Color for the badge
  
  // Criteria for earning
  criteriaType: text("criteria_type").notNull(), // course_completion, courses_count, quiz_score, streak, custom
  criteriaValue: jsonb("criteria_value"), // Depends on type (courseId, count, score threshold, etc.)
  
  // Badge tier
  tier: text("tier").notNull().default("bronze"), // bronze, silver, gold, platinum
  
  isActive: boolean("is_active").notNull().default(true),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Staff Badges - earned badges
export const staffBadges = pgTable("staff_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").references(() => staff.id).notNull(),
  badgeId: varchar("badge_id").references(() => badges.id).notNull(),
  
  // Award details
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
  earnedReason: text("earned_reason"), // Specific reason (course name, achievement, etc.)
  
  // Link to triggering event
  courseId: varchar("course_id").references(() => staffCourses.id),
  assignmentId: varchar("assignment_id").references(() => staffCourseAssignments.id),
});

// Course Ratings - staff feedback on courses
export const courseRatings = pgTable("course_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").references(() => staffCourses.id, { onDelete: "cascade" }).notNull(),
  staffId: varchar("staff_id").references(() => staff.id).notNull(),
  assignmentId: varchar("assignment_id").references(() => staffCourseAssignments.id),
  
  // Rating
  rating: integer("rating").notNull(), // 1-5 stars
  review: text("review"), // Optional text review
  
  // Helpfulness (optional features)
  wouldRecommend: boolean("would_recommend"),
  difficultyRating: integer("difficulty_rating"), // 1-5 (1=too easy, 5=too hard)
  
  // Moderation
  isApproved: boolean("is_approved").notNull().default(true),
  moderatedById: varchar("moderated_by_id").references(() => staff.id),
  moderatedAt: timestamp("moderated_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod schemas for Full LMS
export const insertCourseLessonSchema = createInsertSchema(courseLessons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLessonContentBlockSchema = createInsertSchema(lessonContentBlocks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLessonPageSchema = createInsertSchema(lessonPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCoursePrerequisiteSchema = createInsertSchema(coursePrerequisites).omit({
  id: true,
  createdAt: true,
});

export const insertQuestionBankSchema = createInsertSchema(questionBanks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuizSchema = createInsertSchema(quizzes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuizQuestionSchema = createInsertSchema(quizQuestions).omit({
  id: true,
  createdAt: true,
});

export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuestionResponseSchema = createInsertSchema(questionResponses).omit({
  id: true,
});

export const insertLessonProgressSchema = createInsertSchema(lessonProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExternalLessonProgressSchema = createInsertSchema(externalLessonProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCertificateSchema = createInsertSchema(certificates).omit({
  id: true,
  createdAt: true,
});

export const insertBadgeSchema = createInsertSchema(badges).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStaffBadgeSchema = createInsertSchema(staffBadges).omit({
  id: true,
});

export const insertCourseRatingSchema = createInsertSchema(courseRatings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports for Full LMS
export type CourseLesson = typeof courseLessons.$inferSelect;
export type InsertCourseLesson = z.infer<typeof insertCourseLessonSchema>;

export type LessonContentBlock = typeof lessonContentBlocks.$inferSelect;
export type InsertLessonContentBlock = z.infer<typeof insertLessonContentBlockSchema>;

export type LessonPage = typeof lessonPages.$inferSelect;
export type InsertLessonPage = z.infer<typeof insertLessonPageSchema>;

export type CoursePrerequisite = typeof coursePrerequisites.$inferSelect;
export type InsertCoursePrerequisite = z.infer<typeof insertCoursePrerequisiteSchema>;

export type QuestionBank = typeof questionBanks.$inferSelect;
export type InsertQuestionBank = z.infer<typeof insertQuestionBankSchema>;

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;

export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type InsertQuizQuestion = z.infer<typeof insertQuizQuestionSchema>;

export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;

export type QuestionResponse = typeof questionResponses.$inferSelect;
export type InsertQuestionResponse = z.infer<typeof insertQuestionResponseSchema>;

export type LessonProgress = typeof lessonProgress.$inferSelect;
export type InsertLessonProgress = z.infer<typeof insertLessonProgressSchema>;

export type ExternalLessonProgress = typeof externalLessonProgress.$inferSelect;
export type InsertExternalLessonProgress = z.infer<typeof insertExternalLessonProgressSchema>;

export type Certificate = typeof certificates.$inferSelect;
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;

export type Badge = typeof badges.$inferSelect;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;

export type StaffBadge = typeof staffBadges.$inferSelect;
export type InsertStaffBadge = z.infer<typeof insertStaffBadgeSchema>;

export type CourseRating = typeof courseRatings.$inferSelect;
export type InsertCourseRating = z.infer<typeof insertCourseRatingSchema>;
