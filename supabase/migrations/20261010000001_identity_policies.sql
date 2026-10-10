-- 20261010000001_identity_policies.sql
-- Adds missing INSERT policies required by the client-driven command handlers.

-- 1. Account Insert Policy
-- Allows an authenticated user to create their own account exactly once.
CREATE POLICY "own_account_insert" ON acct_account 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- 2. Character Insert Policy
-- Allows a user to create characters under their own account.
CREATE POLICY "own_char_insert" ON chr_character 
FOR INSERT 
WITH CHECK (account_id IN (SELECT id FROM acct_account WHERE user_id = auth.uid()));

-- 3. Character Stats Insert Policy
-- Allows a user to initialize stats for their own character during creation.
CREATE POLICY "own_char_stats_insert" ON chr_character_stats 
FOR INSERT 
WITH CHECK (character_id IN (SELECT id FROM chr_character WHERE account_id IN (SELECT id FROM acct_account WHERE user_id = auth.uid())));

-- 4. Economy Wallet Insert Policy
-- Allows a user to initialize a wallet for their own character during creation.
CREATE POLICY "own_wallet_insert" ON eco_wallet 
FOR INSERT 
WITH CHECK (character_id IN (SELECT id FROM chr_character WHERE account_id IN (SELECT id FROM acct_account WHERE user_id = auth.uid())));
