
# Cleveland Marketplace

Cleveland Marketplace is a web application that allows users to buy and sell items by posting listings. It features an initial site-wide verification step, user authentication (including optional two-factor authentication for logins), item posting, item editing/deletion, an item detail view, a commenting system, user profile editing, and a direct messaging system. A superadmin role has extended privileges.

## Features

*   **Site Access Gate:**
    *   An initial verification step (using a demo 2FA-like code) is required before any user can access the main marketplace content or features. This is session-based.
*   **User Authentication:**
    *   Signup with email, password, and optional display name.
    *   Login with email and password.
    *   **Two-Factor Authentication (Login):** Users can enable 2FA for their accounts. If enabled, a 6-digit code (demo code provided via alert) is required after successful password entry.
    *   Logout.
    *   Password Reset functionality.
    *   "My Account" panel to manage display name, toggle 2FA for login, access messages, and logout.
*   **Listings:**
    *   Users can post new items with name, description, price (or mark as free), contact info, and an optional image (uploaded or via URL).
    *   Browse all listings.
    *   Search listings by keywords.
    *   (Future: Filter by price, free items; Sort by newest, oldest, price).
    *   "Load More" functionality for listings.
*   **Item Detail Page:**
    *   View full details of an item, including image, description, price, contact info, and seller's display name/email.
    *   Owner of the item (or superadmin) can edit or delete the listing.
*   **Comments:**
    *   Logged-in users can post comments on item detail pages.
    *   Comment author (or superadmin) can delete comments.
*   **Direct Messaging:**
    *   Users can initiate conversations with item sellers or start new general conversations with other users.
    *   "My Messages" view to see and manage conversations.
    *   Real-time chat interface.
    *   Ability to send text messages and attach files (images previewed, others as links).
    *   Reply to specific messages within a conversation.
    *   React to messages with emojis.
    *   Users can delete their own messages.
    *   (Backend: Email notifications for new messages via Supabase trigger and Google Apps Script).
*   **Superadmin Role (`SUPERADMIN_USER_ID`):**
    *   Can edit or delete any listing or comment.
    *   "Admin Panel - All Site Conversations": View all conversations on the site and delete individual messages.
    *   "Admin Panel - User Management":
        *   View a list of all registered users.
        *   Search users by email or display name.
        *   Initiate password reset emails for users.
        *   Invite new users by email.
        *   Manage message blocks: Prevent specific users from messaging other specific users.
*   **User Experience & UI:**
    *   Responsive design.
    *   Modals for posting/editing items, signup, login, 2FA, profile, and messaging user selection.
    *   Toast notifications for user feedback.
    *   Loading indicators.
    *   Footer with current year.
*   **Progressive Web App (PWA) Features:**
    *   Manifest file for "Add to Home Screen" capability.
    *   Basic service worker for app shell caching and an offline page.
    *   (Future/Placeholder: Background sync, push notifications).
*   **Analytics:**
    *   Google Analytics 4 (GA4) integration for tracking page views and events.

## Tech Stack

*   **Frontend:** HTML, CSS, Vanilla JavaScript
*   **Backend & Database:** Supabase (PostgreSQL, Authentication, Storage, Realtime, Edge Functions)
*   **(Optional for Email Notifications):** Google Apps Script (called by Supabase database trigger)

## Setup Instructions

To run this project locally or deploy it:

1.  **Create Project Files:**
    *   `index.html`: Main application page.
    *   `gate.html`: The new initial site access verification page.
    *   `style.css`: Styles for the application.
    *   `script.js`: All JavaScript logic for the application.
    *   `manifest.json`: PWA manifest file.
    *   `sw.js`: Service worker file.
    *   `offline.html`: Page shown when offline (if service worker is active).
    *   Create an `icons` folder for PWA icons (e.g., `icon-192x192.png`, `icon-512x512.png`).
    *   (Optional: `screenshots` folder for PWA screenshots).

2.  **Supabase Project Setup:**
    *   Create a new project on [Supabase](https://supabase.com/).
    *   **Authentication:**
        *   Enable Email provider.
        *   Disable "Confirm email" if you want users to log in immediately after signup without email verification (for demo purposes). For production, keep it enabled.
    *   **Database:**
        *   Go to the SQL Editor in your Supabase dashboard.
        *   You will need to create tables for:
            *   `listings` (id, user_id, name, description, price, image_url, contact_info, created_at)
            *   `comments` (id, listing_id, user_id, content, created_at)
            *   `profiles` (id (matches auth.users.id), username, email, is_2fa_enabled, updated_at)
            *   `conversations` (id, created_at, updated_at, listing_id (optional))
            *   `conversation_participants` (conversation_id, user_id)
            *   `messages` (id, conversation_id, sender_id, content, attachment_url, attachment_filename, attachment_mimetype, parent_message_id, thread_id, reply_snippet, created_at)
            *   `message_reactions` (id, message_id, user_id, emoji, created_at)
            *   `user_message_blocks` (blocker_id, blocked_id, created_at)
            *   `user_push_subscriptions` (user_id, endpoint (unique), subscription_object, updated_at)
        *   Set up Row Level Security (RLS) policies for all tables to control data access. This is crucial for security.
        *   Create database views and RPC functions as needed (e.g., `listings_with_author_info`, `comments_with_commenter_info`, `get_user_conversations`, `get_or_create_conversation`, etc., as referenced in `script.js`).
    *   **Storage:**
        *   Create a public bucket named `listing-images`.
        *   Create a public bucket named `message-attachments` (or as defined in `STORAGE_BUCKET_NAME`).
        *   Configure RLS policies for storage buckets if needed (e.g., to restrict uploads/deletes).
    *   **Edge Functions (Optional, for Admin Actions):**
        *   If using Edge Functions for admin actions like inviting users or sending password resets, deploy them to your Supabase project.

3.  **Configure `script.js`:**
    *   Open `script.js`.
    *   Update the following constants at the top of the file with your Supabase project details:
        *   `SUPABASE_URL`: Your Supabase Project URL.
        *   `SUPABASE_ANON_KEY`: Your Supabase Project Anon Key.
        *   `SUPERADMIN_USER_ID`: The UUID of the user you want to designate as the superadmin. You can get this from the `auth.users` table in Supabase after the user signs up.
        *   `GA_MEASUREMENT_ID`: Your Google Analytics 4 Measurement ID (optional).
        *   `STORAGE_BUCKET_NAME`: Should be `'message-attachments'`.
        *   `VAPID_PUBLIC_KEY`: Your VAPID public key for push notifications (optional).

4.  **Running the Application:**
    *   Serve the files using a local web server (e.g., VS Code Live Server, Python's `http.server`, Node.js `serve` package).
    *   Open `gate.html` in your browser. This is the new entry point.

## Development Notes

*   **Site Access Gate:** The initial verification is session-based. If the user closes the tab/browser, they'll need to verify again.
*   **2FA for Login:** This is a separate feature users can enable in their "My Account" panel. It uses a demo code provided via an `alert`.
*   **Error Handling:** The script includes basic error handling and toast notifications. Check the browser console for more detailed error messages.
*   **Security:** Row Level Security (RLS) in Supabase is critical. Ensure your policies are correctly configured to prevent unauthorized data access.
*   **PWA:** The service worker (`sw.js`) provides basic app shell caching. For full offline capabilities or more advanced PWA features, further development of the service worker is needed.
