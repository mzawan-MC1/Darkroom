# Apple Sign-In Setup Guide for The Lockout

This guide explains how to configure Apple Sign-In for The Lockout project.

## Prerequisites

1.  Apple Developer Account (Enrolled in Apple Developer Program)
2.  Supabase Project (Admin access)

## Step 1: Apple Developer Portal Configuration

1.  **Create an App ID**
    *   Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) > Identifiers.
    *   Click the "+" button to create a new identifier.
    *   Select **App IDs** and click Continue.
    *   Select **App** and click Continue.
    *   Enter a Description (e.g., "The Lockout App") and Bundle ID (e.g., `com.thelockout.app`).
    *   Scroll down to **Capabilities** and check **Sign In with Apple**.
    *   Click Continue and then Register.

2.  **Create a Service ID**
    *   Go back to Identifiers.
    *   Click "+" > **Service IDs** > Continue.
    *   Enter a Description (e.g., "The Lockout Web Auth") and Identifier (e.g., `com.thelockout.app.service`).
    *   Click Continue and Register.
    *   Click on the newly created Service ID to edit it.
    *   Enable **Sign In with Apple** and click **Configure**.
    *   **Primary App ID**: Select the App ID created in step 1.
    *   **Domains and Subdomains**: Add your production domain (e.g., `thelockout.ae`) and `localhost` (if testing locally, though Apple requires https or special setup for localhost).
    *   **Return URLs**: Add your Supabase Callback URL:
        *   `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback`
    *   Click Next > Done > Save.

3.  **Create a Private Key**
    *   Go to **Keys**.
    *   Click "+" to create a new key.
    *   Enter a Key Name (e.g., "Supabase Auth Key").
    *   Check **Sign In with Apple**.
    *   Click Configure and select your Primary App ID.
    *   Click Save > Continue > Register.
    *   **Download the Key (.p8 file)**. **IMPORTANT:** You can only download this once. Save it safely.
    *   Note the **Key ID** (displayed on the download page).
    *   Note your **Team ID** (displayed in the top right of the Apple Developer portal).

## Step 2: Supabase Configuration

1.  Go to your Supabase Project Dashboard.
2.  Navigate to **Authentication** > **Providers**.
3.  Select **Apple** and toggle it to **Enabled**.
4.  Enter the following credentials:
    *   **Client ID**: The Service ID Identifier you created (e.g., `com.thelockout.app.service`).
    *   **Team ID**: Your Apple Team ID.
    *   **Key ID**: The Key ID from the key you created.
    *   **Private Key**: Open the `.p8` file you downloaded in a text editor and copy the entire content (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`).
5.  Click **Save**.

## Step 3: Admin Panel Configuration

1.  Log in to The Lockout Admin Panel.
2.  Go to **Site Settings** > **Authentication Providers**.
3.  Toggle **Apple Sign-In** to **ON**.
4.  Set **Maximum Providers Displayed** to 2 (or more if you want all 3 visible).
5.  Click **Save All Settings**.

## Verification

1.  Go to the Login page.
2.  You should see the "Apple" button (if enabled and within the max provider limit).
3.  Clicking it should redirect you to appleid.apple.com.
4.  After signing in with Apple, you should be redirected back to the app and logged in.
