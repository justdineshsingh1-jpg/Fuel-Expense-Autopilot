import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/trip_log.dart';
import '../models/trip_location.dart';
import '../models/fuel_bill.dart';
import '../providers/auth_provider.dart';
import '../providers/trip_provider.dart';
import 'camera_capture_screen.dart';

class TripFormScreen extends StatefulWidget {
  const TripFormScreen({super.key});

  @override
  State<TripFormScreen> createState() => _TripFormScreenState();
}

class _TripFormScreenState extends State<TripFormScreen> {
  final _startReadingController = TextEditingController();
  final _endReadingController = TextEditingController();
  final _fuelAmountController = TextEditingController();
  
  CaptureResult? _startCapture;
  CaptureResult? _endCapture;
  CaptureResult? _fuelCapture;
  
  final List<TripLocation> _locations = [];

  void _calculateDistance() {
    setState(() {});
  }

  Future<void> _capture(String title, Function(CaptureResult) onCapture) async {
    final result = await Navigator.push<CaptureResult>(
      context,
      MaterialPageRoute(builder: (context) => CameraCaptureScreen(title: title)),
    );
    
    if (result != null) {
      setState(() {
        onCapture(result);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AuthProvider>(context, listen: false).user;
    
    double startReading = double.tryParse(_startReadingController.text) ?? 0.0;
    double endReading = double.tryParse(_endReadingController.text) ?? 0.0;
    double distance = endReading - startReading;

    return Scaffold(
      appBar: AppBar(title: const Text('New Trip Log')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Employee: ${user?.fullName}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    Text('Code: ${user?.employeeCode}'),
                    Text('Date: ${DateTime.now().toLocal().toString().split(' ')[0]}'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            
            // Odometer Section
            const Text('Odometer Reading', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _startReadingController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: 'Start Reading (KM)'),
                            onChanged: (_) => _calculateDistance(),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.camera_alt),
                          onPressed: () => _capture('Start Odometer', (res) {
                            _startCapture = res;
                            if (res.ocrNumber != null) {
                              _startReadingController.text = res.ocrNumber.toString();
                              _calculateDistance();
                            }
                          }),
                        )
                      ],
                    ),
                    if (_startCapture != null) ...[
                      const SizedBox(height: 8),
                      Image.file(File(_startCapture!.imagePath), height: 100),
                      if (_startCapture!.ocrNumber != null)
                        Text('OCR: ${_startCapture!.ocrNumber}', style: const TextStyle(color: Colors.green)),
                    ],
                    const Divider(height: 32),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _endReadingController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: 'End Reading (KM)'),
                            onChanged: (_) => _calculateDistance(),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.camera_alt),
                          onPressed: () => _capture('End Odometer', (res) {
                            _endCapture = res;
                            if (res.ocrNumber != null) {
                              _endReadingController.text = res.ocrNumber.toString();
                              _calculateDistance();
                            }
                          }),
                        )
                      ],
                    ),
                    if (_endCapture != null) ...[
                      const SizedBox(height: 8),
                      Image.file(File(_endCapture!.imagePath), height: 100),
                      if (_endCapture!.ocrNumber != null)
                        Text('OCR: ${_endCapture!.ocrNumber}', style: const TextStyle(color: Colors.green)),
                    ],
                    const Divider(height: 32),
                    Text('Total Distance: $distance KM', 
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: distance < 0 ? Colors.red : Colors.black)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            
            // Save Button
            ElevatedButton(
              onPressed: () async {
                // Implement submission
                Navigator.pop(context);
              },
              child: const Text('Submit for Approval'),
            ),
          ],
        ),
      ),
    );
  }
}
