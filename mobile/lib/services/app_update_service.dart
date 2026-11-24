import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:ota_update/ota_update.dart';
import 'package:permission_handler/permission_handler.dart';

class AppUpdateInfo {
  final bool hasUpdate;
  final String version;
  final int buildNumber;
  final String downloadUrl;
  final String releaseNotes;
  final bool forceUpdate;

  AppUpdateInfo({
    required this.hasUpdate,
    required this.version,
    required this.buildNumber,
    required this.downloadUrl,
    required this.releaseNotes,
    this.forceUpdate = false,
  });
}

class AppUpdateService {
  // Current app build metadata (Bump with each release)
  static const int currentBuildNumber = 7;
  static const String currentVersionName = '1.0.6';

  static const String versionCheckUrl =
      'https://isjsbwjxvpmmgwvvksit.supabase.co/storage/v1/object/public/apks/version.json';

  static Future<AppUpdateInfo?> checkUpdate() async {
    try {
      final res = await http.get(Uri.parse(versionCheckUrl)).timeout(const Duration(seconds: 6));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final remoteBuild = int.tryParse(data['buildNumber']?.toString() ?? '0') ?? 0;
        final remoteVersion = data['version']?.toString() ?? '1.0.0';
        final downloadUrl = data['downloadUrl']?.toString() ??
            'https://isjsbwjxvpmmgwvvksit.supabase.co/storage/v1/object/public/apks/FuelExpenseAutopilot.apk';
        final releaseNotes = data['releaseNotes']?.toString() ?? 'Bug fixes and performance improvements.';
        final forceUpdate = data['forceUpdate'] == true;

        if (remoteBuild > currentBuildNumber) {
          return AppUpdateInfo(
            hasUpdate: true,
            version: remoteVersion,
            buildNumber: remoteBuild,
            downloadUrl: downloadUrl,
            releaseNotes: releaseNotes,
            forceUpdate: forceUpdate,
          );
        }
      }
    } catch (e) {
      debugPrint("AppUpdateService check error: $e");
    }
    return null;
  }

  static Future<void> checkAndPromptUpdate(BuildContext context, {bool showNoUpdateNotice = false}) async {
    final info = await checkUpdate();
    if (info != null && info.hasUpdate && context.mounted) {
      _showUpdateDialog(context, info);
    } else if (showNoUpdateNotice && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Your app is up to date! (v$currentVersionName)'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  static void _showUpdateDialog(BuildContext context, AppUpdateInfo info) {
    showDialog(
      context: context,
      barrierDismissible: !info.forceUpdate,
      builder: (ctx) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(8)),
                child: const Icon(Icons.system_update_rounded, color: Color(0xFF1D5BB5), size: 24),
              ),
              const SizedBox(width: 10),
              const Text('Update Available', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Version ${info.version} is now available.',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1D5BB5)),
              ),
              const SizedBox(height: 8),
              Text(info.releaseNotes, style: const TextStyle(fontSize: 13, color: Colors.black87)),
              const SizedBox(height: 12),
              const Text(
                'The update will download over the air and install automatically.',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
          ),
          actions: [
            if (!info.forceUpdate)
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Later', style: TextStyle(color: Colors.grey)),
              ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1D5BB5),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () {
                Navigator.pop(ctx);
                _startDownload(context, info.downloadUrl);
              },
              child: const Text('Update Now', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  static void _startDownload(BuildContext context, String url) async {
    // Check install packages permission on Android
    if (await Permission.requestInstallPackages.isDenied) {
      await Permission.requestInstallPackages.request();
    }

    if (!context.mounted) return;

    double progress = 0.0;
    String statusText = 'Preparing download...';
    bool isCompleted = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (dialogCtx, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: const Row(
                children: [
                  Icon(Icons.downloading, color: Color(0xFF1D5BB5)),
                  SizedBox(width: 8),
                  Text('Updating App...', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(height: 8),
                  LinearProgressIndicator(
                    value: progress > 0 ? (progress / 100.0) : null,
                    minHeight: 10,
                    borderRadius: BorderRadius.circular(5),
                    backgroundColor: Colors.grey.shade200,
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF1D5BB5)),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(statusText, style: const TextStyle(fontSize: 12, color: Colors.black87)),
                      Text('${progress.toInt()}%', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1D5BB5))),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text('Please tap "Update" on the system prompt when finished.', style: TextStyle(fontSize: 11, color: Colors.grey)),
                ],
              ),
            );
          },
        );
      },
    );

    try {
      OtaUpdate().execute(
        url,
        destinationFilename: 'FuelExpenseAutopilot.apk',
      ).listen(
        (OtaEvent event) {
          if (event.status == OtaStatus.DOWNLOADING) {
            final val = double.tryParse(event.value ?? '0') ?? 0.0;
            progress = val;
            statusText = 'Downloading (${val.toInt()}%)';
          } else if (event.status == OtaStatus.INSTALLING) {
            statusText = 'Opening installer...';
            progress = 100.0;
            if (!isCompleted && context.mounted) {
              isCompleted = true;
              Navigator.of(context, rootNavigator: true).pop();
            }
          } else if (event.status == OtaStatus.ALREADY_RUNNING_ERROR) {
            statusText = 'Update already running.';
          } else if (event.status == OtaStatus.PERMISSION_NOT_GRANTED_ERROR) {
            statusText = 'Permission not granted.';
            if (!isCompleted && context.mounted) {
              isCompleted = true;
              Navigator.of(context, rootNavigator: true).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Please grant install permission to update.'), backgroundColor: Colors.red),
              );
            }
          } else if (event.status == OtaStatus.INTERNAL_ERROR || event.status == OtaStatus.DOWNLOAD_ERROR) {
            statusText = 'Download failed.';
            if (!isCompleted && context.mounted) {
              isCompleted = true;
              Navigator.of(context, rootNavigator: true).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('OTA Update failed: ${event.value}'), backgroundColor: Colors.red),
              );
            }
          }
        },
        onError: (e) {
          if (!isCompleted && context.mounted) {
            isCompleted = true;
            Navigator.of(context, rootNavigator: true).pop();
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Update error: $e'), backgroundColor: Colors.red),
            );
          }
        },
      );
    } catch (e) {
      if (!isCompleted && context.mounted) {
        isCompleted = true;
        Navigator.of(context, rootNavigator: true).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not start update: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }
}
