import { Model } from 'sequelize';

export function plain<T extends object>(model: Model<any, any>): T {
  return model.get({ plain: true }) as T;
}

export interface PublicUserAttrs {
  id: string;
  email: string;
  password_hash: string | null;
  email_verified_at: Date | null;
  display_name: string | null;
  social_links: Record<string, string> | null;
  public_profile_enabled: boolean;
  public_profile_fields: Record<string, boolean> | null;
  created_at: Date;
  updated_at: Date;
}

export interface PublicAuthTokenAttrs {
  id: string;
  user_id: string;
  purpose: string;
  token_hash: string;
  expires_at: Date | null;
  used_at: Date | null;
  created_at: Date;
}

export interface AdminUserAttrs {
  id: string;
  username: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  password_hash: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SubmissionAttrs {
  id: string;
  submitter_user_id: string | null;
  anonymous_token_hash: string | null;
  status: string;
  note: string | null;
  contact: string | null;
  source_type: string;
  special_tags: any[];
  submitted_at: Date | null;
  review_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface MediaGroupAttrs {
  id: string;
  title: string | null;
  source_url: string | null;
  source_text: string | null;
  author_name: string | null;
  author_handle: string | null;
  post_date: Date | null;
  status: string;
  like_count: number;
  retweet_count: number;
  view_count: number;
  hashtags: any[];
}

export interface MediaAttrs {
  id: string;
  type: string | null;
  media_type: string;
  source: string;
  url: string | null;
  original_url: string | null;
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  caption: string | null;
  tags: any[];
  submitter_user_id: string | null;
  submitter_public_snapshot: any | null;
  submission_id: string | null;
  group_id: string | null;
  created_at: Date;
}
