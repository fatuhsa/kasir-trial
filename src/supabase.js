import { createClient } from '@supabase/supabase-js';

const SB_URL = "https://bacpwnbsvtwotkfnkhnb.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhY3B3bmJzdnR3b3RrZm5raG5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1Mjc2NzcsImV4cCI6MjA5MTEwMzY3N30.TA79dCK8U7oRyuw_XIr3WoW3Ll_j3qBs78erL6KuhI4";

export const sb = createClient(SB_URL, SB_KEY);
