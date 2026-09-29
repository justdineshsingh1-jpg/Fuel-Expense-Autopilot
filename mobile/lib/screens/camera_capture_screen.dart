import 'dart:io';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../services/camera_service.dart';
import '../services/location_service.dart';
import '../services/ocr_service.dart';

class CaptureResult {
  final String imagePath;
  final DateTime timestamp;
  final double lat;
  final double lng;
  final String? ocrText;
  final double? ocrNumber;

  CaptureResult({
    required this.imagePath,
    required this.timestamp,
    required this.lat,
    required this.lng,
    this.ocrText,
    this.ocrNumber,
  });
}

class CameraCaptureScreen extends StatefulWidget {
  final String title;

  const CameraCaptureScreen({super.key, required this.title});

  @override
  State<CameraCaptureScreen> createState() => _CameraCaptureScreenState();
}

class _CameraCaptureScreenState extends State<CameraCaptureScreen> {
  CameraController? _controller;
  bool _isProcessing = false;
  final CameraService _cameraService = CameraService();
  final LocationService _locationService = LocationService();
  final OcrService _ocrService = OcrService();

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    try {
      final controller = await _cameraService.getController();
      setState(() {
        _controller = controller;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Camera error: $e')));
      }
    }
  }

  Future<void> _captureImage() async {
    if (_controller == null || !_controller!.value.isInitialized || _isProcessing) {
      return;
    }

    setState(() {
      _isProcessing = true;
    });

    try {
      // 1. Capture Image
      final XFile image = await _controller!.takePicture();
      final DateTime timestamp = DateTime.now();

      // 2. Get Location
      Position position = await _locationService.getCurrentLocation();

      // 3. Run OCR
      final String? text = await _ocrService.recognizeText(image.path);
      final double? number = await _ocrService.extractNumber(image.path);

      // Return result
      if (mounted) {
        Navigator.pop(
          context,
          CaptureResult(
            imagePath: image.path,
            timestamp: timestamp,
            lat: position.latitude,
            lng: position.longitude,
            ocrText: text,
            ocrNumber: number,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _isProcessing = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to capture: $e')));
      }
    }
  }

  @override
  void dispose() {
    _cameraService.dispose();
    _ocrService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_controller == null || !_controller!.value.isInitialized) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: Colors.white),
              SizedBox(height: 16),
              Text('Live Camera Required', style: TextStyle(color: Colors.white)),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: Text(widget.title),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Stack(
        children: [
          Positioned.fill(
            child: CameraPreview(_controller!),
          ),
          Center(
            child: Container(
              width: MediaQuery.of(context).size.width * 0.8,
              height: MediaQuery.of(context).size.height * 0.3,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.red, width: 2),
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Center(
              child: _isProcessing
                  ? const CircularProgressIndicator(color: Colors.white)
                  : FloatingActionButton(
                      onPressed: _captureImage,
                      backgroundColor: Colors.white,
                      child: const Icon(Icons.camera, color: Colors.black, size: 36),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
