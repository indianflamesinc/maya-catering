// ═══════════════════════════════════════
// MAYA CRM Types
// ═══════════════════════════════════════

export type EventType =
  | 'wedding' | 'engagement' | 'sangeet' | 'mehndi' | 'baraat'
  | 'birthday' | 'baby_shower' | 'bridal_shower' | 'graduation'
  | 'anniversary' | 'corporate' | 'conference' | 'holiday_party'
  | 'puja' | 'festival' | 'home_party' | 'food_tasting' | 'other'

export type CateringType = 'tray' | 'per_person' | 'hybrid'
export type DeliveryType = 'delivery' | 'pickup' | 'venue'
export type HearAbout = 'google' | 'referral_planner' | 'referral_venue' | 'referral_friend' | 'social_media' | 'repeat_customer' | 'other'

export type LeadStatus =
  | 'new'          // Just came in
  | 'contacted'    // Ashok called/emailed back
  | 'tasting'      // Food tasting scheduled
  | 'quoted'       // Quote sent
  | 'negotiating'  // Back and forth
  | 'approved'     // Customer approved quote
  | 'deposit_paid' // Deposit received
  | 'confirmed'    // Contract signed, confirmed
  | 'completed'    // Event done
  | 'cancelled'    // Cancelled
  | 'lost'         // Did not book

export interface Enquiry {
  id: string
  // Customer details
  customer_name: string
  customer_phone: string
  customer_email?: string
  customer_address?: string
  // Event details
  event_type: EventType
  event_date: string           // YYYY-MM-DD
  event_time?: string
  venue_name?: string
  venue_address?: string
  guest_count: number
  // Preferences
  catering_type?: CateringType
  delivery_type: DeliveryType
  cuisine_preferences?: string[]
  budget_min?: number
  budget_max?: number
  special_requirements?: string
  dietary_restrictions?: string
  // Source
  heard_about: HearAbout
  referred_by?: string         // Name of referral partner
  // Internal
  assigned_to?: string         // Ashok / Kannan / Bala
  status: LeadStatus
  internal_notes?: string
  follow_up_date?: string
  // Metadata
  created_at: string
  updated_at: string
}

export interface EnquiryFormData {
  customer_name: string
  customer_phone: string
  customer_email: string
  event_type: EventType
  event_date: string
  event_time: string
  venue_name: string
  venue_address: string
  guest_count: string
  delivery_type: DeliveryType
  cuisine_preferences: string[]
  budget_min: string
  budget_max: string
  special_requirements: string
  dietary_restrictions: string
  heard_about: HearAbout
  referred_by: string
  assigned_to: string
  internal_notes: string
  follow_up_date: string
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: 'Wedding',
  engagement: 'Engagement',
  sangeet: 'Sangeet',
  mehndi: 'Mehndi / Henna',
  baraat: 'Baraat',
  birthday: 'Birthday Party',
  baby_shower: 'Baby Shower',
  bridal_shower: 'Bridal Shower',
  graduation: 'Graduation Party',
  anniversary: 'Anniversary',
  corporate: 'Corporate Event',
  conference: 'Conference / Seminar',
  holiday_party: 'Holiday Party',
  puja: 'Puja / Religious Event',
  festival: 'Festival (Diwali / Holi etc.)',
  home_party: 'Home Party',
  food_tasting: 'Food Tasting',
  other: 'Other',
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New Enquiry',
  contacted: 'Contacted',
  tasting: 'Tasting Scheduled',
  quoted: 'Quote Sent',
  negotiating: 'Negotiating',
  approved: 'Approved',
  deposit_paid: 'Deposit Paid',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  lost: 'Lost',
}

export const STATUS_COLORS: Record<LeadStatus, string> = {
  new:          'bg-amber-50 text-amber-800 border-amber-300',
  contacted:    'bg-blue-50 text-blue-800 border-blue-300',
  tasting:      'bg-teal-50 text-teal-800 border-teal-300',
  quoted:       'bg-purple-50 text-purple-800 border-purple-300',
  negotiating:  'bg-orange-50 text-orange-800 border-orange-300',
  approved:     'bg-indigo-50 text-indigo-800 border-indigo-300',
  deposit_paid: 'bg-violet-50 text-violet-800 border-violet-300',
  confirmed:    'bg-green-50 text-green-800 border-green-300',
  completed:    'bg-gray-50 text-gray-600 border-gray-300',
  cancelled:    'bg-red-50 text-red-800 border-red-300',
  lost:         'bg-red-50 text-red-600 border-red-200',
}

export const CUISINE_OPTIONS = [
  'North Indian', 'Punjabi', 'Rajasthani', 'Gujarati', 'Maharashtrian',
  'Bengali', 'South Indian (Mixed)', 'Kerala', 'Telugu / Andhra',
  'Karnataka / Mangalore', 'Tamil Nadu', 'International / Fusion',
  'Mix of Multiple Cuisines',
]
