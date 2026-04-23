export type UserRole =
  | 'admin'
  | 'resident'
  | 'security_guard'
  | 'committee_member';
export type OwnershipType = 'owner' | 'tenant';
export type VisitorStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'checked_in'
  | 'checked_out';
export type ChargeStatus = 'pending' | 'paid' | 'overdue';
export type PaymentStatus = 'created' | 'success' | 'failed';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';
export type AnnouncementAudience =
  | 'all'
  | 'residents'
  | 'committee'
  | 'building';

export interface Society {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contact_email: string;
  contact_phone: string;
  is_active: boolean;
  created_at: string;
}

export interface User {
  id: string;
  society_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Unit {
  id: string;
  building_id: string;
  unit_number: string;
  floor_number: number;
  type: string;
  is_occupied: boolean;
  created_at: string;
}

export interface Visitor {
  id: string;
  society_id: string;
  unit_id: string;
  approved_by: string;
  visitor_name: string;
  visitor_phone: string;
  purpose: string;
  status: VisitorStatus;
  expected_at: string;
  checked_in_at: string;
  checked_out_at: string;
}

export interface MaintenanceCharge {
  id: string;
  society_id: string;
  unit_id: string;
  amount: number;
  description: string;
  due_date: string;
  status: ChargeStatus;
  created_at: string;
}

export interface Amenity {
  id: string;
  society_id: string;
  name: string;
  description: string;
  capacity: number;
  is_active: boolean;
}

export interface Announcement {
  id: string;
  society_id: string;
  created_by: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  is_pinned: boolean;
  created_at: string;
}
