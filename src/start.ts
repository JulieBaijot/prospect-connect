import { createStart } from "@tanstack/react-start";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Joint le jeton de session aux appels serverFn, requis par requireSupabaseAuth.
export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
}));
