-- ==========================================
-- Feature Flags & Subscription Tiers System
-- ==========================================

-- 1. subscription_plans
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  monthly_price NUMERIC(10,2),
  annual_price NUMERIC(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. plan_features
CREATE TABLE public.plan_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  limit_value INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(plan_id, feature_key)
);

-- 3. org_feature_overrides
CREATE TABLE public.org_feature_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL,
  limit_value INTEGER,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, feature_key)
);

-- 4. Add subscription_plan_id to organizations
ALTER TABLE public.organizations
ADD COLUMN subscription_plan_id UUID REFERENCES public.subscription_plans(id);

-- 5. Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_feature_overrides ENABLE ROW LEVEL SECURITY;

-- 6. RLS: subscription_plans
CREATE POLICY "Anyone can view active subscription plans"
ON public.subscription_plans FOR SELECT
USING (is_active = true);

CREATE POLICY "Platform users can manage subscription plans"
ON public.subscription_plans FOR ALL
TO authenticated
USING (public.is_platform_user(auth.uid()))
WITH CHECK (public.is_platform_user(auth.uid()));

-- 7. RLS: plan_features
CREATE POLICY "Anyone can view plan features"
ON public.plan_features FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Platform users can manage plan features"
ON public.plan_features FOR ALL
TO authenticated
USING (public.is_platform_user(auth.uid()))
WITH CHECK (public.is_platform_user(auth.uid()));

-- 8. RLS: org_feature_overrides
CREATE POLICY "Users can view their org feature overrides"
ON public.org_feature_overrides FOR SELECT
TO authenticated
USING (
  public.user_in_org(auth.uid(), organization_id)
  OR public.is_platform_user(auth.uid())
);

CREATE POLICY "Platform users can manage org feature overrides"
ON public.org_feature_overrides FOR ALL
TO authenticated
USING (public.is_platform_user(auth.uid()))
WITH CHECK (public.is_platform_user(auth.uid()));

-- 9. Security definer function: get_org_features
CREATE OR REPLACE FUNCTION public.get_org_features(p_org_id UUID)
RETURNS TABLE (
  feature_key TEXT,
  enabled BOOLEAN,
  limit_value INTEGER,
  source TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
BEGIN
  SELECT subscription_plan_id INTO v_plan_id
  FROM organizations
  WHERE id = p_org_id;

  RETURN QUERY
  WITH plan_defaults AS (
    SELECT
      pf.feature_key,
      pf.enabled,
      pf.limit_value,
      'plan'::TEXT AS source
    FROM plan_features pf
    WHERE pf.plan_id = v_plan_id
  ),
  org_overrides AS (
    SELECT
      ofo.feature_key,
      ofo.enabled,
      ofo.limit_value,
      'override'::TEXT AS source
    FROM org_feature_overrides ofo
    WHERE ofo.organization_id = p_org_id
  )
  SELECT DISTINCT ON (COALESCE(o.feature_key, p.feature_key))
    COALESCE(o.feature_key, p.feature_key),
    COALESCE(o.enabled, p.enabled, false),
    COALESCE(o.limit_value, p.limit_value),
    COALESCE(o.source, p.source, 'none')
  FROM plan_defaults p
  FULL OUTER JOIN org_overrides o ON p.feature_key = o.feature_key
  ORDER BY COALESCE(o.feature_key, p.feature_key);
END;
$$;

-- 10. Indexes
CREATE INDEX idx_plan_features_plan_id ON public.plan_features(plan_id);
CREATE INDEX idx_org_feature_overrides_org_id ON public.org_feature_overrides(organization_id);
CREATE INDEX idx_organizations_subscription_plan ON public.organizations(subscription_plan_id);