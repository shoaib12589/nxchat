# Subscription Plan Features Update

## Summary
 Systematic update required to replace all old features with 5 new ones:
1. AI Enabled (ai_enabled - already in formData)
2. AI Training (ai_training - already in formData)  
3. AI Messages Limit (max_ai_messages - already configured, just show value)
4. Custom Branding (custom_branding - already in formData)
5. Grammar Checker (grammar_checker - already in formData)

## Changes Required

### 1. Form Data (DONE)
- Removed: allows_calls, analytics_enabled, audio_calls, video_calls, file_sharing, screen_sharing, live_chat, email_support, phone_support, priority_support, api_access, webhooks, integrations, advanced_analytics, user_management, role_based_access
- Kept: ai_enabled, ai_training, grammar_checker, custom_branding, max_ai_messages

### 2. Create Dialog UI (TODO)
- Remove all feature sections (lines 478-682)
- Replace with single "Plan Features" section showing only 5 features

### 3. Edit Dialog UI (TODO)  
- Remove all feature sections (similar structure)
- Replace with single "Plan Features" section

### 4. API Payload (DONE)
- Already updated to only send: ai_training, grammar_checker, custom_branding in features object

### 5. useFeatureAccess Hook (TODO)
- Update to track: ai_enabled, ai_training, custom_branding, grammar_checker
- Remove old feature checks

### 6. Company Admin Pages (TODO)
- Add "Upgrade Plan" messaging for restricted features
- Disable feature links/APIs when access denied

### 7. Backend Middleware (TODO)
- Create middleware to check feature access
- Block API calls for restricted features
