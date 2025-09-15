-- Old Project: Drop NFT-related trigger and function
DROP TRIGGER IF EXISTS update_nft_assets_updated_at ON public.nft_assets;
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Old Project: Drop NFT-related policies
DROP POLICY IF EXISTS "Deny anon access on nft_assets" ON public.nft_assets;
DROP POLICY IF EXISTS "Deny anon access on nft_collections" ON public.nft_collections;

-- Old Project: Drop NFT-related tables (assets first due to foreign key)
DROP TABLE IF EXISTS public.nft_assets;
DROP TABLE IF EXISTS public.nft_collections;