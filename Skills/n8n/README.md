# N8N Workflow Configs

Import these JSON files directly into your N8N instance.

## Workflows

### lead-capture-workflow.json (Phase 1)
**Flow:** Check Email (5 min) → Read Unseen Emails → Parse Lead Info → Send Welcome SMS

**Setup:**
1. Import the JSON into N8N (Settings → Import Workflow)
2. Configure IMAP credentials (your email account)
3. Configure Twilio credentials (Account SID, Auth Token, Phone Number)
4. Replace credential IDs in the JSON or re-link in the N8N editor
5. Activate the workflow

**Required N8N Credentials:**
- **IMAP:** EMAIL_IMAP_HOST, EMAIL_IMAP_USER, EMAIL_IMAP_PASS
- **Twilio:** TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
