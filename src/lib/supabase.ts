import { createClient } from '@supabase/supabase-js';

// Browser-side Supabase client (uses anon key)
export const supabaseBrowser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server-side Supabase client (uses service role key for admin operations)
export const supabaseServer = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Storage bucket name for invoice PDFs
export const INVOICE_BUCKET = 'invoice-pdfs';

// Helper function to generate public URL from relative path
export function getPublicUrl(filePath: string): string {
    const { data } = supabaseBrowser.storage
        .from(INVOICE_BUCKET)
        .getPublicUrl(filePath);
    return data.publicUrl;
}

// Helper function to generate signed URL from relative path (for private files)
export async function getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string | null> {
    const { data, error } = await supabaseServer.storage
        .from(INVOICE_BUCKET)
        .createSignedUrl(filePath, expiresIn);

    if (error) {
        console.error('Error creating signed URL:', error);
        return null;
    }

    return data.signedUrl;
}
