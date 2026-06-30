export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      announcements: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          mentor_id: string;
          opportunity_id: string;
          title: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          mentor_id: string;
          opportunity_id: string;
          title: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          mentor_id?: string;
          opportunity_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "announcements_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["id"];
          },
        ];
      };
      applications: {
        Row: {
          auto_accepted: boolean;
          created_at: string;
          id: string;
          opportunity_id: string;
          statement: string;
          status: Database["public"]["Enums"]["application_status"];
          student_id: string;
          student_name: string;
        };
        Insert: {
          auto_accepted?: boolean;
          created_at?: string;
          id?: string;
          opportunity_id: string;
          statement: string;
          status?: Database["public"]["Enums"]["application_status"];
          student_id: string;
          student_name?: string;
        };
        Update: {
          auto_accepted?: boolean;
          created_at?: string;
          id?: string;
          opportunity_id?: string;
          statement?: string;
          status?: Database["public"]["Enums"]["application_status"];
          student_id?: string;
          student_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "applications_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["id"];
          },
        ];
      };
      bookmarks: {
        Row: {
          created_at: string;
          id: string;
          opportunity_id: string;
          student_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          opportunity_id: string;
          student_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          opportunity_id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookmarks_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["id"];
          },
        ];
      };
      opportunities: {
        Row: {
          allowed_branches: string[] | null;
          auto_accept: boolean;
          auto_accept_cap: number | null;
          created_at: string;
          criteria: string;
          custom_eligibility: boolean;
          description: string;
          domain: Database["public"]["Enums"]["domain_tag"] | null;
          domain_tags: string[];
          id: string;
          mentor_id: string;
          min_cgpa: number | null;
          min_semester: number | null;
          opp_type: string;
          status: Database["public"]["Enums"]["opportunity_status"];
          title: string;
        };
        Insert: {
          allowed_branches?: string[] | null;
          auto_accept?: boolean;
          auto_accept_cap?: number | null;
          created_at?: string;
          criteria?: string;
          custom_eligibility?: boolean;
          description: string;
          domain?: Database["public"]["Enums"]["domain_tag"] | null;
          domain_tags?: string[];
          id?: string;
          mentor_id: string;
          min_cgpa?: number | null;
          min_semester?: number | null;
          opp_type?: string;
          status?: Database["public"]["Enums"]["opportunity_status"];
          title: string;
        };
        Update: {
          allowed_branches?: string[] | null;
          auto_accept?: boolean;
          auto_accept_cap?: number | null;
          created_at?: string;
          criteria?: string;
          custom_eligibility?: boolean;
          description?: string;
          domain?: Database["public"]["Enums"]["domain_tag"] | null;
          domain_tags?: string[];
          id?: string;
          mentor_id?: string;
          min_cgpa?: number | null;
          min_semester?: number | null;
          opp_type?: string;
          status?: Database["public"]["Enums"]["opportunity_status"];
          title?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          bio: string;
          branch: string | null;
          cgpa: number | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          institute: string | null;
          preferred_field: string | null;
          semester: number | null;
        };
        Insert: {
          bio?: string;
          branch?: string | null;
          cgpa?: number | null;
          created_at?: string;
          email: string;
          full_name?: string;
          id: string;
          institute?: string | null;
          preferred_field?: string | null;
          semester?: number | null;
        };
        Update: {
          bio?: string;
          branch?: string | null;
          cgpa?: number | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          institute?: string | null;
          preferred_field?: string | null;
          semester?: number | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "MENTOR" | "STUDENT";
      application_status: "PENDING" | "ACCEPTED" | "REJECTED";
      domain_tag:
        "Web Dev" | "Core Electronics" | "Placements" | "Higher Studies" | "Entrepreneurship";
      opportunity_status: "OPEN" | "CLOSED";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["MENTOR", "STUDENT"],
      application_status: ["PENDING", "ACCEPTED", "REJECTED"],
      domain_tag: [
        "Web Dev",
        "Core Electronics",
        "Placements",
        "Higher Studies",
        "Entrepreneurship",
      ],
      opportunity_status: ["OPEN", "CLOSED"],
    },
  },
} as const;
