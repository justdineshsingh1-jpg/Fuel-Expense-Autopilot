import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/trip_log.dart';
import '../widgets/status_badge.dart';
import '../widgets/photo_thumbnail.dart';
import 'flag_explanation_screen.dart';

class TripDetailScreen extends StatelessWidget {
  final TripLog trip;

  const TripDetailScreen({super.key, required this.trip});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Trip Details'),
        actions: [
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: StatusBadge(status: trip.status),
          )
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Text(
              'Date: ${DateFormat('MMMM dd, yyyy').format(trip.date)}',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 24),

            // Fraud Flags Section
            if (trip.flags.isNotEmpty) ...[
              const Text('Flags & Warnings', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.red)),
              const SizedBox(height: 8),
              ...trip.flags.map((flag) => Card(
                color: Colors.red.shade50,
                child: ListTile(
                  leading: const Icon(Icons.warning, color: Colors.red),
                  title: Text(flag.type, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text(flag.description),
                ),
              )).toList(),
              const SizedBox(height: 24),
            ],

            // Odometer Section
            const Text('Odometer Details', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: Column(
                    children: [
                      const Text('Start', style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      PhotoThumbnail(path: trip.startOdometerImageUrl, isNetwork: true),
                      const SizedBox(height: 4),
                      Text('${trip.startReading} KM'),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    children: [
                      const Text('End', style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      PhotoThumbnail(path: trip.endOdometerImageUrl, isNetwork: true),
                      const SizedBox(height: 4),
                      Text('${trip.endReading} KM'),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Center(
              child: Text(
                'Total Distance: ${trip.distanceKm.toStringAsFixed(1)} KM',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
            const Divider(height: 32),

            // Locations Section
            const Text('Client Visits', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            if (trip.locations.isEmpty) const Text('No locations recorded.'),
            ...trip.locations.asMap().entries.map((entry) {
              int idx = entry.key;
              var loc = entry.value;
              return ListTile(
                leading: CircleAvatar(child: Text('${idx + 1}')),
                title: Text(loc.clientName),
                subtitle: Text('${loc.purpose}\n${DateFormat('HH:mm a').format(loc.timestamp)}'),
                isThreeLine: true,
              );
            }).toList(),
            const Divider(height: 32),

            // Fuel Bills
            if (trip.fuelBill != null) ...[
              const Text('Fuel Bill', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              ListTile(
                leading: PhotoThumbnail(path: trip.fuelBill!.imageUrl, isNetwork: true, size: 60),
                title: Text('Amount: ₹${trip.fuelBill!.amount}'),
                subtitle: Text('OCR Detected: ₹${trip.fuelBill!.ocrAmount ?? 'N/A'}\nType: ${trip.fuelBill!.fuelType}'),
                isThreeLine: true,
              ),
              const Divider(height: 32),
            ],

            // Action Button for Rejected/Flagged
            if ((trip.status == 'Rejected' || trip.status == 'Flagged') && trip.flags.isNotEmpty)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.edit_note),
                  label: const Text('Add Explanation'),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => FlagExplanationScreen(flag: trip.flags.first),
                      ),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}
