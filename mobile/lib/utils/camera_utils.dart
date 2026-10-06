import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:image/image.dart' as img;
import 'package:path_provider/path_provider.dart';
import 'package:dio/dio.dart';
import 'package:intl/intl.dart';
import '../config/api_config.dart';

class CameraUtils {
  static final ImagePicker _picker = ImagePicker();

  static Future<String?> captureAndWatermark(BuildContext context) async {
    try {
      final XFile? photo = await _picker.pickImage(source: ImageSource.camera, imageQuality: 70);
      if (photo == null) return null;

      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Processing photo with GPS stamp...')));

      Position position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      String address = "Unknown Location";
      try {
        List<Placemark> placemarks = await placemarkFromCoordinates(position.latitude, position.longitude);
        if (placemarks.isNotEmpty) {
          Placemark place = placemarks[0];
          address = place.street.toString() + ", " + place.subLocality.toString() + ", " + place.locality.toString();
        }
      } catch (e) {
        print("Geocoding failed");
      }

      final String timestamp = DateFormat('dd/MM/yyyy, hh:mm:ss a').format(DateTime.now());
      final String watermarkText = "Lat: " + position.latitude.toStringAsFixed(6) + ", Lng: " + position.longitude.toStringAsFixed(6) + "\n" + address + "\nTime: " + timestamp;

      File imageFile = File(photo.path);
      final rawBytes = await imageFile.readAsBytes();
      img.Image? decodedImage = img.decodeImage(rawBytes);

      if (decodedImage != null) {
        img.drawString(
          decodedImage,
          watermarkText,
          font: img.arial24,
          x: 20,
          y: decodedImage.height - 100,
          color: img.ColorRgb8(255, 255, 255),
        );
        final directory = await getApplicationDocumentsDirectory();
        final String newPath = directory.path + '/watermarked_' + DateTime.now().millisecondsSinceEpoch.toString() + '.jpg';
        imageFile = File(newPath)..writeAsBytesSync(img.encodeJpg(decodedImage, quality: 85));
      }

      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Uploading photo...')));
      var dio = Dio();
      var formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(imageFile.path, filename: 'upload.jpg')
      });
      
      var response = await dio.post(ApiConfig.baseUrl.replaceAll('/api', '') + '/api/upload', data: formData);
      if (response.statusCode == 200 && response.data['url'] != null) {
        return response.data['url'];
      }
      return null;
    } catch (e) {
      print("Camera Utils Error");
      return null;
    }
  }
}
