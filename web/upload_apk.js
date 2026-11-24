const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient('https://isjsbwjxvpmmgwvvksit.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzanNid2p4dnBtbWd3dnZrc2l0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDY1ODUwOSwiZXhwIjoyMTA2MjM0NTA5fQ.ibmxLHoSd6ySCPvVZ8mjSUGe0t8M0eF_u3mJRV8Wbe8');

async function upload() {
    console.log('[4/4] Uploading Universal APK to Supabase Storage...');
    const apkPath = path.join(__dirname, '../mobile/build/app/outputs/flutter-apk/app-release.apk');
    
    if (!fs.existsSync(apkPath)) {
        console.error('APK file not found at:', apkPath);
        process.exit(1);
    }

    const fileBuffer = fs.readFileSync(apkPath);
    const sizeMb = (fileBuffer.length / (1024 * 1024)).toFixed(2);
    console.log(`Package size: ${sizeMb} MB (Universal ARMv7 + ARM64)`);

    // 1. Upload to apks bucket (FuelExpenseAutopilot.apk & FuelApp_latest.apk)
    console.log('Uploading to apks/FuelExpenseAutopilot.apk ...');
    await supabase.storage
        .from('apks')
        .upload('FuelExpenseAutopilot.apk', fileBuffer, {
            contentType: 'application/vnd.android.package-archive',
            upsert: true
        });

    await supabase.storage
        .from('apks')
        .upload('FuelApp_latest.apk', fileBuffer, {
            contentType: 'application/vnd.android.package-archive',
            upsert: true
        });

    // 2. Upload to fuel-receipts bucket (downloads/FuelExpenseAutopilot.apk)
    console.log('Uploading to fuel-receipts/downloads/FuelExpenseAutopilot.apk ...');
    await supabase.storage
        .from('fuel-receipts')
        .upload('downloads/FuelExpenseAutopilot.apk', fileBuffer, {
            contentType: 'application/vnd.android.package-archive',
            upsert: true
        });

    // 3. Upload version.json for Over-the-Air (OTA) In-App Updates
    const pubspecPath = path.join(__dirname, '../mobile/pubspec.yaml');
    let version = '1.0.5';
    let buildNumber = 6;
    if (fs.existsSync(pubspecPath)) {
        const pubText = fs.readFileSync(pubspecPath, 'utf8');
        const match = pubText.match(/version:\s*([0-9\.]+)\+([0-9]+)/);
        if (match) {
            version = match[1];
            buildNumber = parseInt(match[2], 10);
        }
    }

    const versionMeta = {
        version: version,
        buildNumber: buildNumber,
        downloadUrl: 'https://isjsbwjxvpmmgwvvksit.supabase.co/storage/v1/object/public/apks/FuelExpenseAutopilot.apk',
        releaseNotes: 'Over-the-air updates, pocket background GPS auto-tracking, real-time highway sync, anti-drift fixes, and bill re-upload.',
        forceUpdate: false,
        updatedAt: new Date().toISOString()
    };

    console.log(`Publishing OTA Metadata (v${version} build ${buildNumber}) ...`);
    const versionBuffer = Buffer.from(JSON.stringify(versionMeta, null, 2));

    await supabase.storage
        .from('apks')
        .upload('version.json', versionBuffer, {
            contentType: 'application/json',
            upsert: true
        });

    await supabase.storage
        .from('fuel-receipts')
        .upload('downloads/version.json', versionBuffer, {
            contentType: 'application/json',
            upsert: true
        });

    const { data: url1 } = supabase.storage.from('apks').getPublicUrl('FuelExpenseAutopilot.apk');
    const { data: url2 } = supabase.storage.from('apks').getPublicUrl('FuelApp_latest.apk');
    const { data: url3 } = supabase.storage.from('fuel-receipts').getPublicUrl('downloads/FuelExpenseAutopilot.apk');
    const { data: versionUrl } = supabase.storage.from('apks').getPublicUrl('version.json');

    console.log('\n========================================================');
    console.log('UNIVERSAL APK & OTA UPDATE METADATA UPLOADED SUCCESSFULLY!');
    console.log('Download URLs (Active & Ready):');
    console.log('Primary APK Link:');
    console.log(url1.publicUrl);
    console.log('\nSecondary APK Link:');
    console.log(url3.publicUrl);
    console.log('\nOTA Version Manifest:');
    console.log(versionUrl.publicUrl);
    console.log('========================================================\n');
}
upload();
