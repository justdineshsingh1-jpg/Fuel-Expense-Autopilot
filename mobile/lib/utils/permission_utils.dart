import 'package:permission_handler/permission_handler.dart';

class PermissionUtils {
  static Future<void> requestAllPermissions() async {
    // 1. Request Camera
    if (await Permission.camera.isDenied) {
      await Permission.camera.request();
    }

    // 2. Request Notifications (Android 13+ Foreground Service)
    if (await Permission.notification.isDenied) {
      await Permission.notification.request();
    }

    // 3. Request Foreground Location
    if (await Permission.location.isDenied) {
      await Permission.location.request();
    }

    // 4. Request Background Location (Only if Foreground is granted, Android 11+ requirement)
    if (await Permission.location.isGranted) {
      if (await Permission.locationAlways.isDenied) {
        await Permission.locationAlways.request();
      }
    }
  }
}
