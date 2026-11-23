import 'dart:io';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/trip_log.dart';
import '../models/fuel_bill.dart';
import '../providers/trip_provider.dart';
import '../utils/camera_utils.dart';
import '../widgets/status_badge.dart';
import '../widgets/photo_thumbnail.dart';
import '../widgets/route_map_widget.dart';
import 'flag_explanation_screen.dart';

class TripDetailScreen extends StatefulWidget {
  final TripLog trip;

  const TripDetailScreen({super.key, required this.trip});

  @override
  State<TripDetailScreen> createState() => _TripDetailScreenState();
}

class _TripDetailScreenState extends State<TripDetailScreen> {
  late TripLog _trip;

  @override
  void initState() {
    super.initState();
    _trip = widget.trip;
  }

  bool get _isEditable {
    final s = _trip.status.toLowerCase();
    return s != 'approved' && s != 'settled';
  }

  void _showEditBillDialog({
    required String billType,
    required double initialAmount,
    required String? initialImageUrl,
    String initialRemarks = '',
  }) {
    final amtCtrl = TextEditingController(
      text: initialAmount > 0 ? initialAmount.toStringAsFixed(0) : '',
    );
    final remarksCtrl = TextEditingController(text: initialRemarks);
    String? capturedImageUrl = initialImageUrl;
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (BuildContext modalCtx, StateSetter modalSetState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(ctx).viewInsets.bottom,
                left: 16,
                right: 16,
                top: 16,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Update ${billType == 'fuel' ? 'Fuel Bill' : 'Misc Bill'}',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                        ),
                        IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Text('Amount (₹) *', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: amtCtrl,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        hintText: 'e.g. 350',
                        border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
                        contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      ),
                    ),
                    if (billType != 'fuel') ...[
                      const SizedBox(height: 12),
                      const Text('Remarks / Details', style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: remarksCtrl,
                        decoration: const InputDecoration(
                          hintText: 'e.g. Changed tire tube or parking fee',
                          border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
                          contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        ),
                      ),
                    ],
                    const SizedBox(height: 14),
                    const Text('Bill Receipt Photo *', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    InkWell(
                      onTap: isSaving ? null : () async {
                        final url = await CameraUtils.showPhotoSourceDialog(context, title: 'Re-upload Bill Receipt');
                        if (url != null) {
                          modalSetState(() { capturedImageUrl = url; });
                        }
                      },
                      child: Container(
                        height: 120,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(color: Colors.grey[300]!),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: capturedImageUrl != null
                          ? Stack(
                              alignment: Alignment.center,
                              children: [
                                (capturedImageUrl!.startsWith('http')
                                    ? Image.network(capturedImageUrl!, fit: BoxFit.cover, width: double.infinity, height: double.infinity)
                                    : Image.file(File(capturedImageUrl!), cacheWidth: 600, fit: BoxFit.cover, width: double.infinity, height: double.infinity)),
                                Positioned(
                                  bottom: 6,
                                  right: 6,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(color: Colors.black.withOpacity(0.7), borderRadius: BorderRadius.circular(4)),
                                    child: const Row(
                                      children: [
                                        Icon(Icons.camera_alt, color: Colors.white, size: 14),
                                        SizedBox(width: 4),
                                        Text('Change Photo', style: TextStyle(color: Colors.white, fontSize: 11)),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            )
                          : const Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.camera_alt_outlined, size: 28, color: Colors.grey),
                                SizedBox(height: 4),
                                Text('Tap to capture or choose new photo', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold, fontSize: 13)),
                              ],
                            ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1D5BB5),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: isSaving ? null : () async {
                          final amt = double.tryParse(amtCtrl.text.trim());
                          if (amt == null || amt <= 0) {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a valid amount.')));
                            return;
                          }
                          if (capturedImageUrl == null || capturedImageUrl!.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please attach bill receipt photo.')));
                            return;
                          }

                          modalSetState(() { isSaving = true; });
                          final tripProv = Provider.of<TripProvider>(context, listen: false);
                          final ok = await tripProv.updateTripBill(
                            tripId: _trip.id ?? '',
                            billType: billType,
                            amount: amt,
                            imageUrl: capturedImageUrl!,
                            remarks: remarksCtrl.text.trim(),
                          );

                          if (ctx.mounted) Navigator.pop(ctx);

                          if (ok && mounted) {
                            setState(() {
                              if (billType == 'fuel') {
                                _trip = _trip.copyWith(
                                  fuelBill: FuelBill(
                                    amount: amt,
                                    imageUrl: capturedImageUrl!,
                                    fuelType: 'Petrol',
                                    remarks: '',
                                  ),
                                );
                              } else {
                                _trip = _trip.copyWith(
                                  miscAmount: amt,
                                  miscBillUrl: capturedImageUrl,
                                  miscRemarks: remarksCtrl.text.trim(),
                                );
                              }
                            });
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                              content: Text('Bill receipt updated successfully!'),
                              backgroundColor: Colors.green,
                            ));
                          }
                        },
                        child: isSaving
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Save & Update Bill', style: TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool isActive = _trip.status.toLowerCase() == 'active';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Trip Details'),
        actions: [
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: StatusBadge(status: _trip.status),
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
              'Date: ${DateFormat('MMMM dd, yyyy').format(_trip.date)}',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 24),

            // Fraud Flags Section
            if (_trip.flags.isNotEmpty) ...[
              const Text('Flags & Warnings', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.red)),
              const SizedBox(height: 8),
              ..._trip.flags.map((flag) => Card(
                color: Colors.red.shade50,
                child: ListTile(
                  leading: const Icon(Icons.warning, color: Colors.red),
                  title: Text(flag.type, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text(flag.description),
                ),
              )),
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
                      PhotoThumbnail(path: _trip.startOdometerImageUrl),
                      const SizedBox(height: 4),
                      Text('${_trip.startReading} KM', style: const TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    children: [
                      const Text('End', style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      if (isActive) ...[
                        const SizedBox(height: 30),
                        const Text('Shift Active', style: TextStyle(color: Colors.grey, fontStyle: FontStyle.italic)),
                      ] else ...[
                        PhotoThumbnail(path: _trip.endOdometerImageUrl),
                        const SizedBox(height: 4),
                        Text('${_trip.endReading} KM', style: const TextStyle(fontWeight: FontWeight.bold)),
                      ],
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Center(
              child: Text(
                isActive
                  ? 'Total Distance: Live tracking...'
                  : 'Total Distance: ${_trip.distanceKm.toStringAsFixed(1)} KM',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 16),

            // GPS Route Map Section (Live Route / Historical Path)
            RouteMapWidget(
              tripId: _trip.id,
              locations: _trip.locations,
              claimedKm: _trip.distanceKm > 0 ? _trip.distanceKm : null,
              isLive: isActive,
            ),
            const Divider(height: 32),

            // Client Visits Section
            const Text('Client Visits', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            if (_trip.locations.isEmpty) const Text('No locations recorded.'),
            ..._trip.locations.asMap().entries.map((entry) {
              int idx = entry.key;
              var loc = entry.value;
              return ListTile(
                leading: CircleAvatar(child: Text('${idx + 1}')),
                title: Text(loc.clientName),
                subtitle: Text('${loc.purpose}\n${DateFormat('HH:mm a').format(loc.timestamp)}'),
                isThreeLine: true,
              );
            }),
            const Divider(height: 32),

            // Fuel Bills
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Fuel Bill', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                if (_isEditable)
                  TextButton.icon(
                    icon: const Icon(Icons.edit, size: 16, color: Color(0xFF1D5BB5)),
                    label: Text(
                      (_trip.fuelBill != null && _trip.fuelBill!.amount > 0) ? 'Re-upload / Change' : 'Attach Bill',
                      style: const TextStyle(color: Color(0xFF1D5BB5), fontWeight: FontWeight.bold),
                    ),
                    onPressed: () {
                      _showEditBillDialog(
                        billType: 'fuel',
                        initialAmount: _trip.fuelBill?.amount ?? 0.0,
                        initialImageUrl: _trip.fuelBill?.imageUrl,
                      );
                    },
                  ),
              ],
            ),
            const SizedBox(height: 8),
            if (_trip.fuelBill != null && _trip.fuelBill!.amount > 0) ...[
              ListTile(
                leading: PhotoThumbnail(path: _trip.fuelBill!.imageUrl, size: 60),
                title: Text('Amount: ₹${_trip.fuelBill!.amount}', style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text("OCR Detected: ₹${_trip.fuelBill!.ocrAmount ?? 'N/A'}\nType: ${_trip.fuelBill!.fuelType}"),
                isThreeLine: true,
              ),
            ] else ...[
              const Text('No fuel bill attached.', style: TextStyle(color: Colors.grey, fontStyle: FontStyle.italic)),
            ],
            const Divider(height: 32),

            // Misc Bills
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Misc Bill', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                if (_isEditable)
                  TextButton.icon(
                    icon: const Icon(Icons.edit, size: 16, color: Color(0xFF1D5BB5)),
                    label: Text(
                      (_trip.miscAmount > 0) ? 'Re-upload / Change' : 'Attach Bill',
                      style: const TextStyle(color: Color(0xFF1D5BB5), fontWeight: FontWeight.bold),
                    ),
                    onPressed: () {
                      _showEditBillDialog(
                        billType: 'misc',
                        initialAmount: _trip.miscAmount,
                        initialImageUrl: _trip.miscBillUrl,
                        initialRemarks: _trip.miscRemarks,
                      );
                    },
                  ),
              ],
            ),
            const SizedBox(height: 8),
            if (_trip.miscAmount > 0) ...[
              ListTile(
                leading: (_trip.miscBillUrl != null && _trip.miscBillUrl!.isNotEmpty)
                    ? PhotoThumbnail(path: _trip.miscBillUrl!, size: 60)
                    : null,
                title: Text('Amount: ₹${_trip.miscAmount}', style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text(_trip.miscRemarks.isNotEmpty ? 'Remarks: ${_trip.miscRemarks}' : 'General expense'),
                isThreeLine: true,
              ),
            ] else ...[
              const Text('No misc bill attached.', style: TextStyle(color: Colors.grey, fontStyle: FontStyle.italic)),
            ],
            const Divider(height: 32),

            // Action Button for Rejected/Flagged
            if ((_trip.status == 'Rejected' || _trip.status == 'Flagged') && _trip.flags.isNotEmpty)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.edit_note),
                  label: const Text('Add Explanation'),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => FlagExplanationScreen(flag: _trip.flags.first),
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
