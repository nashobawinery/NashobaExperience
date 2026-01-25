// LMS ROUTES EXPORT
  // ===================== LMS - COURSE LESSONS =====================

  // Get all lessons for a course
  app.get("/api/courses/:courseId/lessons", async (req, res) => {
    try {
      const { courseId } = req.params;
      const lessons = await storage.getCourseLessons(courseId);
      res.json(lessons);
    } catch (error) {
      console.error("Failed to get course lessons:", error);
      res.status(500).json({ error: "Failed to get course lessons" });
    }
  });

  // Get a single lesson
  app.get("/api/lessons/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const lesson = await storage.getCourseLesson(id);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }
      res.json(lesson);
    } catch (error) {
      console.error("Failed to get lesson:", error);
      res.status(500).json({ error: "Failed to get lesson" });
    }
  });

  // Create a new lesson
  app.post("/api/courses/:courseId/lessons", async (req, res) => {
    try {
      const { courseId } = req.params;
      const lesson = await storage.createCourseLesson({
        ...req.body,
        courseId,
      });
      res.status(201).json(lesson);
    } catch (error) {
      console.error("Failed to create lesson:", error);
      res.status(500).json({ error: "Failed to create lesson" });
    }
  });

  // Update a lesson
  app.patch("/api/lessons/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const lesson = await storage.updateCourseLesson(id, req.body);
      res.json(lesson);
    } catch (error) {
      console.error("Failed to update lesson:", error);
      res.status(500).json({ error: "Failed to update lesson" });
    }
  });

  // Delete a lesson
  app.delete("/api/lessons/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCourseLesson(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete lesson:", error);
      res.status(500).json({ error: "Failed to delete lesson" });
    }
  });

  // ===================== LMS - LESSON CONTENT BLOCKS =====================

  // Get all content blocks for a lesson
  app.get("/api/lessons/:lessonId/content-blocks", async (req, res) => {
    try {
      const { lessonId } = req.params;
      const blocks = await storage.getLessonContentBlocks(lessonId);
      res.json(blocks);
    } catch (error) {
      console.error("Failed to get content blocks:", error);
      res.status(500).json({ error: "Failed to get content blocks" });
    }
  });

  // Helper to normalize imageUrl before saving content blocks
  const normalizeContentBlockImageUrl = (data: any) => {
    if (data.imageUrl && data.imageUrl.startsWith('https://storage.googleapis.com/')) {
      const objectStorageService = new ObjectStorageService();
      data.imageUrl = objectStorageService.normalizeObjectEntityPath(data.imageUrl);
    }
    return data;
  };

  // Create a content block
  app.post("/api/lessons/:lessonId/content-blocks", async (req, res) => {
    try {
      const { lessonId } = req.params;
      const normalizedData = normalizeContentBlockImageUrl(req.body);
      const block = await storage.createLessonContentBlock({
        ...normalizedData,
        lessonId,
      });
      res.status(201).json(block);
    } catch (error) {
      console.error("Failed to create content block:", error);
      res.status(500).json({ error: "Failed to create content block" });
    }
  });

  // Update a content block
  app.patch("/api/content-blocks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const normalizedData = normalizeContentBlockImageUrl(req.body);
      const block = await storage.updateLessonContentBlock(id, normalizedData);
      res.json(block);
    } catch (error) {
      console.error("Failed to update content block:", error);
      res.status(500).json({ error: "Failed to update content block" });
    }
  });

  // Delete a content block
  app.delete("/api/content-blocks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteLessonContentBlock(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete content block:", error);
      res.status(500).json({ error: "Failed to delete content block" });
    }
  });

  // ===================== LMS - LESSON PAGES =====================

  // Get all pages for a lesson
  app.get("/api/lessons/:lessonId/pages", async (req, res) => {
    try {
      const { lessonId } = req.params;
      const pages = await storage.getLessonPages(lessonId);
      res.json(pages);
    } catch (error) {
      console.error("Failed to get lesson pages:", error);
      res.status(500).json({ error: "Failed to get lesson pages" });
    }
  });

  // Get a single lesson page with its content blocks
  app.get("/api/lesson-pages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const page = await storage.getLessonPage(id);
      if (!page) {
        return res.status(404).json({ error: "Lesson page not found" });
      }
      const contentBlocks = await storage.getPageContentBlocks(id);
      res.json({ ...page, contentBlocks });
    } catch (error) {
      console.error("Failed to get lesson page:", error);
      res.status(500).json({ error: "Failed to get lesson page" });
    }
  });

  // Create a lesson page
  app.post("/api/lessons/:lessonId/pages", async (req, res) => {
    try {
      const { lessonId } = req.params;
      // Get existing pages to determine page number
      const existingPages = await storage.getLessonPages(lessonId);
      const nextPageNumber = existingPages.length + 1;
      const nextSortOrder = existingPages.length;
      
      const page = await storage.createLessonPage({
        ...req.body,
        lessonId,
        pageNumber: nextPageNumber,
        sortOrder: nextSortOrder,
      });
      res.status(201).json(page);
    } catch (error) {
      console.error("Failed to create lesson page:", error);
      res.status(500).json({ error: "Failed to create lesson page" });
    }
  });

  // Update a lesson page
  app.patch("/api/lesson-pages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const page = await storage.updateLessonPage(id, req.body);
      res.json(page);
    } catch (error) {
      console.error("Failed to update lesson page:", error);
      res.status(500).json({ error: "Failed to update lesson page" });
    }
  });

  // Delete a lesson page
  app.delete("/api/lesson-pages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const page = await storage.getLessonPage(id);
      if (!page) {
        return res.status(404).json({ error: "Lesson page not found" });
      }
      await storage.deleteLessonPage(id);
      // Reorder remaining pages
      const remainingPages = await storage.getLessonPages(page.lessonId);
      const pageIds = remainingPages.map(p => p.id);
      if (pageIds.length > 0) {
        await storage.reorderLessonPages(page.lessonId, pageIds);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete lesson page:", error);
      res.status(500).json({ error: "Failed to delete lesson page" });
    }
  });

  // Reorder lesson pages
  app.post("/api/lessons/:lessonId/pages/reorder", async (req, res) => {
    try {
      const { lessonId } = req.params;
      const { pageIds } = req.body;
      await storage.reorderLessonPages(lessonId, pageIds);
      const pages = await storage.getLessonPages(lessonId);
      res.json(pages);
    } catch (error) {
      console.error("Failed to reorder lesson pages:", error);
      res.status(500).json({ error: "Failed to reorder lesson pages" });
    }
  });

  // Get content blocks for a specific page
  app.get("/api/lesson-pages/:pageId/content-blocks", async (req, res) => {
    try {
      const { pageId } = req.params;
      const blocks = await storage.getPageContentBlocks(pageId);
      res.json(blocks);
    } catch (error) {
      console.error("Failed to get page content blocks:", error);
      res.status(500).json({ error: "Failed to get page content blocks" });
    }
  });

  // Create a content block for a specific page
  app.post("/api/lesson-pages/:pageId/content-blocks", async (req, res) => {
    try {
      const { pageId } = req.params;
      const page = await storage.getLessonPage(pageId);
      if (!page) {
        return res.status(404).json({ error: "Lesson page not found" });
      }
      const normalizedData = normalizeContentBlockImageUrl(req.body);
      const block = await storage.createLessonContentBlock({
        ...normalizedData,
        lessonId: page.lessonId,
        pageId,
      });
      res.status(201).json(block);
    } catch (error) {
      console.error("Failed to create page content block:", error);
      res.status(500).json({ error: "Failed to create page content block" });
    }
  });

  // ===================== LMS - QUESTION BANKS =====================

  // Get all question banks for a facility
  app.get("/api/question-banks", async (req, res) => {
    try {
      const facilityId = req.session?.facilityId || "f47ac10b-58cc-4372-a567-0e02b2c3d479";
      const banks = await storage.getQuestionBanks(facilityId);
      res.json(banks);
    } catch (error) {
      console.error("Failed to get question banks:", error);
      res.status(500).json({ error: "Failed to get question banks" });
    }
  });

  // Get a single question bank
  app.get("/api/question-banks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const bank = await storage.getQuestionBank(id);
      if (!bank) {
        return res.status(404).json({ error: "Question bank not found" });
      }
      res.json(bank);
    } catch (error) {
      console.error("Failed to get question bank:", error);
      res.status(500).json({ error: "Failed to get question bank" });
    }
  });

  // Create a question bank
  app.post("/api/question-banks", async (req, res) => {
    try {
      const facilityId = req.session?.facilityId || "f47ac10b-58cc-4372-a567-0e02b2c3d479";
      const staffId = req.session?.staffId;
      const bank = await storage.createQuestionBank({
        ...req.body,
        facilityId,
        createdById: staffId,
      });
      res.status(201).json(bank);
    } catch (error) {
      console.error("Failed to create question bank:", error);
      res.status(500).json({ error: "Failed to create question bank" });
    }
  });

  // Update a question bank
  app.patch("/api/question-banks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const bank = await storage.updateQuestionBank(id, req.body);
      res.json(bank);
    } catch (error) {
      console.error("Failed to update question bank:", error);
      res.status(500).json({ error: "Failed to update question bank" });
    }
  });

  // Delete a question bank
  app.delete("/api/question-banks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteQuestionBank(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete question bank:", error);
      res.status(500).json({ error: "Failed to delete question bank" });
    }
  });

  // ===================== LMS - QUESTIONS =====================

  // Get all questions for a question bank
  app.get("/api/question-banks/:bankId/questions", async (req, res) => {
    try {
      const { bankId } = req.params;
      const questions = await storage.getQuestions(bankId);
      res.json(questions);
    } catch (error) {
      console.error("Failed to get questions:", error);
      res.status(500).json({ error: "Failed to get questions" });
    }
  });

  // Get a single question
  app.get("/api/questions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const question = await storage.getQuestion(id);
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }
      res.json(question);
    } catch (error) {
      console.error("Failed to get question:", error);
      res.status(500).json({ error: "Failed to get question" });
    }
  });

  // Create a question
  app.post("/api/question-banks/:bankId/questions", async (req, res) => {
    try {
      const { bankId } = req.params;
      const staffId = req.session?.staffId;
      const question = await storage.createQuestion({
        ...req.body,
        questionBankId: bankId,
        createdById: staffId,
      });
      res.status(201).json(question);
    } catch (error) {
      console.error("Failed to create question:", error);
      res.status(500).json({ error: "Failed to create question" });
    }
  });

  // Update a question
  app.patch("/api/questions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const question = await storage.updateQuestion(id, req.body);
      res.json(question);
    } catch (error) {
      console.error("Failed to update question:", error);
      res.status(500).json({ error: "Failed to update question" });
    }
  });

  // Delete a question
  app.delete("/api/questions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteQuestion(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete question:", error);
      res.status(500).json({ error: "Failed to delete question" });
    }
  });

  // ===================== LMS - QUIZZES =====================

  // Get all quizzes for a course
  app.get("/api/courses/:courseId/quizzes", async (req, res) => {
    try {
      const { courseId } = req.params;
      const quizzes = await storage.getQuizzes(courseId);
      res.json(quizzes);
    } catch (error) {
      console.error("Failed to get quizzes:", error);
      res.status(500).json({ error: "Failed to get quizzes" });
    }
  });

  // Get a single quiz
  app.get("/api/quizzes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const quiz = await storage.getQuiz(id);
      if (!quiz) {
        return res.status(404).json({ error: "Quiz not found" });
      }
      res.json(quiz);
    } catch (error) {
      console.error("Failed to get quiz:", error);
      res.status(500).json({ error: "Failed to get quiz" });
    }
  });

  // Get quiz for a specific lesson
  app.get("/api/lessons/:lessonId/quiz", async (req, res) => {
    try {
      const { lessonId } = req.params;
      const quiz = await storage.getQuizByLessonId(lessonId);
      res.json(quiz || null);
    } catch (error) {
      console.error("Failed to get lesson quiz:", error);
      res.status(500).json({ error: "Failed to get lesson quiz" });
    }
  });

  // Create or update quiz for a lesson
  app.post("/api/lessons/:lessonId/quiz", async (req, res) => {
    try {
      const { lessonId } = req.params;
      const staffId = req.session?.staffId;
      
      // Check if a quiz already exists for this lesson
      const existingQuiz = await storage.getQuizByLessonId(lessonId);
      
      if (existingQuiz) {
        // Update existing quiz
        const quiz = await storage.updateQuiz(existingQuiz.id, {
          ...req.body,
          lessonId,
        });
        res.json(quiz);
      } else {
        // Create new quiz
        const quiz = await storage.createQuiz({
          ...req.body,
          lessonId,
          createdById: staffId,
        });
        res.status(201).json(quiz);
      }
    } catch (error) {
      console.error("Failed to save lesson quiz:", error);
      res.status(500).json({ error: "Failed to save lesson quiz" });
    }
  });

  // Create a quiz
  app.post("/api/courses/:courseId/quizzes", async (req, res) => {
    try {
      const { courseId } = req.params;
      const staffId = req.session?.staffId;
      const quiz = await storage.createQuiz({
        ...req.body,
        courseId,
        createdById: staffId,
      });
      res.status(201).json(quiz);
    } catch (error) {
      console.error("Failed to create quiz:", error);
      res.status(500).json({ error: "Failed to create quiz" });
    }
  });

  // Update a quiz
  app.patch("/api/quizzes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const quiz = await storage.updateQuiz(id, req.body);
      res.json(quiz);
    } catch (error) {
      console.error("Failed to update quiz:", error);
      res.status(500).json({ error: "Failed to update quiz" });
    }
  });

  // Link/unlink a quiz to a lesson
  app.patch("/api/lessons/:lessonId/link-quiz", async (req, res) => {
    try {
      const { lessonId } = req.params;
      const { quizId } = req.body; // Can be null/undefined/"none" to unlink, or a quiz ID to link
      
      // Get the lesson to find its courseId
      const lesson = await storage.getCourseLesson(lessonId);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }
      
      // Get all quizzes for this course
      const quizzes = await storage.getQuizzes(lesson.courseId);
      
      // If trying to link a quiz, validate it belongs to the same course
      if (quizId && quizId !== "none") {
        const targetQuiz = quizzes.find((q: any) => q.id === quizId);
        if (!targetQuiz) {
          return res.status(400).json({ error: "Quiz not found or does not belong to this course" });
        }
        
        // Short-circuit if this quiz is already linked to this lesson
        if (targetQuiz.lessonId === lessonId) {
          return res.json(targetQuiz);
        }
      }
      
      // Unlink ALL quizzes currently linked to this lesson (handles stale links)
      const linkedQuizzes = quizzes.filter((q: any) => q.lessonId === lessonId);
      for (const quiz of linkedQuizzes) {
        await storage.updateQuiz(quiz.id, { lessonId: null });
      }
      
      // If quizId is provided and not "none", link the new quiz
      if (quizId && quizId !== "none") {
        const quiz = await storage.updateQuiz(quizId, { lessonId });
        res.json(quiz);
      } else {
        // Just return success for unlink operation
        res.json({ success: true, message: "Quiz unlinked from lesson" });
      }
    } catch (error) {
      console.error("Failed to link quiz to lesson:", error);
      res.status(500).json({ error: "Failed to link quiz to lesson" });
    }
  });

  // Delete a quiz
  app.delete("/api/quizzes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteQuiz(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete quiz:", error);
      res.status(500).json({ error: "Failed to delete quiz" });
    }
  });

  // ===================== LMS - QUIZ QUESTIONS =====================

  // Get all questions for a quiz
  app.get("/api/quizzes/:quizId/questions", async (req, res) => {
    try {
      const { quizId } = req.params;
      const questions = await storage.getQuizQuestions(quizId);
      res.json(questions);
    } catch (error) {
      console.error("Failed to get quiz questions:", error);
      res.status(500).json({ error: "Failed to get quiz questions" });
    }
  });

  // Add a question to a quiz
  app.post("/api/quizzes/:quizId/questions", async (req, res) => {
    try {
      const { quizId } = req.params;
      const quizQuestion = await storage.createQuizQuestion({
        ...req.body,
        quizId,
      });
      res.status(201).json(quizQuestion);
    } catch (error) {
      console.error("Failed to add question to quiz:", error);
      res.status(500).json({ error: "Failed to add question to quiz" });
    }
  });

  // Remove a question from a quiz
  app.delete("/api/quiz-questions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteQuizQuestion(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to remove question from quiz:", error);
      res.status(500).json({ error: "Failed to remove question from quiz" });
    }
  });

  // ===================== LMS - QUIZ ATTEMPTS =====================

  // Get all attempts for a quiz
  app.get("/api/quizzes/:quizId/attempts", async (req, res) => {
    try {
      const { quizId } = req.params;
      const attempts = await storage.getQuizAttempts(quizId);
      res.json(attempts);
    } catch (error) {
      console.error("Failed to get quiz attempts:", error);
      res.status(500).json({ error: "Failed to get quiz attempts" });
    }
  });

  // Get attempts by staff member
  app.get("/api/staff/:staffId/quiz-attempts", async (req, res) => {
    try {
      const { staffId } = req.params;
      const attempts = await storage.getQuizAttemptsByStaff(staffId);
      res.json(attempts);
    } catch (error) {
      console.error("Failed to get staff quiz attempts:", error);
      res.status(500).json({ error: "Failed to get staff quiz attempts" });
    }
  });

  // Create a quiz attempt (start taking a quiz)
  app.post("/api/quizzes/:quizId/attempts", async (req, res) => {
    try {
      const { quizId } = req.params;
      const staffId = req.session?.staffId;
      if (!staffId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const attempt = await storage.createQuizAttempt({
        quizId,
        staffId,
        status: "in_progress",
        startedAt: new Date(),
      });
      res.status(201).json(attempt);
    } catch (error) {
      console.error("Failed to create quiz attempt:", error);
      res.status(500).json({ error: "Failed to create quiz attempt" });
    }
  });

  // Update a quiz attempt (submit answers, complete quiz)
  app.patch("/api/quiz-attempts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const attempt = await storage.updateQuizAttempt(id, req.body);
      res.json(attempt);
    } catch (error) {
      console.error("Failed to update quiz attempt:", error);
      res.status(500).json({ error: "Failed to update quiz attempt" });
    }
  });

  // ===================== LMS - QUESTION RESPONSES =====================

  // Get all responses for an attempt
  app.get("/api/quiz-attempts/:attemptId/responses", async (req, res) => {
    try {
      const { attemptId } = req.params;
      const responses = await storage.getQuestionResponses(attemptId);
      res.json(responses);
    } catch (error) {
      console.error("Failed to get question responses:", error);
      res.status(500).json({ error: "Failed to get question responses" });
    }
  });

  // Submit a question response
  app.post("/api/quiz-attempts/:attemptId/responses", async (req, res) => {
    try {
      const { attemptId } = req.params;
      const response = await storage.createQuestionResponse({
        ...req.body,
        attemptId,
      });
      res.status(201).json(response);
    } catch (error) {
      console.error("Failed to submit question response:", error);
      res.status(500).json({ error: "Failed to submit question response" });
    }
  });

  // Update a question response (for grading)
  app.patch("/api/question-responses/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const response = await storage.updateQuestionResponse(id, req.body);
      res.json(response);
    } catch (error) {
      console.error("Failed to update question response:", error);
      res.status(500).json({ error: "Failed to update question response" });
    }
  });

  // ===================== LMS - LESSON PROGRESS =====================

  // Get lesson progress for a staff member
  app.get("/api/staff/:staffId/lesson-progress", async (req, res) => {
    try {
      const { staffId } = req.params;
      const progress = await storage.getLessonProgressByStaff(staffId);
      res.json(progress);
    } catch (error) {
      console.error("Failed to get lesson progress:", error);
      res.status(500).json({ error: "Failed to get lesson progress" });
    }
  });

  // Update or create lesson progress
  app.post("/api/lessons/:lessonId/progress", async (req, res) => {
    try {
      const { lessonId } = req.params;
      const staffId = req.session?.staffId;
      if (!staffId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const progress = await storage.upsertLessonProgress({
        lessonId,
        staffId,
        assignmentId: req.body.assignmentId,
        ...req.body,
      });
      res.json(progress);
    } catch (error) {
      console.error("Failed to update lesson progress:", error);
      res.status(500).json({ error: "Failed to update lesson progress" });
    }
  });

  // ===================== LMS - CERTIFICATES =====================

  // Get all certificates for a facility
  app.get("/api/certificates", async (req, res) => {
    try {
      const facilityId = req.session?.facilityId || "f47ac10b-58cc-4372-a567-0e02b2c3d479";
      const certificates = await storage.getCertificates(facilityId);
      res.json(certificates);
    } catch (error) {
      console.error("Failed to get certificates:", error);
      res.status(500).json({ error: "Failed to get certificates" });
    }
  });

  // Get certificates for a staff member (must be authenticated and own staffId or admin)
  app.get("/api/staff/:staffId/certificates", async (req, res) => {
    try {
      const { staffId } = req.params;
      const sessionStaffId = req.session?.staffId;
      
      if (!sessionStaffId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // For security, only allow access to own certificates or if admin
      if (sessionStaffId !== staffId) {
        const staff = await storage.getStaff(sessionStaffId);
        if (!staff || !["administrator", "super_administrator"].includes(staff.role)) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      
      const certificates = await storage.getCertificatesByStaff(staffId);
      res.json(certificates);
    } catch (error) {
      console.error("Failed to get staff certificates:", error);
      res.status(500).json({ error: "Failed to get staff certificates" });
    }
  });

  // Create a certificate
  app.post("/api/certificates", async (req, res) => {
    try {
      const facilityId = req.session?.facilityId || "f47ac10b-58cc-4372-a567-0e02b2c3d479";
      const certificate = await storage.createCertificate({
        ...req.body,
        facilityId,
      });
      res.status(201).json(certificate);
    } catch (error) {
      console.error("Failed to create certificate:", error);
      res.status(500).json({ error: "Failed to create certificate" });
    }
  });

  // ===================== LMS - BADGES =====================

  // Get all badges for a facility
  app.get("/api/badges", async (req, res) => {
    try {
      const facilityId = req.session?.facilityId || "f47ac10b-58cc-4372-a567-0e02b2c3d479";
      const badges = await storage.getBadges(facilityId);
      res.json(badges);
    } catch (error) {
      console.error("Failed to get badges:", error);
      res.status(500).json({ error: "Failed to get badges" });
    }
  });

  // Create a badge
  app.post("/api/badges", async (req, res) => {
    try {
      const facilityId = req.session?.facilityId || "f47ac10b-58cc-4372-a567-0e02b2c3d479";
      const badge = await storage.createBadge({
        ...req.body,
        facilityId,
      });
      res.status(201).json(badge);
    } catch (error) {
      console.error("Failed to create badge:", error);
      res.status(500).json({ error: "Failed to create badge" });
    }
  });

  // Get badges earned by a staff member (must be authenticated and own staffId or admin)
  app.get("/api/staff/:staffId/badges", async (req, res) => {
    try {
      const { staffId } = req.params;
      const sessionStaffId = req.session?.staffId;
      
      if (!sessionStaffId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // For security, only allow access to own badges or if admin
      if (sessionStaffId !== staffId) {
        const staff = await storage.getStaff(sessionStaffId);
        if (!staff || !["administrator", "super_administrator"].includes(staff.role)) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      
      const badges = await storage.getStaffBadges(staffId);
      res.json(badges);
    } catch (error) {
      console.error("Failed to get staff badges:", error);
      res.status(500).json({ error: "Failed to get staff badges" });
    }
  });

  // Award a badge to a staff member
  app.post("/api/staff/:staffId/badges", async (req, res) => {
    try {
      const { staffId } = req.params;
      const staffBadge = await storage.awardBadge({
        ...req.body,
        staffId,
      });
      res.status(201).json(staffBadge);
    } catch (error) {
      console.error("Failed to award badge:", error);
      res.status(500).json({ error: "Failed to award badge" });
    }
  });

  // ===================== LMS - COURSE RATINGS =====================

  // Get ratings for a course
  app.get("/api/courses/:courseId/ratings", async (req, res) => {
    try {
      const { courseId } = req.params;
      const ratings = await storage.getCourseRatings(courseId);
      res.json(ratings);
    } catch (error) {
      console.error("Failed to get course ratings:", error);
      res.status(500).json({ error: "Failed to get course ratings" });
    }
  });

  // Submit a course rating
  app.post("/api/courses/:courseId/ratings", async (req, res) => {
    try {
      const { courseId } = req.params;
      const staffId = req.session?.staffId;
      if (!staffId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const rating = await storage.createCourseRating({
        ...req.body,
        courseId,
        staffId,
      });
      res.status(201).json(rating);
    } catch (error) {
      console.error("Failed to submit course rating:", error);
      res.status(500).json({ error: "Failed to submit course rating" });
    }
  });

  // ===================== LMS - COURSE PREREQUISITES =====================

  // Get prerequisites for a course
  app.get("/api/courses/:courseId/prerequisites", async (req, res) => {
    try {
      const { courseId } = req.params;
      const prerequisites = await storage.getCoursePrerequisites(courseId);
      res.json(prerequisites);
    } catch (error) {
      console.error("Failed to get course prerequisites:", error);
      res.status(500).json({ error: "Failed to get course prerequisites" });
    }
  });

  // Add a prerequisite to a course
  app.post("/api/courses/:courseId/prerequisites", async (req, res) => {
    try {
      const { courseId } = req.params;
      const prerequisite = await storage.createCoursePrerequisite({
        ...req.body,
        courseId,
      });
      res.status(201).json(prerequisite);
    } catch (error) {
      console.error("Failed to add course prerequisite:", error);
      res.status(500).json({ error: "Failed to add course prerequisite" });
    }
  });

  // Remove a prerequisite from a course
  app.delete("/api/course-prerequisites/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCoursePrerequisite(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to remove course prerequisite:", error);
      res.status(500).json({ error: "Failed to remove course prerequisite" });
    }
  });

  // ===================== EMPLOYEE HANDBOOK & STANDARD OPERATING PROCEDURES =====================

  // Get manual chapters by document type
  app.get("/api/manual-chapters", async (req, res) => {
    try {
      const facilityId = req.session?.facilityId;
      if (!facilityId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const { documentType } = req.query;
      if (!documentType || typeof documentType !== "string") {
        return res.status(400).json({ error: "Document type is required" });
      }
      const chapters = await storage.getManualChapters(facilityId, documentType);
      res.json(chapters);
    } catch (error) {
      console.error("Failed to get manual chapters:", error);
      res.status(500).json({ error: "Failed to get manual chapters" });
    }
  });

  // Create manual chapter (admin only)
