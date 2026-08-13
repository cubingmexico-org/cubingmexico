import type { EventId } from "./wcif";

interface Country {
  id: string;
  name: string;
  continentId: string;
  iso2: string;
}

interface Avatar {
  url: string;
  pending_url: string;
  thumb_url: string;
  is_default: boolean;
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
  delegate_status: string;
  email: string;
  location: string;
  region_id: number;
  class: string;
  teams: unknown[];
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
  teams: unknown[];
  avatar: Avatar;
}

export interface Competition {
  id: string;
  name: string;
  information: string;
  venue: string;
  contact: string;
  registration_open: string;
  registration_close: string;
  results_posted_at: string | null;
  use_wca_registration: boolean;
  guests_enabled: boolean;
  announced_at: string | null;
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
  waiting_list_deadline_date: string | null;
  event_change_deadline_date: string | null;
  guest_entry_status: string;
  allow_registration_edits: boolean;
  allow_registration_without_qualification: boolean;
  guests_per_registration_limit: number | null;
  events_per_registration_limit: number | null;
  force_comment_in_registration: boolean | null;
  competitor_can_cancel: string;
  auto_accept_registrations: boolean;
  auto_accept_disable_threshold: number | null;
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
  main_event_id: string;
  number_of_bookmarks: number;
  using_payment_integrations?: boolean;
  uses_qualification?: boolean;
  competition_series_ids: string[];
  registration_full?: boolean;
  part_of_competition_series?: boolean;
  registration_full_and_accepted?: boolean;
  delegates: Delegate[];
  organizers: Organizer[];
  class: string;
}
