

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."transaction_type" AS ENUM (
    'income',
    'expense'
);


ALTER TYPE "public"."transaction_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'comum',
    'responsible',
    'child',
    'dependent'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_medal_for_completed_goal"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- Check if the goal status was changed to 'completed'
  if new.status = 'completed' and old.status <> 'completed' then
    insert into public.medals (goal_id, child_id, name, description)
    values (new.id, new.child_id, new.title, 'Você alcançou a meta de ' || new.title || '!');
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."create_medal_for_completed_goal"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."children" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "parent_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "allowance_amount" numeric,
    "allowance_frequency" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "transaction_limit" numeric
);


ALTER TABLE "public"."children" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "category" "text",
    "expense_date" "date",
    "location_coords" "jsonb",
    "receipt_image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "type" "public"."transaction_type" DEFAULT 'expense'::"public"."transaction_type" NOT NULL,
    "is_recurring" boolean DEFAULT false,
    "recurrence_frequency" "text",
    "next_due_date" "date",
    "goal_id" "uuid"
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."favorites" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "expense_id" "uuid" NOT NULL
);


ALTER TABLE "public"."favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goals" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "child_id" "uuid" NOT NULL,
    "parent_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "target_amount" numeric NOT NULL,
    "current_amount" numeric DEFAULT 0,
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_approved" boolean DEFAULT false
);


ALTER TABLE "public"."goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."medals" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "child_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "achieved_at" timestamp with time zone DEFAULT "now"(),
    "prize_amount" numeric
);


ALTER TABLE "public"."medals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role" "public"."user_role" DEFAULT 'responsible'::"public"."user_role" NOT NULL,
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "name" "text",
    "push_token" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."children"
    ADD CONSTRAINT "children_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medals"
    ADD CONSTRAINT "medals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "on_goal_completed" AFTER UPDATE ON "public"."goals" FOR EACH ROW EXECUTE FUNCTION "public"."create_medal_for_completed_goal"();



ALTER TABLE ONLY "public"."children"
    ADD CONSTRAINT "children_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medals"
    ADD CONSTRAINT "medals_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medals"
    ADD CONSTRAINT "medals_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow authenticated users to create their own expenses" ON "public"."expenses" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable child to read their own children record" ON "public"."children" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Enable child to read their parent's profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."children"
  WHERE (("children"."id" = "auth"."uid"()) AND ("children"."parent_id" = "profiles"."id")))));



CREATE POLICY "Enable parents to read their children records" ON "public"."children" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "parent_id"));



CREATE POLICY "Enable parents to read their children's profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."children"
  WHERE (("children"."parent_id" = "auth"."uid"()) AND ("children"."id" = "profiles"."id")))));



CREATE POLICY "Enable read access for all authenticated users on their own pro" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Family members can view medals" ON "public"."medals" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."children"
  WHERE (("children"."parent_id" = "auth"."uid"()) AND ("children"."id" = "medals"."child_id")))) OR (EXISTS ( SELECT 1
   FROM ("public"."children" "c1"
     JOIN "public"."children" "c2" ON (("c1"."parent_id" = "c2"."parent_id")))
  WHERE (("c2"."id" = "auth"."uid"()) AND ("c1"."id" = "medals"."child_id"))))));



CREATE POLICY "Parents can manage their own children records." ON "public"."children" USING (("auth"."uid"() = "parent_id"));



CREATE POLICY "Parents can update medals of their children" ON "public"."medals" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."children"
  WHERE (("children"."parent_id" = "auth"."uid"()) AND ("children"."id" = "medals"."child_id")))));



CREATE POLICY "Users can manage their own favorites." ON "public"."favorites" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their related expenses." ON "public"."expenses" USING ((("auth"."uid"() IN ( SELECT "expenses"."user_id" AS "child_id"
   FROM "public"."children"
  WHERE ("children"."id" = "expenses"."user_id"))) OR ("auth"."uid"() IN ( SELECT "children"."parent_id"
   FROM "public"."children"
  WHERE ("children"."id" = "expenses"."user_id")))));



CREATE POLICY "Users can manage their related goals." ON "public"."goals" USING ((("auth"."uid"() = "parent_id") OR ("auth"."uid"() IN ( SELECT "children"."id"
   FROM "public"."children"
  WHERE ("children"."id" = "goals"."child_id")))));



CREATE POLICY "Users can view and update their own profile." ON "public"."profiles" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own medals." ON "public"."medals" FOR SELECT USING (("auth"."uid"() IN ( SELECT "children"."id"
   FROM "public"."children"
  WHERE ("children"."id" = "medals"."child_id"))));



CREATE POLICY "Users can view their own transactions" ON "public"."expenses" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "enable_insert_children_by_parent" ON "public"."children" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "parent_id"));



ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."medals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."create_medal_for_completed_goal"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_medal_for_completed_goal"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_medal_for_completed_goal"() TO "service_role";


















GRANT ALL ON TABLE "public"."children" TO "anon";
GRANT ALL ON TABLE "public"."children" TO "authenticated";
GRANT ALL ON TABLE "public"."children" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."favorites" TO "anon";
GRANT ALL ON TABLE "public"."favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."favorites" TO "service_role";



GRANT ALL ON TABLE "public"."goals" TO "anon";
GRANT ALL ON TABLE "public"."goals" TO "authenticated";
GRANT ALL ON TABLE "public"."goals" TO "service_role";



GRANT ALL ON TABLE "public"."medals" TO "anon";
GRANT ALL ON TABLE "public"."medals" TO "authenticated";
GRANT ALL ON TABLE "public"."medals" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
