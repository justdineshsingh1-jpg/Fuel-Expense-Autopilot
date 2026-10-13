const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient('https://isjsbwjxvpmmgwvvksit.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzanNid2p4dnBtbWd3dnZrc2l0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDY1ODUwOSwiZXhwIjoyMTA2MjM0NTA5fQ.ibmxLHoSd6ySCPvVZ8mjSUGe0t8M0eF_u3mJRV8Wbe8');

async function upload() {
    console.log('[4/4] Uploading APK to the cloud for instant download...');
    const apkPath = path.join(__dirname, '../mobile/build/app/outputs/flutter-apk/app-arm64-v8a-release.apk');
    
    if (!fs.existsSync(apkPath)) {
        console.error('APK file not found at:', apkPath);
        process.exit(1);
    }

    const fileBuffer = fs.readFileSync(apkPath);
    const version = Math.floor(Date.now() / 1000);
    const filename = `FuelApp_v${version}.apk`;
    
    const { data, error } = await supabase.storage
        .from('apks')
        .upload(filename, fileBuffer, {
            contentType: 'application/vnd.android.package-archive',
            upsert: true
        });

    if (error) {
        console.error('Upload failed:', error.message);
        process.exit(1);
    }

    // Also upload to FuelApp_latest.apk for easy fixed-link access
    await supabase.storage
        .from('apks')
        .upload('FuelApp_latest.apk', fileBuffer, {
            contentType: 'application/vnd.android.package-archive',
            upsert: true
        });

    const { data: publicUrlData } = supabase.storage.from('apks').getPublicUrl(filename);
    const { data: latestUrlData } = supabase.storage.from('apks').getPublicUrl('FuelApp_latest.apk');
    console.log('\n========================================================');
    console.log('UPLOAD SUCCESSFUL!');
    console.log('Versioned download link:');
    console.log(publicUrlData.publicUrl);
    console.log('\nLatest fixed download link:');
    console.log(latestUrlData.publicUrl);
    console.log('========================================================\n');
}
upload();
