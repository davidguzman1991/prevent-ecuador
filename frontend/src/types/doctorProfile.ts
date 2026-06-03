export type DoctorProfileStatus = "pending" | "partial" | "complete";

export type DoctorProfile = {
  doctor_id: string;
  user_id: string | null;
  email: string | null;
  full_name: string | null;
  display_name: string;
  specialty: string | null;
  phone: string | null;
  birth_date: string | null;
  province_code: string | null;
  province_name: string | null;
  city: string | null;
  institution_name: string | null;
  profile_status: DoctorProfileStatus;
};

export type DoctorProfilePayload = {
  display_name: string;
  specialty: string | null;
  phone: string | null;
  birth_date: string | null;
  province_code: string | null;
  province_name: string | null;
  city: string | null;
  institution_name: string | null;
};
