# SnapList — Setup Guide

## What you need before deploying
- Supabase project (done ✓)
- GitHub account (done ✓)  
- Vercel account (done ✓)
- Stripe account with a Payment Link
- OpenAI API key (platform.openai.com)
- Anthropic API key (console.anthropic.com)

---

## Step 1 — Supabase: Add Auth Trigger

You need a database trigger so when someone signs up, a profile row is automatically created.

In Supabase, go to **SQL Editor** and run this:

```sql
-- Function to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, is_paid)
  values (new.id, false);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger that fires on new user
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## Step 2 — Push to GitHub

1. Create a new **private** repo on GitHub called `snaplist`
2. In your terminal:
```bash
cd snaplist
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/snaplist.git
git push -u origin main
```

---

## Step 3 — Deploy to Vercel

1. Go to vercel.com → New Project
2. Import your `snaplist` GitHub repo
3. Framework: **Vite**
4. Add these Environment Variables:

| Variable | Value |
|---|---|
| VITE_SUPABASE_URL | https://your-project-id.supabase.co |
| VITE_SUPABASE_ANON_KEY | your publishable key |
| VITE_ANTHROPIC_API_KEY | your anthropic key |
| VITE_OPENAI_API_KEY | your openai key |
| SUPABASE_SERVICE_ROLE_KEY | your secret key (for webhook only) |

5. Click **Deploy**

---

## Step 4 — Update Supabase Auth URL

1. In Supabase → Authentication → URL Configuration
2. Set **Site URL** to your Vercel URL: `https://your-app.vercel.app`
3. Add to **Redirect URLs**: `https://your-app.vercel.app/**`

---

## Step 5 — Set Up Stripe Webhook

1. In Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-app.vercel.app/api/webhook`
3. Select event: `checkout.session.completed`
4. Copy the webhook signing secret

---

## Step 6 — Update Stripe Payment Link

In `src/components/AuthPage.jsx`, replace:
```
https://buy.stripe.com/PLACEHOLDER
```
with your actual Stripe Payment Link URL.

---

## Manually Marking a User as Paid (for early customers)

If someone buys before creating an account, go to Supabase → Table Editor → profiles
and manually set their `is_paid` to `true` after they sign up.

---

## Custom Domain (optional, later)

In Vercel → your project → Settings → Domains
Add your custom domain and follow the DNS instructions.
