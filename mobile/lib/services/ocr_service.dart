import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

class OcrService {
  final TextRecognizer _textRecognizer = TextRecognizer(script: TextRecognitionScript.latin);

  Future<String?> recognizeText(String imagePath) async {
    try {
      final inputImage = InputImage.fromFilePath(imagePath);
      final RecognizedText recognizedText = await _textRecognizer.processImage(inputImage);
      return recognizedText.text;
    } catch (e) {
      print('Error in OCR: $e');
      return null;
    }
  }

  Future<double?> extractNumber(String imagePath) async {
    final text = await recognizeText(imagePath);
    if (text == null) return null;

    // Simple regex to find numbers (can be customized based on requirements)
    final RegExp regExp = RegExp(r'\d+(\.\d+)?');
    final Iterable<Match> matches = regExp.allMatches(text.replaceAll(',', ''));
    
    if (matches.isNotEmpty) {
      // Return the largest number found as a simple heuristic for odometer/bill total
      double maxNum = 0;
      for (final match in matches) {
        final num = double.tryParse(match.group(0) ?? '') ?? 0;
        if (num > maxNum) maxNum = num;
      }
      return maxNum > 0 ? maxNum : null;
    }
    return null;
  }
  
  void dispose() {
    _textRecognizer.close();
  }
}
