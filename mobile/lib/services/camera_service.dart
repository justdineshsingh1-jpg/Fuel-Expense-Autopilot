import 'package:camera/camera.dart';

class CameraService {
  static final CameraService _instance = CameraService._internal();
  factory CameraService() => _instance;
  CameraService._internal();

  List<CameraDescription> _cameras = [];
  CameraController? _controller;

  Future<void> initialize() async {
    if (_cameras.isEmpty) {
      _cameras = await availableCameras();
    }
  }

  Future<CameraController> getController() async {
    await initialize();
    if (_cameras.isEmpty) {
      throw Exception('No cameras available');
    }
    
    // Always use the back camera
    final backCamera = _cameras.firstWhere(
      (camera) => camera.lensDirection == CameraLensDirection.back,
      orElse: () => _cameras.first,
    );

    _controller = CameraController(
      backCamera,
      ResolutionPreset.high,
      enableAudio: false,
    );

    await _controller!.initialize();
    return _controller!;
  }

  void dispose() {
    _controller?.dispose();
    _controller = null;
  }
}
