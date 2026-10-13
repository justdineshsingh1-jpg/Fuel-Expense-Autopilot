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

  /// Handles recovering photo if Android killed MainActivity during camera capture
  static Future<String?> retrieveLostData() async {
    try {
      final LostDataResponse response = await _picker.retrieveLostData();
      if (!response.isEmpty && response.file != null) {
        return response.file!.path;
      }
    } catch (e) {
      debugPrint("Retrieve lost camera data error: $e");
    }
    return null;
  }

  static Future<String?> captureAndWatermark(BuildContext context) async {
    XFile? photo;
    try {
      bool hasPermissions = await _requestPermissions(context);
      if (!hasPermissions) return null;

      // Safe size to avoid Out-Of-Memory crashes on low-end devices
      photo = await _picker.pickImage(
        source: ImageSource.camera, 
        imageQuality: 80,
        maxWidth: 1024,
        maxHeight: 1024,
      );
      
      // If photo is null, check if Android OS killed MainActivity and recreated
      if (photo == null) {
        final lostPath = await retrieveLostData();
        if (lostPath != null) {
          photo = XFile(lostPath);
        }
      }

      if (photo == null) return null;

      // Get GPS Position safely
      Position position;
      try {
        position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high, 
          timeLimit: const Duration(seconds: 4),
        );
      } catch (e) {
        position = await Geolocator.getLastKnownPosition() ?? Position(
          longitude: 0, 
          latitude: 0, 
          timestamp: DateTime.now(), 
          accuracy: 0, 
          altitude: 0, 
          heading: 0, 
          speed: 0, 
          speedAccuracy: 0, 
          altitudeAccuracy: 0, 
          headingAccuracy: 0,
        );
      }

      String address = "Coordinates saved";
      String locality = "Area recorded";
      try {
        if (position.latitude != 0 && position.longitude != 0) {
          List<Placemark> placemarks = await placemarkFromCoordinates(position.latitude, position.longitude);
          if (placemarks.isNotEmpty) {
            Placemark place = placemarks[0];
            locality = place.subAdministrativeArea ?? place.locality ?? 'Area recorded';
            address = [place.street, place.subLocality, place.locality]
                .where((s) => s != null && s.isNotEmpty)
                .join(', ');
          }
        }
      } catch (e) {
        debugPrint("Geocoding failed: $e");
      }

      final String timestamp = DateFormat('dd/MM/yyyy, hh:mm:ss a').format(DateTime.now());
      
      final File imageFile = File(photo.path);
      if (!imageFile.existsSync()) {
        return photo.path;
      }
      
      final bytes = await imageFile.readAsBytes();

      // Decode with error boundary
      img.Image? decodedImage = img.decodeImage(bytes);
      if (decodedImage == null) {
        // Fall back to original photo without crashing or losing data
        return photo.path;
      }

      // Draw dark background rectangle at the bottom
      int boxHeight = 120;
      if (decodedImage.height > boxHeight + 20) {
        img.fillRect(
          decodedImage,
          x1: 0,
          y1: decodedImage.height - boxHeight,
          x2: decodedImage.width,
          y2: decodedImage.height,
          color: img.ColorRgba8(0, 0, 0, 180),
        );

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
          address.length > 35 ? address.substring(0, 35) + '...' : address,
          font: img.arial24,
          x: 15,
          y: startY + 28,
          color: img.ColorRgb8(220, 220, 220),
        );

        // Line 3: GPS Info
        String latStr = position.latitude != 0 ? position.latitude.toStringAsFixed(5) : "N/A";
        String lngStr = position.longitude != 0 ? position.longitude.toStringAsFixed(5) : "N/A";
        String accStr = position.accuracy > 0 ? "±${position.accuracy.toStringAsFixed(0)}m" : "";
        String gpsInfo = "GPS: $latStr, $lngStr $accStr";
        img.drawString(
          decodedImage,
          gpsInfo,
          font: img.arial24,
          x: 15,
          y: startY + 56,
          color: img.ColorRgb8(100, 200, 255),
        );
        
        // Line 4: Timestamp
        img.drawString(
          decodedImage,
          timestamp,
          font: img.arial24,
          x: 15,
          y: startY + 84,
          color: img.ColorRgb8(150, 255, 150),
        );

        final directory = await getApplicationDocumentsDirectory();
        final String newPath = '${directory.path}/watermarked_${DateTime.now().millisecondsSinceEpoch}.jpg';
        final File finalFile = File(newPath)..writeAsBytesSync(img.encodeJpg(decodedImage, quality: 80));
        return finalFile.path;
      }

      // If dimensions were too small for watermark box, return the picked image directly
      return photo.path;
    } catch (e) {
      debugPrint("Camera Utils Error: $e");
      // CRITICAL: Never lose photo if taken! Return photo path if available
      if (photo != null && File(photo.path).existsSync()) {
        return photo.path;
      }
      return null;
    }
  }
}
