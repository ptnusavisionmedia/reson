export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
          id: string
          intro_seen: boolean
          notification_preferences: Json
          onboarding_completed: boolean
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id: string
          intro_seen?: boolean
          notification_preferences?: Json
          onboarding_completed?: boolean
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          intro_seen?: boolean
          notification_preferences?: Json
          onboarding_completed?: boolean
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
          status: Database["public"]["Enums"]["post_status"]
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id: string
          status?: Database["public"]["Enums"]["post_status"]
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          status?: Database["public"]["Enums"]["post_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          cover_path: string | null
          created_at: string
          description: string
          id: string
          member_count: number
          name: string
          pinned_post_ids: string[]
          rules: string[]
          slug: string
          status: string
        }
        Insert: {
          cover_path?: string | null
          created_at?: string
          description?: string
          id?: string
          member_count?: number
          name: string
          pinned_post_ids?: string[]
          rules?: string[]
          slug: string
          status?: string
        }
        Update: {
          cover_path?: string | null
          created_at?: string
          description?: string
          id?: string
          member_count?: number
          name?: string
          pinned_post_ids?: string[]
          rules?: string[]
          slug?: string
          status?: string
        }
        Relationships: []
      }
      community_members: {
        Row: {
          community_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          community_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          community_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deletion_jobs: {
        Row: {
          attempts: number
          completed_at: string | null
          requested_at: string
          stage: string
          status: string
          user_id: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          requested_at?: string
          stage?: string
          status?: string
          user_id: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          requested_at?: string
          stage?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      device_lists: {
        Row: {
          device_id: string
          owned: boolean
          updated_at: string
          user_id: string
          wanted: boolean
        }
        Insert: {
          device_id: string
          owned?: boolean
          updated_at?: string
          user_id: string
          wanted?: boolean
        }
        Update: {
          device_id?: string
          owned?: boolean
          updated_at?: string
          user_id?: string
          wanted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "device_lists_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_lists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      device_suggestions: {
        Row: {
          brand: string
          created_at: string
          id: string
          name: string
          source_url: string | null
          status: string
          submitted_by: string
        }
        Insert: {
          brand: string
          created_at?: string
          id?: string
          name: string
          source_url?: string | null
          status?: string
          submitted_by: string
        }
        Update: {
          brand?: string
          created_at?: string
          id?: string
          name?: string
          source_url?: string | null
          status?: string
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_suggestions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          brand: string
          category: string
          created_at: string
          id: string
          image_path: string | null
          name: string
          name_lower: string | null
          source_url: string | null
          specs: Json
          status: string
        }
        Insert: {
          brand: string
          category: string
          created_at?: string
          id?: string
          image_path?: string | null
          name: string
          name_lower?: string | null
          source_url?: string | null
          specs?: Json
          status?: string
        }
        Update: {
          brand?: string
          category?: string
          created_at?: string
          id?: string
          image_path?: string | null
          name?: string
          name_lower?: string | null
          source_url?: string | null
          specs?: Json
          status?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_results: {
        Row: {
          algorithm_version: number
          candidate_id: string
          candidate_revision: number
          computed_at: string
          coverage: number
          differences: string[]
          expires_at: string
          label: string
          score: number
          shared_genres: string[]
          shared_preferences: string[]
          user_id: string
          viewer_revision: number
        }
        Insert: {
          algorithm_version: number
          candidate_id: string
          candidate_revision: number
          computed_at?: string
          coverage: number
          differences?: string[]
          expires_at: string
          label: string
          score: number
          shared_genres?: string[]
          shared_preferences?: string[]
          user_id: string
          viewer_revision: number
        }
        Update: {
          algorithm_version?: number
          candidate_id?: string
          candidate_revision?: number
          computed_at?: string
          coverage?: number
          differences?: string[]
          expires_at?: string
          label?: string
          score?: number
          shared_genres?: string[]
          shared_preferences?: string[]
          user_id?: string
          viewer_revision?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_results_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_audit: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          reason: string | null
          target_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          reason?: string | null
          target_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          target_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          comment_id: string | null
          created_at: string
          event_key: string
          id: string
          post_id: string | null
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          comment_id?: string | null
          created_at?: string
          event_key: string
          id?: string
          post_id?: string | null
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          comment_id?: string | null
          created_at?: string
          event_key?: string
          id?: string
          post_id?: string | null
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: string
          comment_count: number
          community_id: string
          created_at: string
          details: Json
          device_ids: string[]
          has_answers: boolean
          id: string
          image_paths: string[]
          like_count: number
          status: Database["public"]["Enums"]["post_status"]
          title: string
          title_lower: string | null
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: string
          comment_count?: number
          community_id: string
          created_at?: string
          details?: Json
          device_ids?: string[]
          has_answers?: boolean
          id?: string
          image_paths?: string[]
          like_count?: number
          status?: Database["public"]["Enums"]["post_status"]
          title: string
          title_lower?: string | null
          type: Database["public"]["Enums"]["post_type"]
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          comment_count?: number
          community_id?: string
          created_at?: string
          details?: Json
          device_ids?: string[]
          has_answers?: boolean
          id?: string
          image_paths?: string[]
          like_count?: number
          status?: Database["public"]["Enums"]["post_status"]
          title?: string
          title_lower?: string | null
          type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          bio: string
          created_at: string
          display_name: string
          follower_count: number
          following_count: number
          id: string
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
          username: string
        }
        Insert: {
          avatar_path?: string | null
          bio?: string
          created_at?: string
          display_name?: string
          follower_count?: number
          following_count?: number
          id: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          username: string
        }
        Update: {
          avatar_path?: string | null
          bio?: string
          created_at?: string
          display_name?: string
          follower_count?: number
          following_count?: number
          id?: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          moderator_id: string | null
          reason: string
          reporter_id: string | null
          resolution: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          moderator_id?: string | null
          reason: string
          reporter_id?: string | null
          resolution?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          moderator_id?: string | null
          reason?: string
          reporter_id?: string | null
          resolution?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_posts: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sound_profiles: {
        Row: {
          bass: number | null
          contexts: string[]
          discoverable: boolean
          genres: string[]
          revision: number
          schema_version: number
          treble: number | null
          updated_at: string
          user_id: string
          vocals: number | null
        }
        Insert: {
          bass?: number | null
          contexts?: string[]
          discoverable?: boolean
          genres?: string[]
          revision?: number
          schema_version?: number
          treble?: number | null
          updated_at?: string
          user_id: string
          vocals?: number | null
        }
        Update: {
          bass?: number | null
          contexts?: string[]
          discoverable?: boolean
          genres?: string[]
          revision?: number
          schema_version?: number
          treble?: number | null
          updated_at?: string
          user_id?: string
          vocals?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sound_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      account_cleanup_pending: { Args: { p_uid: string }; Returns: boolean }
      admin_delete_account: { Args: { p_uid: string }; Returns: string }
      block_user: { Args: { p_user_id: string }; Returns: undefined }
      complete_onboarding: { Args: never; Returns: undefined }
      create_comment: {
        Args: {
          p_body: string
          p_id: string
          p_parent_id: string
          p_post_id: string
        }
        Returns: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
          status: Database["public"]["Enums"]["post_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "comments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_notification: {
        Args: {
          p_actor: string
          p_comment: string
          p_key: string
          p_post: string
          p_type: string
          p_user: string
        }
        Returns: undefined
      }
      create_post: {
        Args: {
          p_body: string
          p_community_id: string
          p_details?: Json
          p_id: string
          p_image_paths: string[]
          p_title: string
          p_type: Database["public"]["Enums"]["post_type"]
        }
        Returns: {
          author_id: string
          body: string
          comment_count: number
          community_id: string
          created_at: string
          details: Json
          device_ids: string[]
          has_answers: boolean
          id: string
          image_paths: string[]
          like_count: number
          status: Database["public"]["Enums"]["post_status"]
          title: string
          title_lower: string | null
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "posts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_report: {
        Args: { p_reason: string; p_target_id: string; p_target_type: string }
        Returns: undefined
      }
      delete_comment: { Args: { p_id: string }; Returns: undefined }
      delete_post: { Args: { p_id: string }; Returns: string[] }
      deletion_step: { Args: { p_uid: string }; Returns: string }
      edit_comment: {
        Args: { p_body: string; p_id: string }
        Returns: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
          status: Database["public"]["Enums"]["post_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "comments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      edit_post: {
        Args: {
          p_body: string
          p_details?: Json
          p_id: string
          p_title: string
        }
        Returns: {
          author_id: string
          body: string
          comment_count: number
          community_id: string
          created_at: string
          details: Json
          device_ids: string[]
          has_answers: boolean
          id: string
          image_paths: string[]
          like_count: number
          status: Database["public"]["Enums"]["post_status"]
          title: string
          title_lower: string | null
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "posts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      feed_following: {
        Args: never
        Returns: {
          author_id: string
          body: string
          comment_count: number
          community_id: string
          created_at: string
          details: Json
          device_ids: string[]
          has_answers: boolean
          id: string
          image_paths: string[]
          like_count: number
          status: Database["public"]["Enums"]["post_status"]
          title: string
          title_lower: string | null
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "posts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      feed_for_you: {
        Args: never
        Returns: {
          author_id: string
          body: string
          comment_count: number
          community_id: string
          created_at: string
          details: Json
          device_ids: string[]
          has_answers: boolean
          id: string
          image_paths: string[]
          like_count: number
          status: Database["public"]["Enums"]["post_status"]
          title: string
          title_lower: string | null
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "posts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      finalize_account_deletion: { Args: never; Returns: undefined }
      finalize_deletion_core: { Args: { p_uid: string }; Returns: undefined }
      follow_user: { Args: { p_user_id: string }; Returns: number }
      get_my_matches: {
        Args: { p_label?: string; p_limit?: number; p_offset?: number }
        Returns: {
          avatar_path: string
          bass: number
          candidate_id: string
          computed_at: string
          contexts: string[]
          coverage: number
          differences: string[]
          display_name: string
          genres: string[]
          label: string
          shared_genres: string[]
          shared_preferences: string[]
          treble: number
          username: string
          vocals: number
        }[]
      }
      is_blocked_between: { Args: { a: string; b: string }; Returns: boolean }
      is_email_verified: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      join_community: { Args: { p_community_id: string }; Returns: number }
      leave_community: { Args: { p_community_id: string }; Returns: number }
      like_post: { Args: { p_post_id: string }; Returns: number }
      mark_intro_seen: { Args: never; Returns: undefined }
      moderate_report: {
        Args: { p_action: string; p_reason: string; p_report_id: string }
        Returns: undefined
      }
      moderation_target: { Args: { p_report_id: string }; Returns: Json }
      prepare_post_details: {
        Args: {
          p_details: Json
          p_type: Database["public"]["Enums"]["post_type"]
        }
        Returns: Json
      }
      process_account_deletion: { Args: never; Returns: string }
      refresh_matches: { Args: { p_force?: boolean }; Returns: string }
      refresh_post_comment_stats: {
        Args: { p_post_id: string }
        Returns: undefined
      }
      request_account_deletion: { Args: never; Returns: undefined }
      save_sound_profile: {
        Args: {
          p_bass: number
          p_contexts: string[]
          p_discoverable: boolean
          p_genres: string[]
          p_treble: number
          p_vocals: number
        }
        Returns: {
          bass: number | null
          contexts: string[]
          discoverable: boolean
          genres: string[]
          revision: number
          schema_version: number
          treble: number | null
          updated_at: string
          user_id: string
          vocals: number | null
        }
        SetofOptions: {
          from: "*"
          to: "sound_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      suggest_device: {
        Args: { p_brand: string; p_name: string; p_source_url?: string }
        Returns: undefined
      }
      taste_match_compute: {
        Args: {
          a_bass: number
          a_contexts: string[]
          a_genres: string[]
          a_treble: number
          a_vocals: number
          b_bass: number
          b_contexts: string[]
          b_genres: string[]
          b_treble: number
          b_vocals: number
        }
        Returns: Database["public"]["CompositeTypes"]["match_calc"]
        SetofOptions: {
          from: "*"
          to: "match_calc"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unblock_user: { Args: { p_user_id: string }; Returns: undefined }
      unfollow_user: { Args: { p_user_id: string }; Returns: number }
      unlike_post: { Args: { p_post_id: string }; Returns: number }
      update_my_profile: {
        Args: { p_avatar_path: string; p_bio: string; p_display_name: string }
        Returns: {
          avatar_path: string | null
          bio: string
          created_at: string
          display_name: string
          follower_count: number
          following_count: number
          id: string
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
          username: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_notification_preferences: {
        Args: { p_prefs: Json }
        Returns: undefined
      }
      username_available: { Args: { p_username: string }; Returns: boolean }
    }
    Enums: {
      account_status: "active" | "suspended" | "deleting"
      app_role: "user" | "moderator" | "admin"
      post_status: "published" | "hidden" | "deleted"
      post_type: "discussion" | "question" | "review" | "showcase"
      report_status: "open" | "dismissed" | "actioned"
    }
    CompositeTypes: {
      match_calc: {
        score: number | null
        coverage: number | null
        label: string | null
        shared_genres: string[] | null
        shared_prefs: string[] | null
        differences: string[] | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_status: ["active", "suspended", "deleting"],
      app_role: ["user", "moderator", "admin"],
      post_status: ["published", "hidden", "deleted"],
      post_type: ["discussion", "question", "review", "showcase"],
      report_status: ["open", "dismissed", "actioned"],
    },
  },
} as const
