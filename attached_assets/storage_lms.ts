// LMS STORAGE INTERFACE EXPORT
  // Training LMS - Courses
  getStaffCourses(facilityId: string): Promise<StaffCourse[]>;
  getStaffCourse(id: string, facilityId: string): Promise<StaffCourse | undefined>;
  getCourse(id: string): Promise<StaffCourse | undefined>; // For external training access without facilityId
  createStaffCourse(course: InsertStaffCourse): Promise<StaffCourse>;
  updateStaffCourse(id: string, facilityId: string, course: Partial<InsertStaffCourse>): Promise<StaffCourse>;
  deleteStaffCourse(id: string, facilityId: string): Promise<void>;

  // Training LMS - Course Assignments
  getStaffCourseAssignments(facilityId: string): Promise<StaffCourseAssignment[]>;
  getStaffCourseAssignmentsByStaff(staffId: string): Promise<StaffCourseAssignment[]>;
  getStaffCourseAssignment(id: string): Promise<StaffCourseAssignment | undefined>;
  createStaffCourseAssignment(assignment: InsertStaffCourseAssignment): Promise<StaffCourseAssignment>;
  updateStaffCourseAssignment(id: string, assignment: Partial<InsertStaffCourseAssignment>): Promise<StaffCourseAssignment>;
  deleteStaffCourseAssignment(id: string): Promise<void>;

  // Training LMS - Progress Logs
  getCourseProgressLogs(assignmentId: string): Promise<CourseProgressLog[]>;
  createCourseProgressLog(log: InsertCourseProgressLog): Promise<CourseProgressLog>;

  // Full LMS - Course Lessons
  getCourseLessons(courseId: string): Promise<CourseLesson[]>;
  getCourseLesson(id: string): Promise<CourseLesson | undefined>;
  createCourseLesson(lesson: InsertCourseLesson): Promise<CourseLesson>;
  updateCourseLesson(id: string, lesson: Partial<InsertCourseLesson>): Promise<CourseLesson>;
  deleteCourseLesson(id: string): Promise<void>;

  // Full LMS - Lesson Content Blocks
  getLessonContentBlocks(lessonId: string): Promise<LessonContentBlock[]>;
  getPageContentBlocks(pageId: string): Promise<LessonContentBlock[]>;
  getLessonContentBlock(id: string): Promise<LessonContentBlock | undefined>;
  createLessonContentBlock(block: InsertLessonContentBlock): Promise<LessonContentBlock>;
  updateLessonContentBlock(id: string, block: Partial<InsertLessonContentBlock>): Promise<LessonContentBlock>;
  deleteLessonContentBlock(id: string): Promise<void>;

  // Full LMS - Lesson Pages
  getLessonPages(lessonId: string): Promise<LessonPage[]>;
  getLessonPage(id: string): Promise<LessonPage | undefined>;
  createLessonPage(page: InsertLessonPage): Promise<LessonPage>;
  updateLessonPage(id: string, page: Partial<InsertLessonPage>): Promise<LessonPage>;
  deleteLessonPage(id: string): Promise<void>;
  reorderLessonPages(lessonId: string, pageIds: string[]): Promise<void>;

  // Full LMS - Question Banks
  getQuestionBanks(facilityId: string): Promise<QuestionBank[]>;
  getQuestionBank(id: string): Promise<QuestionBank | undefined>;
  createQuestionBank(bank: InsertQuestionBank): Promise<QuestionBank>;
  updateQuestionBank(id: string, bank: Partial<InsertQuestionBank>): Promise<QuestionBank>;
  deleteQuestionBank(id: string): Promise<void>;

  // Full LMS - Questions
  getQuestions(questionBankId: string): Promise<Question[]>;
  getQuestion(id: string): Promise<Question | undefined>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  updateQuestion(id: string, question: Partial<InsertQuestion>): Promise<Question>;
  deleteQuestion(id: string): Promise<void>;

  // Full LMS - Quizzes
  getQuizzes(courseId: string): Promise<Quiz[]>;
  getQuiz(id: string): Promise<Quiz | undefined>;
  getQuizByLessonId(lessonId: string): Promise<Quiz | undefined>;
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  updateQuiz(id: string, quiz: Partial<InsertQuiz>): Promise<Quiz>;
  deleteQuiz(id: string): Promise<void>;

  // Full LMS - Quiz Questions
  getQuizQuestions(quizId: string): Promise<QuizQuestion[]>;
  createQuizQuestion(quizQuestion: InsertQuizQuestion): Promise<QuizQuestion>;
  deleteQuizQuestion(id: string): Promise<void>;
  reorderQuizQuestions(quizId: string, questionIds: string[]): Promise<void>;

  // Full LMS - Quiz Attempts
  getQuizAttempts(quizId: string): Promise<QuizAttempt[]>;
  getQuizAttemptsByStaff(staffId: string): Promise<QuizAttempt[]>;
  getQuizAttempt(id: string): Promise<QuizAttempt | undefined>;
  createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;
  updateQuizAttempt(id: string, attempt: Partial<InsertQuizAttempt>): Promise<QuizAttempt>;

  // Full LMS - Question Responses
  getQuestionResponses(attemptId: string): Promise<QuestionResponse[]>;
  createQuestionResponse(response: InsertQuestionResponse): Promise<QuestionResponse>;
  updateQuestionResponse(id: string, response: Partial<InsertQuestionResponse>): Promise<QuestionResponse>;

  // Full LMS - Lesson Progress
  getLessonProgress(assignmentId: string): Promise<LessonProgress[]>;
  getLessonProgressByStaff(staffId: string): Promise<LessonProgress[]>;
  upsertLessonProgress(progress: InsertLessonProgress): Promise<LessonProgress>;
  updateLessonProgressQuizResult(assignmentId: string, lessonId: string, passed: boolean, score: number): Promise<LessonProgress>;

  // Full LMS - External Lesson Progress (for email-based training)
  getExternalLessonProgress(externalTokenId: string): Promise<ExternalLessonProgress[]>;
  getExternalLessonProgressByLesson(externalTokenId: string, lessonId: string): Promise<ExternalLessonProgress | undefined>;
  upsertExternalLessonProgress(progress: InsertExternalLessonProgress): Promise<ExternalLessonProgress>;
  updateExternalLessonProgressQuizResult(externalTokenId: string, lessonId: string, passed: boolean, score: number): Promise<ExternalLessonProgress>;

  // Full LMS - Certificates
  getCertificates(facilityId: string): Promise<Certificate[]>;
  getCertificatesByStaff(staffId: string): Promise<Certificate[]>;
  getCertificate(id: string): Promise<Certificate | undefined>;
  getCertificateByNumber(certificateNumber: string): Promise<Certificate | undefined>;
  createCertificate(certificate: InsertCertificate): Promise<Certificate>;

  // Full LMS - Badges
  getBadges(facilityId: string): Promise<Badge[]>;
  getBadge(id: string): Promise<Badge | undefined>;
  createBadge(badge: InsertBadge): Promise<Badge>;
  updateBadge(id: string, badge: Partial<InsertBadge>): Promise<Badge>;
  deleteBadge(id: string): Promise<void>;

  // Full LMS - Staff Badges
  getStaffBadges(staffId: string): Promise<StaffBadge[]>;
  awardBadge(staffBadge: InsertStaffBadge): Promise<StaffBadge>;

  // Full LMS - Course Ratings
  getCourseRatings(courseId: string): Promise<CourseRating[]>;
  createCourseRating(rating: InsertCourseRating): Promise<CourseRating>;

  // Competency Modules
  getCompetencyModules(facilityId: string): Promise<CompetencyModule[]>;
  getCompetencyModule(id: string): Promise<CompetencyModule | undefined>;

// LMS STORAGE IMPLEMENTATION EXPORT
  // Training LMS - Courses
  // ========================================

  async getStaffCourses(facilityId: string): Promise<StaffCourse[]> {
    return db.select().from(schema.staffCourses)
      .where(and(eq(schema.staffCourses.facilityId, facilityId), eq(schema.staffCourses.isActive, true)))
      .orderBy(schema.staffCourses.category, schema.staffCourses.sortOrder);
  }

  async getStaffCourse(id: string, facilityId: string): Promise<StaffCourse | undefined> {
    const result = await db.select().from(schema.staffCourses)
      .where(and(eq(schema.staffCourses.id, id), eq(schema.staffCourses.facilityId, facilityId)));
    return result[0];
  }

  // Get course by ID without requiring facilityId (for external training access)
  async getCourse(id: string): Promise<StaffCourse | undefined> {
    const result = await db.select().from(schema.staffCourses)
      .where(eq(schema.staffCourses.id, id));
    return result[0];
  }

  async createStaffCourse(course: InsertStaffCourse): Promise<StaffCourse> {
    const result = await db.insert(schema.staffCourses).values(course).returning();
    return result[0];
  }

  async updateStaffCourse(id: string, facilityId: string, course: Partial<InsertStaffCourse>): Promise<StaffCourse> {
    const result = await db.update(schema.staffCourses)
      .set({ ...course, updatedAt: new Date() })
      .where(and(eq(schema.staffCourses.id, id), eq(schema.staffCourses.facilityId, facilityId)))
      .returning();
    return result[0];
  }

  async deleteStaffCourse(id: string, facilityId: string): Promise<void> {
    await db.update(schema.staffCourses)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.staffCourses.id, id), eq(schema.staffCourses.facilityId, facilityId)));
  }

  // ========================================
  // Training LMS - Course Assignments
  // ========================================

  async getStaffCourseAssignments(facilityId: string): Promise<StaffCourseAssignment[]> {
    // Join with staff to filter by facility
    const results = await db.select({
      assignment: schema.staffCourseAssignments,
    })
      .from(schema.staffCourseAssignments)
      .innerJoin(schema.staff, eq(schema.staffCourseAssignments.staffId, schema.staff.id))
      .where(eq(schema.staff.facilityId, facilityId))
      .orderBy(desc(schema.staffCourseAssignments.assignedDate));
    return results.map(r => r.assignment);
  }

  async getStaffCourseAssignmentsByStaff(staffId: string): Promise<StaffCourseAssignment[]> {
    return db.select().from(schema.staffCourseAssignments)
      .where(eq(schema.staffCourseAssignments.staffId, staffId))
      .orderBy(desc(schema.staffCourseAssignments.assignedDate));
  }

  async getStaffCourseAssignment(id: string): Promise<StaffCourseAssignment | undefined> {
    const result = await db.select().from(schema.staffCourseAssignments)
      .where(eq(schema.staffCourseAssignments.id, id));
    return result[0];
  }

  async createStaffCourseAssignment(assignment: InsertStaffCourseAssignment): Promise<StaffCourseAssignment> {
    const result = await db.insert(schema.staffCourseAssignments).values(assignment).returning();
    return result[0];
  }

  async updateStaffCourseAssignment(id: string, assignment: Partial<InsertStaffCourseAssignment>): Promise<StaffCourseAssignment> {
    const result = await db.update(schema.staffCourseAssignments)
      .set({ ...assignment, updatedAt: new Date() })
      .where(eq(schema.staffCourseAssignments.id, id))
      .returning();
    return result[0];
  }

  async deleteStaffCourseAssignment(id: string): Promise<void> {
    await db.delete(schema.staffCourseAssignments)
      .where(eq(schema.staffCourseAssignments.id, id));
  }

  // ========================================
  // Training LMS - Progress Logs
  // ========================================

  async getCourseProgressLogs(assignmentId: string): Promise<CourseProgressLog[]> {
    return db.select().from(schema.courseProgressLogs)
      .where(eq(schema.courseProgressLogs.assignmentId, assignmentId))
      .orderBy(desc(schema.courseProgressLogs.createdAt));
  }

  async createCourseProgressLog(log: InsertCourseProgressLog): Promise<CourseProgressLog> {
    const result = await db.insert(schema.courseProgressLogs).values(log).returning();
    return result[0];
  }

  // ========================================
  // Full LMS - Course Lessons
  // ========================================

  async getCourseLessons(courseId: string): Promise<CourseLesson[]> {
    return db.select().from(schema.courseLessons)
      .where(eq(schema.courseLessons.courseId, courseId))
      .orderBy(schema.courseLessons.sortOrder);
  }

  async getCourseLesson(id: string): Promise<CourseLesson | undefined> {
    const result = await db.select().from(schema.courseLessons)
      .where(eq(schema.courseLessons.id, id));
    return result[0];
  }

  async createCourseLesson(lesson: InsertCourseLesson): Promise<CourseLesson> {
    const result = await db.insert(schema.courseLessons).values(lesson).returning();
    return result[0];
  }

  async updateCourseLesson(id: string, lesson: Partial<InsertCourseLesson>): Promise<CourseLesson> {
    const result = await db.update(schema.courseLessons)
      .set({ ...lesson, updatedAt: new Date() })
      .where(eq(schema.courseLessons.id, id))
      .returning();
    return result[0];
  }

  async deleteCourseLesson(id: string): Promise<void> {
    await db.delete(schema.courseLessons)
      .where(eq(schema.courseLessons.id, id));
  }

  // ========================================
  // Full LMS - Lesson Content Blocks
  // ========================================

  async getLessonContentBlocks(lessonId: string): Promise<LessonContentBlock[]> {
    return db.select().from(schema.lessonContentBlocks)
      .where(eq(schema.lessonContentBlocks.lessonId, lessonId))
      .orderBy(schema.lessonContentBlocks.sortOrder);
  }

  async getLessonContentBlock(id: string): Promise<LessonContentBlock | undefined> {
    const result = await db.select().from(schema.lessonContentBlocks)
      .where(eq(schema.lessonContentBlocks.id, id));
    return result[0];
  }

  async createLessonContentBlock(block: InsertLessonContentBlock): Promise<LessonContentBlock> {
    const result = await db.insert(schema.lessonContentBlocks).values(block).returning();
    return result[0];
  }

  async updateLessonContentBlock(id: string, block: Partial<InsertLessonContentBlock>): Promise<LessonContentBlock> {
    const result = await db.update(schema.lessonContentBlocks)
      .set({ ...block, updatedAt: new Date() })
      .where(eq(schema.lessonContentBlocks.id, id))
      .returning();
    return result[0];
  }

  async deleteLessonContentBlock(id: string): Promise<void> {
    await db.delete(schema.lessonContentBlocks)
      .where(eq(schema.lessonContentBlocks.id, id));
  }

  async getPageContentBlocks(pageId: string): Promise<LessonContentBlock[]> {
    return db.select().from(schema.lessonContentBlocks)
      .where(eq(schema.lessonContentBlocks.pageId, pageId))
      .orderBy(schema.lessonContentBlocks.sortOrder);
  }

  // ========================================
  // Full LMS - Lesson Pages
  // ========================================

  async getLessonPages(lessonId: string): Promise<LessonPage[]> {
    return db.select().from(schema.lessonPages)
      .where(eq(schema.lessonPages.lessonId, lessonId))
      .orderBy(schema.lessonPages.sortOrder);
  }

  async getLessonPage(id: string): Promise<LessonPage | undefined> {
    const result = await db.select().from(schema.lessonPages)
      .where(eq(schema.lessonPages.id, id));
    return result[0];
  }

  async createLessonPage(page: InsertLessonPage): Promise<LessonPage> {
    const result = await db.insert(schema.lessonPages).values(page).returning();
    return result[0];
  }

  async updateLessonPage(id: string, page: Partial<InsertLessonPage>): Promise<LessonPage> {
    const result = await db.update(schema.lessonPages)
      .set({ ...page, updatedAt: new Date() })
      .where(eq(schema.lessonPages.id, id))
      .returning();
    return result[0];
  }

  async deleteLessonPage(id: string): Promise<void> {
    await db.delete(schema.lessonPages)
      .where(eq(schema.lessonPages.id, id));
  }

  async reorderLessonPages(lessonId: string, pageIds: string[]): Promise<void> {
    for (let i = 0; i < pageIds.length; i++) {
      await db.update(schema.lessonPages)
        .set({ sortOrder: i, pageNumber: i + 1, updatedAt: new Date() })
        .where(eq(schema.lessonPages.id, pageIds[i]));
    }
  }

  // ========================================
  // Full LMS - Question Banks
  // ========================================

  async getQuestionBanks(facilityId: string): Promise<QuestionBank[]> {
    return db.select().from(schema.questionBanks)
      .where(and(eq(schema.questionBanks.facilityId, facilityId), eq(schema.questionBanks.isActive, true)))
      .orderBy(schema.questionBanks.name);
  }

  async getQuestionBank(id: string): Promise<QuestionBank | undefined> {
    const result = await db.select().from(schema.questionBanks)
      .where(eq(schema.questionBanks.id, id));
    return result[0];
  }

  async createQuestionBank(bank: InsertQuestionBank): Promise<QuestionBank> {
    const result = await db.insert(schema.questionBanks).values(bank).returning();
    return result[0];
  }

  async updateQuestionBank(id: string, bank: Partial<InsertQuestionBank>): Promise<QuestionBank> {
    const result = await db.update(schema.questionBanks)
      .set({ ...bank, updatedAt: new Date() })
      .where(eq(schema.questionBanks.id, id))
      .returning();
    return result[0];
  }

  async deleteQuestionBank(id: string): Promise<void> {
    await db.update(schema.questionBanks)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.questionBanks.id, id));
  }

  // ========================================
  // Full LMS - Questions
  // ========================================

  async getQuestions(questionBankId: string): Promise<Question[]> {
    return db.select().from(schema.questions)
      .where(and(eq(schema.questions.questionBankId, questionBankId), eq(schema.questions.isActive, true)))
      .orderBy(schema.questions.createdAt);
  }

  async getQuestion(id: string): Promise<Question | undefined> {
    const result = await db.select().from(schema.questions)
      .where(eq(schema.questions.id, id));
    return result[0];
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    const result = await db.insert(schema.questions).values(question).returning();
    return result[0];
  }

  async updateQuestion(id: string, question: Partial<InsertQuestion>): Promise<Question> {
    const result = await db.update(schema.questions)
      .set({ ...question, updatedAt: new Date() })
      .where(eq(schema.questions.id, id))
      .returning();
    return result[0];
  }

  async deleteQuestion(id: string): Promise<void> {
    await db.update(schema.questions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.questions.id, id));
  }

  // ========================================
  // Full LMS - Quizzes
  // ========================================

  async getQuizzes(courseId: string): Promise<Quiz[]> {
    return db.select().from(schema.quizzes)
      .where(eq(schema.quizzes.courseId, courseId))
      .orderBy(schema.quizzes.sortOrder);
  }

  async getQuiz(id: string): Promise<Quiz | undefined> {
    const result = await db.select().from(schema.quizzes)
      .where(eq(schema.quizzes.id, id));
    return result[0];
  }

  async getQuizByLessonId(lessonId: string): Promise<Quiz | undefined> {
    const result = await db.select().from(schema.quizzes)
      .where(eq(schema.quizzes.lessonId, lessonId));
    return result[0];
  }

  async createQuiz(quiz: InsertQuiz): Promise<Quiz> {
    const result = await db.insert(schema.quizzes).values(quiz).returning();
    return result[0];
  }

  async updateQuiz(id: string, quiz: Partial<InsertQuiz>): Promise<Quiz> {
    const result = await db.update(schema.quizzes)
      .set({ ...quiz, updatedAt: new Date() })
      .where(eq(schema.quizzes.id, id))
      .returning();
    return result[0];
  }

  async deleteQuiz(id: string): Promise<void> {
    await db.delete(schema.quizzes)
      .where(eq(schema.quizzes.id, id));
  }

  // ========================================
  // Full LMS - Quiz Questions
  // ========================================

  async getQuizQuestions(quizId: string): Promise<QuizQuestion[]> {
    return db.select().from(schema.quizQuestions)
      .where(eq(schema.quizQuestions.quizId, quizId))
      .orderBy(schema.quizQuestions.sortOrder);
  }

  async createQuizQuestion(quizQuestion: InsertQuizQuestion): Promise<QuizQuestion> {
    const result = await db.insert(schema.quizQuestions).values(quizQuestion).returning();
    return result[0];
  }

  async deleteQuizQuestion(id: string): Promise<void> {
    await db.delete(schema.quizQuestions)
      .where(eq(schema.quizQuestions.id, id));
  }

  async reorderQuizQuestions(quizId: string, questionIds: string[]): Promise<void> {
    for (let i = 0; i < questionIds.length; i++) {
      await db.update(schema.quizQuestions)
        .set({ sortOrder: i })
        .where(and(eq(schema.quizQuestions.quizId, quizId), eq(schema.quizQuestions.id, questionIds[i])));
    }
  }

  // ========================================
  // Full LMS - Quiz Attempts
  // ========================================

  async getQuizAttempts(quizId: string): Promise<QuizAttempt[]> {
    return db.select().from(schema.quizAttempts)
      .where(eq(schema.quizAttempts.quizId, quizId))
      .orderBy(desc(schema.quizAttempts.startedAt));
  }

  async getQuizAttemptsByStaff(staffId: string): Promise<QuizAttempt[]> {
    return db.select().from(schema.quizAttempts)
      .where(eq(schema.quizAttempts.staffId, staffId))
      .orderBy(desc(schema.quizAttempts.startedAt));
  }

  async getQuizAttempt(id: string): Promise<QuizAttempt | undefined> {
    const result = await db.select().from(schema.quizAttempts)
      .where(eq(schema.quizAttempts.id, id));
    return result[0];
  }

  async createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt> {
    const result = await db.insert(schema.quizAttempts).values(attempt).returning();
    return result[0];
  }

  async updateQuizAttempt(id: string, attempt: Partial<InsertQuizAttempt>): Promise<QuizAttempt> {
    const result = await db.update(schema.quizAttempts)
      .set({ ...attempt, updatedAt: new Date() })
      .where(eq(schema.quizAttempts.id, id))
      .returning();
    return result[0];
  }

  // ========================================
  // Full LMS - Question Responses
  // ========================================

  async getQuestionResponses(attemptId: string): Promise<QuestionResponse[]> {
    return db.select().from(schema.questionResponses)
      .where(eq(schema.questionResponses.attemptId, attemptId));
  }

  async createQuestionResponse(response: InsertQuestionResponse): Promise<QuestionResponse> {
    const result = await db.insert(schema.questionResponses).values(response).returning();
    return result[0];
  }

  async updateQuestionResponse(id: string, response: Partial<InsertQuestionResponse>): Promise<QuestionResponse> {
    const result = await db.update(schema.questionResponses)
      .set(response)
      .where(eq(schema.questionResponses.id, id))
      .returning();
    return result[0];
  }

  // ========================================
  // Full LMS - Lesson Progress
  // ========================================

  async getLessonProgress(assignmentId: string): Promise<LessonProgress[]> {
    return db.select().from(schema.lessonProgress)
      .where(eq(schema.lessonProgress.assignmentId, assignmentId));
  }

  async getLessonProgressByStaff(staffId: string): Promise<LessonProgress[]> {
    return db.select().from(schema.lessonProgress)
      .where(eq(schema.lessonProgress.staffId, staffId));
  }

  async upsertLessonProgress(progress: InsertLessonProgress): Promise<LessonProgress> {
    const existing = await db.select().from(schema.lessonProgress)
      .where(and(
        eq(schema.lessonProgress.assignmentId, progress.assignmentId),
        eq(schema.lessonProgress.lessonId, progress.lessonId)
      ));
    
    if (existing.length > 0) {
      const result = await db.update(schema.lessonProgress)
        .set({ ...progress, updatedAt: new Date() })
        .where(eq(schema.lessonProgress.id, existing[0].id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(schema.lessonProgress).values(progress).returning();
      return result[0];
    }
  }

  async updateLessonProgressQuizResult(assignmentId: string, lessonId: string, passed: boolean, score: number): Promise<LessonProgress> {
    const existing = await db.select().from(schema.lessonProgress)
      .where(and(
        eq(schema.lessonProgress.assignmentId, assignmentId),
        eq(schema.lessonProgress.lessonId, lessonId)
      ));
    
    if (existing.length > 0) {
      const current = existing[0];
      const newAttempts = (current.quizAttempts || 0) + 1;
      const bestScore = Math.max(current.quizScore || 0, score);
      
      const result = await db.update(schema.lessonProgress)
        .set({
          quizPassed: passed || current.quizPassed, // Once passed, stay passed
          quizScore: bestScore,
          quizAttempts: newAttempts,
          lastQuizAttemptAt: new Date(),
          status: passed ? "completed" : current.status,
          completedAt: passed && !current.completedAt ? new Date() : current.completedAt,
          updatedAt: new Date()
        })
        .where(eq(schema.lessonProgress.id, current.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(schema.lessonProgress).values({
        assignmentId,
        lessonId,
        staffId: "", // Will be set by the caller
        quizPassed: passed,
        quizScore: score,
        quizAttempts: 1,
        lastQuizAttemptAt: new Date(),
        status: passed ? "completed" : "in_progress",
        completedAt: passed ? new Date() : undefined
      }).returning();
      return result[0];
    }
  }

  // ========================================
  // Full LMS - External Lesson Progress
  // ========================================

  async getExternalLessonProgress(externalTokenId: string): Promise<ExternalLessonProgress[]> {
    return db.select().from(schema.externalLessonProgress)
      .where(eq(schema.externalLessonProgress.externalTokenId, externalTokenId));
  }

  async getExternalLessonProgressByLesson(externalTokenId: string, lessonId: string): Promise<ExternalLessonProgress | undefined> {
    const result = await db.select().from(schema.externalLessonProgress)
      .where(and(
        eq(schema.externalLessonProgress.externalTokenId, externalTokenId),
        eq(schema.externalLessonProgress.lessonId, lessonId)
      ));
    return result[0];
  }

  async upsertExternalLessonProgress(progress: InsertExternalLessonProgress): Promise<ExternalLessonProgress> {
    const existing = await db.select().from(schema.externalLessonProgress)
      .where(and(
        eq(schema.externalLessonProgress.externalTokenId, progress.externalTokenId),
        eq(schema.externalLessonProgress.lessonId, progress.lessonId)
      ));
    
    if (existing.length > 0) {
      const result = await db.update(schema.externalLessonProgress)
        .set({ ...progress, updatedAt: new Date() })
        .where(eq(schema.externalLessonProgress.id, existing[0].id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(schema.externalLessonProgress).values(progress).returning();
      return result[0];
    }
  }

  async updateExternalLessonProgressQuizResult(externalTokenId: string, lessonId: string, passed: boolean, score: number): Promise<ExternalLessonProgress> {
    const existing = await db.select().from(schema.externalLessonProgress)
      .where(and(
        eq(schema.externalLessonProgress.externalTokenId, externalTokenId),
        eq(schema.externalLessonProgress.lessonId, lessonId)
      ));
    
    if (existing.length > 0) {
      const current = existing[0];
      const newAttempts = (current.quizAttempts || 0) + 1;
      const bestScore = Math.max(current.quizScore || 0, score);
      
      const result = await db.update(schema.externalLessonProgress)
        .set({
          quizPassed: passed || current.quizPassed, // Once passed, stay passed
          quizScore: bestScore,
          quizAttempts: newAttempts,
          lastQuizAttemptAt: new Date(),
          status: passed ? "completed" : (current.contentViewed ? "quiz_required" : current.status),
          completedAt: passed && !current.completedAt ? new Date() : current.completedAt,
          updatedAt: new Date()
        })
        .where(eq(schema.externalLessonProgress.id, current.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(schema.externalLessonProgress).values({
        externalTokenId,
        lessonId,
        quizPassed: passed,
        quizScore: score,
        quizAttempts: 1,
        lastQuizAttemptAt: new Date(),
        status: passed ? "completed" : "quiz_required",
        completedAt: passed ? new Date() : undefined
      }).returning();
      return result[0];
    }
  }

  // ========================================
  // Full LMS - Certificates
  // ========================================

  async getCertificates(facilityId: string): Promise<Certificate[]> {
    return db.select().from(schema.certificates)
      .where(and(eq(schema.certificates.facilityId, facilityId), eq(schema.certificates.isRevoked, false)))
      .orderBy(desc(schema.certificates.issuedAt));
  }

  async getCertificatesByStaff(staffId: string): Promise<Certificate[]> {
    return db.select().from(schema.certificates)
      .where(and(eq(schema.certificates.staffId, staffId), eq(schema.certificates.isRevoked, false)))
      .orderBy(desc(schema.certificates.issuedAt));
  }

  async getCertificate(id: string): Promise<Certificate | undefined> {
    const result = await db.select().from(schema.certificates)
      .where(eq(schema.certificates.id, id));
    return result[0];
  }

  async getCertificateByNumber(certificateNumber: string): Promise<Certificate | undefined> {
    const result = await db.select().from(schema.certificates)
      .where(eq(schema.certificates.certificateNumber, certificateNumber));
    return result[0];
  }

  async createCertificate(certificate: InsertCertificate): Promise<Certificate> {
    const result = await db.insert(schema.certificates).values(certificate).returning();
    return result[0];
  }

  // ========================================
  // Full LMS - Badges
  // ========================================

  async getBadges(facilityId: string): Promise<Badge[]> {
    return db.select().from(schema.badges)
      .where(and(eq(schema.badges.facilityId, facilityId), eq(schema.badges.isActive, true)))
      .orderBy(schema.badges.tier, schema.badges.name);
  }

  async getBadge(id: string): Promise<Badge | undefined> {
    const result = await db.select().from(schema.badges)
      .where(eq(schema.badges.id, id));
    return result[0];
  }

  async createBadge(badge: InsertBadge): Promise<Badge> {
    const result = await db.insert(schema.badges).values(badge).returning();
    return result[0];
  }

  async updateBadge(id: string, badge: Partial<InsertBadge>): Promise<Badge> {
    const result = await db.update(schema.badges)
      .set({ ...badge, updatedAt: new Date() })
      .where(eq(schema.badges.id, id))
      .returning();
    return result[0];
  }

  async deleteBadge(id: string): Promise<void> {
    await db.update(schema.badges)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.badges.id, id));
  }

  // ========================================
  // Full LMS - Staff Badges
  // ========================================

  async getStaffBadges(staffId: string): Promise<StaffBadge[]> {
    return db.select().from(schema.staffBadges)
      .where(eq(schema.staffBadges.staffId, staffId))
      .orderBy(desc(schema.staffBadges.earnedAt));
  }

  async awardBadge(staffBadge: InsertStaffBadge): Promise<StaffBadge> {
    const result = await db.insert(schema.staffBadges).values(staffBadge).returning();
    return result[0];
  }

  // ========================================
  // Full LMS - Course Ratings
  // ========================================

  async getCourseRatings(courseId: string): Promise<CourseRating[]> {
    return db.select().from(schema.courseRatings)
      .where(and(eq(schema.courseRatings.courseId, courseId), eq(schema.courseRatings.isApproved, true)))
      .orderBy(desc(schema.courseRatings.createdAt));
  }

  async createCourseRating(rating: InsertCourseRating): Promise<CourseRating> {
    const result = await db.insert(schema.courseRatings).values(rating).returning();
    return result[0];
  }

  // ========================================
  // Full LMS - Course Prerequisites
  // ========================================

  async getCoursePrerequisites(courseId: string): Promise<CoursePrerequisite[]> {
    return db.select().from(schema.coursePrerequisites)
      .where(eq(schema.coursePrerequisites.courseId, courseId));
  }

  async createCoursePrerequisite(prerequisite: InsertCoursePrerequisite): Promise<CoursePrerequisite> {
    const result = await db.insert(schema.coursePrerequisites).values(prerequisite).returning();
    return result[0];
  }

  async deleteCoursePrerequisite(id: string): Promise<void> {
    await db.delete(schema.coursePrerequisites)
