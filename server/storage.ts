import { db } from "./db";
import { eq, and, desc, ilike, like, or, sql, inArray, isNull, gt, gte, lt, type SQL } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";
import {
  products,
  users,
  guestSessions,
  favorites,
  viewHistory,
  cartItems,
  triviaQuestions,
  triviaScores,
  triviaAchievements,
  triviaAttempts,
  cartDiscounts,
  achievementRedemptions,
  appSettings,
  surveys,
  productNotes,
  filterOptions,
  slideshowImages,
  mediaLibrary,
  videos,
  commercials,
  whitelistedEmails,
  characteristics,
  productCharacteristics,
  type InsertProduct,
  type Product,
  type ProductWithCharacteristics,
  type InsertUser,
  type UpsertUser,
  type User,
  type InsertGuestSession,
  type GuestSession,
  type InsertFavorite,
  type Favorite,
  type InsertViewHistory,
  type ViewHistory,
  type InsertCartItem,
  type CartItem,
  type InsertTriviaQuestion,
  type TriviaQuestion,
  type InsertTriviaScore,
  type TriviaScore,
  type InsertTriviaAchievement,
  type TriviaAchievement,
  type InsertTriviaAttempt,
  type TriviaAttempt,
  type InsertCartDiscount,
  type CartDiscount,
  type InsertAchievementRedemption,
  type AchievementRedemption,
  type InsertAppSetting,
  type AppSetting,
  type InsertSurvey,
  type Survey,
  type InsertProductNote,
  type ProductNote,
  type InsertFilterOption,
  type FilterOption,
  type InsertSlideshowImage,
  type SlideshowImage,
  type InsertMediaLibrary,
  type MediaLibrary,
  type InsertVideo,
  type Video,
  type InsertCommercial,
  type Commercial,
  type InsertWhitelistedEmail,
  type WhitelistedEmail,
  type InsertCharacteristic,
  type Characteristic,
  type InsertProductCharacteristic,
  type ProductCharacteristic,
  tierPricing,
  salesReps,
  b2bAdmins,
  b2bCustomers,
  b2bCustomerRequests,
  b2bCustomerLocations,
  b2bCustomerManualProducts,
  b2bOrders,
  b2bOrderItems,
  b2bPurchaseOrders,
  b2bCommissions,
  b2bCommissionTiers,
  b2bSettings,
  b2bRolePermissions,
  b2bSlideshowSlides,
  b2bEmailTemplates,
  b2bTierAgreements,
  b2bEmailAutomationLogs,
  b2bSystemTemplateCustomizations,
  productMedia,
  improvementNotes,
  type InsertTierPricing,
  type TierPricing,
  type InsertSalesRep,
  type SalesRep,
  type InsertB2bAdmin,
  type B2bAdmin,
  type InsertB2bCustomer,
  type B2bCustomer,
  type InsertB2bCustomerRequest,
  type B2bCustomerRequest,
  type InsertB2bCustomerLocation,
  type B2bCustomerLocation,
  type InsertB2bCustomerManualProduct,
  type B2bCustomerManualProduct,
  type InsertB2bOrder,
  type B2bOrder,
  type InsertB2bOrderItem,
  type B2bOrderItem,
  type InsertB2bPurchaseOrder,
  type B2bPurchaseOrder,
  type InsertB2bCommission,
  type B2bCommission,
  type InsertB2bCommissionTier,
  type B2bCommissionTier,
  type InsertB2bSetting,
  type B2bSetting,
  type InsertB2bRolePermission,
  type B2bRolePermission,
  type InsertB2bSlideshowSlide,
  type B2bSlideshowSlide,
  type InsertB2bEmailTemplate,
  type B2bEmailTemplate,
  type InsertB2bEmailAutomationLog,
  type B2bEmailAutomationLog,
  type InsertB2bSystemTemplateCustomization,
  type B2bSystemTemplateCustomization,
  type InsertProductMedia,
  type ProductMedia,
  type InsertImprovementNote,
  type ImprovementNote,
  dailyReportTemplates,
  dailyProcedureTemplates,
  dailyReports,
  dailyReportIncidents,
  dailyReportIncidentNotes,
  dailyProcedureCompletions,
  dailyReportEmailRecipients,
  dailyReportAccessCodes,
  type InsertDailyReportTemplate,
  type DailyReportTemplate,
  type InsertDailyProcedureTemplate,
  type DailyProcedureTemplate,
  type InsertDailyReport,
  type DailyReport,
  type DailyReportWithDetails,
  type InsertDailyReportIncident,
  type DailyReportIncident,
  type InsertDailyReportIncidentNote,
  type DailyReportIncidentNote,
  type InsertDailyProcedureCompletion,
  type DailyProcedureCompletion,
  type InsertDailyReportEmailRecipient,
  type DailyReportEmailRecipient,
  type InsertDailyReportAccessCode,
  type DailyReportAccessCode,
  dailyReportFieldDefinitions,
  type InsertDailyReportFieldDefinition,
  type DailyReportFieldDefinition,
  departmentFieldAssignments,
  type InsertDepartmentFieldAssignment,
  type DepartmentFieldAssignment,
  type DepartmentFieldAssignmentWithDefinition,
  dailyReportRevisionRequests,
  type InsertDailyReportRevisionRequest,
  type DailyReportRevisionRequest,
  // Daily Procedures Module
  proceduresTemplates,
  proceduresItems,
  proceduresUsers,
  proceduresSubmissions,
  proceduresStaff,
  type InsertProceduresTemplate,
  type ProceduresTemplate,
  type InsertProceduresItem,
  type ProceduresItem,
  type InsertProceduresUser,
  type ProceduresUser,
  type InsertProceduresSubmission,
  type ProceduresSubmission,
  type ProceduresTemplateWithItems,
  type InsertProceduresStaff,
  type ProceduresStaff,
  // Staff Dashboard
  platformModules,
  staffDashboardModules,
  type PlatformModule,
  type InsertStaffDashboardModule,
  type StaffDashboardModule,
  // Customer Support Module
  supportRequests,
  supportMessages,
  supportCannedResponses,
  supportWebSources,
  supportSettings,
  supportCategories,
  supportArticles,
  supportTags,
  supportArticleTags,
  type InsertSupportRequest,
  type SupportRequest,
  type SupportRequestWithMessages,
  type InsertSupportMessage,
  type SupportMessage,
  type InsertSupportCannedResponse,
  type SupportCannedResponse,
  type InsertSupportWebSource,
  type SupportWebSource,
  type InsertSupportSetting,
  type SupportSetting,
  type InsertSupportCategory,
  type SupportCategory,
  type InsertSupportArticle,
  type SupportArticle,
  type SupportArticleWithRelations,
  type InsertSupportTag,
  type SupportTag,
  // Social Review Monitoring
  socialChannels,
  socialReviews,
  socialReviewResponses,
  type InsertSocialChannel,
  type SocialChannel,
  type InsertSocialReview,
  type SocialReview,
  type SocialReviewWithChannel,
  type InsertSocialReviewResponse,
  type SocialReviewResponse,
  // Support Attachments (for email integration)
  supportAttachments,
  type InsertSupportAttachment,
  type SupportAttachment,
  // Support Agents
  supportAgents,
  supportAgentCategories,
  supportAgentAccessTokens,
  type InsertSupportAgent,
  type SupportAgent,
  type InsertSupportAgentCategory,
  type SupportAgentCategory,
  // LMS Module
  lmsCourses,
  lmsLessons,
  lmsEnrollments,
  lmsLessonProgress,
  lmsQuizAttempts,
  lmsQuizQuestions,
  lmsCertificates,
  lmsCategories,
  lmsLessonPages,
  lmsContentBlocks,
  lmsQuestionBanks,
  lmsQuestions,
  lmsQuizzes,
  lmsQuizQuestionLinks,
  lmsQuestionResponses,
  lmsCourseRatings,
  lmsTrainingPortalSessions,
  lmsStaffTrainingCodes,
  lmsCourseDepartments,
  type InsertLmsCourse,
  type LmsCourse,
  type InsertLmsLesson,
  type LmsLesson,
  type InsertLmsEnrollment,
  type LmsEnrollment,
  type InsertLmsLessonProgress,
  type LmsLessonProgress,
  type InsertLmsQuizAttempt,
  type LmsQuizAttempt,
  type InsertLmsQuizQuestion,
  type LmsQuizQuestion,
  type InsertLmsCertificate,
  type LmsCertificate,
  type InsertLmsCategory,
  type LmsCategory,
  type InsertLmsLessonPage,
  type LmsLessonPage,
  type InsertLmsContentBlock,
  type LmsContentBlock,
  type InsertLmsQuestionBank,
  type LmsQuestionBank,
  type InsertLmsQuestion,
  type LmsQuestion,
  type InsertLmsQuiz,
  type LmsQuiz,
  type InsertLmsQuizQuestionLink,
  type LmsQuizQuestionLink,
  type InsertLmsQuestionResponse,
  type LmsQuestionResponse,
  type InsertLmsCourseRating,
  type LmsCourseRating,
  type LmsCourseWithDetails,
  type LmsEnrollmentWithDetails,
  type InsertLmsTrainingPortalSession,
  type LmsTrainingPortalSession,
  type InsertLmsStaffTrainingCode,
  type LmsStaffTrainingCode,
  type InsertLmsCourseDepartment,
  type LmsCourseDepartment,
  rccTeams,
  rccWeeks,
  rccTasks,
  rccCampaigns,
  rccRevenue,
  rccLearnings,
  rccAiRecommendations,
  rccToastHistoricalRevenue,
  rccDailyRevenue,
  type InsertRccTeam,
  type RccTeam,
  type InsertRccWeek,
  type RccWeek,
  type InsertRccTask,
  type RccTask,
  type InsertRccCampaign,
  type RccCampaign,
  type InsertRccRevenue,
  type RccRevenue,
  type InsertRccLearning,
  type RccLearning,
  type InsertRccAiRecommendation,
  type RccAiRecommendation,
  type InsertRccToastHistoricalRevenue,
  type RccToastHistoricalRevenue,
  type InsertRccDailyRevenue,
  type RccDailyRevenue,
} from "@shared/schema";

// Helper function for case-insensitive comparisons
function lower(column: AnyColumn): SQL {
  return sql`lower(${column})`;
}

// Helper for normalized business-key lookups (case-insensitive, trimmed)
// Callers must guard against blank input before calling this
function buildLowerTrimEquals(column: AnyColumn, value: string): SQL<unknown> {
  const normalized = value.trim().toLowerCase();
  return sql`LOWER(TRIM(${column})) = ${normalized}`;
}

export interface IStorage {
  // Users (for authentication)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUserRole(id: string, role: "viewer" | "admin"): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Whitelisted Emails
  getAllWhitelistedEmails(): Promise<WhitelistedEmail[]>;
  getWhitelistedEmail(email: string): Promise<WhitelistedEmail | undefined>;
  addWhitelistedEmail(data: InsertWhitelistedEmail): Promise<WhitelistedEmail>;
  upsertWhitelistedEmail(data: InsertWhitelistedEmail & { id?: string }): Promise<{ email: WhitelistedEmail; action: 'created' | 'updated' }>;
  deleteWhitelistedEmail(id: string): Promise<boolean>;

  // Products
  getProducts(filters?: ProductFilters): Promise<Product[]>;
  getProductsWithCharacteristics(beverageTypes?: string[]): Promise<ProductWithCharacteristics[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductWithMedia(id: string): Promise<(Product & { media?: (ProductMedia & { media: MediaLibrary })[] }) | undefined>;
  getProductsWithMedia(filters?: ProductFilters): Promise<(Product & { media?: (ProductMedia & { media: MediaLibrary })[] })[]>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  upsertProductBySku(product: InsertProduct): Promise<{ product: Product; action: 'created' | 'updated' }>;
  deleteProduct(id: string): Promise<boolean>;
  archiveProduct(id: string): Promise<Product | undefined>;
  restoreProduct(id: string): Promise<Product | undefined>;
  getArchivedProducts(): Promise<Product[]>;
  incrementProductViews(productId: string): Promise<void>;

  // Guest Sessions
  createGuestSession(session: InsertGuestSession): Promise<GuestSession>;
  getGuestSession(id: string): Promise<GuestSession | undefined>;
  updateSessionActivity(id: string): Promise<void>;
  updateGuestPreferences(
    id: string,
    beverageTypes: string[],
    flavorPreferences: string[],
    wineColors?: string[],
    occasion?: string
  ): Promise<GuestSession>;

  // Favorites
  getFavorites(sessionId: string): Promise<(Favorite & { product: Product })[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  updateFavoriteNote(id: string, note: string): Promise<Favorite | undefined>;
  removeFavorite(sessionId: string, productId: string): Promise<boolean>;

  // View History
  getViewHistory(sessionId: string): Promise<(ViewHistory & { product: Product })[]>;
  recordView(sessionId: string, productId: string): Promise<void>;

  // Cart
  getCartItems(sessionId: string): Promise<(CartItem & { product: Product })[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: string): Promise<boolean>;
  clearCart(sessionId: string): Promise<void>;

  // Trivia
  getTriviaQuestions(activeOnly?: boolean): Promise<TriviaQuestion[]>;
  getTriviaQuestion(id: string): Promise<TriviaQuestion | undefined>;
  createTriviaQuestion(question: InsertTriviaQuestion): Promise<TriviaQuestion>;
  updateTriviaQuestion(id: string, question: Partial<InsertTriviaQuestion>): Promise<TriviaQuestion | undefined>;
  upsertTriviaQuestion(question: InsertTriviaQuestion & { id?: string }): Promise<{ question: TriviaQuestion; action: 'created' | 'updated' }>;
  deleteTriviaQuestion(id: string): Promise<boolean>;
  
  getTriviaScores(sessionId: string): Promise<TriviaScore[]>;
  recordTriviaAnswer(score: InsertTriviaScore): Promise<TriviaScore>;
  getAskedQuestions(sessionId: string): Promise<string[]>;

  // Trivia Achievements
  getTriviaAchievements(): Promise<TriviaAchievement[]>;
  createTriviaAchievement(data: InsertTriviaAchievement): Promise<TriviaAchievement>;
  updateTriviaAchievement(id: string, data: Partial<InsertTriviaAchievement>): Promise<TriviaAchievement | undefined>;
  upsertTriviaAchievement(data: InsertTriviaAchievement & { id?: string }): Promise<{ achievement: TriviaAchievement; action: 'created' | 'updated' }>;
  deleteTriviaAchievement(id: string): Promise<boolean>;

  // Trivia Attempts
  getTriviaAttempt(sessionId: string): Promise<TriviaAttempt | undefined>;
  createTriviaAttempt(data: InsertTriviaAttempt): Promise<TriviaAttempt>;
  updateTriviaAttempt(id: string, data: Partial<InsertTriviaAttempt>): Promise<TriviaAttempt | undefined>;

  // Cart Discounts
  getCartDiscounts(sessionId: string): Promise<CartDiscount[]>;
  createCartDiscount(data: InsertCartDiscount): Promise<CartDiscount>;

  // Achievement Redemptions
  createAchievementRedemption(data: InsertAchievementRedemption): Promise<AchievementRedemption>;
  updateAchievementRedemption(id: string, data: Partial<InsertAchievementRedemption>): Promise<AchievementRedemption | undefined>;

  // Settings
  getSetting(key: string): Promise<AppSetting | undefined>;
  setSetting(key: string, value: any): Promise<AppSetting>;

  // Surveys
  createSurvey(survey: InsertSurvey): Promise<Survey>;

  // Product Notes
  getProductNotes(sessionId: string): Promise<ProductNote[]>;
  getProductNote(sessionId: string, productId: string): Promise<ProductNote | undefined>;
  saveProductNote(note: InsertProductNote): Promise<ProductNote>;
  deleteProductNote(sessionId: string, productId: string): Promise<boolean>;
  migrateFavoritesNotesToProductNotes(): Promise<number>;

  // Filter Options
  getFilterOptions(fieldType?: string): Promise<FilterOption[]>;
  getFilterOption(id: string): Promise<FilterOption | undefined>;
  createFilterOption(option: InsertFilterOption): Promise<FilterOption>;
  updateFilterOption(id: string, option: Partial<InsertFilterOption>): Promise<FilterOption | undefined>;
  upsertFilterOption(option: InsertFilterOption & { id?: string }): Promise<{ filterOption: FilterOption; action: 'created' | 'updated' }>;
  deleteFilterOption(id: string): Promise<boolean>;
  updateFilterOptionOrder(updates: { id: string; sortOrder: number }[]): Promise<void>;

  // Slideshow Images
  getSlideshowImages(activeOnly?: boolean): Promise<SlideshowImage[]>;
  getSlideshowImage(id: string): Promise<SlideshowImage | undefined>;
  createSlideshowImage(image: InsertSlideshowImage): Promise<SlideshowImage>;
  updateSlideshowImage(id: string, image: Partial<InsertSlideshowImage>): Promise<SlideshowImage | undefined>;
  upsertSlideshowImage(image: InsertSlideshowImage & { id?: string }): Promise<{ image: SlideshowImage; action: 'created' | 'updated' }>;
  deleteSlideshowImage(id: string): Promise<boolean>;
  updateSlideshowImageOrder(updates: { id: string; displayOrder: number }[]): Promise<void>;

  // Media Library
  getMediaLibraryFiles(category?: string): Promise<MediaLibrary[]>;
  getMediaLibraryFile(id: string): Promise<MediaLibrary | undefined>;
  createMediaLibraryFile(file: InsertMediaLibrary): Promise<MediaLibrary>;
  updateMediaLibraryFile(id: string, file: Partial<InsertMediaLibrary>): Promise<MediaLibrary | undefined>;
  upsertMediaLibraryFile(file: InsertMediaLibrary & { id?: string }): Promise<{ file: MediaLibrary; action: 'created' | 'updated' }>;
  deleteMediaLibraryFile(id: string): Promise<boolean>;

  // Product Media
  getProductMedia(productId: string, role?: string): Promise<(ProductMedia & { media: MediaLibrary })[]>;
  getProductMediaFiles(): Promise<MediaLibrary[]>;
  createProductMedia(data: InsertProductMedia): Promise<ProductMedia>;
  deleteProductMedia(id: string): Promise<boolean>;
  deleteProductMediaByProductAndRole(productId: string, role: string): Promise<boolean>;

  // Videos
  getVideos(activeOnly?: boolean): Promise<Video[]>;
  getVideo(id: string): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: string, video: Partial<InsertVideo>): Promise<Video | undefined>;
  upsertVideo(video: InsertVideo & { id?: string }): Promise<{ video: Video; action: 'created' | 'updated' }>;
  deleteVideo(id: string): Promise<boolean>;
  updateVideoOrder(updates: { id: string; sortOrder: number }[]): Promise<void>;

  // Commercials
  getCommercials(activeOnly?: boolean): Promise<Commercial[]>;
  getCommercial(id: string): Promise<Commercial | undefined>;
  createCommercial(commercial: InsertCommercial): Promise<Commercial>;
  updateCommercial(id: string, commercial: Partial<InsertCommercial>): Promise<Commercial | undefined>;
  upsertCommercial(commercial: InsertCommercial & { id?: string }): Promise<{ commercial: Commercial; action: 'created' | 'updated' }>;
  deleteCommercial(id: string): Promise<boolean>;
  updateCommercialOrder(updates: { id: string; sortOrder: number }[]): Promise<void>;

  // Characteristics
  searchCharacteristics(query?: string, category?: string): Promise<Characteristic[]>;
  getCharacteristic(id: string): Promise<Characteristic | undefined>;
  getCharacteristicByName(name: string): Promise<Characteristic | undefined>;
  createCharacteristic(name: string, productTypes?: string[]): Promise<Characteristic>;
  getProductCharacteristics(productId: string): Promise<Characteristic[]>;
  setProductCharacteristics(productId: string, characteristicNames: string[], category?: string): Promise<void>;

  // B2B - Tier Pricing
  getAllTierPricing(category?: string): Promise<TierPricing[]>;
  getTierPricing(id: string): Promise<TierPricing | undefined>;
  getTierPricingByNameNormalized(tierName: string, category?: string): Promise<TierPricing | undefined>;
  createTierPricing(data: InsertTierPricing): Promise<TierPricing>;
  updateTierPricing(id: string, data: Partial<InsertTierPricing>): Promise<TierPricing | undefined>;
  toggleTierActive(id: string, active: boolean): Promise<TierPricing | undefined>;
  deleteTierPricing(id: string): Promise<boolean>;
  upsertTierPricing(data: InsertTierPricing): Promise<{ tierPricing: TierPricing; action: 'created' | 'updated' }>;

  // B2B - Sales Reps
  getAllSalesReps(activeOnly?: boolean): Promise<SalesRep[]>;
  getSalesRep(id: string): Promise<SalesRep | undefined>;
  getSalesRepByEmail(email: string): Promise<SalesRep | undefined>;
  getSalesRepByEmailNormalized(email: string): Promise<SalesRep | undefined>;
  createSalesRep(data: InsertSalesRep): Promise<SalesRep>;
  updateSalesRep(id: string, data: Partial<InsertSalesRep>): Promise<SalesRep | undefined>;
  deleteSalesRep(id: string): Promise<boolean>;
  upsertSalesRep(data: Omit<InsertSalesRep, 'passwordHash'> & { passwordHash?: string }): Promise<{ salesRep: SalesRep; action: 'created' | 'updated' }>;

  // B2B - Admins
  getAllB2bAdmins(activeOnly?: boolean): Promise<B2bAdmin[]>;
  getB2bAdmin(id: string): Promise<B2bAdmin | undefined>;
  getB2bAdminByEmail(email: string): Promise<B2bAdmin | undefined>;
  createB2bAdmin(data: InsertB2bAdmin): Promise<B2bAdmin>;
  updateB2bAdmin(id: string, data: Partial<InsertB2bAdmin>): Promise<B2bAdmin | undefined>;
  deleteB2bAdmin(id: string): Promise<boolean>;
  upsertB2bAdmin(data: Omit<InsertB2bAdmin, 'passwordHash'> & { passwordHash?: string }): Promise<{ admin: B2bAdmin; action: 'created' | 'updated' }>;

  // B2B - Customers
  getAllB2bCustomers(status?: string): Promise<(B2bCustomer & { tier?: TierPricing | null; salesRep?: SalesRep | null })[]>;
  getB2bCustomer(id: string): Promise<(B2bCustomer & { tier?: TierPricing | null; salesRep?: SalesRep | null }) | undefined>;
  getB2bCustomerByEmail(email: string): Promise<(B2bCustomer & { tier?: TierPricing | null; salesRep?: SalesRep | null }) | undefined>;
  getB2bCustomerCoreByEmail(email: string): Promise<B2bCustomer | undefined>;
  createB2bCustomer(data: InsertB2bCustomer): Promise<B2bCustomer>;
  updateB2bCustomer(id: string, data: Partial<InsertB2bCustomer>): Promise<B2bCustomer | undefined>;
  deleteB2bCustomer(id: string): Promise<boolean>;
  approveB2bCustomer(id: string, tierId: string, passwordHash: string, approvedByAdminId: string | null): Promise<B2bCustomer | undefined>;
  upsertB2bCustomer(data: Omit<InsertB2bCustomer, 'passwordHash'> & { passwordHash?: string }): Promise<{ customer: B2bCustomer; action: 'created' | 'updated' }>;

  // B2B - Customer Requests (for sales rep submission & admin approval)
  getB2bCustomerRequests(filters?: { status?: string; salesRepId?: string }): Promise<(B2bCustomerRequest & { salesRep: SalesRep; tier?: TierPricing | null })[]>;
  getB2bCustomerRequest(id: string): Promise<(B2bCustomerRequest & { salesRep: SalesRep; tier?: TierPricing | null }) | undefined>;
  createB2bCustomerRequest(data: InsertB2bCustomerRequest): Promise<B2bCustomerRequest>;
  updateB2bCustomerRequest(id: string, data: Partial<InsertB2bCustomerRequest>): Promise<B2bCustomerRequest | undefined>;
  approveB2bCustomerRequest(id: string, adminId: string, tierId?: string): Promise<{ request: B2bCustomerRequest; customer: B2bCustomer }>;
  rejectB2bCustomerRequest(id: string, adminId: string, reason: string): Promise<B2bCustomerRequest | undefined>;

  // B2B - Customer Locations
  getAllB2bCustomerLocations(): Promise<B2bCustomerLocation[]>;
  getCustomerLocations(customerId: string): Promise<B2bCustomerLocation[]>;
  getCustomerLocation(id: string): Promise<B2bCustomerLocation | undefined>;
  createCustomerLocation(data: InsertB2bCustomerLocation): Promise<B2bCustomerLocation>;
  updateCustomerLocation(id: string, data: Partial<InsertB2bCustomerLocation>): Promise<B2bCustomerLocation | undefined>;
  deleteCustomerLocation(id: string): Promise<boolean>;
  upsertCustomerLocation(data: InsertB2bCustomerLocation & { id?: string }): Promise<{ location: B2bCustomerLocation; action: 'created' | 'updated' }>;

  // B2B - Customer Manual Products (Featured Products for Where to Buy)
  getCustomerManualProducts(customerId: string): Promise<(B2bCustomerManualProduct & { product: Product })[]>;
  getCustomerManualProductsRaw(customerId: string): Promise<B2bCustomerManualProduct[]>;
  addCustomerManualProduct(customerId: string, productId: string, expiresAt: Date): Promise<B2bCustomerManualProduct>;
  addCustomerManualProducts(customerId: string, productIds: string[], expiresAt: Date): Promise<B2bCustomerManualProduct[]>;
  removeCustomerManualProduct(id: string): Promise<boolean>;
  removeAllCustomerManualProducts(customerId: string): Promise<boolean>;
  cleanupOrphanedManualProducts(customerId: string): Promise<number>;

  // B2B - Orders
  getAllB2bOrders(): Promise<(B2bOrder & { customer: B2bCustomer })[]>;
  getB2bOrders(customerId: string): Promise<(B2bOrder & { items: (B2bOrderItem & { product: Product })[] })[]>;
  getB2bOrder(id: string): Promise<(B2bOrder & { customer: B2bCustomer; items: (B2bOrderItem & { product: Product })[] }) | undefined>;
  getB2bOrderByNumberNormalized(orderNumber: string): Promise<B2bOrder | undefined>;
  createB2bOrder(orderData: InsertB2bOrder, items: InsertB2bOrderItem[]): Promise<B2bOrder>;
  updateB2bOrder(id: string, data: Partial<InsertB2bOrder>): Promise<B2bOrder | undefined>;
  deleteB2bOrder(id: string): Promise<boolean>;
  getCustomerPreviousProducts(customerId: string): Promise<Product[]>;
  upsertB2bOrder(orderData: InsertB2bOrder, items: InsertB2bOrderItem[]): Promise<{ order: B2bOrder; action: 'created' | 'updated' }>;

  // B2B - Purchase Orders (Distributor PO uploads)
  getB2bPurchaseOrders(customerId: string): Promise<B2bPurchaseOrder[]>;
  createB2bPurchaseOrder(data: InsertB2bPurchaseOrder): Promise<B2bPurchaseOrder>;
  updateB2bPurchaseOrder(id: string, data: Partial<InsertB2bPurchaseOrder>): Promise<B2bPurchaseOrder | undefined>;
  deleteB2bPurchaseOrder(id: string): Promise<boolean>;

  // B2B - Commissions
  getAllB2bCommissions(): Promise<B2bCommission[]>;
  getCommissionsBySalesRep(salesRepId: string): Promise<(B2bCommission & { order: B2bOrder & { customer: B2bCustomer } })[]>;
  getCommissionsByOrderId(orderId: string): Promise<B2bCommission[]>;
  createCommission(data: InsertB2bCommission): Promise<B2bCommission>;
  updateCommissionStatus(commissionId: string, status: string): Promise<B2bCommission | undefined>;
  markCommissionAsPaid(commissionId: string): Promise<B2bCommission | undefined>;
  getEarnedCommissionsNotPaid(): Promise<(B2bCommission & { order: B2bOrder & { customer: B2bCustomer }; salesRep: SalesRep })[]>;
  updateCommissionPayPeriod(commissionId: string, payPeriod: string): Promise<B2bCommission | undefined>;
  upsertCommissionByOrderAndSalesRep(data: InsertB2bCommission): Promise<{ commission: B2bCommission; action: 'created' | 'updated' }>;

  // B2B - Commission Tiers
  getCommissionTiers(): Promise<B2bCommissionTier[]>;
  getActiveCommissionTiers(): Promise<B2bCommissionTier[]>;
  getCommissionTier(id: string): Promise<B2bCommissionTier | undefined>;
  createCommissionTier(data: InsertB2bCommissionTier): Promise<B2bCommissionTier>;
  updateCommissionTier(id: string, data: Partial<InsertB2bCommissionTier>): Promise<B2bCommissionTier | undefined>;
  deleteCommissionTier(id: string): Promise<boolean>;
  getYtdSalesForSalesRep(salesRepId: string, year: number): Promise<number>;

  // B2B - Tier Commitments
  getTierCommitmentReport(): Promise<any[]>;
  getCustomersNeedingRenewalReminders(daysBeforeRenewal: number): Promise<any[]>;
  updateCustomerCommitmentStartDate(customerId: string, startDate: Date): Promise<B2bCustomer | undefined>;

  // B2B - Settings
  getB2bSetting(key: string): Promise<B2bSetting | undefined>;
  setB2bSetting(key: string, value: string): Promise<B2bSetting>;
  getAllB2bSettings(): Promise<B2bSetting[]>;
  
  // B2B - Role Permissions
  getAllB2bRolePermissions(): Promise<B2bRolePermission[]>;
  getB2bRolePermission(roleName: string): Promise<B2bRolePermission | undefined>;
  upsertB2bRolePermission(data: InsertB2bRolePermission): Promise<B2bRolePermission>;
  initializeDefaultRolePermissions(): Promise<void>;
  
  // B2B - Slideshow Slides
  getAllB2bSlideshowSlides(): Promise<B2bSlideshowSlide[]>;
  getB2bSlideshowSlideByTitle(title: string): Promise<B2bSlideshowSlide | undefined>;
  upsertB2bSlideshowSlide(data: InsertB2bSlideshowSlide): Promise<{ slide: B2bSlideshowSlide; action: 'created' | 'updated' }>;

  // Improvement Notes (shared between Base App and B2B Admin)
  getImprovementNotes(appType?: string, status?: string): Promise<ImprovementNote[]>;
  getImprovementNote(id: string): Promise<ImprovementNote | undefined>;
  getNextNoteNumber(): Promise<number>;
  createImprovementNote(data: InsertImprovementNote): Promise<ImprovementNote>;
  updateImprovementNote(id: string, data: Partial<InsertImprovementNote>): Promise<ImprovementNote | undefined>;
  markNoteComplete(id: string): Promise<ImprovementNote | undefined>;
  deleteImprovementNote(id: string): Promise<boolean>;

  // ==========================================
  // DAILY PROCEDURES MODULE
  // ==========================================
  
  // Procedure Templates
  getProceduresTemplates(filters?: { department?: string; procedureType?: string; isActive?: boolean }): Promise<ProceduresTemplate[]>;
  getProceduresTemplate(id: string): Promise<ProceduresTemplate | undefined>;
  getProceduresTemplateByCode(code: string): Promise<ProceduresTemplate | undefined>;
  getProceduresTemplateWithItems(id: string): Promise<ProceduresTemplateWithItems | undefined>;
  createProceduresTemplate(data: InsertProceduresTemplate): Promise<ProceduresTemplate>;
  updateProceduresTemplate(id: string, data: Partial<InsertProceduresTemplate>): Promise<ProceduresTemplate | undefined>;
  deleteProceduresTemplate(id: string): Promise<boolean>;
  
  // Procedure Items
  getProceduresItems(templateId: string): Promise<ProceduresItem[]>;
  getProceduresItem(id: string): Promise<ProceduresItem | undefined>;
  createProceduresItem(data: InsertProceduresItem): Promise<ProceduresItem>;
  updateProceduresItem(id: string, data: Partial<InsertProceduresItem>): Promise<ProceduresItem | undefined>;
  deleteProceduresItem(id: string): Promise<boolean>;
  reorderProceduresItems(templateId: string, itemIds: string[]): Promise<void>;
  
  // Procedure Users
  getProceduresUsers(filters?: { isActive?: boolean }): Promise<ProceduresUser[]>;
  getProceduresUser(id: string): Promise<ProceduresUser | undefined>;
  getProceduresUserByPin(pin: string): Promise<ProceduresUser | undefined>;
  createProceduresUser(data: InsertProceduresUser): Promise<ProceduresUser>;
  updateProceduresUser(id: string, data: Partial<InsertProceduresUser>): Promise<ProceduresUser | undefined>;
  deleteProceduresUser(id: string): Promise<boolean>;
  updateProceduresUserLastLogin(id: string): Promise<void>;
  
  // Procedure Submissions
  getProceduresSubmissions(filters?: { department?: string; procedureCode?: string; startDate?: Date; endDate?: Date; userId?: string }): Promise<ProceduresSubmission[]>;
  getProceduresSubmission(id: string): Promise<ProceduresSubmission | undefined>;
  getProceduresSubmissionDraft(templateId: string, staffName: string): Promise<ProceduresSubmission | undefined>;
  createProceduresSubmission(data: InsertProceduresSubmission): Promise<ProceduresSubmission>;
  updateProceduresSubmission(id: string, data: Partial<InsertProceduresSubmission>): Promise<ProceduresSubmission | undefined>;
  deleteProceduresSubmission(id: string): Promise<boolean>;
  updateProceduresSubmissionEmailStatus(id: string, status: string): Promise<void>;
  
  // Procedures for user - get applicable procedures for today
  getTodaysProceduresForUser(userId: string): Promise<ProceduresTemplateWithItems[]>;
  
  // Procedures Staff
  getProceduresStaff(filters?: { isActive?: boolean }): Promise<ProceduresStaff[]>;
  getProceduresStaffMember(id: string): Promise<ProceduresStaff | undefined>;
  getProceduresStaffByCode(code: string): Promise<ProceduresStaff | undefined>;
  createProceduresStaff(data: InsertProceduresStaff): Promise<ProceduresStaff>;
  updateProceduresStaff(id: string, data: Partial<InsertProceduresStaff>): Promise<ProceduresStaff | undefined>;
  deleteProceduresStaff(id: string): Promise<boolean>;
  getProceduresForStaff(staffId: string): Promise<ProceduresTemplateWithItems[]>;

  // Staff Dashboard
  getAllStaffDashboardModules(): Promise<(StaffDashboardModule & { module: PlatformModule })[]>;
  getEnabledStaffDashboardModules(): Promise<(StaffDashboardModule & { module: PlatformModule })[]>;
  getStaffDashboardModule(moduleId: string): Promise<StaffDashboardModule | undefined>;
  upsertStaffDashboardModule(data: InsertStaffDashboardModule): Promise<StaffDashboardModule>;
  updateStaffDashboardModule(id: string, data: Partial<InsertStaffDashboardModule>): Promise<StaffDashboardModule | undefined>;
  initializeStaffDashboardModules(): Promise<void>;

  // B2B - System Template Customizations
  getSystemTemplateCustomization(templateKey: string): Promise<B2bSystemTemplateCustomization | undefined>;
  upsertSystemTemplateCustomization(data: InsertB2bSystemTemplateCustomization): Promise<B2bSystemTemplateCustomization>;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  // Wine filters
  wineColor?: string;
  sweetness?: string;
  body?: string;
  characteristics?: string;
  // Beer filters
  beerStyle?: string;
  beerColor?: string;
  beerBitterness?: string;
  // Spirits filters
  spiritType?: string;
  spiritAging?: string;
  spiritFlavor?: string;
  minPrice?: number;
  maxPrice?: number;
  stock?: string;
}

export class DatabaseStorage implements IStorage {
  // User operations (for authentication)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          role: userData.role,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUserRole(id: string, role: "viewer" | "admin"): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getAllWhitelistedEmails(): Promise<WhitelistedEmail[]> {
    return await db.select().from(whitelistedEmails).orderBy(desc(whitelistedEmails.createdAt));
  }

  async getWhitelistedEmail(email: string): Promise<WhitelistedEmail | undefined> {
    const [whitelisted] = await db.select().from(whitelistedEmails).where(eq(whitelistedEmails.email, email));
    return whitelisted;
  }

  async addWhitelistedEmail(data: InsertWhitelistedEmail): Promise<WhitelistedEmail> {
    const [whitelisted] = await db.insert(whitelistedEmails).values(data).returning();
    return whitelisted;
  }

  async deleteWhitelistedEmail(id: string): Promise<boolean> {
    const result = await db.delete(whitelistedEmails).where(eq(whitelistedEmails.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async upsertWhitelistedEmail(data: InsertWhitelistedEmail & { id?: string }): Promise<{ email: WhitelistedEmail; action: 'created' | 'updated' }> {
    // Try to find by ID first
    if (data.id) {
      const result = await db.select().from(whitelistedEmails).where(eq(whitelistedEmails.id, data.id)).limit(1);
      if (result.length > 0) {
        const updated = await db
          .update(whitelistedEmails)
          .set({ role: data.role })
          .where(eq(whitelistedEmails.id, data.id))
          .returning();
        return { email: updated[0], action: 'updated' };
      }
    }
    
    // Try to find by email (natural key)
    const existing = await this.getWhitelistedEmail(data.email);
    if (existing) {
      const updated = await db
        .update(whitelistedEmails)
        .set({ role: data.role })
        .where(eq(whitelistedEmails.id, existing.id))
        .returning();
      return { email: updated[0], action: 'updated' };
    }
    
    // Create new
    const created = await this.addWhitelistedEmail(data);
    return { email: created, action: 'created' };
  }

  async getProducts(filters?: ProductFilters): Promise<Product[]> {
    let query = db.select().from(products);
    
    const conditions = [];
    
    // By default, filter out archived products
    conditions.push(eq(products.isArchived, false));
    if (filters?.search) {
      // Keep original substring search for text fields to support phrases like "ice wine"
      conditions.push(
        or(
          ilike(products.name, `%${filters.search}%`),
          ilike(products.description, `%${filters.search}%`),
          ilike(products.tastingNotes, `%${filters.search}%`)
        )
      );
    }
    if (filters?.category) {
      // Cast enum to text before using lower() to avoid PostgreSQL enum comparison errors
      conditions.push(sql`lower(${products.category}::text) = ${filters.category.toLowerCase()}`);
    }
    if (filters?.wineColor) {
      // Filter by the 'type' field which contains wine types like "Red Wine", "White Wine", etc.
      conditions.push(ilike(products.type, `%${filters.wineColor}%`));
    }
    if (filters?.sweetness) {
      // EXACT match on sweetness field to prevent "dry" matching "off-dry"
      // Use case-insensitive exact comparison
      conditions.push(sql`lower(${products.sweetness}) = ${filters.sweetness.toLowerCase()}`);
    }
    if (filters?.body) {
      // EXACT match on body field for consistency
      conditions.push(sql`lower(${products.body}) = ${filters.body.toLowerCase()}`);
    }
    if (filters?.characteristics) {
      // Filter by characteristics field for specific traits like "Crisp", "Rich", etc.
      conditions.push(ilike(products.characteristics, `%${filters.characteristics}%`));
    }
    // Beer filters
    if (filters?.beerStyle && filters.beerStyle !== 'all') {
      conditions.push(sql`${products.beerStyle}::text = ${filters.beerStyle}`);
    }
    if (filters?.beerColor && filters.beerColor !== 'all') {
      conditions.push(sql`${products.beerColor}::text = ${filters.beerColor}`);
    }
    if (filters?.beerBitterness && filters.beerBitterness !== 'all') {
      conditions.push(sql`${products.beerBitterness}::text = ${filters.beerBitterness}`);
    }
    // Spirits filters
    if (filters?.spiritType && filters.spiritType !== 'all') {
      conditions.push(sql`${products.spiritType}::text = ${filters.spiritType}`);
    }
    if (filters?.spiritAging && filters.spiritAging !== 'all') {
      conditions.push(sql`${products.spiritAging}::text = ${filters.spiritAging}`);
    }
    if (filters?.spiritFlavor && filters.spiritFlavor !== 'all') {
      conditions.push(sql`${products.spiritFlavor}::text = ${filters.spiritFlavor}`);
    }
    if (filters?.stock) {
      // When filtering for in-stock items, include products with ignoreInventory=true OR stock > 0
      // When filtering for out-of-stock items, only show products that are tracked (ignoreInventory=false) AND have 0 stock
      if (filters.stock === 'in-stock' || filters.stock === 'true') {
        conditions.push(sql`(${products.ignoreInventory} = true OR ${products.stockQuantity} > 0)`);
      } else if (filters.stock === 'out-of-stock' || filters.stock === 'false') {
        conditions.push(sql`(${products.ignoreInventory} = false AND ${products.stockQuantity} = 0)`);
      }
    }
    if (filters?.minPrice !== undefined) {
      conditions.push(sql`${products.price}::numeric >= ${filters.minPrice}`);
    }
    if (filters?.maxPrice !== undefined) {
      conditions.push(sql`${products.price}::numeric <= ${filters.maxPrice}`);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query;
  }

  async getProductsWithCharacteristics(beverageTypes?: string[]): Promise<ProductWithCharacteristics[]> {
    // Build SQL query with LEFT JOIN and array_agg to aggregate characteristics per product
    const filterClause = beverageTypes && beverageTypes.length > 0
      ? sql`AND c.product_types && ARRAY[${sql.join(beverageTypes.map(t => sql`${t}`), sql`, `)}]::category[]`
      : sql``;

    const result = await db.execute<Product & { characteristics: string | null }>(sql`
      SELECT 
        p.id,
        p.name,
        p.category,
        p.type,
        p.varietal,
        p.vintage_year AS "vintageYear",
        p.region,
        p.description,
        p.tasting_notes AS "tastingNotes",
        p.food_pairings AS "foodPairings",
        p.serving_temp AS "servingTemp",
        p.alcohol_content AS "alcoholContent",
        p.bottle_size AS "bottleSize",
        p.price,
        p.cost,
        p.wholesale_pricing AS "wholesaleOverridePrice",
        p.sku,
        p.stock_quantity AS "stockQuantity",
        p.low_stock_threshold AS "lowStockThreshold",
        p.ignore_inventory AS "ignoreInventory",
        p.image_url AS "imageUrl",
        p.label_image_url AS "labelImageUrl",
        p.lifestyle_image_url AS "lifestyleImageUrl",
        p.characteristics AS "characteristicsRaw",
        p.wine_color AS "wineColor",
        p.sweetness,
        p.body,
        p.beer_style AS "beerStyle",
        p.beer_color AS "beerColor",
        p.beer_bitterness AS "beerBitterness",
        p.spirit_type AS "spiritType",
        p.spirit_aging AS "spiritAging",
        p.spirit_flavor AS "spiritFlavor",
        p.production_method AS "productionMethod",
        p.aging_process AS "agingProcess",
        p.awards,
        p.rating,
        p.available,
        p.featured,
        p.new_arrival AS "newArrival",
        p.staff_pick AS "staffPick",
        p.wine_of_month AS "wineOfMonth",
        p.tags,
        p.created_at AS "createdAt",
        COALESCE(
          json_agg(
            json_build_object(
              'id', c.id,
              'name', c.name,
              'productTypes', c.product_types
            )
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        )::text as characteristics
      FROM products p
      LEFT JOIN product_characteristics pc ON p.id = pc.product_id
      LEFT JOIN characteristics c ON pc.characteristic_id = c.id ${filterClause}
      WHERE p.available = true AND p.is_archived = false
      GROUP BY p.id
      ORDER BY p.name
    `);

    // Parse the JSON characteristics string and transform rows
    return result.rows.map(row => ({
      ...row,
      characteristics: row.characteristics ? JSON.parse(row.characteristics) : [],
    })) as ProductWithCharacteristics[];
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id));
    return result[0];
  }

  async getProductWithMedia(id: string): Promise<(Product & { media?: (ProductMedia & { media: MediaLibrary })[] }) | undefined> {
    const product = await this.getProduct(id);
    if (!product) return undefined;

    const media = await this.getProductMedia(id);
    return { ...product, media: media.length > 0 ? media : undefined };
  }

  async getProductsWithMedia(filters?: ProductFilters): Promise<(Product & { media?: (ProductMedia & { media: MediaLibrary })[] })[]> {
    // Get filtered products first
    const filteredProducts = await this.getProducts(filters);
    if (filteredProducts.length === 0) return [];

    const productIds = filteredProducts.map(p => p.id);

    // Fetch all media for these products in a single query with JOIN
    const mediaResults = await db
      .select({
        productId: productMedia.productId,
        id: productMedia.id,
        mediaId: productMedia.mediaId,
        role: productMedia.role,
        sortOrder: productMedia.sortOrder,
        mediaFilename: mediaLibrary.filename,
        mediaOriginalFilename: mediaLibrary.originalFilename,
        mediaObjectPath: mediaLibrary.objectPath,
        mediaPublicUrl: mediaLibrary.publicUrl,
        mediaMimeType: mediaLibrary.mimeType,
        mediaFileSize: mediaLibrary.fileSize,
        mediaLibraryId: mediaLibrary.id,
      })
      .from(productMedia)
      .leftJoin(mediaLibrary, eq(productMedia.mediaId, mediaLibrary.id))
      .where(inArray(productMedia.productId, productIds));

    // Group media by product ID
    const mediaByProductId = new Map<string, any[]>();
    mediaResults.forEach(row => {
      if (!mediaByProductId.has(row.productId)) {
        mediaByProductId.set(row.productId, []);
      }
      mediaByProductId.get(row.productId)!.push({
        id: row.id,
        mediaId: row.mediaId,
        role: row.role,
        sortOrder: row.sortOrder,
        media: {
          id: row.mediaLibraryId,
          filename: row.mediaFilename,
          originalFilename: row.mediaOriginalFilename,
          objectPath: row.mediaObjectPath,
          publicUrl: row.mediaPublicUrl,
          mimeType: row.mediaMimeType,
          fileSize: row.mediaFileSize,
        },
      });
    });

    // Attach media to products
    return filteredProducts.map(product => ({
      ...product,
      media: mediaByProductId.get(product.id) || undefined,
    }));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await db.insert(products).values(product).returning();
    return result[0];
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const result = await db.update(products).set(product).where(eq(products.id, id)).returning();
    return result[0];
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async archiveProduct(id: string): Promise<Product | undefined> {
    const [updated] = await db.update(products)
      .set({ isArchived: true, archivedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  async restoreProduct(id: string): Promise<Product | undefined> {
    const [updated] = await db.update(products)
      .set({ isArchived: false, archivedAt: null })
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  async getArchivedProducts(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.isArchived, true)).orderBy(desc(products.archivedAt));
  }

  async incrementProductViews(productId: string): Promise<void> {
    await db.execute(sql`
      UPDATE ${products} 
      SET view_count = COALESCE(view_count, 0) + 1 
      WHERE id = ${productId}
    `);
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    if (!sku) return undefined;
    const normalizedSku = sku.trim().toUpperCase();
    const result = await db.select().from(products).where(sql`UPPER(TRIM(${products.sku})) = ${normalizedSku}`);
    return result[0];
  }

  async upsertProductBySku(product: InsertProduct): Promise<{ product: Product; action: 'created' | 'updated' }> {
    if (!product.sku) {
      throw new Error("SKU is required for upsert operation");
    }

    const existingProduct = await this.getProductBySku(product.sku);
    
    if (existingProduct) {
      const updated = await this.updateProduct(existingProduct.id, product);
      if (!updated) {
        throw new Error("Failed to update product");
      }
      return { product: updated, action: 'updated' };
    } else {
      const created = await this.createProduct(product);
      return { product: created, action: 'created' };
    }
  }

  async createGuestSession(session: InsertGuestSession): Promise<GuestSession> {
    const result = await db.insert(guestSessions).values(session).returning();
    return result[0];
  }

  async getGuestSession(id: string): Promise<GuestSession | undefined> {
    const result = await db.select().from(guestSessions).where(eq(guestSessions.id, id));
    return result[0];
  }

  async updateSessionActivity(id: string): Promise<void> {
    await db.update(guestSessions).set({ lastActiveAt: new Date() }).where(eq(guestSessions.id, id));
  }

  async updateGuestPreferences(
    id: string,
    beverageTypes: string[],
    flavorPreferences: string[],
    wineColors?: string[],
    occasion?: string
  ): Promise<GuestSession> {
    const result = await db
      .update(guestSessions)
      .set({
        preferredBeverageTypes: beverageTypes,
        flavorPreferences: flavorPreferences,
        wineColors: wineColors || null,
        occasion: occasion || null,
      })
      .where(eq(guestSessions.id, id))
      .returning();
    return result[0];
  }

  async getFavorites(sessionId: string): Promise<(Favorite & { product: Product })[]> {
    const result = await db
      .select({
        id: favorites.id,
        sessionId: favorites.sessionId,
        productId: favorites.productId,
        note: sql<string | null>`COALESCE(${productNotes.note}, ${favorites.note})`.as('note'),
        createdAt: favorites.createdAt,
        product: products,
      })
      .from(favorites)
      .innerJoin(products, eq(favorites.productId, products.id))
      .leftJoin(productNotes, and(
        eq(productNotes.sessionId, favorites.sessionId),
        eq(productNotes.productId, favorites.productId)
      ))
      .where(eq(favorites.sessionId, sessionId))
      .orderBy(desc(favorites.createdAt));
    
    return result as any;
  }

  async addFavorite(favorite: InsertFavorite): Promise<Favorite> {
    const existing = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.sessionId, favorite.sessionId), eq(favorites.productId, favorite.productId)));
    
    if (existing.length > 0) {
      return existing[0];
    }

    const result = await db.insert(favorites).values(favorite).returning();
    return result[0];
  }

  async updateFavoriteNote(id: string, note: string): Promise<Favorite | undefined> {
    const result = await db.update(favorites).set({ note }).where(eq(favorites.id, id)).returning();
    return result[0];
  }

  async removeFavorite(sessionId: string, productId: string): Promise<boolean> {
    const result = await db
      .delete(favorites)
      .where(and(eq(favorites.sessionId, sessionId), eq(favorites.productId, productId)));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getViewHistory(sessionId: string): Promise<(ViewHistory & { product: Product })[]> {
    const result = await db
      .select({
        id: viewHistory.id,
        sessionId: viewHistory.sessionId,
        productId: viewHistory.productId,
        viewCount: viewHistory.viewCount,
        lastViewedAt: viewHistory.lastViewedAt,
        product: products,
      })
      .from(viewHistory)
      .innerJoin(products, eq(viewHistory.productId, products.id))
      .where(eq(viewHistory.sessionId, sessionId))
      .orderBy(desc(viewHistory.lastViewedAt));
    
    return result as any;
  }

  async recordView(sessionId: string, productId: string): Promise<void> {
    const existing = await db
      .select()
      .from(viewHistory)
      .where(and(eq(viewHistory.sessionId, sessionId), eq(viewHistory.productId, productId)));
    
    if (existing.length > 0) {
      await db
        .update(viewHistory)
        .set({ 
          viewCount: sql`${viewHistory.viewCount} + 1`,
          lastViewedAt: new Date(),
        })
        .where(eq(viewHistory.id, existing[0].id));
    } else {
      await db.insert(viewHistory).values({ sessionId, productId });
    }
  }

  async getCartItems(sessionId: string): Promise<(CartItem & { product: Product })[]> {
    const result = await db
      .select({
        id: cartItems.id,
        sessionId: cartItems.sessionId,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        note: cartItems.note,
        createdAt: cartItems.createdAt,
        product: products,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.sessionId, sessionId))
      .orderBy(desc(cartItems.createdAt));
    
    return result as any;
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    const existing = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.sessionId, item.sessionId), eq(cartItems.productId, item.productId)));
    
    if (existing.length > 0) {
      const result = await db
        .update(cartItems)
        .set({ quantity: sql`${cartItems.quantity} + ${item.quantity}` })
        .where(eq(cartItems.id, existing[0].id))
        .returning();
      return result[0];
    }

    const result = await db.insert(cartItems).values(item).returning();
    return result[0];
  }

  async updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined> {
    const result = await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, id)).returning();
    return result[0];
  }

  async removeFromCart(id: string): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async clearCart(sessionId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
  }

  async getTriviaQuestions(activeOnly = false): Promise<TriviaQuestion[]> {
    let query = db.select().from(triviaQuestions);
    if (activeOnly) {
      query = query.where(eq(triviaQuestions.isActive, true)) as any;
    }
    return await query.orderBy(desc(triviaQuestions.createdAt));
  }

  async getTriviaQuestion(id: string): Promise<TriviaQuestion | undefined> {
    const result = await db.select().from(triviaQuestions).where(eq(triviaQuestions.id, id));
    return result[0];
  }

  async createTriviaQuestion(question: InsertTriviaQuestion): Promise<TriviaQuestion> {
    const values = { ...question, answers: question.answers as string[] };
    const result = await db.insert(triviaQuestions).values(values).returning();
    return result[0];
  }

  async updateTriviaQuestion(id: string, question: Partial<InsertTriviaQuestion>): Promise<TriviaQuestion | undefined> {
    const updates: any = question.answers 
      ? { ...question, answers: question.answers as string[] }
      : question;
    const result = await db.update(triviaQuestions).set(updates).where(eq(triviaQuestions.id, id)).returning();
    return result[0];
  }

  async deleteTriviaQuestion(id: string): Promise<boolean> {
    const result = await db.delete(triviaQuestions).where(eq(triviaQuestions.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteTriviaQuestions(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.delete(triviaQuestions).where(inArray(triviaQuestions.id, ids));
    return result.rowCount || 0;
  }

  async upsertTriviaQuestion(question: InsertTriviaQuestion & { id?: string }): Promise<{ question: TriviaQuestion; action: 'created' | 'updated' }> {
    // Try to find by ID first
    if (question.id) {
      const existing = await this.getTriviaQuestion(question.id);
      if (existing) {
        const updated = await this.updateTriviaQuestion(existing.id, question);
        if (!updated) throw new Error("Failed to update trivia question");
        return { question: updated, action: 'updated' };
      }
    }
    
    // Try to find by question text (natural key)
    const existingByQuestion = await db
      .select()
      .from(triviaQuestions)
      .where(sql`LOWER(TRIM(${triviaQuestions.question})) = LOWER(TRIM(${question.question}))`)
      .limit(1);
    
    if (existingByQuestion.length > 0) {
      const updated = await this.updateTriviaQuestion(existingByQuestion[0].id, question);
      if (!updated) throw new Error("Failed to update trivia question");
      return { question: updated, action: 'updated' };
    }
    
    // Create new
    const created = await this.createTriviaQuestion(question);
    return { question: created, action: 'created' };
  }

  async getTriviaScores(sessionId: string): Promise<TriviaScore[]> {
    return await db
      .select()
      .from(triviaScores)
      .where(eq(triviaScores.sessionId, sessionId))
      .orderBy(desc(triviaScores.answeredAt));
  }

  async recordTriviaAnswer(score: InsertTriviaScore): Promise<TriviaScore> {
    const result = await db.insert(triviaScores).values(score).returning();
    return result[0];
  }

  async getAskedQuestions(sessionId: string): Promise<string[]> {
    const scores = await this.getTriviaScores(sessionId);
    return scores.map(s => s.questionId);
  }

  async getTriviaAchievements(): Promise<TriviaAchievement[]> {
    return await db
      .select()
      .from(triviaAchievements)
      .orderBy(triviaAchievements.scoreThreshold);
  }

  async createTriviaAchievement(data: InsertTriviaAchievement): Promise<TriviaAchievement> {
    const result = await db.insert(triviaAchievements).values(data).returning();
    return result[0];
  }

  async updateTriviaAchievement(id: string, data: Partial<InsertTriviaAchievement>): Promise<TriviaAchievement | undefined> {
    const result = await db
      .update(triviaAchievements)
      .set(data)
      .where(eq(triviaAchievements.id, id))
      .returning();
    return result[0];
  }

  async deleteTriviaAchievement(id: string): Promise<boolean> {
    const result = await db.delete(triviaAchievements).where(eq(triviaAchievements.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async upsertTriviaAchievement(data: InsertTriviaAchievement & { id?: string }): Promise<{ achievement: TriviaAchievement; action: 'created' | 'updated' }> {
    // Try to find by ID first
    if (data.id) {
      const result = await db.select().from(triviaAchievements).where(eq(triviaAchievements.id, data.id)).limit(1);
      if (result.length > 0) {
        const updated = await this.updateTriviaAchievement(result[0].id, data);
        if (!updated) throw new Error("Failed to update achievement");
        return { achievement: updated, action: 'updated' };
      }
    }
    
    // Try to find by scoreThreshold (natural key - unique)
    const existing = await db
      .select()
      .from(triviaAchievements)
      .where(eq(triviaAchievements.scoreThreshold, data.scoreThreshold))
      .limit(1);
    
    if (existing.length > 0) {
      const updated = await this.updateTriviaAchievement(existing[0].id, data);
      if (!updated) throw new Error("Failed to update achievement");
      return { achievement: updated, action: 'updated' };
    }
    
    // Create new
    const created = await this.createTriviaAchievement(data);
    return { achievement: created, action: 'created' };
  }

  async getTriviaAttempt(sessionId: string): Promise<TriviaAttempt | undefined> {
    const result = await db
      .select()
      .from(triviaAttempts)
      .where(eq(triviaAttempts.sessionId, sessionId))
      .orderBy(desc(triviaAttempts.startedAt))
      .limit(1);
    return result[0];
  }

  async createTriviaAttempt(data: InsertTriviaAttempt): Promise<TriviaAttempt> {
    const result = await db.insert(triviaAttempts).values(data).returning();
    return result[0];
  }

  async updateTriviaAttempt(id: string, data: Partial<InsertTriviaAttempt>): Promise<TriviaAttempt | undefined> {
    const result = await db
      .update(triviaAttempts)
      .set(data)
      .where(eq(triviaAttempts.id, id))
      .returning();
    return result[0];
  }

  async getCartDiscounts(sessionId: string): Promise<CartDiscount[]> {
    return await db
      .select()
      .from(cartDiscounts)
      .where(eq(cartDiscounts.sessionId, sessionId))
      .orderBy(desc(cartDiscounts.appliedAt));
  }

  async createCartDiscount(data: InsertCartDiscount): Promise<CartDiscount> {
    const result = await db.insert(cartDiscounts).values(data).returning();
    return result[0];
  }

  async createAchievementRedemption(data: InsertAchievementRedemption): Promise<AchievementRedemption> {
    const result = await db.insert(achievementRedemptions).values(data).returning();
    return result[0];
  }

  async updateAchievementRedemption(id: string, data: Partial<InsertAchievementRedemption>): Promise<AchievementRedemption | undefined> {
    const result = await db
      .update(achievementRedemptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(achievementRedemptions.id, id))
      .returning();
    return result[0];
  }

  async getSetting(key: string): Promise<AppSetting | undefined> {
    const result = await db.select().from(appSettings).where(eq(appSettings.key, key));
    return result[0];
  }

  async setSetting(key: string, value: any): Promise<AppSetting> {
    const existing = await this.getSetting(key);
    
    if (existing) {
      const result = await db
        .update(appSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(appSettings.key, key))
        .returning();
      return result[0];
    }

    const result = await db.insert(appSettings).values({ key, value }).returning();
    return result[0];
  }

  async createSurvey(survey: InsertSurvey): Promise<Survey> {
    const result = await db.insert(surveys).values(survey).returning();
    return result[0];
  }

  async getProductNotes(sessionId: string): Promise<ProductNote[]> {
    return await db
      .select()
      .from(productNotes)
      .where(eq(productNotes.sessionId, sessionId))
      .orderBy(desc(productNotes.updatedAt));
  }

  async getProductNote(sessionId: string, productId: string): Promise<ProductNote | undefined> {
    const result = await db
      .select()
      .from(productNotes)
      .where(and(eq(productNotes.sessionId, sessionId), eq(productNotes.productId, productId)));
    return result[0];
  }

  async saveProductNote(note: InsertProductNote): Promise<ProductNote> {
    const existing = await this.getProductNote(note.sessionId, note.productId);
    
    if (existing) {
      const result = await db
        .update(productNotes)
        .set({ note: note.note, updatedAt: new Date() })
        .where(and(eq(productNotes.sessionId, note.sessionId), eq(productNotes.productId, note.productId)))
        .returning();
      return result[0];
    }

    const result = await db.insert(productNotes).values(note).returning();
    return result[0];
  }

  async deleteProductNote(sessionId: string, productId: string): Promise<boolean> {
    const result = await db
      .delete(productNotes)
      .where(and(eq(productNotes.sessionId, sessionId), eq(productNotes.productId, productId)));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async migrateFavoritesNotesToProductNotes(): Promise<number> {
    // Get all favorites with non-empty notes
    const favoritesWithNotes = await db
      .select()
      .from(favorites)
      .where(and(sql`${favorites.note} IS NOT NULL`, sql`${favorites.note} != ''`));
    
    let migratedCount = 0;
    
    for (const fav of favoritesWithNotes) {
      // Check if product_notes already exists for this sessionId/productId
      const existingNote = await this.getProductNote(fav.sessionId, fav.productId);
      
      // Only migrate if product_notes doesn't exist or is empty
      if (!existingNote || !existingNote.note) {
        await this.saveProductNote({
          sessionId: fav.sessionId,
          productId: fav.productId,
          note: fav.note!,
        });
        migratedCount++;
      }
    }
    
    return migratedCount;
  }

  async getFilterOptions(fieldType?: string): Promise<FilterOption[]> {
    let query = db.select().from(filterOptions).orderBy(filterOptions.fieldType, filterOptions.sortOrder);
    
    if (fieldType) {
      query = query.where(eq(filterOptions.fieldType, fieldType)) as any;
    }
    
    return await query;
  }

  async getFilterOption(id: string): Promise<FilterOption | undefined> {
    const result = await db.select().from(filterOptions).where(eq(filterOptions.id, id));
    return result[0];
  }

  async createFilterOption(option: InsertFilterOption): Promise<FilterOption> {
    const result = await db.insert(filterOptions).values(option).returning();
    return result[0];
  }

  async updateFilterOption(id: string, option: Partial<InsertFilterOption>): Promise<FilterOption | undefined> {
    const result = await db
      .update(filterOptions)
      .set({ ...option, updatedAt: new Date() })
      .where(eq(filterOptions.id, id))
      .returning();
    return result[0];
  }

  async deleteFilterOption(id: string): Promise<boolean> {
    const result = await db.delete(filterOptions).where(eq(filterOptions.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateFilterOptionOrder(updates: { id: string; sortOrder: number }[]): Promise<void> {
    for (const update of updates) {
      await db
        .update(filterOptions)
        .set({ sortOrder: update.sortOrder, updatedAt: new Date() })
        .where(eq(filterOptions.id, update.id));
    }
  }

  async upsertFilterOption(option: InsertFilterOption & { id?: string }): Promise<{ filterOption: FilterOption; action: 'created' | 'updated' }> {
    // Try to find by ID first if provided
    if (option.id) {
      const existing = await this.getFilterOption(option.id);
      if (existing) {
        const updated = await this.updateFilterOption(existing.id, option);
        if (!updated) throw new Error("Failed to update filter option");
        return { filterOption: updated, action: 'updated' };
      }
    }
    
    // Try to find by fieldType + optionValue (natural key)
    const existingByKey = await db
      .select()
      .from(filterOptions)
      .where(and(
        eq(filterOptions.fieldType, option.fieldType),
        eq(filterOptions.optionValue, option.optionValue)
      ))
      .limit(1);
    
    if (existingByKey.length > 0) {
      const updated = await this.updateFilterOption(existingByKey[0].id, option);
      if (!updated) throw new Error("Failed to update filter option");
      return { filterOption: updated, action: 'updated' };
    }
    
    // Create new
    const created = await this.createFilterOption(option);
    return { filterOption: created, action: 'created' };
  }

  // Slideshow Images
  async getSlideshowImages(activeOnly?: boolean): Promise<SlideshowImage[]> {
    let query = db.select().from(slideshowImages).orderBy(slideshowImages.displayOrder);
    
    if (activeOnly) {
      query = query.where(eq(slideshowImages.isActive, true)) as any;
    }
    
    return await query;
  }

  async getSlideshowImage(id: string): Promise<SlideshowImage | undefined> {
    const result = await db.select().from(slideshowImages).where(eq(slideshowImages.id, id));
    return result[0];
  }

  async createSlideshowImage(image: InsertSlideshowImage): Promise<SlideshowImage> {
    const result = await db.insert(slideshowImages).values(image).returning();
    return result[0];
  }

  async updateSlideshowImage(id: string, image: Partial<InsertSlideshowImage>): Promise<SlideshowImage | undefined> {
    const result = await db
      .update(slideshowImages)
      .set({ ...image, updatedAt: new Date() })
      .where(eq(slideshowImages.id, id))
      .returning();
    return result[0];
  }

  async deleteSlideshowImage(id: string): Promise<boolean> {
    const result = await db.delete(slideshowImages).where(eq(slideshowImages.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateSlideshowImageOrder(updates: { id: string; displayOrder: number }[]): Promise<void> {
    for (const update of updates) {
      await db
        .update(slideshowImages)
        .set({ displayOrder: update.displayOrder, updatedAt: new Date() })
        .where(eq(slideshowImages.id, update.id));
    }
  }

  async upsertSlideshowImage(image: InsertSlideshowImage & { id?: string }): Promise<{ image: SlideshowImage; action: 'created' | 'updated' }> {
    // Try to find by ID first
    if (image.id) {
      const existing = await this.getSlideshowImage(image.id);
      if (existing) {
        const updated = await this.updateSlideshowImage(existing.id, image);
        if (!updated) throw new Error("Failed to update slideshow image");
        return { image: updated, action: 'updated' };
      }
    }
    
    // Try to find by imageUrl or filename (natural key)
    const naturalKey = image.imageUrl || image.filename;
    if (naturalKey) {
      const existing = await db
        .select()
        .from(slideshowImages)
        .where(
          or(
            eq(slideshowImages.imageUrl, naturalKey),
            eq(slideshowImages.filename, naturalKey)
          )
        )
        .limit(1);
      
      if (existing.length > 0) {
        const updated = await this.updateSlideshowImage(existing[0].id, image);
        if (!updated) throw new Error("Failed to update slideshow image");
        return { image: updated, action: 'updated' };
      }
    }
    
    // Create new
    const created = await this.createSlideshowImage(image);
    return { image: created, action: 'created' };
  }

  async getMediaLibraryFiles(category?: string): Promise<MediaLibrary[]> {
    let query = db.select().from(mediaLibrary).orderBy(desc(mediaLibrary.createdAt));
    
    if (category && category !== 'all') {
      query = query.where(eq(mediaLibrary.category, category)) as any;
    }
    
    return await query;
  }

  async getMediaLibraryFile(id: string): Promise<MediaLibrary | undefined> {
    const result = await db.select().from(mediaLibrary).where(eq(mediaLibrary.id, id));
    return result[0];
  }

  async createMediaLibraryFile(file: InsertMediaLibrary): Promise<MediaLibrary> {
    const result = await db.insert(mediaLibrary).values(file).returning();
    return result[0];
  }

  async updateMediaLibraryFile(id: string, file: Partial<InsertMediaLibrary>): Promise<MediaLibrary | undefined> {
    const result = await db
      .update(mediaLibrary)
      .set({ ...file, updatedAt: new Date() })
      .where(eq(mediaLibrary.id, id))
      .returning();
    return result[0];
  }

  async deleteMediaLibraryFile(id: string): Promise<boolean> {
    const result = await db.delete(mediaLibrary).where(eq(mediaLibrary.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async upsertMediaLibraryFile(file: InsertMediaLibrary & { id?: string }): Promise<{ file: MediaLibrary; action: 'created' | 'updated' }> {
    // Try to find by ID first
    if (file.id) {
      const existing = await this.getMediaLibraryFile(file.id);
      if (existing) {
        const updated = await this.updateMediaLibraryFile(existing.id, file);
        if (!updated) throw new Error("Failed to update media library file");
        return { file: updated, action: 'updated' };
      }
    }
    
    // Try to find by objectPath (natural key - unique)
    const existing = await db
      .select()
      .from(mediaLibrary)
      .where(eq(mediaLibrary.objectPath, file.objectPath))
      .limit(1);
    
    if (existing.length > 0) {
      const updated = await this.updateMediaLibraryFile(existing[0].id, file);
      if (!updated) throw new Error("Failed to update media library file");
      return { file: updated, action: 'updated' };
    }
    
    // Create new
    const created = await this.createMediaLibraryFile(file);
    return { file: created, action: 'created' };
  }

  // Product Media implementations
  async getProductMedia(productId: string, role?: string): Promise<(ProductMedia & { media: MediaLibrary })[]> {
    const whereConditions = role 
      ? and(
          eq(productMedia.productId, productId),
          eq(productMedia.role, role as any)
        )
      : eq(productMedia.productId, productId);

    const results = await db
      .select({
        productMedia: productMedia,
        media: mediaLibrary,
      })
      .from(productMedia)
      .innerJoin(mediaLibrary, eq(productMedia.mediaId, mediaLibrary.id))
      .where(whereConditions)
      .orderBy(productMedia.sortOrder);

    return results.map(r => ({ ...r.productMedia, media: r.media }));
  }

  async getProductMediaFiles(): Promise<MediaLibrary[]> {
    const results = await db
      .selectDistinct()
      .from(mediaLibrary)
      .innerJoin(productMedia, eq(mediaLibrary.id, productMedia.mediaId))
      .where(like(mediaLibrary.mimeType, 'image/%'))
      .orderBy(mediaLibrary.createdAt);

    return results.map(r => r.media_library);
  }

  async createProductMedia(data: InsertProductMedia): Promise<ProductMedia> {
    const [created] = await db.insert(productMedia).values(data).returning();
    return created;
  }

  async deleteProductMedia(id: string): Promise<boolean> {
    const result = await db.delete(productMedia).where(eq(productMedia.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteProductMediaByProductAndRole(productId: string, role: string): Promise<boolean> {
    const result = await db.delete(productMedia).where(
      and(
        eq(productMedia.productId, productId),
        eq(productMedia.role, role as any)
      )
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Videos
  async getVideos(activeOnly?: boolean): Promise<Video[]> {
    let query = db.select().from(videos).orderBy(videos.sortOrder);
    
    if (activeOnly) {
      query = query.where(eq(videos.isActive, true)) as any;
    }
    
    return await query;
  }

  async getVideo(id: string): Promise<Video | undefined> {
    const result = await db.select().from(videos).where(eq(videos.id, id));
    return result[0];
  }

  async createVideo(video: InsertVideo): Promise<Video> {
    const result = await db.insert(videos).values(video).returning();
    return result[0];
  }

  async updateVideo(id: string, video: Partial<InsertVideo>): Promise<Video | undefined> {
    const result = await db
      .update(videos)
      .set({ ...video, updatedAt: new Date() })
      .where(eq(videos.id, id))
      .returning();
    return result[0];
  }

  async deleteVideo(id: string): Promise<boolean> {
    const result = await db.delete(videos).where(eq(videos.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateVideoOrder(updates: { id: string; sortOrder: number }[]): Promise<void> {
    for (const update of updates) {
      await db
        .update(videos)
        .set({ sortOrder: update.sortOrder, updatedAt: new Date() })
        .where(eq(videos.id, update.id));
    }
  }

  async upsertVideo(video: InsertVideo & { id?: string }): Promise<{ video: Video; action: 'created' | 'updated' }> {
    // Try to find by ID first
    if (video.id) {
      const existing = await this.getVideo(video.id);
      if (existing) {
        const updated = await this.updateVideo(existing.id, video);
        if (!updated) throw new Error("Failed to update video");
        return { video: updated, action: 'updated' };
      }
    }
    
    // Try to find by title + videoUrl combination (natural key)
    const existing = await db
      .select()
      .from(videos)
      .where(and(
        eq(videos.title, video.title),
        eq(videos.videoUrl, video.videoUrl)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      const updated = await this.updateVideo(existing[0].id, video);
      if (!updated) throw new Error("Failed to update video");
      return { video: updated, action: 'updated' };
    }
    
    // Create new
    const created = await this.createVideo(video);
    return { video: created, action: 'created' };
  }

  // Commercials
  async getCommercials(activeOnly?: boolean): Promise<Commercial[]> {
    let query = db.select().from(commercials).orderBy(commercials.sortOrder);
    
    if (activeOnly) {
      query = query.where(eq(commercials.isActive, true)) as any;
    }
    
    return await query;
  }

  async getCommercial(id: string): Promise<Commercial | undefined> {
    const result = await db.select().from(commercials).where(eq(commercials.id, id));
    return result[0];
  }

  async createCommercial(commercial: InsertCommercial): Promise<Commercial> {
    const result = await db.insert(commercials).values(commercial).returning();
    return result[0];
  }

  async updateCommercial(id: string, commercial: Partial<InsertCommercial>): Promise<Commercial | undefined> {
    const result = await db
      .update(commercials)
      .set({ ...commercial, updatedAt: new Date() })
      .where(eq(commercials.id, id))
      .returning();
    return result[0];
  }

  async deleteCommercial(id: string): Promise<boolean> {
    const result = await db.delete(commercials).where(eq(commercials.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateCommercialOrder(updates: { id: string; sortOrder: number }[]): Promise<void> {
    for (const update of updates) {
      await db
        .update(commercials)
        .set({ sortOrder: update.sortOrder, updatedAt: new Date() })
        .where(eq(commercials.id, update.id));
    }
  }

  async upsertCommercial(commercial: InsertCommercial & { id?: string }): Promise<{ commercial: Commercial; action: 'created' | 'updated' }> {
    // Try to find by ID first
    if (commercial.id) {
      const existing = await this.getCommercial(commercial.id);
      if (existing) {
        const updated = await this.updateCommercial(existing.id, commercial);
        if (!updated) throw new Error("Failed to update commercial");
        return { commercial: updated, action: 'updated' };
      }
    }
    
    // Try to find by title + imageUrl combination (natural key)
    const existing = await db
      .select()
      .from(commercials)
      .where(and(
        eq(commercials.title, commercial.title),
        eq(commercials.imageUrl, commercial.imageUrl)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      const updated = await this.updateCommercial(existing[0].id, commercial);
      if (!updated) throw new Error("Failed to update commercial");
      return { commercial: updated, action: 'updated' };
    }
    
    // Create new
    const created = await this.createCommercial(commercial);
    return { commercial: created, action: 'created' };
  }

  // Characteristics
  async searchCharacteristics(query?: string, category?: string): Promise<Characteristic[]> {
    let dbQuery = db.select().from(characteristics).orderBy(desc(characteristics.usageCount), characteristics.name);
    
    const conditions = [];
    
    // Filter by search query
    if (query) {
      conditions.push(ilike(characteristics.name, `%${query}%`));
    }
    
    // Filter by product category using array containment
    if (category) {
      conditions.push(sql`${characteristics.productTypes} @> ARRAY[${category}]::"category"[]`);
    }
    
    if (conditions.length > 0) {
      dbQuery = dbQuery.where(and(...conditions)) as any;
    }
    
    return await dbQuery;
  }

  async getCharacteristic(id: string): Promise<Characteristic | undefined> {
    const result = await db.select().from(characteristics).where(eq(characteristics.id, id));
    return result[0];
  }

  async getCharacteristicByName(name: string): Promise<Characteristic | undefined> {
    const result = await db.select().from(characteristics).where(eq(lower(characteristics.name), name.toLowerCase()));
    return result[0];
  }

  async createCharacteristic(name: string, productTypes?: string[]): Promise<Characteristic> {
    const values: any = { name };
    if (productTypes && productTypes.length > 0) {
      values.productTypes = productTypes;
    }
    const result = await db.insert(characteristics).values(values).returning();
    return result[0];
  }

  async getProductCharacteristics(productId: string): Promise<Characteristic[]> {
    const result = await db
      .select({
        id: characteristics.id,
        name: characteristics.name,
        productTypes: characteristics.productTypes,
        usageCount: characteristics.usageCount,
        createdAt: characteristics.createdAt,
        updatedAt: characteristics.updatedAt,
      })
      .from(productCharacteristics)
      .innerJoin(characteristics, eq(productCharacteristics.characteristicId, characteristics.id))
      .where(eq(productCharacteristics.productId, productId))
      .orderBy(characteristics.name);
    
    return result;
  }

  async setProductCharacteristics(productId: string, characteristicNames: string[], category?: string): Promise<void> {
    // Deduplicate names (case-insensitive)
    const uniqueNames = Array.from(
      new Map(characteristicNames.map(name => [name.toLowerCase().trim(), name.trim()])).values()
    ).filter(name => name.length > 0);
    
    // Get current characteristics for this product
    const currentCharacteristics = await this.getProductCharacteristics(productId);
    const currentNames = new Set(currentCharacteristics.map(c => c.name.toLowerCase()));
    
    // Calculate what to add and remove
    const newNames = new Set(uniqueNames.map(n => n.toLowerCase()));
    const toAdd = uniqueNames.filter(name => !currentNames.has(name.toLowerCase()));
    const toRemove = currentCharacteristics.filter(c => !newNames.has(c.name.toLowerCase()));
    
    // Remove characteristics that are no longer needed
    for (const characteristic of toRemove) {
      // Delete the link
      await db
        .delete(productCharacteristics)
        .where(
          and(
            eq(productCharacteristics.productId, productId),
            eq(productCharacteristics.characteristicId, characteristic.id)
          )
        );
      
      // Decrement usage count
      await db
        .update(characteristics)
        .set({ 
          usageCount: sql`GREATEST(0, ${characteristics.usageCount} - 1)`,
          updatedAt: new Date()
        })
        .where(eq(characteristics.id, characteristic.id));
    }
    
    // Add new characteristics
    for (const name of toAdd) {
      // Find or create characteristic
      let characteristic = await this.getCharacteristicByName(name);
      
      if (!characteristic) {
        // Create with category if provided, otherwise defaults to all types
        const productTypes = category ? [category as any] : undefined;
        characteristic = await this.createCharacteristic(name, productTypes);
      } else if (category && characteristic.productTypes) {
        // For existing characteristics, ensure current category is in productTypes
        if (!characteristic.productTypes.includes(category as any)) {
          const updatedProductTypes = [...characteristic.productTypes, category as any];
          await db
            .update(characteristics)
            .set({ 
              productTypes: updatedProductTypes as any,
              updatedAt: new Date()
            })
            .where(eq(characteristics.id, characteristic.id));
          
          // Update local object to reflect the change
          characteristic.productTypes = updatedProductTypes as any;
        }
      }
      
      // Link to product
      await db.insert(productCharacteristics).values({
        productId,
        characteristicId: characteristic.id,
      });
      
      // Increment usage count
      await db
        .update(characteristics)
        .set({ 
          usageCount: sql`${characteristics.usageCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(characteristics.id, characteristic.id));
    }
    
    // Clean up unused characteristics (usage count = 0)
    await db.delete(characteristics).where(eq(characteristics.usageCount, 0));
  }

  // B2B - Tier Pricing implementations
  async getAllTierPricing(category?: string): Promise<TierPricing[]> {
    if (category) {
      return db.select().from(tierPricing)
        .where(eq(tierPricing.category, category as any))
        .orderBy(tierPricing.sortOrder);
    }
    return db.select().from(tierPricing).orderBy(tierPricing.sortOrder);
  }

  async getTierPricing(id: string): Promise<TierPricing | undefined> {
    const [tier] = await db.select().from(tierPricing).where(eq(tierPricing.id, id));
    return tier;
  }

  async getTierPricingByNameNormalized(tierName: string, category?: string): Promise<TierPricing | undefined> {
    const normalized = tierName?.trim();
    if (!normalized) return undefined;
    
    const conditions = [buildLowerTrimEquals(tierPricing.tierName, normalized)];
    if (category) {
      conditions.push(eq(tierPricing.category, category as any));
    }
    
    const result = await db.select().from(tierPricing)
      .where(and(...conditions));
    return result[0];
  }

  async createTierPricing(data: InsertTierPricing): Promise<TierPricing> {
    const [tier] = await db.insert(tierPricing).values(data).returning();
    return tier;
  }

  async updateTierPricing(id: string, data: Partial<InsertTierPricing>): Promise<TierPricing | undefined> {
    const [tier] = await db
      .update(tierPricing)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tierPricing.id, id))
      .returning();
    return tier;
  }

  async toggleTierActive(id: string, active: boolean): Promise<TierPricing | undefined> {
    const [tier] = await db
      .update(tierPricing)
      .set({ active, updatedAt: new Date() })
      .where(eq(tierPricing.id, id))
      .returning();
    return tier;
  }

  async deleteTierPricing(id: string): Promise<boolean> {
    const result = await db.delete(tierPricing).where(eq(tierPricing.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async upsertTierPricing(data: InsertTierPricing): Promise<{ tierPricing: TierPricing; action: 'created' | 'updated' }> {
    if (!data.tierName) {
      throw new Error("tierName is required for upsert operation");
    }

    const existing = await this.getTierPricingByNameNormalized(data.tierName);
    
    if (existing) {
      const updated = await this.updateTierPricing(existing.id, data);
      if (!updated) {
        throw new Error("Failed to update tier pricing");
      }
      return { tierPricing: updated, action: 'updated' };
    } else {
      const created = await this.createTierPricing(data);
      return { tierPricing: created, action: 'created' };
    }
  }

  // B2B - Sales Reps implementations
  async getAllSalesReps(activeOnly = false): Promise<SalesRep[]> {
    if (activeOnly) {
      return db.select().from(salesReps).where(eq(salesReps.active, true));
    }
    return db.select().from(salesReps);
  }

  async getSalesRep(id: string): Promise<SalesRep | undefined> {
    const [rep] = await db.select().from(salesReps).where(eq(salesReps.id, id));
    return rep;
  }

  async getSalesRepByEmail(email: string): Promise<SalesRep | undefined> {
    const [rep] = await db.select().from(salesReps).where(eq(salesReps.email, email));
    return rep;
  }

  async getSalesRepByEmailNormalized(email: string): Promise<SalesRep | undefined> {
    const normalized = email?.trim();
    if (!normalized) return undefined;
    const result = await db.select().from(salesReps)
      .where(buildLowerTrimEquals(salesReps.email, normalized));
    return result[0];
  }

  async createSalesRep(data: InsertSalesRep): Promise<SalesRep> {
    const [rep] = await db.insert(salesReps).values(data).returning();
    return rep;
  }

  async updateSalesRep(id: string, data: Partial<InsertSalesRep>): Promise<SalesRep | undefined> {
    const [rep] = await db
      .update(salesReps)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(salesReps.id, id))
      .returning();
    return rep;
  }

  async deleteSalesRep(id: string): Promise<boolean> {
    const result = await db.delete(salesReps).where(eq(salesReps.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async upsertSalesRep(data: Omit<InsertSalesRep, 'passwordHash'> & { passwordHash?: string }): Promise<{ salesRep: SalesRep; action: 'created' | 'updated' }> {
    if (!data.email) {
      throw new Error("email is required for upsert operation");
    }

    const existing = await this.getSalesRepByEmailNormalized(data.email);
    
    if (existing) {
      // On update: preserve existing passwordHash, filter undefined fields
      const updateData = Object.fromEntries(
        Object.entries({ ...data, passwordHash: existing.passwordHash })
          .filter(([_, v]) => v !== undefined)
      ) as Partial<InsertSalesRep>;
      
      const updated = await this.updateSalesRep(existing.id, updateData);
      if (!updated) {
        throw new Error("Failed to update sales rep");
      }
      return { salesRep: updated, action: 'updated' };
    } else {
      // On create: allow creating without password (sales rep can use password reset)
      // Note: passwords are not exported for security, so new sales reps created during import
      // will not have passwords and must use password reset functionality
      const created = await this.createSalesRep(data as InsertSalesRep);
      return { salesRep: created, action: 'created' };
    }
  }

  // B2B - Admins implementations
  async getAllB2bAdmins(activeOnly = false): Promise<B2bAdmin[]> {
    if (activeOnly) {
      return db.select().from(b2bAdmins).where(eq(b2bAdmins.active, true));
    }
    return db.select().from(b2bAdmins);
  }

  async getB2bAdmin(id: string): Promise<B2bAdmin | undefined> {
    const [admin] = await db.select().from(b2bAdmins).where(eq(b2bAdmins.id, id));
    return admin;
  }

  async getB2bAdminByEmail(email: string): Promise<B2bAdmin | undefined> {
    const [admin] = await db.select().from(b2bAdmins).where(eq(b2bAdmins.email, email));
    return admin;
  }

  async createB2bAdmin(data: InsertB2bAdmin): Promise<B2bAdmin> {
    const [admin] = await db.insert(b2bAdmins).values(data).returning();
    return admin;
  }

  async updateB2bAdmin(id: string, data: Partial<InsertB2bAdmin>): Promise<B2bAdmin | undefined> {
    const [admin] = await db
      .update(b2bAdmins)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(b2bAdmins.id, id))
      .returning();
    return admin;
  }

  async deleteB2bAdmin(id: string): Promise<boolean> {
    const result = await db.delete(b2bAdmins).where(eq(b2bAdmins.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async upsertB2bAdmin(data: Omit<InsertB2bAdmin, 'passwordHash'> & { passwordHash?: string }): Promise<{ admin: B2bAdmin; action: 'created' | 'updated' }> {
    if (!data.email) {
      throw new Error("email is required for upsert operation");
    }

    const existing = await this.getB2bAdminByEmail(data.email);
    
    if (existing) {
      // On update: preserve existing passwordHash, filter undefined fields
      const updateData = Object.fromEntries(
        Object.entries({ ...data, passwordHash: existing.passwordHash })
          .filter(([_, v]) => v !== undefined)
      ) as Partial<InsertB2bAdmin>;
      
      const updated = await this.updateB2bAdmin(existing.id, updateData);
      if (!updated) {
        throw new Error("Failed to update B2B admin");
      }
      return { admin: updated, action: 'updated' };
    } else {
      // On create: allow creating without password (admin can use password reset)
      // Note: passwords are not exported for security, so new admins created during import
      // will not have passwords and must use password reset functionality
      const created = await this.createB2bAdmin(data as InsertB2bAdmin);
      return { admin: created, action: 'created' };
    }
  }

  // B2B - Customers implementations
  async getAllB2bCustomers(status?: string): Promise<(B2bCustomer & { tier?: TierPricing | null; salesRep?: SalesRep | null })[]> {
    const query = db
      .select({
        customer: b2bCustomers,
        tier: tierPricing,
        salesRep: salesReps,
      })
      .from(b2bCustomers)
      .leftJoin(tierPricing, eq(b2bCustomers.pricingTierId, tierPricing.id))
      .leftJoin(salesReps, eq(b2bCustomers.salesRepId, salesReps.id));

    const results = status
      ? await query.where(eq(b2bCustomers.accountStatus, status as any))
      : await query;

    return results.map(r => ({ ...r.customer, tier: r.tier, salesRep: r.salesRep }));
  }
  
  // Scoped version - only returns customers assigned to a specific sales rep
  async getB2bCustomersBySalesRep(salesRepId: string, status?: string): Promise<(B2bCustomer & { tier?: TierPricing | null; salesRep?: SalesRep | null })[]> {
    const query = db
      .select({
        customer: b2bCustomers,
        tier: tierPricing,
        salesRep: salesReps,
      })
      .from(b2bCustomers)
      .leftJoin(tierPricing, eq(b2bCustomers.pricingTierId, tierPricing.id))
      .leftJoin(salesReps, eq(b2bCustomers.salesRepId, salesReps.id));

    // Build where clause - always filter by salesRepId, optionally filter by status
    const results = status
      ? await query.where(and(eq(b2bCustomers.salesRepId, salesRepId), eq(b2bCustomers.accountStatus, status as any)))
      : await query.where(eq(b2bCustomers.salesRepId, salesRepId));

    return results.map(r => ({ ...r.customer, tier: r.tier, salesRep: r.salesRep }));
  }

  async getB2bCustomer(id: string): Promise<(B2bCustomer & { tier?: TierPricing | null; salesRep?: SalesRep | null }) | undefined> {
    const [result] = await db
      .select({
        customer: b2bCustomers,
        tier: tierPricing,
        salesRep: salesReps,
      })
      .from(b2bCustomers)
      .leftJoin(tierPricing, eq(b2bCustomers.pricingTierId, tierPricing.id))
      .leftJoin(salesReps, eq(b2bCustomers.salesRepId, salesReps.id))
      .where(eq(b2bCustomers.id, id));

    if (!result) return undefined;
    return { ...result.customer, tier: result.tier, salesRep: result.salesRep };
  }

  async getB2bCustomerByEmail(email: string): Promise<(B2bCustomer & { tier?: TierPricing | null; salesRep?: SalesRep | null }) | undefined> {
    const [result] = await db
      .select({
        customer: b2bCustomers,
        tier: tierPricing,
        salesRep: salesReps,
      })
      .from(b2bCustomers)
      .leftJoin(tierPricing, eq(b2bCustomers.pricingTierId, tierPricing.id))
      .leftJoin(salesReps, eq(b2bCustomers.salesRepId, salesReps.id))
      .where(eq(b2bCustomers.emailAddress, email));

    if (!result) return undefined;
    return { ...result.customer, tier: result.tier, salesRep: result.salesRep };
  }

  async getB2bCustomerCoreByEmail(email: string): Promise<B2bCustomer | undefined> {
    const normalized = email?.trim();
    if (!normalized) return undefined;
    const result = await db.select().from(b2bCustomers)
      .where(buildLowerTrimEquals(b2bCustomers.emailAddress, normalized));
    return result[0];
  }

  async createB2bCustomer(data: InsertB2bCustomer): Promise<B2bCustomer> {
    const [customer] = await db.insert(b2bCustomers).values(data).returning();
    return customer;
  }

  async updateB2bCustomer(id: string, data: Partial<InsertB2bCustomer>): Promise<B2bCustomer | undefined> {
    const [customer] = await db
      .update(b2bCustomers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(b2bCustomers.id, id))
      .returning();
    return customer;
  }

  async deleteB2bCustomer(id: string): Promise<boolean> {
    const result = await db.delete(b2bCustomers).where(eq(b2bCustomers.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async upsertB2bCustomer(data: Omit<InsertB2bCustomer, 'passwordHash'> & { passwordHash?: string }): Promise<{ customer: B2bCustomer; action: 'created' | 'updated' }> {
    if (!data.emailAddress) {
      throw new Error("emailAddress is required for upsert operation");
    }

    const existing = await this.getB2bCustomerCoreByEmail(data.emailAddress);
    
    if (existing) {
      // On update: preserve existing passwordHash, filter undefined fields
      const updateData = Object.fromEntries(
        Object.entries({ ...data, passwordHash: existing.passwordHash })
          .filter(([_, v]) => v !== undefined)
      ) as Partial<InsertB2bCustomer>;
      
      const updated = await this.updateB2bCustomer(existing.id, updateData);
      if (!updated) {
        throw new Error("Failed to update B2B customer");
      }
      return { customer: updated, action: 'updated' };
    } else {
      // On create: allow creating without password (customer can use password reset)
      // Note: passwords are not exported for security, so new customers created during import
      // will not have passwords and must use password reset functionality
      const created = await this.createB2bCustomer(data as InsertB2bCustomer);
      return { customer: created, action: 'created' };
    }
  }

  async approveB2bCustomer(id: string, tierId: string, passwordHash: string, approvedByAdminId: string | null): Promise<B2bCustomer | undefined> {
    const [customer] = await db
      .update(b2bCustomers)
      .set({
        accountStatus: 'active' as any,
        pricingTierId: tierId,
        passwordHash,
        approvedAt: new Date(),
        approvedByAdminId: approvedByAdminId || null,
        updatedAt: new Date(),
      })
      .where(eq(b2bCustomers.id, id))
      .returning();
    return customer;
  }

  // B2B - Customer Requests implementations
  async getB2bCustomerRequests(filters?: { status?: string; salesRepId?: string }): Promise<(B2bCustomerRequest & { salesRep: SalesRep; tier?: TierPricing | null })[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(b2bCustomerRequests.status, filters.status as any));
    }
    if (filters?.salesRepId) {
      conditions.push(eq(b2bCustomerRequests.submittedBySalesRepId, filters.salesRepId));
    }

    const results = await db
      .select({
        request: b2bCustomerRequests,
        salesRep: salesReps,
        tier: tierPricing,
      })
      .from(b2bCustomerRequests)
      .innerJoin(salesReps, eq(b2bCustomerRequests.submittedBySalesRepId, salesReps.id))
      .leftJoin(tierPricing, eq(b2bCustomerRequests.pricingTierId, tierPricing.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(b2bCustomerRequests.createdAt));

    return results.map(r => ({
      ...r.request,
      salesRep: r.salesRep,
      tier: r.tier,
    }));
  }

  async getB2bCustomerRequest(id: string): Promise<(B2bCustomerRequest & { salesRep: SalesRep; tier?: TierPricing | null }) | undefined> {
    const [result] = await db
      .select({
        request: b2bCustomerRequests,
        salesRep: salesReps,
        tier: tierPricing,
      })
      .from(b2bCustomerRequests)
      .innerJoin(salesReps, eq(b2bCustomerRequests.submittedBySalesRepId, salesReps.id))
      .leftJoin(tierPricing, eq(b2bCustomerRequests.pricingTierId, tierPricing.id))
      .where(eq(b2bCustomerRequests.id, id));

    if (!result) return undefined;
    return {
      ...result.request,
      salesRep: result.salesRep,
      tier: result.tier,
    };
  }

  async createB2bCustomerRequest(data: InsertB2bCustomerRequest): Promise<B2bCustomerRequest> {
    const [request] = await db.insert(b2bCustomerRequests).values(data).returning();
    return request;
  }

  async updateB2bCustomerRequest(id: string, data: Partial<InsertB2bCustomerRequest>): Promise<B2bCustomerRequest | undefined> {
    const [request] = await db
      .update(b2bCustomerRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(b2bCustomerRequests.id, id))
      .returning();
    return request;
  }

  async approveB2bCustomerRequest(id: string, adminId: string, tierId?: string): Promise<{ request: B2bCustomerRequest; customer: B2bCustomer }> {
    const request = await this.getB2bCustomerRequest(id);
    if (!request) {
      throw new Error('Customer request not found');
    }
    if (request.status !== 'pending') {
      throw new Error('Request is not pending');
    }

    // Use provided tierId or fall back to requested tier
    const finalTierId = tierId || request.pricingTierId;

    // Generate customer number
    const allCustomers = await this.getAllB2bCustomers();
    const customerNumber = `NV${String(allCustomers.length + 1).padStart(5, '0')}`;

    // Create the customer from the request data
    const [customer] = await db.insert(b2bCustomers).values({
      accountName: request.accountName,
      accountStatus: 'pending_approval' as any,
      customerType: request.customerType,
      licenseNumber: request.licenseNumber,
      taxId: request.taxId,
      primaryContactName: request.primaryContactName,
      primaryContactRole: request.primaryContactRole,
      customerNumber,
      emailAddress: request.emailAddress,
      phoneNumber: request.phoneNumber,
      altPhoneNumber: request.altPhoneNumber,
      billingAddress: request.billingAddress,
      billingCity: request.billingCity,
      billingState: request.billingState,
      billingZipCode: request.billingZipCode,
      shippingAddress: request.shippingAddress,
      shippingCity: request.shippingCity,
      shippingState: request.shippingState,
      shippingZipCode: request.shippingZipCode,
      pricingTierId: finalTierId,
      salesRepId: request.submittedBySalesRepId,
      notes: request.notes,
    }).returning();

    // Update the request to approved
    const [updatedRequest] = await db
      .update(b2bCustomerRequests)
      .set({
        status: 'approved' as any,
        reviewedByAdminId: adminId,
        reviewedAt: new Date(),
        createdCustomerId: customer.id,
        updatedAt: new Date(),
      })
      .where(eq(b2bCustomerRequests.id, id))
      .returning();

    return { request: updatedRequest, customer };
  }

  async rejectB2bCustomerRequest(id: string, adminId: string, reason: string): Promise<B2bCustomerRequest | undefined> {
    const [request] = await db
      .update(b2bCustomerRequests)
      .set({
        status: 'rejected' as any,
        reviewedByAdminId: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(b2bCustomerRequests.id, id))
      .returning();
    return request;
  }

  // B2B - Customer Locations implementations
  async getAllB2bCustomerLocations(): Promise<B2bCustomerLocation[]> {
    return db.select().from(b2bCustomerLocations).orderBy(b2bCustomerLocations.customerId, b2bCustomerLocations.storeName);
  }

  async getCustomerLocations(customerId: string): Promise<B2bCustomerLocation[]> {
    return db
      .select()
      .from(b2bCustomerLocations)
      .where(eq(b2bCustomerLocations.customerId, customerId))
      .orderBy(desc(b2bCustomerLocations.isPrimary), b2bCustomerLocations.storeName);
  }

  async getCustomerLocation(id: string): Promise<B2bCustomerLocation | undefined> {
    const [location] = await db
      .select()
      .from(b2bCustomerLocations)
      .where(eq(b2bCustomerLocations.id, id));
    return location;
  }

  async createCustomerLocation(data: InsertB2bCustomerLocation): Promise<B2bCustomerLocation> {
    const [location] = await db.insert(b2bCustomerLocations).values(data).returning();
    return location;
  }

  async updateCustomerLocation(id: string, data: Partial<InsertB2bCustomerLocation>): Promise<B2bCustomerLocation | undefined> {
    const [location] = await db
      .update(b2bCustomerLocations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(b2bCustomerLocations.id, id))
      .returning();
    return location;
  }

  async deleteCustomerLocation(id: string): Promise<boolean> {
    const result = await db.delete(b2bCustomerLocations).where(eq(b2bCustomerLocations.id, id)).returning();
    return result.length > 0;
  }

  async upsertCustomerLocation(data: InsertB2bCustomerLocation & { id?: string }): Promise<{ location: B2bCustomerLocation; action: 'created' | 'updated' }> {
    if (data.id) {
      const existing = await this.getCustomerLocation(data.id);
      if (existing) {
        const updated = await this.updateCustomerLocation(data.id, data);
        if (!updated) {
          throw new Error("Failed to update customer location");
        }
        return { location: updated, action: 'updated' };
      }
    }
    const created = await this.createCustomerLocation(data);
    return { location: created, action: 'created' };
  }

  // B2B - Customer Manual Products (Featured Products for Where to Buy)
  async getCustomerManualProducts(customerId: string): Promise<(B2bCustomerManualProduct & { product: Product })[]> {
    const results = await db
      .select({
        manualProduct: b2bCustomerManualProducts,
        product: products,
      })
      .from(b2bCustomerManualProducts)
      .innerJoin(products, eq(b2bCustomerManualProducts.productId, products.id))
      .where(eq(b2bCustomerManualProducts.customerId, customerId))
      .orderBy(desc(b2bCustomerManualProducts.createdAt));

    return results.map(r => ({ ...r.manualProduct, product: r.product }));
  }

  async addCustomerManualProduct(customerId: string, productId: string, expiresAt: Date): Promise<B2bCustomerManualProduct> {
    // Validate that the product exists before inserting (defense-in-depth)
    const [productExists] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    
    if (!productExists) {
      throw new Error(`Cannot add Featured Product: Product ID "${productId}" does not exist`);
    }

    // Check if already exists
    const [existing] = await db
      .select()
      .from(b2bCustomerManualProducts)
      .where(
        and(
          eq(b2bCustomerManualProducts.customerId, customerId),
          eq(b2bCustomerManualProducts.productId, productId)
        )
      );

    if (existing) {
      // Update expiry date
      const [updated] = await db
        .update(b2bCustomerManualProducts)
        .set({ expiresAt, assignedAt: new Date() })
        .where(eq(b2bCustomerManualProducts.id, existing.id))
        .returning();
      return updated;
    }

    // Create new
    const [created] = await db
      .insert(b2bCustomerManualProducts)
      .values({
        customerId,
        productId,
        expiresAt,
        assignedAt: new Date(),
      })
      .returning();
    return created;
  }

  async addCustomerManualProducts(customerId: string, productIds: string[], expiresAt: Date): Promise<B2bCustomerManualProduct[]> {
    const results: B2bCustomerManualProduct[] = [];
    for (const productId of productIds) {
      const result = await this.addCustomerManualProduct(customerId, productId, expiresAt);
      results.push(result);
    }
    return results;
  }

  async removeCustomerManualProduct(id: string): Promise<boolean> {
    const result = await db
      .delete(b2bCustomerManualProducts)
      .where(eq(b2bCustomerManualProducts.id, id))
      .returning();
    return result.length > 0;
  }

  async removeAllCustomerManualProducts(customerId: string): Promise<boolean> {
    await db
      .delete(b2bCustomerManualProducts)
      .where(eq(b2bCustomerManualProducts.customerId, customerId));
    return true;
  }

  // Get raw manual products without joining to products table (includes orphaned records)
  async getCustomerManualProductsRaw(customerId: string): Promise<B2bCustomerManualProduct[]> {
    return await db
      .select()
      .from(b2bCustomerManualProducts)
      .where(eq(b2bCustomerManualProducts.customerId, customerId))
      .orderBy(desc(b2bCustomerManualProducts.createdAt));
  }

  // Remove orphaned manual products (where product_id doesn't exist in products table)
  async cleanupOrphanedManualProducts(customerId: string): Promise<number> {
    // Find all manual products for this customer that don't have a matching product
    const orphaned = await db
      .select({ id: b2bCustomerManualProducts.id })
      .from(b2bCustomerManualProducts)
      .leftJoin(products, eq(b2bCustomerManualProducts.productId, products.id))
      .where(
        and(
          eq(b2bCustomerManualProducts.customerId, customerId),
          isNull(products.id)
        )
      );

    if (orphaned.length === 0) {
      return 0;
    }

    // Delete the orphaned records
    for (const record of orphaned) {
      await db
        .delete(b2bCustomerManualProducts)
        .where(eq(b2bCustomerManualProducts.id, record.id));
    }

    return orphaned.length;
  }

  // B2B - Orders implementations
  async getAllB2bOrders(): Promise<(B2bOrder & { customer: B2bCustomer })[]> {
    const results = await db
      .select({
        order: b2bOrders,
        customer: b2bCustomers,
      })
      .from(b2bOrders)
      .innerJoin(b2bCustomers, eq(b2bOrders.customerId, b2bCustomers.id))
      .orderBy(desc(b2bOrders.orderDate));

    return results.map(r => ({ ...r.order, customer: r.customer }));
  }
  
  // Scoped version - only returns orders for customers assigned to a specific sales rep
  async getB2bOrdersBySalesRep(salesRepId: string): Promise<(B2bOrder & { customer: B2bCustomer })[]> {
    const results = await db
      .select({
        order: b2bOrders,
        customer: b2bCustomers,
      })
      .from(b2bOrders)
      .innerJoin(b2bCustomers, eq(b2bOrders.customerId, b2bCustomers.id))
      .where(eq(b2bCustomers.salesRepId, salesRepId))
      .orderBy(desc(b2bOrders.orderDate));

    return results.map(r => ({ ...r.order, customer: r.customer }));
  }

  async getB2bOrders(customerId: string): Promise<(B2bOrder & { items: (B2bOrderItem & { product: Product })[] })[]> {
    const orders = await db
      .select()
      .from(b2bOrders)
      .where(eq(b2bOrders.customerId, customerId))
      .orderBy(desc(b2bOrders.orderDate));

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await db
          .select({
            item: b2bOrderItems,
            product: products,
          })
          .from(b2bOrderItems)
          .innerJoin(products, eq(b2bOrderItems.productId, products.id))
          .where(eq(b2bOrderItems.orderId, order.id));

        return {
          ...order,
          items: items.map(i => ({ ...i.item, product: i.product })),
        };
      })
    );

    return ordersWithItems;
  }

  async getB2bOrder(id: string): Promise<(B2bOrder & { customer: B2bCustomer; items: (B2bOrderItem & { product: Product })[] }) | undefined> {
    const [result] = await db
      .select({
        order: b2bOrders,
        customer: b2bCustomers,
      })
      .from(b2bOrders)
      .innerJoin(b2bCustomers, eq(b2bOrders.customerId, b2bCustomers.id))
      .where(eq(b2bOrders.id, id));

    if (!result) return undefined;

    const items = await db
      .select({
        item: b2bOrderItems,
        product: products,
      })
      .from(b2bOrderItems)
      .innerJoin(products, eq(b2bOrderItems.productId, products.id))
      .where(eq(b2bOrderItems.orderId, id));

    return {
      ...result.order,
      customer: result.customer,
      items: items.map(i => ({ ...i.item, product: i.product })),
    };
  }

  async getB2bOrderByNumberNormalized(orderNumber: string): Promise<B2bOrder | undefined> {
    const normalized = orderNumber?.trim();
    if (!normalized) return undefined;
    const result = await db.select().from(b2bOrders)
      .where(buildLowerTrimEquals(b2bOrders.orderNumber, normalized));
    return result[0];
  }

  async createB2bOrder(orderData: InsertB2bOrder, items: InsertB2bOrderItem[]): Promise<B2bOrder> {
    const [order] = await db.insert(b2bOrders).values(orderData).returning();

    if (items.length > 0) {
      const itemsWithOrderId = items.map(item => ({ ...item, orderId: order.id }));
      await db.insert(b2bOrderItems).values(itemsWithOrderId);
    }

    // Update customer's last order date and total purchase value
    await db
      .update(b2bCustomers)
      .set({
        lastOrderDate: new Date(),
        totalPurchaseValue: sql`${b2bCustomers.totalPurchaseValue} + ${orderData.total}`,
        updatedAt: new Date(),
      })
      .where(eq(b2bCustomers.id, orderData.customerId));

    return order;
  }

  async updateB2bOrder(id: string, data: Partial<InsertB2bOrder>): Promise<B2bOrder | undefined> {
    const [order] = await db
      .update(b2bOrders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(b2bOrders.id, id))
      .returning();
    return order;
  }

  async updateB2bOrderStatus(id: string, status: string): Promise<B2bOrder | undefined> {
    const updateData: any = { status, updatedAt: new Date() };
    
    if (status === 'awaiting_payment') {
      updateData.deliveredAt = new Date();
    } else if (status === 'completed') {
      updateData.paidAt = new Date();
      updateData.completedAt = new Date();
    }

    const [order] = await db
      .update(b2bOrders)
      .set(updateData)
      .where(eq(b2bOrders.id, id))
      .returning();
    return order;
  }

  async deleteB2bOrder(id: string): Promise<boolean> {
    const result = await db.delete(b2bOrders).where(eq(b2bOrders.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async upsertB2bOrder(orderData: InsertB2bOrder, items: InsertB2bOrderItem[]): Promise<{ order: B2bOrder; action: 'created' | 'updated' }> {
    if (!orderData.orderNumber) {
      throw new Error("orderNumber is required for upsert operation");
    }

    const existing = await this.getB2bOrderByNumberNormalized(orderData.orderNumber);
    
    if (existing) {
      // Update existing order with transaction
      const updated = await db.transaction(async (tx) => {
        // 1. Re-select with FOR UPDATE lock
        const [currentOrder] = await tx.select()
          .from(b2bOrders)
          .where(eq(b2bOrders.id, existing.id))
          .for('update');
        
        // 2. Recalculate totals from item quantities and prices (don't trust caller)
        const subtotal = items.reduce((sum, item) => {
          const qty = item.quantity || 0;
          const price = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : (item.unitPrice || 0);
          return sum + (qty * price);
        }, 0);
        const taxAmount = typeof orderData.tax === 'string' ? parseFloat(orderData.tax) : (orderData.tax || 0);
        const total = subtotal + taxAmount;
        
        // 3. Validate non-empty items for positive totals
        if (total > 0 && items.length === 0) {
          throw new Error("Order cannot have positive total with zero items");
        }
        
        // 4. Delete existing items
        await tx.delete(b2bOrderItems).where(eq(b2bOrderItems.orderId, existing.id));
        
        // 5. Insert new items (if any) with recalculated lineTotals
        if (items.length > 0) {
          await tx.insert(b2bOrderItems).values(
            items.map(item => {
              const qty = item.quantity || 0;
              const price = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : (item.unitPrice || 0);
              return {
                ...item,
                orderId: existing.id,
                lineTotal: (qty * price).toString(),  // Convert to string for decimal column
              };
            })
          );
        }
        
        // 6. Update order with recalculated totals
        const [updatedOrder] = await tx.update(b2bOrders)
          .set({
            ...orderData,
            subtotal: subtotal.toString(),  // Convert to string for decimal column
            total: total.toString(),
            updatedAt: new Date(),
          })
          .where(eq(b2bOrders.id, existing.id))
          .returning();
        
        // 7. Handle customer totals
        const oldTotal = typeof currentOrder.total === 'string' ? parseFloat(currentOrder.total) : currentOrder.total;
        
        if (currentOrder.customerId !== orderData.customerId) {
          // Customer changed - decrement old (use OLD total), increment new (use NEW total)
          await tx.update(b2bCustomers)
            .set({
              totalPurchaseValue: sql`${b2bCustomers.totalPurchaseValue} - ${oldTotal}`,
              updatedAt: new Date(),
            })
            .where(eq(b2bCustomers.id, currentOrder.customerId));
          
          await tx.update(b2bCustomers)
            .set({
              totalPurchaseValue: sql`${b2bCustomers.totalPurchaseValue} + ${total}`,
              lastOrderDate: sql`GREATEST(${b2bCustomers.lastOrderDate}, NOW())`,
              updatedAt: new Date(),
            })
            .where(eq(b2bCustomers.id, orderData.customerId));
        } else {
          // Same customer - apply delta (NEW total - OLD total)
          const delta = total - oldTotal;
          await tx.update(b2bCustomers)
            .set({
              totalPurchaseValue: sql`${b2bCustomers.totalPurchaseValue} + ${delta}`,
              lastOrderDate: sql`GREATEST(${b2bCustomers.lastOrderDate}, NOW())`,
              updatedAt: new Date(),
            })
            .where(eq(b2bCustomers.id, orderData.customerId));
        }
        
        // 8. Return rehydrated order with items
        const itemsResult = await tx.select()
          .from(b2bOrderItems)
          .where(eq(b2bOrderItems.orderId, existing.id));
        
        return updatedOrder;
      });
      
      return { order: updated, action: 'updated' };
    } else {
      // Create new order (createB2bOrder already handles transaction)
      const created = await this.createB2bOrder(orderData, items);
      return { order: created, action: 'created' };
    }
  }

  async getCustomerPreviousProducts(customerId: string): Promise<Product[]> {
    const items = await db
      .selectDistinct({ product: products })
      .from(b2bOrderItems)
      .innerJoin(b2bOrders, eq(b2bOrderItems.orderId, b2bOrders.id))
      .innerJoin(products, eq(b2bOrderItems.productId, products.id))
      .where(eq(b2bOrders.customerId, customerId));

    return items.map(i => i.product);
  }

  // B2B - Settings implementations
  async getB2bSetting(key: string): Promise<B2bSetting | undefined> {
    const [setting] = await db
      .select()
      .from(b2bSettings)
      .where(eq(b2bSettings.settingKey, key));
    return setting;
  }

  async setB2bSetting(key: string, value: string): Promise<B2bSetting> {
    const [setting] = await db
      .insert(b2bSettings)
      .values({ settingKey: key, settingValue: value })
      .onConflictDoUpdate({
        target: b2bSettings.settingKey,
        set: { settingValue: value, updatedAt: new Date() },
      })
      .returning();
    return setting;
  }

  async getAllB2bSettings(): Promise<B2bSetting[]> {
    return db.select().from(b2bSettings);
  }
  
  // B2B Role Permissions implementations
  async getAllB2bRolePermissions(): Promise<B2bRolePermission[]> {
    return db.select().from(b2bRolePermissions);
  }
  
  async getB2bRolePermission(roleName: string): Promise<B2bRolePermission | undefined> {
    const [permission] = await db
      .select()
      .from(b2bRolePermissions)
      .where(eq(b2bRolePermissions.roleName, roleName));
    return permission;
  }
  
  async upsertB2bRolePermission(data: InsertB2bRolePermission): Promise<B2bRolePermission> {
    const [permission] = await db
      .insert(b2bRolePermissions)
      .values(data)
      .onConflictDoUpdate({
        target: b2bRolePermissions.roleName,
        set: {
          roleDisplayName: data.roleDisplayName,
          roleDescription: data.roleDescription,
          tabPermissions: data.tabPermissions,
          specialPermissions: data.specialPermissions,
          updatedAt: new Date(),
          updatedByAdminId: data.updatedByAdminId,
        },
      })
      .returning();
    return permission;
  }
  
  async initializeDefaultRolePermissions(): Promise<void> {
    const defaultRoles = [
      {
        roleName: 'admin',
        roleDisplayName: 'Admin',
        roleDescription: 'Full access to all features and settings',
        tabPermissions: {
          customers: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          orders: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          tasks: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          exportImport: { canView: true, canCreate: true, canEdit: true },
          marketing: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          commitments: { canView: true, canCreate: true, canEdit: true },
          qrCodes: { canView: true, canCreate: true },
          slideshow: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          notes: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          payroll: { canView: true, canCreate: true, canEdit: true },
          commissions: { canView: true, canCreate: true, canEdit: true },
          salesReps: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          settings: { canView: true, canCreate: true, canEdit: true },
        },
        specialPermissions: {
          canApproveCustomers: true,
          canManageAdmins: true,
          canManageTiers: true,
          canChangePayrollSettings: true,
          canSendPayroll: true,
          canAssignPayPeriods: true,
          canEditWelcomeStatement: true,
          canImpersonateCustomers: true,
          canManagePermissions: true,
        },
        isDefault: true,
      },
      {
        roleName: 'sales_rep',
        roleDisplayName: 'Sales Rep',
        roleDescription: 'Limited access focused on assigned customers and orders',
        tabPermissions: {
          customers: { canView: true, canCreate: true, canEdit: true, canDelete: false, scopeToAssigned: true },
          orders: { canView: true, canCreate: true, canEdit: false, canDelete: false, scopeToAssigned: true },
          tasks: { canView: false },
          exportImport: { canView: false },
          marketing: { canView: true, canCreate: false, canEdit: false },
          commitments: { canView: true, canCreate: false, canEdit: false },
          qrCodes: { canView: true, canCreate: false },
          slideshow: { canView: false },
          notes: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          payroll: { canView: false },
          commissions: { canView: true, canCreate: false, canEdit: false, scopeToAssigned: true },
          salesReps: { canView: true, canCreate: false, canEdit: false, viewOwnOnly: true },
          settings: { canView: false },
        },
        specialPermissions: {
          canApproveCustomers: false,
          canManageAdmins: false,
          canManageTiers: false,
          canChangePayrollSettings: false,
          canSendPayroll: false,
          canAssignPayPeriods: false,
          canEditWelcomeStatement: false,
          canImpersonateCustomers: false,
          canManagePermissions: false,
        },
        isDefault: true,
      },
      {
        roleName: 'power_user',
        roleDisplayName: 'Power User',
        roleDescription: 'Extended access but cannot manage other users or sensitive settings',
        tabPermissions: {
          customers: { canView: true, canCreate: true, canEdit: true, canDelete: false },
          orders: { canView: true, canCreate: true, canEdit: true, canDelete: false },
          tasks: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          exportImport: { canView: true, canCreate: true, canEdit: true },
          marketing: { canView: true, canCreate: true, canEdit: true, canDelete: false },
          commitments: { canView: true, canCreate: true, canEdit: true },
          qrCodes: { canView: true, canCreate: true },
          slideshow: { canView: true, canCreate: true, canEdit: true, canDelete: false },
          notes: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          payroll: { canView: true, canCreate: false, canEdit: false },
          commissions: { canView: true, canCreate: false, canEdit: false },
          salesReps: { canView: true, canCreate: false, canEdit: false },
          settings: { canView: true, canCreate: false, canEdit: false },
        },
        specialPermissions: {
          canApproveCustomers: true,
          canManageAdmins: false,
          canManageTiers: false,
          canChangePayrollSettings: false,
          canSendPayroll: false,
          canAssignPayPeriods: false,
          canEditWelcomeStatement: false,
          canImpersonateCustomers: true,
          canManagePermissions: false,
        },
        isDefault: true,
      },
      {
        roleName: 'view_only',
        roleDisplayName: 'View Only',
        roleDescription: 'Read-only access across the platform',
        tabPermissions: {
          customers: { canView: true, canCreate: false, canEdit: false, canDelete: false },
          orders: { canView: true, canCreate: false, canEdit: false, canDelete: false },
          tasks: { canView: true, canCreate: false, canEdit: false, canDelete: false },
          exportImport: { canView: false },
          marketing: { canView: true, canCreate: false, canEdit: false },
          commitments: { canView: true, canCreate: false, canEdit: false },
          qrCodes: { canView: true, canCreate: false },
          slideshow: { canView: true, canCreate: false, canEdit: false },
          notes: { canView: true, canCreate: false, canEdit: false },
          payroll: { canView: true, canCreate: false, canEdit: false },
          commissions: { canView: true, canCreate: false, canEdit: false },
          salesReps: { canView: true, canCreate: false, canEdit: false },
          settings: { canView: true, canCreate: false, canEdit: false },
        },
        specialPermissions: {
          canApproveCustomers: false,
          canManageAdmins: false,
          canManageTiers: false,
          canChangePayrollSettings: false,
          canSendPayroll: false,
          canAssignPayPeriods: false,
          canEditWelcomeStatement: false,
          canImpersonateCustomers: false,
          canManagePermissions: false,
        },
        isDefault: true,
      },
    ];
    
    for (const role of defaultRoles) {
      await this.upsertB2bRolePermission(role);
    }
  }
  
  async getAllB2bSlideshowSlides(): Promise<B2bSlideshowSlide[]> {
    return db.select().from(b2bSlideshowSlides).orderBy(b2bSlideshowSlides.sortOrder);
  }

  async getB2bSlideshowSlideByTitle(title: string): Promise<B2bSlideshowSlide | undefined> {
    const [slide] = await db
      .select()
      .from(b2bSlideshowSlides)
      .where(eq(b2bSlideshowSlides.title, title));
    return slide;
  }

  async upsertB2bSlideshowSlide(data: InsertB2bSlideshowSlide): Promise<{ slide: B2bSlideshowSlide; action: 'created' | 'updated' }> {
    if (!data.title) {
      throw new Error("title is required for upsert operation");
    }

    const existing = await this.getB2bSlideshowSlideByTitle(data.title);
    
    if (existing) {
      // Update existing slide
      const [updated] = await db
        .update(b2bSlideshowSlides)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(b2bSlideshowSlides.id, existing.id))
        .returning();
      
      if (!updated) {
        throw new Error("Failed to update B2B slideshow slide");
      }
      return { slide: updated, action: 'updated' };
    } else {
      // Create new slide
      const [created] = await db
        .insert(b2bSlideshowSlides)
        .values(data)
        .returning();
      
      return { slide: created, action: 'created' };
    }
  }

  // B2B - Tier Commitment tracking
  async getTierCommitmentReport(): Promise<any[]> {
    // Get all signed tier agreements with their customer and tier info
    const signedAgreements = await db
      .select({
        agreementId: b2bTierAgreements.id,
        customerId: b2bTierAgreements.customerId,
        businessName: b2bTierAgreements.businessName,
        email: b2bTierAgreements.email,
        tierId: b2bTierAgreements.tierId,
        signatureName: b2bTierAgreements.signatureName,
        signedAt: b2bTierAgreements.signedAt,
        fiscalYearStart: b2bTierAgreements.fiscalYearStart,
        fiscalYearEnd: b2bTierAgreements.fiscalYearEnd,
        status: b2bTierAgreements.status,
      })
      .from(b2bTierAgreements)
      .where(
        and(
          eq(b2bTierAgreements.status, 'active'),
          sql`${b2bTierAgreements.signedAt} IS NOT NULL`
        )
      );
    
    console.log('[Commitment Report] Found', signedAgreements.length, 'signed agreements');
    
    // Create a map of signed agreements by customer ID
    const signedAgreementMap = new Map(signedAgreements.map(a => [a.customerId, a]));
    
    // Get all active customers with Tier 3 or Tier 4 (commitment tiers)
    const customers = await db
      .select({
        id: b2bCustomers.id,
        accountName: b2bCustomers.accountName,
        emailAddress: b2bCustomers.emailAddress,
        accountStatus: b2bCustomers.accountStatus,
        commitmentStartDate: b2bCustomers.commitmentStartDate,
        pricingTierId: b2bCustomers.pricingTierId,
        tierName: tierPricing.tierName,
        discountPercentage: tierPricing.discountPercentage,
        commitmentCases: tierPricing.commitmentCases,
      })
      .from(b2bCustomers)
      .innerJoin(tierPricing, eq(b2bCustomers.pricingTierId, tierPricing.id))
      .where(
        and(
          eq(b2bCustomers.accountStatus, 'active'),
          gt(tierPricing.commitmentCases, 0)
        )
      );
    
    console.log('[Commitment Report] Found', customers.length, 'customers with commitment tiers');
    
    // Combine customers from tier pricing and signed agreements
    const customerIds = new Set(customers.map(c => c.id));
    
    // Add customers from signed agreements that aren't already in the list
    for (const agreement of signedAgreements) {
      if (!customerIds.has(agreement.customerId)) {
        // Get tier info for this agreement
        if (agreement.tierId) {
          const tier = await this.getTierPricing(agreement.tierId);
          if (tier && tier.commitmentCases && tier.commitmentCases > 0) {
            const customer = await this.getB2bCustomer(agreement.customerId);
            if (customer && customer.accountStatus === 'active') {
              customers.push({
                id: customer.id,
                accountName: customer.accountName,
                emailAddress: customer.emailAddress,
                accountStatus: customer.accountStatus,
                commitmentStartDate: customer.commitmentStartDate,
                pricingTierId: tier.id,
                tierName: tier.tierName,
                discountPercentage: tier.discountPercentage,
                commitmentCases: tier.commitmentCases,
              });
              customerIds.add(customer.id);
            }
          }
        }
      }
    }
    
    // Create agreement map for date lookups
    const agreementMap = signedAgreementMap;

    const report = await Promise.all(
      customers.map(async (customer) => {
        // Get commitment dates from agreement if available, otherwise from customer
        const agreement = agreementMap.get(customer.id);
        let startDate: Date | null = null;
        let endDate: Date | null = null;
        
        if (agreement?.fiscalYearStart) {
          startDate = new Date(agreement.fiscalYearStart);
          endDate = agreement.fiscalYearEnd ? new Date(agreement.fiscalYearEnd) : null;
        } else if (customer.commitmentStartDate) {
          startDate = new Date(customer.commitmentStartDate);
        }
        
        // If no start date yet, still include in report but with limited data
        if (!startDate) {
          return {
            ...customer,
            casesPurchased: 0,
            casesRemaining: customer.commitmentCases || 0,
            monthsLeft: 12, // Full year ahead
            commitmentEndDate: null,
            percentComplete: 0,
            needsStartDate: true,
          };
        }
        
        // Calculate end date if not set (1 year from start)
        if (!endDate) {
          endDate = new Date(startDate);
          endDate.setFullYear(endDate.getFullYear() + 1);
        }

        const now = new Date();
        const monthsLeft = Math.max(
          0,
          Math.round((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30))
        );

        // Only count orders that are approved (awaiting_delivery, awaiting_payment, or completed)
        const orderItems = await db
          .select({
            quantity: b2bOrderItems.quantity,
            caseSize: products.caseSize,
          })
          .from(b2bOrderItems)
          .innerJoin(b2bOrders, eq(b2bOrderItems.orderId, b2bOrders.id))
          .innerJoin(products, eq(b2bOrderItems.productId, products.id))
          .where(
            and(
              eq(b2bOrders.customerId, customer.id),
              sql`${b2bOrders.orderDate} >= ${startDate}`,
              sql`${b2bOrders.orderDate} <= ${endDate}`,
              sql`${b2bOrders.status} IN ('awaiting_delivery', 'awaiting_payment', 'completed')`
            )
          );

        const casesPurchased = orderItems.reduce((total, item) => {
          // quantity already represents cases in B2B orders
          return total + item.quantity;
        }, 0);

        const commitmentCases = customer.commitmentCases || 0;
        const casesRemaining = Math.max(0, commitmentCases - casesPurchased);
        const percentComplete = commitmentCases > 0 
          ? Math.round((casesPurchased / commitmentCases) * 100) 
          : 0;

        return {
          ...customer,
          casesPurchased,
          casesRemaining,
          monthsLeft,
          commitmentStartDate: startDate,
          commitmentEndDate: endDate,
          percentComplete,
          needsStartDate: false,
        };
      })
    );

    return report.sort((a, b) => {
      if (a.tierName && b.tierName) {
        return a.tierName.localeCompare(b.tierName);
      }
      return 0;
    });
  }

  async getCustomersNeedingRenewalReminders(daysBeforeRenewal: number = 60): Promise<any[]> {
    const customers = await db
      .select({
        id: b2bCustomers.id,
        accountName: b2bCustomers.accountName,
        emailAddress: b2bCustomers.emailAddress,
        primaryContactName: b2bCustomers.primaryContactName,
        commitmentStartDate: b2bCustomers.commitmentStartDate,
        acceptsMarketing: b2bCustomers.acceptsMarketing,
        tierName: tierPricing.tierName,
        commitmentCases: tierPricing.commitmentCases,
      })
      .from(b2bCustomers)
      .leftJoin(tierPricing, eq(b2bCustomers.pricingTierId, tierPricing.id))
      .where(
        and(
          eq(b2bCustomers.accountStatus, 'active'),
          sql`${b2bCustomers.commitmentStartDate} IS NOT NULL`,
          sql`${tierPricing.commitmentCases} > 0`
        )
      );

    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysBeforeRenewal);

    const customersNeedingReminders = await Promise.all(
      customers.map(async (customer) => {
        if (!customer.commitmentStartDate) return null;

        const startDate = new Date(customer.commitmentStartDate);
        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);

        const daysUntilRenewal = Math.round(
          (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilRenewal < 0 || daysUntilRenewal > daysBeforeRenewal) {
          return null;
        }

        const orderItems = await db
          .select({
            quantity: b2bOrderItems.quantity,
            caseSize: products.caseSize,
          })
          .from(b2bOrderItems)
          .innerJoin(b2bOrders, eq(b2bOrderItems.orderId, b2bOrders.id))
          .innerJoin(products, eq(b2bOrderItems.productId, products.id))
          .where(
            and(
              eq(b2bOrders.customerId, customer.id),
              sql`${b2bOrders.orderDate} >= ${startDate}`,
              sql`${b2bOrders.orderDate} <= ${endDate}`
            )
          );

        const casesPurchased = orderItems.reduce((total, item) => {
          // quantity already represents cases in B2B orders
          return total + item.quantity;
        }, 0);

        const casesRemaining = Math.max(0, (customer.commitmentCases || 0) - casesPurchased);

        return {
          ...customer,
          casesPurchased,
          casesRemaining,
          daysUntilRenewal,
          commitmentEndDate: endDate,
        };
      })
    );

    return customersNeedingReminders.filter((c) => c !== null);
  }

  async updateCustomerCommitmentStartDate(customerId: string, startDate: Date): Promise<B2bCustomer | undefined> {
    const [updated] = await db
      .update(b2bCustomers)
      .set({
        commitmentStartDate: startDate,
        updatedAt: new Date(),
      })
      .where(eq(b2bCustomers.id, customerId))
      .returning();
    
    return updated;
  }

  async getWhereToBuyLocations(): Promise<any[]> {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const now = new Date();

    // Get all store locations that are set to show on Where to Buy page, joined with active customers
    // Only include retail_liquor and restaurant customer types
    // Also join tier pricing to get tier information for sorting/highlighting
    const allLocations = await db
      .select({
        id: b2bCustomerLocations.id,
        customerId: b2bCustomerLocations.customerId,
        storeName: b2bCustomerLocations.storeName,
        storeAddress: b2bCustomerLocations.storeAddress,
        storeCity: b2bCustomerLocations.storeCity,
        storeState: b2bCustomerLocations.storeState,
        storeZipCode: b2bCustomerLocations.storeZipCode,
        storePhone: b2bCustomerLocations.storePhone,
        website: b2bCustomerLocations.website,
        latitude: b2bCustomerLocations.latitude,
        longitude: b2bCustomerLocations.longitude,
        accountName: b2bCustomers.accountName,
        customerType: b2bCustomers.customerType,
        pricingTierId: b2bCustomers.pricingTierId,
        tierName: tierPricing.tierName,
        tierSortOrder: tierPricing.sortOrder,
      })
      .from(b2bCustomerLocations)
      .innerJoin(b2bCustomers, eq(b2bCustomerLocations.customerId, b2bCustomers.id))
      .leftJoin(tierPricing, eq(b2bCustomers.pricingTierId, tierPricing.id))
      .where(
        and(
          eq(b2bCustomers.accountStatus, 'active'),
          eq(b2bCustomerLocations.showOnWhereToBuy, true),
          or(
            eq(b2bCustomers.customerType, 'retail_liquor'),
            eq(b2bCustomers.customerType, 'restaurant')
          )
        )
      );

    // Get products purchased by each customer (from last 12 months, if any)
    // AND manually assigned products that haven't expired yet
    // Create a map of customer ID to products to avoid duplicate queries
    const customerProductsMap = new Map<string, Array<{ productName: string; sku: string | null }>>();
    
    // Get unique customer IDs
    const uniqueCustomerIds = [...new Set(allLocations.map(loc => loc.customerId))];
    
    // Fetch products for each customer (both from orders and manual assignments)
    await Promise.all(
      uniqueCustomerIds.map(async (customerId) => {
        // Get products from orders (last 12 months)
        const productsFromOrders = await db
          .select({
            productName: b2bOrderItems.productName,
            sku: b2bOrderItems.sku,
          })
          .from(b2bOrderItems)
          .innerJoin(b2bOrders, eq(b2bOrderItems.orderId, b2bOrders.id))
          .where(
            and(
              eq(b2bOrders.customerId, customerId),
              sql`${b2bOrders.orderDate} >= ${twelveMonthsAgo}`
            )
          )
          .groupBy(b2bOrderItems.productName, b2bOrderItems.sku);
        
        // Get manually assigned products that haven't expired
        const manualProducts = await db
          .select({
            productName: products.name,
            sku: products.sku,
          })
          .from(b2bCustomerManualProducts)
          .innerJoin(products, eq(b2bCustomerManualProducts.productId, products.id))
          .where(
            and(
              eq(b2bCustomerManualProducts.customerId, customerId),
              sql`${b2bCustomerManualProducts.expiresAt} > ${now}`
            )
          );
        
        // Merge products from both sources, removing duplicates by product name
        const allProducts = [...productsFromOrders];
        const existingNames = new Set(productsFromOrders.map(p => p.productName));
        
        for (const mp of manualProducts) {
          if (!existingNames.has(mp.productName)) {
            allProducts.push(mp);
            existingNames.add(mp.productName);
          }
        }
        
        customerProductsMap.set(customerId, allProducts);
      })
    );

    // Map locations to include products - use canonical location field names
    // Include tier information for sorting and highlighting
    // Include latitude/longitude for distance calculations
    const locationsWithProducts = allLocations.map((location) => ({
      id: location.id,
      storeName: location.storeName,
      accountName: location.accountName,
      customerType: location.customerType,
      storeAddress: location.storeAddress,
      storeCity: location.storeCity,
      storeState: location.storeState,
      storeZipCode: location.storeZipCode,
      storePhone: location.storePhone,
      website: location.website,
      latitude: location.latitude,
      longitude: location.longitude,
      tierName: location.tierName,
      tierSortOrder: location.tierSortOrder,
      products: customerProductsMap.get(location.customerId) || [],
    }));

    return locationsWithProducts;
  }

  // B2B - Commissions
  async getCommissionsBySalesRep(salesRepId: string): Promise<(B2bCommission & { order: B2bOrder & { customer: B2bCustomer } })[]> {
    const results = await db
      .select({
        commission: b2bCommissions,
        order: b2bOrders,
        customer: b2bCustomers,
      })
      .from(b2bCommissions)
      .innerJoin(b2bOrders, eq(b2bCommissions.orderId, b2bOrders.id))
      .innerJoin(b2bCustomers, eq(b2bOrders.customerId, b2bCustomers.id))
      .where(eq(b2bCommissions.salesRepId, salesRepId))
      .orderBy(desc(b2bCommissions.createdAt));

    return results.map(r => ({
      ...r.commission,
      order: {
        ...r.order,
        customer: r.customer,
      },
    }));
  }

  async getCommissionsByOrderId(orderId: string): Promise<B2bCommission[]> {
    return await db
      .select()
      .from(b2bCommissions)
      .where(eq(b2bCommissions.orderId, orderId));
  }

  async createCommission(data: InsertB2bCommission): Promise<B2bCommission> {
    const [commission] = await db.insert(b2bCommissions).values(data).returning();
    return commission;
  }

  async updateCommissionStatus(commissionId: string, status: string): Promise<B2bCommission | undefined> {
    const [updated] = await db
      .update(b2bCommissions)
      .set({ status })
      .where(eq(b2bCommissions.id, commissionId))
      .returning();
    return updated;
  }

  async markCommissionAsPaid(commissionId: string): Promise<B2bCommission | undefined> {
    const [updated] = await db
      .update(b2bCommissions)
      .set({ 
        paidToSalesRep: true, 
        paidToSalesRepAt: new Date()
      })
      .where(eq(b2bCommissions.id, commissionId))
      .returning();
    return updated;
  }

  async getEarnedCommissionsNotPaid(): Promise<(B2bCommission & { order: B2bOrder & { customer: B2bCustomer }; salesRep: SalesRep })[]> {
    const results = await db
      .select({
        commission: b2bCommissions,
        order: b2bOrders,
        customer: b2bCustomers,
        salesRep: salesReps,
      })
      .from(b2bCommissions)
      .innerJoin(b2bOrders, eq(b2bCommissions.orderId, b2bOrders.id))
      .innerJoin(b2bCustomers, eq(b2bOrders.customerId, b2bCustomers.id))
      .innerJoin(salesReps, eq(b2bCommissions.salesRepId, salesReps.id))
      .where(and(
        eq(b2bCommissions.status, 'earned'),
        eq(b2bCommissions.paidToSalesRep, false)
      ))
      .orderBy(desc(b2bCommissions.createdAt));

    return results.map(r => ({
      ...r.commission,
      order: {
        ...r.order,
        customer: r.customer,
      },
      salesRep: r.salesRep,
    }));
  }

  async upsertCommissionByOrderAndSalesRep(data: InsertB2bCommission): Promise<{ commission: B2bCommission; action: 'created' | 'updated' }> {
    if (!data.orderId || !data.salesRepId) {
      throw new Error("orderId and salesRepId are required for commission upsert");
    }

    // Check if commission already exists for this order and sales rep
    const [existing] = await db
      .select()
      .from(b2bCommissions)
      .where(and(
        eq(b2bCommissions.orderId, data.orderId),
        eq(b2bCommissions.salesRepId, data.salesRepId)
      ));

    if (existing) {
      // Update existing commission with all fields
      const updated = await db
        .update(b2bCommissions)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(b2bCommissions.id, existing.id))
        .returning();
      
      return { commission: updated[0], action: 'updated' };
    } else {
      // Create new commission
      const [commission] = await db.insert(b2bCommissions).values(data).returning();
      return { commission, action: 'created' };
    }
  }

  async updateCommissionPayPeriod(commissionId: string, payPeriod: string): Promise<B2bCommission | undefined> {
    const [updated] = await db
      .update(b2bCommissions)
      .set({ 
        payPeriod,
        paidToSalesRep: true,
        paidToSalesRepAt: new Date()
      })
      .where(eq(b2bCommissions.id, commissionId))
      .returning();
    return updated;
  }

  async getB2bPurchaseOrders(customerId: string): Promise<B2bPurchaseOrder[]> {
    return await db.select().from(b2bPurchaseOrders)
      .where(eq(b2bPurchaseOrders.customerId, customerId))
      .orderBy(desc(b2bPurchaseOrders.createdAt));
  }

  async createB2bPurchaseOrder(data: InsertB2bPurchaseOrder): Promise<B2bPurchaseOrder> {
    const [po] = await db.insert(b2bPurchaseOrders).values(data).returning();
    return po;
  }

  async updateB2bPurchaseOrder(id: string, data: Partial<InsertB2bPurchaseOrder>): Promise<B2bPurchaseOrder | undefined> {
    const [po] = await db.update(b2bPurchaseOrders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(b2bPurchaseOrders.id, id))
      .returning();
    return po;
  }

  async deleteB2bPurchaseOrder(id: string): Promise<boolean> {
    const result = await db.delete(b2bPurchaseOrders).where(eq(b2bPurchaseOrders.id, id));
    return true;
  }

  async getAllB2bCommissions(): Promise<B2bCommission[]> {
    return await db.select().from(b2bCommissions).orderBy(desc(b2bCommissions.createdAt));
  }

  // B2B - Commission Tiers
  async getCommissionTiers(): Promise<B2bCommissionTier[]> {
    return await db.select().from(b2bCommissionTiers).orderBy(b2bCommissionTiers.sortOrder);
  }

  async getActiveCommissionTiers(): Promise<B2bCommissionTier[]> {
    return await db.select().from(b2bCommissionTiers)
      .where(eq(b2bCommissionTiers.active, true))
      .orderBy(b2bCommissionTiers.sortOrder);
  }

  async getCommissionTier(id: string): Promise<B2bCommissionTier | undefined> {
    const [tier] = await db.select().from(b2bCommissionTiers)
      .where(eq(b2bCommissionTiers.id, id));
    return tier;
  }

  async createCommissionTier(data: InsertB2bCommissionTier): Promise<B2bCommissionTier> {
    const [tier] = await db.insert(b2bCommissionTiers).values(data).returning();
    return tier;
  }

  async updateCommissionTier(id: string, data: Partial<InsertB2bCommissionTier>): Promise<B2bCommissionTier | undefined> {
    const [tier] = await db.update(b2bCommissionTiers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(b2bCommissionTiers.id, id))
      .returning();
    return tier;
  }

  async deleteCommissionTier(id: string): Promise<boolean> {
    const result = await db.delete(b2bCommissionTiers).where(eq(b2bCommissionTiers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getYtdSalesForSalesRep(salesRepId: string, year: number): Promise<number> {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);
    const result = await db.select({
      total: sql<string>`COALESCE(SUM(CAST(${b2bOrders.subtotal} AS DECIMAL(12,2))), 0)`
    })
    .from(b2bOrders)
    .innerJoin(b2bCustomers, eq(b2bOrders.customerId, b2bCustomers.id))
    .where(
      and(
        eq(b2bCustomers.salesRepId, salesRepId),
        gte(b2bOrders.orderDate, startOfYear),
        lt(b2bOrders.orderDate, endOfYear),
        inArray(b2bOrders.status, ['completed', 'paid', 'delivered'])
      )
    );
    return parseFloat(result[0]?.total || '0');
  }

  // B2B - Email Templates
  async getEmailTemplates(activeOnly = false): Promise<B2bEmailTemplate[]> {
    const query = db.select().from(b2bEmailTemplates).orderBy(desc(b2bEmailTemplates.createdAt));
    if (activeOnly) {
      return await query.where(eq(b2bEmailTemplates.active, true));
    }
    return await query;
  }

  async getEmailTemplate(id: string): Promise<B2bEmailTemplate | undefined> {
    const [template] = await db
      .select()
      .from(b2bEmailTemplates)
      .where(eq(b2bEmailTemplates.id, id));
    return template;
  }

  async createEmailTemplate(data: InsertB2bEmailTemplate): Promise<B2bEmailTemplate> {
    const [template] = await db.insert(b2bEmailTemplates).values(data).returning();
    return template;
  }

  async updateEmailTemplate(id: string, data: Partial<InsertB2bEmailTemplate>): Promise<B2bEmailTemplate | undefined> {
    const [updated] = await db
      .update(b2bEmailTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(b2bEmailTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteEmailTemplate(id: string): Promise<boolean> {
    const result = await db.delete(b2bEmailTemplates).where(eq(b2bEmailTemplates.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // B2B - Email Automation Logs
  async getEmailAutomationLogs(customerId?: string, limit = 100): Promise<B2bEmailAutomationLog[]> {
    const query = db
      .select()
      .from(b2bEmailAutomationLogs)
      .orderBy(desc(b2bEmailAutomationLogs.sentAt))
      .limit(limit);
    
    if (customerId) {
      return await query.where(eq(b2bEmailAutomationLogs.customerId, customerId));
    }
    return await query;
  }

  async logEmailAutomation(data: InsertB2bEmailAutomationLog): Promise<B2bEmailAutomationLog> {
    const [log] = await db.insert(b2bEmailAutomationLogs).values(data).returning();
    return log;
  }

  // B2B - System Template Customizations
  async getSystemTemplateCustomization(templateKey: string): Promise<B2bSystemTemplateCustomization | undefined> {
    const [result] = await db.select()
      .from(b2bSystemTemplateCustomizations)
      .where(eq(b2bSystemTemplateCustomizations.templateKey, templateKey));
    return result;
  }

  async upsertSystemTemplateCustomization(data: InsertB2bSystemTemplateCustomization): Promise<B2bSystemTemplateCustomization> {
    const existing = await this.getSystemTemplateCustomization(data.templateKey);
    if (existing) {
      const [updated] = await db.update(b2bSystemTemplateCustomizations)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(b2bSystemTemplateCustomizations.templateKey, data.templateKey))
        .returning();
      return updated;
    }
    const [created] = await db.insert(b2bSystemTemplateCustomizations).values(data).returning();
    return created;
  }

  // Improvement Notes (shared between Base App and B2B Admin)
  async getImprovementNotes(appType?: string, status?: string): Promise<ImprovementNote[]> {
    let query = db.select().from(improvementNotes).orderBy(desc(improvementNotes.noteNumber));
    
    const conditions: SQL<unknown>[] = [];
    if (appType) {
      conditions.push(eq(improvementNotes.appType, appType));
    }
    if (status) {
      conditions.push(eq(improvementNotes.status, status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query;
  }

  async getImprovementNote(id: string): Promise<ImprovementNote | undefined> {
    const [note] = await db.select().from(improvementNotes).where(eq(improvementNotes.id, id));
    return note;
  }

  async getNextNoteNumber(): Promise<number> {
    const [result] = await db
      .select({ maxNumber: sql<number>`COALESCE(MAX(${improvementNotes.noteNumber}), 0)` })
      .from(improvementNotes);
    return (result?.maxNumber || 0) + 1;
  }

  async createImprovementNote(data: InsertImprovementNote): Promise<ImprovementNote> {
    const [note] = await db.insert(improvementNotes).values(data).returning();
    return note;
  }

  async updateImprovementNote(id: string, data: Partial<InsertImprovementNote>): Promise<ImprovementNote | undefined> {
    const [updated] = await db
      .update(improvementNotes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(improvementNotes.id, id))
      .returning();
    return updated;
  }

  async markNoteComplete(id: string): Promise<ImprovementNote | undefined> {
    const [updated] = await db
      .update(improvementNotes)
      .set({ 
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(improvementNotes.id, id))
      .returning();
    return updated;
  }

  async deleteImprovementNote(id: string): Promise<boolean> {
    const result = await db.delete(improvementNotes).where(eq(improvementNotes.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // ============================================
  // DAILY REPORTS MODULE
  // ============================================

  // Daily Report Templates
  async getDailyReportTemplates(activeOnly = false): Promise<DailyReportTemplate[]> {
    if (activeOnly) {
      return await db.select().from(dailyReportTemplates)
        .where(eq(dailyReportTemplates.isActive, true))
        .orderBy(dailyReportTemplates.departmentLabel);
    }
    return await db.select().from(dailyReportTemplates)
      .orderBy(dailyReportTemplates.departmentLabel);
  }

  async getDailyReportTemplate(id: string): Promise<DailyReportTemplate | undefined> {
    const [template] = await db.select().from(dailyReportTemplates)
      .where(eq(dailyReportTemplates.id, id));
    return template;
  }

  async getDailyReportTemplateByDepartment(department: string): Promise<DailyReportTemplate | undefined> {
    const [template] = await db.select().from(dailyReportTemplates)
      .where(eq(dailyReportTemplates.department, department as any));
    return template;
  }

  async createDailyReportTemplate(data: InsertDailyReportTemplate): Promise<DailyReportTemplate> {
    const [template] = await db.insert(dailyReportTemplates).values(data).returning();
    return template;
  }

  async updateDailyReportTemplate(id: string, data: Partial<InsertDailyReportTemplate>): Promise<DailyReportTemplate | undefined> {
    const [updated] = await db.update(dailyReportTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dailyReportTemplates.id, id))
      .returning();
    return updated;
  }

  async upsertDailyReportTemplate(data: InsertDailyReportTemplate): Promise<DailyReportTemplate> {
    const existing = await this.getDailyReportTemplateByDepartment(data.department);
    if (existing) {
      const updated = await this.updateDailyReportTemplate(existing.id, data);
      return updated!;
    }
    return await this.createDailyReportTemplate(data);
  }

  // Daily Procedure Templates
  async getDailyProcedureTemplates(department?: string, activeOnly = false): Promise<DailyProcedureTemplate[]> {
    const conditions: SQL<unknown>[] = [];
    if (department) {
      conditions.push(eq(dailyProcedureTemplates.department, department as any));
    }
    if (activeOnly) {
      conditions.push(eq(dailyProcedureTemplates.isActive, true));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(dailyProcedureTemplates)
        .where(and(...conditions))
        .orderBy(dailyProcedureTemplates.sortOrder);
    }
    return await db.select().from(dailyProcedureTemplates)
      .orderBy(dailyProcedureTemplates.department, dailyProcedureTemplates.sortOrder);
  }

  async getDailyProcedureTemplate(id: string): Promise<DailyProcedureTemplate | undefined> {
    const [template] = await db.select().from(dailyProcedureTemplates)
      .where(eq(dailyProcedureTemplates.id, id));
    return template;
  }

  async createDailyProcedureTemplate(data: InsertDailyProcedureTemplate): Promise<DailyProcedureTemplate> {
    const [template] = await db.insert(dailyProcedureTemplates).values(data).returning();
    return template;
  }

  async updateDailyProcedureTemplate(id: string, data: Partial<InsertDailyProcedureTemplate>): Promise<DailyProcedureTemplate | undefined> {
    const [updated] = await db.update(dailyProcedureTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dailyProcedureTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteDailyProcedureTemplate(id: string): Promise<boolean> {
    const result = await db.delete(dailyProcedureTemplates).where(eq(dailyProcedureTemplates.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Daily Reports
  async getDailyReports(filters?: { 
    department?: string; 
    startDate?: Date; 
    endDate?: Date; 
    status?: string;
    hasCustomerConcerns?: boolean;
  }): Promise<DailyReport[]> {
    const conditions: SQL<unknown>[] = [];
    
    if (filters?.department) {
      conditions.push(eq(dailyReports.department, filters.department as any));
    }
    if (filters?.startDate) {
      conditions.push(sql`${dailyReports.reportDate} >= ${filters.startDate}`);
    }
    if (filters?.endDate) {
      conditions.push(sql`${dailyReports.reportDate} <= ${filters.endDate}`);
    }
    if (filters?.status) {
      conditions.push(eq(dailyReports.status, filters.status));
    }
    if (filters?.hasCustomerConcerns !== undefined) {
      conditions.push(eq(dailyReports.hasCustomerConcerns, filters.hasCustomerConcerns));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(dailyReports)
        .where(and(...conditions))
        .orderBy(desc(dailyReports.reportDate));
    }
    return await db.select().from(dailyReports)
      .orderBy(desc(dailyReports.reportDate));
  }

  async getDailyReport(id: string): Promise<DailyReport | undefined> {
    const [report] = await db.select().from(dailyReports)
      .where(eq(dailyReports.id, id));
    return report;
  }

  async getDailyReportByDepartmentAndDate(department: string, reportDate: Date): Promise<DailyReport | undefined> {
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const [report] = await db.select().from(dailyReports)
      .where(and(
        eq(dailyReports.department, department as any),
        sql`${dailyReports.reportDate} >= ${startOfDay}`,
        sql`${dailyReports.reportDate} <= ${endOfDay}`
      ));
    return report;
  }

  async getDailyReportWithDetails(id: string): Promise<DailyReportWithDetails | undefined> {
    const report = await this.getDailyReport(id);
    if (!report) return undefined;
    
    const incidents = await db.select().from(dailyReportIncidents)
      .where(eq(dailyReportIncidents.reportId, id))
      .orderBy(desc(dailyReportIncidents.severity), dailyReportIncidents.createdAt);
    
    const completions = await db.select().from(dailyProcedureCompletions)
      .where(eq(dailyProcedureCompletions.reportId, id));
    
    const template = await this.getDailyReportTemplateByDepartment(report.department);
    
    // Fetch procedure templates for the completions
    const procedureTemplateIds = completions.map(c => c.procedureTemplateId);
    const procedureTemplates = procedureTemplateIds.length > 0
      ? await db.select().from(dailyProcedureTemplates)
          .where(inArray(dailyProcedureTemplates.id, procedureTemplateIds))
      : [];
    
    const procedureTemplatesMap = new Map(procedureTemplates.map(t => [t.id, t]));
    
    const completionsWithTemplates = completions.map(c => ({
      ...c,
      template: procedureTemplatesMap.get(c.procedureTemplateId)
    }));
    
    return {
      ...report,
      incidents,
      procedureCompletions: completionsWithTemplates,
      template
    };
  }

  async getDailyReportsBySubmitter(submitterName: string, department: string): Promise<DailyReport[]> {
    return await db.select().from(dailyReports)
      .where(and(
        eq(dailyReports.submittedByName, submitterName),
        eq(dailyReports.department, department as any)
      ))
      .orderBy(desc(dailyReports.reportDate));
  }

  async getDailyReportByDateAndDepartment(reportDate: Date, department: string): Promise<DailyReport | undefined> {
    // Get start and end of the day for the report date
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const [report] = await db.select().from(dailyReports)
      .where(and(
        sql`${dailyReports.reportDate} >= ${startOfDay}`,
        sql`${dailyReports.reportDate} <= ${endOfDay}`,
        eq(dailyReports.department, department as any)
      ))
      .orderBy(desc(dailyReports.createdAt))
      .limit(1);
    return report;
  }

  async createDailyReport(data: InsertDailyReport): Promise<DailyReport> {
    const [report] = await db.insert(dailyReports).values(data).returning();
    return report;
  }

  async updateDailyReport(id: string, data: Partial<DailyReport>): Promise<DailyReport | undefined> {
    const [updated] = await db.update(dailyReports)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dailyReports.id, id))
      .returning();
    return updated;
  }

  async deleteDailyReport(id: string): Promise<boolean> {
    const result = await db.delete(dailyReports).where(eq(dailyReports.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Daily Report Incidents
  async getDailyReportIncidents(reportId: string): Promise<DailyReportIncident[]> {
    return await db.select().from(dailyReportIncidents)
      .where(eq(dailyReportIncidents.reportId, reportId))
      .orderBy(desc(dailyReportIncidents.severity), dailyReportIncidents.createdAt);
  }

  async getUnresolvedIncidents(limit = 50): Promise<(DailyReportIncident & { department?: string })[]> {
    const incidents = await db.select({
      incident: dailyReportIncidents,
      department: dailyReports.department
    })
      .from(dailyReportIncidents)
      .innerJoin(dailyReports, eq(dailyReportIncidents.reportId, dailyReports.id))
      .where(eq(dailyReportIncidents.resolved, false))
      .orderBy(desc(dailyReportIncidents.createdAt))
      .limit(limit);
    
    return incidents.map(i => ({ ...i.incident, department: i.department }));
  }

  async getCustomerRelatedIncidents(limit = 50): Promise<(DailyReportIncident & { department?: string })[]> {
    const incidents = await db.select({
      incident: dailyReportIncidents,
      department: dailyReports.department
    })
      .from(dailyReportIncidents)
      .innerJoin(dailyReports, eq(dailyReportIncidents.reportId, dailyReports.id))
      .where(eq(dailyReportIncidents.isCustomerRelated, true))
      .orderBy(desc(dailyReportIncidents.createdAt))
      .limit(limit);
    
    return incidents.map(i => ({ ...i.incident, department: i.department }));
  }

  async createDailyReportIncident(data: InsertDailyReportIncident): Promise<DailyReportIncident> {
    const [incident] = await db.insert(dailyReportIncidents).values(data).returning();
    return incident;
  }

  async updateDailyReportIncident(id: string, data: Partial<InsertDailyReportIncident>): Promise<DailyReportIncident | undefined> {
    const [updated] = await db.update(dailyReportIncidents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dailyReportIncidents.id, id))
      .returning();
    return updated;
  }

  async deleteDailyReportIncident(id: string): Promise<boolean> {
    const result = await db.delete(dailyReportIncidents).where(eq(dailyReportIncidents.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async resolveIncident(id: string, resolvedById?: string, resolvedByName?: string): Promise<DailyReportIncident | undefined> {
    const [updated] = await db.update(dailyReportIncidents)
      .set({ 
        resolved: true, 
        updatedAt: new Date()
      })
      .where(eq(dailyReportIncidents.id, id))
      .returning();
    return updated;
  }

  // Incident Notes
  async getIncidentNotes(incidentId: string): Promise<DailyReportIncidentNote[]> {
    return await db.select().from(dailyReportIncidentNotes)
      .where(eq(dailyReportIncidentNotes.incidentId, incidentId))
      .orderBy(dailyReportIncidentNotes.createdAt);
  }

  async createIncidentNote(data: InsertDailyReportIncidentNote): Promise<DailyReportIncidentNote> {
    const [note] = await db.insert(dailyReportIncidentNotes).values(data).returning();
    return note;
  }

  // Daily Procedure Completions
  async getDailyProcedureCompletions(reportId: string): Promise<DailyProcedureCompletion[]> {
    return await db.select().from(dailyProcedureCompletions)
      .where(eq(dailyProcedureCompletions.reportId, reportId));
  }

  async upsertDailyProcedureCompletion(data: InsertDailyProcedureCompletion): Promise<DailyProcedureCompletion> {
    const existing = await db.select().from(dailyProcedureCompletions)
      .where(and(
        eq(dailyProcedureCompletions.reportId, data.reportId),
        eq(dailyProcedureCompletions.procedureTemplateId, data.procedureTemplateId)
      ));
    
    if (existing.length > 0) {
      const [updated] = await db.update(dailyProcedureCompletions)
        .set({
          completed: data.completed,
          completedAt: data.completed ? new Date() : null,
          completedById: data.completedById,
          completedByName: data.completedByName,
          notes: data.notes
        })
        .where(eq(dailyProcedureCompletions.id, existing[0].id))
        .returning();
      return updated;
    }
    
    const [completion] = await db.insert(dailyProcedureCompletions)
      .values({
        ...data,
        completedAt: data.completed ? new Date() : null
      })
      .returning();
    return completion;
  }

  async initializeProcedureCompletionsForReport(reportId: string, department: string): Promise<void> {
    const procedures = await this.getDailyProcedureTemplates(department, true);
    
    for (const procedure of procedures) {
      await db.insert(dailyProcedureCompletions)
        .values({
          reportId,
          procedureTemplateId: procedure.id,
          completed: false
        })
        .onConflictDoNothing();
    }
  }

  // Daily Reports Stats
  async getDailyReportsStats(startDate?: Date, endDate?: Date): Promise<{
    total: number;
    draft: number;
    submitted: number;
    reviewed: number;
    todayCount: number;
    incidentsToday: number;
    criticalIncidents: number;
    proceduresCompleted: number;
    proceduresTotal: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Total reports count
    const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(dailyReports);
    
    // Count reports by status
    const [draftResult] = await db.select({ count: sql<number>`count(*)` })
      .from(dailyReports)
      .where(eq(dailyReports.status, 'draft'));
    
    const [submittedResult] = await db.select({ count: sql<number>`count(*)` })
      .from(dailyReports)
      .where(eq(dailyReports.status, 'submitted'));
    
    const [reviewedResult] = await db.select({ count: sql<number>`count(*)` })
      .from(dailyReports)
      .where(eq(dailyReports.status, 'reviewed'));
    
    // Reports created today (regardless of status)
    const [todayResult] = await db.select({ count: sql<number>`count(*)` })
      .from(dailyReports)
      .where(and(
        sql`${dailyReports.reportDate} >= ${today}`,
        sql`${dailyReports.reportDate} < ${tomorrow}`
      ));
    
    // Incidents reported today
    const [incidentsResult] = await db.select({ count: sql<number>`count(*)` })
      .from(dailyReportIncidents)
      .innerJoin(dailyReports, eq(dailyReportIncidents.reportId, dailyReports.id))
      .where(and(
        sql`${dailyReports.reportDate} >= ${today}`,
        sql`${dailyReports.reportDate} < ${tomorrow}`
      ));
    
    // Critical incidents today
    const [criticalResult] = await db.select({ count: sql<number>`count(*)` })
      .from(dailyReportIncidents)
      .innerJoin(dailyReports, eq(dailyReportIncidents.reportId, dailyReports.id))
      .where(and(
        sql`${dailyReports.reportDate} >= ${today}`,
        sql`${dailyReports.reportDate} < ${tomorrow}`,
        eq(dailyReportIncidents.severity, 'critical')
      ));
    
    // Procedures completed today
    const [proceduresResult] = await db.select({
      completed: sql<number>`SUM(CASE WHEN ${dailyProcedureCompletions.completed} THEN 1 ELSE 0 END)`,
      total: sql<number>`COUNT(*)`
    })
      .from(dailyProcedureCompletions)
      .innerJoin(dailyReports, eq(dailyProcedureCompletions.reportId, dailyReports.id))
      .where(and(
        sql`${dailyReports.reportDate} >= ${today}`,
        sql`${dailyReports.reportDate} < ${tomorrow}`
      ));
    
    return {
      total: Number(totalResult.count) || 0,
      draft: Number(draftResult.count) || 0,
      submitted: Number(submittedResult.count) || 0,
      reviewed: Number(reviewedResult.count) || 0,
      todayCount: Number(todayResult.count) || 0,
      incidentsToday: Number(incidentsResult.count) || 0,
      criticalIncidents: Number(criticalResult.count) || 0,
      proceduresCompleted: Number(proceduresResult.completed) || 0,
      proceduresTotal: Number(proceduresResult.total) || 0
    };
  }

  // Daily Report Email Recipients
  async getDailyReportEmailRecipients(department?: string, activeOnly = true): Promise<DailyReportEmailRecipient[]> {
    const conditions: SQL<unknown>[] = [];
    if (department) {
      conditions.push(eq(dailyReportEmailRecipients.department, department as any));
    }
    if (activeOnly) {
      conditions.push(eq(dailyReportEmailRecipients.active, true));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(dailyReportEmailRecipients)
        .where(and(...conditions))
        .orderBy(dailyReportEmailRecipients.department, dailyReportEmailRecipients.recipientName);
    }
    return await db.select().from(dailyReportEmailRecipients)
      .orderBy(dailyReportEmailRecipients.department, dailyReportEmailRecipients.recipientName);
  }

  async getDailyReportEmailRecipientById(id: string): Promise<DailyReportEmailRecipient | undefined> {
    const [recipient] = await db.select().from(dailyReportEmailRecipients)
      .where(eq(dailyReportEmailRecipients.id, id));
    return recipient;
  }

  async createDailyReportEmailRecipient(data: InsertDailyReportEmailRecipient): Promise<DailyReportEmailRecipient> {
    const [recipient] = await db.insert(dailyReportEmailRecipients).values(data).returning();
    return recipient;
  }

  async updateDailyReportEmailRecipient(id: string, data: Partial<InsertDailyReportEmailRecipient>): Promise<DailyReportEmailRecipient | undefined> {
    const [updated] = await db.update(dailyReportEmailRecipients)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dailyReportEmailRecipients.id, id))
      .returning();
    return updated;
  }

  async deleteDailyReportEmailRecipient(id: string): Promise<boolean> {
    const result = await db.delete(dailyReportEmailRecipients)
      .where(eq(dailyReportEmailRecipients.id, id))
      .returning();
    return result.length > 0;
  }

  // Daily Report Access Codes
  async getDailyReportAccessCodes(department?: string): Promise<DailyReportAccessCode[]> {
    if (department) {
      return await db.select().from(dailyReportAccessCodes)
        .where(eq(dailyReportAccessCodes.department, department as any))
        .orderBy(dailyReportAccessCodes.staffName);
    }
    return await db.select().from(dailyReportAccessCodes)
      .orderBy(dailyReportAccessCodes.department, dailyReportAccessCodes.staffName);
  }

  async getDailyReportAccessCodeByCode(code: string): Promise<DailyReportAccessCode | undefined> {
    const [accessCode] = await db.select().from(dailyReportAccessCodes)
      .where(eq(dailyReportAccessCodes.code, code));
    return accessCode;
  }

  // Get all access codes with a specific code (for multi-department support)
  async getDailyReportAccessCodesByCode(code: string): Promise<DailyReportAccessCode[]> {
    return await db.select().from(dailyReportAccessCodes)
      .where(and(
        eq(dailyReportAccessCodes.code, code),
        eq(dailyReportAccessCodes.isActive, true)
      ))
      .orderBy(dailyReportAccessCodes.department);
  }

  // Check if a specific code+department combination exists
  async getDailyReportAccessCodeByCodeAndDepartment(code: string, department: string): Promise<DailyReportAccessCode | undefined> {
    const [accessCode] = await db.select().from(dailyReportAccessCodes)
      .where(and(
        eq(dailyReportAccessCodes.code, code),
        eq(dailyReportAccessCodes.department, department as any)
      ));
    return accessCode;
  }

  async getDailyReportAccessCodeById(id: string): Promise<DailyReportAccessCode | undefined> {
    const [accessCode] = await db.select().from(dailyReportAccessCodes)
      .where(eq(dailyReportAccessCodes.id, id));
    return accessCode;
  }

  async getDailyReportAccessCode(id: string): Promise<DailyReportAccessCode | undefined> {
    return this.getDailyReportAccessCodeById(id);
  }

  async createDailyReportAccessCode(data: InsertDailyReportAccessCode): Promise<DailyReportAccessCode> {
    const [accessCode] = await db.insert(dailyReportAccessCodes).values(data).returning();
    return accessCode;
  }

  async updateDailyReportAccessCode(id: string, data: Partial<InsertDailyReportAccessCode>): Promise<DailyReportAccessCode | undefined> {
    const [updated] = await db.update(dailyReportAccessCodes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dailyReportAccessCodes.id, id))
      .returning();
    return updated;
  }

  async updateDailyReportAccessCodeLastUsed(code: string): Promise<void> {
    await db.update(dailyReportAccessCodes)
      .set({ lastUsedAt: new Date() })
      .where(eq(dailyReportAccessCodes.code, code));
  }

  async deleteDailyReportAccessCode(id: string): Promise<boolean> {
    const result = await db.delete(dailyReportAccessCodes)
      .where(eq(dailyReportAccessCodes.id, id))
      .returning();
    return result.length > 0;
  }

  async getActiveAccessCodesByStaffName(staffName: string): Promise<DailyReportAccessCode[]> {
    return await db.select().from(dailyReportAccessCodes)
      .where(and(
        eq(dailyReportAccessCodes.staffName, staffName),
        eq(dailyReportAccessCodes.isActive, true)
      ))
      .orderBy(dailyReportAccessCodes.department);
  }

  async generateUniqueAccessCode(): Promise<string> {
    let code: string;
    let exists = true;
    while (exists) {
      code = Math.floor(1000 + Math.random() * 9000).toString();
      const existing = await this.getDailyReportAccessCodeByCode(code);
      exists = !!existing;
    }
    return code!;
  }

  // Daily Report Field Definitions
  async getDailyReportFieldDefinitions(activeOnly = false): Promise<DailyReportFieldDefinition[]> {
    if (activeOnly) {
      return await db.select().from(dailyReportFieldDefinitions)
        .where(eq(dailyReportFieldDefinitions.isActive, true))
        .orderBy(dailyReportFieldDefinitions.sortOrder, dailyReportFieldDefinitions.label);
    }
    return await db.select().from(dailyReportFieldDefinitions)
      .orderBy(dailyReportFieldDefinitions.sortOrder, dailyReportFieldDefinitions.label);
  }

  async getDailyReportFieldDefinition(id: string): Promise<DailyReportFieldDefinition | undefined> {
    const [field] = await db.select().from(dailyReportFieldDefinitions)
      .where(eq(dailyReportFieldDefinitions.id, id));
    return field;
  }

  async getDailyReportFieldDefinitionByKey(key: string): Promise<DailyReportFieldDefinition | undefined> {
    const [field] = await db.select().from(dailyReportFieldDefinitions)
      .where(eq(dailyReportFieldDefinitions.key, key));
    return field;
  }

  async createDailyReportFieldDefinition(data: InsertDailyReportFieldDefinition): Promise<DailyReportFieldDefinition> {
    const [field] = await db.insert(dailyReportFieldDefinitions).values(data).returning();
    return field;
  }

  async updateDailyReportFieldDefinition(id: string, data: Partial<InsertDailyReportFieldDefinition>): Promise<DailyReportFieldDefinition | undefined> {
    const [updated] = await db.update(dailyReportFieldDefinitions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dailyReportFieldDefinitions.id, id))
      .returning();
    return updated;
  }

  async deleteDailyReportFieldDefinition(id: string): Promise<boolean> {
    const result = await db.delete(dailyReportFieldDefinitions)
      .where(eq(dailyReportFieldDefinitions.id, id))
      .returning();
    return result.length > 0;
  }

  async syncFieldDefinitionsToTemplates(): Promise<void> {
    // Now syncs via junction table instead of inline metrics
    const allFields = await this.getDailyReportFieldDefinitions(false);
    const activeFields = allFields.filter(f => f.isActive);
    const templates = await this.getDailyReportTemplates();
    
    for (const template of templates) {
      // Get current assignments for this template
      const currentAssignments = await this.getDepartmentFieldAssignments(template.id);
      
      // For each active field, ensure there's an assignment
      for (const field of activeFields) {
        const existing = currentAssignments.find(a => a.fieldDefinitionId === field.id);
        if (!existing) {
          // Create new assignment with isEnabled defaulting to true
          await this.createDepartmentFieldAssignment({
            templateId: template.id,
            fieldDefinitionId: field.id,
            isEnabled: true,
            sortOrder: field.sortOrder
          });
        }
      }
      
      // Also update the inline metrics for backward compatibility
      const assignments = await this.getDepartmentFieldAssignmentsWithDefinitions(template.id);
      const updatedMetrics = assignments.map(a => ({
        key: a.fieldDefinition?.key || '',
        label: a.fieldDefinition?.label || '',
        type: a.fieldDefinition?.type || 'text',
        isEnabled: a.isEnabled
      })).filter(m => m.key);
      
      await this.updateDailyReportTemplate(template.id, { metrics: updatedMetrics });
    }
  }

  // Department Field Assignments
  async getDepartmentFieldAssignments(templateId: string): Promise<DepartmentFieldAssignment[]> {
    return await db.select().from(departmentFieldAssignments)
      .where(eq(departmentFieldAssignments.templateId, templateId))
      .orderBy(departmentFieldAssignments.sortOrder);
  }

  async getDepartmentFieldAssignmentsWithDefinitions(templateId: string): Promise<DepartmentFieldAssignmentWithDefinition[]> {
    const results = await db.select({
      assignment: departmentFieldAssignments,
      fieldDefinition: dailyReportFieldDefinitions
    })
      .from(departmentFieldAssignments)
      .leftJoin(dailyReportFieldDefinitions, eq(departmentFieldAssignments.fieldDefinitionId, dailyReportFieldDefinitions.id))
      .where(eq(departmentFieldAssignments.templateId, templateId))
      .orderBy(departmentFieldAssignments.sortOrder);
    
    return results.map(r => ({
      ...r.assignment,
      fieldDefinition: r.fieldDefinition || undefined
    }));
  }

  async createDepartmentFieldAssignment(data: InsertDepartmentFieldAssignment): Promise<DepartmentFieldAssignment> {
    const [assignment] = await db.insert(departmentFieldAssignments).values(data).returning();
    return assignment;
  }

  async updateDepartmentFieldAssignment(id: string, data: Partial<InsertDepartmentFieldAssignment>): Promise<DepartmentFieldAssignment | undefined> {
    const [updated] = await db.update(departmentFieldAssignments)
      .set(data)
      .where(eq(departmentFieldAssignments.id, id))
      .returning();
    return updated;
  }

  async deleteDepartmentFieldAssignment(id: string): Promise<boolean> {
    const result = await db.delete(departmentFieldAssignments)
      .where(eq(departmentFieldAssignments.id, id))
      .returning();
    return result.length > 0;
  }

  async updateDepartmentFieldEnabled(templateId: string, fieldDefinitionId: string, isEnabled: boolean): Promise<DepartmentFieldAssignment | undefined> {
    const [updated] = await db.update(departmentFieldAssignments)
      .set({ isEnabled })
      .where(and(
        eq(departmentFieldAssignments.templateId, templateId),
        eq(departmentFieldAssignments.fieldDefinitionId, fieldDefinitionId)
      ))
      .returning();
    return updated;
  }

  async bulkUpdateDepartmentFieldAssignments(templateId: string, updates: Array<{ fieldDefinitionId: string; isEnabled: boolean; sortOrder?: number }>): Promise<void> {
    for (const update of updates) {
      await db.update(departmentFieldAssignments)
        .set({ 
          isEnabled: update.isEnabled,
          ...(update.sortOrder !== undefined ? { sortOrder: update.sortOrder } : {})
        })
        .where(and(
          eq(departmentFieldAssignments.templateId, templateId),
          eq(departmentFieldAssignments.fieldDefinitionId, update.fieldDefinitionId)
        ));
    }
  }

  // Daily Report Revision Requests
  async getDailyReportRevisionRequests(reportId: string): Promise<DailyReportRevisionRequest[]> {
    return await db.select().from(dailyReportRevisionRequests)
      .where(eq(dailyReportRevisionRequests.reportId, reportId))
      .orderBy(desc(dailyReportRevisionRequests.createdAt));
  }

  async getOpenRevisionRequestsForSubmitter(submitterId: string): Promise<DailyReportRevisionRequest[]> {
    // Get all open revision requests for reports submitted by this user
    const reports = await db.select({ id: dailyReports.id }).from(dailyReports)
      .where(eq(dailyReports.submittedById, submitterId));
    
    if (reports.length === 0) return [];
    
    const reportIds = reports.map(r => r.id);
    return await db.select().from(dailyReportRevisionRequests)
      .where(and(
        inArray(dailyReportRevisionRequests.reportId, reportIds),
        eq(dailyReportRevisionRequests.status, 'open')
      ))
      .orderBy(desc(dailyReportRevisionRequests.createdAt));
  }

  async createDailyReportRevisionRequest(data: InsertDailyReportRevisionRequest): Promise<DailyReportRevisionRequest> {
    const [request] = await db.insert(dailyReportRevisionRequests).values(data).returning();
    return request;
  }

  async respondToDailyReportRevisionRequest(
    id: string, 
    responseMessage: string,
    respondedById: string | null,
    respondedByName: string | null
  ): Promise<DailyReportRevisionRequest | undefined> {
    const [updated] = await db.update(dailyReportRevisionRequests)
      .set({
        responseMessage,
        respondedById,
        respondedByName,
        respondedAt: new Date(),
        status: 'resolved'
      })
      .where(eq(dailyReportRevisionRequests.id, id))
      .returning();
    return updated;
  }

  async getDailyReportRevisionRequest(id: string): Promise<DailyReportRevisionRequest | undefined> {
    const [request] = await db.select().from(dailyReportRevisionRequests)
      .where(eq(dailyReportRevisionRequests.id, id));
    return request;
  }

  // ==========================================
  // DAILY PROCEDURES MODULE IMPLEMENTATIONS
  // ==========================================

  // Procedure Templates
  async getProceduresTemplates(filters?: { department?: string; procedureType?: string; isActive?: boolean }): Promise<ProceduresTemplate[]> {
    const conditions: SQL<unknown>[] = [];
    if (filters?.department) {
      conditions.push(eq(proceduresTemplates.department, filters.department));
    }
    if (filters?.procedureType) {
      conditions.push(eq(proceduresTemplates.procedureType, filters.procedureType));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(proceduresTemplates.isActive, filters.isActive));
    }
    
    const query = db.select().from(proceduresTemplates);
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(proceduresTemplates.procedureName);
    }
    return await query.orderBy(proceduresTemplates.procedureName);
  }

  async getProceduresTemplate(id: string): Promise<ProceduresTemplate | undefined> {
    const [template] = await db.select().from(proceduresTemplates).where(eq(proceduresTemplates.id, id));
    return template;
  }

  async getProceduresTemplateByCode(code: string): Promise<ProceduresTemplate | undefined> {
    const [template] = await db.select().from(proceduresTemplates).where(eq(proceduresTemplates.procedureCode, code));
    return template;
  }

  async getProceduresTemplateWithItems(id: string): Promise<ProceduresTemplateWithItems | undefined> {
    const template = await this.getProceduresTemplate(id);
    if (!template) return undefined;
    const items = await this.getProceduresItems(id);
    return { ...template, items };
  }

  async createProceduresTemplate(data: InsertProceduresTemplate): Promise<ProceduresTemplate> {
    const [template] = await db.insert(proceduresTemplates).values(data).returning();
    return template;
  }

  async updateProceduresTemplate(id: string, data: Partial<InsertProceduresTemplate>): Promise<ProceduresTemplate | undefined> {
    const [updated] = await db.update(proceduresTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(proceduresTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteProceduresTemplate(id: string): Promise<boolean> {
    const result = await db.delete(proceduresTemplates).where(eq(proceduresTemplates.id, id)).returning();
    return result.length > 0;
  }

  // Procedure Items
  async getProceduresItems(templateId: string): Promise<ProceduresItem[]> {
    return await db.select().from(proceduresItems)
      .where(eq(proceduresItems.templateId, templateId))
      .orderBy(proceduresItems.sortOrder);
  }

  async getProceduresItem(id: string): Promise<ProceduresItem | undefined> {
    const [item] = await db.select().from(proceduresItems).where(eq(proceduresItems.id, id));
    return item;
  }

  async createProceduresItem(data: InsertProceduresItem): Promise<ProceduresItem> {
    const [item] = await db.insert(proceduresItems).values(data).returning();
    return item;
  }

  async updateProceduresItem(id: string, data: Partial<InsertProceduresItem>): Promise<ProceduresItem | undefined> {
    const [updated] = await db.update(proceduresItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(proceduresItems.id, id))
      .returning();
    return updated;
  }

  async deleteProceduresItem(id: string): Promise<boolean> {
    const result = await db.delete(proceduresItems).where(eq(proceduresItems.id, id)).returning();
    return result.length > 0;
  }

  async reorderProceduresItems(templateId: string, itemIds: string[]): Promise<void> {
    for (let i = 0; i < itemIds.length; i++) {
      await db.update(proceduresItems)
        .set({ sortOrder: i })
        .where(and(
          eq(proceduresItems.id, itemIds[i]),
          eq(proceduresItems.templateId, templateId)
        ));
    }
  }

  // Procedure Users
  async getProceduresUsers(filters?: { isActive?: boolean }): Promise<ProceduresUser[]> {
    if (filters?.isActive !== undefined) {
      return await db.select().from(proceduresUsers)
        .where(eq(proceduresUsers.isActive, filters.isActive))
        .orderBy(proceduresUsers.displayName);
    }
    return await db.select().from(proceduresUsers).orderBy(proceduresUsers.displayName);
  }

  async getProceduresUser(id: string): Promise<ProceduresUser | undefined> {
    const [user] = await db.select().from(proceduresUsers).where(eq(proceduresUsers.id, id));
    return user;
  }

  async getProceduresUserByPin(pin: string): Promise<ProceduresUser | undefined> {
    const [user] = await db.select().from(proceduresUsers)
      .where(and(eq(proceduresUsers.pinCode, pin), eq(proceduresUsers.isActive, true)));
    return user;
  }

  async createProceduresUser(data: InsertProceduresUser): Promise<ProceduresUser> {
    const [user] = await db.insert(proceduresUsers).values(data).returning();
    return user;
  }

  async updateProceduresUser(id: string, data: Partial<InsertProceduresUser>): Promise<ProceduresUser | undefined> {
    const [updated] = await db.update(proceduresUsers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(proceduresUsers.id, id))
      .returning();
    return updated;
  }

  async deleteProceduresUser(id: string): Promise<boolean> {
    const result = await db.delete(proceduresUsers).where(eq(proceduresUsers.id, id)).returning();
    return result.length > 0;
  }

  async updateProceduresUserLastLogin(id: string): Promise<void> {
    await db.update(proceduresUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(proceduresUsers.id, id));
  }

  // Procedure Submissions
  async getProceduresSubmissions(filters?: { department?: string; procedureCode?: string; startDate?: Date; endDate?: Date; userId?: string }): Promise<ProceduresSubmission[]> {
    const conditions: SQL<unknown>[] = [];
    if (filters?.department) {
      conditions.push(eq(proceduresSubmissions.department, filters.department));
    }
    if (filters?.procedureCode) {
      conditions.push(eq(proceduresSubmissions.procedureCode, filters.procedureCode));
    }
    if (filters?.userId) {
      conditions.push(eq(proceduresSubmissions.submittedByUserId, filters.userId));
    }
    if (filters?.startDate) {
      conditions.push(sql`${proceduresSubmissions.submissionDate} >= ${filters.startDate}`);
    }
    if (filters?.endDate) {
      conditions.push(sql`${proceduresSubmissions.submissionDate} <= ${filters.endDate}`);
    }
    
    const query = db.select().from(proceduresSubmissions);
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(proceduresSubmissions.submissionDate));
    }
    return await query.orderBy(desc(proceduresSubmissions.submissionDate));
  }

  async getProceduresSubmission(id: string): Promise<ProceduresSubmission | undefined> {
    const [submission] = await db.select().from(proceduresSubmissions).where(eq(proceduresSubmissions.id, id));
    return submission;
  }

  async getProceduresSubmissionDraft(templateId: string, staffName: string): Promise<ProceduresSubmission | undefined> {
    // Use case-insensitive and trimmed comparison for better matching
    const normalizedName = staffName.trim().toLowerCase();
    const [draft] = await db.select().from(proceduresSubmissions)
      .where(and(
        eq(proceduresSubmissions.templateId, templateId),
        sql`LOWER(TRIM(${proceduresSubmissions.submittedByName})) = ${normalizedName}`,
        eq(proceduresSubmissions.status, "draft")
      ))
      .orderBy(desc(proceduresSubmissions.createdAt))
      .limit(1);
    return draft;
  }

  async getProceduresSubmissionByDateAndStaff(templateId: string, submissionDate: Date, staffName: string): Promise<ProceduresSubmission | undefined> {
    // Get start and end of the day
    const startOfDay = new Date(submissionDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(submissionDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const [submission] = await db.select().from(proceduresSubmissions)
      .where(and(
        eq(proceduresSubmissions.templateId, templateId),
        eq(proceduresSubmissions.submittedByName, staffName),
        sql`${proceduresSubmissions.submissionDate} >= ${startOfDay}`,
        sql`${proceduresSubmissions.submissionDate} <= ${endOfDay}`
      ))
      .orderBy(desc(proceduresSubmissions.createdAt))
      .limit(1);
    return submission;
  }

  async createProceduresSubmission(data: InsertProceduresSubmission): Promise<ProceduresSubmission> {
    const [submission] = await db.insert(proceduresSubmissions).values(data).returning();
    return submission;
  }

  async updateProceduresSubmission(id: string, data: Partial<InsertProceduresSubmission>): Promise<ProceduresSubmission | undefined> {
    const [updated] = await db.update(proceduresSubmissions)
      .set(data)
      .where(eq(proceduresSubmissions.id, id))
      .returning();
    return updated;
  }

  async deleteProceduresSubmission(id: string): Promise<boolean> {
    const result = await db.delete(proceduresSubmissions).where(eq(proceduresSubmissions.id, id)).returning();
    return result.length > 0;
  }

  async updateProceduresSubmissionEmailStatus(id: string, status: string): Promise<void> {
    await db.update(proceduresSubmissions)
      .set({ emailSentStatus: status, emailSentAt: new Date() })
      .where(eq(proceduresSubmissions.id, id));
  }

  // Get today's procedures for a user based on day of week and assigned procedure codes
  async getTodaysProceduresForUser(userId: string): Promise<ProceduresTemplateWithItems[]> {
    const user = await this.getProceduresUser(userId);
    if (!user || !user.assignedProcedureCodes || user.assignedProcedureCodes.length === 0) {
      return [];
    }

    // Get day of week (lowercase)
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];

    // Get all templates the user is assigned to
    const templates = await db.select().from(proceduresTemplates)
      .where(and(
        eq(proceduresTemplates.isActive, true),
        inArray(proceduresTemplates.procedureCode, user.assignedProcedureCodes)
      ));

    // Filter by day of week and get items
    const result: ProceduresTemplateWithItems[] = [];
    for (const template of templates) {
      const daysOfWeek = template.daysOfWeek as Record<string, boolean> | null;
      if (daysOfWeek && daysOfWeek[today]) {
        const items = await this.getProceduresItems(template.id);
        result.push({ ...template, items });
      }
    }

    return result;
  }

  // Procedures Staff
  async getProceduresStaff(filters?: { isActive?: boolean }): Promise<ProceduresStaff[]> {
    if (filters?.isActive !== undefined) {
      return await db.select().from(proceduresStaff)
        .where(eq(proceduresStaff.isActive, filters.isActive))
        .orderBy(proceduresStaff.staffName);
    }
    return await db.select().from(proceduresStaff).orderBy(proceduresStaff.staffName);
  }

  async getProceduresStaffMember(id: string): Promise<ProceduresStaff | undefined> {
    const [staff] = await db.select().from(proceduresStaff).where(eq(proceduresStaff.id, id));
    return staff;
  }

  async getProceduresStaffByCode(code: string): Promise<ProceduresStaff | undefined> {
    const [staff] = await db.select().from(proceduresStaff)
      .where(and(eq(proceduresStaff.code, code), eq(proceduresStaff.isActive, true)));
    return staff;
  }

  async createProceduresStaff(data: InsertProceduresStaff): Promise<ProceduresStaff> {
    const [staff] = await db.insert(proceduresStaff).values(data).returning();
    return staff;
  }

  async updateProceduresStaff(id: string, data: Partial<InsertProceduresStaff>): Promise<ProceduresStaff | undefined> {
    const [updated] = await db.update(proceduresStaff)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(proceduresStaff.id, id))
      .returning();
    return updated;
  }

  async deleteProceduresStaff(id: string): Promise<boolean> {
    const result = await db.delete(proceduresStaff).where(eq(proceduresStaff.id, id)).returning();
    return result.length > 0;
  }

  // Get procedures assigned to a staff member (via assignedStaffIds on templates)
  async getProceduresForStaff(staffId: string): Promise<ProceduresTemplateWithItems[]> {
    // Get day of week (lowercase)
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];

    // Get all active templates that have this staff member assigned
    const templates = await db.select().from(proceduresTemplates)
      .where(eq(proceduresTemplates.isActive, true));

    // Filter templates that have this staff member in their assignedStaffIds
    const result: ProceduresTemplateWithItems[] = [];
    for (const template of templates) {
      const assignedStaffIds = template.assignedStaffIds as string[] | null;
      if (assignedStaffIds && assignedStaffIds.includes(staffId)) {
        // Check if today is a scheduled day
        const daysOfWeek = template.daysOfWeek as Record<string, boolean> | null;
        if (daysOfWeek && daysOfWeek[today]) {
          const items = await this.getProceduresItems(template.id);
          result.push({ ...template, items });
        }
      }
    }

    return result;
  }

  // Staff Dashboard Methods
  async getAllStaffDashboardModules(): Promise<(StaffDashboardModule & { module: PlatformModule })[]> {
    const results = await db.select()
      .from(staffDashboardModules)
      .innerJoin(platformModules, eq(staffDashboardModules.moduleId, platformModules.id))
      .orderBy(staffDashboardModules.sortOrder);
    
    return results.map(r => ({
      ...r.staff_dashboard_modules,
      module: r.platform_modules
    }));
  }

  async getEnabledStaffDashboardModules(): Promise<(StaffDashboardModule & { module: PlatformModule })[]> {
    const results = await db.select()
      .from(staffDashboardModules)
      .innerJoin(platformModules, eq(staffDashboardModules.moduleId, platformModules.id))
      .where(eq(staffDashboardModules.isEnabled, true))
      .orderBy(staffDashboardModules.sortOrder);
    
    return results.map(r => ({
      ...r.staff_dashboard_modules,
      module: r.platform_modules
    }));
  }

  async getStaffDashboardModule(moduleId: string): Promise<StaffDashboardModule | undefined> {
    const [result] = await db.select()
      .from(staffDashboardModules)
      .where(eq(staffDashboardModules.moduleId, moduleId));
    return result;
  }

  async upsertStaffDashboardModule(data: InsertStaffDashboardModule): Promise<StaffDashboardModule> {
    const [result] = await db.insert(staffDashboardModules)
      .values(data)
      .onConflictDoUpdate({
        target: staffDashboardModules.moduleId,
        set: {
          isEnabled: data.isEnabled,
          linkUrl: data.linkUrl,
          customLabel: data.customLabel,
          customDescription: data.customDescription,
          sortOrder: data.sortOrder,
          updatedAt: new Date()
        }
      })
      .returning();
    return result;
  }

  async updateStaffDashboardModule(id: string, data: Partial<InsertStaffDashboardModule>): Promise<StaffDashboardModule | undefined> {
    const [result] = await db.update(staffDashboardModules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(staffDashboardModules.id, id))
      .returning();
    return result;
  }

  async initializeStaffDashboardModules(): Promise<void> {
    // Get all platform modules
    const modules = await db.select().from(platformModules);
    
    // Default URL mappings for customer/staff-facing pages
    const defaultUrls: Record<string, string> = {
      'tasting': '/reservations',
      'reservations': '/reservations',
      'b2b': '/b2b',
      'lms': '/lms',
      'daily_reports': '/daily-report',
      'procedures': '/procedures',
      'compliance': '/compliance',
      'maintenance': '/maintenance',
      'spot_inventory': '/spot-inventory',
    };

    for (const module of modules) {
      // Check if entry exists
      const existing = await this.getStaffDashboardModule(module.id);
      if (!existing) {
        // Create default entry
        const linkUrl = defaultUrls[module.moduleKey] || `/${module.moduleKey}`;
        await db.insert(staffDashboardModules).values({
          moduleId: module.id,
          isEnabled: false,
          linkUrl: linkUrl,
          sortOrder: module.sortOrder
        }).onConflictDoNothing();
      }
    }
  }

  // ============================================
  // CUSTOMER SUPPORT MODULE
  // ============================================

  async getSupportRequests(filters?: { status?: string; limit?: number }): Promise<SupportRequest[]> {
    let query = db.select().from(supportRequests).orderBy(desc(supportRequests.createdAt));
    
    if (filters?.status) {
      query = query.where(eq(supportRequests.status, filters.status)) as typeof query;
    }
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }
    
    return await query;
  }

  async getSupportRequest(id: string): Promise<SupportRequest | undefined> {
    const [result] = await db.select().from(supportRequests).where(eq(supportRequests.id, id));
    return result;
  }

  async getSupportRequestWithMessages(id: string): Promise<SupportRequestWithMessages | undefined> {
    const request = await this.getSupportRequest(id);
    if (!request) return undefined;
    
    const messages = await db.select()
      .from(supportMessages)
      .where(eq(supportMessages.requestId, id))
      .orderBy(supportMessages.createdAt);
    
    // Create a synthetic first message from the initialMessage if it exists
    // and there isn't already a message with the same content at the start
    const allMessages = [...messages];
    if (request.initialMessage) {
      const hasInitialInMessages = messages.length > 0 && 
        messages[0].content === request.initialMessage &&
        messages[0].senderType === 'customer';
      
      if (!hasInitialInMessages) {
        // Add the initial message as the first message
        const syntheticFirstMessage = {
          id: `initial-${id}`,
          requestId: id,
          senderType: 'customer' as const,
          senderName: request.customerName || request.customerEmail || 'Customer',
          senderId: null,
          content: request.initialMessage,
          isInternal: false,
          metadata: {},
          emailMessageId: request.emailMessageId || null,
          createdAt: request.createdAt,
        };
        allMessages.unshift(syntheticFirstMessage);
      }
    }
    
    return { ...request, messages: allMessages };
  }

  async createSupportRequest(data: InsertSupportRequest): Promise<SupportRequest> {
    const [result] = await db.insert(supportRequests).values(data).returning();
    return result;
  }

  async updateSupportRequest(id: string, data: Partial<InsertSupportRequest>): Promise<SupportRequest | undefined> {
    const [result] = await db.update(supportRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(supportRequests.id, id))
      .returning();
    return result;
  }

  async closeSupportRequest(id: string, closedById: string, closedByName: string): Promise<SupportRequest | undefined> {
    const [result] = await db.update(supportRequests)
      .set({ 
        status: 'closed', 
        closedAt: new Date(), 
        closedById, 
        closedByName,
        updatedAt: new Date() 
      })
      .where(eq(supportRequests.id, id))
      .returning();
    return result;
  }

  async getSupportMessages(requestId: string): Promise<SupportMessage[]> {
    return await db.select()
      .from(supportMessages)
      .where(eq(supportMessages.requestId, requestId))
      .orderBy(supportMessages.createdAt);
  }

  async getSupportMessage(messageId: string): Promise<SupportMessage | undefined> {
    const [result] = await db.select()
      .from(supportMessages)
      .where(eq(supportMessages.id, messageId))
      .limit(1);
    return result;
  }

  async updateSupportMessage(messageId: string, data: Partial<InsertSupportMessage>): Promise<SupportMessage | undefined> {
    const [result] = await db.update(supportMessages)
      .set(data)
      .where(eq(supportMessages.id, messageId))
      .returning();
    return result;
  }

  async getBotMessagesWithFeedback(limit: number = 50): Promise<SupportMessage[]> {
    // Efficiently get bot messages that have feedback in a single query
    // Uses SQL to filter messages with feedback in their JSONB metadata
    return await db.select()
      .from(supportMessages)
      .where(
        and(
          eq(supportMessages.senderType, 'bot'),
          sql`${supportMessages.metadata}->>'feedback' IS NOT NULL`
        )
      )
      .orderBy(desc(supportMessages.createdAt))
      .limit(limit);
  }

  async createSupportMessage(data: InsertSupportMessage): Promise<SupportMessage> {
    const [result] = await db.insert(supportMessages).values(data).returning();
    
    if (data.senderType === 'bot') {
      await db.update(supportRequests)
        .set({ status: 'bot_responded', updatedAt: new Date() })
        .where(eq(supportRequests.id, data.requestId));
    } else if (data.senderType === 'agent') {
      await db.update(supportRequests)
        .set({ status: 'human_responded', updatedAt: new Date() })
        .where(eq(supportRequests.id, data.requestId));
    }
    
    return result;
  }

  async getSupportCannedResponses(activeOnly: boolean = false): Promise<SupportCannedResponse[]> {
    if (activeOnly) {
      return await db.select()
        .from(supportCannedResponses)
        .where(eq(supportCannedResponses.isActive, true))
        .orderBy(desc(supportCannedResponses.priority), supportCannedResponses.title);
    }
    return await db.select()
      .from(supportCannedResponses)
      .orderBy(desc(supportCannedResponses.priority), supportCannedResponses.title);
  }

  async getSupportCannedResponse(id: string): Promise<SupportCannedResponse | undefined> {
    const [result] = await db.select().from(supportCannedResponses).where(eq(supportCannedResponses.id, id));
    return result;
  }

  async createSupportCannedResponse(data: InsertSupportCannedResponse): Promise<SupportCannedResponse> {
    const [result] = await db.insert(supportCannedResponses).values(data).returning();
    return result;
  }

  async updateSupportCannedResponse(id: string, data: Partial<InsertSupportCannedResponse>): Promise<SupportCannedResponse | undefined> {
    const [result] = await db.update(supportCannedResponses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(supportCannedResponses.id, id))
      .returning();
    return result;
  }

  async deleteSupportCannedResponse(id: string): Promise<void> {
    await db.delete(supportCannedResponses).where(eq(supportCannedResponses.id, id));
  }

  async incrementCannedResponseUsage(id: string): Promise<void> {
    await db.update(supportCannedResponses)
      .set({ 
        usageCount: sql`${supportCannedResponses.usageCount} + 1`,
        lastUsedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(supportCannedResponses.id, id));
  }

  async getSupportWebSources(activeOnly: boolean = false): Promise<SupportWebSource[]> {
    if (activeOnly) {
      return await db.select()
        .from(supportWebSources)
        .where(eq(supportWebSources.isActive, true))
        .orderBy(supportWebSources.title);
    }
    return await db.select().from(supportWebSources).orderBy(supportWebSources.title);
  }

  async getSupportWebSource(id: string): Promise<SupportWebSource | undefined> {
    const [result] = await db.select().from(supportWebSources).where(eq(supportWebSources.id, id));
    return result;
  }

  async createSupportWebSource(data: InsertSupportWebSource): Promise<SupportWebSource> {
    const [result] = await db.insert(supportWebSources).values(data).returning();
    return result;
  }

  async updateSupportWebSource(id: string, data: Partial<InsertSupportWebSource> & { lastFetchedAt?: Date }): Promise<SupportWebSource | undefined> {
    const [result] = await db.update(supportWebSources)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(supportWebSources.id, id))
      .returning();
    return result;
  }

  async deleteSupportWebSource(id: string): Promise<void> {
    await db.delete(supportWebSources).where(eq(supportWebSources.id, id));
  }

  async getSupportSetting(key: string): Promise<SupportSetting | undefined> {
    const [result] = await db.select().from(supportSettings).where(eq(supportSettings.settingKey, key));
    return result;
  }

  async getSupportSettings(): Promise<SupportSetting[]> {
    return await db.select().from(supportSettings);
  }

  async upsertSupportSetting(key: string, value: string, updatedById?: string, updatedByName?: string): Promise<SupportSetting> {
    const [result] = await db.insert(supportSettings)
      .values({
        settingKey: key,
        settingValue: value,
        updatedById,
        updatedByName,
      })
      .onConflictDoUpdate({
        target: supportSettings.settingKey,
        set: {
          settingValue: value,
          updatedById,
          updatedByName,
          updatedAt: new Date()
        }
      })
      .returning();
    return result;
  }

  // Knowledge Base - Categories
  async getSupportCategories(activeOnly: boolean = false): Promise<SupportCategory[]> {
    if (activeOnly) {
      return await db.select()
        .from(supportCategories)
        .where(eq(supportCategories.isActive, true))
        .orderBy(supportCategories.sortOrder, supportCategories.name);
    }
    return await db.select()
      .from(supportCategories)
      .orderBy(supportCategories.sortOrder, supportCategories.name);
  }

  async getSupportCategory(id: string): Promise<SupportCategory | undefined> {
    const [result] = await db.select().from(supportCategories).where(eq(supportCategories.id, id));
    return result;
  }

  async getSupportCategoryBySlug(slug: string): Promise<SupportCategory | undefined> {
    const [result] = await db.select().from(supportCategories).where(eq(supportCategories.slug, slug));
    return result;
  }

  async createSupportCategory(data: InsertSupportCategory): Promise<SupportCategory> {
    const [result] = await db.insert(supportCategories).values(data).returning();
    return result;
  }

  async updateSupportCategory(id: string, data: Partial<InsertSupportCategory>): Promise<SupportCategory | undefined> {
    const [result] = await db.update(supportCategories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(supportCategories.id, id))
      .returning();
    return result;
  }

  async deleteSupportCategory(id: string): Promise<void> {
    await db.delete(supportCategories).where(eq(supportCategories.id, id));
  }

  // Knowledge Base - Articles
  async getSupportArticles(filters?: { status?: string; categoryId?: string; isPublic?: boolean }): Promise<SupportArticleWithRelations[]> {
    let query = db.select().from(supportArticles);
    const conditions: SQL[] = [];

    if (filters?.status) {
      conditions.push(eq(supportArticles.status, filters.status));
    }
    if (filters?.categoryId) {
      conditions.push(eq(supportArticles.categoryId, filters.categoryId));
    }
    if (filters?.isPublic !== undefined) {
      conditions.push(eq(supportArticles.isPublic, filters.isPublic));
    }

    const articles = conditions.length > 0
      ? await db.select().from(supportArticles).where(and(...conditions)).orderBy(desc(supportArticles.priority), desc(supportArticles.updatedAt))
      : await db.select().from(supportArticles).orderBy(desc(supportArticles.priority), desc(supportArticles.updatedAt));

    // Fetch categories and tags for each article
    const result: SupportArticleWithRelations[] = [];
    for (const article of articles) {
      const category = article.categoryId 
        ? await this.getSupportCategory(article.categoryId)
        : null;
      const tags = await this.getSupportArticleTags(article.id);
      result.push({ ...article, category, tags });
    }
    return result;
  }

  async getSupportArticle(id: string): Promise<SupportArticleWithRelations | undefined> {
    const [article] = await db.select().from(supportArticles).where(eq(supportArticles.id, id));
    if (!article) return undefined;
    
    const category = article.categoryId 
      ? await this.getSupportCategory(article.categoryId)
      : null;
    const tags = await this.getSupportArticleTags(article.id);
    return { ...article, category, tags };
  }

  async getSupportArticleBySlug(slug: string): Promise<SupportArticleWithRelations | undefined> {
    const [article] = await db.select().from(supportArticles).where(eq(supportArticles.slug, slug));
    if (!article) return undefined;
    
    const category = article.categoryId 
      ? await this.getSupportCategory(article.categoryId)
      : null;
    const tags = await this.getSupportArticleTags(article.id);
    return { ...article, category, tags };
  }

  async createSupportArticle(data: InsertSupportArticle, tagIds?: string[]): Promise<SupportArticle> {
    const [result] = await db.insert(supportArticles).values(data).returning();
    
    if (tagIds && tagIds.length > 0) {
      await this.setSupportArticleTags(result.id, tagIds);
    }
    
    return result;
  }

  async updateSupportArticle(id: string, data: Partial<InsertSupportArticle>, tagIds?: string[]): Promise<SupportArticle | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    
    // If publishing, set publishedAt
    if (data.status === 'published') {
      const existing = await this.getSupportArticle(id);
      if (existing && !existing.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }
    
    const [result] = await db.update(supportArticles)
      .set(updateData)
      .where(eq(supportArticles.id, id))
      .returning();
    
    if (tagIds !== undefined) {
      await this.setSupportArticleTags(id, tagIds);
    }
    
    return result;
  }

  async deleteSupportArticle(id: string): Promise<void> {
    await db.delete(supportArticles).where(eq(supportArticles.id, id));
  }

  async incrementArticleViewCount(id: string): Promise<void> {
    await db.update(supportArticles)
      .set({ viewCount: sql`${supportArticles.viewCount} + 1` })
      .where(eq(supportArticles.id, id));
  }

  async recordArticleFeedback(id: string, helpful: boolean): Promise<void> {
    if (helpful) {
      await db.update(supportArticles)
        .set({ helpfulCount: sql`${supportArticles.helpfulCount} + 1` })
        .where(eq(supportArticles.id, id));
    } else {
      await db.update(supportArticles)
        .set({ notHelpfulCount: sql`${supportArticles.notHelpfulCount} + 1` })
        .where(eq(supportArticles.id, id));
    }
  }

  // Knowledge Base - Tags
  async getSupportTags(): Promise<SupportTag[]> {
    return await db.select().from(supportTags).orderBy(supportTags.name);
  }

  async getSupportTag(id: string): Promise<SupportTag | undefined> {
    const [result] = await db.select().from(supportTags).where(eq(supportTags.id, id));
    return result;
  }

  async createSupportTag(data: InsertSupportTag): Promise<SupportTag> {
    const [result] = await db.insert(supportTags).values(data).returning();
    return result;
  }

  async updateSupportTag(id: string, data: Partial<InsertSupportTag>): Promise<SupportTag | undefined> {
    const [result] = await db.update(supportTags)
      .set(data)
      .where(eq(supportTags.id, id))
      .returning();
    return result;
  }

  async deleteSupportTag(id: string): Promise<void> {
    await db.delete(supportTags).where(eq(supportTags.id, id));
  }

  // Article-Tag associations
  async getSupportArticleTags(articleId: string): Promise<SupportTag[]> {
    const result = await db.select({ tag: supportTags })
      .from(supportArticleTags)
      .innerJoin(supportTags, eq(supportArticleTags.tagId, supportTags.id))
      .where(eq(supportArticleTags.articleId, articleId));
    return result.map(r => r.tag);
  }

  async setSupportArticleTags(articleId: string, tagIds: string[]): Promise<void> {
    // Remove existing tags
    await db.delete(supportArticleTags).where(eq(supportArticleTags.articleId, articleId));
    
    // Add new tags
    if (tagIds.length > 0) {
      await db.insert(supportArticleTags).values(
        tagIds.map(tagId => ({ articleId, tagId }))
      );
    }
  }

  // Search articles for AI chatbot
  async searchSupportArticles(searchTerm: string, limit: number = 5): Promise<SupportArticleWithRelations[]> {
    const lowerSearch = `%${searchTerm.toLowerCase()}%`;
    
    const articles = await db.select()
      .from(supportArticles)
      .where(
        and(
          eq(supportArticles.status, 'published'),
          or(
            sql`LOWER(${supportArticles.title}) LIKE ${lowerSearch}`,
            sql`LOWER(${supportArticles.summary}) LIKE ${lowerSearch}`,
            sql`LOWER(${supportArticles.content}) LIKE ${lowerSearch}`,
            sql`${searchTerm} = ANY(${supportArticles.searchKeywords})`
          )
        )
      )
      .orderBy(desc(supportArticles.priority))
      .limit(limit);

    const result: SupportArticleWithRelations[] = [];
    for (const article of articles) {
      const category = article.categoryId 
        ? await this.getSupportCategory(article.categoryId)
        : null;
      const tags = await this.getSupportArticleTags(article.id);
      result.push({ ...article, category, tags });
    }
    return result;
  }

  // Get articles grouped by category for FAQ page
  async getPublicFAQArticles(): Promise<{ category: SupportCategory; articles: SupportArticle[] }[]> {
    const categories = await this.getSupportCategories(true);
    const result: { category: SupportCategory; articles: SupportArticle[] }[] = [];

    for (const category of categories) {
      const articles = await db.select()
        .from(supportArticles)
        .where(
          and(
            eq(supportArticles.categoryId, category.id),
            eq(supportArticles.status, 'published'),
            eq(supportArticles.isPublic, true)
          )
        )
        .orderBy(desc(supportArticles.priority), supportArticles.title);
      
      if (articles.length > 0) {
        result.push({ category, articles });
      }
    }

    return result;
  }

  // Get support analytics data
  async getSupportAnalytics(): Promise<{
    topArticles: SupportArticle[];
    articleStats: { total: number; published: number; draft: number; totalViews: number; totalHelpful: number; totalNotHelpful: number };
    requestStats: { total: number; new: number; inProgress: number; closed: number };
    recentRequests: SupportRequest[];
    botPerformance: {
      deflectionRate: number;
      botResolvedCount: number;
      totalResolved: number;
      avgResponseTimeMinutes: number;
      avgResolutionTimeMinutes: number;
      satisfactionScore: number;
      feedbackUp: number;
      feedbackDown: number;
      emailRequests: number;
      widgetRequests: number;
      dailyVolume: { date: string; count: number }[];
      statusBreakdown: Record<string, number>;
    };
  }> {
    // Top articles by views
    const topArticles = await db.select()
      .from(supportArticles)
      .where(eq(supportArticles.status, 'published'))
      .orderBy(desc(supportArticles.viewCount))
      .limit(10);

    // Article stats
    const allArticles = await db.select().from(supportArticles);
    const articleStats = {
      total: allArticles.length,
      published: allArticles.filter(a => a.status === 'published').length,
      draft: allArticles.filter(a => a.status === 'draft').length,
      totalViews: allArticles.reduce((sum, a) => sum + (a.viewCount || 0), 0),
      totalHelpful: allArticles.reduce((sum, a) => sum + (a.helpfulCount || 0), 0),
      totalNotHelpful: allArticles.reduce((sum, a) => sum + (a.notHelpfulCount || 0), 0)
    };

    // Request stats
    const allRequests = await db.select().from(supportRequests);
    const requestStats = {
      total: allRequests.length,
      new: allRequests.filter(r => r.status === 'new' || r.status === 'customer_replied').length,
      inProgress: allRequests.filter(r => r.status === 'in_progress' || r.status === 'bot_responded' || r.status === 'human_responded').length,
      closed: allRequests.filter(r => r.status === 'closed').length
    };

    // Recent requests
    const recentRequests = await db.select()
      .from(supportRequests)
      .orderBy(desc(supportRequests.createdAt))
      .limit(5);

    // Bot performance analytics
    const allMessages = await db.select().from(supportMessages);
    
    // Group messages by request
    const messagesByRequest: Record<string, typeof allMessages> = {};
    allMessages.forEach(msg => {
      if (!messagesByRequest[msg.requestId]) {
        messagesByRequest[msg.requestId] = [];
      }
      messagesByRequest[msg.requestId].push(msg);
    });

    // Calculate bot deflection rate
    const resolvedRequests = allRequests.filter(r => r.status === 'closed' || r.status === 'resolved');
    const botResolvedRequests = resolvedRequests.filter(r => {
      const messages = messagesByRequest[r.id] || [];
      const hasBotMessage = messages.some(m => m.senderType === 'bot');
      const hasAgentMessage = messages.some(m => m.senderType === 'agent');
      return hasBotMessage && !hasAgentMessage;
    });

    const totalResolved = resolvedRequests.length;
    const botResolvedCount = botResolvedRequests.length;
    const deflectionRate = totalResolved > 0 ? (botResolvedCount / totalResolved) * 100 : 0;

    // Calculate response and resolution times
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    let totalResolutionTime = 0;
    let resolutionTimeCount = 0;

    allRequests.forEach(request => {
      const messages = messagesByRequest[request.id] || [];
      const firstResponse = messages
        .filter(m => m.senderType === 'bot' || m.senderType === 'agent')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
      
      if (firstResponse) {
        const responseTime = (new Date(firstResponse.createdAt).getTime() - new Date(request.createdAt).getTime()) / 60000;
        if (responseTime >= 0) {
          totalResponseTime += responseTime;
          responseTimeCount++;
        }
      }

      if (request.status === 'closed' || request.status === 'resolved') {
        const resolutionTime = (new Date(request.updatedAt).getTime() - new Date(request.createdAt).getTime()) / 60000;
        if (resolutionTime >= 0) {
          totalResolutionTime += resolutionTime;
          resolutionTimeCount++;
        }
      }
    });

    const avgResponseTimeMinutes = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;
    const avgResolutionTimeMinutes = resolutionTimeCount > 0 ? totalResolutionTime / resolutionTimeCount : 0;

    // Calculate satisfaction from message feedback
    let feedbackUp = 0;
    let feedbackDown = 0;
    allMessages.forEach(msg => {
      const metadata = msg.metadata as Record<string, any> | null;
      if (metadata?.feedback === 'up') {
        feedbackUp++;
      } else if (metadata?.feedback === 'down') {
        feedbackDown++;
      }
    });
    const totalFeedback = feedbackUp + feedbackDown;
    const satisfactionScore = totalFeedback > 0 ? (feedbackUp / totalFeedback) * 100 : 0;

    // Request sources
    let emailRequests = 0;
    let widgetRequests = 0;
    allRequests.forEach(r => {
      const metadata = r.metadata as Record<string, any> | null;
      if (metadata?.source === 'email' || metadata?.emailMessageId) {
        emailRequests++;
      } else {
        widgetRequests++;
      }
    });

    // Daily volume (last 30 days)
    const dailyVolumeMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyVolumeMap[dateStr] = 0;
    }
    allRequests.forEach(r => {
      const dateStr = new Date(r.createdAt).toISOString().split('T')[0];
      if (dailyVolumeMap[dateStr] !== undefined) {
        dailyVolumeMap[dateStr]++;
      }
    });
    const dailyVolume = Object.entries(dailyVolumeMap).map(([date, count]) => ({ date, count }));

    // Status breakdown
    const statusBreakdown: Record<string, number> = {};
    allRequests.forEach(r => {
      statusBreakdown[r.status] = (statusBreakdown[r.status] || 0) + 1;
    });

    const botPerformance = {
      deflectionRate,
      botResolvedCount,
      totalResolved,
      avgResponseTimeMinutes,
      avgResolutionTimeMinutes,
      satisfactionScore,
      feedbackUp,
      feedbackDown,
      emailRequests,
      widgetRequests,
      dailyVolume,
      statusBreakdown
    };

    return { topArticles, articleStats, requestStats, recentRequests, botPerformance };
  }

  // Get top FAQ articles for widget
  async getTopFAQArticles(limit: number = 5): Promise<SupportArticle[]> {
    return db.select()
      .from(supportArticles)
      .where(
        and(
          eq(supportArticles.status, 'published'),
          eq(supportArticles.isPublic, true)
        )
      )
      .orderBy(desc(supportArticles.viewCount), desc(supportArticles.helpfulCount))
      .limit(limit);
  }

  // ============ Email Inbound Support ============

  // Find existing request by email thread ID
  async getSupportRequestByEmailThread(emailThreadId: string): Promise<SupportRequest | undefined> {
    const [result] = await db.select()
      .from(supportRequests)
      .where(eq(supportRequests.emailThreadId, emailThreadId));
    return result;
  }

  // Find existing message by email Message-ID (for deduplication)
  async getSupportMessageByEmailId(emailMessageId: string): Promise<SupportMessage | undefined> {
    const [result] = await db.select()
      .from(supportMessages)
      .where(eq(supportMessages.emailMessageId, emailMessageId));
    return result;
  }

  // Support Attachments
  async getAttachmentsForRequest(requestId: string): Promise<SupportAttachment[]> {
    return db.select()
      .from(supportAttachments)
      .where(eq(supportAttachments.requestId, requestId))
      .orderBy(supportAttachments.createdAt);
  }

  async getAttachmentsForMessage(messageId: string): Promise<SupportAttachment[]> {
    return db.select()
      .from(supportAttachments)
      .where(eq(supportAttachments.messageId, messageId))
      .orderBy(supportAttachments.createdAt);
  }

  async createSupportAttachment(data: InsertSupportAttachment): Promise<SupportAttachment> {
    const [result] = await db.insert(supportAttachments).values(data).returning();
    return result;
  }

  async deleteSupportAttachment(id: string): Promise<void> {
    await db.delete(supportAttachments).where(eq(supportAttachments.id, id));
  }

  // ============ Social Review Monitoring ============

  // Social Channels
  async getSocialChannels(): Promise<SocialChannel[]> {
    return db.select().from(socialChannels).orderBy(desc(socialChannels.createdAt));
  }

  async getSocialChannel(id: string): Promise<SocialChannel | undefined> {
    const [result] = await db.select().from(socialChannels).where(eq(socialChannels.id, id));
    return result;
  }

  async createSocialChannel(data: InsertSocialChannel): Promise<SocialChannel> {
    const [result] = await db.insert(socialChannels).values(data).returning();
    return result;
  }

  async updateSocialChannel(id: string, data: Partial<InsertSocialChannel>): Promise<SocialChannel | undefined> {
    const [result] = await db.update(socialChannels)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(socialChannels.id, id))
      .returning();
    return result;
  }

  async deleteSocialChannel(id: string): Promise<void> {
    await db.delete(socialChannels).where(eq(socialChannels.id, id));
  }

  // Social Reviews
  async getSocialReviews(filters?: { 
    platform?: string; 
    status?: string; 
    channelId?: string;
    requiresResponse?: boolean;
  }): Promise<SocialReviewWithChannel[]> {
    const conditions: SQL<unknown>[] = [];
    
    if (filters?.platform) {
      conditions.push(eq(socialReviews.platform, filters.platform));
    }
    if (filters?.status) {
      conditions.push(eq(socialReviews.status, filters.status));
    }
    if (filters?.channelId) {
      conditions.push(eq(socialReviews.channelId, filters.channelId));
    }
    if (filters?.requiresResponse !== undefined) {
      conditions.push(eq(socialReviews.requiresResponse, filters.requiresResponse));
    }

    const reviews = conditions.length > 0
      ? await db.select().from(socialReviews).where(and(...conditions)).orderBy(desc(socialReviews.reviewCreatedAt))
      : await db.select().from(socialReviews).orderBy(desc(socialReviews.reviewCreatedAt));

    // Get channels for reviews
    const channelIds = [...new Set(reviews.map(r => r.channelId))];
    const channels = channelIds.length > 0 
      ? await db.select().from(socialChannels).where(inArray(socialChannels.id, channelIds))
      : [];
    const channelMap = new Map(channels.map(c => [c.id, c]));

    // Get responses for reviews
    const reviewIds = reviews.map(r => r.id);
    const responses = reviewIds.length > 0
      ? await db.select().from(socialReviewResponses).where(inArray(socialReviewResponses.reviewId, reviewIds))
      : [];
    const responseMap = new Map<string, SocialReviewResponse[]>();
    responses.forEach(r => {
      if (!responseMap.has(r.reviewId)) {
        responseMap.set(r.reviewId, []);
      }
      responseMap.get(r.reviewId)!.push(r);
    });

    return reviews.map(review => ({
      ...review,
      channel: channelMap.get(review.channelId) || null,
      responses: responseMap.get(review.id) || []
    }));
  }

  async getSocialReview(id: string): Promise<SocialReviewWithChannel | undefined> {
    const [review] = await db.select().from(socialReviews).where(eq(socialReviews.id, id));
    if (!review) return undefined;

    const [channel] = await db.select().from(socialChannels).where(eq(socialChannels.id, review.channelId));
    const responses = await db.select().from(socialReviewResponses).where(eq(socialReviewResponses.reviewId, id));

    return { ...review, channel: channel || null, responses };
  }

  async createSocialReview(data: InsertSocialReview): Promise<SocialReview> {
    const [result] = await db.insert(socialReviews).values(data).returning();
    return result;
  }

  async updateSocialReview(id: string, data: Partial<InsertSocialReview>): Promise<SocialReview | undefined> {
    const [result] = await db.update(socialReviews)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(socialReviews.id, id))
      .returning();
    return result;
  }

  async deleteSocialReview(id: string): Promise<void> {
    await db.delete(socialReviews).where(eq(socialReviews.id, id));
  }

  // Social Review Responses
  async getSocialReviewResponses(reviewId: string): Promise<SocialReviewResponse[]> {
    return db.select().from(socialReviewResponses)
      .where(eq(socialReviewResponses.reviewId, reviewId))
      .orderBy(desc(socialReviewResponses.createdAt));
  }

  async createSocialReviewResponse(data: InsertSocialReviewResponse): Promise<SocialReviewResponse> {
    const [result] = await db.insert(socialReviewResponses).values(data).returning();
    return result;
  }

  async updateSocialReviewResponse(id: string, data: Partial<InsertSocialReviewResponse>): Promise<SocialReviewResponse | undefined> {
    const [result] = await db.update(socialReviewResponses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(socialReviewResponses.id, id))
      .returning();
    return result;
  }

  async deleteSocialReviewResponse(id: string): Promise<void> {
    await db.delete(socialReviewResponses).where(eq(socialReviewResponses.id, id));
  }

  // Social Review Stats for analytics
  async getSocialReviewStats(): Promise<{
    totalReviews: number;
    newReviews: number;
    respondedReviews: number;
    averageRating: number;
    byPlatform: { platform: string; count: number; avgRating: number }[];
  }> {
    const allReviews = await db.select().from(socialReviews);
    
    const reviewsWithRating = allReviews.filter(r => r.rating !== null);
    const averageRating = reviewsWithRating.length > 0
      ? reviewsWithRating.reduce((sum, r) => sum + (r.rating || 0), 0) / reviewsWithRating.length
      : 0;

    // Group by platform
    const platformStats = new Map<string, { count: number; totalRating: number; ratingCount: number }>();
    allReviews.forEach(r => {
      const stat = platformStats.get(r.platform) || { count: 0, totalRating: 0, ratingCount: 0 };
      stat.count++;
      if (r.rating !== null) {
        stat.totalRating += r.rating;
        stat.ratingCount++;
      }
      platformStats.set(r.platform, stat);
    });

    const byPlatform = Array.from(platformStats.entries()).map(([platform, stat]) => ({
      platform,
      count: stat.count,
      avgRating: stat.ratingCount > 0 ? stat.totalRating / stat.ratingCount : 0
    }));

    return {
      totalReviews: allReviews.length,
      newReviews: allReviews.filter(r => r.status === 'new').length,
      respondedReviews: allReviews.filter(r => r.status === 'responded').length,
      averageRating: Math.round(averageRating * 10) / 10,
      byPlatform
    };
  }

  // ============ Support Agents ============

  async getSupportAgents(): Promise<SupportAgent[]> {
    return db.select()
      .from(supportAgents)
      .orderBy(supportAgents.displayName);
  }

  async getActiveSupportAgents(): Promise<SupportAgent[]> {
    return db.select()
      .from(supportAgents)
      .where(eq(supportAgents.isActive, true))
      .orderBy(supportAgents.displayName);
  }

  async getSupportAgent(id: string): Promise<SupportAgent | undefined> {
    const [result] = await db.select()
      .from(supportAgents)
      .where(eq(supportAgents.id, id));
    return result;
  }

  async getSupportAgentByPlatformUserId(platformUserId: string): Promise<SupportAgent | undefined> {
    const [result] = await db.select()
      .from(supportAgents)
      .where(eq(supportAgents.platformUserId, platformUserId));
    return result;
  }

  async getSupportAgentByPin(pinCode: string): Promise<SupportAgent | undefined> {
    const [result] = await db.select()
      .from(supportAgents)
      .where(
        and(
          eq(supportAgents.pinCode, pinCode),
          eq(supportAgents.isActive, true)
        )
      );
    return result;
  }

  async createSupportAgent(data: InsertSupportAgent): Promise<SupportAgent> {
    const [result] = await db.insert(supportAgents).values(data).returning();
    return result;
  }

  async updateSupportAgent(id: string, data: Partial<InsertSupportAgent>): Promise<SupportAgent | undefined> {
    const [result] = await db.update(supportAgents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(supportAgents.id, id))
      .returning();
    return result;
  }

  async deleteSupportAgent(id: string): Promise<void> {
    await db.delete(supportAgents).where(eq(supportAgents.id, id));
  }

  async getDefaultSupportAgent(): Promise<SupportAgent | undefined> {
    const [result] = await db.select()
      .from(supportAgents)
      .where(
        and(
          eq(supportAgents.isDefaultAgent, true),
          eq(supportAgents.isActive, true)
        )
      );
    return result;
  }

  // Agent Categories
  async getSupportAgentCategories(agentId: string): Promise<SupportAgentCategory[]> {
    return db.select()
      .from(supportAgentCategories)
      .where(eq(supportAgentCategories.agentId, agentId));
  }

  async getAgentsForCategory(categoryId: string): Promise<SupportAgent[]> {
    const agentCats = await db.select()
      .from(supportAgentCategories)
      .where(eq(supportAgentCategories.categoryId, categoryId));
    
    if (agentCats.length === 0) return [];
    
    const agentIds = agentCats.map(ac => ac.agentId);
    return db.select()
      .from(supportAgents)
      .where(
        and(
          sql`${supportAgents.id} IN (${sql.join(agentIds.map(id => sql`${id}`), sql`, `)})`,
          eq(supportAgents.isActive, true)
        )
      );
  }

  async getLeadAgentForCategory(categoryId: string): Promise<SupportAgent | undefined> {
    const [agentCat] = await db.select()
      .from(supportAgentCategories)
      .where(
        and(
          eq(supportAgentCategories.categoryId, categoryId),
          eq(supportAgentCategories.isLead, true)
        )
      );
    
    if (!agentCat) return undefined;
    
    return this.getSupportAgent(agentCat.agentId);
  }

  async setSupportAgentCategories(agentId: string, categoryAssignments: { categoryId: string; isLead: boolean }[]): Promise<void> {
    // Delete existing assignments
    await db.delete(supportAgentCategories)
      .where(eq(supportAgentCategories.agentId, agentId));
    
    // Insert new assignments
    if (categoryAssignments.length > 0) {
      await db.insert(supportAgentCategories).values(
        categoryAssignments.map(ca => ({
          agentId,
          categoryId: ca.categoryId,
          isLead: ca.isLead
        }))
      );
    }
  }

  // Agent Access Tokens
  async createAgentAccessToken(data: {
    agentId: string;
    requestId: string;
    token: string;
    action: string;
    expiresAt: Date;
  }): Promise<void> {
    await db.insert(supportAgentAccessTokens).values(data);
  }

  async getAgentAccessToken(token: string): Promise<{
    id: string;
    agentId: string;
    requestId: string;
    action: string;
    expiresAt: Date;
    usedAt: Date | null;
  } | undefined> {
    const [result] = await db.select()
      .from(supportAgentAccessTokens)
      .where(eq(supportAgentAccessTokens.token, token));
    return result;
  }

  async markAgentAccessTokenUsed(token: string): Promise<void> {
    await db.update(supportAgentAccessTokens)
      .set({ usedAt: new Date() })
      .where(eq(supportAgentAccessTokens.token, token));
  }

  async resetAgentAccessTokenUsage(token: string): Promise<void> {
    await db.update(supportAgentAccessTokens)
      .set({ usedAt: null })
      .where(eq(supportAgentAccessTokens.token, token));
  }

  async cleanupExpiredAccessTokens(): Promise<void> {
    await db.delete(supportAgentAccessTokens)
      .where(sql`${supportAgentAccessTokens.expiresAt} < NOW()`);
  }

  // Get agents to notify for a new ticket based on category
  async getSupportAgentsForNotification(category: string | null): Promise<SupportAgent[]> {
    // If category provided, get agents assigned to that category
    if (category) {
      // First try to find the category by name
      const [cat] = await db.select()
        .from(supportCategories)
        .where(eq(supportCategories.name, category));
      
      if (cat) {
        const categoryAgents = await this.getAgentsForCategory(cat.id);
        if (categoryAgents.length > 0) {
          // Filter to those with email notifications enabled
          return categoryAgents.filter(a => a.receiveEmailNotifications);
        }
      }
    }
    
    // Fall back to default agent if no category match
    const defaultAgent = await this.getDefaultSupportAgent();
    if (defaultAgent && defaultAgent.receiveEmailNotifications) {
      return [defaultAgent];
    }
    
    // If no default, return all active agents with notifications enabled
    const allAgents = await this.getActiveSupportAgents();
    return allAgents.filter(a => a.receiveEmailNotifications);
  }

  // ===================== LMS MODULE =====================

  // LMS Categories
  async getLmsCategories(): Promise<LmsCategory[]> {
    return db.select().from(lmsCategories).orderBy(lmsCategories.sortOrder);
  }

  async getLmsCategory(id: string): Promise<LmsCategory | undefined> {
    const [category] = await db.select().from(lmsCategories).where(eq(lmsCategories.id, id));
    return category;
  }

  async createLmsCategory(data: InsertLmsCategory): Promise<LmsCategory> {
    const [category] = await db.insert(lmsCategories).values(data).returning();
    return category;
  }

  async updateLmsCategory(id: string, data: Partial<InsertLmsCategory>): Promise<LmsCategory | undefined> {
    const [category] = await db.update(lmsCategories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(lmsCategories.id, id))
      .returning();
    return category;
  }

  async deleteLmsCategory(id: string): Promise<boolean> {
    const result = await db.delete(lmsCategories).where(eq(lmsCategories.id, id));
    return true;
  }

  // LMS Courses
  async getLmsCourses(includeArchived = false): Promise<LmsCourse[]> {
    if (includeArchived) {
      return db.select().from(lmsCourses).orderBy(lmsCourses.sortOrder);
    }
    return db.select().from(lmsCourses)
      .where(sql`${lmsCourses.status} != 'archived'`)
      .orderBy(lmsCourses.sortOrder);
  }

  async getLmsCourse(id: string): Promise<LmsCourse | undefined> {
    const [course] = await db.select().from(lmsCourses).where(eq(lmsCourses.id, id));
    return course;
  }

  async getLmsCourseWithDetails(id: string): Promise<LmsCourseWithDetails | undefined> {
    const course = await this.getLmsCourse(id);
    if (!course) return undefined;

    const lessons = await this.getLmsLessons(id);
    const category = course.categoryId ? await this.getLmsCategory(course.categoryId) : undefined;
    const quizQuestions = await db.select().from(lmsQuizQuestions)
      .where(eq(lmsQuizQuestions.courseId, id))
      .orderBy(lmsQuizQuestions.sortOrder);

    return {
      ...course,
      category,
      lessons,
      quizQuestions,
    };
  }

  async createLmsCourse(data: InsertLmsCourse): Promise<LmsCourse> {
    const [course] = await db.insert(lmsCourses).values(data).returning();
    return course;
  }

  async updateLmsCourse(id: string, data: Partial<InsertLmsCourse>): Promise<LmsCourse | undefined> {
    const [course] = await db.update(lmsCourses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(lmsCourses.id, id))
      .returning();
    return course;
  }

  async deleteLmsCourse(id: string): Promise<boolean> {
    await db.delete(lmsCourses).where(eq(lmsCourses.id, id));
    return true;
  }

  async publishLmsCourse(id: string): Promise<LmsCourse | undefined> {
    const [course] = await db.update(lmsCourses)
      .set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(lmsCourses.id, id))
      .returning();
    return course;
  }

  async archiveLmsCourse(id: string): Promise<LmsCourse | undefined> {
    const [course] = await db.update(lmsCourses)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(lmsCourses.id, id))
      .returning();
    return course;
  }

  // LMS Lessons
  async getLmsLessons(courseId: string): Promise<LmsLesson[]> {
    return db.select().from(lmsLessons)
      .where(eq(lmsLessons.courseId, courseId))
      .orderBy(lmsLessons.sortOrder);
  }

  async getLmsLesson(id: string): Promise<LmsLesson | undefined> {
    const [lesson] = await db.select().from(lmsLessons).where(eq(lmsLessons.id, id));
    return lesson;
  }

  async createLmsLesson(data: InsertLmsLesson): Promise<LmsLesson> {
    const [lesson] = await db.insert(lmsLessons).values(data).returning();
    return lesson;
  }

  async updateLmsLesson(id: string, data: Partial<InsertLmsLesson>): Promise<LmsLesson | undefined> {
    const [lesson] = await db.update(lmsLessons)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(lmsLessons.id, id))
      .returning();
    return lesson;
  }

  async deleteLmsLesson(id: string): Promise<boolean> {
    await db.delete(lmsLessons).where(eq(lmsLessons.id, id));
    return true;
  }

  async reorderLmsLessons(courseId: string, lessonIds: string[]): Promise<void> {
    for (let i = 0; i < lessonIds.length; i++) {
      await db.update(lmsLessons)
        .set({ sortOrder: i })
        .where(eq(lmsLessons.id, lessonIds[i]));
    }
  }

  // LMS Lesson Pages
  async getLmsLessonPages(lessonId: string): Promise<LmsLessonPage[]> {
    return db.select().from(lmsLessonPages)
      .where(eq(lmsLessonPages.lessonId, lessonId))
      .orderBy(lmsLessonPages.sortOrder);
  }

  async getLmsLessonPage(id: string): Promise<LmsLessonPage | undefined> {
    const [page] = await db.select().from(lmsLessonPages).where(eq(lmsLessonPages.id, id));
    return page;
  }

  async createLmsLessonPage(data: InsertLmsLessonPage): Promise<LmsLessonPage> {
    const [page] = await db.insert(lmsLessonPages).values(data).returning();
    return page;
  }

  async updateLmsLessonPage(id: string, data: Partial<InsertLmsLessonPage>): Promise<LmsLessonPage | undefined> {
    const [page] = await db.update(lmsLessonPages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(lmsLessonPages.id, id))
      .returning();
    return page;
  }

  async deleteLmsLessonPage(id: string): Promise<boolean> {
    await db.delete(lmsLessonPages).where(eq(lmsLessonPages.id, id));
    return true;
  }

  async reorderLmsLessonPages(lessonId: string, pageIds: string[]): Promise<void> {
    for (let i = 0; i < pageIds.length; i++) {
      await db.update(lmsLessonPages)
        .set({ sortOrder: i, pageNumber: i + 1 })
        .where(eq(lmsLessonPages.id, pageIds[i]));
    }
  }

  // LMS Content Blocks
  async getLmsContentBlocks(lessonId: string): Promise<LmsContentBlock[]> {
    return db.select().from(lmsContentBlocks)
      .where(eq(lmsContentBlocks.lessonId, lessonId))
      .orderBy(lmsContentBlocks.sortOrder);
  }

  async getLmsPageContentBlocks(pageId: string): Promise<LmsContentBlock[]> {
    return db.select().from(lmsContentBlocks)
      .where(eq(lmsContentBlocks.pageId, pageId))
      .orderBy(lmsContentBlocks.sortOrder);
  }

  async getLmsContentBlock(id: string): Promise<LmsContentBlock | undefined> {
    const [block] = await db.select().from(lmsContentBlocks).where(eq(lmsContentBlocks.id, id));
    return block;
  }

  async createLmsContentBlock(data: InsertLmsContentBlock): Promise<LmsContentBlock> {
    const [block] = await db.insert(lmsContentBlocks).values(data).returning();
    return block;
  }

  async updateLmsContentBlock(id: string, data: Partial<InsertLmsContentBlock>): Promise<LmsContentBlock | undefined> {
    const [block] = await db.update(lmsContentBlocks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(lmsContentBlocks.id, id))
      .returning();
    return block;
  }

  async deleteLmsContentBlock(id: string): Promise<boolean> {
    await db.delete(lmsContentBlocks).where(eq(lmsContentBlocks.id, id));
    return true;
  }

  // LMS Question Banks
  async getLmsQuestionBanks(): Promise<LmsQuestionBank[]> {
    return db.select().from(lmsQuestionBanks).orderBy(lmsQuestionBanks.name);
  }

  async getLmsQuestionBank(id: string): Promise<LmsQuestionBank | undefined> {
    const [bank] = await db.select().from(lmsQuestionBanks).where(eq(lmsQuestionBanks.id, id));
    return bank;
  }

  async createLmsQuestionBank(data: InsertLmsQuestionBank): Promise<LmsQuestionBank> {
    const [bank] = await db.insert(lmsQuestionBanks).values(data).returning();
    return bank;
  }

  async updateLmsQuestionBank(id: string, data: Partial<InsertLmsQuestionBank>): Promise<LmsQuestionBank | undefined> {
    const [bank] = await db.update(lmsQuestionBanks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(lmsQuestionBanks.id, id))
      .returning();
    return bank;
  }

  async deleteLmsQuestionBank(id: string): Promise<boolean> {
    await db.delete(lmsQuestionBanks).where(eq(lmsQuestionBanks.id, id));
    return true;
  }

  // LMS Questions
  async getLmsQuestions(bankId: string): Promise<LmsQuestion[]> {
    return db.select().from(lmsQuestions)
      .where(eq(lmsQuestions.questionBankId, bankId))
      .orderBy(lmsQuestions.createdAt);
  }

  async getLmsQuestion(id: string): Promise<LmsQuestion | undefined> {
    const [question] = await db.select().from(lmsQuestions).where(eq(lmsQuestions.id, id));
    return question;
  }

  async createLmsQuestion(data: InsertLmsQuestion): Promise<LmsQuestion> {
    const [question] = await db.insert(lmsQuestions).values(data).returning();
    return question;
  }

  async updateLmsQuestion(id: string, data: Partial<InsertLmsQuestion>): Promise<LmsQuestion | undefined> {
    const [question] = await db.update(lmsQuestions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(lmsQuestions.id, id))
      .returning();
    return question;
  }

  async deleteLmsQuestion(id: string): Promise<boolean> {
    await db.delete(lmsQuestions).where(eq(lmsQuestions.id, id));
    return true;
  }

  // LMS Quizzes
  async getLmsQuizzes(courseId: string): Promise<LmsQuiz[]> {
    return db.select().from(lmsQuizzes)
      .where(eq(lmsQuizzes.courseId, courseId))
      .orderBy(lmsQuizzes.sortOrder);
  }

  async getLmsQuiz(id: string): Promise<LmsQuiz | undefined> {
    const [quiz] = await db.select().from(lmsQuizzes).where(eq(lmsQuizzes.id, id));
    return quiz;
  }

  async getLmsQuizByLessonId(lessonId: string): Promise<LmsQuiz | undefined> {
    const [quiz] = await db.select().from(lmsQuizzes).where(eq(lmsQuizzes.lessonId, lessonId));
    return quiz;
  }

  async createLmsQuiz(data: InsertLmsQuiz): Promise<LmsQuiz> {
    const [quiz] = await db.insert(lmsQuizzes).values(data).returning();
    return quiz;
  }

  async updateLmsQuiz(id: string, data: Partial<InsertLmsQuiz>): Promise<LmsQuiz | undefined> {
    const [quiz] = await db.update(lmsQuizzes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(lmsQuizzes.id, id))
      .returning();
    return quiz;
  }

  async deleteLmsQuiz(id: string): Promise<boolean> {
    await db.delete(lmsQuizzes).where(eq(lmsQuizzes.id, id));
    return true;
  }

  // LMS Quiz Questions
  async getLmsQuizQuestions(quizId: string): Promise<(LmsQuizQuestionLink & { question: LmsQuestion })[]> {
    const links = await db.select().from(lmsQuizQuestionLinks)
      .where(eq(lmsQuizQuestionLinks.quizId, quizId))
      .orderBy(lmsQuizQuestionLinks.sortOrder);
    
    const results = [];
    for (const link of links) {
      const question = await this.getLmsQuestion(link.questionId);
      if (question) {
        results.push({ ...link, question });
      }
    }
    return results;
  }

  async addLmsQuizQuestion(data: InsertLmsQuizQuestionLink): Promise<LmsQuizQuestionLink> {
    const [link] = await db.insert(lmsQuizQuestionLinks).values(data).returning();
    return link;
  }

  async removeLmsQuizQuestion(quizId: string, questionId: string): Promise<boolean> {
    await db.delete(lmsQuizQuestionLinks)
      .where(and(
        eq(lmsQuizQuestionLinks.quizId, quizId),
        eq(lmsQuizQuestionLinks.questionId, questionId)
      ));
    return true;
  }

  async reorderLmsQuizQuestions(quizId: string, questionIds: string[]): Promise<void> {
    for (let i = 0; i < questionIds.length; i++) {
      await db.update(lmsQuizQuestionLinks)
        .set({ sortOrder: i })
        .where(and(
          eq(lmsQuizQuestionLinks.quizId, quizId),
          eq(lmsQuizQuestionLinks.questionId, questionIds[i])
        ));
    }
  }

  // LMS Enrollments
  async getLmsEnrollments(userId?: string): Promise<LmsEnrollment[]> {
    if (userId) {
      return db.select().from(lmsEnrollments)
        .where(eq(lmsEnrollments.userId, userId))
        .orderBy(desc(lmsEnrollments.enrolledAt));
    }
    return db.select().from(lmsEnrollments).orderBy(desc(lmsEnrollments.enrolledAt));
  }

  async getLmsEnrollmentsByStatus(status: string): Promise<LmsEnrollment[]> {
    return db.select().from(lmsEnrollments)
      .where(eq(lmsEnrollments.status, status as any))
      .orderBy(desc(lmsEnrollments.enrolledAt));
  }

  async getLmsEnrollmentsByCourse(courseId: string): Promise<LmsEnrollment[]> {
    return db.select().from(lmsEnrollments)
      .where(eq(lmsEnrollments.courseId, courseId))
      .orderBy(desc(lmsEnrollments.enrolledAt));
  }

  async getLmsEnrollment(id: string): Promise<LmsEnrollment | undefined> {
    const [enrollment] = await db.select().from(lmsEnrollments).where(eq(lmsEnrollments.id, id));
    return enrollment;
  }

  async getLmsEnrollmentByUserAndCourse(userId: string, courseId: string): Promise<LmsEnrollment | undefined> {
    const [enrollment] = await db.select().from(lmsEnrollments)
      .where(and(
        eq(lmsEnrollments.userId, userId),
        eq(lmsEnrollments.courseId, courseId)
      ));
    return enrollment;
  }

  async getLmsEnrollmentCount(courseId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(lmsEnrollments)
      .where(eq(lmsEnrollments.courseId, courseId));
    return Number(result[0]?.count || 0);
  }

  async createLmsEnrollment(data: InsertLmsEnrollment): Promise<LmsEnrollment> {
    const [enrollment] = await db.insert(lmsEnrollments).values({
      ...data,
      enrolledAt: new Date(),
    }).returning();
    return enrollment;
  }

  async updateLmsEnrollment(id: string, data: Partial<InsertLmsEnrollment>): Promise<LmsEnrollment | undefined> {
    const [enrollment] = await db.update(lmsEnrollments)
      .set(data)
      .where(eq(lmsEnrollments.id, id))
      .returning();
    return enrollment;
  }

  async deleteLmsEnrollment(id: string): Promise<boolean> {
    await db.delete(lmsEnrollments).where(eq(lmsEnrollments.id, id));
    return true;
  }

  async completeLmsEnrollment(id: string, score?: number): Promise<LmsEnrollment | undefined> {
    const [enrollment] = await db.update(lmsEnrollments)
      .set({
        status: 'completed',
        completedAt: new Date(),
        finalScore: score ?? null,
      })
      .where(eq(lmsEnrollments.id, id))
      .returning();
    return enrollment;
  }

  // LMS Lesson Progress
  async getLmsLessonProgress(enrollmentId: string): Promise<LmsLessonProgress[]> {
    return db.select().from(lmsLessonProgress)
      .where(eq(lmsLessonProgress.enrollmentId, enrollmentId));
  }

  async getLmsLessonProgressByLesson(enrollmentId: string, lessonId: string): Promise<LmsLessonProgress | undefined> {
    const [progress] = await db.select().from(lmsLessonProgress)
      .where(and(
        eq(lmsLessonProgress.enrollmentId, enrollmentId),
        eq(lmsLessonProgress.lessonId, lessonId)
      ));
    return progress;
  }

  async createLmsLessonProgress(data: InsertLmsLessonProgress): Promise<LmsLessonProgress> {
    const [progress] = await db.insert(lmsLessonProgress).values({
      ...data,
      startedAt: new Date(),
    }).returning();
    return progress;
  }

  async updateLmsLessonProgress(id: string, data: Partial<InsertLmsLessonProgress>): Promise<LmsLessonProgress | undefined> {
    const [progress] = await db.update(lmsLessonProgress)
      .set(data)
      .where(eq(lmsLessonProgress.id, id))
      .returning();
    return progress;
  }

  async completeLmsLessonProgress(id: string): Promise<LmsLessonProgress | undefined> {
    const [progress] = await db.update(lmsLessonProgress)
      .set({ completedAt: new Date() })
      .where(eq(lmsLessonProgress.id, id))
      .returning();
    return progress;
  }

  // LMS Quiz Attempts
  async getLmsQuizAttempts(courseId: string, userId?: string): Promise<LmsQuizAttempt[]> {
    if (userId) {
      return db.select().from(lmsQuizAttempts)
        .where(and(
          eq(lmsQuizAttempts.courseId, courseId),
          eq(lmsQuizAttempts.userId, userId)
        ))
        .orderBy(desc(lmsQuizAttempts.startedAt));
    }
    return db.select().from(lmsQuizAttempts)
      .where(eq(lmsQuizAttempts.courseId, courseId))
      .orderBy(desc(lmsQuizAttempts.startedAt));
  }

  async getLmsQuizAttempt(id: string): Promise<LmsQuizAttempt | undefined> {
    const [attempt] = await db.select().from(lmsQuizAttempts).where(eq(lmsQuizAttempts.id, id));
    return attempt;
  }

  async createLmsQuizAttempt(data: InsertLmsQuizAttempt): Promise<LmsQuizAttempt> {
    const [attempt] = await db.insert(lmsQuizAttempts).values({
      ...data,
      startedAt: new Date(),
    }).returning();
    return attempt;
  }

  async updateLmsQuizAttempt(id: string, data: Partial<InsertLmsQuizAttempt>): Promise<LmsQuizAttempt | undefined> {
    const [attempt] = await db.update(lmsQuizAttempts)
      .set(data)
      .where(eq(lmsQuizAttempts.id, id))
      .returning();
    return attempt;
  }

  async completeLmsQuizAttempt(id: string, score: number, passed: boolean): Promise<LmsQuizAttempt | undefined> {
    const [attempt] = await db.update(lmsQuizAttempts)
      .set({
        completedAt: new Date(),
        score,
        passed,
      })
      .where(eq(lmsQuizAttempts.id, id))
      .returning();
    return attempt;
  }

  // LMS Question Responses
  async getLmsQuestionResponses(attemptId: string): Promise<LmsQuestionResponse[]> {
    return db.select().from(lmsQuestionResponses)
      .where(eq(lmsQuestionResponses.attemptId, attemptId));
  }

  async createLmsQuestionResponse(data: InsertLmsQuestionResponse): Promise<LmsQuestionResponse> {
    const [response] = await db.insert(lmsQuestionResponses).values(data).returning();
    return response;
  }

  async updateLmsQuestionResponse(id: string, data: Partial<InsertLmsQuestionResponse>): Promise<LmsQuestionResponse | undefined> {
    const [response] = await db.update(lmsQuestionResponses)
      .set(data)
      .where(eq(lmsQuestionResponses.id, id))
      .returning();
    return response;
  }

  // LMS Certificates
  async getLmsCertificates(userId?: string): Promise<LmsCertificate[]> {
    if (userId) {
      return db.select().from(lmsCertificates)
        .where(eq(lmsCertificates.userId, userId))
        .orderBy(desc(lmsCertificates.issuedAt));
    }
    return db.select().from(lmsCertificates).orderBy(desc(lmsCertificates.issuedAt));
  }

  async getLmsCertificate(id: string): Promise<LmsCertificate | undefined> {
    const [certificate] = await db.select().from(lmsCertificates).where(eq(lmsCertificates.id, id));
    return certificate;
  }

  async getLmsCertificateByNumber(certificateNumber: string): Promise<LmsCertificate | undefined> {
    const [certificate] = await db.select().from(lmsCertificates)
      .where(eq(lmsCertificates.certificateNumber, certificateNumber));
    return certificate;
  }

  async createLmsCertificate(data: InsertLmsCertificate): Promise<LmsCertificate> {
    const [certificate] = await db.insert(lmsCertificates).values(data).returning();
    return certificate;
  }

  async deleteLmsCertificate(id: string): Promise<boolean> {
    await db.delete(lmsCertificates).where(eq(lmsCertificates.id, id));
    return true;
  }

  // LMS Course Ratings
  async getLmsCourseRatings(courseId: string): Promise<LmsCourseRating[]> {
    return db.select().from(lmsCourseRatings)
      .where(eq(lmsCourseRatings.courseId, courseId))
      .orderBy(desc(lmsCourseRatings.createdAt));
  }

  async getLmsCourseAverageRating(courseId: string): Promise<number | null> {
    const result = await db.select({
      avg: sql<number>`avg(${lmsCourseRatings.rating})`,
    })
      .from(lmsCourseRatings)
      .where(eq(lmsCourseRatings.courseId, courseId));
    return result[0]?.avg ?? null;
  }

  async createLmsCourseRating(data: InsertLmsCourseRating): Promise<LmsCourseRating> {
    const [rating] = await db.insert(lmsCourseRatings).values(data).returning();
    return rating;
  }

  async updateLmsCourseRating(id: string, data: Partial<InsertLmsCourseRating>): Promise<LmsCourseRating | undefined> {
    const [rating] = await db.update(lmsCourseRatings)
      .set(data)
      .where(eq(lmsCourseRatings.id, id))
      .returning();
    return rating;
  }

  // LMS Dashboard Stats
  async getLmsDashboardStats(): Promise<{
    totalCourses: number;
    publishedCourses: number;
    totalEnrollments: number;
    completedEnrollments: number;
    activeLearners: number;
  }> {
    const [courseStats] = await db.select({
      total: sql<number>`count(*)`,
      published: sql<number>`count(*) filter (where ${lmsCourses.status} = 'published')`,
    }).from(lmsCourses);

    const [enrollmentStats] = await db.select({
      total: sql<number>`count(*)`,
      completed: sql<number>`count(*) filter (where ${lmsEnrollments.status} = 'completed')`,
    }).from(lmsEnrollments);

    const [learnerStats] = await db.select({
      active: sql<number>`count(distinct ${lmsEnrollments.userId}) filter (where ${lmsEnrollments.status} = 'in_progress')`,
    }).from(lmsEnrollments);

    return {
      totalCourses: Number(courseStats?.total || 0),
      publishedCourses: Number(courseStats?.published || 0),
      totalEnrollments: Number(enrollmentStats?.total || 0),
      completedEnrollments: Number(enrollmentStats?.completed || 0),
      activeLearners: Number(learnerStats?.active || 0),
    };
  }

  // LMS Training Portal Sessions
  async getLmsTrainingPortalSession(token: string): Promise<LmsTrainingPortalSession | undefined> {
    const [session] = await db.select().from(lmsTrainingPortalSessions)
      .where(eq(lmsTrainingPortalSessions.sessionToken, token));
    return session;
  }

  async getLmsTrainingPortalSessionByUser(userId: string): Promise<LmsTrainingPortalSession | undefined> {
    const [session] = await db.select().from(lmsTrainingPortalSessions)
      .where(and(
        eq(lmsTrainingPortalSessions.userId, userId),
        eq(lmsTrainingPortalSessions.isActive, true)
      ));
    return session;
  }

  async createLmsTrainingPortalSession(data: InsertLmsTrainingPortalSession): Promise<LmsTrainingPortalSession> {
    const [session] = await db.insert(lmsTrainingPortalSessions).values(data).returning();
    return session;
  }

  async updateLmsTrainingPortalSession(id: string, data: Partial<InsertLmsTrainingPortalSession>): Promise<LmsTrainingPortalSession | undefined> {
    const [session] = await db.update(lmsTrainingPortalSessions)
      .set(data)
      .where(eq(lmsTrainingPortalSessions.id, id))
      .returning();
    return session;
  }

  async deactivateLmsTrainingPortalSession(id: string): Promise<void> {
    await db.update(lmsTrainingPortalSessions)
      .set({ isActive: false })
      .where(eq(lmsTrainingPortalSessions.id, id));
  }

  async deactivateExpiredLmsTrainingPortalSessions(): Promise<number> {
    const result = await db.update(lmsTrainingPortalSessions)
      .set({ isActive: false })
      .where(and(
        eq(lmsTrainingPortalSessions.isActive, true),
        sql`${lmsTrainingPortalSessions.expiresAt} < NOW()`
      ));
    return result.rowCount || 0;
  }

  // LMS Staff Training Codes
  async getLmsStaffTrainingCodeByUser(userId: string): Promise<LmsStaffTrainingCode | undefined> {
    const [code] = await db.select().from(lmsStaffTrainingCodes)
      .where(eq(lmsStaffTrainingCodes.userId, userId));
    return code;
  }

  async getLmsStaffTrainingCodeByCode(accessCode: string): Promise<LmsStaffTrainingCode | undefined> {
    const [code] = await db.select().from(lmsStaffTrainingCodes)
      .where(and(
        eq(lmsStaffTrainingCodes.accessCode, accessCode),
        eq(lmsStaffTrainingCodes.isActive, true)
      ));
    return code;
  }

  async createLmsStaffTrainingCode(data: InsertLmsStaffTrainingCode): Promise<LmsStaffTrainingCode> {
    const [code] = await db.insert(lmsStaffTrainingCodes).values(data).returning();
    return code;
  }

  async updateLmsStaffTrainingCode(id: string, data: Partial<InsertLmsStaffTrainingCode>): Promise<LmsStaffTrainingCode | undefined> {
    const [code] = await db.update(lmsStaffTrainingCodes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(lmsStaffTrainingCodes.id, id))
      .returning();
    return code;
  }

  async generateLmsStaffTrainingCode(userId: string): Promise<LmsStaffTrainingCode> {
    const accessCode = Math.floor(1000 + Math.random() * 9000).toString();
    const existing = await this.getLmsStaffTrainingCodeByUser(userId);
    if (existing) {
      const [updated] = await db.update(lmsStaffTrainingCodes)
        .set({ accessCode, isActive: true, updatedAt: new Date() })
        .where(eq(lmsStaffTrainingCodes.userId, userId))
        .returning();
      return updated;
    }
    return this.createLmsStaffTrainingCode({ userId, accessCode, isActive: true });
  }

  // LMS Course Departments
  async getLmsCourseDepartments(courseId: string): Promise<LmsCourseDepartment[]> {
    return db.select().from(lmsCourseDepartments)
      .where(eq(lmsCourseDepartments.courseId, courseId));
  }

  async getLmsCourseDepartmentsByCourse(courseId: string): Promise<string[]> {
    const departments = await db.select({ department: lmsCourseDepartments.department })
      .from(lmsCourseDepartments)
      .where(eq(lmsCourseDepartments.courseId, courseId));
    return departments.map(d => d.department);
  }

  async setLmsCourseDepartments(courseId: string, departments: { department: string; isRequired: boolean }[]): Promise<LmsCourseDepartment[]> {
    await db.delete(lmsCourseDepartments).where(eq(lmsCourseDepartments.courseId, courseId));
    if (departments.length === 0) return [];
    
    const values = departments.map(d => ({
      courseId,
      department: d.department,
      isRequired: d.isRequired,
    }));
    
    return db.insert(lmsCourseDepartments).values(values).returning();
  }

  async createLmsCourseDepartment(data: InsertLmsCourseDepartment): Promise<LmsCourseDepartment> {
    const [dept] = await db.insert(lmsCourseDepartments).values(data).returning();
    return dept;
  }

  async deleteLmsCourseDepartment(id: string): Promise<void> {
    await db.delete(lmsCourseDepartments).where(eq(lmsCourseDepartments.id, id));
  }

  async getCoursesByDepartment(department: string): Promise<LmsCourse[]> {
    const courseIds = await db.select({ courseId: lmsCourseDepartments.courseId })
      .from(lmsCourseDepartments)
      .where(eq(lmsCourseDepartments.department, department));
    
    if (courseIds.length === 0) return [];
    
    return db.select().from(lmsCourses)
      .where(and(
        inArray(lmsCourses.id, courseIds.map(c => c.courseId)),
        sql`${lmsCourses.status} = 'published'`
      ))
      .orderBy(lmsCourses.sortOrder);
  }

  async getRequiredCoursesByDepartment(department: string): Promise<LmsCourse[]> {
    const courseIds = await db.select({ courseId: lmsCourseDepartments.courseId })
      .from(lmsCourseDepartments)
      .where(and(
        eq(lmsCourseDepartments.department, department),
        eq(lmsCourseDepartments.isRequired, true)
      ));
    
    if (courseIds.length === 0) return [];
    
    return db.select().from(lmsCourses)
      .where(and(
        inArray(lmsCourses.id, courseIds.map(c => c.courseId)),
        sql`${lmsCourses.status} = 'published'`
      ))
      .orderBy(lmsCourses.sortOrder);
  }

  // ========================================
  // RCC (Revenue Command Center) Operations
  // ========================================

  // RCC Teams
  async getRccTeams(): Promise<RccTeam[]> {
    return db.select().from(rccTeams).where(eq(rccTeams.isActive, true)).orderBy(rccTeams.name);
  }

  async getRccTeam(id: number): Promise<RccTeam | undefined> {
    const [team] = await db.select().from(rccTeams).where(eq(rccTeams.id, id));
    return team;
  }

  async createRccTeam(data: InsertRccTeam): Promise<RccTeam> {
    const [team] = await db.insert(rccTeams).values(data).returning();
    return team;
  }

  async updateRccTeam(id: number, data: Partial<InsertRccTeam>): Promise<RccTeam | undefined> {
    const [team] = await db.update(rccTeams).set(data).where(eq(rccTeams.id, id)).returning();
    return team;
  }

  // RCC Weeks
  async getRccWeeks(): Promise<RccWeek[]> {
    return db.select().from(rccWeeks).orderBy(desc(rccWeeks.weekStart));
  }

  async getRccWeek(id: number): Promise<RccWeek | undefined> {
    const [week] = await db.select().from(rccWeeks).where(eq(rccWeeks.id, id));
    return week;
  }

  async getRccCurrentWeek(): Promise<RccWeek | undefined> {
    const today = new Date().toISOString().split('T')[0];
    const [week] = await db.select().from(rccWeeks)
      .where(and(
        sql`${rccWeeks.weekStart} <= ${today}`,
        sql`${rccWeeks.weekEnd} >= ${today}`
      ));
    return week;
  }

  async createRccWeek(data: InsertRccWeek): Promise<RccWeek> {
    const [week] = await db.insert(rccWeeks).values(data).returning();
    return week;
  }

  async getRccWeekByDate(weekStart: string): Promise<RccWeek | undefined> {
    const [week] = await db.select().from(rccWeeks)
      .where(eq(rccWeeks.weekStart, weekStart));
    return week;
  }

  async getOrCreateRccWeek(weekStart: string, weekEnd: string): Promise<RccWeek> {
    // Check if week already exists
    const existing = await this.getRccWeekByDate(weekStart);
    if (existing) {
      return existing;
    }
    // Create new week
    return this.createRccWeek({ weekStart, weekEnd, status: 'draft' });
  }

  async initializeRccWeeks(): Promise<{ created: number; existing: number }> {
    // Initialize weeks from start of current year through 4 weeks into next year
    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1); // Jan 1
    const yearEnd = new Date(today.getFullYear() + 1, 1, 28); // End of Feb next year
    
    // Find first Monday on or after Jan 1
    let current = new Date(yearStart);
    while (current.getDay() !== 1) {
      current.setDate(current.getDate() + 1);
    }
    
    let created = 0;
    let existing = 0;
    
    while (current < yearEnd) {
      const weekStart = current.toISOString().split('T')[0];
      const weekEndDate = new Date(current);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      const weekEnd = weekEndDate.toISOString().split('T')[0];
      
      const existingWeek = await this.getRccWeekByDate(weekStart);
      if (existingWeek) {
        existing++;
      } else {
        await this.createRccWeek({ weekStart, weekEnd, status: 'draft' });
        created++;
      }
      
      // Move to next Monday
      current.setDate(current.getDate() + 7);
    }
    
    return { created, existing };
  }

  async updateRccWeek(id: number, data: Partial<InsertRccWeek>): Promise<RccWeek | undefined> {
    const [week] = await db.update(rccWeeks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(rccWeeks.id, id))
      .returning();
    return week;
  }

  async approveRccWeek(id: number, userId: string): Promise<RccWeek | undefined> {
    const [week] = await db.update(rccWeeks)
      .set({ status: 'approved', approvedAt: new Date(), approvedBy: userId, updatedAt: new Date() })
      .where(eq(rccWeeks.id, id))
      .returning();
    return week;
  }

  // RCC Tasks
  async getRccTasks(weekId?: number): Promise<RccTask[]> {
    if (weekId) {
      return db.select().from(rccTasks).where(eq(rccTasks.weekId, weekId)).orderBy(desc(rccTasks.createdAt));
    }
    return db.select().from(rccTasks).orderBy(desc(rccTasks.createdAt));
  }

  async getRccIdeas(): Promise<RccTask[]> {
    return db.select().from(rccTasks).where(eq(rccTasks.status, 'idea')).orderBy(desc(rccTasks.createdAt));
  }

  async getRccTask(id: number): Promise<RccTask | undefined> {
    const [task] = await db.select().from(rccTasks).where(eq(rccTasks.id, id));
    return task;
  }

  async createRccTask(data: InsertRccTask): Promise<RccTask> {
    const [task] = await db.insert(rccTasks).values(data).returning();
    return task;
  }

  async updateRccTask(id: number, data: Partial<InsertRccTask>): Promise<RccTask | undefined> {
    const [task] = await db.update(rccTasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(rccTasks.id, id))
      .returning();
    return task;
  }

  async deleteRccTask(id: number): Promise<boolean> {
    const result = await db.delete(rccTasks).where(eq(rccTasks.id, id));
    return true;
  }

  // RCC Campaigns
  async getRccCampaigns(weekId?: number): Promise<RccCampaign[]> {
    if (weekId) {
      return db.select().from(rccCampaigns).where(eq(rccCampaigns.weekId, weekId)).orderBy(desc(rccCampaigns.createdAt));
    }
    return db.select().from(rccCampaigns).orderBy(desc(rccCampaigns.createdAt));
  }

  async getRccCampaign(id: number): Promise<RccCampaign | undefined> {
    const [campaign] = await db.select().from(rccCampaigns).where(eq(rccCampaigns.id, id));
    return campaign;
  }

  async createRccCampaign(data: InsertRccCampaign): Promise<RccCampaign> {
    const [campaign] = await db.insert(rccCampaigns).values(data).returning();
    return campaign;
  }

  async updateRccCampaign(id: number, data: Partial<InsertRccCampaign>): Promise<RccCampaign | undefined> {
    const [campaign] = await db.update(rccCampaigns)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(rccCampaigns.id, id))
      .returning();
    return campaign;
  }

  async deleteRccCampaign(id: number): Promise<boolean> {
    await db.delete(rccCampaigns).where(eq(rccCampaigns.id, id));
    return true;
  }

  // RCC Revenue
  async getRccRevenue(weekId: number): Promise<RccRevenue | undefined> {
    const [revenue] = await db.select().from(rccRevenue).where(eq(rccRevenue.weekId, weekId));
    return revenue;
  }

  async upsertRccRevenue(data: InsertRccRevenue): Promise<RccRevenue> {
    const existing = await this.getRccRevenue(data.weekId);
    if (existing) {
      const [revenue] = await db.update(rccRevenue)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(rccRevenue.weekId, data.weekId))
        .returning();
      return revenue;
    }
    const [revenue] = await db.insert(rccRevenue).values(data).returning();
    return revenue;
  }

  // RCC Learnings
  async getRccLearnings(weekId?: number): Promise<RccLearning[]> {
    if (weekId) {
      return db.select().from(rccLearnings).where(eq(rccLearnings.weekId, weekId)).orderBy(desc(rccLearnings.createdAt));
    }
    return db.select().from(rccLearnings).orderBy(desc(rccLearnings.createdAt));
  }

  async createRccLearning(data: InsertRccLearning): Promise<RccLearning> {
    const [learning] = await db.insert(rccLearnings).values(data).returning();
    return learning;
  }

  // RCC AI Recommendations
  async getRccAiRecommendations(weekId: number): Promise<RccAiRecommendation[]> {
    return db.select().from(rccAiRecommendations).where(eq(rccAiRecommendations.weekId, weekId)).orderBy(desc(rccAiRecommendations.createdAt));
  }

  async createRccAiRecommendation(data: InsertRccAiRecommendation): Promise<RccAiRecommendation> {
    const [rec] = await db.insert(rccAiRecommendations).values(data).returning();
    return rec;
  }

  // RCC Toast Historical Revenue methods
  async getRccToastHistoricalByWeek(weekStart: string, weekEnd: string): Promise<{ currentDates: { date: string; dayOfWeek: number }[]; priorYearData: RccToastHistoricalRevenue[]; priorYearTotal: number; priorYearWholesale: Record<string, string> }> {
    const startDate = new Date(weekStart);
    const endDate = new Date(weekEnd);
    
    const currentDates: { date: string; dayOfWeek: number; priorYearDate: string }[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const priorYearDate = new Date(currentDate);
      priorYearDate.setDate(priorYearDate.getDate() - 364);
      
      currentDates.push({
        date: currentDate.toISOString().split('T')[0],
        dayOfWeek,
        priorYearDate: priorYearDate.toISOString().split('T')[0],
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const priorYearDates = currentDates.map(d => d.priorYearDate);
    const priorYearData = await db.select()
      .from(rccToastHistoricalRevenue)
      .where(sql`${rccToastHistoricalRevenue.revenueDate} = ANY(ARRAY[${sql.join(priorYearDates.map(d => sql`${d}`), sql`,`)}]::date[])`)
      .orderBy(rccToastHistoricalRevenue.revenueDate);
    
    const sortedDates = [...priorYearDates].sort();
    let priorYearWholesale: Record<string, string> = {};
    if (sortedDates.length > 0) {
      priorYearWholesale = await this.getB2bWholesaleRevenueByDateRange(sortedDates[0], sortedDates[sortedDates.length - 1]);
    }
    
    const wholesaleTotal = Object.values(priorYearWholesale).reduce((sum, v) => sum + parseFloat(v || '0'), 0);
    const priorYearTotal = priorYearData.reduce((sum, d) => sum + parseFloat(d.netRevenue || '0') + parseFloat(d.shopifyRevenue || '0'), 0) + wholesaleTotal;
    
    return {
      currentDates: currentDates.map(d => ({ date: d.date, dayOfWeek: d.dayOfWeek, priorYearDate: d.priorYearDate })),
      priorYearData,
      priorYearTotal,
      priorYearWholesale,
    };
  }

  async recordRccToastHistoricalRevenue(date: string, netRevenue: string): Promise<RccToastHistoricalRevenue> {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    const startOfYear = new Date(dateObj.getFullYear(), 0, 1);
    const weekOfYear = Math.ceil((((dateObj.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
    const year = dateObj.getFullYear();
    const cleanRevenue = netRevenue.toString().replace(/[$,]/g, '');
    
    const [record] = await db.insert(rccToastHistoricalRevenue)
      .values({
        revenueDate: date,
        netRevenue: cleanRevenue,
        dayOfWeek,
        weekOfYear,
        year,
      })
      .onConflictDoUpdate({
        target: rccToastHistoricalRevenue.revenueDate,
        set: { netRevenue: cleanRevenue, dayOfWeek, weekOfYear, year },
      })
      .returning();
    return record;
  }

  async getRccToastHistoricalRevenueByDate(date: string): Promise<RccToastHistoricalRevenue | undefined> {
    const [record] = await db.select().from(rccToastHistoricalRevenue).where(eq(rccToastHistoricalRevenue.revenueDate, date));
    return record;
  }

  async updateRccToastHistoricalShopifyRevenue(date: string, shopifyRevenue: string): Promise<RccToastHistoricalRevenue | undefined> {
    const clean = shopifyRevenue.replace(/[$,]/g, '');
    const [record] = await db.update(rccToastHistoricalRevenue)
      .set({ shopifyRevenue: clean })
      .where(eq(rccToastHistoricalRevenue.revenueDate, date))
      .returning();
    return record;
  }

  async recordRccHistoricalShopifyRevenue(date: string, shopifyRevenue: string): Promise<RccToastHistoricalRevenue> {
    const [yearStr, monthStr, dayStr] = date.split('-');
    const dateObj = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
    const dayOfWeek = dateObj.getDay();
    const startOfYear = new Date(dateObj.getFullYear(), 0, 1);
    const weekOfYear = Math.ceil((((dateObj.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
    const year = dateObj.getFullYear();
    const clean = shopifyRevenue.replace(/[$,]/g, '');

    const [record] = await db.insert(rccToastHistoricalRevenue)
      .values({
        revenueDate: date,
        netRevenue: '0',
        shopifyRevenue: clean,
        dayOfWeek,
        weekOfYear,
        year,
      })
      .onConflictDoUpdate({
        target: rccToastHistoricalRevenue.revenueDate,
        set: { shopifyRevenue: clean },
      })
      .returning();
    return record;
  }

  async importRccToastHistoricalRevenue(data: { date: string; netRevenue: string }[]): Promise<RccToastHistoricalRevenue[]> {
    const results: RccToastHistoricalRevenue[] = [];
    for (const item of data) {
      const date = new Date(item.date);
      const dayOfWeek = date.getDay();
      const weekOfYear = Math.ceil((((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / 86400000) + new Date(date.getFullYear(), 0, 1).getDay() + 1) / 7);
      const year = date.getFullYear();
      const netRevenue = item.netRevenue.replace(/[$,]/g, '');
      
      // Upsert - insert or update on conflict
      const [record] = await db.insert(rccToastHistoricalRevenue)
        .values({
          revenueDate: item.date,
          netRevenue,
          dayOfWeek,
          weekOfYear,
          year,
        })
        .onConflictDoUpdate({
          target: rccToastHistoricalRevenue.revenueDate,
          set: { netRevenue, dayOfWeek, weekOfYear, year },
        })
        .returning();
      results.push(record);
    }
    return results;
  }

  // RCC Daily Revenue methods
  async getAllRccDailyRevenue(): Promise<RccDailyRevenue[]> {
    return await db.select().from(rccDailyRevenue).orderBy(rccDailyRevenue.date);
  }

  async getRccDailyRevenueByWeek(weekId: number): Promise<RccDailyRevenue[]> {
    return await db.select().from(rccDailyRevenue).where(eq(rccDailyRevenue.weekId, weekId)).orderBy(rccDailyRevenue.date);
  }

  async getRccDailyRevenueByDate(dateStr: string): Promise<RccDailyRevenue | undefined> {
    const [entry] = await db.select().from(rccDailyRevenue).where(eq(rccDailyRevenue.date, dateStr));
    return entry;
  }

  async upsertRccDailyRevenue(data: InsertRccDailyRevenue): Promise<RccDailyRevenue> {
    const existing = await this.getRccDailyRevenueByDate(data.date);
    if (existing) {
      const [entry] = await db.update(rccDailyRevenue)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(rccDailyRevenue.id, existing.id))
        .returning();
      return entry;
    }
    const [entry] = await db.insert(rccDailyRevenue).values(data).returning();
    return entry;
  }

  async updateRccDailyRevenueNotes(dateStr: string, notes: string): Promise<RccDailyRevenue | undefined> {
    const [entry] = await db.update(rccDailyRevenue)
      .set({ notes, updatedAt: new Date() })
      .where(eq(rccDailyRevenue.date, dateStr))
      .returning();
    return entry;
  }

  async updateRccDailyRevenueWeather(dateStr: string, weather: { high: number; low: number; condition: string; precipitation: number }): Promise<RccDailyRevenue | undefined> {
    const [entry] = await db.update(rccDailyRevenue)
      .set({
        weatherHigh: weather.high,
        weatherLow: weather.low,
        weatherCondition: weather.condition,
        weatherPrecipitation: weather.precipitation.toString(),
        updatedAt: new Date(),
      })
      .where(eq(rccDailyRevenue.date, dateStr))
      .returning();
    return entry;
  }

  async getB2bWholesaleRevenueByDateRange(startDate: string, endDate: string): Promise<Record<string, string>> {
    const results = await db.execute(sql`
      SELECT 
        DATE(order_date) as order_day,
        SUM(CAST(total AS NUMERIC)) as day_total
      FROM b2b_orders 
      WHERE status IN ('completed', 'awaiting_payment', 'delivered')
        AND DATE(order_date) >= ${startDate}
        AND DATE(order_date) <= ${endDate}
      GROUP BY DATE(order_date)
    `);
    const byDate: Record<string, string> = {};
    for (const row of results.rows as any[]) {
      const dateStr = typeof row.order_day === 'string' 
        ? row.order_day.split('T')[0] 
        : new Date(row.order_day).toISOString().split('T')[0];
      byDate[dateStr] = parseFloat(row.day_total).toFixed(2);
    }
    return byDate;
  }

  // RCC Export/Import
  async exportRccWeekData(weekId: number): Promise<{
    focus: { focusStatement: string | null; hookAngle: string | null; weeklyGoal: string | null };
    tasks: Array<{ title: string; description: string | null; owner: string | null; priority: string | null }>;
    campaigns: Array<{ channel: string; title: string; content: string | null }>;
  } | null> {
    const week = await this.getRccWeek(weekId);
    if (!week) return null;

    const tasks = await this.getRccTasks(weekId);
    const campaigns = await this.getRccCampaigns(weekId);

    return {
      focus: {
        focusStatement: week.focusStatement,
        hookAngle: week.hookAngle,
        weeklyGoal: week.weeklyGoal,
      },
      tasks: tasks.map(t => ({
        title: t.title,
        description: t.description,
        owner: t.owner,
        priority: t.priority,
      })),
      campaigns: campaigns.map(c => ({
        channel: c.channel,
        title: c.title,
        content: c.content,
      })),
    };
  }

  async importRccWeekData(
    weekId: number,
    data: {
      focus?: { focusStatement?: string; hookAngle?: string; weeklyGoal?: string };
      tasks?: Array<{ title: string; description?: string; owner?: string; priority?: string }>;
      campaigns?: Array<{ channel: string; title: string; content?: string }>;
    },
    options: { clearExisting?: boolean } = {}
  ): Promise<{ tasksCreated: number; campaignsCreated: number }> {
    const week = await this.getRccWeek(weekId);
    if (!week) throw new Error("Week not found");

    // Update focus fields if provided
    if (data.focus) {
      await this.updateRccWeek(weekId, {
        focusStatement: data.focus.focusStatement || week.focusStatement,
        hookAngle: data.focus.hookAngle || week.hookAngle,
        weeklyGoal: data.focus.weeklyGoal || week.weeklyGoal,
      });
    }

    // Optionally clear existing tasks and campaigns
    if (options.clearExisting) {
      const existingTasks = await this.getRccTasks(weekId);
      for (const task of existingTasks) {
        await this.deleteRccTask(task.id);
      }
      const existingCampaigns = await this.getRccCampaigns(weekId);
      for (const campaign of existingCampaigns) {
        await this.deleteRccCampaign(campaign.id);
      }
    }

    // Create new tasks
    let tasksCreated = 0;
    if (data.tasks) {
      for (const task of data.tasks) {
        await this.createRccTask({
          weekId,
          title: task.title,
          description: task.description || null,
          owner: task.owner || null,
          priority: task.priority || "medium",
          status: "pending",
        });
        tasksCreated++;
      }
    }

    // Create new campaigns
    let campaignsCreated = 0;
    if (data.campaigns) {
      for (const campaign of data.campaigns) {
        await this.createRccCampaign({
          weekId,
          channel: campaign.channel,
          title: campaign.title,
          content: campaign.content || null,
        });
        campaignsCreated++;
      }
    }

    return { tasksCreated, campaignsCreated };
  }
}

export const storage = new DatabaseStorage();
