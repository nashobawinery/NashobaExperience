# Nashoba Tasting Experience - Popup Timeline

## Complete 45-Minute Tasting Experience

All times are measured from when the guest **closes the Introduction Modal** and begins browsing.

### Popup Schedule

| Time | Popup Type | Description |
|------|-----------|-------------|
| **0:05** | Marketing | **Trivia Rewards Info** - Explains $5 certificate for 10/10 and tasting chip for 8-9/10 |
| **1:05** | Trivia | **Question 1** (Fixed) - "You are currently at?" with fireworks on correct answer |
| **5:05** | Trivia | **Question 2** (Randomized from database) |
| **9:05** | Trivia | **Question 3** (Randomized) |
| **10:00** | Marketing | **Favorites Info** - Explains heart button and email favorites feature |
| **13:05** | Trivia | **Question 4** (Randomized) |
| **17:05** | Trivia | **Question 5** (Randomized) |
| **21:05** | Trivia | **Question 6** (Randomized) |
| **25:00** | Marketing | **Discount Tiers** - Shows volume discounts (5%-20%) + winery joke |
| **25:05** | Trivia | **Question 7** (Randomized) |
| **29:05** | Trivia | **Question 8** (Randomized) |
| **33:05** | Trivia | **Question 9** (Randomized) |
| **37:05** | Trivia | **Question 10** (Randomized) |

### Summary
- **Total Popups**: 13 (3 marketing + 10 trivia questions)
- **Duration**: 37 minutes to complete all 10 trivia questions
- **Fits Within**: 45-minute tasting experience ✓
- **All Popups**: Show only once per session (tracked via localStorage)

### Technical Details

#### Marketing Popups
1. **Trivia Rewards Info** (5 seconds)
   - Appears when: sessionId exists, browse tab active, intro closed
   - localStorage key: `hasSeenTriviaInfo`
   
2. **Favorites Info** (10 minutes)
   - Appears when: sessionId exists, intro closed
   - localStorage key: `hasSeenFavoritesInfo`
   - Content: Heart button usage, notes, email functionality
   
3. **Discount Tiers** (25 minutes)
   - Appears when: sessionId exists, intro closed
   - localStorage key: `hasSeenDiscountInfo`
   - Content: 4 tiers (3-5: 5%, 6-11: 10%, 12-23: 15%, 24+: 20%) + joke

#### Trivia Questions
- **First Question**: Always "You are currently at?" with fireworks celebration
- **Timing**: 1 minute after trivia info popup dismissed
- **Subsequent Questions**: Every 4 minutes (questions 2-10 randomized)
- **Randomization**: Prevents guests from sharing answers
- **Rewards**: $5 for 10/10, tasting chip for 8-9/10

### Guest Experience Flow

1. Guest enters name → Introduction slideshow
2. Close intro → Start browsing products
3. **5 seconds**: Learn about trivia rewards
4. **1 minute later**: Answer first fun fact (with fireworks!)
5. **10 minutes**: Learn about favorites & email
6. Continue browsing, answering trivia every 4 minutes
7. **25 minutes**: Learn about volume discounts
8. Complete all 10 trivia questions by 37 minutes
9. Finish tasting, complete survey, email favorites

### Features
- ✅ Progressive education through timed popups
- ✅ Fixed first question ensures consistent experience
- ✅ Randomized questions prevent cheating
- ✅ Fireworks celebration for first correct answer
- ✅ localStorage prevents popup re-showing
- ✅ All timers start after intro modal closes
