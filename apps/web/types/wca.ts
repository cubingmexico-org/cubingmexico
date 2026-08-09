// WCA Person Data Interfaces

export interface WcaPersonResponse {
  person: Person;
  competition_count: number;
  personal_records: Record<string, EventRecord>;
  medals: Medals;
  records: Records;
}

export type DelegateStatus =
  | "junior_delegate"
  | "senior_delegate"
  | "trainee_delegate"
  | "regional_delegate"
  | "full_delegate"
  | null;

export interface Person {
  name: string;
  gender: string;
  url: string;
  country: Country;
  delegate_status: DelegateStatus;
  class: string;
  teams: unknown[];
  avatar: Avatar;
  wca_id: string;
  country_iso2: string;
  id: string;
  dob: string;
}

export interface Country {
  id: string;
  name: string;
  continent_id: string;
  iso2: string;
}

export interface Avatar {
  id: number;
  status: string;
  thumbnail_crop_x: number | null;
  thumbnail_crop_y: number | null;
  thumbnail_crop_w: number | null;
  thumbnail_crop_h: number | null;
  url: string;
  thumb_url: string;
  is_default: boolean;
  can_edit_thumbnail: boolean;
}

export interface EventRecord {
  single: RecordResult;
  average?: RecordResult;
}

export interface RecordResult {
  id: number;
  person_id: string;
  event_id: EventId;
  best: number;
  world_rank: number;
  continent_rank: number;
  country_rank: number;
}

export interface Medals {
  gold: number;
  silver: number;
  bronze: number;
  total: number;
}

export interface Records {
  national: number;
  continental: number;
  world: number;
  /** Cubing México historical state records; absent on WCA API responses. */
  state?: number;
  total: number;
}

// Competition Data Interfaces

export interface Competition {
  id: string;
  name: string;
  information: string;
  venue: string;
  contact: string;
  registration_open: string;
  registration_close: string;
  use_wca_registration: boolean;
  guests_enabled: boolean;
  announced_at: string;
  base_entry_fee_lowest_denomination: number;
  currency_code: string;
  start_date: string;
  end_date: string;
  enable_donations: boolean;
  competitor_limit: number;
  extra_registration_requirements: string | null;
  on_the_spot_registration: boolean;
  on_the_spot_entry_fee_lowest_denomination: number;
  refund_policy_percent: number;
  refund_policy_limit_date: string;
  guests_entry_fee_lowest_denomination: number;
  qualification_results: boolean;
  external_registration_page: string | null;
  event_restrictions: boolean;
  cancelled_at: string | null;
  waiting_list_deadline_date: string;
  event_change_deadline_date: string;
  guest_entry_status: string;
  allow_registration_edits: boolean;
  allow_registration_without_qualification: boolean;
  guests_per_registration_limit: number | null;
  events_per_registration_limit: number | null;
  force_comment_in_registration: boolean | null;
  competitor_can_cancel: string;
  auto_accept_disable_threshold: number | null;
  auto_accept_preference: string;
  url: string;
  website: string;
  short_name: string;
  city: string;
  venue_address: string;
  venue_details: string;
  latitude_degrees: number;
  longitude_degrees: number;
  country_iso2: string;
  event_ids: EventId[];
  main_event_id: EventId;
  number_of_bookmarks: number;

  // Keys with question marks in API
  "using_payment_integrations?": boolean;
  "uses_qualification?": boolean;
  "uses_cutoff?": boolean;
  "registration_full?": boolean;
  "part_of_competition_series?": boolean;
  "registration_full_and_accepted?": boolean;
  competition_series_ids: string[];
  h2h_rounds: unknown[]; // no structure provided
  delegates: Delegate[];
  organizers: Organizer[];
  class: string;
}

export interface Delegate {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  wca_id: string;
  gender: string;
  country_iso2: string;
  url: string;
  country: Country;
  location: string;
  region_id: number;
  delegate_status: string | null;
  email: string;
  class: string;
  teams: Team[];
  avatar: Avatar;
}

export interface Organizer {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  wca_id: string;
  gender: string;
  country_iso2: string;
  url: string;
  country: Country;
  delegate_status: string | null;
  class: string;
  teams: Team[];
  avatar: Avatar;
}

export interface Country {
  id: string;
  name: string;
  continent_id: string;
  iso2: string;
}

export interface Team {
  id: number;
  friendly_id: string;
  leader: boolean;
  senior_member: boolean;
  name: string;
  wca_id: string;
  avatar: Avatar;
}

export interface Avatar {
  id: number;
  status: string;
  thumbnail_crop_x: number | null;
  thumbnail_crop_y: number | null;
  thumbnail_crop_w: number | null;
  thumbnail_crop_h: number | null;
  url: string;
  thumb_url: string;
  is_default: boolean;
  can_edit_thumbnail: boolean;
}

// General

export type EventId =
  | "333"
  | "222"
  | "444"
  | "555"
  | "666"
  | "777"
  | "333bf"
  | "333fm"
  | "333oh"
  | "333ft"
  | "clock"
  | "minx"
  | "pyram"
  | "skewb"
  | "sq1"
  | "444bf"
  | "555bf"
  | "333mbf";
