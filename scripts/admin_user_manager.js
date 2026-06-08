import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jkidjlfoqsgklqavjvpb.supabase.co';
const serviceRoleKey = process.argv[2];

if (!serviceRoleKey) {
  console.error('\x1b[31m%s\x1b[0m', 'Error: Service Role Key required.');
  console.log('Usage: node scripts/admin_user_manager.js <SERVICE_ROLE_KEY>');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function manageAdminUser() {
  const targetEmail = 'zubairawan91@gmail.com';
  const newPassword = 'ADmin@3214';

  console.log(`\n==============================================`);
  console.log(`MANAGING ADMIN USER: ${targetEmail}`);
  console.log(`==============================================`);

  try {
    // 1. Check if user exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (listError) throw listError;

    let user = users.find(u => u.email === targetEmail);

    if (user) {
      console.log(`\n[1] User FOUND (ID: ${user.id})`);
      console.log(`    - Confirmed At: ${user.email_confirmed_at || 'NOT CONFIRMED'}`);
      console.log(`    - Last Sign In: ${user.last_sign_in_at || 'NEVER'}`);
      
      // Update User (Password + Confirm Email)
      console.log(`\n[2] Updating Password & Confirming Email...`);
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { 
          password: newPassword,
          email_confirm: true,
          user_metadata: { full_name: 'Admin User' }
        }
      );

      if (updateError) throw updateError;
      console.log('\x1b[32m%s\x1b[0m', '    ✓ Password updated & Email confirmed.');

    } else {
      console.log(`\n[1] User NOT FOUND. Creating new user...`);
      
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: targetEmail,
        password: newPassword,
        email_confirm: true,
        user_metadata: { full_name: 'Admin User' }
      });

      if (createError) throw createError;
      user = createData.user;
      console.log('\x1b[32m%s\x1b[0m', `    ✓ User created (ID: ${user.id})`);
    }

    // 2. Ensure Role is Admin in 'profiles' table
    console.log(`\n[3] Setting role to 'admin' in database...`);
    
    // Check profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('    Error fetching profile:', profileError.message);
    }

    if (!profile) {
      console.log('    Profile missing. Inserting...');
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: targetEmail,
          full_name: 'Admin User',
          role: 'admin'
        });
        
      if (insertError) {
         console.error('    Error creating profile:', insertError.message);
      } else {
         console.log('\x1b[32m%s\x1b[0m', '    ✓ Profile created with role: admin');
      }
    } else {
      if (profile.role !== 'admin') {
        console.log(`    Current role is '${profile.role}'. Updating to 'admin'...`);
        const { error: roleError } = await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', user.id);
          
        if (roleError) {
           console.error('    Error updating role:', roleError.message);
        } else {
           console.log('\x1b[32m%s\x1b[0m', '    ✓ Role updated to: admin');
        }
      } else {
        console.log('\x1b[32m%s\x1b[0m', '    ✓ Role is already: admin');
      }
    }

    console.log(`\n==============================================`);
    console.log(`SUCCESS! You can now login with:`);
    console.log(`Email: ${targetEmail}`);
    console.log(`Pass:  ${newPassword}`);
    console.log(`==============================================\n`);

  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', '\nFATAL ERROR:');
    console.error(err.message);
    process.exit(1);
  }
}

manageAdminUser();
