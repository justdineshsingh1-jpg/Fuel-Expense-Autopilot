const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient('https://isjsbwjxvpmmgwvvksit.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzanNid2p4dnBtbWd3dnZrc2l0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDY1ODUwOSwiZXhwIjoyMTA2MjM0NTA5fQ.ibmxLHoSd6ySCPvVZ8mjSUGe0t8M0eF_u3mJRV8Wbe8');

async function setup() {
    // 1. Ensure 'apks' bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find(b => b.name === 'apks')) {
        const { error } = await supabase.storage.createBucket('apks', { public: true });
        if (error) console.log('Error creating bucket:', error);
        else console.log('Created public apks bucket!');
    } else {
        console.log('apks bucket already exists.');
    }
}
setup();
