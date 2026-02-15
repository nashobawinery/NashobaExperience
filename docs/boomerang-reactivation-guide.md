# Boomerang Reactivation Engine

## Purpose

The Boomerang Reactivation Engine is a customer loyalty and retention marketing platform built on top of guest data from the Toast POS system. Its primary goal is to help Nashoba Valley Winery understand who their customers are, identify guests who are slipping away, and take action to bring them back.

In the restaurant and hospitality industry, it costs significantly more to acquire a new customer than to retain an existing one. The Boomerang engine gives the team visibility into customer behavior patterns and provides the tools to run targeted reactivation campaigns, loyalty programs, and automated outreach, all driven by real dining data.

---

## How It Works

### Data Foundation: Toast POS Guest Data

Everything in the Boomerang engine starts with guest data from the Toast POS system. This data includes:

- **Contact information**: Up to 5 email addresses and 5 phone numbers per guest, with marketing opt-in preferences for each
- **Visit history**: First visit date, last visit date, total number of visits
- **Spending behavior**: Average spend per visit, average tip, lifetime spend
- **Dining behaviors**: What types of dining experiences the guest has participated in

The system currently holds **107,827 customers** imported from a Toast guest data CSV export. Data can also be kept up-to-date through the live Toast API integration (see the Toast Integration section below).

---

## Core Features

### 1. Segment Overview

The system automatically categorizes every customer into one of five segments based on how recently they visited:

| Segment | Definition | What It Means |
|---------|-----------|---------------|
| **Active** | Visited within the last 30 days | These guests are engaged and coming back regularly |
| **At Risk** | 31-60 days since last visit | Starting to drift away; a good time to reach out |
| **Lapsed** | 61-120 days since last visit | Haven't been back in a while; need a nudge |
| **Dormant** | 121-365 days since last visit | Significantly disengaged; need a compelling reason to return |
| **Lost** | 365+ days since last visit | Haven't visited in over a year |

The Overview tab shows:
- Total customer count across all segments
- Number of "reactivation targets" (At Risk + Lapsed + Dormant combined)
- Total lifetime revenue at risk from those segments
- Per-segment cards with average visits, average spend, average lifetime value, and email reachability percentage

### 2. RFM Segmentation

RFM stands for **Recency, Frequency, Monetary** and is a well-established marketing analysis method. The Boomerang engine scores every customer on three dimensions (each scored 1-5):

- **Recency**: How recently did they visit? (5 = within 30 days, 1 = over a year ago)
- **Frequency**: How often do they visit? (5 = 16+ visits, 1 = no visits)
- **Monetary**: How much have they spent? (5 = $500+, 1 = $0)

The combined score (3-15) places each customer into one of eight RFM segments:

| RFM Segment | Description |
|------------|-------------|
| **Champions** | Best customers: recent, frequent, high spend (R/F/M all 4+) |
| **Loyal Customers** | Regular visitors with good engagement (R 4+, F 3+) |
| **Big Spenders** | High monetary value but may not visit as often (R 3+, M 4+) |
| **New Customers** | Recently acquired but low frequency (R 4+, F 1-2) |
| **At Risk High Value** | High-value customers slipping away (R 1-2, F 3+, M 3+) |
| **Needs Attention** | Previously engaged, declining activity (R 1-2, F 3+) |
| **Hibernating** | Long time since last visit (R 1-2) |
| **Potential** | Room to grow in all dimensions |

RFM scores must be computed manually by clicking the "Compute RFM Scores" button. This analyzes all customers and assigns scores, which are then used to power smarter targeting in campaigns and automations.

### 3. Loyalty Program

The loyalty system allows you to create tiered membership levels for customers:

- **Tiers**: Create loyalty tiers (e.g., Bronze, Silver, Gold, Platinum) with custom names, colors, point thresholds, point multipliers, and listed benefits
- **Accounts**: Customers are enrolled into loyalty accounts and assigned to tiers based on their points
- **Batch Enrollment**: Enroll customers in bulk by filtering on reactivation segment or RFM segment, with the requirement that they have an email address on file
- **Stats Dashboard**: View total members, outstanding points, lifetime points issued, recent transaction activity, and member counts per tier

### 4. Campaigns

Campaigns are organized marketing initiatives targeting specific customer segments. Each campaign tracks:

- **Basic info**: Name, description, type (reactivation, loyalty, winback, seasonal, referral), and status (draft, active, paused, completed)
- **Targeting**: Which reactivation segment and/or RFM segment to target
- **Channel**: Email, SMS, or direct mail
- **Budget**: Total budget and cost per send
- **Performance tracking**: Total sent, opened, clicked, converted, and total revenue generated
- **Date range**: Start and end dates for the campaign

Campaigns can have associated **Offers** (see below) that are sent to the targeted customers.

### 5. Offers

Offers are the specific deals or incentives attached to campaigns:

- **Types**: Discount (dollar amount), percentage off, free item, bonus points, or custom
- **Restrictions**: Minimum purchase requirement, maximum redemptions, points cost
- **Coupon codes**: Optional coupon codes for tracking
- **Validity period**: Valid from/until dates
- **Redemption tracking**: Every redemption is logged with the guest, order value, discount applied, and channel

### 6. Automation Rules

Automations allow you to set up trigger-based outreach that runs without manual intervention:

- **Trigger types**: Inactivity-based (e.g., customer inactive for 45 days), segment change, spend threshold, or RFM segment match
- **Conditions**: Configurable filters like minimum spend, minimum visits, segment, RFM segment, and email requirement
- **Actions**: Send an offer, add points, or send a notification
- **Simulation**: Before activating, you can simulate an automation to see how many customers would be eligible, helping you estimate reach and cost
- **Execution tracking**: Every automation execution is logged with the customer, trigger type, and action taken

### 7. Referral Program

The referral system encourages existing customers to bring in new ones:

- **Referral codes**: Generate unique referral codes in batch for customers, with customizable point rewards and expiration dates
- **Tracking**: Track total referrals, conversions, and points earned per code
- **Stats**: Dashboard showing total codes, active codes, total referrals, conversion rate, and total points earned

### 8. High-Value Targets

A dedicated view that surfaces the most valuable customers who are slipping away. It filters to At Risk, Lapsed, and Dormant segments and sorts by lifetime spend, making it easy to identify the customers most worth reaching out to. Shows their contact info, visit count, lifetime spend, average spend, days since last visit, and marketing opt-in status.

### 9. Customer Browser

A full-featured searchable and filterable customer directory:

- **Search**: By name, email, or phone number
- **Filter by**: Segment (Active, At Risk, Lapsed, Dormant, Lost, Unknown), has email, has phone, marketing opt-in
- **Sort by**: Lifetime spend, total visits, last visit date, average spend, days inactive, first name, last name
- **Customer detail**: Click any customer to see their full profile with all email addresses, phone numbers, marketing preferences, dining behaviors, visit history, and spending data

### 10. Analytics Dashboard

Visual analytics providing insight into the customer base:

- **Spend distribution**: How many customers fall into each spending bracket ($0, $1-$49, $50-$99, $100-$249, $250-$499, $500-$999, $1000+)
- **Visit distribution**: How many customers fall into each visit count bracket (0, 1, 2-5, 6-15, 16-50, 50+)
- **Reachability metrics**: Percentage of customers with email addresses, phone numbers, and marketing opt-in status
- **Segment breakdown**: Visual comparison of customer counts across all five reactivation segments

### 11. Retention Metrics

The system tracks key retention health indicators:

- **Churn rate**: Percentage of customers moving to less engaged segments
- **Retention rate**: Percentage of customers remaining active
- **Average customer lifetime value**
- **Reactivation success rate**: How effectively dormant customers are being brought back

---

## Toast POS API Integration

The Boomerang engine has a live connection to the Toast POS API, enabling real-time data synchronization:

### Connection
- Uses OAuth client credentials (TOAST_CLIENT_ID and TOAST_CLIENT_SECRET) for authentication
- Tokens are cached with automatic refresh before expiration
- Supports 2 restaurant locations (Indoor Seating at The Pavilion, Nashoba Valley Winery main)

### Capabilities
- **Order Sync**: Pull orders from a specified date range for any restaurant location. The system extracts guest information from each order and creates or updates guest records in the database
- **Segment Refresh**: After syncing new order data, recalculate all customer segments based on updated visit dates
- **Webhook**: Receives real-time order-completed events from Toast at `/api/toast/webhook`, automatically syncing guest data as orders come in
- **Sync History**: View a log of recent sync activity showing dates, records updated, and new records added

### Toast Integration Tab
The Toast tab in the Boomerang dashboard shows:
- API connection status (configured, authenticated, connected restaurants)
- Guest database statistics (total guests, API-synced count, email/phone coverage)
- Manual sync controls for pulling orders by date range and refreshing segments
- Recent sync history

---

## Navigation

Access the Boomerang Reactivation Engine at `/boomerang` in the platform. The module uses a tabbed interface with the following tabs:

1. **Overview** - Segment summary and KPIs
2. **RFM** - RFM scoring and segment analysis
3. **Loyalty** - Loyalty program tiers and member management
4. **Campaigns** - Marketing campaign management
5. **Automations** - Trigger-based automation rules
6. **Referrals** - Referral program management
7. **High Value** - High-value customer targets for reactivation
8. **Customers** - Full customer browser with search and filters
9. **Analytics** - Visual analytics and distributions
10. **Toast** - Toast POS API integration status and sync controls

---

## API Reference

The Boomerang engine exposes the following API endpoints:

### Core Reactivation (`/api/reactivation`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/segments` | Get all segment data with KPIs |
| GET | `/customers` | Search and browse customers with filters |
| GET | `/customers/:id` | Get full customer detail with all contact info |
| GET | `/high-value` | Get high-value customers at risk of churning |
| GET | `/analytics` | Get analytics data (spend/visit distributions, reachability) |

### Loyalty & Campaigns (`/api/boomerang`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/rfm/compute` | Compute RFM scores for all customers |
| GET | `/rfm/summary` | Get RFM segment summary and score distribution |
| GET | `/loyalty/tiers` | List loyalty tiers |
| POST | `/loyalty/tiers` | Create a new loyalty tier |
| PUT | `/loyalty/tiers/:id` | Update a loyalty tier |
| GET | `/loyalty/stats` | Get loyalty program statistics |
| GET | `/loyalty/accounts` | Browse loyalty member accounts |
| POST | `/loyalty/enroll-batch` | Batch enroll customers into loyalty |
| GET | `/campaigns` | List marketing campaigns |
| POST | `/campaigns` | Create a campaign |
| PUT | `/campaigns/:id` | Update a campaign |
| DELETE | `/campaigns/:id` | Delete a campaign and its offers/redemptions |
| GET | `/offers` | List offers (optionally by campaign) |
| POST | `/offers` | Create an offer |
| POST | `/offers/:id/redeem` | Record an offer redemption |
| GET | `/automations` | List automation rules |
| POST | `/automations` | Create an automation rule |
| PUT | `/automations/:id` | Update an automation rule |
| DELETE | `/automations/:id` | Delete an automation rule |
| POST | `/automations/:id/simulate` | Simulate an automation to see eligible customers |
| GET | `/referrals/stats` | Get referral program statistics |
| GET | `/referrals/codes` | Browse referral codes |
| POST | `/referrals/generate-batch` | Generate referral codes in batch |
| GET | `/retention/metrics` | Get retention health metrics |

### Toast API (`/api/toast`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/status` | Authenticated | Check Toast API connection status |
| GET | `/restaurants` | Authenticated | List connected restaurants |
| GET | `/restaurants/:guid` | Authenticated | Get restaurant details |
| POST | `/sync/orders` | Admin | Sync orders from a date range |
| POST | `/sync/segments` | Admin | Refresh customer segments |
| POST | `/webhook` | Public | Receive Toast webhook events |
| GET | `/sync/history` | Authenticated | View recent sync activity |

---

## Data Model

### Primary Table: `toast_guests`
Stores all customer data imported from Toast POS. Key fields:
- Guest GUID (unique Toast identifier)
- Up to 5 email addresses and 5 phone numbers with marketing preferences
- First/last name, visit dates, visit count
- Average spend, average tip, lifetime spend
- Days since last visit, reactivation segment

### Supporting Tables
- `boomerang_rfm_scores` - Computed RFM scores per customer
- `boomerang_loyalty_tiers` - Loyalty program tier definitions
- `boomerang_loyalty_accounts` - Customer loyalty memberships
- `boomerang_points_ledger` - Points transaction history
- `boomerang_campaigns` - Marketing campaign records
- `boomerang_offers` - Offer/coupon definitions
- `boomerang_redemptions` - Offer redemption history
- `boomerang_automation_rules` - Automation rule configurations
- `boomerang_automation_executions` - Automation execution logs
- `boomerang_referral_codes` - Referral code records
- `boomerang_referrals` - Individual referral tracking
