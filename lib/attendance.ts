export interface Attendance {
  id: number
  member_id: number
  check_in: string
  check_out: string | null
  created_at: string
}
