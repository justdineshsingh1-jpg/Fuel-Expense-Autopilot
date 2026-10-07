import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:image/image.dart' as img;
import 'package:path_provider/path_provider.dart';
import 'package:intl/intl.dart';
import 'package:permission_handler/permission_handler.dart';

class CameraUtils {
  static final ImagePicker _picker = ImagePicker();

  static Future<bool> _requestPermissions(BuildContext context) async {
    Map<Permission, PermissionStatus> statuses = await [
      Permission.camera,
      Permission.location,
    ].request();

    if (statuses[Permission.camera]!.isDenied || statuses[Permission.location]!.isDenied) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Camera and Location permissions are required.')),
      );
      return false;
    }
    
    if (statuses[Permission.location]!.isPermanentlyDenied) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Location is permanently denied. Please enable it in App Settings.')),
      );
      await openAppSettings();
      return false;
    }

    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please turn on your phone GPS Service.')),
      );
      return false;
    }

    return true;
  }

  static Future<String?> captureAndWatermark(BuildContext context) async {
    try {
      bool hasPermissions = await _requestPermissions(context);
      if (!hasPermissions) return null;

      // maxWidth: 1000 ensures the image is small enough to not cause OOM errors in the image package!
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.camera, 
        imageQuality: 80,
        maxWidth: 1000,
      );
      if (photo == null) return null;

      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Processing GPS stamp...')));

      Position position;
      try {
        position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high, timeLimit: const Duration(seconds: 5));
      } catch (e) {
        position = await Geolocator.getLastKnownPosition() ?? Position(longitude: 0, latitude: 0, timestamp: DateTime.now(), accuracy: 0, altitude: 0, heading: 0, speed: 0, speedAccuracy: 0, altitudeAccuracy: 0, headingAccuracy: 0);
      }

      String address = "Unknown Location";
      String locality = "Unknown Area";
      try {
        List<Placemark> placemarks = await placemarkFromCoordinates(position.latitude, position.longitude);
        if (placemarks.isNotEmpty) {
          Placemark place = placemarks[0];
          locality = place.subAdministrativeArea ?? place.locality ?? 'Unknown Area';
          address = place.street.toString() + ", " + place.subLocality.toString() + ", " + place.locality.toString();
        }
      } catch (e) {}

      final String timestamp = DateFormat('dd/MM/yyyy, hh:mm:ss a').format(DateTime.now());
      
      final File imageFile = File(photo.path);
      final bytes = await imageFile.readAsBytes();

      // Use the ultra-reliable pure Dart image package
      img.Image? decodedImage = img.decodeImage(bytes);
      if (decodedImage == null) {
        throw Exception("Failed to decode image");
      }

      // Draw dark background rectangle at the bottom
      int boxHeight = 120;
      img.fillRect(
        decodedImage,
        x1: 0,
        y1: decodedImage.height - boxHeight,
        x2: decodedImage.width,
        y2: decodedImage.height,
        color: img.ColorRgba8(0, 0, 0, 180),
      );

      // Draw text manually (multi-colored simulated by drawing separately, but let's stick to clean white for reliability)
      int startY = decodedImage.height - boxHeight + 15;
      
      // Line 1: Locality
      img.drawString(
        decodedImage,
        locality,
        font: img.arial24,
        x: 15,
        y: startY,
        color: img.ColorRgb8(255, 255, 255),
      );

      // Line 2: Address
      img.drawString(
        decodedImage,
        address,
        font: img.arial24,
        x: 15,
        y: startY + 30,
        color: img.ColorRgb8(200, 200, 200),
      );

      // Line 3: GPS Info
      String gpsInfo = "Lat \ Long \ | Acc: \m";
      img.drawString(
        decodedImage,
        gpsInfo,
        font: img.arial24,
        x: 15,
        y: startY + 60,
        color: img.ColorRgb8(100, 200, 255), // Light blue for GPS
      );
      
      // Line 4: Timestamp
      img.drawString(
        decodedImage,
        timestamp,
        font: img.arial24,
        x: 15,
        y: startY + 90,
        color: img.ColorRgb8(150, 255, 150), // Light green for time
      );

      final directory = await getApplicationDocumentsDirectory();
      final String newPath = directory.path + '/watermarked_' + DateTime.now().millisecondsSinceEpoch.toString() + '.jpg';
      final File finalFile = File(newPath)..writeAsBytesSync(img.encodeJpg(decodedImage, quality: 75));

      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Photo securely saved!')));
      return finalFile.path;
    } catch (e) {
      print("Camera Utils Error: " + e.toString());
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('FATAL ERROR: ' + e.toString()), duration: const Duration(seconds: 10)));
      return null;
    }
  }
}
