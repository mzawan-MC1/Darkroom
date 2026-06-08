import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://xvmbtzwcchdbapqoywjf.supabase.co';
const serviceRoleKey = process.argv[2];

if (!serviceRoleKey) {
  console.error('\x1b[31m%s\x1b[0m', 'Error: Service Role Key required.');
  console.log('Usage: node scripts/reset_admin_password.js <SERVICE_ROLE_KEY>');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetPassword() {
  const targetEmail = 'zubairawan91@gmail.com';
  const newPassword = 'ADmin@3214';

  console.log(`\nSearching for user: ${targetEmail}...`);

  try {
    // 1. Find User ID
    // We fetch a page of users. For a large base, pagination is needed, 
    // but for this task we assume the admin is in the first 50 users.
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (listError) throw listError;

    let user = users.find(u => u.email === targetEmail);

    // 2. Create if not exists (Optional, but helpful)
    if (!user) {
      console.log('User not found. Creating new admin user...');
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: targetEmail,
        password: newPassword,
        email_confirm: true,
        user_metadata: { full_name: 'Admin User' }
      });

      if (createError) throw createError;
      user = createData.user;
      console.log('\x1b[32m%s\x1b[0m', '✓ User created successfully.');
      
      // Assign admin role in profiles/user_roles if needed? 
      // The edge functions usually handle this, but we can't do it easily without direct DB access.
      // However, the prompt just asked to change the password.
    } else {
      // 3. Update Password
      console.log(`Found User ID: ${user.id}`);
      console.log('Updating password...');

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
      );

      if (updateError) throw updateError;
      console.log('\x1b[32m%s\x1b[0m', '✓ Password updated successfully.');
    }

  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', 'Operation Failed:');
    console.error(err.message);
    process.exit(1);
  }
}

resetPassword();
