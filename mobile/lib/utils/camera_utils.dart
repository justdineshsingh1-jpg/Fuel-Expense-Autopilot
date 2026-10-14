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

  /// Prompt user to choose between Camera or Gallery to ensure 100% compatibility across all device models
  static Future<String?> showPhotoSourceDialog(BuildContext context, {String title = 'Attach Photo'}) async {
    final ImageSource? selectedSource = await showModalBottomSheet<ImageSource>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    const Icon(Icons.add_a_photo_outlined, color: Color(0xFF1D5BB5)),
                    const SizedBox(width: 10),
                    Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
              const Divider(),
              ListTile(
                leading: const CircleAvatar(
                  backgroundColor: Color(0xFFE0E7FF),
                  child: Icon(Icons.camera_alt, color: Color(0xFF1D5BB5)),
                ),
                title: const Text('Take Live Photo (Camera)', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: const Text('Capture with phone camera'),
                onTap: () => Navigator.pop(ctx, ImageSource.camera),
              ),
              ListTile(
                leading: const CircleAvatar(
                  backgroundColor: Color(0xFFDCFCE7),
                  child: Icon(Icons.photo_library, color: Color(0xFF16A34A)),
                ),
                title: const Text('Choose from Gallery / Files', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: const Text('Pick existing bill or receipt photo'),
                onTap: () => Navigator.pop(ctx, ImageSource.gallery),
              ),
            ],
          ),
        ),
      ),
    );

    if (selectedSource == null) return null;
    if (!context.mounted) return null;
    return await captureAndWatermark(context, source: selectedSource);
  }

  /// Handles recovering photo if Android OS destroyed MainActivity during camera capture
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

  static Future<bool> _requestCameraPermission(BuildContext context) async {
    try {
      final status = await Permission.camera.status;
      if (status.isGranted) return true;

      final req = await Permission.camera.request();
      if (req.isGranted) return true;

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Camera permission is required to take photos.')),
        );
      }
      return false;
    } catch (e) {
      debugPrint("Camera permission error: $e");
      return true; // Let image_picker attempt its own intent
    }
  }

  static Future<String?> captureAndWatermark(
    BuildContext context, {
    ImageSource source = ImageSource.camera,
  }) async {
    XFile? photo;
    try {
      if (source == ImageSource.camera) {
        final hasCam = await _requestCameraPermission(context);
        if (!hasCam) return null;
      }

      // Safe size & quality prevents Out-Of-Memory crashes on low-end and high-end devices
      photo = await _picker.pickImage(
        source: source,
        imageQuality: 75,
        maxWidth: 1024,
        maxHeight: 1024,
      );

      // Check if Android OS killed MainActivity and recreated
      if (photo == null && source == ImageSource.camera) {
        final lostPath = await retrieveLostData();
        if (lostPath != null) {
          photo = XFile(lostPath);
        }
      }

      if (photo == null) return null;

      final File originalFile = File(photo.path);
      if (!originalFile.existsSync()) return photo.path;

      // Acquire GPS position as best effort without blocking photo if location is unavailable
      Position? position;
      try {
        final serviceEnabled = await Geolocator.isLocationServiceEnabled();
        if (serviceEnabled) {
          position = await Geolocator.getCurrentPosition(
            desiredAccuracy: LocationAccuracy.medium,
            timeLimit: const Duration(seconds: 3),
          );
        }
      } catch (_) {
        try {
          position = await Geolocator.getLastKnownPosition();
        } catch (_) {}
      }

      String locality = "Area Recorded";
      String address = "Coordinates saved";
      if (position != null && position.latitude != 0 && position.longitude != 0) {
        try {
          List<Placemark> placemarks = await placemarkFromCoordinates(position.latitude, position.longitude);
          if (placemarks.isNotEmpty) {
            Placemark place = placemarks[0];
            locality = place.subAdministrativeArea ?? place.locality ?? 'Area recorded';
            address = [place.street, place.subLocality, place.locality]
                .where((s) => s != null && s.isNotEmpty)
                .join(', ');
          }
        } catch (_) {}
      }

      final String timestamp = DateFormat('dd/MM/yyyy, hh:mm:ss a').format(DateTime.now());

      // Try watermarking safely. If anything fails (OOM, unsupported image format, etc.),
      // NEVER crash the app and NEVER lose the photo - smoothly return original file!
      try {
        final bytes = await originalFile.readAsBytes();
        
        // Safety check: do not decode if buffer is unusually huge to prevent memory exhaustion
        if (bytes.length > 5 * 1024 * 1024) {
          return photo.path;
        }

        img.Image? decodedImage = img.decodeImage(bytes);
        if (decodedImage == null) {
          return photo.path;
        }

        const int boxHeight = 110;
        if (decodedImage.height > boxHeight + 20) {
          img.fillRect(
            decodedImage,
            x1: 0,
            y1: decodedImage.height - boxHeight,
            x2: decodedImage.width,
            y2: decodedImage.height,
            color: img.ColorRgba8(0, 0, 0, 180),
          );

          int startY = decodedImage.height - boxHeight + 12;

          img.drawString(
            decodedImage,
            locality,
            font: img.arial24,
            x: 15,
            y: startY,
            color: img.ColorRgb8(255, 255, 255),
          );

          img.drawString(
            decodedImage,
            address.length > 35 ? '${address.substring(0, 35)}...' : address,
            font: img.arial24,
            x: 15,
            y: startY + 26,
            color: img.ColorRgb8(220, 220, 220),
          );

          String latStr = position != null && position.latitude != 0 ? position.latitude.toStringAsFixed(5) : "N/A";
          String lngStr = position != null && position.longitude != 0 ? position.longitude.toStringAsFixed(5) : "N/A";
          String accStr = (position != null && position.accuracy > 0) ? " ±${position.accuracy.toStringAsFixed(0)}m" : "";
          img.drawString(
            decodedImage,
            "GPS: $latStr, $lngStr$accStr",
            font: img.arial24,
            x: 15,
            y: startY + 52,
            color: img.ColorRgb8(100, 200, 255),
          );

          img.drawString(
            decodedImage,
            timestamp,
            font: img.arial24,
            x: 15,
            y: startY + 78,
            color: img.ColorRgb8(150, 255, 150),
          );

          final directory = await getApplicationDocumentsDirectory();
          final String newPath = '${directory.path}/watermarked_${DateTime.now().millisecondsSinceEpoch}.jpg';
          final File finalFile = File(newPath);
          await finalFile.writeAsBytes(img.encodeJpg(decodedImage, quality: 80));
          return finalFile.path;
        }
      } catch (watermarkErr) {
        debugPrint("Watermarking skipped due to memory/format protection: $watermarkErr");
        return photo.path;
      }

      return photo.path;
    } catch (e) {
      debugPrint("Camera Utils Error: $e");
      if (photo != null && File(photo.path).existsSync()) {
        return photo.path;
      }
      return null;
    }
  }
}
