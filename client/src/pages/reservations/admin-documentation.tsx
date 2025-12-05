import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertCircle, Calendar, Clock, Users, MessageSquare, MapPin, Ban, 
  Wine, CreditCard, Settings, Home, UserCircle, Table2, CalendarDays,
  ExternalLink, Image, Link2, Shield
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminDocumentation() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold mb-2">Platform Documentation</h1>
        <p className="text-muted-foreground">
          Complete guide to managing your Nashoba Valley reservation system
        </p>
      </div>

      <Tabs defaultValue="getting-started" className="w-full">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-auto min-w-full">
            <TabsTrigger value="getting-started" data-testid="tab-getting-started">Getting Started</TabsTrigger>
            <TabsTrigger value="experiences" data-testid="tab-experiences">Experiences</TabsTrigger>
            <TabsTrigger value="locations" data-testid="tab-locations">Locations</TabsTrigger>
            <TabsTrigger value="flow-control" data-testid="tab-flow-control">Flow Control</TabsTrigger>
            <TabsTrigger value="reservations" data-testid="tab-reservations">Reservations</TabsTrigger>
            <TabsTrigger value="customers" data-testid="tab-customers">Customers</TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
          </TabsList>
        </ScrollArea>

        {/* Getting Started Tab */}
        <TabsContent value="getting-started" className="space-y-6">
          <Card data-testid="card-platform-overview">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                Platform Overview
              </CardTitle>
              <CardDescription>
                Understanding how the reservation system works
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                The Nashoba Valley Reservation System is a comprehensive platform for managing reservations 
                across multiple dining locations. It supports both table-based reservations (like restaurant 
                dining) and ticketed experiences (like wine tastings or tours).
              </p>
              
              <div className="space-y-3">
                <h4 className="font-semibold">Key Components:</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="p-3 border rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <Wine className="w-4 h-4 text-primary" />
                      <span className="font-medium">Experiences</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Bookable offerings like tastings, tours, and dining experiences
                    </p>
                  </div>
                  <div className="p-3 border rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="font-medium">Locations</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Physical venues with tables, service periods, and flow controls
                    </p>
                  </div>
                  <div className="p-3 border rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="font-medium">Reservations</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Customer bookings with status tracking and payments
                    </p>
                  </div>
                  <div className="p-3 border rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-primary" />
                      <span className="font-medium">Customers</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Guest profiles with visit history and loyalty tracking
                    </p>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>How It All Connects</AlertTitle>
                <AlertDescription>
                  Experiences are linked to Locations. When customers book an experience, the system 
                  checks the location's tables, operating hours, and flow controls to determine availability.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card data-testid="card-quick-setup">
            <CardHeader>
              <CardTitle>Quick Setup Checklist</CardTitle>
              <CardDescription>
                Steps to get your reservation system running
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4 list-decimal list-inside">
                <li className="text-sm">
                  <span className="font-medium">Create Locations</span>
                  <p className="text-muted-foreground ml-6 mt-1">
                    Add your physical venues (e.g., J's Restaurant, The Knoll, The Pavilion)
                  </p>
                </li>
                <li className="text-sm">
                  <span className="font-medium">Add Tables to Locations</span>
                  <p className="text-muted-foreground ml-6 mt-1">
                    Configure tables with capacity ranges and labels for table-based experiences
                  </p>
                </li>
                <li className="text-sm">
                  <span className="font-medium">Set Up Service Periods</span>
                  <p className="text-muted-foreground ml-6 mt-1">
                    Define meal periods (breakfast, lunch, dinner) with time ranges
                  </p>
                </li>
                <li className="text-sm">
                  <span className="font-medium">Configure Operating Hours</span>
                  <p className="text-muted-foreground ml-6 mt-1">
                    Specify which days each service period is available
                  </p>
                </li>
                <li className="text-sm">
                  <span className="font-medium">Set Flow Controls</span>
                  <p className="text-muted-foreground ml-6 mt-1">
                    Control reservation pacing to match your capacity
                  </p>
                </li>
                <li className="text-sm">
                  <span className="font-medium">Create Experiences</span>
                  <p className="text-muted-foreground ml-6 mt-1">
                    Add the bookable offerings customers will see
                  </p>
                </li>
                <li className="text-sm">
                  <span className="font-medium">Configure Site Settings</span>
                  <p className="text-muted-foreground ml-6 mt-1">
                    Set up your branding, company info, and footer links
                  </p>
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card data-testid="card-dashboard">
            <CardHeader>
              <CardTitle>Understanding the Dashboard</CardTitle>
              <CardDescription>
                Your command center for daily operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The Dashboard provides a quick overview of your reservation activity:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="font-medium min-w-32">Today's Reservations:</span>
                  <span className="text-muted-foreground">Number of bookings for the current day</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium min-w-32">Total Covers:</span>
                  <span className="text-muted-foreground">Total guests expected today across all locations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium min-w-32">Pending:</span>
                  <span className="text-muted-foreground">Reservations awaiting confirmation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium min-w-32">Recent Activity:</span>
                  <span className="text-muted-foreground">Latest bookings and changes</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Experiences Tab */}
        <TabsContent value="experiences" className="space-y-6">
          <Card data-testid="card-experience-types">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wine className="w-5 h-5" />
                Experience Types
              </CardTitle>
              <CardDescription>
                Understanding the different types of bookable experiences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border rounded-md">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Table2 className="w-4 h-4" />
                    Table-Based Experiences
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Used for restaurant dining where guests are assigned to specific tables.
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Requires tables configured at the location</li>
                    <li>Party size is limited by table capacity</li>
                    <li>System automatically assigns appropriate tables</li>
                    <li>Tables can be combined for larger parties</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-md">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Ticketed Experiences
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Used for events with fixed time slots and capacity limits (tastings, tours).
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Define specific time slots with capacity</li>
                    <li>Guests book "tickets" rather than tables</li>
                    <li>Great for tours, tastings, and group events</li>
                    <li>Capacity is managed per time slot</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-md">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    External Experiences
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Links to third-party booking platforms for specialized experiences.
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Displayed on landing page but opens external URL</li>
                    <li>Useful for experiences managed by partners</li>
                    <li>No reservations stored in this system</li>
                    <li>Mark as "External" and provide the booking URL</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-experience-settings">
            <CardHeader>
              <CardTitle>Experience Configuration</CardTitle>
              <CardDescription>
                Key settings when creating or editing experiences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-1">Basic Information</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-2">
                    <li><strong>Name:</strong> Display name shown to customers</li>
                    <li><strong>Short Description:</strong> Brief teaser shown on landing page cards (max 200 chars)</li>
                    <li><strong>Long Description:</strong> Detailed info shown on booking page (max 1000 chars)</li>
                    <li><strong>Image:</strong> Photo displayed on the experience card</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">Pricing Options</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-2">
                    <li><strong>Price Per Person:</strong> Base price charged per guest</li>
                    <li><strong>Show Price:</strong> Toggle to display or hide pricing on landing page</li>
                    <li><strong>Deposit Required:</strong> Amount collected at booking (optional)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">Booking Rules</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-2">
                    <li><strong>Advance Booking Days:</strong> How far ahead customers can book</li>
                    <li><strong>Min/Max Party Size:</strong> Guest count limits per reservation</li>
                    <li><strong>Display Order:</strong> Position on landing page (lower = first)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">Custom Messages</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-2">
                    <li><strong>Closed Message:</strong> Shown when location is closed</li>
                    <li><strong>Fully Booked Message:</strong> Shown when no slots available</li>
                  </ul>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Display Order Tip</AlertTitle>
                <AlertDescription>
                  Use display order to control which experiences appear first on your landing page.
                  Set your most popular or promoted experiences to lower numbers (0, 1, 2...).
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card data-testid="card-experience-status">
            <CardHeader>
              <CardTitle>Experience Status</CardTitle>
              <CardDescription>
                Managing experience visibility
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Each experience has an "Active" status that controls visibility:
              </p>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="font-medium text-green-600">Active:</span>
                  <span className="text-muted-foreground">Visible on landing page, available for booking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-red-600">Inactive:</span>
                  <span className="text-muted-foreground">Hidden from customers, cannot be booked</span>
                </li>
              </ul>
              <p className="text-sm text-muted-foreground">
                Use this to temporarily disable experiences without deleting them (e.g., seasonal offerings).
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-6">
          <Card data-testid="card-locations-overview">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location Management
              </CardTitle>
              <CardDescription>
                Configure your physical venues and their settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Locations represent your physical venues. Each location can have its own tables, 
                service periods, operating hours, and flow controls.
              </p>

              <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                <div>
                  <h4 className="font-semibold mb-1">Location Settings</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Name and description</li>
                    <li>Address information</li>
                    <li>Reservation close time (last booking cutoff)</li>
                    <li>Active/inactive status</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-tables">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table2 className="w-5 h-5" />
                Table Configuration
              </CardTitle>
              <CardDescription>
                Set up tables for table-based dining experiences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">Table Properties</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>
                      <strong>Table Label:</strong> Identifier like "Table 1", "Patio A", "Bar Seat 5"
                    </li>
                    <li>
                      <strong>Min/Max Capacity:</strong> Seating range (e.g., 2-4 guests)
                    </li>
                    <li>
                      <strong>Combinable With:</strong> Other tables that can be joined for larger parties
                    </li>
                    <li>
                      <strong>Is Paused:</strong> Temporarily disable a table (for maintenance, etc.)
                    </li>
                  </ul>
                </div>

                <div className="bg-muted p-3 rounded-md text-sm">
                  <strong>Example - Table Combinations:</strong>
                  <p className="mt-1 text-muted-foreground">
                    If Table 1 (capacity 4) can combine with Table 2 (capacity 4), set each to be 
                    "combinable with" the other. This allows parties of up to 8 to book by automatically 
                    assigning both tables.
                  </p>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Pausing Tables</AlertTitle>
                <AlertDescription>
                  Use the "Pause" feature instead of deleting tables for temporary unavailability.
                  Paused tables won't be assigned to new reservations but existing bookings remain valid.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card data-testid="card-service-periods">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Service Periods
              </CardTitle>
              <CardDescription>
                Define meal periods and their time ranges
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Service periods (formerly called meal periods) define named time ranges for different 
                services at each location.
              </p>

              <div className="bg-muted p-3 rounded-md text-sm">
                <strong>Common Service Periods:</strong>
                <ul className="list-disc list-inside ml-2 mt-1">
                  <li>Breakfast: 7:00 - 10:30</li>
                  <li>Brunch: 10:00 - 14:00</li>
                  <li>Lunch: 11:30 - 15:00</li>
                  <li>Dinner: 17:00 - 22:00</li>
                  <li>Happy Hour: 16:00 - 18:00</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Operating Hours</h4>
                <p className="text-sm text-muted-foreground">
                  For each service period, set which days it's available. This allows different 
                  schedules throughout the week.
                </p>
                <div className="bg-muted p-3 rounded-md text-sm mt-2">
                  <strong>Example:</strong>
                  <ul className="list-disc list-inside ml-2 mt-1">
                    <li>Brunch: Saturday and Sunday only</li>
                    <li>Lunch: Monday through Friday</li>
                    <li>Dinner: Tuesday through Sunday</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-private-events">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="w-5 h-5" />
                Private Events & Special Dates
              </CardTitle>
              <CardDescription>
                Block availability for special circumstances
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Private Events</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Block a specific time period at a location for a private function.
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Select location and service period</li>
                    <li>Choose date and time range</li>
                    <li>Add custom message for customers</li>
                    <li>Public bookings blocked during this time</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Special Dates</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Block specific experiences for date ranges (holidays, maintenance, etc.).
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Select experiences to block</li>
                    <li>Set start and end dates</li>
                    <li>Add reason for internal reference</li>
                    <li>Customers see closed message</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flow Control Tab */}
        <TabsContent value="flow-control" className="space-y-6">
          <Card data-testid="card-flow-controls">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Flow Controls
              </CardTitle>
              <CardDescription>
                Pace reservations to match kitchen and service capacity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Max Covers Per Interval</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Controls how many guests can be seated every 15 minutes. This prevents overwhelming
                  your kitchen and service staff with too many simultaneous arrivals.
                </p>
                <div className="bg-muted p-3 rounded-md text-sm">
                  <strong>Example:</strong> If you set max covers per interval to 20, and there are already
                  18 covers booked for 18:00, the system will only allow parties totaling 2 or fewer guests
                  to book that time slot.
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Max Daily Covers (Optional)</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Sets a hard limit on total guests per day. Useful for special events or capacity-constrained
                  locations. Leave blank for no daily limit.
                </p>
                <div className="bg-muted p-3 rounded-md text-sm">
                  <strong>Example:</strong> Set max daily covers to 150 for a small dining room to ensure
                  you never exceed total capacity, regardless of how bookings are distributed throughout the day.
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Service Period Specific Flow Controls</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  You can create different flow controls for different service periods at the same location.
                  This allows you to pace lunch service differently than dinner service.
                </p>
                <div className="bg-muted p-3 rounded-md text-sm">
                  <strong>Example:</strong> J's Restaurant might handle 30 covers per interval at lunch
                  (faster turnover) but only 20 covers per interval at dinner (more leisurely service).
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-turn-times">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Turn Times
              </CardTitle>
              <CardDescription>
                Expected dining duration by party size and service period
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Turn times tell the system how long to block a table for each reservation. This ensures
                tables aren't double-booked and helps calculate actual capacity.
              </p>

              <div className="bg-muted p-3 rounded-md text-sm space-y-2">
                <strong>Common Patterns:</strong>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Breakfast: 45-60 minutes (quick service)</li>
                  <li>Lunch: 60-75 minutes (moderate pace)</li>
                  <li>Dinner: 90-120 minutes (leisurely service)</li>
                  <li>Larger parties (6+) typically need 15-30 minutes more</li>
                </ul>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Best Practice</AlertTitle>
                <AlertDescription>
                  Review actual table turn data periodically and adjust these settings to match your
                  real-world service patterns. Too short and you risk double-booking; too long and
                  you leave capacity unused.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reservations Tab */}
        <TabsContent value="reservations" className="space-y-6">
          <Card data-testid="card-reservation-lifecycle">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Reservation Lifecycle
              </CardTitle>
              <CardDescription>
                Understanding reservation states and management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-semibold">Reservation Statuses:</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-2 border rounded-md">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                      Pending
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Awaiting confirmation or payment
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-2 border rounded-md">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                      Confirmed
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Payment received, booking secured
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-2 border rounded-md">
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                      Cancelled
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Booking cancelled by customer or admin
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-reservation-management">
            <CardHeader>
              <CardTitle>Managing Reservations</CardTitle>
              <CardDescription>
                Actions available for existing reservations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-1">View Details</h4>
                  <p className="text-sm text-muted-foreground">
                    See complete reservation information including customer details, party size, 
                    special requests, and payment status.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Edit Reservation</h4>
                  <p className="text-sm text-muted-foreground">
                    Modify date, time, party size, or other details. System will check availability 
                    before allowing changes.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Cancel Reservation</h4>
                  <p className="text-sm text-muted-foreground">
                    Cancel the booking. Customer is notified via email. Table becomes available 
                    for other bookings.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">View Customer</h4>
                  <p className="text-sm text-muted-foreground">
                    Access the customer's profile to see their history, loyalty points, and notes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-calendar-view">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Calendar View
              </CardTitle>
              <CardDescription>
                Visual overview of reservations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                The calendar provides a daily or weekly view of reservations:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>See all bookings at a glance by date</li>
                <li>Filter by location or experience</li>
                <li>Click on a date to see detailed time slots</li>
                <li>Quickly identify busy periods and available gaps</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-6">
          <Card data-testid="card-customer-profiles">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="w-5 h-5" />
                Customer Profiles
              </CardTitle>
              <CardDescription>
                Managing guest information and history
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Customer profiles are automatically created when guests make reservations. 
                Each profile includes:
              </p>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-1">Contact Information</h4>
                  <p className="text-sm text-muted-foreground">
                    Name, email, phone number, and mailing address
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Loyalty Points</h4>
                  <p className="text-sm text-muted-foreground">
                    Track and adjust points earned from visits. Use points for special offers 
                    or promotions.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Club Status</h4>
                  <p className="text-sm text-muted-foreground">
                    Categorize customers as None, Member, or VIP for personalized service.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Visit History</h4>
                  <p className="text-sm text-muted-foreground">
                    Complete log of all visits including dates, experiences, party sizes, and spending.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Notes</h4>
                  <p className="text-sm text-muted-foreground">
                    Add internal notes about preferences, allergies, special occasions, etc.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-customer-search">
            <CardHeader>
              <CardTitle>Finding Customers</CardTitle>
              <CardDescription>
                Search and filter options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Use the customer list to find guests:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Search by name, email, or phone number</li>
                <li>Filter by club status (None, Member, VIP)</li>
                <li>Sort by name, visits, or loyalty points</li>
                <li>Click on a customer to view their full profile</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          <Card data-testid="card-payment-integration">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Processing
              </CardTitle>
              <CardDescription>
                How payments work in the reservation system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The system integrates with Stripe for secure payment processing:
              </p>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-1">Per-Person Pricing</h4>
                  <p className="text-sm text-muted-foreground">
                    Set a price per guest for each experience. Total is calculated automatically 
                    based on party size.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Deposits</h4>
                  <p className="text-sm text-muted-foreground">
                    Optionally require a deposit at booking time. Specify either a fixed amount 
                    or percentage of total.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Free Experiences</h4>
                  <p className="text-sm text-muted-foreground">
                    Set price to $0 for complimentary offerings. Customers can book without 
                    entering payment information.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Hide Pricing</h4>
                  <p className="text-sm text-muted-foreground">
                    Toggle "Show Price" off to hide pricing on the landing page while still 
                    collecting payment during checkout.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-payment-status">
            <CardHeader>
              <CardTitle>Payment Status</CardTitle>
              <CardDescription>
                Understanding payment states
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2 border rounded-md">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                    Pending
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Payment not yet processed or awaiting confirmation
                  </span>
                </div>
                <div className="flex items-center gap-3 p-2 border rounded-md">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                    Paid
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Full payment or deposit successfully collected
                  </span>
                </div>
                <div className="flex items-center gap-3 p-2 border rounded-md">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    Refunded
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Payment returned to customer (cancellation, etc.)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card data-testid="card-branding">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                Branding
              </CardTitle>
              <CardDescription>
                Customize your public-facing pages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-semibold mb-1">Header Settings</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li><strong>Header Title:</strong> Main heading on landing page</li>
                  <li><strong>Header Subtitle:</strong> Tagline or brief description</li>
                  <li><strong>Header Image:</strong> Background image for hero section</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-company-info">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Company Information
              </CardTitle>
              <CardDescription>
                Business details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Store your company information for use throughout the system:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Company name</li>
                <li>Address (street, city, state, zip)</li>
                <li>Phone number</li>
                <li>Email address</li>
                <li>Website URL</li>
              </ul>
            </CardContent>
          </Card>

          <Card data-testid="card-footer-links">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                Footer Links
              </CardTitle>
              <CardDescription>
                Manage links displayed in the site footer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Add custom links to your footer for social media, policies, or other pages:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li><strong>Name:</strong> Display text for the link</li>
                <li><strong>URL:</strong> Destination address</li>
                <li><strong>Icon:</strong> Optional thumbnail image</li>
                <li><strong>Display Order:</strong> Position in footer (lower = first)</li>
              </ul>
            </CardContent>
          </Card>

          <Card data-testid="card-user-management">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Control access to the admin dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Manage team members and their access levels:
              </p>
              
              <div className="space-y-3">
                <h4 className="font-semibold">User Roles:</h4>
                <div className="space-y-2">
                  <div className="p-2 border rounded-md">
                    <span className="font-medium">Admin</span>
                    <p className="text-sm text-muted-foreground">
                      Full access including user management and all settings
                    </p>
                  </div>
                  <div className="p-2 border rounded-md">
                    <span className="font-medium">Manager</span>
                    <p className="text-sm text-muted-foreground">
                      Can manage reservations, customers, experiences, and view all data
                    </p>
                  </div>
                  <div className="p-2 border rounded-md">
                    <span className="font-medium">Staff</span>
                    <p className="text-sm text-muted-foreground">
                      Can view and manage reservations and customer information
                    </p>
                  </div>
                  <div className="p-2 border rounded-md">
                    <span className="font-medium">Viewer</span>
                    <p className="text-sm text-muted-foreground">
                      Read-only access to dashboard and basic reports
                    </p>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Note</AlertTitle>
                <AlertDescription>
                  Only admins can change user roles. You cannot demote yourself from admin 
                  to prevent accidental lockout.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
